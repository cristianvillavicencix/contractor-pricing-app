"use client";

import type { PricingBlockData } from "@/types/proposal-blocks";
import type { Quote } from "@/lib/app-data";

interface Props {
  data: PricingBlockData & { type: "pricing" };
  quote: Quote;
  onChange: (data: PricingBlockData & { type: "pricing" }) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const sectionLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 600,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: 10,
};

export function PricingBlock({ data, quote, onChange }: Props) {
  const upd = (patch: Partial<PricingBlockData>) =>
    onChange({ ...data, ...patch });

  const tiers = [
    { key: "Good" as const, showKey: "showGood" as const, show: data.showGood, price: quote.good?.salePrice ?? 0 },
    { key: "Better" as const, showKey: "showBetter" as const, show: data.showBetter, price: quote.better?.salePrice ?? 0 },
    { key: "Best" as const, showKey: "showBest" as const, show: data.showBest, price: quote.best?.salePrice ?? 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Visible tiers */}
      <div>
        <label style={sectionLabel}>Visible tiers</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tiers.map(({ key, showKey, show, price }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 9,
                border: show ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
                background: show ? "#f0fdf4" : "#f9fafb",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => upd({ [showKey]: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: "#16a34a", cursor: "pointer" }}
              />
              <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: "#111827" }}>
                {key}
              </span>
              <span
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: price > 0 ? "#111827" : "#9ca3af",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {price > 0 ? fmt(price) : "—"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Highlighted tier */}
      <div>
        <label style={sectionLabel}>Highlighted tier</label>
        <div style={{ display: "flex", gap: 8 }}>
          {tiers.map(({ key }) => (
            <button
              key={key}
              onClick={() => upd({ selectedTier: key })}
              style={{
                flex: 1,
                padding: "9px 4px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                border: data.selectedTier === key ? "1.5px solid #16a34a" : "1px solid #e5e7eb",
                background: data.selectedTier === key ? "#f0fdf4" : "#f9fafb",
                color: data.selectedTier === key ? "#15803d" : "#374151",
                fontWeight: data.selectedTier === key ? 600 : 400,
                transition: "all .12s",
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={sectionLabel}>Premium pricing options</label>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={toggleRow}>
            <input type="checkbox" checked={data.showFeatureComparison ?? true} onChange={(e) => upd({ showFeatureComparison: e.target.checked })} />
            Feature comparison
          </label>
          <label style={toggleRow}>
            <input type="checkbox" checked={data.showFinancing ?? false} onChange={(e) => upd({ showFinancing: e.target.checked })} />
            Show monthly financing
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ ...sectionLabel, marginBottom: 5 }}>Most Popular</label>
              <select style={inputStyle} value={data.mostPopularTier ?? data.selectedTier} onChange={(e) => upd({ mostPopularTier: e.target.value as PricingBlockData["mostPopularTier"] })}>
                <option>Good</option><option>Better</option><option>Best</option>
              </select>
            </div>
            <div>
              <label style={{ ...sectionLabel, marginBottom: 5 }}>Months</label>
              <input style={inputStyle} type="number" value={data.financingMonths ?? 60} onChange={(e) => upd({ financingMonths: Number(e.target.value) || 60 })} />
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 9,
          background: "#f9fafb",
          border: "1px solid #f3f4f6",
          fontSize: 12.5,
          color: "#9ca3af",
          lineHeight: 1.6,
        }}
      >
        Prices are calculated from the Pricing Calculator. To update amounts, edit the quote from the Proposals list.
      </div>
    </div>
  );
}

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 13,
  boxSizing: "border-box",
};
