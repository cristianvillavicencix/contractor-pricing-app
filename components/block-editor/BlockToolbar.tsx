"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  FileDown,
  Send,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  FolderOpen,
  Settings,
} from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "error";
type SendState = "idle" | "sending" | "sent" | "error";

interface Props {
  quoteTitle: string;
  customerName: string;
  quoteId: string;
  saveState: SaveState;
  sendState: SendState;
  onSave: () => void;
  onPreview: () => void;
  onSend: () => void;
  backHref: string;
  exportHref?: string | null;
  showSend?: boolean;
  saveAsTemplateLabel?: string;
  loadTemplateLabel?: string;
  duplicateTemplateLabel?: string;
  onSaveAsTemplate?: () => void;
  onLoadTemplate?: () => void;
  onDuplicateTemplate?: () => void;
  onProposalSettings?: () => void;
}

export function BlockToolbar({
  quoteTitle,
  customerName,
  quoteId,
  saveState,
  sendState,
  onSave,
  onPreview,
  onSend,
  backHref,
  exportHref,
  showSend = true,
  saveAsTemplateLabel = "Save as Template",
  loadTemplateLabel = "Load Template",
  duplicateTemplateLabel = "Duplicate Template",
  onSaveAsTemplate,
  onLoadTemplate,
  onDuplicateTemplate,
  onProposalSettings,
}: Props) {
  const saveLabel =
    saveState === "saving" ? "Saving…" :
    saveState === "saved" ? "Saved" :
    saveState === "error" ? "Retry save" :
    "Save";

  const sendLabel =
    sendState === "sending" ? "Sending…" :
    sendState === "sent" ? "Sent!" :
    sendState === "error" ? "Retry send" :
    "Send Proposal";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 16px",
        height: 54,
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Back */}
      <Link
        href={backHref}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 500,
          color: "#6b7280",
          textDecoration: "none",
          padding: "6px 10px",
          borderRadius: 7,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          flexShrink: 0,
          transition: "all .12s",
        }}
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0, margin: "0 4px" }} />

      {/* Title group */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {quoteTitle || "Untitled Proposal"}
        </div>
        {customerName && (
          <div style={{ fontSize: 11.5, color: "#9ca3af", lineHeight: 1.2 }}>
            {customerName}
          </div>
        )}
      </div>

      {/* Save status indicator */}
      <SaveStatusBadge state={saveState} />

      <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0, margin: "0 4px" }} />

      {/* Preview */}
      <ToolbarButton onClick={onPreview} icon={<Eye size={14} />} label="Preview" />

      {/* Export PDF */}
      {exportHref !== null && (
        <a
          href={exportHref ?? `/api/proposals/pdf-blocks?quoteId=${quoteId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={toolbarLinkStyle}
        >
          <FileDown size={14} />
          <span>Export PDF</span>
        </a>
      )}

      {onLoadTemplate && <ToolbarButton onClick={onLoadTemplate} icon={<FolderOpen size={14} />} label={loadTemplateLabel} />}
      {onSaveAsTemplate && <ToolbarButton onClick={onSaveAsTemplate} icon={<Save size={14} />} label={saveAsTemplateLabel} />}
      {onDuplicateTemplate && <ToolbarButton onClick={onDuplicateTemplate} icon={<Copy size={14} />} label={duplicateTemplateLabel} />}
      {onProposalSettings && <ToolbarButton onClick={onProposalSettings} icon={<Settings size={14} />} label="Proposal Settings" />}

      <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0, margin: "0 4px" }} />

      {/* Send Proposal */}
      {showSend && (
        <button
          onClick={onSend}
          disabled={sendState === "sending"}
          style={{
            ...toolbarBtnBase,
            background: sendState === "sent" ? "#d1fae5" :
                        sendState === "error" ? "#fee2e2" :
                        "#f0fdf4",
            border: `1px solid ${sendState === "sent" ? "#6ee7b7" :
                                 sendState === "error" ? "#fca5a5" :
                                 "#86efac"}`,
            color: sendState === "sent" ? "#065f46" :
                   sendState === "error" ? "#991b1b" :
                   "#166534",
            cursor: sendState === "sending" ? "wait" : "pointer",
          }}
        >
          {sendState === "sending" ? <Loader2 size={14} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> :
           sendState === "sent" ? <CheckCircle2 size={14} /> :
           sendState === "error" ? <AlertCircle size={14} /> :
           <Send size={14} />}
          <span>{sendLabel}</span>
        </button>
      )}

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saveState === "saving"}
        style={{
          ...toolbarBtnBase,
          background: saveState === "saved" ? "#d1fae5" :
                      saveState === "error" ? "#fee2e2" :
                      "#111827",
          border: `1px solid ${saveState === "saved" ? "#6ee7b7" :
                               saveState === "error" ? "#fca5a5" :
                               "#111827"}`,
          color: saveState === "saved" ? "#065f46" :
                 saveState === "error" ? "#991b1b" :
                 "#ffffff",
          cursor: saveState === "saving" ? "wait" : "pointer",
        }}
      >
        {saveState === "saving" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> :
         saveState === "saved" ? <CheckCircle2 size={14} /> :
         <Save size={14} />}
        <span>{saveLabel}</span>
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SaveStatusBadge({ state }: { state: SaveState }) {
  if (state === "idle") {
    return (
      <div style={{ fontSize: 11.5, color: "#9ca3af", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d1d5db", display: "inline-block" }} />
        Unsaved
      </div>
    );
  }
  if (state === "saving") {
    return (
      <div style={{ fontSize: 11.5, color: "#6b7280", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
        Saving…
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div style={{ fontSize: 11.5, color: "#059669", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
        <CheckCircle2 size={11} />
        Saved
      </div>
    );
  }
  return (
    <div style={{ fontSize: 11.5, color: "#dc2626", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
      <AlertCircle size={11} />
      Save failed
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button onClick={onClick} style={toolbarBtnBase}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

const toolbarBtnBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 7,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  color: "#374151",
  flexShrink: 0,
  transition: "all .12s",
};

const toolbarLinkStyle: React.CSSProperties = {
  ...toolbarBtnBase,
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
