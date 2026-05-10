"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  formatMargin,
  formatMoney,
  quoteStatusOptions,
  type Contact,
  type PriceOptionName,
  type Project,
  type Quote,
  type QuoteStatus,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { listContacts, listProjects, listQuotes, upsertQuote } from "@/lib/supabase/data";
import { t } from "@/lib/ui-strings";

export default function QuotesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | QuoteStatus>("All");
  const [search, setSearch] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("quoteId")
  );

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const [dbQuotes, dbProjects, dbContacts] = await Promise.all([
        listQuotes(supabase),
        listProjects(supabase),
        listContacts(supabase),
      ]);
      setQuotes(dbQuotes);
      setProjects(dbProjects);
      setContacts(dbContacts);
    } catch (e) {
      if (!silent) {
        setLoadError(e instanceof Error ? e.message : "Failed to load quotes");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch updates list state
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void loadData({ silent: true });
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadData]);

  const filteredQuotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      const matchesStatus = statusFilter === "All" || quote.status === statusFilter;
      const matchesSearch =
        !query ||
        quote.projectName.toLowerCase().includes(query) ||
        quote.customerName.toLowerCase().includes(query) ||
        (quote.proposalNumber ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [quotes, statusFilter, search]);

  function updateQuoteStatus(id: string, status: QuoteStatus) {
    setQuotes((current) => {
      const next = current.map((quote) => (quote.id === id ? { ...quote, status } : quote));
      const updated = next.find((q) => q.id === id);
      if (updated) {
        void (async () => {
          try {
            await upsertQuote(supabase, updated);
            await loadData({ silent: true });
          } catch {
            await loadData({ silent: true });
          }
        })();
      }
      return next;
    });
  }

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  const selectedProject = selectedQuote?.projectId
    ? projects.find((project) => project.id === selectedQuote.projectId)
    : undefined;
  const selectedContact = selectedQuote
    ? findQuoteContact(selectedQuote, contacts)
    : undefined;

  if (isLoading && !loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <PageSkeleton rows={6} />
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md">
            <ErrorPanel message={loadError} onRetry={() => void loadData()} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="page-kicker text-sm font-medium">Quotes</p>
              <h2 className="page-title mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Quotes
              </h2>
              <p className="page-description mt-3 max-w-2xl text-sm">
                Review and export client-ready proposals from your pricing results.
              </p>
            </div>

            <Link
              href="/pricing"
              className="rounded-md bg-[var(--brand-accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--brand-accent-hover)]"
            >
              New Pricing
            </Link>
          </header>

          <section className="mt-8 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by project, customer, or proposal #"
                  className="w-full rounded-md border border-[#d9e2ec] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35]"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | QuoteStatus)}
                className="rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35] sm:w-48"
              >
                <option value="All">All statuses</option>
                {quoteStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {filteredQuotes.length > 0 ? (
            <section className="mt-6">
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filteredQuotes.map((quote) => {
                  const selected = getSelectedResult(quote);
                  const expired = isExpired(quote);
                  return (
                    <button
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className="w-full elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-4 text-left transition hover:bg-[#f6f8fb]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-black">{quote.projectName}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{quote.customerName}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {expired && (quote.status === "Draft" || quote.status === "Sent") ? (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">Expired</span>
                          ) : null}
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                            quote.status === "Accepted" ? "bg-green-50 text-green-700" :
                            quote.status === "Sent" ? "bg-blue-50 text-blue-700" :
                            quote.status === "Declined" ? "bg-red-50 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{quote.status}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3 text-sm">
                        <span className="font-semibold">{formatMoney(selected.salePrice)}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">{formatMargin(selected.margin)} margin</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{quote.selectedOption}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 sm:block">
                <div className="grid min-w-215 grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-5 py-3 text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
                  <span>Quote</span>
                  <span>Status</span>
                  <span>Selected</span>
                  <span>Sale Price</span>
                  <span>Profit</span>
                  <span>Margin</span>
                </div>
                <div className="min-w-215 divide-y divide-gray-100">
                  {filteredQuotes.map((quote) => {
                    const selected = getSelectedResult(quote);
                    const expired = isExpired(quote);
                    return (
                      <button
                        key={quote.id}
                        onClick={() => setSelectedQuoteId(quote.id)}
                        className="grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-black">{quote.projectName}</p>
                          <p className="mt-1 truncate text-gray-500">
                            {quote.customerName} ·{" "}
                            {expired && (quote.status === "Draft" || quote.status === "Sent") ? (
                              <span className="font-medium text-red-500">Expired {quote.expiresAt}</span>
                            ) : (
                              <span>expires {quote.expiresAt}</span>
                            )}
                          </p>
                        </div>
                        <span className="text-gray-600">{quote.status}</span>
                        <span>{quote.selectedOption}</span>
                        <span className="font-medium">{formatMoney(selected.salePrice)}</span>
                        <span>{formatMoney(selected.profit)}</span>
                        <span>{formatMargin(selected.margin)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-6 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">
                {quotes.length === 0 ? t("emptyQuotes") : "No quotes match filters"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {quotes.length === 0 ? t("emptyQuotesHint") : "Try another search or status."}
              </p>
              {quotes.length === 0 ? (
                <Link
                  href="/projects"
                  className="mt-4 inline-block text-sm font-medium text-[var(--brand-accent)] hover:underline"
                >
                  Go to projects →
                </Link>
              ) : null}
            </section>
          )}
        </div>
      </main>

      {selectedQuote ? (
        <QuoteDetailPanel
          quote={selectedQuote}
          project={selectedProject}
          contact={selectedContact}
          onClose={() => setSelectedQuoteId(null)}
          onStatusChange={(status) => updateQuoteStatus(selectedQuote.id, status)}
          onOpenProject={(projectId) => router.push(`/projects?projectId=${projectId}`)}
          onOpenContact={(contactId) => router.push(`/contacts?contactId=${contactId}`)}
          onPreview={() => router.push(`/quotes/preview?id=${selectedQuote.id}`)}
          onReprice={selectedQuote.projectId
            ? () => router.push(`/projects?projectId=${selectedQuote.projectId}&projectTab=costs`)
            : undefined}
        />
      ) : null}
    </div>
  );
}

function QuoteDetailPanel({
  quote,
  project,
  contact,
  onClose,
  onStatusChange,
  onOpenProject,
  onOpenContact,
  onPreview,
  onReprice,
}: {
  quote: Quote;
  project?: Project;
  contact?: Contact;
  onClose: () => void;
  onStatusChange: (status: QuoteStatus) => void;
  onOpenProject: (projectId: string) => void;
  onOpenContact: (contactId: string) => void;
  onPreview: () => void;
  onReprice?: () => void;
}) {
  const selected = getSelectedResult(quote);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#213343]/20 backdrop-blur-sm"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full overflow-auto border-l border-[#d9e2ec] bg-white p-5 sm:p-6 lg:w-1/2"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {quote.projectName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {quote.customerName}
              {quote.proposalNumber ? ` · ${quote.proposalNumber}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Close
          </button>
        </div>

        {/* Preview CTA */}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onPreview}
            className="flex flex-1 items-center justify-between gap-3 rounded-md border border-[#111111] bg-[#111111] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#333333]"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4" />
              Preview &amp; Download PDF
            </div>
            <span className="text-xs text-white/60">→</span>
          </button>
          {onReprice && (
            <button
              onClick={onReprice}
              className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-3.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
              title="Go to project costs to reprice"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
              Reprice
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mt-6">
          <label className="block text-sm font-medium">
            Status
            <select
              value={quote.status}
              onChange={(e) => onStatusChange(e.target.value as QuoteStatus)}
              className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
            >
              {quoteStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            disabled={!contact}
            onClick={() => contact && onOpenContact(contact.id)}
            className="rounded-md border border-[#d9e2ec] px-4 py-3 text-left text-sm transition hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block text-xs text-gray-500">Contact</span>
            <span className="mt-1 block font-medium">
              {contact?.name ?? quote.customerName}
            </span>
          </button>
          <button
            disabled={!project}
            onClick={() => project && onOpenProject(project.id)}
            className="rounded-md border border-[#d9e2ec] px-4 py-3 text-left text-sm transition hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block text-xs text-gray-500">Project</span>
            <span className="mt-1 block font-medium">{quote.projectName}</span>
          </button>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <Metric label="Selected" value={quote.selectedOption} />
          <Metric label="Sale Price" value={formatMoney(selected.salePrice)} />
          <Metric label="Profit" value={formatMoney(selected.profit)} />
          <Metric label="Margin" value={formatMargin(selected.margin)} />
          <Metric label="Created" value={quote.createdAt} />
          <Metric
            label="Expires"
            value={quote.expiresAt}
            alert={isExpired(quote) && (quote.status === "Draft" || quote.status === "Sent")}
          />
          {quote.signedAt && (
            <Metric
              label="Signed"
              value={`${new Date(quote.signedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${quote.signedBy ? ` by ${quote.signedBy}` : ""}`}
            />
          )}
        </div>

        {/* Pricing options */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(["Good", "Better", "Best"] as PriceOptionName[]).map((name) => {
            const result = getQuoteResult(quote, name);
            return (
              <div
                key={name}
                className={`rounded border p-3 text-sm ${
                  quote.selectedOption === name
                    ? "border-black bg-[#f6f8fb]"
                    : "border-[#d9e2ec]"
                }`}
              >
                <p className="font-medium">{name}</p>
                <p className="mt-2 text-gray-600">{formatMoney(result.salePrice)}</p>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function getSelectedResult(quote: Quote) {
  return getQuoteResult(quote, quote.selectedOption);
}

function getQuoteResult(quote: Quote, option: PriceOptionName) {
  if (option === "Good") return quote.good;
  if (option === "Better") return quote.better;
  return quote.best;
}

function findQuoteContact(quote: Quote, contacts: Contact[]) {
  return contacts.find(
    (contact) =>
      contact.id === quote.contactId ||
      contact.name.trim().toLowerCase() === quote.customerName.trim().toLowerCase() ||
      (Boolean(contact.email) &&
        contact.email.trim().toLowerCase() ===
          (quote.customerEmail ?? "").trim().toLowerCase()) ||
      (Boolean(contact.phone) &&
        samePhone(contact.phone, quote.customerPhone ?? ""))
  );
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p className={`mt-1 font-medium ${alert ? "text-red-500" : "text-black"}`}>{value}</p>
    </div>
  );
}

function isExpired(quote: Quote) {
  if (!quote.expiresAt) return false;
  const expiry = new Date(quote.expiresAt);
  return expiry < new Date();
}

function samePhone(left: string, right: string) {
  const leftDigits = left.replace(/\D/g, "");
  const rightDigits = right.replace(/\D/g, "");
  return leftDigits.length > 0 && leftDigits === rightDigits;
}
