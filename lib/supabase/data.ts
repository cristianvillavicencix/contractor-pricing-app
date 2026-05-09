import type { AppSettings, Contact, Project, Quote, ScopeTemplate } from "@/lib/app-data";
import { mergeAppSettings } from "@/lib/app-data";
import { getAppSettingsValidationError } from "@/lib/settings-validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProposalTemplate } from "@/lib/proposal-templates";

type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

async function requireCompanyId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.rpc("current_company_id");
  if (error) throw error;
  if (!data) throw new Error("No company found for this user");
  return data as string;
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
    return { ...q, id: r.id as string, projectId: (r.project_id as string | null) ?? q.projectId };
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
  return { ...q, id: data.id, projectId: data.project_id ?? q.projectId };
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
    return {
      id: r.id as string,
      name: (r.name as string) ?? "",
      phone: (r.phone as string) ?? "",
      email: (r.email as string) ?? "",
      address: (r.address as string) ?? "",
      notes: (r.notes as string) ?? "",
      customerType: ((r.customer_type as string) ?? "Homeowner") as Contact["customerType"],
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
    notes: contact.notes,
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
  const { error } = await supabase.from("proposal_templates").upsert({
    company_id: companyId,
    trade: template.trade,
    name: template.name,
    last_modified: template.lastModified,
    data: template,
  });
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


