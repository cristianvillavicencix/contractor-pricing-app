"use client";

import type { ImageBlockData } from "@/types/proposal-blocks";
import { AssetPicker } from "../AssetPicker";

interface Props {
  data: ImageBlockData & { type: "image" };
  onChange: (data: ImageBlockData & { type: "image" }) => void;
}

const label: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: 5,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13.5,
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
};

export function ImageBlock({ data, onChange }: Props) {
  const upd = (patch: Partial<ImageBlockData>) => onChange({ ...data, ...patch });
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {data.src && (
        <img src={data.src} alt={data.alt ?? ""} style={{ width: "100%", borderRadius: 10, objectFit: "cover", maxHeight: 180 }} />
      )}
      <div>
        <label style={label}>Image URL</label>
        <input style={input} value={data.src} onChange={(e) => upd({ src: e.target.value })} placeholder="https://..." />
      </div>
      <AssetPicker category="Gallery Images" value={data.src} onSelect={(url) => upd({ src: url })} />
      <AssetPicker category="Material Images" value={data.src} onSelect={(url) => upd({ src: url })} />
      <div>
        <label style={label}>Alt text</label>
        <input style={input} value={data.alt ?? ""} onChange={(e) => upd({ alt: e.target.value })} />
      </div>
      <div>
        <label style={label}>Caption</label>
        <input style={input} value={data.caption ?? ""} onChange={(e) => upd({ caption: e.target.value })} />
      </div>
      <div>
        <label style={label}>Width</label>
        <input style={input} value={data.width ?? ""} onChange={(e) => upd({ width: e.target.value })} placeholder="100%, 420px, etc." />
      </div>
    </div>
  );
}
