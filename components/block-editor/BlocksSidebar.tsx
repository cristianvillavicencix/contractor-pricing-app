"use client";

import { useState } from "react";
import { GripVertical, Trash2, Plus, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProposalBlock, BlockType } from "@/types/proposal-blocks";
import { BLOCK_LABELS } from "./BlockCanvas";
import { getBlockPreviewText } from "@/lib/proposal-blocks";

interface Props {
  blocks: ProposalBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (type: BlockType) => void;
  onRemove: (id: string) => void;
}

interface SortableItemProps {
  block: ProposalBlock;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const ADDABLE_BLOCKS: Array<{ type: BlockType; label: string }> = [
  { type: "cover", label: "Cover Page" },
  { type: "executive_summary", label: "Executive Summary" },
  { type: "conditions", label: "Existing Conditions" },
  { type: "scope", label: "Scope of Work" },
  { type: "materials_table", label: "Materials & Specifications" },
  { type: "timeline", label: "Project Timeline" },
  { type: "pricing", label: "Pricing Options" },
  { type: "warranty", label: "Warranty" },
  { type: "terms", label: "Terms & Conditions" },
  { type: "acceptance", label: "Acceptance & Signature" },
  { type: "rich_text", label: "Text Block" },
  { type: "testimonial", label: "Testimonial" },
  { type: "before_after", label: "Before / After" },
  { type: "team", label: "Team" },
  { type: "faq", label: "FAQ" },
  { type: "financing", label: "Financing" },
  { type: "gallery_grid", label: "Gallery Grid" },
  { type: "cta", label: "CTA Section" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
];

function SortableItem({ block, index, isSelected, onSelect, onToggle, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const previewText = getBlockPreviewText(block);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : "auto",
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "0 6px 0 0",
          borderRadius: 8,
          marginBottom: 2,
          background: isSelected ? "#f0fdf4" : "transparent",
          border: isSelected ? "1px solid #bbf7d0" : "1px solid transparent",
          cursor: "pointer",
          transition: "all .1s",
          opacity: block.enabled ? 1 : 0.5,
          minHeight: 44,
        }}
        onClick={() => onSelect(block.id)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 24,
            alignSelf: "stretch",
            cursor: "grab",
            color: "#9ca3af",
            flexShrink: 0,
            borderRadius: "8px 0 0 8px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </div>

        {/* Number */}
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: isSelected ? "#16a34a" : "#9ca3af",
            width: 16,
            flexShrink: 0,
            textAlign: "right",
            marginRight: 7,
          }}
        >
          {index + 1}
        </span>

        {/* Label + preview text */}
        <div style={{ flex: 1, overflow: "hidden", padding: "7px 0" }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? "#15803d" : "#374151",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {BLOCK_LABELS[block.type] ?? block.type}
          </div>
          {previewText && (
            <div
              style={{
                fontSize: 10.5,
                color: "#9ca3af",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 1,
              }}
            >
              {previewText}
            </div>
          )}
        </div>

        {/* Trash */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(block.id);
          }}
          title="Remove section"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 5,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#d1d5db",
            flexShrink: 0,
            marginRight: 4,
            transition: "color .1s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#d1d5db"; }}
        >
          <Trash2 size={12} />
        </button>

        {/* Toggle switch */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(block.id); }}
          title={block.enabled ? "Hide section" : "Show section"}
          style={{
            width: 30,
            height: 17,
            borderRadius: 99,
            background: block.enabled ? "#16a34a" : "#d1d5db",
            position: "relative",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background .2s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 2,
              left: block.enabled ? 15 : 2,
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              transition: "left .2s",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function BlocksSidebar({ blocks, selectedId, onSelect, onToggle, onAdd, onRemove }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  const enabledCount = blocks.filter((b) => b.enabled).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Header */}
      <div
        style={{
          padding: "14px 14px 12px",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111827" }}>
          Proposal Sections
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {enabledCount} of {blocks.length} visible
        </div>
      </div>

      {/* Block list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {sorted.map((block, idx) => (
          <SortableItem
            key={block.id}
            block={block}
            index={idx}
            isSelected={block.id === selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
            onRemove={onRemove}
          />
        ))}
      </div>

      {/* Block picker */}
      {showPicker && (
        <div
          style={{
            borderTop: "1px solid #f3f4f6",
            background: "#ffffff",
            flexShrink: 0,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px 6px",
            }}
          >
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Add Section
            </span>
            <button
              onClick={() => setShowPicker(false)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 2 }}
            >
              <X size={13} />
            </button>
          </div>
          {ADDABLE_BLOCKS.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => {
                onAdd(type);
                setShowPicker(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "7px 12px",
                textAlign: "left",
                fontSize: 12.5,
                color: "#374151",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf4"; (e.currentTarget as HTMLButtonElement).style.color = "#15803d"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#374151"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Footer: add section button */}
      <div style={{ padding: "8px 6px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            padding: "7px",
            borderRadius: 8,
            border: `1px ${showPicker ? "solid #16a34a" : "dashed #d1d5db"}`,
            background: showPicker ? "#f0fdf4" : "transparent",
            fontSize: 12,
            color: showPicker ? "#15803d" : "#6b7280",
            cursor: "pointer",
            fontWeight: showPicker ? 600 : 400,
            transition: "all .12s",
          }}
        >
          <Plus size={12} />
          Add section
        </button>
      </div>
    </div>
  );
}
