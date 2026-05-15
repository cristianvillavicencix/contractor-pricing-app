import { NextResponse, type NextRequest } from "next/server";
import type { PaymentStatus, Quote } from "@/lib/app-data";
import { ensureProjectForAcceptedPaidQuote } from "@/lib/proposal-project-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  token?: string;
  paymentStatus?: PaymentStatus;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ quoteId: string }> }
) {
  const { quoteId } = await context.params;
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  const paymentStatus = body.paymentStatus ?? "Paid";

  if (!quoteId || !token) {
    return NextResponse.json({ error: "Missing proposal or token" }, { status: 400 });
  }

  if (!["Pending", "Paid", "Failed", "Refunded"].includes(paymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("quotes")
    .select("id, company_id, project_id, data")
    .eq("id", quoteId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load proposal" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const quote = {
    ...(row.data as Quote),
    id: row.id,
    projectId: row.project_id ?? (row.data as Quote).projectId,
  };
  if (!quote.clientPortalToken || quote.clientPortalToken !== token) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  const nextQuote: Quote = {
    ...quote,
    depositStatus: paymentStatus,
    depositPaidAt: paymentStatus === "Paid" ? new Date().toISOString() : quote.depositPaidAt,
  };

  const { error: updateQuoteError } = await admin
    .from("quotes")
    .update({ data: nextQuote })
    .eq("id", quoteId);
  if (updateQuoteError) {
    return NextResponse.json({ error: updateQuoteError.message }, { status: 500 });
  }

  const companyId = row.company_id as string;
  const result = await ensureProjectForAcceptedPaidQuote({
    admin,
    companyId,
    quoteId,
    quote: nextQuote,
  });

  return NextResponse.json({
    ok: true,
    paymentStatus,
    projectId: result.projectId,
    projectCreated: result.created,
  });
}
