"use client";

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Printer,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { QuotePreview } from "@/components/quotes/quote-preview";
import {
  buildQuoteDocument,
  defaultCertifications,
  defaultIncludedServices,
  TRADE_SERVICES,
  type CoverLayout,
  type QuoteDocument,
} from "@/lib/pdf-generator";
import { ScopeWizard } from "@/components/quotes/scope-wizard";
import {
  defaultSettings,
  storageKeys,
  type AppSettings,
  type Project,
  type Quote,
} from "@/lib/app-data";
import { readLocalStorage, writeLocalStorage } from "@/lib/use-local-storage";

type ServiceItem = { name: string; visible: boolean };

const SERVICES_COLLAPSE_AT = 6;

const COVER_LAYOUTS: { id: CoverLayout; label: string }[] = [
  { id: "full", label: "Full" },
  { id: "half", label: "Half" },
  { id: "square", label: "Square" },
];

function QuotePreviewContent() {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("id");

  const quotes = readLocalStorage<Quote[]>(storageKeys.quotes, []);
  const projects = readLocalStorage<Project[]>(storageKeys.projects, []);
  const settings = readLocalStorage<AppSettings>(storageKeys.settings, defaultSettings);

  const quote = quotes.find((q) => q.id === quoteId);
  const project = projects.find((p) => p.id === quote?.projectId);

  const [scope, setScope] = useState(quote?.scopeSummary ?? "");
  const [warranty, setWarranty] = useState(
    quote?.warrantyText ?? settings.proposalSettings.defaultWarrantyText
  );
  const [terms, setTerms] = useState(
    quote?.termsText ?? settings.proposalSettings.defaultTerms
  );
  const [services, setServices] = useState<ServiceItem[]>(() =>
    (quote?.includedServices ?? defaultIncludedServices).map((name) => ({
      name,
      visible: true,
    }))
  );
  const [certs, setCerts] = useState<ServiceItem[]>(() =>
    (quote?.certifications ?? defaultCertifications).map((name) => ({
      name,
      visible: true,
    }))
  );

  const [showAllServices, setShowAllServices] = useState(false);
  const [newService, setNewService] = useState("");
  const [newCert, setNewCert] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverLayout, setCoverLayout] = useState<CoverLayout>("full");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Collapsible panel state
  const [showScope, setShowScope] = useState(false);
  const [showServices, setShowServices] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCerts, setShowCerts] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
        <div className="text-center">
          <p className="text-lg font-semibold">Quote not found</p>
          <Link href="/quotes" className="mt-3 block text-sm text-[#ff5c35] underline">
            Back to Quotes
          </Link>
        </div>
      </div>
    );
  }

  const doc: QuoteDocument = {
    ...buildQuoteDocument(quote, project, settings),
    scopeSummary: scope,
    warrantyText: warranty,
    termsText: terms,
    includedServices: services.filter((s) => s.visible).map((s) => s.name),
    certifications: certs.filter((c) => c.visible).map((c) => c.name),
  };

  const tradeSuggestions = (TRADE_SERVICES[doc.trade] ?? []).filter(
    (s) => !services.some((item) => item.name === s)
  );

  function handleSave() {
    if (!quote) return;
    const all = readLocalStorage<Quote[]>(storageKeys.quotes, []);
    const updated = all.map((q) =>
      q.id === quote.id
        ? {
            ...q,
            scopeSummary: scope,
            warrantyText: warranty,
            termsText: terms,
            includedServices: services.filter((s) => s.visible).map((s) => s.name),
            certifications: certs.filter((c) => c.visible).map((c) => c.name),
          }
        : q
    );
    writeLocalStorage(storageKeys.quotes, updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const { downloadQuotePDF } = await import("@/components/quotes/quote-pdf");
      await downloadQuotePDF(doc, coverImageUrl ?? undefined, coverLayout);
    } finally {
      setIsDownloading(false);
    }
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setCoverImageUrl(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function toggleService(name: string) {
    setServices((prev) =>
      prev.map((s) => (s.name === name ? { ...s, visible: !s.visible } : s))
    );
  }

  function toggleCert(name: string) {
    setCerts((prev) =>
      prev.map((c) => (c.name === name ? { ...c, visible: !c.visible } : c))
    );
  }

  function addService() {
    const trimmed = newService.trim();
    if (!trimmed || services.some((s) => s.name === trimmed)) return;
    setServices((prev) => [...prev, { name: trimmed, visible: true }]);
    setNewService("");
  }

  function addCert() {
    const trimmed = newCert.trim();
    if (!trimmed || certs.some((c) => c.name === trimmed)) return;
    setCerts((prev) => [...prev, { name: trimmed, visible: true }]);
    setNewCert("");
  }

  function addSuggestion(name: string) {
    setServices((prev) => [...prev, { name, visible: true }]);
  }

  const displayedServices = showAllServices
    ? services
    : services.slice(0, SERVICES_COLLAPSE_AT);
  const hiddenCount = services.length - SERVICES_COLLAPSE_AT;

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343]">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-10 border-b border-[#d9e2ec] bg-white">
        <div className="mx-auto flex max-w-285 items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link
            href="/quotes"
            className="flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Quotes
          </Link>
          <p className="hidden text-sm text-gray-500 sm:block">
            {doc.proposalNumber} · {quote.customerName}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
            >
              {isSaved ? <Check className="h-4 w-4 text-green-600" /> : null}
              <span className="hidden sm:inline">{isSaved ? "Saved!" : "Save"}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#333333] disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isDownloading ? "Generating…" : "Download PDF"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto max-w-285 gap-8 px-5 py-8 sm:px-8 lg:flex lg:items-start">
        {/* ── Editor sidebar ── */}
        <aside className="print:hidden mb-8 w-full shrink-0 space-y-5 lg:mb-0 lg:w-72">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Edit Proposal
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Updates apply to the preview and PDF.
            </p>
          </div>

          {/* Cover Photo */}
          <div>
            <p className="mb-2 text-sm font-medium">Cover Photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
            {coverImageUrl ? (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded border border-[#d9e2ec]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Cover" className="h-36 w-full object-cover" />
                  <button
                    onClick={() => setCoverImageUrl(null)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex gap-1">
                  {COVER_LAYOUTS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setCoverLayout(id)}
                      className={`flex-1 rounded border py-1.5 text-xs font-medium transition ${
                        coverLayout === id
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-[#d9e2ec] hover:bg-[#f6f8fb]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded border border-[#d9e2ec] py-1.5 text-xs font-medium text-gray-500 transition hover:bg-[#f6f8fb]"
                >
                  Replace Photo
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[#d9e2ec] py-5 text-sm text-gray-400 transition hover:border-[#111111] hover:text-[#111111]"
              >
                <ImagePlus className="h-4 w-4" />
                Upload cover photo
              </button>
            )}
          </div>

          {/* Scope of Work */}
          <div>
            <p className="mb-2 text-sm font-medium">Scope of Work</p>
            <ScopeWizard
              trade={doc.trade || "Roofing"}
              onGenerate={(text) => {
                setScope(text);
                setShowScope(true);
              }}
            />
            <button
              onClick={() => setShowScope((v) => !v)}
              className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-[#213343]"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showScope ? "" : "-rotate-90"}`}
              />
              Edit text manually
            </button>
            {showScope && (
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={5}
                placeholder="Describe the scope of this project…"
                className="mt-1.5 w-full resize-none rounded border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
              />
            )}
          </div>

          {/* Included Services */}
          <div className="space-y-1.5">
            <CollapseHeader
              label="Included Services"
              open={showServices}
              onToggle={() => setShowServices((v) => !v)}
            />
            {showServices && (
              <div className="space-y-1">
                {displayedServices.map((item) => (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-sm transition ${
                      item.visible
                        ? "border-[#d9e2ec]"
                        : "border-[#e9ecef] bg-[#f6f8fb]"
                    }`}
                  >
                    <span className={item.visible ? "text-[#213343]" : "text-gray-400"}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => toggleService(item.name)}
                      title={item.visible ? "Hide" : "Show"}
                      className="shrink-0 text-gray-400 transition hover:text-[#213343]"
                    >
                      {item.visible ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  </div>
                ))}

                {services.length > SERVICES_COLLAPSE_AT && (
                  <button
                    onClick={() => setShowAllServices((v) => !v)}
                    className="w-full pt-0.5 text-left text-xs text-gray-400 transition hover:text-[#213343]"
                  >
                    {showAllServices ? "Show less ↑" : `Show ${hiddenCount} more ↓`}
                  </button>
                )}

                <div className="flex gap-1.5 pt-0.5">
                  <input
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addService()}
                    placeholder="Add service…"
                    className="min-w-0 flex-1 rounded border border-[#d9e2ec] px-3 py-1.5 text-sm outline-none focus:border-[#111111]"
                  />
                  <button
                    onClick={addService}
                    className="rounded border border-[#d9e2ec] px-3 py-1.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Trade suggestions — nested collapsible */}
            {tradeSuggestions.length > 0 && (
              <div className="pt-1">
                <button
                  onClick={() => setShowSuggestions((v) => !v)}
                  className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 transition hover:text-[#213343]"
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${showSuggestions ? "" : "-rotate-90"}`}
                  />
                  Suggestions · {doc.trade}
                </button>
                {showSuggestions && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tradeSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => addSuggestion(s)}
                        className="rounded border border-[#d9e2ec] px-2 py-1 text-[11px] text-gray-500 transition hover:border-[#111111] hover:text-[#111111]"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="space-y-1.5">
            <CollapseHeader
              label="Certifications"
              open={showCerts}
              onToggle={() => setShowCerts((v) => !v)}
            />
            {showCerts && (
              <div className="space-y-1">
                {certs.map((cert) => (
                  <label
                    key={cert.name}
                    className="flex cursor-pointer items-center justify-between rounded border border-[#d9e2ec] px-3 py-1.5 text-sm transition hover:bg-[#f6f8fb]"
                  >
                    <span className={cert.visible ? "text-[#213343]" : "text-gray-400"}>
                      {cert.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={cert.visible}
                      onChange={() => toggleCert(cert.name)}
                      className="h-3.5 w-3.5 accent-[#111111]"
                    />
                  </label>
                ))}
                <div className="flex gap-1.5 pt-0.5">
                  <input
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCert()}
                    placeholder="Add certification…"
                    className="min-w-0 flex-1 rounded border border-[#d9e2ec] px-3 py-1.5 text-sm outline-none focus:border-[#111111]"
                  />
                  <button
                    onClick={addCert}
                    className="rounded border border-[#d9e2ec] px-3 py-1.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>

          <EditTextarea label="Warranty" value={warranty} onChange={setWarranty} />

          <EditTextarea
            label="Terms & Conditions"
            value={terms}
            onChange={setTerms}
            rows={5}
          />
        </aside>

        {/* ── Document preview ── */}
        <div className="min-w-0 flex-1">
          <QuotePreview
            doc={doc}
            coverImageUrl={coverImageUrl}
            coverLayout={coverLayout}
          />
        </div>
      </div>
    </div>
  );
}

function CollapseHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between">
      <p className="text-sm font-medium">{label}</p>
      <ChevronDown
        className={`h-4 w-4 text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`}
      />
    </button>
  );
}

function EditTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

export default function QuotePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa]">
          <p className="text-sm text-gray-400">Loading preview…</p>
        </div>
      }
    >
      <QuotePreviewContent />
    </Suspense>
  );
}
