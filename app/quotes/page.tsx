"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Columns3, List, Pencil, Printer, Search, Trash2, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  type Contact,
  formatMargin,
  formatMoney,
  type Project,
  type ProjectState,
  quoteStatusOptions,
  type PriceOptionName,
  type Quote,
  type QuoteStatus,
  stateOptions,
  type TierProduct,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteQuote,
  listContacts,
  listProjects,
  listQuotes,
  listTierProducts,
  upsertQuote,
} from "@/lib/supabase/data";

type ProposalsPageCache = {
  quotes: Quote[];
  projects: Project[];
  contacts: Contact[];
  tierProducts: TierProduct[];
};

let proposalsPageCache: ProposalsPageCache | null = null;

export default function QuotesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [quotes, setQuotes] = useState<Quote[]>(() => proposalsPageCache?.quotes ?? []);
  const [projects, setProjects] = useState<Project[]>(() => proposalsPageCache?.projects ?? []);
  const [contacts, setContacts] = useState<Contact[]>(() => proposalsPageCache?.contacts ?? []);
  const [tierProducts, setTierProducts] = useState<TierProduct[]>(() => proposalsPageCache?.tierProducts ?? []);
  const [isLoading, setIsLoading] = useState(() => !proposalsPageCache);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | QuoteStatus>("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "stages">("list");
  const [draggingQuoteId, setDraggingQuoteId] = useState<string | null>(null);
  const [summaryQuoteId, setSummaryQuoteId] = useState<string | null>(null);
  const moduleCopy = {
    searchPlaceholder: "Search by customer, job, or proposal #",
    emptyTitle: "No proposals yet",
    emptyHint: "Start pricing to create a proposal draft.",
    ctaLabel: "New Proposal",
    idColumn: "Proposal",
  };
  const statusOptions = quoteStatusOptions;

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const shouldBlock = !silent && !proposalsPageCache;
    if (!silent) {
      if (shouldBlock) setIsLoading(true);
      setLoadError(null);
    }
    try {
      const [dbQuotes, dbProjects, dbContacts, dbTierProducts] = await Promise.all([
        listQuotes(supabase),
        listProjects(supabase),
        listContacts(supabase),
        listTierProducts(supabase),
      ]);
      setQuotes(dbQuotes);
      setProjects(dbProjects);
      setContacts(dbContacts);
      setTierProducts(dbTierProducts);
      proposalsPageCache = {
        quotes: dbQuotes,
        projects: dbProjects,
        contacts: dbContacts,
        tierProducts: dbTierProducts,
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
    const moduleRows = quotes;
    return moduleRows.filter((quote) => {
      const matchesStatus = statusFilter === "All" || quote.status === statusFilter;
      const matchesSearch =
        !query ||
        quote.projectName.toLowerCase().includes(query) ||
        quote.customerName.toLowerCase().includes(query) ||
        (quote.proposalNumber ?? "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [quotes, statusFilter, search]);
  const stageStatuses = useMemo(
    () => (statusFilter === "All" ? statusOptions : [statusFilter]),
    [statusFilter, statusOptions]
  );
  const summaryQuote = summaryQuoteId
    ? quotes.find((quote) => quote.id === summaryQuoteId) ?? null
    : null;
  const proposalTradeOptions = useMemo(
    () => uniqueStrings([...tierProducts.map((product) => product.trade), ...quotes.map((quote) => quote.trade ?? "")]),
    [quotes, tierProducts]
  );

  function openQuoteEditor(quoteId: string) {
    router.push(`/quotes/editor?id=${quoteId}`);
  }

  function openProposalSummary(quoteId: string) {
    setSummaryQuoteId(quoteId);
  }

  function printQuote(quoteId: string) {
    window.open(`/proposal/${quoteId}/print`, "_blank", "noopener,noreferrer");
  }

  async function removeQuote(quoteId: string) {
    const ok = window.confirm(
      "Delete this proposal? This cannot be undone."
    );
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

  async function moveQuoteToStatus(quoteId: string, status: QuoteStatus) {
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote || quote.status === status) return;

    const previous = quotes;
    const nextQuote = { ...quote, status };
    setQuotes((current) => current.map((item) => (item.id === quoteId ? nextQuote : item)));
    proposalsPageCache = proposalsPageCache
      ? {
          ...proposalsPageCache,
          quotes: proposalsPageCache.quotes.map((item) => (item.id === quoteId ? nextQuote : item)),
        }
      : null;

    try {
      await upsertQuote(supabase, nextQuote);
    } catch {
      setQuotes(previous);
      proposalsPageCache = proposalsPageCache ? { ...proposalsPageCache, quotes: previous } : null;
      window.alert("Could not update proposal status. Please try again.");
    }
  }

  async function saveProposalBasics(nextQuote: Quote) {
    const previous = quotes;
    setQuotes((current) => current.map((quote) => (quote.id === nextQuote.id ? nextQuote : quote)));
    proposalsPageCache = proposalsPageCache
      ? {
          ...proposalsPageCache,
          quotes: proposalsPageCache.quotes.map((quote) => (quote.id === nextQuote.id ? nextQuote : quote)),
        }
      : null;

    try {
      await upsertQuote(supabase, nextQuote);
    } catch (error) {
      setQuotes(previous);
      proposalsPageCache = proposalsPageCache ? { ...proposalsPageCache, quotes: previous } : null;
      window.alert("Could not save proposal details. Please try again.");
      throw error;
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
          <section className="elevated-panel rounded-xl border border-[#d9e2ec] bg-white dark:border-slate-600 p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(20rem,1fr)_minmax(11rem,14rem)_auto_auto] lg:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={moduleCopy.searchPlaceholder}
                  className="w-full rounded-lg border border-[#d9e2ec] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35]"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | QuoteStatus)}
                className="rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
              >
                <option value="All">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <div className="inline-flex w-full rounded-lg border border-[#d9e2ec] bg-[#f6f8fb] p-1 shadow-sm sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition sm:min-w-24 sm:flex-none ${
                    viewMode === "list" ? "bg-[#213343] text-white" : "text-gray-500 hover:bg-[#f6f8fb] hover:text-[#213343]"
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("stages")}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition sm:min-w-24 sm:flex-none ${
                    viewMode === "stages" ? "bg-[#213343] text-white" : "text-gray-500 hover:bg-[#f6f8fb] hover:text-[#213343]"
                  }`}
                >
                  <Columns3 className="h-4 w-4" />
                  Stages
                </button>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
              >
                {moduleCopy.ctaLabel}
              </Link>
            </div>
          </section>

          {filteredQuotes.length > 0 ? (
            <section className="mt-6">
              {viewMode === "stages" ? (
                <ProposalStagesBoard
                  quotes={filteredQuotes}
                  statuses={stageStatuses}
                  contacts={contacts}
                  projects={projects}
                  draggingQuoteId={draggingQuoteId}
                  onDragStart={setDraggingQuoteId}
                  onDragEnd={() => setDraggingQuoteId(null)}
                  onDropStatus={(quoteId, status) => void moveQuoteToStatus(quoteId, status)}
                  onOpen={openProposalSummary}
                  onEdit={openQuoteEditor}
                />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="space-y-2 md:hidden">
                {filteredQuotes.map((quote) => {
                  const selected = getSelectedResult(quote);
                  const expired = isExpired(quote);
                  return (
                    <div
                      key={quote.id}
                      onClick={() => openProposalSummary(quote.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openProposalSummary(quote.id);
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
                        Contact: {findQuoteContactName(quote, contacts)} · Job: {findQuoteProjectName(quote, projects)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openQuoteEditor(quote.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d9e2ec] text-[#213343] transition hover:bg-[#f6f8fb]"
                          aria-label="Edit proposal"
                          title="Edit proposal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            printQuote(quote.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d9e2ec] text-[#213343] transition hover:bg-[#f6f8fb]"
                          aria-label="Print proposal"
                          title="Print proposal"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void removeQuote(quote.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#f0d5d2] text-[#b42318] transition hover:bg-[#fff5f4]"
                          aria-label="Delete proposal"
                          title="Delete proposal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto elevated-panel rounded-xl border border-[#d9e2ec] bg-white dark:border-slate-600 md:block">
                <div className="grid min-w-270 grid-cols-[1fr_1fr_0.75fr_0.75fr_0.85fr_0.85fr_0.75fr_0.9fr_1.25fr] gap-4 border-b border-[#d9e2ec] bg-[#f6f8fb] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                  <span>Contact</span>
                  <span>Job</span>
                  <span>Status</span>
                  <span>Selected</span>
                  <span>Sale Price</span>
                  <span>Profit</span>
                  <span>Margin</span>
                  <span>Expire Date</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="min-w-270 divide-y divide-gray-100">
                  {filteredQuotes.map((quote) => {
                    const selected = getSelectedResult(quote);
                    const expired = isExpired(quote);
                    return (
                      <div
                        key={quote.id}
                        onClick={() => openProposalSummary(quote.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openProposalSummary(quote.id);
                          }
                        }}
                        className="grid w-full grid-cols-[1fr_1fr_0.75fr_0.75fr_0.85fr_0.85fr_0.75fr_0.9fr_1.25fr] items-center gap-4 px-5 py-2 text-left text-[13px] transition hover:bg-[#f6f8fb]"
                      >
                        <span className="truncate text-gray-700">{findQuoteContactName(quote, contacts)}</span>
                        <span className="truncate text-gray-700">{findQuoteProjectName(quote, projects)}</span>
                        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold ${quoteStatusPill(quote.status)}`}>
                          {quote.status}
                        </span>
                        <span>{quote.selectedOption}</span>
                        <span className="font-medium">{formatMoney(selected.salePrice)}</span>
                        <span>{formatMoney(selected.profit)}</span>
                        <span>{formatMargin(selected.margin)}</span>
                        <span className={`truncate ${expired && (quote.status === "Draft" || quote.status === "Sent") ? "font-medium text-red-500" : "text-gray-600"}`}>
                          {quote.expiresAt || "-"}
                        </span>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openQuoteEditor(quote.id);
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d9e2ec] px-2.5 text-xs font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
                            aria-label="Edit proposal"
                            title="Edit proposal"
                          >
                            Edit Proposal
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeQuote(quote.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#f0d5d2] text-[#b42318] transition hover:bg-[#fff5f4]"
                            aria-label="Delete proposal"
                            title="Delete proposal"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="mt-6 elevated-panel rounded-lg border border-[#d9e2ec] bg-white dark:border-slate-600 p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">
                {filteredQuotes.length === 0 && quotes.length > 0
                  ? "No proposals match filters"
                  : moduleCopy.emptyTitle}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {quotes.length === 0 ? moduleCopy.emptyHint : "Try another search or status."}
              </p>
              {quotes.length === 0 ? (
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center rounded-lg bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:bg-[var(--brand-accent-hover)]"
                >
                  New Proposal
                </Link>
              ) : null}
            </section>
          )}
          {summaryQuote ? (
            <ProposalSummaryDrawer
              quote={summaryQuote}
              contact={findQuoteContact(summaryQuote, contacts)}
              tradeOptions={proposalTradeOptions}
              onClose={() => setSummaryQuoteId(null)}
              onSave={(nextQuote) => saveProposalBasics(nextQuote)}
              onPrint={() => printQuote(summaryQuote.id)}
              onDelete={() => {
                setSummaryQuoteId(null);
                void removeQuote(summaryQuote.id);
              }}
            />
          ) : null}
        </div>
      </main>

    </div>
  );
}

function getSelectedResult(quote: Quote) {
  return getQuoteResult(quote, quote.selectedOption);
}

function ProposalStagesBoard({
  quotes,
  statuses,
  contacts,
  projects,
  draggingQuoteId,
  onDragStart,
  onDragEnd,
  onDropStatus,
  onOpen,
  onEdit,
}: {
  quotes: Quote[];
  statuses: QuoteStatus[];
  contacts: Contact[];
  projects: Project[];
  draggingQuoteId: string | null;
  onDragStart: (quoteId: string) => void;
  onDragEnd: () => void;
  onDropStatus: (quoteId: string, status: QuoteStatus) => void;
  onOpen: (quoteId: string) => void;
  onEdit: (quoteId: string) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
      <div className="grid auto-cols-[minmax(17rem,82vw)] grid-flow-col gap-4 sm:auto-cols-[19rem] xl:auto-cols-[20rem]">
        {statuses.map((status) => {
          const stageQuotes = quotes.filter((quote) => quote.status === status);
          const stageTotal = stageQuotes.reduce((sum, quote) => sum + getSelectedResult(quote).salePrice, 0);

          return (
            <section
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const quoteId = event.dataTransfer.getData("text/plain") || draggingQuoteId;
                onDragEnd();
                if (quoteId) {
                  window.setTimeout(() => onDropStatus(quoteId, status), 0);
                }
              }}
              className="min-h-[calc(100vh-17rem)] rounded-xl border border-[#d9e2ec] bg-[#f6f8fb] p-3"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-[#213343]">
                  {formatStatusLabel(status)}
                  <span className="mx-1.5 text-gray-300">|</span>
                  <span className="font-semibold text-gray-500">{formatMoney(stageTotal)}</span>
                </h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${quoteStatusPill(status)}`}>
                  {stageQuotes.length}
                </span>
              </div>

              <div className="space-y-3">
                {stageQuotes.map((quote) => {
                  const selected = getSelectedResult(quote);
                  const expired = isExpired(quote);
                  return (
                    <article
                      key={quote.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", quote.id);
                        onDragStart(quote.id);
                      }}
                      onDragEnd={onDragEnd}
                      onClick={() => {
                        if (draggingQuoteId === quote.id) return;
                        onOpen(quote.id);
                      }}
                      className={`group touch-pan-x select-none cursor-grab rounded-lg border border-[#e1e8ef] bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8c7d6] hover:shadow-md active:cursor-grabbing ${
                        draggingQuoteId === quote.id ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#18394a]">{quote.projectName}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{findQuoteContactName(quote, contacts)}</p>
                        </div>
                        {expired && (quote.status === "Draft" || quote.status === "Sent") ? (
                          <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                            Expired
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">{quote.selectedOption}</p>
                          <p className="mt-0.5 text-lg font-bold text-black">{formatMoney(selected.salePrice)}</p>
                        </div>
                        <div className="min-w-0 text-right text-xs text-gray-500">
                          <p>{formatMargin(selected.margin)} margin</p>
                          <p className="mt-0.5 truncate">{findQuoteProjectName(quote, projects)}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                          {quote.proposalNumber ?? quote.id.slice(-6).toUpperCase()}
                        </p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(quote.id);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#d9e2ec] text-[#213343] opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-[#f6f8fb]"
                          aria-label="Edit proposal"
                          title="Edit proposal"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}

                {stageQuotes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#d9e2ec] bg-white/70 px-4 py-8 text-center text-xs font-medium text-gray-400">
                    Drop proposals here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProposalSummaryDrawer({
  quote,
  contact,
  tradeOptions,
  onClose,
  onSave,
  onPrint,
  onDelete,
}: {
  quote: Quote;
  contact?: Contact;
  tradeOptions: string[];
  onClose: () => void;
  onSave: (quote: Quote) => Promise<void>;
  onPrint: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<Quote>(quote);
  const [isSaving, setIsSaving] = useState(false);
  const expired = isExpired(draft);
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(quote), [draft, quote]);

  useEffect(() => {
    setDraft(quote);
  }, [quote]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function confirmDiscardChanges() {
    return !isDirty || window.confirm("You have unsaved changes. Close without saving?");
  }

  function requestClose() {
    if (!confirmDiscardChanges()) return;
    onClose();
  }

  function patch(patchValue: Partial<Quote>) {
    setDraft((current) => ({ ...current, ...patchValue }));
  }

  async function save() {
    setIsSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <aside
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:w-[min(42rem,92vw)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d9e2ec] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-[#213343]">
                {draft.projectName || "Proposal"}
              </h3>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatusPill(draft.status)}`}>
                {formatStatusLabel(draft.status)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span className="font-medium text-[#213343]">{(contact?.name ?? draft.customerName) || "No customer"}</span>
              {contact ? (
                <Link
                  href={`/contacts?contactId=${encodeURIComponent(contact.id)}`}
                  className="text-xs font-semibold text-[#ff5c35] underline-offset-4 hover:underline"
                >
                  Go to customer
                </Link>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Proposal # {draft.proposalNumber ?? draft.id.slice(-6).toUpperCase()}</span>
              {expired && (draft.status === "Draft" || draft.status === "Sent") ? (
                <span className="rounded bg-red-50 px-2 py-0.5 font-semibold text-red-600">Expired</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d9e2ec] text-gray-500 transition hover:bg-[#f6f8fb]"
            aria-label="Close summary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-5">
          <div className="rounded-lg border border-[#d9e2ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Proposal basics</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DrawerField
                label="Proposal Title"
                value={draft.proposalTitle ?? ""}
                onChange={(value) => patch({ proposalTitle: value })}
              />
              <DrawerSelect
                label="Status"
                value={draft.status}
                options={quoteStatusOptions}
                onChange={(value) => patch({ status: value as QuoteStatus })}
              />
              <DrawerField
                label="Expires"
                value={draft.expiresAt ?? ""}
                onChange={(value) => patch({ expiresAt: value })}
              />
              <DrawerSelect
                label="Selected Option"
                value={draft.selectedOption}
                options={["Good", "Better", "Best"]}
                onChange={(value) => patch({ selectedOption: value as PriceOptionName })}
              />
              <DrawerSelect
                label="Trade"
                value={draft.trade ?? ""}
                options={tradeOptions}
                onChange={(value) => patch({ trade: value })}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#d9e2ec] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">Job</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DrawerField
                label="Job Name"
                value={draft.projectName}
                onChange={(value) => patch({ projectName: value })}
              />
              <DrawerField
                label="Job Address"
                value={draft.jobAddress ?? draft.customerAddress ?? ""}
                onChange={(value) => patch({ jobAddress: value })}
              />
              <DrawerField
                label="City"
                value={draft.jobCity ?? ""}
                onChange={(value) => patch({ jobCity: value })}
              />
              <DrawerSelect
                label="State"
                value={draft.jobState ?? ""}
                options={stateOptions}
                onChange={(value) => patch({ jobState: value as ProjectState })}
              />
              <DrawerField
                label="ZIP Code"
                value={draft.jobZipCode ?? ""}
                onChange={(value) => patch({ jobZipCode: value })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#d9e2ec] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#f0d5d2] px-4 py-2.5 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f4]"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-semibold text-[#213343] transition hover:bg-[#f6f8fb] sm:flex-none"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void save()}
              className="inline-flex flex-1 items-center justify-center rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-semibold text-[#213343] transition hover:bg-[#f6f8fb] disabled:opacity-60 sm:flex-none"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DrawerField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function DrawerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const normalizedOptions = options.includes(value) || !value ? options : [value, ...options];

  return (
    <label className="block text-xs font-medium text-gray-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
      >
        {!value ? <option value="">Select...</option> : null}
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function getQuoteResult(quote: Quote, option: PriceOptionName) {
  if (option === "Good") return quote.good;
  if (option === "Better") return quote.better;
  return quote.best;
}

function findQuoteContactName(quote: Quote, contacts: Contact[]) {
  const match = findQuoteContact(quote, contacts);
  return match?.name ?? quote.customerName;
}

function findQuoteContact(quote: Quote, contacts: Contact[]) {
  return contacts.find(
    (contact) =>
      contact.id === quote.contactId ||
      contact.name.trim().toLowerCase() === quote.customerName.trim().toLowerCase() ||
      (Boolean(contact.email) &&
        contact.email.trim().toLowerCase() === (quote.customerEmail ?? "").trim().toLowerCase()) ||
      (Boolean(contact.phone) && samePhone(contact.phone, quote.customerPhone ?? ""))
  );
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
  if (status === "converted_to_project") return "bg-emerald-50 text-emerald-700";
  if (status === "Accepted") return "bg-green-50 text-green-700";
  if (status === "Sent") return "bg-blue-50 text-blue-700";
  if (status === "Viewed") return "bg-indigo-50 text-indigo-700";
  if (status === "Declined") return "bg-red-50 text-red-700";
  if (status === "Expired") return "bg-amber-50 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

function formatStatusLabel(status: QuoteStatus) {
  return status === "converted_to_project" ? "Converted" : status;
}

function samePhone(left: string, right: string) {
  const leftDigits = left.replace(/\D/g, "");
  const rightDigits = right.replace(/\D/g, "");
  return leftDigits.length > 0 && leftDigits === rightDigits;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}
