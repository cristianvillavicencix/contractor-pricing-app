import { NextResponse, type NextRequest } from "next/server";
import type { PriceOptionName, Quote } from "@/lib/app-data";
import {
  CLIENT_CONTRACT_CHECKLIST_IDS,
  isContractChecklistComplete,
} from "@/lib/proposal-client-portal";
import { ensureProjectForAcceptedPaidQuote } from "@/lib/proposal-project-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  token?: string;
  selectedOption?: PriceOptionName;
  signedName?: string;
  contractChecklist?: Record<string, boolean>;
};

function isProposalExpired(quote: Quote) {
  if (!quote.expiresAt || quote.status === "Accepted") return false;
  return new Date(quote.expiresAt) < new Date();
}

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
  const selectedOption = body.selectedOption;
  const signedName = body.signedName?.trim() ?? "";
  const contractChecklist = body.contractChecklist ?? {};

  if (!quoteId || !token) {
    return NextResponse.json({ error: "Missing proposal or token" }, { status: 400 });
  }
  if (!selectedOption || !["Good", "Better", "Best"].includes(selectedOption)) {
    return NextResponse.json({ error: "Select a valid pricing option" }, { status: 400 });
  }
  if (signedName.length < 3) {
    return NextResponse.json({ error: "Enter your full legal name" }, { status: 400 });
  }
  if (!isContractChecklistComplete(contractChecklist)) {
    return NextResponse.json({ error: "Confirm all contract items" }, { status: 400 });
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

  const quote = { ...(row.data as Quote), id: row.id, projectId: row.project_id ?? (row.data as Quote).projectId };
  if (!quote.clientPortalToken || quote.clientPortalToken !== token) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }
  if (quote.status === "Accepted") {
    return NextResponse.json({ error: "This proposal was already accepted" }, { status: 409 });
  }
  if (isProposalExpired(quote)) {
    return NextResponse.json({ error: "This proposal has expired" }, { status: 400 });
  }

  const signedAt = new Date().toISOString();
  const companyId = row.company_id as string;

  const checklistPayload = CLIENT_CONTRACT_CHECKLIST_IDS.map((id) => ({
    id,
    acknowledged: contractChecklist[id] === true,
  }));

  const nextQuote: Quote = {
    ...quote,
    selectedOption,
    status: "Accepted",
    depositStatus: quote.depositStatus ?? "Pending",
    signedAt,
    signedBy: signedName,
  };

  const { error: updateError } = await admin.from("quotes").update({ data: nextQuote }).eq("id", quoteId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: insertAcceptError } = await admin.from("proposal_acceptances").insert({
    quote_id: quoteId,
    company_id: companyId,
    selected_option: selectedOption,
    signed_name: signedName,
    signed_at: signedAt,
    contract_checklist: checklistPayload,
  });

  if (insertAcceptError) {
    return NextResponse.json({ error: insertAcceptError.message }, { status: 500 });
  }

  await ensureProjectForAcceptedPaidQuote({
    admin,
    companyId,
    quoteId,
    quote: nextQuote,
  });

  return NextResponse.json({ ok: true, signedAt });
}
