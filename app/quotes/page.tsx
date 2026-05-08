"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  formatMargin,
  formatMoney,
  initialContacts,
  initialProjects,
  quoteStatusOptions,
  storageKeys,
  type Contact,
  type PriceOptionName,
  type Project,
  type Quote,
  type QuoteStatus,
} from "@/lib/app-data";
import { useLocalStorageState } from "@/lib/use-local-storage";

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useLocalStorageState<Quote[]>(storageKeys.quotes, []);
  const [projects] = useLocalStorageState<Project[]>(
    storageKeys.projects,
    initialProjects
  );
  const [contacts] = useLocalStorageState<Contact[]>(
    storageKeys.contacts,
    initialContacts
  );
  const [statusFilter, setStatusFilter] = useState<"All" | QuoteStatus>("All");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("quoteId")
  );

  const filteredQuotes = useMemo(
    () =>
      quotes.filter(
        (quote) => statusFilter === "All" || quote.status === statusFilter
      ),
    [quotes, statusFilter]
  );

  function updateQuoteStatus(id: string, status: QuoteStatus) {
    setQuotes((current) =>
      current.map((quote) => (quote.id === id ? { ...quote, status } : quote))
    );
  }

  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  const selectedProject = selectedQuote?.projectId
    ? projects.find((project) => project.id === selectedQuote.projectId)
    : undefined;
  const selectedContact = selectedQuote
    ? findQuoteContact(selectedQuote, contacts)
    : undefined;

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Quotes</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Quotes
              </h2>
              <p className="mt-3 max-w-2xl text-gray-500">
                Review and export client-ready proposals from your pricing results.
              </p>
            </div>

            <Link
              href="/pricing"
              className="rounded-md bg-[#ff5c35] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#e94820]"
            >
              New Pricing
            </Link>
          </header>

          <section className="mt-8 rounded-lg border border-[#d9e2ec] bg-white p-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "All" | QuoteStatus)}
              className="w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35] sm:w-56"
            >
              <option value="All">All statuses</option>
              {quoteStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </section>

          {filteredQuotes.length > 0 ? (
            <section className="mt-6">
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {filteredQuotes.map((quote) => {
                  const selected = getSelectedResult(quote);
                  return (
                    <button
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className="w-full rounded-lg border border-[#d9e2ec] bg-white p-4 text-left transition hover:bg-[#f6f8fb]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-black">{quote.projectName}</p>
                          <p className="mt-0.5 truncate text-xs text-gray-500">{quote.customerName}</p>
                        </div>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                          quote.status === "Accepted" ? "bg-green-50 text-green-700" :
                          quote.status === "Sent" ? "bg-blue-50 text-blue-700" :
                          quote.status === "Declined" ? "bg-red-50 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{quote.status}</span>
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
              <div className="hidden overflow-x-auto rounded-lg border border-[#d9e2ec] bg-white sm:block">
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
                    return (
                      <button
                        key={quote.id}
                        onClick={() => setSelectedQuoteId(quote.id)}
                        className="grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-5 py-4 text-left text-sm transition hover:bg-[#f6f8fb]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-black">{quote.projectName}</p>
                          <p className="mt-1 truncate text-gray-500">{quote.customerName} · expires {quote.expiresAt}</p>
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
            <section className="mt-6 rounded-lg border border-[#d9e2ec] bg-white p-10 text-center">
              <p className="text-lg font-semibold tracking-tight">No quotes yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Open a project, enter costs, and create a quote from the Costs &amp;
                Pricing tab.
              </p>
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
          onPreview={() => {
            router.push(`/quotes/preview?id=${selectedQuote.id}`);
          }}
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
}: {
  quote: Quote;
  project?: Project;
  contact?: Contact;
  onClose: () => void;
  onStatusChange: (status: QuoteStatus) => void;
  onOpenProject: (projectId: string) => void;
  onOpenContact: (contactId: string) => void;
  onPreview: () => void;
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
        <button
          onClick={onPreview}
          className="mt-5 flex w-full items-center justify-between gap-3 rounded-md border border-[#111111] bg-[#111111] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#333333]"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4" />
            Preview &amp; Download PDF
          </div>
          <span className="text-xs text-white/60">Opens proposal editor →</span>
        </button>

        {/* Status */}
        <div className="mt-6">
          <label className="block text-sm font-medium">
            Status
            <select
              value={quote.status}
              onChange={(e) => onStatusChange(e.target.value as QuoteStatus)}
              className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#ff5c35]"
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
          <Metric label="Expires" value={quote.expiresAt} />
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
        contact.phone.trim().toLowerCase() ===
          (quote.customerPhone ?? "").trim().toLowerCase())
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-black">{value}</p>
    </div>
  );
}
