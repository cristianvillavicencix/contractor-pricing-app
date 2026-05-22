"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MaterialsTableBlockData } from "@/types/proposal-blocks";

interface Props {
  data: MaterialsTableBlockData & { type: "materials_table" };
  onChange: (data: MaterialsTableBlockData & { type: "materials_table" }) => void;
}

const sectionLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: 10,
};

export function MaterialsTableBlock({ data, onChange }: Props) {
  const upd = (patch: Partial<MaterialsTableBlockData>) =>
    onChange({ ...data, ...patch });

  function updateRow(i: number, patch: Partial<MaterialsTableBlockData["rows"][0]>) {
    const rows = data.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    upd({ rows });
  }

  function addRow() {
    upd({ rows: [...data.rows, { description: "", brand: "", qty: "", unit: "" }] });
  }

  function removeRow(i: number) {
    upd({ rows: data.rows.filter((_, idx) => idx !== i) });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Tier selector */}
      <div>
        <label style={sectionLabel}>Tier</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["Good", "Better", "Best"] as const).map((t) => (
            <button
              key={t}
              onClick={() => upd({ tier: t })}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                border: data.tier === t ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
                background: data.tier === t ? "#f0fdf4" : "#f9fafb",
                color: data.tier === t ? "#15803d" : "#374151",
                fontWeight: data.tier === t ? 600 : 400,
                transition: "all .12s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div>
        <label style={sectionLabel}>Items</label>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 9, overflow: "hidden" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 22% 14% 14% 36px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {["Product / Description", "Brand", "Qty", "Unit", ""].map((h) => (
              <div
                key={h}
                style={{
                  padding: "8px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {data.rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 22% 14% 14% 36px",
                borderBottom: i < data.rows.length - 1 ? "1px solid #f3f4f6" : "none",
                alignItems: "stretch",
              }}
            >
              <input
                value={row.description}
                onChange={(e) => updateRow(i, { description: e.target.value })}
                placeholder="e.g. Architectural Shingles"
                style={cellInput}
              />
              <input
                value={row.brand ?? ""}
                onChange={(e) => updateRow(i, { brand: e.target.value })}
                placeholder="Brand"
                style={{ ...cellInput, borderLeft: "1px solid #f3f4f6" }}
              />
              <input
                value={row.qty ?? ""}
                onChange={(e) => updateRow(i, { qty: e.target.value })}
                placeholder="0"
                style={{ ...cellInput, borderLeft: "1px solid #f3f4f6", textAlign: "center" }}
              />
              <input
                value={row.unit ?? ""}
                onChange={(e) => updateRow(i, { unit: e.target.value })}
                placeholder="sq ft"
                style={{ ...cellInput, borderLeft: "1px solid #f3f4f6", textAlign: "center" }}
              />
              <button
                onClick={() => removeRow(i)}
                disabled={data.rows.length <= 1}
                title="Remove row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderLeft: "1px solid #f3f4f6",
                  background: "transparent",
                  cursor: data.rows.length <= 1 ? "not-allowed" : "pointer",
                  color: data.rows.length <= 1 ? "#d1d5db" : "#ef4444",
                  padding: 6,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add row button */}
        <button
          onClick={addRow}
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px dashed #d1d5db",
            background: "transparent",
            fontSize: 12.5,
            color: "#6b7280",
            cursor: "pointer",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Plus size={13} />
          Add row
        </button>
      </div>
    </div>
  );
}

const cellInput: React.CSSProperties = {
  border: "none",
  padding: "9px 10px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
  background: "transparent",
  width: "100%",
  boxSizing: "border-box",
};
