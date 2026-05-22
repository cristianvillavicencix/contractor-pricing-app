"use client";

import type { TimelineBlockData } from "@/types/proposal-blocks";
import { RichTextBlock } from "./RichTextBlock";

interface Props {
  data: TimelineBlockData & { type: "timeline" };
  onChange: (data: TimelineBlockData & { type: "timeline" }) => void;
}

export function TimelineBlock({ data, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Estimated days bar */}
      <div
        style={{
          padding: "12px 32px",
          borderBottom: "1px solid #f3f4f6",
          background: "#ffffff",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            whiteSpace: "nowrap",
          }}
        >
          Estimated duration
        </label>
        <input
          type="number"
          min={1}
          max={999}
          value={data.estimatedDays ?? ""}
          onChange={(e) =>
            onChange({
              ...data,
              estimatedDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          placeholder="—"
          style={{
            width: 64,
            padding: "5px 10px",
            borderRadius: 7,
            border: "1px solid #e5e7eb",
            fontSize: 13.5,
            color: "#111827",
            outline: "none",
            textAlign: "center",
            background: "#f9fafb",
          }}
        />
        <span style={{ fontSize: 12.5, color: "#9ca3af" }}>days</span>
      </div>

      {/* Rich text phases */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <RichTextBlock
          data={data}
          onChange={(html) => onChange({ ...data, html })}
        />
      </div>
    </div>
  );
}
