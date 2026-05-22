"use client";

import { Settings2 } from "lucide-react";
import type { ProposalBlock } from "@/types/proposal-blocks";
import type { Quote } from "@/lib/app-data";
import { BlockPreview } from "./BlockRenderer";
import {
  RichTextEditorContent,
  RichTextToolbar,
  useRichTextEditor,
} from "./blocks/RichTextBlock";
import { BLOCK_LABELS } from "./BlockCanvas";

// Blocks that support inline Tiptap editing directly in the document
const TEXT_BLOCK_TYPES = new Set([
  "executive_summary",
  "scope",
  "conditions",
  "warranty",
  "terms",
  "acceptance",
  "rich_text",
]);

// A4 page proportions at 820px canvas width
// 820px × (297/210) ≈ 1160px
const PAGE_H = 1160;

// Simulated A4 print margins (matches BLOCKS_PRINT_CSS @page margins)
// 18mm top/bottom, 20mm sides — scaled to screen px
const MARGIN_V = 68; // ~18mm
const MARGIN_H = 76; // ~20mm

interface Props {
  block: ProposalBlock;
  quote: Quote;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updated: ProposalBlock) => void;
  onOpenSettings: () => void;
}

export function DocumentBlock({
  block,
  quote,
  isSelected,
  onSelect,
  onChange,
  onOpenSettings,
}: Props) {
  const isText = TEXT_BLOCK_TYPES.has(block.data.type);
  const needsSettings = !isText;

  const handleHtmlChange = (html: string) => {
    onChange({ ...block, data: { ...block.data, html } as typeof block.data });
  };
  const editor = useRichTextEditor(
    isText && "html" in block.data ? block.data.html : "",
    handleHtmlChange
  );

  return (
    <div
      style={{
        position: "relative",
        // Fixed A4 height — content clips exactly like a real PDF page
        height: PAGE_H,
        background: "transparent",
        borderRadius: 18,
        overflow: "visible",
        cursor: isSelected ? "default" : "pointer",
      }}
      onClick={!isSelected ? onSelect : undefined}
    >
      {isSelected && isText && (
        <div
          style={{
            position: "absolute",
            top: -48,
            left: 0,
            right: 0,
            zIndex: 30,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 11,
              boxShadow: "0 10px 30px rgba(15,23,42,.22)",
              overflow: "hidden",
              pointerEvents: "auto",
            }}
          >
            <RichTextToolbar editor={editor} />
          </div>
        </div>
      )}

      <div
        style={{
          height: "100%",
          overflow: "hidden",
          borderRadius: 18,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Section label — always visible at top-left */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: isSelected ? 18 : 14,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: isSelected ? "#16a34a" : "#d1d5db",
          transition: "color .15s",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {BLOCK_LABELS[block.type] ?? block.type}
      </div>

        {/* "Edit settings" button — top-right, only on selected settings blocks */}
      {isSelected && needsSettings && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}
          style={{
            position: "absolute",
            top: 10,
            right: 14,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 7,
            border: "1.5px solid #16a34a",
            background: "#f0fdf4",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
            color: "#15803d",
            letterSpacing: ".02em",
          }}
        >
          <Settings2 size={11} />
          Edit
        </button>
      )}

        {/* Page content */}
      {isSelected && isText ? (
        // Inline Tiptap editor — fills the page
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            marginTop: 36, // space for the section label
            opacity: block.enabled ? 1 : 0.5,
          }}
        >
          <RichTextEditorContent editor={editor} />
        </div>
      ) : (
        // Read-only preview — A4 margins
        <div
          style={{
            paddingTop: MARGIN_V,
            paddingBottom: MARGIN_V,
            paddingLeft: MARGIN_H,
            paddingRight: MARGIN_H,
            flex: 1,
            overflow: "hidden",
            opacity: block.enabled ? 1 : 0.5,
          }}
        >
          <BlockPreview data={block.data} quote={quote} />
        </div>
      )}

        {/* "Hidden" badge — bottom-left */}
      {!block.enabled && (
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 16,
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 99,
            padding: "2px 9px",
            fontSize: 10,
            fontWeight: 600,
            color: "#9ca3af",
            letterSpacing: ".04em",
          }}
        >
          HIDDEN · Won&apos;t appear in PDF
        </div>
      )}

        {/* Page number — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 16,
          fontSize: 9,
          color: isSelected ? "#bbf7d0" : "#e5e7eb",
          fontWeight: 500,
          letterSpacing: ".04em",
          pointerEvents: "none",
          userSelect: "none",
          transition: "color .15s",
        }}
      >
        {block.enabled ? "VISIBLE" : ""}
      </div>
      </div>
    </div>
  );
}
