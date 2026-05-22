"use client";

import type { DividerBlockData } from "@/types/proposal-blocks";

interface Props {
  data: DividerBlockData & { type: "divider" };
  onChange: (data: DividerBlockData & { type: "divider" }) => void;
}

const STYLES = [
  { key: "solid", label: "Solid" },
  { key: "dashed", label: "Dashed" },
  { key: "dotted", label: "Dotted" },
] as const;

export function DividerBlock({ data, onChange }: Props) {
  const current = data.style ?? "solid";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label
          style={{
            display: "block",
            fontSize: 11.5,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 10,
          }}
        >
          Line style
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STYLES.map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 14px",
                borderRadius: 9,
                border: current === key ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
                background: current === key ? "#f0fdf4" : "#f9fafb",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="divider-style"
                value={key}
                checked={current === key}
                onChange={() => onChange({ ...data, style: key })}
                style={{ accentColor: "#16a34a", cursor: "pointer" }}
              />
              <span
                style={{
                  fontWeight: 500,
                  fontSize: 13,
                  color: "#374151",
                  width: 56,
                }}
              >
                {label}
              </span>
              <div style={{ flex: 1 }}>
                <hr
                  style={{
                    border: "none",
                    borderTop: `2px ${key} #9ca3af`,
                    margin: 0,
                  }}
                />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 9,
          background: "#f9fafb",
          border: "1px solid #f3f4f6",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            marginBottom: 12,
          }}
        >
          Preview
        </div>
        <hr
          style={{
            border: "none",
            borderTop: `1px ${current} #d1d5db`,
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}
