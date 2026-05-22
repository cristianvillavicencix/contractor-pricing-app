import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { defaultSettings, mergeAppSettings, type AppSettings, type Quote } from "@/lib/app-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SendBody = {
  to: string;
  cc?: string[];
  subject: string;
  message: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await context.params;

    let body: SendBody;
    try {
      body = (await request.json()) as SendBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.to?.trim()) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    // Load quote
    let admin: ReturnType<typeof createSupabaseAdminClient>;
    try {
      admin = createSupabaseAdminClient();
    } catch (e) {
      console.error("[send] admin client error:", e);
      return NextResponse.json({ error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });
    }

    const { data: row, error: dbError } = await admin
      .from("quotes")
      .select("id, company_id, data")
      .eq("id", quoteId)
      .maybeSingle();

    if (dbError) {
      console.error("[send] db error:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const quote = { ...(row.data as Quote), id: row.id };
    const companyId = row.company_id as string;

    const { data: settingsRow } = await admin
      .from("company_settings")
      .select("data")
      .eq("company_id", companyId)
      .maybeSingle();

    const settings = mergeAppSettings((settingsRow?.data ?? defaultSettings) as AppSettings);
    const company = settings.companyProfile;

    // Determine which PDF path to use
    const isBlocks = quote.builderVersion === "blocks";

    const origin = new URL(request.url).origin;
    const cookies = request.cookies.getAll();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    let pdfResponse: Response;

    if (isBlocks) {
      // ── Block Builder PDF ─────────────────────────────────────────────────
      // Validate blocks are present before hitting the endpoint
      const rawBlocks = quote.proposalBlocks;
      if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
        return NextResponse.json(
          {
            error:
              "This proposal uses the Block Builder but has no saved blocks. " +
              "Open it in the Block Builder, review, and save before sending.",
          },
          { status: 400 }
        );
      }

      console.log(
        "[send] Using block proposal PDF for",
        quoteId,
        `(${rawBlocks.length} blocks)`
      );

      // pdf-blocks uses the admin client internally (no cookies required),
      // but we forward them for consistency.
      pdfResponse = await fetch(
        `${origin}/api/proposals/pdf-blocks?quoteId=${quoteId}`,
        {
          headers: { Cookie: cookieHeader },
        }
      );
    } else {
      // ── Legacy PDF (paged.js) ─────────────────────────────────────────────
      console.log("[send] Using legacy proposal PDF for", quoteId);

      pdfResponse = await fetch(`${origin}/api/proposals/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({ quoteId }),
      });
    }

    if (!pdfResponse.ok) {
      const pdfErr = await pdfResponse.text().catch(() => "(no body)");
      console.error("[send] PDF generation failed:", pdfResponse.status, pdfErr);
      return NextResponse.json({ error: `PDF generation failed (${pdfResponse.status}): ${pdfErr}` }, { status: 500 });
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const fileName = `${quote.proposalNumber ?? `proposal-${quoteId.slice(-6).toUpperCase()}`}.pdf`;
    console.log("[send] PDF ready, size:", pdfBuffer.length, "bytes");

    // Build client portal link
    const portalToken = quote.clientPortalToken;
    const portalLink = portalToken
      ? `${origin}/proposal/${quoteId}/accept?t=${encodeURIComponent(portalToken)}`
      : null;

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
    const replyTo = company.email || undefined;

    const resend = new Resend(resendKey);

    console.log("[send] sending email to", body.to, "from", fromAddress);
    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [body.to.trim()],
      cc: body.cc?.filter(Boolean),
      replyTo,
      subject: body.subject,
      html: buildEmailHtml({
        message: body.message,
        portalLink,
        companyName: company.businessName,
        contactName: company.contactName,
        contactEmail: company.email,
        contactPhone: company.phone,
      }),
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
        },
      ],
    });

    if (sendError) {
      console.error("[send] Resend error:", sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    // Update quote status to Sent
    const updatedQuote: Quote = { ...quote, status: "Sent" };
    await admin.from("quotes").update({ data: updatedQuote }).eq("id", quoteId);

    console.log("[send] done, email sent to", body.to);
    return NextResponse.json({ ok: true });

  } catch (e) {
    console.error("[send] unhandled error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}

function buildEmailHtml({
  message,
  portalLink,
  companyName,
  contactName,
  contactEmail,
  contactPhone,
}: {
  message: string;
  portalLink: string | null;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}) {
  const messageHtml = message
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px 0;color:#374151;">${line || "&nbsp;"}</p>`)
    .join("");

  const portalSection = portalLink
    ? `
      <div style="margin:28px 0;text-align:center;">
        <a href="${portalLink}"
           style="display:inline-block;background:#f5c842;color:#111;font-weight:700;font-size:15px;
                  padding:14px 32px;border-radius:8px;text-decoration:none;">
          Review &amp; Sign Proposal
        </a>
        <p style="margin:12px 0 0 0;font-size:12px;color:#9ca3af;">
          Or copy this link: <a href="${portalLink}" style="color:#6b7280;">${portalLink}</a>
        </p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.08);">
    <div style="background:#213343;padding:24px 32px;">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">${companyName}</p>
    </div>
    <div style="padding:32px;">
      ${messageHtml}
      ${portalSection}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
      <p style="margin:0;font-size:13px;color:#6b7280;">
        <strong style="color:#374151;">${contactName}</strong><br/>
        ${companyName}<br/>
        ${contactEmail ? `<a href="mailto:${contactEmail}" style="color:#6b7280;">${contactEmail}</a><br/>` : ""}
        ${contactPhone || ""}
      </p>
    </div>
  </div>
</body>
</html>`;
}
