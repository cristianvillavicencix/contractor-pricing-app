"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { upsertQuote } from "@/lib/supabase/data";
import {
  normalizeProposalBlocks,
  addBlockToList,
  removeBlockFromList,
  buildBlocksPrintHtml,
} from "@/lib/proposal-blocks";
import type { Quote, AppSettings } from "@/lib/app-data";
import type { ProposalTemplate } from "@/lib/proposal-templates";
import type { ProposalBlock, BlockType } from "@/types/proposal-blocks";
import { BlockToolbar } from "./BlockToolbar";
import { BlocksSidebar } from "./BlocksSidebar";
import { DocumentBlock } from "./DocumentBlock";
import { FloatingSettingsPanel } from "./FloatingSettingsPanel";
import { ProposalSettingsPanel } from "./ProposalSettingsPanel";
import { PROPOSAL_VARIABLES, variableToken } from "@/lib/proposal-variables";

type SaveState = "idle" | "saving" | "saved" | "error";
type SendState = "idle" | "sending" | "sent" | "error";

interface Props {
  initialBlocks: ProposalBlock[];
  quote: Quote;
  settings: AppSettings | null;
  template: ProposalTemplate | null;
  supabase: SupabaseClient;
  backHref?: string;
  mode?: "quote" | "template";
  titleOverride?: string;
  subtitleOverride?: string;
  onSaveBlocks?: (blocks: ProposalBlock[]) => Promise<void>;
  onSaveAsTemplate?: (blocks: ProposalBlock[]) => void;
  onLoadTemplate?: () => void;
  onDuplicateTemplate?: (blocks: ProposalBlock[]) => void;
}

// Block types that open the floating settings panel when selected
const SETTINGS_BLOCK_TYPES = new Set([
  "cover", "pricing", "materials_table", "divider", "timeline", "image",
  "testimonial", "before_after", "team", "faq", "financing", "gallery_grid", "cta",
]);

const TEXT_BLOCK_TYPES = new Set([
  "executive_summary",
  "scope",
  "conditions",
  "warranty",
  "terms",
  "acceptance",
  "rich_text",
]);

export function BlockEditor({
  initialBlocks,
  quote,
  settings,
  supabase,
  backHref = "/v2/proposals",
  mode = "quote",
  titleOverride,
  subtitleOverride,
  onSaveBlocks,
  onSaveAsTemplate,
  onLoadTemplate,
  onDuplicateTemplate,
}: Props) {
  const [blocks, setBlocks] = useState<ProposalBlock[]>(() =>
    normalizeProposalBlocks(initialBlocks)
  );
  const [quoteDraft, setQuoteDraft] = useState<Quote>(quote);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialBlocks.find((b) => b.enabled)?.id ?? initialBlocks[0]?.id ?? null
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showFloatingSettings, setShowFloatingSettings] = useState(false);
  const [showProposalSettings, setShowProposalSettings] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const scheduleSave = useCallback(
    (updatedBlocks: ProposalBlock[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaveState("saving");
        try {
          if (mode === "template" && onSaveBlocks) {
            await onSaveBlocks(updatedBlocks);
          } else {
            await upsertQuote(supabase, {
              ...quoteDraft,
              builderVersion: "blocks",
              proposalBlocks: updatedBlocks as unknown[],
            });
          }
          setSaveState("saved");
          setTimeout(() => setSaveState("idle"), 2500);
        } catch {
          setSaveState("error");
        }
      }, 2000);
    },
    [mode, onSaveBlocks, supabase, quoteDraft]
  );

  const handleBlockChange = useCallback(
    (updated: ProposalBlock) => {
      setBlocks((prev) => {
        const next = prev.map((b) => (b.id === updated.id ? updated : b));
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const handleToggle = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const next = prev.map((b) =>
          b.id === id ? { ...b, enabled: !b.enabled } : b
        );
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const handleAdd = useCallback(
    (type: BlockType) => {
      setBlocks((prev) => {
        const next = addBlockToList(prev, type);
        scheduleSave(next);
        const newBlock = next.find((b) => !prev.some((p) => p.id === b.id));
        if (newBlock) {
          setSelectedId(newBlock.id);
          // Auto-open settings panel for settings-type blocks
          if (SETTINGS_BLOCK_TYPES.has(type)) setShowFloatingSettings(true);
        }
        return next;
      });
    },
    [scheduleSave]
  );

  const handleRemove = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const next = removeBlockFromList(prev, id);
        scheduleSave(next);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
          setShowFloatingSettings(false);
        }
        return next;
      });
    },
    [scheduleSave, selectedId]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const oldIndex = sorted.findIndex((b) => b.id === active.id);
      const newIndex = sorted.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(sorted, oldIndex, newIndex);
      const normalized = reordered.map((b, i) => ({ ...b, position: i }));
      scheduleSave(normalized);
      return normalized;
    });
  }

  const handleSaveNow = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    try {
      if (mode === "template" && onSaveBlocks) {
        await onSaveBlocks(blocks);
      } else {
        await upsertQuote(supabase, {
          ...quoteDraft,
          builderVersion: "blocks",
          proposalBlocks: blocks as unknown[],
        });
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }, [mode, onSaveBlocks, supabase, quoteDraft, blocks]);

  const handleSelectBlock = useCallback((id: string) => {
    setSelectedId(id);
    // Close floating settings panel when switching blocks
    setShowFloatingSettings(false);
  }, []);

  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const selectedIsText = selectedBlock !== null && TEXT_BLOCK_TYPES.has(selectedBlock.data.type);
  const settingsPanelVisible =
    showFloatingSettings &&
    selectedBlock !== null &&
    SETTINGS_BLOCK_TYPES.has(selectedBlock.data.type);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          background: "#f9fafb",
        }}
      >
        <BlockToolbar
          quoteTitle={titleOverride ?? quoteDraft.proposalTitle ?? quoteDraft.projectName}
          customerName={subtitleOverride ?? quoteDraft.customerName}
          quoteId={quoteDraft.id}
          saveState={saveState}
          sendState={sendState}
          onSave={handleSaveNow}
          onPreview={() => setPreviewOpen(true)}
          onSend={() => { setSendState("idle"); setShowSendDialog(true); }}
          backHref={backHref}
          showSend={mode === "quote"}
          exportHref={mode === "quote" ? undefined : null}
          onSaveAsTemplate={onSaveAsTemplate ? () => onSaveAsTemplate(blocks) : undefined}
          onLoadTemplate={onLoadTemplate}
          onDuplicateTemplate={onDuplicateTemplate ? () => onDuplicateTemplate(blocks) : undefined}
          onProposalSettings={mode === "quote" ? () => setShowProposalSettings(true) : undefined}
        />

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── Left sidebar ── */}
          <div
            style={{
              width: 252,
              flexShrink: 0,
              borderRight: "1px solid #e5e7eb",
              background: "#ffffff",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sorted.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <BlocksSidebar
                  blocks={blocks}
                  selectedId={selectedId}
                  onSelect={handleSelectBlock}
                  onToggle={handleToggle}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                />
              </SortableContext>
            </DndContext>
            <div style={{ borderTop: "1px solid #f3f4f6", padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 8 }}>
                Variables
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PROPOSAL_VARIABLES.slice(0, 8).map((v) => (
                  <button
                    key={v.key}
                    title="Click to copy variable"
                    onClick={() => void navigator.clipboard?.writeText(variableToken(v.key))}
                    style={{
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      borderRadius: 999,
                      padding: "3px 7px",
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Document canvas — shows ONE section at a time (full A4 page) ── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              background: "#6b6f75",
              padding: "40px 24px 80px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {blocks.length === 0 ? (
              <div style={{ marginTop: 80, color: "#9ca3af", fontSize: 13.5 }}>
                No sections yet. Add one from the sidebar.
              </div>
            ) : !selectedBlock ? (
              <div style={{ marginTop: 80, color: "#9ca3af", fontSize: 13.5, textAlign: "center", lineHeight: 1.7 }}>
                Select a section from the sidebar<br />to see its page preview.
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: 820,
                  marginTop: selectedIsText ? 56 : 0,
                  borderRadius: 18,
                  flexShrink: 0,
                  boxShadow: "0 12px 48px rgba(0,0,0,.45)",
                }}
              >
                <DocumentBlock
                  block={selectedBlock}
                  quote={quoteDraft}
                  isSelected={true}
                  onSelect={() => {}}
                  onChange={handleBlockChange}
                  onOpenSettings={() => setShowFloatingSettings(true)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating settings panel ── */}
      {settingsPanelVisible && selectedBlock && (
        <FloatingSettingsPanel
          block={selectedBlock}
          quote={quoteDraft}
          settings={settings}
          onChange={handleBlockChange}
          onClose={() => setShowFloatingSettings(false)}
        />
      )}

      {mode === "quote" && showProposalSettings && (
        <ProposalSettingsPanel
          value={quoteDraft.proposalDocumentSettings}
          onChange={(proposalDocumentSettings) => {
            const nextQuote = { ...quoteDraft, proposalDocumentSettings };
            setQuoteDraft(nextQuote);
            void upsertQuote(supabase, nextQuote);
          }}
          onClose={() => setShowProposalSettings(false)}
        />
      )}

      {/* ── Preview modal ── */}
      {previewOpen && (
        <PreviewModal
          blocks={blocks}
          quote={quoteDraft}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 1000,
            background: toast.type === "success" ? "#166534" : "#991b1b",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,.25)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 360,
            lineHeight: 1.4,
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* ── Send dialog ── */}
      {mode === "quote" && showSendDialog && (
        <SendDialog
          quote={quoteDraft}
          blocks={blocks}
          onClose={() => setShowSendDialog(false)}
          onSent={() => {
            setShowSendDialog(false);
            setSendState("sent");
            setToast({ type: "success", message: "Proposal sent successfully!" });
            setTimeout(() => setSendState("idle"), 3000);
            setTimeout(() => setToast(null), 4000);
          }}
          onError={(msg) => {
            setShowSendDialog(false);
            setSendState("error");
            setToast({ type: "error", message: msg || "Failed to send proposal." });
            setTimeout(() => setSendState("idle"), 4000);
            setTimeout(() => setToast(null), 5000);
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Modal
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({
  blocks,
  quote,
  onClose,
}: {
  blocks: ProposalBlock[];
  quote: Quote;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const enabledCount = blocks.filter((b) => b.enabled).length;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(17,24,39,.7)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 52,
          background: "#111827", flexShrink: 0, borderBottom: "1px solid #1f2937",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#f9fafb" }}>Document Preview</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#1f2937", color: "#9ca3af", border: "1px solid #374151" }}>
            {enabledCount} section{enabledCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "#6b7280" }}>Press Esc to close</span>
          <button onClick={onClose} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #374151", background: "#1f2937", fontSize: 13, cursor: "pointer", color: "#d1d5db", fontWeight: 500 }}>
            Close
          </button>
        </div>
      </div>
      <iframe
        srcDoc={buildBlocksPrintHtml(blocks, quote)}
        title="Proposal preview"
        style={{ flex: 1, border: "none", background: "#374151", width: "100%" }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Dialog
// ─────────────────────────────────────────────────────────────────────────────

function SendDialog({
  quote, blocks, onClose, onSent, onError,
}: {
  quote: Quote;
  blocks: ProposalBlock[];
  onClose: () => void;
  onSent: () => void;
  onError: (msg: string) => void;
}) {
  const [to, setTo] = useState(quote.customerEmail ?? "");
  const [subject, setSubject] = useState(`Proposal: ${quote.proposalTitle || quote.projectName || "Your Proposal"}`);
  const [message, setMessage] = useState(`Hi ${quote.customerName || "there"},\n\nPlease find your proposal attached. Let me know if you have any questions.\n\nThank you for the opportunity.`);
  const [sending, setSending] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const hasEnabledBlocks = blocks.some((b) => b.enabled);

  async function handleSend() {
    if (!to.trim()) { setValidationError("Recipient email is required."); return; }
    if (!hasEnabledBlocks) { setValidationError("Enable at least one section before sending."); return; }
    setValidationError("");
    setSending(true);
    try {
      const res = await fetch(`/api/proposal/${quote.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Send failed (${res.status})`);
      }
      onSent();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Unexpected error");
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(17,24,39,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#ffffff", borderRadius: 12, width: "100%", maxWidth: 520, boxShadow: "0 24px 60px rgba(0,0,0,.25)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>Send Proposal</div>
          <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 3 }}>The PDF will be generated and attached automatically.</div>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {!hasEnabledBlocks && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef3c7", border: "1px solid #fcd34d", fontSize: 13, color: "#92400e" }}>
              No sections enabled. Enable at least one section to send.
            </div>
          )}
          <div>
            <label style={fieldLabel}>To</label>
            <input style={fieldInput} type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@example.com" autoFocus />
          </div>
          <div>
            <label style={fieldLabel}>Subject</label>
            <input style={fieldInput} type="text" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>Message</label>
            <textarea style={{ ...fieldInput, height: 120, resize: "vertical", fontFamily: "inherit" }} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {validationError && <div style={{ fontSize: 12.5, color: "#dc2626" }}>{validationError}</div>}
        </div>
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={sending} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#374151" }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || !hasEnabledBlocks} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: sending ? "#6b7280" : "#111827", fontSize: 13, fontWeight: 600, cursor: sending ? "wait" : "pointer", color: "#ffffff", opacity: !hasEnabledBlocks ? 0.5 : 1 }}>
            {sending ? "Sending…" : "Send Proposal"}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", background: "#ffffff",
  fontSize: 13.5, color: "#111827", outline: "none", boxSizing: "border-box",
};
