"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  defaultSettings,
  mergeAppSettings,
  type Contact as AppContact,
  type Project as AppProject,
  type Quote,
  type TierProduct,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listContacts,
  listProjects,
  listQuotes,
  listTierProducts,
  loadCompanySettings,
} from "@/lib/supabase/data";
import type { AppSettings } from "@/lib/app-data";
import {
  SAMPLE_CONTACTS,
  SAMPLE_PRODUCTS,
  SAMPLE_PROJECTS,
  SAMPLE_PROPOSALS,
  type Contact,
  type Product,
  type Project,
  type ProjectStatus,
  type Proposal,
  type ProposalStatus,
} from "./data";

type V2LiveData = {
  appContacts: AppContact[];
  appProjects: AppProject[];
  tierProducts: TierProduct[];
  contacts: Contact[];
  proposals: Proposal[];
  projects: Project[];
  products: Product[];
  settings: AppSettings;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  contactById: (id: string) => Contact;
};

export function useV2LiveData(): V2LiveData {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const query = useQuery({
    queryKey: ["v2", "live-data"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [rawSettings, appContacts, appProjects, quotes, tierProducts] = await Promise.all([
        loadCompanySettings<AppSettings | null>(supabase),
        listContacts(supabase),
        listProjects(supabase),
        listQuotes(supabase),
        listTierProducts(supabase),
      ]);

      const settings = mergeAppSettings(rawSettings ?? defaultSettings);
      const contacts = adaptContacts(appContacts, appProjects, quotes);
      const proposals = adaptProposals(quotes, contacts);
      const projects = adaptProjects(appProjects, contacts);
      const products = adaptProducts(tierProducts);

      return { settings, appContacts, appProjects, tierProducts, contacts, proposals, projects, products };
    },
  });

  const data = query.data;
  const appContacts = data?.appContacts ?? [];
  const appProjects = data?.appProjects ?? [];
  const tierProducts = data?.tierProducts ?? [];
  const contacts = data?.contacts.length ? data.contacts : SAMPLE_CONTACTS;
  const proposals = data?.proposals.length ? data.proposals : SAMPLE_PROPOSALS;
  const projects = data?.projects.length ? data.projects : SAMPLE_PROJECTS;
  const products = data?.products.length ? data.products : SAMPLE_PRODUCTS;
  const settings = data?.settings ?? defaultSettings;

  const contactMap = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);

  return {
    contacts,
    appContacts,
    appProjects,
    tierProducts,
    proposals,
    projects,
    products,
    settings,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => void query.refetch(),
    contactById: (id: string) =>
      contactMap.get(id) ?? {
        id,
        name: "Unassigned customer",
        biz: "",
        email: "",
        phone: "",
        addr: "",
        since: "",
        projects: 0,
        spent: 0,
        tags: [],
      },
  };
}

function adaptContacts(appContacts: AppContact[], projects: AppProject[], quotes: Quote[]): Contact[] {
  return appContacts.map((contact) => {
    const relatedProjects = projects.filter(
      (project) => project.contactId === contact.id || project.customerEmail === contact.email
    );
    const relatedQuotes = quotes.filter(
      (quote) => quote.contactId === contact.id || quote.customerEmail === contact.email
    );
    const spent = relatedProjects.reduce((sum, project) => sum + (project.approvedAmount ?? 0), 0);
    const tags = getContactTags(contact, relatedProjects, relatedQuotes, spent);

    return {
      id: contact.id,
      name: contact.name || "Unnamed contact",
      biz: contact.customerType,
      email: contact.email,
      phone: contact.phone,
      addr: contact.address || "No address",
      since: toYearMonth(contact.createdAt),
      projects: relatedProjects.length,
      spent,
      tags,
    };
  });
}

function getContactTags(contact: AppContact, projects: AppProject[], quotes: Quote[], spent: number) {
  const tags = new Set<string>();
  if (contact.leadStage === "New" || contact.leadStage === "Qualified") tags.add("Lead");
  if (projects.length > 1 || quotes.length > 1) tags.add("Repeat");
  if (spent >= 25000 || contact.customerType === "Business") tags.add("Premium");
  if (contact.customerType === "Property Manager") tags.add("Property");
  return Array.from(tags.size ? tags : new Set(["New"]));
}

function adaptProposals(quotes: Quote[], contacts: Contact[]): Proposal[] {
  return quotes.map((quote, index) => {
    const selected = selectedResult(quote);
    const contactId = quote.contactId || findContactId(contacts, quote.customerName, quote.customerEmail) || `quote-${quote.id}`;
    return {
      id: quote.proposalNumber || quote.id || `P-${1000 + index}`,
      quoteId: quote.id,
      title: quote.proposalTitle || quote.projectName || "Untitled proposal",
      contactId,
      value: selected.salePrice,
      status: mapProposalStatus(quote.status),
      sent: quote.status === "Draft" ? null : quote.createdAt,
      age: daysSince(quote.createdAt),
      margin: Math.round(selected.margin * 100),
      items: Math.max(quote.includedServices?.length ?? 0, quote.tierMaterialsTable?.[quote.selectedOption]?.length ?? 0, 1),
      builderVersion: quote.builderVersion,
    };
  });
}

function adaptProjects(projects: AppProject[], contacts: Contact[]): Project[] {
  return projects.map((project, index) => {
    const contactId = project.contactId || findContactId(contacts, project.customerName, project.customerEmail) || `project-${project.id}`;
    const start = project.startDate ?? project.createdAt;
    const due = project.endDate ?? estimateDueDate(start, project.status);
    return {
      id: project.proposalId || project.id || `PR-${200 + index}`,
      title: project.projectName || "Untitled project",
      contactId,
      value: project.approvedAmount ?? project.costs?.materials ?? 0,
      status: mapProjectStatus(project.status),
      start,
      due,
      crew: [],
      progress: progressForStatus(project.status),
    };
  });
}

function estimateDueDate(startIso: string, status: AppProject["status"]): string {
  const start = new Date(startIso);
  if (!Number.isFinite(start.getTime())) return startIso;
  const days = status === "scheduled" ? 21 : status === "in_progress" || status === "In Progress" ? 14 : 30;
  const due = new Date(start.getTime() + days * 86_400_000);
  return due.toISOString();
}

function adaptProducts(products: TierProduct[]): Product[] {
  return products.map((product) => ({
    id: product.id,
    cat: String(product.trade || "general").toLowerCase().replace(/\s+/g, "-"),
    tier: mapTier(product.tier),
    active: product.isActive ?? true,
    brand: product.productBrand || "Unbranded",
    name: product.productName || "Unnamed product",
    type: product.productType || product.trade || "Service",
    line: product.productLine || "",
    warranty: product.warrantyYears ? `${product.warrantyYears}y` : "Standard",
    desc: product.description || "No description yet.",
    unit: "unit",
    imageUrl: product.imageUrl,
    warrantyYears: product.warrantyYears,
  }));
}

function selectedResult(quote: Quote) {
  if (quote.selectedOption === "Good") return quote.good;
  if (quote.selectedOption === "Best") return quote.best;
  return quote.better;
}

function mapProposalStatus(status: Quote["status"]): ProposalStatus {
  if (status === "Sent") return "sent";
  if (status === "Viewed") return "viewed";
  if (status === "Accepted" || status === "converted_to_project") return "accepted";
  if (status === "Declined" || status === "Expired") return "declined";
  return "draft";
}

function mapProjectStatus(status: AppProject["status"]): ProjectStatus {
  if (status === "scheduled" || status === "Planned") return "scheduled";
  if (status === "in_progress" || status === "In Progress") return "in_progress";
  if (status === "on_hold" || status === "On Hold") return "on_hold";
  if (status === "completed" || status === "Completed" || status === "closed") return "completed";
  if (status === "invoiced") return "invoiced";
  if (status === "paid" || status === "Won") return "paid";
  return "scheduled";
}

function mapTier(tier: string): Product["tier"] {
  const normalized = tier.toLowerCase();
  if (normalized === "best") return "best";
  if (normalized === "better") return "better";
  return "good";
}

function progressForStatus(status: AppProject["status"]) {
  if (status === "completed" || status === "closed" || status === "paid" || status === "invoiced") return 1;
  if (status === "in_progress" || status === "In Progress") return 0.55;
  if (status === "on_hold" || status === "On Hold") return 0.35;
  return 0;
}

function findContactId(contacts: Contact[], name?: string, email?: string) {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (normalizedEmail) {
    const byEmail = contacts.find((contact) => contact.email.toLowerCase() === normalizedEmail);
    if (byEmail) return byEmail.id;
  }
  const normalizedName = (name ?? "").trim().toLowerCase();
  if (!normalizedName) return undefined;
  return contacts.find((contact) => contact.name.toLowerCase() === normalizedName)?.id;
}

function daysSince(value: string | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function toYearMonth(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
