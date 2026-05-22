"use client";

import { memo } from "react";
import type { ProposalBlock, BlockData } from "@/types/proposal-blocks";
import type { Quote } from "@/lib/app-data";
import { highlightVariablesHtml } from "@/lib/proposal-variables";

interface Props {
  blocks: ProposalBlock[];
  quote: Quote;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

function BlockPreviewInner({ data, quote }: { data: BlockData; quote: Quote }) {
  switch (data.type) {
    case "cover":
      if (data.backgroundImageUrl || data.photoUrl) {
        const bg = data.backgroundImageUrl || data.photoUrl;
        const align = data.alignment ?? (data.layout === "split" ? "split" : data.layout === "left" ? "left" : "center");
        return (
          <div style={{
            minHeight: 620,
            margin: "-68px -76px",
            padding: 48,
            display: "grid",
            gridTemplateColumns: align === "split" ? "1fr 1fr" : "1fr",
            alignItems: "center",
            color: "#fff",
            backgroundImage: `${data.overlay === "none" ? "" : "linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.18)),"} url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            textAlign: align === "center" ? "center" : "left",
          }}>
            <div style={{ maxWidth: 560, justifySelf: align === "center" ? "center" : "start" }}>
              {data.logoUrl && <img src={data.logoUrl} alt="Logo" style={{ maxWidth: 135, maxHeight: 70, objectFit: "contain", marginBottom: 40, filter: "drop-shadow(0 8px 20px rgba(0,0,0,.25))" }} />}
              <div style={{ fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", opacity: .85, marginBottom: 16 }}>Professional Proposal</div>
              <h1 style={{ fontSize: 44, lineHeight: 1.05, margin: "0 0 14px", letterSpacing: "-.04em" }}>{data.companyName || "Your Company"}</h1>
              {data.tagline && <p style={{ fontSize: 18, lineHeight: 1.5, margin: "0 0 34px", opacity: .9 }}>{data.tagline}</p>}
              <div style={{ display: "grid", gap: 6, fontSize: 14, opacity: .92 }}>
                {data.clientName && <span>Prepared for <strong>{data.clientName}</strong></span>}
                {data.projectAddress && <span>{data.projectAddress}</span>}
                {(data.proposalNumber || data.date) && <span>{data.proposalNumber} · {data.date}</span>}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div style={{ textAlign: "center", padding: "60px 0 56px" }}>
          {data.logoUrl && (
            <img
              src={data.logoUrl}
              alt="Logo"
              style={{ maxWidth: 120, maxHeight: 56, objectFit: "contain", margin: "0 auto 24px", display: "block" }}
            />
          )}
          <h1 style={{ fontSize: "2.1em", fontWeight: 800, margin: "0 0 6px", color: "#111827", letterSpacing: "-.02em" }}>
            {data.companyName || "Your Company"}
          </h1>
          {data.tagline && (
            <p style={{ fontSize: "1em", color: "#6b7280", margin: "0 0 28px", fontStyle: "italic" }}>{data.tagline}</p>
          )}
          <div style={{ width: 40, height: 2, background: "#16a34a", margin: "0 auto 32px" }} />
          {data.clientName && (
            <p style={{ margin: "4px 0", fontSize: 14, color: "#374151" }}>
              Prepared for: <strong style={{ color: "#111827" }}>{data.clientName}</strong>
            </p>
          )}
          {data.projectAddress && (
            <p style={{ margin: "6px 0", fontSize: 13.5, color: "#6b7280" }}>{data.projectAddress}</p>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24 }}>
            {data.proposalNumber && (
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>Proposal #{data.proposalNumber}</span>
            )}
            {data.date && (
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{data.date}</span>
            )}
          </div>
        </div>
      );

    case "executive_summary":
      return (
        <div>
          <h2 style={h2}>Executive Summary</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
        </div>
      );

    case "conditions":
      return (
        <div>
          <h2 style={h2}>Existing Conditions</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
        </div>
      );

    case "scope":
      return (
        <div>
          <h2 style={h2}>Scope of Work</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
        </div>
      );

    case "rich_text":
      return <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />;

    case "terms":
      return (
        <div>
          <h2 style={h2}>Terms &amp; Conditions</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={{ ...prose, fontSize: 12.5 }} />
        </div>
      );

    case "warranty":
      return (
        <div>
          <h2 style={h2}>Warranty</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
        </div>
      );

    case "acceptance":
      return (
        <div>
          <h2 style={h2}>Acceptance &amp; Signature</h2>
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
          {data.requireSignature && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 48 }}>
              {["Client Signature / Date", "Contractor Signature / Date"].map((lbl) => (
                <div key={lbl}>
                  <div style={{ borderBottom: "1.5px solid #374151", height: 48, marginBottom: 8 }} />
                  <p style={{ fontSize: 11.5, color: "#6b7280", margin: 0 }}>{lbl}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "pricing": {
      const tiers = (
        [
          { key: "Good" as const, show: data.showGood, price: quote.good?.salePrice ?? 0 },
          { key: "Better" as const, show: data.showBetter, price: quote.better?.salePrice ?? 0 },
          { key: "Best" as const, show: data.showBest, price: quote.best?.salePrice ?? 0 },
        ] as const
      ).filter((t) => t.show);

      return (
        <div>
          <h2 style={h2}>Investment Options</h2>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 12 }}>
            {tiers.map(({ key, price }) => {
              const selected = key === (data.recommendedTier ?? data.selectedTier);
              const popular = key === (data.mostPopularTier ?? data.selectedTier);
              const monthly = data.showFinancing && price > 0 ? Math.max(1, Math.round(price / (data.financingMonths || 60))) : 0;
              return (
                <div key={key} style={{ border: selected ? "2px solid #166534" : "1px solid #e5e7eb", borderRadius: 14, padding: 18, background: selected ? "#f0fdf4" : "#fff", position: "relative" }}>
                  {popular && <div style={{ position: "absolute", top: -11, left: 18, background: "#d6a817", color: "#111", borderRadius: 99, padding: "3px 9px", fontSize: 10, fontWeight: 900 }}>Most Popular</div>}
                  <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#6b7280" }}>{key}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#111827", marginTop: 10 }}>{price > 0 ? fmt(price) : "—"}</div>
                  {monthly > 0 && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}>From {fmt(monthly)}/mo</div>}
                  <ul style={{ margin: "16px 0 0", paddingLeft: 18, color: "#374151", fontSize: 12.5, lineHeight: 1.7 }}>
                    {(data.includedRows?.length ? data.includedRows : ["Materials", "Labor", "Cleanup"]).map((row) => <li key={row}>{row}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "materials_table":
      return (
        <div>
          <h2 style={h2}>Materials &amp; Specifications</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Product", "Brand", "Qty", "Unit"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 14px", border: "1px solid #e5e7eb", color: "#111827" }}>{r.description}</td>
                  <td style={{ padding: "8px 14px", border: "1px solid #e5e7eb", color: "#374151" }}>{r.brand ?? ""}</td>
                  <td style={{ padding: "8px 14px", border: "1px solid #e5e7eb", color: "#374151" }}>{r.qty ?? ""}</td>
                  <td style={{ padding: "8px 14px", border: "1px solid #e5e7eb", color: "#374151" }}>{r.unit ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "timeline":
      return (
        <div>
          <h2 style={h2}>Project Timeline</h2>
          {data.estimatedDays && (
            <p style={{ fontSize: 13.5, color: "#6b7280", marginBottom: 10 }}>
              Estimated duration: <strong style={{ color: "#111827" }}>{data.estimatedDays} day{data.estimatedDays !== 1 ? "s" : ""}</strong>
            </p>
          )}
          <div dangerouslySetInnerHTML={{ __html: highlightVariablesHtml(data.html) }} style={prose} />
        </div>
      );

    case "image":
      return (
        <div style={{ textAlign: "center" }}>
          <img
            src={data.src}
            alt={data.alt ?? ""}
            style={{ maxWidth: "100%", height: "auto", borderRadius: 6, ...(data.width ? { width: data.width } : {}) }}
          />
          {data.caption && (
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>{data.caption}</p>
          )}
        </div>
      );

      case "divider":
      return (
        <hr
          style={{
            border: "none",
            borderTop: `1px ${data.style ?? "solid"} #e5e7eb`,
            margin: "4px 0",
          }}
        />
      );

    case "testimonial":
      return <div style={{ padding: 28, borderRadius: 18, background: "#111827", color: "#fff" }}><div style={{ fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>“{data.quote}”</div><div style={{ marginTop: 18, fontSize: 13, opacity: .8 }}>{data.author}{data.role ? ` · ${data.role}` : ""}</div></div>;

    case "before_after":
      return <div><h2 style={h2}>Before / After</h2><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{[["Before", data.beforeUrl], ["After", data.afterUrl]].map(([label, src]) => <div key={label} style={{ borderRadius: 14, overflow: "hidden", background: "#f3f4f6" }}><div style={{ aspectRatio: "4/3" }}>{src && <img src={src} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div><div style={{ padding: 10, fontWeight: 800, fontSize: 12 }}>{label}</div></div>)}</div>{data.caption && <p style={{ ...prose, marginTop: 10 }}>{data.caption}</p>}</div>;

    case "team":
      return <div><h2 style={h2}>{data.headline}</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>{data.members.map((m) => <div key={m.name} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}><div style={{ width: 46, height: 46, borderRadius: "50%", background: "#f3f4f6", overflow: "hidden", marginBottom: 10 }}>{m.photoUrl && <img src={m.photoUrl} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div><div style={{ fontWeight: 900 }}>{m.name}</div><div style={{ color: "#6b7280", fontSize: 12 }}>{m.role}</div>{m.bio && <p style={{ color: "#6b7280", fontSize: 12.5, lineHeight: 1.5 }}>{m.bio}</p>}</div>)}</div></div>;

    case "faq":
      return <div><h2 style={h2}>Questions & Answers</h2><div style={{ display: "grid", gap: 10 }}>{data.items.map((item) => <div key={item.question} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}><div style={{ fontWeight: 900 }}>{item.question}</div><div style={{ ...prose, marginTop: 6 }}>{item.answer}</div></div>)}</div></div>;

    case "financing":
      return <div style={{ padding: 26, borderRadius: 18, background: "#eff6ff", border: "1px solid #bfdbfe" }}><h2 style={{ ...h2, borderBottom: "none", paddingBottom: 0 }}>{data.headline}</h2><p style={prose}>{data.description}</p>{data.monthlyPayment && <div style={{ fontSize: 26, fontWeight: 900, color: "#1d4ed8" }}>{data.monthlyPayment}</div>}{data.terms && <p style={{ fontSize: 11.5, color: "#64748b" }}>{data.terms}</p>}</div>;

    case "gallery_grid":
      return <div><h2 style={h2}>Project Gallery</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{data.images.map((img) => <div key={img.src} style={{ borderRadius: 10, overflow: "hidden", background: "#f3f4f6", aspectRatio: "1" }}>{img.src && <img src={img.src} alt={img.alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>)}</div></div>;

    case "cta":
      return <div style={{ textAlign: "center", padding: 32, borderRadius: 18, background: "#111827", color: "#fff" }}><h2 style={{ fontSize: 26, margin: "0 0 8px" }}>{data.headline}</h2><p style={{ margin: "0 auto 18px", maxWidth: 520, opacity: .85 }}>{data.body}</p>{data.buttonLabel && <span style={{ display: "inline-block", background: "#d6a817", color: "#111", borderRadius: 999, padding: "10px 18px", fontWeight: 900 }}>{data.buttonLabel}</span>}</div>;

    default:
      return null;
  }
}

export const BlockPreview = memo(BlockPreviewInner);

const h2: React.CSSProperties = {
  fontSize: "1.15em",
  fontWeight: 700,
  color: "#111827",
  margin: "0 0 14px",
  paddingBottom: 10,
  borderBottom: "2px solid #f3f4f6",
  letterSpacing: "-.01em",
};

const prose: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.8,
  color: "#374151",
};

export function BlockRenderer({ blocks, quote }: Props) {
  const enabled = [...blocks]
    .filter((b) => b.enabled)
    .sort((a, b) => a.position - b.position);

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#111827" }}>
      <style>{`
        .proposal-var-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 1px 7px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: .86em;
          font-weight: 800;
          white-space: nowrap;
        }
        .proposal-var-chip.unknown { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
      `}</style>
      {enabled.map((block, i) => (
        <div
          key={block.id}
          style={{
            marginBottom: 40,
            paddingBottom: 40,
            borderBottom: i < enabled.length - 1 ? "1px solid #f3f4f6" : "none",
          }}
        >
          <BlockPreview data={block.data} quote={quote} />
        </div>
      ))}
    </div>
  );
}
