"use client";

import type { ProposalBlock, BlockData } from "@/types/proposal-blocks";
import type { Quote, AppSettings } from "@/lib/app-data";
import { CoverBlock } from "./blocks/CoverBlock";
import {
  RichTextEditorContent,
  RichTextToolbar,
  useRichTextEditor,
} from "./blocks/RichTextBlock";
import { PricingBlock } from "./blocks/PricingBlock";
import { TermsBlock } from "./blocks/TermsBlock";
import { DividerBlock } from "./blocks/DividerBlock";
import { MaterialsTableBlock } from "./blocks/MaterialsTableBlock";
import { TimelineBlock } from "./blocks/TimelineBlock";

interface Props {
  block: ProposalBlock;
  quote: Quote;
  settings: AppSettings | null;
  onChange: (updated: ProposalBlock) => void;
}

function PlaceholderEditor({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: 10,
        color: "#9ca3af",
        padding: 48,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 12.5, color: "#9ca3af", maxWidth: 300, lineHeight: 1.6 }}>
        Full editor coming in a future update. This section is included in your PDF using the imported template content.
      </div>
    </div>
  );
}

export function BlockCanvas({ block, quote, settings, onChange }: Props) {
  const { data } = block;

  const update = (newData: BlockData) =>
    onChange({ ...block, data: newData });

  const panelTitle = BLOCK_LABELS[block.type] ?? block.type;
  const isRichText = (
    data.type === "rich_text" ||
    data.type === "executive_summary" ||
    data.type === "scope" ||
    data.type === "conditions" ||
    data.type === "warranty" ||
    data.type === "acceptance" ||
    data.type === "terms"
  );
  const isEditableRichText = isRichText && data.type !== "terms";
  const isFullHeight = isRichText || data.type === "timeline";
  const richTextEditor = useRichTextEditor(
    isEditableRichText && "html" in data ? data.html : "",
    (html) => {
      if (isEditableRichText && "html" in data) {
        update({ ...data, html } as BlockData);
      }
    }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Section label bar */}
      {!isFullHeight && (
        <div
          style={{
            padding: "12px 32px",
            borderBottom: "1px solid #f3f4f6",
            flexShrink: 0,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              color: "#9ca3af",
            }}
          >
            Editing
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {panelTitle}
          </span>
        </div>
      )}

      {/* Editor area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "#f9fafb",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: isFullHeight ? 0 : "32px 24px 48px",
        }}
      >
        {isEditableRichText ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "14px 24px 12px",
              }}
            >
              <div
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 11,
                  boxShadow: "0 10px 30px rgba(15,23,42,.16)",
                  overflow: "hidden",
                }}
              >
                <RichTextToolbar editor={richTextEditor} />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                padding: "0 24px 48px",
              }}
            >
              <div
                style={{
                  width: "min(820px, 100%)",
                  minHeight: "297mm",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  boxShadow: "0 18px 50px rgba(15,23,42,.14)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <RichTextEditorContent editor={richTextEditor} />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: isFullHeight ? "100%" : 680,
              background: "#ffffff",
              borderRadius: isFullHeight ? 0 : 10,
              border: isFullHeight ? "none" : "1px solid #e5e7eb",
              boxShadow: isFullHeight ? "none" : "0 1px 4px rgba(0,0,0,.06)",
              overflow: "hidden",
              ...(isFullHeight ? { flex: 1, display: "flex", flexDirection: "column" } : {}),
            }}
          >
            <div
              style={{
                padding: isFullHeight ? 0 : "28px 32px",
                ...(isFullHeight ? { flex: 1, display: "flex", flexDirection: "column" } : {}),
              }}
            >
              {data.type === "cover" && (
                <CoverBlock
                  data={data}
                  settings={settings}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "pricing" && (
                <PricingBlock
                  data={data}
                  quote={quote}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "terms" && (
                <TermsBlock
                  data={data}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "divider" && (
                <DividerBlock
                  data={data}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "materials_table" && (
                <MaterialsTableBlock
                  data={data}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "timeline" && (
                <TimelineBlock
                  data={data}
                  onChange={(d) => update(d)}
                />
              )}

              {data.type === "image" && (
                <PlaceholderEditor label={panelTitle} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const BLOCK_LABELS: Record<string, string> = {
  cover: "Cover Page",
  executive_summary: "Executive Summary",
  conditions: "Existing Conditions",
  scope: "Scope of Work",
  materials_table: "Materials & Specifications",
  timeline: "Project Timeline",
  pricing: "Pricing Options",
  warranty: "Warranty",
  terms: "Terms & Conditions",
  acceptance: "Acceptance & Signature",
  rich_text: "Text Block",
  image: "Image",
  divider: "Divider",
  testimonial: "Testimonial",
  before_after: "Before / After",
  team: "Team",
  faq: "FAQ",
  financing: "Financing",
  gallery_grid: "Gallery Grid",
  cta: "CTA Section",
};
