"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  type Contact,
  formatMargin,
  formatMoney,
  type Project,
  quoteStatusOptions,
  type PriceOptionName,
  type Quote,
  type QuoteStatus,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteQuote,
  listContacts,
  listProjects,
  listQuotes,
  upsertQuote,
} from "@/lib/supabase/data";
import { t } from "@/lib/ui-strings";

type ProposalsPageCache = {
  quotes: Quote[];
  projects: Project[];
  contacts: Contact[];
};

let proposalsPageCache: ProposalsPageCache | null = null;

export default function QuotesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [quotes, setQuotes] = useState<Quote[]>(() => proposalsPageCache?.quotes ?? []);
  const [projects, setProjects] = useState<Project[]>(() => proposalsPageCache?.projects ?? []);
  const [contacts, setContacts] = useState<Contact[]>(() => proposalsPageCache?.contacts ?? []);
  const [isLoading, setIsLoading] = useState(() => !proposalsPageCache);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | QuoteStatus>("All");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const shouldBlock = !silent && !proposalsPageCache;
    if (!silent) {
      if (shouldBlock) setIsLoading(true);
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
      proposalsPageCache = {
        quotes: dbQuotes,
        projects: dbProjects,
        contacts: dbContacts,
      };
    } catch (e) {
      if (!silent) {
        setLoadError(e instanceof Error ? e.message : "Failed to load proposals");
      }
    } finally {
      if (shouldBlock) {
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

  function openQuoteEditor(quoteId: string) {
    router.push(`/quotes/preview?id=${quoteId}`);
  }

  function printQuote(quoteId: string) {
    window.open(`/proposal/${quoteId}/print`, "_blank", "noopener,noreferrer");
  }

  async function removeQuote(quoteId: string) {
    const ok = window.confirm("Delete this proposal? This cannot be undone.");
    if (!ok) return;
    const previous = quotes;
    setQuotes((current) => current.filter((quote) => quote.id !== quoteId));
    try {
      await deleteQuote(supabase, quoteId);
    } catch {
      setQuotes(previous);
      window.alert("Could not delete proposal. Please try again.");
    }
  }

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
          <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div>
              <p className="page-kicker text-xs font-semibold uppercase tracking-[0.14em]">Proposals</p>
              <h2 className="page-title mt-2 text-[2rem] font-semibold tracking-tight sm:text-[2.4rem]">
                Proposals
              </h2>
              <p className="page-description mt-3 max-w-3xl text-sm leading-6">
                Review and export client-ready proposals from your pricing results.
              </p>
            </div>

            <Link
              href="/pricing"
              className="rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
            >
              New Pricing
            </Link>
          </header>

          <section className="mt-8 elevated-panel rounded-xl border border-[#d9e2ec] bg-white dark:border-slate-600 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by project, customer, or proposal #"
                  className="w-full rounded-lg border border-[#d9e2ec] py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35]"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | QuoteStatus)}
                className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-3.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35] sm:w-52"
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
                    <div
                      key={quote.id}
                      onClick={() => openQuoteEditor(quote.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openQuoteEditor(quote.id);
                        }
                      }}
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
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatusPill(quote.status)}`}>
                            {quote.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-3 text-sm">
                        <span className="font-semibold">{formatMoney(selected.salePrice)}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-600">{formatMargin(selected.margin)} margin</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">{quote.selectedOption}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Contact: {findQuoteContactName(quote, contacts)} · Project: {findQuoteProjectName(quote, projects)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            printQuote(quote.id);
                          }}
                          className="rounded-md border border-[#d9e2ec] px-3 py-1.5 text-xs font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeQuote(quote.id);
                          }}
                          className="rounded-md border border-[#f0d5d2] px-3 py-1.5 text-xs font-semibold text-[#b42318] transition hover:bg-[#fff5f4]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto elevated-panel rounded-xl border border-[#d9e2ec] bg-white dark:border-slate-600 sm:block">
                <div className="grid min-w-290 grid-cols-[1fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_1.2fr_1fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  <span>Contact</span>
                  <span>Project</span>
                  <span>Status</span>
                  <span>Selected</span>
                  <span>Sale Price</span>
                  <span>Profit</span>
                  <span>Margin</span>
                  <span>Proposal</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="min-w-290 divide-y divide-gray-100">
                  {filteredQuotes.map((quote) => {
                    const selected = getSelectedResult(quote);
                    const expired = isExpired(quote);
                    return (
                      <div
                        key={quote.id}
                        onClick={() => openQuoteEditor(quote.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openQuoteEditor(quote.id);
                          }
                        }}
                        className="grid w-full grid-cols-[1fr_1fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_1.2fr_1fr] items-center gap-4 px-6 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                      >
                        <span className="truncate text-gray-700">{findQuoteContactName(quote, contacts)}</span>
                        <span className="truncate text-gray-700">{findQuoteProjectName(quote, projects)}</span>
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatusPill(quote.status)}`}>
                          {quote.status}
                        </span>
                        <span>{quote.selectedOption}</span>
                        <span className="font-medium">{formatMoney(selected.salePrice)}</span>
                        <span>{formatMoney(selected.profit)}</span>
                        <span>{formatMargin(selected.margin)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-black">
                            {quote.proposalNumber ?? quote.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="mt-1 truncate text-gray-500">
                            {expired && (quote.status === "Draft" || quote.status === "Sent") ? (
                              <span className="font-medium text-red-500">Expired {quote.expiresAt}</span>
                            ) : (
                              <span>expires {quote.expiresAt}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              printQuote(quote.id);
                            }}
                            className="rounded-md border border-[#d9e2ec] px-2.5 py-1 text-[11px] font-medium text-[#213343] transition hover:bg-[#f6f8fb]"
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeQuote(quote.id);
                            }}
                            className="rounded-md border border-[#f0d5d2] px-2.5 py-1 text-[11px] font-medium text-[#b42318] transition hover:bg-[#fff5f4]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <section className="mt-6 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">
                {quotes.length === 0 ? t("emptyQuotes") : "No proposals match filters"}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {quotes.length === 0 ? t("emptyQuotesHint") : "Try another search or status."}
              </p>
              {quotes.length === 0 ? (
                <Link
                  href="/projects"
                  className="mt-4 inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
                >
                  Go to projects
                </Link>
              ) : null}
            </section>
          )}
        </div>
      </main>

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

function findQuoteContactName(quote: Quote, contacts: Contact[]) {
  const match = contacts.find(
    (contact) =>
      contact.id === quote.contactId ||
      contact.name.trim().toLowerCase() === quote.customerName.trim().toLowerCase() ||
      (Boolean(contact.email) &&
        contact.email.trim().toLowerCase() === (quote.customerEmail ?? "").trim().toLowerCase()) ||
      (Boolean(contact.phone) && samePhone(contact.phone, quote.customerPhone ?? ""))
  );
  return match?.name ?? quote.customerName;
}

function findQuoteProjectName(quote: Quote, projects: Project[]) {
  if (!quote.projectId) return quote.projectName;
  const match = projects.find((project) => project.id === quote.projectId);
  return match?.projectName ?? quote.projectName;
}

function isExpired(quote: Quote) {
  if (!quote.expiresAt) return false;
  const expiry = new Date(quote.expiresAt);
  return expiry < new Date();
}

function quoteStatusPill(status: QuoteStatus) {
  if (status === "Accepted") return "bg-green-50 text-green-700";
  if (status === "Sent") return "bg-blue-50 text-blue-700";
  if (status === "Viewed") return "bg-indigo-50 text-indigo-700";
  if (status === "Declined") return "bg-red-50 text-red-700";
  if (status === "Expired") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function samePhone(left: string, right: string) {
  const leftDigits = left.replace(/\D/g, "");
  const rightDigits = right.replace(/\D/g, "");
  return leftDigits.length > 0 && leftDigits === rightDigits;
}
