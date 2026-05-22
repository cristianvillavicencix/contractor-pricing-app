"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import {
  PROPOSAL_STATUS,
  colorForId,
  fmt$,
  initials,
  type Contact,
  type Proposal,
  type ProposalStatus,
} from "../_shared/data";
import { useV2LiveData } from "../_shared/live-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getQuote, listProposalTemplates, loadCompanySettings, upsertQuote } from "@/lib/supabase/data";
import { computeNextProposalNumber, defaultSettings, mergeAppSettings, type AppSettings, type Quote } from "@/lib/app-data";
import { applyMergeVariablesToBlocks, quoteToProposalBlocks } from "@/lib/proposal-blocks";
import {
  defaultBlockProposalTemplates,
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import type { ProposalBlock } from "@/types/proposal-blocks";

const STATUS_CHIPS: { k: ProposalStatus | "all"; l: string }[] = [
  { k: "all", l: "All" },
  { k: "draft", l: "Draft" },
  { k: "sent", l: "Sent" },
  { k: "viewed", l: "Viewed" },
  { k: "followup", l: "Follow-up" },
  { k: "accepted", l: "Accepted" },
  { k: "declined", l: "Declined" },
];

const STAGES: { k: ProposalStatus; l: string }[] = [
  { k: "draft", l: "Draft" },
  { k: "sent", l: "Sent" },
  { k: "viewed", l: "Viewed" },
  { k: "followup", l: "Follow-up" },
  { k: "accepted", l: "Accepted" },
  { k: "declined", l: "Declined" },
];

// ─── Builder version badge ─────────────────────────────────────

function BuilderBadge({ version }: { version?: "tiptap" | "blocks" }) {
  const isBlocks = version === "blocks";
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 99,
        border: isBlocks ? "1px solid var(--gold)" : "1px solid var(--line)",
        background: isBlocks ? "var(--gold-bg)" : "transparent",
        color: isBlocks ? "var(--gold-deep)" : "var(--ink-3)",
        flexShrink: 0,
        lineHeight: 1.6,
      }}
    >
      {isBlocks ? "Blocks" : "Legacy"}
    </span>
  );
}

// ─── Action menu for a single proposal row ─────────────────────

interface ConvertState {
  id: string;
  status: "converting" | "done" | "error";
  error?: string;
}

interface ActionMenuProps {
  proposal: Proposal;
  convertState: ConvertState | null;
  onConvert: (quoteId: string) => void;
  onClose: () => void;
}

function ActionMenu({ proposal, convertState, onConvert, onClose }: ActionMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const quoteId = proposal.quoteId || proposal.id;
  const editorId = quoteId;
  const isBlocks = proposal.builderVersion === "blocks";
  const converting = convertState?.id === quoteId && convertState.status === "converting";
  const convertDone = convertState?.id === quoteId && convertState.status === "done";
  const convertError = convertState?.id === quoteId && convertState.status === "error";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        zIndex: 200,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,.14)",
        minWidth: 210,
        padding: "6px 0",
        overflow: "hidden",
      }}
    >
      {!isBlocks && (
        <MenuItem
          icon="edit"
          label="Edit (legacy editor)"
          href={`/quotes/editor?id=${editorId}`}
          onClick={onClose}
        />
      )}
      <MenuItem
        icon="bolt"
        label="Open Block Builder"
        href={`/quotes/builder?quoteId=${quoteId}`}
        onClick={onClose}
        highlight={isBlocks}
      />

      <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />

      {isBlocks ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            fontSize: 13,
            color: "var(--green)",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 14 }}>✓</span> Using Block Builder
        </div>
      ) : (
        <button
          onClick={() => {
            if (!converting && !convertDone) onConvert(quoteId);
          }}
          disabled={converting || convertDone}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 14px",
            background: "transparent",
            border: "none",
            cursor: converting || convertDone ? "default" : "pointer",
            fontSize: 13,
            color: convertError
              ? "var(--rose)"
              : convertDone
              ? "var(--green)"
              : "var(--ink-2)",
            fontWeight: 500,
            textAlign: "left",
          }}
        >
          {converting ? (
            <>
              <span style={{ fontSize: 13, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              Converting…
            </>
          ) : convertDone ? (
            <><span>✓</span> Converted!</>
          ) : convertError ? (
            <><span>⚠️</span> {convertState?.error ?? "Error"}</>
          ) : (
            <><span>⇆</span> Convert to Blocks</>
          )}
        </button>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  href,
  onClick,
  highlight,
}: {
  icon: string;
  label: string;
  href: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        fontSize: 13,
        color: highlight ? "var(--gold-deep)" : "var(--ink-2)",
        fontWeight: highlight ? 600 : 400,
        textDecoration: "none",
        background: "transparent",
        transition: "background .1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--line-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon as never} size={13} />
      {label}
    </Link>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function ProposalsV2() {
  const { proposals: props, contactById } = useV2LiveData();
  const router = useRouter();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [convertState, setConvertState] = useState<ConvertState | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newLoading, setNewLoading] = useState(false);

  async function createBlankProposal() {
    setNewLoading(true);
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + 30);
      const quoteId = crypto.randomUUID();
      const proposalNumber = computeNextProposalNumber(
        props.map((p) => ({
          id: p.quoteId ?? p.id,
          projectName: p.title,
          customerName: "Customer",
          good: emptyPrice("Good"),
          better: emptyPrice("Better"),
          best: emptyPrice("Best"),
          selectedOption: "Better" as const,
          status: "Draft" as const,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          proposalNumber: p.id,
        }))
      );
      const quote: Quote = {
        id: quoteId,
        projectName: "New Proposal",
        customerName: "New Customer",
        proposalNumber,
        status: "Draft",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        clientPortalToken: crypto.randomUUID(),
        builderVersion: "blocks",
        proposalBlocks: [],
        good: emptyPrice("Good"),
        better: emptyPrice("Better"),
        best: emptyPrice("Best"),
        selectedOption: "Better",
      };
      await upsertQuote(supabase, quote);
      router.push(`/quotes/builder?quoteId=${quoteId}`);
    } catch {
      setNewLoading(false);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: props.length };
    props.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [props]);

  const filtered = props.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const contact = contactById(p.contactId);
      return (
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        contact.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalValue = filtered.reduce((a, p) => a + p.value, 0);
  const avgValue = filtered.length ? Math.round(totalValue / filtered.length) : 0;
  const avgMargin = filtered.length
    ? Math.round(filtered.reduce((a, p) => a + p.margin, 0) / filtered.length)
    : 0;
  const acceptedCount = filtered.filter((p) => p.status === "accepted").length;
  const winRate = filtered.length ? Math.round((acceptedCount / filtered.length) * 100) : 0;

  async function handleConvert(quoteId: string) {
    setConvertState({ id: quoteId, status: "converting" });
    try {
      const [quote, rawSettings] = await Promise.all([
        getQuote(supabase, quoteId),
        loadCompanySettings<AppSettings>(supabase),
      ]);

      if (!quote) throw new Error("Proposal not found");

      const settings = mergeAppSettings(rawSettings ?? defaultSettings);
      const blocks = quoteToProposalBlocks(quote, settings);

      // Preserve proposalDocument + proposalDocumentJson — only ADD blocks fields
      await upsertQuote(supabase, {
        ...quote,
        builderVersion: "blocks",
        proposalBlocks: blocks as unknown[],
        // proposalDocument and proposalDocumentJson are preserved via spread
      });

      setConvertState({ id: quoteId, status: "done" });

      // Small delay so the user sees "Converted!" before navigating
      setTimeout(() => {
        router.push(`/quotes/builder?quoteId=${quoteId}`);
      }, 900);
    } catch (e) {
      setConvertState({
        id: quoteId,
        status: "error",
        error: e instanceof Error ? e.message : "Conversion failed",
      });
    }
  }

  return (
    <V2Shell>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="props-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Sales</div>
            <h1 className="page-title">Proposals</h1>
            <div className="page-sub">
              {filtered.length} of {props.length} proposals · {fmt$(totalValue)} total value
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/v2/templates/builder" className="btn ghost">
              <Icon name="copy" size={14} /> Templates
            </Link>
            <button className="btn ghost" onClick={() => setTemplateDialogOpen(true)}>
              <Icon name="copy" size={14} /> Create Proposal From Template
            </button>
            <button className="btn primary" onClick={createBlankProposal} disabled={newLoading}>
              <Icon name="plus" size={14} /> {newLoading ? "Creating…" : "New proposal"}
            </button>
          </div>
        </div>

        <div className="props-stats">
          <div className="pstat"><div className="l">Total value</div><div className="v">{fmt$(totalValue)}</div></div>
          <div className="pstat"><div className="l">Avg value</div><div className="v">{fmt$(avgValue)}</div></div>
          <div className="pstat"><div className="l">Avg margin</div><div className="v">{avgMargin}<small>%</small></div></div>
          <div className="pstat"><div className="l">Win rate</div><div className="v">{winRate}<small>%</small></div></div>
        </div>

        <div className="props-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input
              placeholder="Search by customer, job, or proposal #"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-dd-wrap" ref={filterRef} style={{ position: "relative" }}>
            <button
              className={`btn ghost ${statusFilter !== "all" ? "active" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="filter" size={13} />
              {statusFilter === "all"
                ? "Filter"
                : STATUS_CHIPS.find((s) => s.k === statusFilter)?.l}
              {statusFilter !== "all" && (
                <span
                  style={{
                    background: "var(--ink)",
                    color: "#fff",
                    borderRadius: 99,
                    fontSize: 10,
                    padding: "1px 6px",
                    marginLeft: 2,
                  }}
                >
                  {counts[statusFilter] ?? 0}
                </span>
              )}
              <Icon name="chevron-d" size={11} />
            </button>
            {filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  zIndex: 120,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                  minWidth: 180,
                  padding: "6px 0",
                  overflow: "hidden",
                }}
                onMouseLeave={() => setFilterOpen(false)}
              >
                {STATUS_CHIPS.map((s) => (
                  <button
                    key={s.k}
                    onClick={() => { setStatusFilter(s.k); setFilterOpen(false); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "8px 14px",
                      background: statusFilter === s.k ? "var(--line)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--ink)",
                      textAlign: "left",
                      gap: 8,
                    }}
                  >
                    <span>{s.l}</span>
                    <span
                      style={{
                        background: "var(--line)",
                        borderRadius: 99,
                        fontSize: 11,
                        padding: "1px 7px",
                        color: "var(--ink-2)",
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      {counts[s.k] ?? 0}
                    </span>
                  </button>
                ))}
                {statusFilter !== "all" && (
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
                    <button
                      onClick={() => { setStatusFilter("all"); setFilterOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        width: "100%",
                        padding: "7px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                      }}
                    >
                      <Icon name="x" size={11} /> Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
              <Icon name="list" size={13} /> List
            </button>
            <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
              <Icon name="kanban" size={13} /> Stages
            </button>
          </div>
        </div>

        {view === "list" ? (
          <ProposalsList
            items={filtered}
            contactById={contactById}
            convertState={convertState}
            onConvert={handleConvert}
          />
        ) : (
          <ProposalsKanban items={filtered} contactById={contactById} />
        )}
        {templateDialogOpen && (
          <CreateFromTemplateDialog
            proposals={props}
            onClose={() => setTemplateDialogOpen(false)}
          />
        )}
      </div>
    </V2Shell>
  );
}

function CreateFromTemplateDialog({
  proposals,
  onClose,
}: {
  proposals: Proposal[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { contacts, settings: rawSettings } = useV2LiveData();
  const settings = mergeAppSettings(rawSettings ?? defaultSettings);
  const [templates, setTemplates] = useState<ProposalTemplate[]>(defaultBlockProposalTemplates);
  const [templateId, setTemplateId] = useState(defaultBlockProposalTemplates[0]?.id ?? "");
  const [customerName, setCustomerName] = useState(contacts[0]?.name ?? "New Customer");
  const [projectName, setProjectName] = useState("New proposal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listProposalTemplates(supabase)
      .then((saved) => {
        const blockTemplates = mergeProposalTemplates(saved).filter((t) => t.builderVersion === "blocks");
        setTemplates(blockTemplates.length ? blockTemplates : defaultBlockProposalTemplates);
        setTemplateId((blockTemplates[0] ?? defaultBlockProposalTemplates[0])?.id ?? "");
      })
      .catch(() => setTemplates(defaultBlockProposalTemplates));
  }, [supabase]);

  async function createFromTemplate() {
    const template = templates.find((t) => t.id === templateId);
    if (!template?.proposalBlocks?.length) {
      setError("This template has no blocks yet.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + settings.proposalSettings.defaultExpirationDays);
      const quoteId = crypto.randomUUID();
      const contact = contacts.find((c) => c.name === customerName) ?? contacts[0];
      const proposalNumber = computeNextProposalNumber(
        proposals.map((proposal) => ({
          id: proposal.quoteId ?? proposal.id,
          projectName: proposal.title,
          customerName: customerName || "Customer",
          good: emptyPrice("Good"),
          better: emptyPrice("Better"),
          best: emptyPrice("Best"),
          selectedOption: "Better" as const,
          status: "Draft" as const,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          proposalNumber: proposal.id,
        }))
      );

      const quote: Quote = {
        id: quoteId,
        contactId: contact?.id,
        projectName: projectName.trim() || template.name,
        customerName: contact?.name ?? customerName,
        customerPhone: contact?.phone,
        customerEmail: contact?.email,
        customerAddress: contact?.addr,
        trade: template.category ?? template.trade,
        proposalTitle: template.name,
        proposalNumber,
        scopeSummary: `Created from ${template.name}.`,
        warrantyText: settings.proposalSettings.defaultWarrantyText,
        termsText: settings.proposalSettings.defaultTerms,
        includedServices: settings.proposalSettings.defaultIncludedServices,
        certifications: settings.companyProfile.certifications.filter((c) => c.enabled).map((c) => c.name),
        good: emptyPrice("Good"),
        better: emptyPrice("Better"),
        best: emptyPrice("Best"),
        selectedOption: "Better",
        status: "Draft",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        jobAddress: contact?.addr,
        clientPortalToken: crypto.randomUUID(),
        builderVersion: "blocks",
        proposalBlocks: [],
      };

      const blocks = applyMergeVariablesToBlocks(template.proposalBlocks, quote, settings);
      await upsertQuote(supabase, {
        ...quote,
        proposalBlocks: blocks as unknown[],
      });
      router.push(`/quotes/builder?quoteId=${quoteId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create proposal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(17,24,39,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Create Proposal From Template</div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 4 }}>Copy reusable blocks into a new proposal.</div>
        </div>
        <div style={{ padding: 24, display: "grid", gap: 16 }}>
          <label style={dialogLabel}>Template</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={dialogInput}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.category ?? template.trade}
              </option>
            ))}
          </select>
          <label style={dialogLabel}>Customer</label>
          {contacts.length ? (
            <select value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={dialogInput}>
              {contacts.map((contact) => <option key={contact.id}>{contact.name}</option>)}
            </select>
          ) : (
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={dialogInput} />
          )}
          <label style={dialogLabel}>Project name</label>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} style={dialogInput} />
          {error && <div style={{ color: "#991b1b", fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "16px 24px 22px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={createFromTemplate} disabled={saving}>
            {saving ? "Creating…" : "Create and open"}
          </button>
        </div>
      </div>
    </div>
  );
}

function emptyPrice(name: "Good" | "Better" | "Best") {
  return {
    name,
    salePrice: 0,
    profit: 0,
    margin: 0,
    markup: 0,
    description: "",
    useCase: "",
  };
}

const dialogLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: "var(--ink-3)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  marginBottom: -10,
};

const dialogInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: 9,
  padding: "10px 12px",
  fontSize: 14,
  color: "var(--ink)",
  background: "#fff",
  outline: "none",
};

// ─── List view ─────────────────────────────────────────────────

function ProposalsList({
  items,
  contactById,
  convertState,
  onConvert,
}: {
  items: Proposal[];
  contactById: (id: string) => Contact;
  convertState: ConvertState | null;
  onConvert: (quoteId: string) => void;
}) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="props-list">
      <div className="hdr">
        <div>Proposal #</div>
        <div>Job</div>
        <div>Customer</div>
        <div style={{ textAlign: "right" }}>Value</div>
        <div>Status</div>
        <div style={{ textAlign: "right" }}>Age</div>
        <div></div>
      </div>
      {items.length === 0 && (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: 13.5,
          }}
        >
          No proposals match your filters.
        </div>
      )}
      {items.map((p) => {
        const c = contactById(p.contactId);
        const status = PROPOSAL_STATUS[p.status];
        const isOpen = ["sent", "viewed", "followup"].includes(p.status);
        const ageWarn = p.age >= 14 && isOpen;
        const ageHot = p.age >= 21 && isOpen;
        const quoteId = p.quoteId || p.id;
        const menuOpen = openMenuId === quoteId;

        return (
          <div
            key={p.id}
            className="row"
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("button,a")) return;
              router.push(`/quotes/builder?quoteId=${quoteId}`);
            }}
          >
            <div className="ref">{p.id}</div>
            <div className="title">
              <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {p.title}
                <BuilderBadge version={p.builderVersion} />
              </span>
              <span className="sub">{p.items} items · {p.margin}% margin</span>
            </div>
            <div className="contact">
              <div
                className="avatar sm"
                style={{ background: colorForId(c.id || p.contactId) }}
              >
                {initials(c.name)}
              </div>
              <div className="meta">
                <div className="cn">{c.name}</div>
                <div className="cb">{c.biz}</div>
              </div>
            </div>
            <div className="val">{fmt$(p.value)}</div>
            <div>
              <span className={`pill ${status.color}`}>
                <span className="dot"></span>
                {status.label}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              {p.sent ? (
                <span className={`age-badge ${ageHot ? "hot" : ageWarn ? "warn" : ""}`}>
                  {p.age}d
                </span>
              ) : (
                <span className="age-badge">—</span>
              )}
            </div>
            <div className="actions" style={{ position: "relative" }}>
              <button
                className="icon-btn"
                style={{ width: 30, height: 30, border: "none", background: "transparent" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(menuOpen ? null : quoteId);
                }}
                title="Actions"
              >
                <Icon name="more" size={16} />
              </button>
              {menuOpen && (
                <ActionMenu
                  proposal={p}
                  convertState={convertState}
                  onConvert={(id) => {
                    setOpenMenuId(null);
                    onConvert(id);
                  }}
                  onClose={() => setOpenMenuId(null)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban view ───────────────────────────────────────────────

function ProposalsKanban({
  items,
  contactById,
}: {
  items: Proposal[];
  contactById: (id: string) => Contact;
}) {
  const router = useRouter();
  return (
    <div className="kanban">
      {STAGES.map((s) => {
        const cards = items.filter((p) => p.status === s.k);
        const sum = cards.reduce((a, p) => a + p.value, 0);
        const color = PROPOSAL_STATUS[s.k]?.color ?? "dark";
        return (
          <div key={s.k} className="kb-col">
            <div className="kb-col-head">
              <span className={`pill ${color}`}>
                <span className="dot"></span>
                {s.l}
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="sum">{fmt$(sum)}</span>
                <span className="ct">{cards.length}</span>
              </div>
            </div>
            <div className="kb-body">
              {cards.length === 0 && <div className="kb-empty">No proposals here</div>}
              {cards.map((p) => {
                const c = contactById(p.contactId);
                const quoteId = p.quoteId || p.id;
                return (
                  <div
                    key={p.id}
                    className="kb-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/quotes/builder?quoteId=${quoteId}`)}
                  >
                    <div className="top">
                      <span className="ref">{p.id}</span>
                      <span className="val">{fmt$(p.value)}</span>
                    </div>
                    <div className="title">{p.title}</div>
                    <div className="foot">
                      <div className="contact-mini">
                        <div
                          className="avatar sm"
                          style={{
                            background: colorForId(c.id || p.contactId),
                            width: 20,
                            height: 20,
                            fontSize: 9,
                          }}
                        >
                          {initials(c.name)}
                        </div>
                        <span className="cn">{c.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="mono">{p.margin}%</span>
                        <BuilderBadge version={p.builderVersion} />
                      </div>
                    </div>
                    {/* Block builder quick link */}
                    {p.builderVersion === "blocks" && (
                      <div
                        style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line-2)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/quotes/builder?quoteId=${quoteId}`}
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: "var(--gold-deep)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon name="bolt" size={11} /> Open Block Builder →
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
