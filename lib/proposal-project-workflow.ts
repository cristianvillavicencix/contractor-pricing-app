import type {
  PriceOptionName,
  Project,
  ProjectSize,
  ProjectState,
  Quote,
  RiskLevel,
  Trade,
} from "@/lib/app-data";
import { getTodayLabel } from "@/lib/app-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const ALLOWED_STATES = new Set<ProjectState>([
  "Alabama",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Florida",
  "Georgia",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "South Carolina",
  "Tennessee",
  "Texas",
  "Utah",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
]);

const ALLOWED_TRADES = new Set<Trade>([
  "Roofing",
  "Siding",
  "Painting",
  "Drywall",
  "Gutters",
  "Remodeling",
]);

const ALLOWED_SIZES = new Set<ProjectSize>(["Small", "Medium", "Large"]);
const ALLOWED_RISK = new Set<RiskLevel>(["Low", "Medium", "High"]);

function isProjectState(value: string | undefined): value is ProjectState {
  return Boolean(value && ALLOWED_STATES.has(value as ProjectState));
}

function isTrade(value: string | undefined): value is Trade {
  return Boolean(value && ALLOWED_TRADES.has(value as Trade));
}

function isProjectSize(value: string | undefined): value is ProjectSize {
  return Boolean(value && ALLOWED_SIZES.has(value as ProjectSize));
}

function isRiskLevel(value: string | undefined): value is RiskLevel {
  return Boolean(value && ALLOWED_RISK.has(value as RiskLevel));
}

function getSelectedResult(quote: Quote, option: PriceOptionName) {
  if (option === "Good") return quote.good;
  if (option === "Better") return quote.better;
  return quote.best;
}

function normalizeProjectFromQuote(quote: Quote): Project {
  const option = quote.selectedOption ?? "Better";
  const selected = getSelectedResult(quote, option);
  const projectId = crypto.randomUUID();

  return {
    id: projectId,
    quoteId: quote.id,
    proposalId: quote.id,
    selectedOptionId: quote.id,
    selectedTier: option,
    approvedAmount: selected.salePrice,
    projectName: quote.projectName || "New Project",
    customerName: quote.customerName || "Customer",
    customerPhone: quote.customerPhone ?? "",
    customerEmail: quote.customerEmail ?? "",
    address: quote.jobAddress ?? "",
    city: quote.jobCity ?? "",
    state: isProjectState(quote.jobState) ? quote.jobState : "Connecticut",
    zipCode: quote.jobZipCode ?? "",
    trade: isTrade(quote.trade) ? quote.trade : "Remodeling",
    projectSize: isProjectSize(quote.projectSize) ? quote.projectSize : "Medium",
    riskLevel: isRiskLevel(quote.riskLevel) ? quote.riskLevel : "Medium",
    status: "not_started",
    notes: [
      `Created automatically from proposal ${quote.proposalNumber ?? quote.id}.`,
      `Selected option: ${option}.`,
      `Final agreed price: ${Math.round(selected.salePrice)}.`,
      quote.scopeSummary ? `Scope: ${quote.scopeSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    costs: {
      materials: 0,
      labor: 0,
      dumpster: 0,
      permits: 0,
      equipment: 0,
      subcontractor: 0,
      miscellaneous: 0,
    },
    createdAt: getTodayLabel(),
    contactId: quote.contactId,
  };
}

export async function convertAcceptedQuoteToProject(params: {
  admin: AdminClient;
  companyId: string;
  quoteId: string;
  quote: Quote;
}) {
  const { admin, companyId, quoteId, quote } = params;
  if (quote.status !== "Accepted" && quote.status !== "converted_to_project") {
    return { created: false, projectId: quote.projectId ?? null };
  }
  const { data: existingProject, error: existingError } = await admin
    .from("projects")
    .select("id")
    .eq("company_id", companyId)
    .eq("proposal_id", quoteId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existingProject?.id) {
    if (!quote.projectId || quote.status !== "converted_to_project") {
      const linkedQuote: Quote = {
        ...quote,
        projectId: existingProject.id as string,
        projectCreatedAt: quote.projectCreatedAt ?? new Date().toISOString(),
        projectCreatedFromProposalId: quoteId,
        status: "converted_to_project",
      };
      const { error: updateQuoteError } = await admin
        .from("quotes")
        .update({ project_id: existingProject.id, data: linkedQuote })
        .eq("id", quoteId);
      if (updateQuoteError) throw new Error(updateQuoteError.message);
    }
    return { created: false, projectId: existingProject.id as string };
  }

  const project = normalizeProjectFromQuote({ ...quote, id: quoteId });
  const nowIso = new Date().toISOString();

  const { error: insertProjectError } = await admin.from("projects").insert({
    id: project.id,
    company_id: companyId,
    project_name: project.projectName,
    customer_name: project.customerName,
    customer_phone: project.customerPhone,
    customer_email: project.customerEmail,
    address: project.address,
    city: project.city,
    state: project.state,
    zip_code: project.zipCode,
    trade: project.trade,
    status: project.status,
    notes: project.notes,
    costs: project.costs,
    project_size: project.projectSize,
    risk_level: project.riskLevel,
    contact_id: project.contactId ?? null,
    quote_id: quoteId,
    proposal_id: quoteId,
    selected_option_id: quoteId,
    selected_tier: project.selectedTier,
    approved_amount: project.approvedAmount,
  });

  // If project already exists (idempotent key), continue linking quote.
  if (insertProjectError && insertProjectError.code !== "23505") {
    throw new Error(insertProjectError.message);
  }

  const nextQuote: Quote = {
    ...quote,
    projectId: project.id,
    projectCreatedAt: nowIso,
    projectCreatedFromProposalId: quoteId,
    status: "converted_to_project",
  };

  const { error: updateQuoteError } = await admin
    .from("quotes")
    .update({ project_id: project.id, data: nextQuote })
    .eq("id", quoteId);
  if (updateQuoteError) throw new Error(updateQuoteError.message);

  return { created: true, projectId: project.id };
}

export const ensureProjectForAcceptedPaidQuote = convertAcceptedQuoteToProject;
