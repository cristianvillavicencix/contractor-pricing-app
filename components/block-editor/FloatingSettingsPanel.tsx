"use client";

import { X } from "lucide-react";
import type { ProposalBlock } from "@/types/proposal-blocks";
import type { Quote, AppSettings } from "@/lib/app-data";
import { CoverBlock } from "./blocks/CoverBlock";
import { PricingBlock } from "./blocks/PricingBlock";
import { MaterialsTableBlock } from "./blocks/MaterialsTableBlock";
import { DividerBlock } from "./blocks/DividerBlock";
import { TimelineBlock } from "./blocks/TimelineBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import {
  BeforeAfterSettings,
  CTASettings,
  FAQSettings,
  FinancingSettings,
  GallerySettings,
  TeamSettings,
  TestimonialSettings,
} from "./blocks/ProfessionalBlocks";
import { BLOCK_LABELS } from "./BlockCanvas";

interface Props {
  block: ProposalBlock;
  quote: Quote;
  settings: AppSettings | null;
  onChange: (updated: ProposalBlock) => void;
  onClose: () => void;
}

export function FloatingSettingsPanel({ block, quote, settings, onChange, onClose }: Props) {
  const d = block.data;
  const update = (newData: typeof d) => onChange({ ...block, data: newData });

  return (
    <div
      style={{
        position: "fixed",
        right: 20,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 300,
        width: 340,
        maxHeight: "82vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,.22), 0 4px 16px rgba(0,0,0,.1)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            {BLOCK_LABELS[block.type] ?? block.type}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>Section settings</div>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Settings content — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {d.type === "cover" && (
          <CoverBlock
            data={d}
            settings={settings}
            onChange={(newData) => update(newData)}
          />
        )}

        {d.type === "pricing" && (
          <PricingBlock
            data={d}
            quote={quote}
            onChange={(newData) => update(newData)}
          />
        )}

        {d.type === "materials_table" && (
          <MaterialsTableBlock
            data={d}
            onChange={(newData) => update(newData)}
          />
        )}

        {d.type === "divider" && (
          <DividerBlock
            data={d}
            onChange={(newData) => update(newData)}
          />
        )}

        {d.type === "timeline" && (
          <TimelineBlock
            data={d}
            onChange={(newData) => update(newData)}
          />
        )}

        {d.type === "image" && (
          <ImageBlock data={d} onChange={(newData) => update(newData)} />
        )}

        {d.type === "testimonial" && <TestimonialSettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "before_after" && <BeforeAfterSettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "team" && <TeamSettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "faq" && <FAQSettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "financing" && <FinancingSettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "gallery_grid" && <GallerySettings data={d} onChange={(newData) => update(newData)} />}
        {d.type === "cta" && <CTASettings data={d} onChange={(newData) => update(newData)} />}
      </div>
    </div>
  );
}
