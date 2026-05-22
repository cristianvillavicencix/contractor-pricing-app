import { NextResponse, type NextRequest } from "next/server";
import { chromium } from "playwright";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildBlocksPrintHtml } from "@/lib/proposal-blocks";
import { defaultSettings, mergeAppSettings, type AppSettings, type Quote } from "@/lib/app-data";
import type { ProposalBlock } from "@/types/proposal-blocks";
import { resolveProposalSettings } from "@/lib/proposal-themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const quoteId = new URL(request.url).searchParams.get("quoteId");
  if (!quoteId) {
    return NextResponse.json({ error: "quoteId is required" }, { status: 400 });
  }

  // Admin client bypasses RLS — matches the same pattern as pdf-tiptap
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: row, error } = await admin
    .from("quotes")
    .select("id, company_id, data")
    .eq("id", quoteId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const quote: Quote = { ...(row.data as Quote), id: row.id };
  const { data: settingsRow } = await admin
    .from("company_settings")
    .select("data")
    .eq("company_id", row.company_id as string)
    .maybeSingle();
  const settings = mergeAppSettings((settingsRow?.data ?? defaultSettings) as AppSettings);

  // Validate blocks exist
  const rawBlocks = (quote as { proposalBlocks?: unknown[] }).proposalBlocks;
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return NextResponse.json(
      {
        error:
          "This proposal has no block content. Open it in the Block Builder and save at least once.",
      },
      { status: 400 }
    );
  }

  const blocks = rawBlocks as ProposalBlock[];
  const enabledCount = blocks.filter((b) => b.enabled).length;
  if (enabledCount === 0) {
    return NextResponse.json(
      { error: "All blocks are disabled. Enable at least one block before exporting." },
      { status: 400 }
    );
  }

  // Generate high-quality print HTML using the shared function
  const printHtml = buildBlocksPrintHtml(blocks, quote, settings);
  const pdfSettings = resolveProposalSettings(quote.proposalDocumentSettings);

  const fileName = `${
    quote.proposalNumber ?? `proposal-${quoteId.slice(-6).toUpperCase()}`
  }.pdf`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.setContent(printHtml, { waitUntil: "networkidle" });

    const pdf = await page.pdf({
      format: pdfSettings.pdfPageSize,
      printBackground: true,
      // Margins are already encoded in the @page CSS rule inside printHtml;
      // passing them here as well makes Playwright honour them in both codepaths.
      margin: { top: "18mm", right: "20mm", bottom: "20mm", left: "20mm" },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await browser.close();
  }
}
