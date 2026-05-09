"use client";

import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ProjectDetailPanel } from "@/components/projects/project-detail-panel";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import {
  calculateProjectPricing,
  defaultSettings,
  getExpirationLabel,
  getNextProposalNumber,
  getTodayLabel,
  formatMargin,
  formatMoney,
  getTotalCost,
  initialContacts,
  initialProjects,
  storageKeys,
  statusOptions,
  tradeOptions,
  type Contact,
  type AppSettings,
  type PricingResult,
  type PriceOptionName,
  type Project,
  type ProjectStatus,
  type Quote,
  type Trade,
} from "@/lib/projects";
import { useLocalStorageState, writeLocalStorage } from "@/lib/use-local-storage";


type StatusFilter = "All" | ProjectStatus;
type TradeFilter = "All" | Trade;
type ProjectDetailTab = "overview" | "costs" | "quote" | "notes";

export default function ProjectsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /**
   * This screen is powered by localStorage (via useLocalStorageState).
   * During SSR, the server cannot read localStorage, which can cause hydration mismatches
   * when the client loads the real data.
   */
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-[#213343]">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading…</p>
          <p className="mt-2 text-sm text-gray-500">Preparing your projects.</p>
        </div>
      </div>
    );
  }

  return <ProjectsPageClient router={router} />;
}

function ProjectsPageClient({ router }: { router: ReturnType<typeof useRouter> }) {
  const [projects, setProjects] = useLocalStorageState<Project[]>(
    storageKeys.projects,
    initialProjects
  );
  const [contacts, setContacts] = useLocalStorageState<Contact[]>(
    storageKeys.contacts,
    initialContacts
  );
  const [quotes, setQuotes] = useLocalStorageState<Quote[]>(storageKeys.quotes, []);
  const [settings] = useLocalStorageState<AppSettings>(
    storageKeys.settings,
    defaultSettings
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [tradeFilter, setTradeFilter] = useState<TradeFilter>("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [initialProjectTab, setInitialProjectTab] =
    useState<ProjectDetailTab>("costs");
  const [pricingByProject, setPricingByProject] = useState<
    Record<string, PricingResult[]>
  >({});

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.projectName.toLowerCase().includes(query) ||
        project.customerName.toLowerCase().includes(query) ||
        project.address.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || project.status === statusFilter;
      const matchesTrade =
        tradeFilter === "All" || project.trade === tradeFilter;

      return matchesSearch && matchesStatus && matchesTrade;
    });
  }, [projects, search, statusFilter, tradeFilter]);

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");

    if (!projectId) return;

    setSelectedProjectId(projectId);
    setInitialProjectTab(getProjectTab(params.get("projectTab")));
  }, []);

  function createProject(project: Project) {
    setProjects((current) => [project, ...current]);
    setSelectedProjectId(project.id);
    setIsFormOpen(false);
  }

  function createContact(contact: Omit<Contact, "id" | "createdAt">) {
    const existing = contacts.find(
      (item) =>
        (Boolean(contact.email) && Boolean(item.email) && sameText(item.email, contact.email)) ||
        (Boolean(contact.phone) && Boolean(item.phone) && samePhone(item.phone, contact.phone)) ||
        sameText(item.name, contact.name)
    );

    if (existing) return existing;

    const nextContact: Contact = {
      id: crypto.randomUUID(),
      ...contact,
      createdAt: getTodayLabel(),
    };
    setContacts((current) => [nextContact, ...current]);
    return nextContact;
  }

  function duplicateProject(project: Project) {
    const copy: Project = {
      ...project,
      id: crypto.randomUUID(),
      projectName: `${project.projectName} (Copy)`,
      status: "Draft",
      createdAt: getTodayLabel(),
      contactId: project.contactId,
    };
    setProjects((current) => [copy, ...current]);
    setSelectedProjectId(copy.id);
  }

  function updateProject(updatedProject: Project) {
    setProjects((current) =>
      current.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
  }

  function priceProject(project: Project) {
    const pricedProject: Project = {
      ...project,
      status: project.status === "Draft" ? "Pricing" : project.status,
    };

    updateProject(pricedProject);
    setPricingByProject((current) => ({
      ...current,
      [project.id]: calculateProjectPricing(pricedProject, settings),
    }));
    setSelectedProjectId(project.id);
    writeLocalStorage(storageKeys.projectForPricing, project.id);
    router.push("/pricing");
  }

  function createQuoteFromProject(
    project: Project,
    pricing: PricingResult[],
    selectedOption: PriceOptionName,
    snapshot?: {
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      trade?: string;
      warrantyText?: string;
      termsText?: string;
      proposalTitle?: string;
    }
  ) {
    const nextProject: Project = { ...project, status: "Quoted" };
    const id = crypto.randomUUID();
    const contact =
      contacts.find((item) => item.id === project.contactId) ??
      contacts.find(
        (item) =>
          sameText(item.name, project.customerName) ||
          (Boolean(item.email) && sameText(item.email, project.customerEmail)) ||
          (Boolean(item.phone) && sameText(item.phone, project.customerPhone))
      );
    const quote: Quote = {
      id,
      projectId: project.id,
      contactId: contact?.id,
      projectName: project.projectName,
      customerName: project.customerName,
      customerPhone: snapshot?.customerPhone,
      customerEmail: snapshot?.customerEmail,
      customerAddress: snapshot?.customerAddress,
      trade: snapshot?.trade,
      proposalTitle: snapshot?.proposalTitle,
      proposalNumber: getNextProposalNumber(),
      warrantyText: snapshot?.warrantyText,
      termsText: snapshot?.termsText,
      good: pricing[0],
      better: pricing[1],
      best: pricing[2],
      selectedOption,
      status: "Draft",
      createdAt: getTodayLabel(),
      expiresAt: getExpirationLabel(14),
    };

    updateProject(nextProject);
    setQuotes((current) => [quote, ...current]);
    setPricingByProject((current) => ({
      ...current,
      [project.id]: pricing,
    }));
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Projects</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Projects
              </h2>
              <p className="mt-3 max-w-2xl text-gray-500">
                Manage job opportunities, costs, and pricing recommendations.
              </p>
            </div>

            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff5c35] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#e94820]"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </header>

          <section className="mt-8 rounded-lg border border-[#d9e2ec] bg-white p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by project, customer, or address"
                  className="w-full rounded-md border border-[#d9e2ec] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35]"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              >
                <option value="All">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <select
                value={tradeFilter}
                onChange={(event) =>
                  setTradeFilter(event.target.value as TradeFilter)
                }
                className="rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
              >
                <option value="All">All trades</option>
                {tradeOptions.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {filteredProjects.length > 0 ? (
            <section className="mt-6 overflow-x-auto rounded-lg border border-[#d9e2ec] bg-white">
              <div className="grid min-w-230 grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
                <span>Project</span>
                <span>Trade</span>
                <span>Status</span>
                <span>Cost</span>
                <span>Better</span>
                <span>Margin</span>
              </div>
              <div className="min-w-230 divide-y divide-gray-100">
                {filteredProjects.map((project) => {
                  const betterPrice = calculateProjectPricing(project, settings).find(
                    (result) => result.name === "Better"
                  );

                  return (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-black">
                          {project.projectName}
                        </p>
                        <p className="mt-1 truncate text-gray-500">
                          {project.customerName} · {project.address}
                        </p>
                      </div>
                      <span className="text-gray-600">{project.trade}</span>
                      <ProjectStatusBadge status={project.status} />
                      <span className="font-medium">
                        {formatMoney(getTotalCost(project.costs))}
                      </span>
                      <span className="font-medium">
                        {formatMoney(betterPrice?.salePrice ?? 0)}
                      </span>
                      <span>{formatMargin(betterPrice?.margin ?? 0)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">
                No projects found
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Try a different search or create a new project.
              </p>
            </section>
          )}
        </div>
      </main>

      {isFormOpen ? (
        <ProjectForm
          onCreate={createProject}
          onCancel={() => setIsFormOpen(false)}
          onCreateContact={createContact}
          contacts={contacts}
        />
      ) : null}

      {selectedProject ? (
        <ProjectDetailPanel
          project={selectedProject}
          key={`${selectedProject.id}-${initialProjectTab}`}
          pricingResults={pricingByProject[selectedProject.id]}
          initialTab={initialProjectTab}
          onClose={() => setSelectedProjectId(null)}
          onUpdateProject={updateProject}
          onPriceProject={priceProject}
          onCreateQuote={createQuoteFromProject}
          onDuplicateProject={duplicateProject}
          quotes={quotes.filter((q) => q.projectId === selectedProject.id)}
          onPreviewQuote={(id) => router.push(`/quotes/preview?id=${id}`)}
        />
      ) : null}
    </div>
  );
}

function getProjectTab(value: string | null): ProjectDetailTab {
  if (
    value === "overview" ||
    value === "costs" ||
    value === "quote" ||
    value === "notes"
  ) {
    return value;
  }

  return "costs";
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function samePhone(left: string, right: string) {
  const digits = (s: string) => s.replace(/\D/g, "");
  return digits(left) === digits(right) && digits(left).length > 0;
}
