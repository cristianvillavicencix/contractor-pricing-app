"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getQuote,
  listProposalTemplates,
  loadCompanySettings,
  getProposalTemplateForTrade,
  upsertProposalTemplate,
} from "@/lib/supabase/data";
import {
  defaultSettings,
  mergeAppSettings,
  type AppSettings,
  type Quote,
} from "@/lib/app-data";
import { mergeProposalTemplates, type ProposalTemplate } from "@/lib/proposal-templates";
import {
  applyMergeVariablesToBlocks,
  quoteToProposalBlocks,
  getQuoteBuilderVersion,
  normalizeProposalBlocks,
} from "@/lib/proposal-blocks";
import type { ProposalBlock } from "@/types/proposal-blocks";
import { BlockEditor } from "@/components/block-editor/BlockEditor";
import { V2Shell } from "@/app/v2/_shared/Shell";

// ─────────────────────────────────────────────────────────────
// Inner page (needs Suspense because useSearchParams is used)
// ─────────────────────────────────────────────────────────────

function BuilderInner() {
  const params = useSearchParams();
  const quoteId = params.get("quoteId");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  type LoadState = "loading" | "ready" | "no_quote" | "error";
  const [loadState, setLoadState] = useState<LoadState>(() => quoteId ? "loading" : "no_quote");
  const [errorMsg, setErrorMsg] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [blocks, setBlocks] = useState<ProposalBlock[]>([]);
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);

  useEffect(() => {
    if (!quoteId) return;

    let cancelled = false;

    async function load() {
      try {
        const [q, rawSettings] = await Promise.all([
          getQuote(supabase, quoteId!),
          loadCompanySettings<AppSettings>(supabase),
        ]);

        if (cancelled) return;

        if (!q) {
          setLoadState("no_quote");
          return;
        }

        const merged = mergeAppSettings(rawSettings ?? defaultSettings);
        const trade = q.trade ?? merged.companyProfile.mainTrade ?? "Roofing";

        const rawTemplate = await getProposalTemplateForTrade(supabase, trade).catch(() => null);
        const savedTemplates = await listProposalTemplates(supabase).catch(() => []);
        const mergedTemplates = mergeProposalTemplates(rawTemplate ? [rawTemplate, ...savedTemplates] : savedTemplates);
        const tpl = mergedTemplates.find((t) => t.builderVersion === "blocks" && t.trade === trade)
          ?? mergedTemplates.find((t) => t.trade === trade)
          ?? mergedTemplates[0]
          ?? null;
        setTemplates(mergedTemplates.filter((t) => t.builderVersion === "blocks"));

        // Derive or migrate blocks
        const version = getQuoteBuilderVersion(q);
        const rawBlocks = (q as { proposalBlocks?: unknown[] }).proposalBlocks;
        let resolvedBlocks: ProposalBlock[];

        if (version === "blocks" && Array.isArray(rawBlocks) && rawBlocks.length > 0) {
          resolvedBlocks = normalizeProposalBlocks(rawBlocks as ProposalBlock[]);
        } else if (tpl?.builderVersion === "blocks" && tpl.proposalBlocks?.length) {
          resolvedBlocks = applyMergeVariablesToBlocks(tpl.proposalBlocks, q, merged);
        } else {
          // First time opening in block editor — migrate from tiptap or create defaults
          resolvedBlocks = quoteToProposalBlocks(q, merged);
        }

        setQuote(q);
        setSettings(merged);
        setBlocks(resolvedBlocks);
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : "Unknown error");
          setLoadState("error");
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [quoteId, supabase]);

  // ── Render states ────────────────────────────────────────────

  if (loadState === "no_quote") {
    return (
      <div style={centerBox}>
        <FileText size={40} color="#6b7280" />
        <div style={heading}>No proposal selected</div>
        <p style={sub}>
          {quoteId
            ? `Proposal ${quoteId} was not found or you don't have access.`
            : "Open a proposal from the Proposals list to use the Block Builder."}
        </p>
        <Link href="/v2/proposals" style={linkBtn}>
          Go to Proposals
        </Link>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div style={centerBox}>
        <AlertTriangle size={40} color="#b45309" />
        <div style={heading}>Failed to load</div>
        <p style={sub}>{errorMsg}</p>
        <Link href="/v2/proposals" style={linkBtn}>
          Go to Proposals
        </Link>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div style={centerBox}>
        <Loader2 size={32} color="#6b7280" style={{ animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 14, color: "var(--ink-3)", marginTop: 14 }}>
          Loading proposal…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Fallback safety: if version is tiptap and user explicitly navigated here,
  // show a migration warning but still allow use of block editor.
  const isTiptapMigration =
    quote && getQuoteBuilderVersion(quote) === "tiptap";

  async function saveAsTemplate(currentBlocks: ProposalBlock[]) {
    if (!quote) return;
    const name = window.prompt("Template name", `${quote.trade ?? "Generic"} Template`);
    if (!name?.trim()) return;
    const template: ProposalTemplate = {
      ...(tplFallback(quote.trade ?? "Generic")),
      id: `block-${crypto.randomUUID()}`,
      trade: quote.trade ?? "Generic",
      category: (quote.trade as ProposalTemplate["category"]) ?? "Generic",
      name: name.trim(),
      builderVersion: "blocks",
      proposalBlocks: normalizeProposalBlocks(currentBlocks),
      lastModified: new Date().toISOString().slice(0, 10),
    };
    await upsertProposalTemplate(supabase, template);
    setTemplates((prev) => [template, ...prev]);
  }

  async function duplicateTemplate(currentBlocks: ProposalBlock[]) {
    if (!quote) return;
    const name = window.prompt("Duplicate as template", `${quote.proposalTitle || quote.projectName} Copy`);
    if (!name?.trim()) return;
    const template: ProposalTemplate = {
      ...(tplFallback(quote.trade ?? "Generic")),
      id: `block-${crypto.randomUUID()}`,
      trade: quote.trade ?? "Generic",
      category: (quote.trade as ProposalTemplate["category"]) ?? "Generic",
      name: name.trim(),
      builderVersion: "blocks",
      proposalBlocks: normalizeProposalBlocks(currentBlocks.map((b) => ({ ...b, id: `${b.id}-copy-${Date.now()}` }))),
      lastModified: new Date().toISOString().slice(0, 10),
    };
    await upsertProposalTemplate(supabase, template);
    setTemplates((prev) => [template, ...prev]);
  }

  function loadTemplate(template: ProposalTemplate) {
    if (!quote || !settings || !template.proposalBlocks?.length) return;
    const next = applyMergeVariablesToBlocks(template.proposalBlocks, quote, settings);
    setBlocks(normalizeProposalBlocks(next));
    setLoadTemplateOpen(false);
  }

  return (
    <>
      {isTiptapMigration && (
        <div
          style={{
            background: "var(--amber-bg)",
            borderBottom: "1px solid var(--line)",
            padding: "8px 20px",
            fontSize: 12.5,
            color: "#7a4f00",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            This proposal was created in the legacy Tiptap editor. Content has been converted to blocks.
            Save to switch to block builder permanently, or{" "}
            <Link
              href={`/quotes/editor?quoteId=${quoteId}`}
              style={{ fontWeight: 700, color: "#7a4f00" }}
            >
              return to the original editor
            </Link>
            .
          </span>
        </div>
      )}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <BlockEditor
          key={quote!.id}
          initialBlocks={blocks}
          quote={quote!}
          settings={settings}
          template={null}
          supabase={supabase}
          backHref="/v2/proposals"
          onSaveAsTemplate={saveAsTemplate}
          onLoadTemplate={() => setLoadTemplateOpen(true)}
          onDuplicateTemplate={duplicateTemplate}
        />
      </div>
      {loadTemplateOpen && (
        <TemplatePickerModal
          templates={templates}
          onClose={() => setLoadTemplateOpen(false)}
          onSelect={loadTemplate}
        />
      )}
    </>
  );
}

function tplFallback(trade: string): ProposalTemplate {
  return {
    id: `block-${crypto.randomUUID()}`,
    trade,
    name: `${trade} Template`,
    lastModified: new Date().toISOString().slice(0, 10),
    builderVersion: "blocks",
    category: (trade as ProposalTemplate["category"]) ?? "Generic",
    proposalBlocks: [],
    cover: { enabled: true, tagline: "", showPreparedBy: true, showProposalNumber: true },
    executiveSummary: { enabled: true, problemHeading: "", problemText: "", solutionHeading: "", solutionText: "", valueHeading: "", valueText: "" },
    existingConditions: { enabled: true, introText: "", checklistItems: [] },
    scopeOfWork: { enabled: true, introText: "", items: [] },
    materialsSpecs: { enabled: true, introText: "", items: [] },
    timeline: { enabled: true, estimatedDays: 1, introText: "", phases: [] },
    pricing: { enabled: true, introText: "", showFinancingOption: false, financingText: "", allowancesText: "" },
    warranty: { enabled: true, workmanshipYears: 1, workmanshipText: "", manufacturerText: "" },
    terms: { enabled: true, text: "" },
    acceptance: { enabled: true, paymentScheduleText: "", paymentLinkUrl: "", showFinancingOption: false, contractIntroText: "" },
  };
}

function TemplatePickerModal({
  templates,
  onClose,
  onSelect,
}: {
  templates: ProposalTemplate[];
  onClose: () => void;
  onSelect: (template: ProposalTemplate) => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(17,24,39,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, boxShadow: "0 24px 70px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>Load Template</div>
        <div style={{ padding: 12, maxHeight: 420, overflow: "auto" }}>
          {templates.length === 0 && <div style={{ padding: 24, color: "#6b7280", fontSize: 13 }}>No block templates yet.</div>}
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              style={{ width: "100%", textAlign: "left", padding: 14, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", marginBottom: 8, cursor: "pointer" }}
            >
              <div style={{ fontWeight: 800 }}>{template.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{template.category ?? template.trade}</div>
            </button>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page export (wrapped in V2Shell + Suspense)
// ─────────────────────────────────────────────────────────────

export default function BuilderPage() {
  return (
    <V2Shell fullBleedContent>
      <Suspense fallback={<LoadingFallback />}>
        <BuilderInner />
      </Suspense>
    </V2Shell>
  );
}

function LoadingFallback() {
  return (
    <div style={centerBox}>
      <div style={{ fontSize: 14, color: "var(--ink-3)" }}>Loading…</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared inline styles
// ─────────────────────────────────────────────────────────────

const centerBox: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: 48,
  minHeight: 400,
};

const heading: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ink)",
};

const sub: React.CSSProperties = {
  fontSize: 13.5,
  color: "var(--ink-3)",
  textAlign: "center",
  maxWidth: 360,
  lineHeight: 1.6,
  margin: "0 0 8px",
};

const linkBtn: React.CSSProperties = {
  padding: "9px 22px",
  borderRadius: 9,
  background: "var(--gold-bg)",
  border: "1.5px solid var(--gold)",
  color: "var(--gold-deep)",
  fontWeight: 700,
  fontSize: 13.5,
  textDecoration: "none",
};
