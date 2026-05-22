"use client";

import { X } from "lucide-react";
import type { ProposalDocumentSettings, ProposalThemeName } from "@/types/proposal-blocks";
import { PROPOSAL_THEMES, resolveProposalSettings } from "@/lib/proposal-themes";

export function ProposalSettingsPanel({
  value,
  onChange,
  onClose,
}: {
  value?: ProposalDocumentSettings;
  onChange: (settings: ProposalDocumentSettings) => void;
  onClose: () => void;
}) {
  const resolved = resolveProposalSettings(value);
  const patch = (next: Partial<ProposalDocumentSettings>) => onChange({ ...value, ...next });
  return (
    <div style={{ position: "fixed", right: 20, top: 76, zIndex: 320, width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 24px 70px rgba(0,0,0,.2)", overflow: "hidden" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontWeight: 900 }}>Proposal Settings</div><div style={{ fontSize: 12, color: "#6b7280" }}>Theme, margins, PDF options</div></div>
        <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}><X size={14} /></button>
      </div>
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <Field label="Theme">
          <select style={input} value={resolved.theme} onChange={(e) => patch({ theme: e.target.value as ProposalThemeName })}>
            {Object.keys(PROPOSAL_THEMES).map((name) => <option key={name}>{name}</option>)}
          </select>
        </Field>
        <Field label="Primary color"><input style={input} type="color" value={resolved.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} /></Field>
        <Field label="Font family"><input style={input} value={resolved.fontFamily} onChange={(e) => patch({ fontFamily: e.target.value })} /></Field>
        <Field label="Page margins">
          <select style={input} value={resolved.pageMargins} onChange={(e) => patch({ pageMargins: e.target.value as ProposalDocumentSettings["pageMargins"] })}>
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="wide">Wide</option>
          </select>
        </Field>
        <Field label="PDF page size">
          <select style={input} value={resolved.pdfPageSize} onChange={(e) => patch({ pdfPageSize: e.target.value as ProposalDocumentSettings["pdfPageSize"] })}>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </Field>
        <label style={check}><input type="checkbox" checked={resolved.showPageNumbers} onChange={(e) => patch({ showPageNumbers: e.target.checked })} /> Show page numbers</label>
        <label style={check}><input type="checkbox" checked={resolved.showTableOfContents} onChange={(e) => patch({ showTableOfContents: e.target.checked })} /> Show table of contents</label>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5, fontSize: 11.5, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}{children}</label>;
}

const input: React.CSSProperties = { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#111827", fontSize: 13, boxSizing: "border-box" };
const check: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", fontWeight: 700 };
