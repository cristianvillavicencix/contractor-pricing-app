"use client";

import type { CoverBlockData } from "@/types/proposal-blocks";
import type { AppSettings } from "@/lib/app-data";
import { AssetPicker } from "../AssetPicker";

interface Props {
  data: CoverBlockData & { type: "cover" };
  settings: AppSettings | null;
  onChange: (data: CoverBlockData & { type: "cover" }) => void;
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: 5,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  fontSize: 13.5,
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 14,
};

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input
        style={fieldInput}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const LAYOUTS = [
  { key: "centrado", label: "Centered" },
  { key: "elegante", label: "Elegant" },
  { key: "moderno", label: "Modern" },
  { key: "left", label: "Left" },
  { key: "split", label: "Split" },
] as const;

export function CoverBlock({ data, settings, onChange }: Props) {
  const upd = (patch: Partial<CoverBlockData>) => onChange({ ...data, ...patch });
  const str = (k: keyof CoverBlockData) => (data[k] as string) ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Layout selector */}
      <div>
        <label style={fieldLabel}>Layout</label>
        <div style={{ display: "flex", gap: 8 }}>
          {LAYOUTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => upd({ layout: key })}
              style={{
                padding: "7px 16px",
                borderRadius: 7,
                fontSize: 13,
                cursor: "pointer",
                border: data.layout === key ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
                background: data.layout === key ? "#f0fdf4" : "#f9fafb",
                color: data.layout === key ? "#15803d" : "#374151",
                fontWeight: data.layout === key ? 600 : 400,
                transition: "all .12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={grid2}>
        <Field
          label="Company name"
          value={str("companyName")}
          placeholder={settings?.companyProfile.businessName ?? "Your Company"}
          onChange={(v) => upd({ companyName: v })}
        />
        <Field
          label="Tagline"
          value={str("tagline")}
          placeholder="Professional services"
          onChange={(v) => upd({ tagline: v })}
        />
      </div>

      <div style={grid2}>
        <Field
          label="Client name"
          value={str("clientName")}
          onChange={(v) => upd({ clientName: v })}
        />
        <Field
          label="Project address"
          value={str("projectAddress")}
          onChange={(v) => upd({ projectAddress: v })}
        />
      </div>

      <div style={grid2}>
        <Field
          label="Proposal #"
          value={str("proposalNumber")}
          onChange={(v) => upd({ proposalNumber: v })}
        />
        <Field
          label="Date"
          value={str("date")}
          placeholder="2026-01-15"
          onChange={(v) => upd({ date: v })}
        />
      </div>

      <Field
        label="Logo URL"
        value={str("logoUrl")}
        placeholder="https://… (leave empty to use branding settings)"
        onChange={(v) => upd({ logoUrl: v })}
      />
      <AssetPicker category="Logos" value={str("logoUrl")} onSelect={(url) => upd({ logoUrl: url })} />

      <Field
        label="Background image URL"
        value={str("backgroundImageUrl")}
        placeholder="https://…"
        onChange={(v) => upd({ backgroundImageUrl: v })}
      />
      <AssetPicker category="Cover Images" value={str("backgroundImageUrl")} onSelect={(url) => upd({ backgroundImageUrl: url })} />

      <div style={grid2}>
        <div>
          <label style={fieldLabel}>Overlay</label>
          <select style={fieldInput} value={data.overlay ?? "auto"} onChange={(e) => upd({ overlay: e.target.value as CoverBlockData["overlay"] })}>
            <option value="auto">Auto dark</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label style={fieldLabel}>Logo position</label>
          <select style={fieldInput} value={data.logoPosition ?? "top-left"} onChange={(e) => upd({ logoPosition: e.target.value as CoverBlockData["logoPosition"] })}>
            <option value="top-left">Top left</option>
            <option value="top-center">Top center</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </div>
      </div>
    </div>
  );
}
