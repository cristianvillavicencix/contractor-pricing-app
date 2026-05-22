import type {
  AppSettings,
  Contact,
  LeadStage,
  PaymentStatus,
  PriceOptionName,
  Project,
  Quote,
  ScopeTemplate,
  TierProduct,
} from "@/lib/app-data";
import { mergeAppSettings } from "@/lib/app-data";
import { getAppSettingsValidationError } from "@/lib/settings-validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getDefaultTierProducts, mergeTierProductsWithDefaults } from "@/lib/tier-products-defaults";
import type { ProposalTemplate } from "@/lib/proposal-templates";

type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;
const CONTACT_META_MARKER = "\n[[CRM_META]]";

function splitContactNotes(value: string | null | undefined) {
  const source = value ?? "";
  const markerIdx = source.lastIndexOf(CONTACT_META_MARKER);
  if (markerIdx < 0) return { notes: source, meta: {} as Partial<Contact> };
  const notes = source.slice(0, markerIdx).trimEnd();
  const payload = source.slice(markerIdx + CONTACT_META_MARKER.length);
  try {
    return {
      notes,
      meta: JSON.parse(payload) as Partial<Contact>,
    };
  } catch {
    return { notes: source, meta: {} as Partial<Contact> };
  }
}

function withContactMeta(contact: Contact) {
  const meta = {
    leadStage: contact.leadStage,
    leadSource: contact.leadSource ?? "",
    nextFollowUpAt: contact.nextFollowUpAt ?? "",
    owner: contact.owner ?? "",
  };
  const notes = contact.notes.trimEnd();
  return `${notes}${CONTACT_META_MARKER}${JSON.stringify(meta)}`;
}

function normalizeLeadStage(value: string | undefined): LeadStage {
  if (value === "Qualified") return "Qualified";
  if (value === "Proposal Sent") return "Proposal Sent";
  if (value === "Negotiation") return "Negotiation";
  if (value === "Won") return "Won";
  if (value === "Lost") return "Lost";
  return "New";
}

function normalizePaymentStatus(value: string | undefined): PaymentStatus {
  if (value === "Paid") return "Paid";
  if (value === "Failed") return "Failed";
  if (value === "Refunded") return "Refunded";
  return "Pending";
}

function nullableUuid(value: string | undefined) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

// Promise cache keyed by user ID — eliminates redundant RPC calls within the same session.
// Parallel callers share the same in-flight promise instead of each firing their own RPC.
const _companyIdCache = new Map<string, PromiseLike<string>>();

function isMissingOptionalTableError(error: unknown) {
  const maybeError = error as { code?: string; message?: string } | null | undefined;
  const message = maybeError?.message?.toLowerCase() ?? "";
  return (
    maybeError?.code === "PGRST205" ||
    maybeError?.code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  );
}

function isMissingColumnError(error: unknown) {
  const maybeError = error as { code?: string; message?: string } | null | undefined;
  const message = maybeError?.message?.toLowerCase() ?? "";
  return (
    maybeError?.code === "PGRST204" ||
    (message.includes("could not find the") && message.includes("column"))
  );
}

export function clearCompanyIdCache() {
  _companyIdCache.clear();
}

async function requireCompanyId(supabase: SupabaseClient): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? "anon";

  if (!_companyIdCache.has(userId)) {
    const promise = supabase.rpc("current_company_id").then(({ data, error }) => {
      if (error) { _companyIdCache.delete(userId); throw error; }
      if (!data) { _companyIdCache.delete(userId); throw new Error("No company found for this user"); }
      return data as string;
    });
    _companyIdCache.set(userId, promise);
  }

  return _companyIdCache.get(userId)!;
}

export async function loadCompanySettings<T = unknown>(supabase: SupabaseClient): Promise<T | null> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("company_settings")
    .select("data")
    .eq("company_id", companyId)
    .single();
  if (error) throw error;
  return (data?.data ?? null) as T | null;
}

export async function saveCompanySettings(supabase: SupabaseClient, settings: unknown) {
  const companyId = await requireCompanyId(supabase);
  const merged = mergeAppSettings(settings as AppSettings);
  const validationError = getAppSettingsValidationError(merged);
  if (validationError) throw new Error(validationError);
  const { error } = await supabase.from("company_settings").upsert({
    company_id: companyId,
    data: merged,
  });
  if (error) throw error;
}

export async function listProjects(supabase: SupabaseClient): Promise<Project[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      quoteId: (r.quote_id as string | undefined) ?? undefined,
      proposalId: (r.proposal_id as string | undefined) ?? undefined,
      selectedOptionId: (r.selected_option_id as string | undefined) ?? undefined,
      selectedTier: (r.selected_tier as PriceOptionName | undefined) ?? undefined,
      approvedAmount: (r.approved_amount as number | undefined) ?? undefined,
      projectName: r.project_name as string,
      customerName: r.customer_name as string,
      customerPhone: (r.customer_phone as string) ?? "",
      customerEmail: (r.customer_email as string) ?? "",
      address: (r.address as string) ?? "",
      city: (r.city as string) ?? "",
      state: (r.state as string) ?? "",
      zipCode: (r.zip_code as string) ?? "",
      trade: (r.trade as string) ?? "",
      projectSize: (r.project_size as Project["projectSize"]) ?? "Medium",
      riskLevel: (r.risk_level as Project["riskLevel"]) ?? "Medium",
      status: (r.status as Project["status"]) ?? "Draft",
      notes: (r.notes as string) ?? "",
      costs: (r.costs ?? {}) as Project["costs"],
      createdAt: r.created_at as string,
      contactId: (r.contact_id as string | undefined) ?? undefined,
      startDate: (r.start_date as string | undefined) ?? undefined,
      endDate: (r.end_date as string | undefined) ?? undefined,
    } as Project;
  });
}

export async function upsertProject(supabase: SupabaseClient, project: Project) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("projects").upsert({
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
    costs: project.costs as Project["costs"],
    project_size: project.projectSize,
    risk_level: project.riskLevel,
    contact_id: project.contactId ?? null,
    quote_id: project.quoteId ?? null,
    proposal_id: project.proposalId ?? null,
    selected_option_id: project.selectedOptionId ?? null,
    selected_tier: project.selectedTier ?? null,
    approved_amount: project.approvedAmount ?? null,
    start_date: project.startDate ?? null,
    end_date: project.endDate ?? null,
  });
  if (error) throw error;
}

export async function deleteProject(supabase: SupabaseClient, projectId: string) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function listQuotes(supabase: SupabaseClient): Promise<Quote[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("quotes")
    .select("id, project_id, data, created_at, updated_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const q = (r.data ?? {}) as Quote;
    return {
      ...q,
      id: r.id as string,
      projectId: (r.project_id as string | null) ?? q.projectId,
      depositStatus: normalizePaymentStatus(q.depositStatus),
    };
  });
}

export async function getQuote(supabase: SupabaseClient, quoteId: string): Promise<Quote | null> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("quotes")
    .select("id, project_id, data")
    .eq("company_id", companyId)
    .eq("id", quoteId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const q = (data.data ?? {}) as Quote;
  return {
    ...q,
    id: data.id,
    projectId: data.project_id ?? q.projectId,
    depositStatus: normalizePaymentStatus(q.depositStatus),
  };
}

export async function upsertQuote(supabase: SupabaseClient, quote: Quote) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("quotes").upsert({
    id: quote.id,
    company_id: companyId,
    project_id: quote.projectId ?? null,
    data: quote,
  });
  if (error) throw error;
}

export async function deleteQuote(supabase: SupabaseClient, quoteId: string) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("company_id", companyId)
    .eq("id", quoteId);
  if (error) throw error;
}

export async function listContacts(supabase: SupabaseClient): Promise<Contact[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const rawNotes = (r.notes as string) ?? "";
    const parsed = splitContactNotes(rawNotes);
    return {
      id: r.id as string,
      name: (r.name as string) ?? "",
      phone: (r.phone as string) ?? "",
      email: (r.email as string) ?? "",
      address: (r.address as string) ?? "",
      notes: parsed.notes,
      customerType: ((r.customer_type as string) ?? "Homeowner") as Contact["customerType"],
      leadStage: normalizeLeadStage(parsed.meta.leadStage as string | undefined),
      leadSource: (parsed.meta.leadSource as string | undefined) ?? "",
      nextFollowUpAt: (parsed.meta.nextFollowUpAt as string | undefined) ?? "",
      owner: (parsed.meta.owner as string | undefined) ?? "",
      createdAt: r.created_at as string,
    } as Contact;
  });
}

export async function upsertContact(supabase: SupabaseClient, contact: Contact) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("contacts").upsert({
    id: contact.id,
    company_id: companyId,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    address: contact.address,
    notes: withContactMeta(contact),
    customer_type: contact.customerType,
  });
  if (error) throw error;
}

export async function deleteContact(supabase: SupabaseClient, contactId: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) throw error;
}

export async function listScopeTemplates(supabase: SupabaseClient): Promise<ScopeTemplate[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("scope_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: (r.name as string) ?? "",
      trade: (r.trade as string) ?? "General",
      text: (r.text as string) ?? "",
    } as ScopeTemplate;
  });
}

export async function upsertScopeTemplate(supabase: SupabaseClient, template: ScopeTemplate) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("scope_templates").upsert({
    id: template.id,
    company_id: companyId,
    name: template.name,
    trade: template.trade,
    text: template.text,
  });
  if (error) throw error;
}

export async function getProposalTemplateForTrade(
  supabase: SupabaseClient,
  trade: string | undefined
): Promise<ProposalTemplate | null> {
  const companyId = await requireCompanyId(supabase);
  const t = (trade ?? "").trim();
  if (!t) return null;
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("data")
    .eq("company_id", companyId)
    .eq("trade", t)
    .maybeSingle();
  if (error) throw error;
  return (data?.data ?? null) as ProposalTemplate | null;
}

export async function listProposalTemplates(supabase: SupabaseClient): Promise<ProposalTemplate[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("proposal_templates")
    .select("data")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => (row as Record<string, unknown>).data as ProposalTemplate);
}

export async function upsertProposalTemplate(supabase: SupabaseClient, template: ProposalTemplate) {
  const companyId = await requireCompanyId(supabase);
  const storageKey = template.builderVersion === "blocks" ? template.id : template.trade;
  const { error } = await supabase.from("proposal_templates").upsert({
    company_id: companyId,
    trade: storageKey,
    name: template.name,
    last_modified: template.lastModified,
    data: template,
  });
  if (error) throw error;
}

export async function deleteProposalTemplate(supabase: SupabaseClient, trade: string) {
  const companyId = await requireCompanyId(supabase);
  const t = trade.trim();
  if (!t) throw new Error("Trade is required to delete a template");
  const { error } = await supabase
    .from("proposal_templates")
    .delete()
    .eq("company_id", companyId)
    .eq("trade", t);
  if (error) throw error;
}

export async function listQuoteVersions(
  supabase: SupabaseClient,
  quoteId: string
): Promise<Array<{ id: string; savedAt: string; snapshot: unknown }>> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("quote_versions")
    .select("id, saved_at, snapshot")
    .eq("company_id", companyId)
    .eq("quote_id", quoteId)
    .order("saved_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return { id: r.id as string, savedAt: r.saved_at as string, snapshot: r.snapshot as unknown };
  });
}

export async function saveQuoteVersion(supabase: SupabaseClient, quoteId: string, snapshot: unknown) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("quote_versions").insert({
    company_id: companyId,
    quote_id: quoteId,
    snapshot,
  });
  if (error) throw error;
}

export async function uploadImageViaApi(args: {
  bucket: "proposal-photos" | "branding";
  fileName: string;
  contentType: string;
  dataUrl: string;
}): Promise<{ path: string }> {
  const res = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: args.bucket,
      path: args.fileName,
      contentType: args.contentType,
      dataUrl: args.dataUrl,
    }),
  });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()) as { path: string };
}

export async function listTierProducts(supabase: SupabaseClient): Promise<TierProduct[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("company_tier_products")
    .select("*")
    .eq("company_id", companyId);
  if (isMissingOptionalTableError(error)) return getDefaultTierProducts();
  if (error) throw error;
  const products = (data ?? []).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      trade: (r.trade as string) ?? "",
      tier: (r.tier as string) ?? "",
      productName: (r.product_name as string) ?? "",
      productType: (r.product_type as string) ?? "",
      productBrand: (r.product_brand as string) ?? "",
      productLine: (r.product_line as string) ?? "",
      imageUrl: (r.image_url as string) ?? "",
      warrantyYears: (r.warranty_years as number) ?? 0,
      productId: (r.product_id as string) ?? undefined,
      description: (r.description as string) ?? "",
      isActive: (r.is_active as boolean) ?? true,
    } as TierProduct;
  });
  return mergeTierProductsWithDefaults(products);
}

export async function upsertTierProduct(supabase: SupabaseClient, product: TierProduct) {
  const companyId = await requireCompanyId(supabase);
  const row = {
    id: product.id,
    company_id: companyId,
    trade: product.trade,
    tier: product.tier,
    product_name: product.productName,
    product_type: product.productType ?? "",
    product_id: nullableUuid(product.productId),
    description: product.description ?? "",
    product_brand: product.productBrand,
    product_line: product.productLine,
    image_url: product.imageUrl,
    warranty_years: product.warrantyYears,
    is_active: product.isActive ?? true,
  };
  const { error } = await supabase.from("company_tier_products").upsert(row);
  if (isMissingOptionalTableError(error)) return;
  if (isMissingColumnError(error)) {
    const legacyRow: Partial<typeof row> = { ...row };
    for (const key of [
      "description",
      "is_active",
      "product_id",
      "product_type",
    ] as const) {
      delete legacyRow[key];
    }
    const { error: legacyError } = await supabase.from("company_tier_products").upsert(legacyRow);
    if (legacyError) throw legacyError;
    return;
  }
  if (error) throw error;
}

export async function deleteTierProduct(supabase: SupabaseClient, id: string) {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase
    .from("company_tier_products")
    .delete()
    .eq("company_id", companyId)
    .eq("id", id);
  if (isMissingOptionalTableError(error)) return;
  if (error) throw error;
}

// ─── Contact Notes ────────────────────────────────────────────────────────────

export type ContactNote = {
  id: string;
  contactId: string;
  kind: "note" | "task";
  body: string;
  done: boolean;
  createdAt: string;
};

export async function listContactNotes(supabase: SupabaseClient, contactId: string): Promise<ContactNote[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("contact_notes")
    .select("*")
    .eq("company_id", companyId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingOptionalTableError(error)) return [];
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    contactId: r.contact_id as string,
    kind: (r.kind as "note" | "task") ?? "note",
    body: (r.body as string) ?? "",
    done: (r.done as boolean) ?? false,
    createdAt: r.created_at as string,
  }));
}

export async function upsertContactNote(supabase: SupabaseClient, note: ContactNote): Promise<void> {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("contact_notes").upsert({
    id: note.id,
    company_id: companyId,
    contact_id: note.contactId,
    kind: note.kind,
    body: note.body,
    done: note.done,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteContactNote(supabase: SupabaseClient, noteId: string): Promise<void> {
  const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
  if (error) throw error;
}

// ─── Contact Files ─────────────────────────────────────────────────────────────

export type ContactFile = {
  id: string;
  contactId: string;
  name: string;
  ext: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  createdAt: string;
};

export async function listContactFiles(supabase: SupabaseClient, contactId: string): Promise<ContactFile[]> {
  const companyId = await requireCompanyId(supabase);
  const { data, error } = await supabase
    .from("contact_files")
    .select("id, contact_id, name, ext, mime_type, size_bytes, created_at")
    .eq("company_id", companyId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingOptionalTableError(error)) return [];
    throw error;
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    contactId: r.contact_id as string,
    name: r.name as string,
    ext: (r.ext as string) ?? "",
    mimeType: (r.mime_type as string) ?? "",
    sizeBytes: (r.size_bytes as number) ?? 0,
    createdAt: r.created_at as string,
  }));
}

export async function getContactFileWithData(supabase: SupabaseClient, fileId: string): Promise<ContactFile | null> {
  const { data, error } = await supabase
    .from("contact_files")
    .select("*")
    .eq("id", fileId)
    .single();
  if (error) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    contactId: r.contact_id as string,
    name: r.name as string,
    ext: (r.ext as string) ?? "",
    mimeType: (r.mime_type as string) ?? "",
    sizeBytes: (r.size_bytes as number) ?? 0,
    dataUrl: (r.data_url as string | undefined) ?? undefined,
    createdAt: r.created_at as string,
  };
}

export async function upsertContactFile(supabase: SupabaseClient, file: ContactFile): Promise<void> {
  const companyId = await requireCompanyId(supabase);
  const { error } = await supabase.from("contact_files").upsert({
    id: file.id,
    company_id: companyId,
    contact_id: file.contactId,
    name: file.name,
    ext: file.ext,
    mime_type: file.mimeType,
    size_bytes: file.sizeBytes,
    data_url: file.dataUrl ?? null,
  });
  if (error) throw error;
}

export async function deleteContactFile(supabase: SupabaseClient, fileId: string): Promise<void> {
  const { error } = await supabase.from("contact_files").delete().eq("id", fileId);
  if (error) throw error;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function getSignedUrlViaApi(args: {
  bucket: "proposal-photos" | "branding";
  path: string;
  expiresIn?: number;
}): Promise<string> {
  const res = await fetch("/api/storage/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error("Signed URL failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}
