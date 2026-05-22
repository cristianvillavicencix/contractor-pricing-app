/**
 * Proposal block utilities.
 *
 * This module is the single place that knows how to create, migrate, and
 * render ProposalBlocks.  It is intentionally free of React — pure
 * TypeScript logic that any route handler, server component, or client hook
 * can import without bundling the editor.
 *
 * Abstraction layer note
 * ─────────────────────
 * All read/write paths go through the `ProposalBlocksAdapter` interface.
 * Today `JsonBlobAdapter` stores blocks inside `quote.proposalBlocks` (the
 * `quotes.data` JSON blob).  When `proposal_blocks` table exists, swap to a
 * `SupabaseTableAdapter` that implements the same interface — no callers
 * change.
 */

import type { Quote } from "./app-data";
import type { AppSettings } from "./app-data";
import type { ProposalTemplate } from "./proposal-templates";
import type {
  ProposalBlock,
  BlockType,
  BlockData,
  CoverBlockData,
  ExecutiveSummaryBlockData,
  ScopeBlockData,
  MaterialsTableBlockData,
  TimelineBlockData,
  PricingBlockData,
  WarrantyBlockData,
  ConditionsBlockData,
  TermsBlockData,
  AcceptanceBlockData,
} from "../types/proposal-blocks";
import { resolveProposalSettings } from "./proposal-themes";

// ---------------------------------------------------------------------------
// Tiny UUID helper (no dependency on crypto module in browser builds)
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Adapter interface — swap implementation when DB table exists
// ---------------------------------------------------------------------------

/**
 * Abstraction over where blocks are physically stored.
 *
 * Current implementation: `JsonBlobAdapter` (reads/writes `quote.proposalBlocks`).
 * Future implementation: `SupabaseTableAdapter` (reads/writes `proposal_blocks` table).
 */
export interface ProposalBlocksAdapter {
  readBlocks(quote: Quote): ProposalBlock[];
  writeBlocks(quote: Quote, blocks: ProposalBlock[]): Quote;
}

/** Stores blocks inside the existing `quotes.data` JSON blob. */
export class JsonBlobAdapter implements ProposalBlocksAdapter {
  readBlocks(quote: Quote): ProposalBlock[] {
    return (quote as QuoteWithBlocks).proposalBlocks ?? [];
  }

  writeBlocks(quote: Quote, blocks: ProposalBlock[]): Quote {
    return { ...(quote as QuoteWithBlocks), proposalBlocks: blocks } as Quote;
  }
}

/** Singleton adapter — replace with SupabaseTableAdapter once table exists. */
export const defaultAdapter: ProposalBlocksAdapter = new JsonBlobAdapter();

// Internal type extension (avoids widening the exported Quote type prematurely)
type QuoteWithBlocks = Quote & {
  builderVersion?: "tiptap" | "blocks";
  proposalBlocks?: ProposalBlock[];
};

export type ProposalMergeVariables = Record<
  | "client_name"
  | "client_address"
  | "proposal_date"
  | "proposal_number"
  | "company_name"
  | "company_phone"
  | "sales_rep"
  | "good_price"
  | "better_price"
  | "best_price",
  string
>;

function money(n: number | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n ?? NaN) ? n! : 0);
}

export function getProposalMergeVariables(
  quote: Quote,
  settings?: AppSettings | null
): ProposalMergeVariables {
  const company = settings?.companyProfile;
  const address = quote.customerAddress || quote.jobAddress || [
    quote.jobCity,
    quote.jobState,
    quote.jobZipCode,
  ].filter(Boolean).join(", ");

  return {
    client_name: quote.customerName || "Client",
    client_address: address || "Project address",
    proposal_date: quote.createdAt ? quote.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    proposal_number: quote.proposalNumber || quote.id,
    company_name: company?.businessName || "Your Company",
    company_phone: company?.phone || "",
    sales_rep: company?.contactName || "",
    good_price: money(quote.good?.salePrice),
    better_price: money(quote.better?.salePrice),
    best_price: money(quote.best?.salePrice),
  };
}

export function applyMergeVariablesToHtml(
  html: string,
  quote: Quote,
  settings?: AppSettings | null,
  options: { preserveUnknown?: boolean } = {}
): string {
  const vars = getProposalMergeVariables(quote, settings);
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key)
      ? vars[key as keyof ProposalMergeVariables]
      : options.preserveUnknown ? match : ""
  );
}

export function applyMergeVariablesToBlocks(
  blocks: ProposalBlock[],
  quote: Quote,
  settings?: AppSettings | null
): ProposalBlock[] {
  const replaceValue = (value: unknown): unknown => {
    if (typeof value === "string") return applyMergeVariablesToHtml(value, quote, settings);
    if (Array.isArray(value)) return value.map(replaceValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, replaceValue(v)])
      );
    }
    return value;
  };

  return replaceValue(blocks) as ProposalBlock[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBlock<T extends { type: BlockType }>(
  position: number,
  data: T,
  enabled = true
): ProposalBlock {
  return { id: uid(), position, type: data.type, enabled, data } as ProposalBlock;
}

// ---------------------------------------------------------------------------
// createDefaultProposalBlocks
// ---------------------------------------------------------------------------

/**
 * Builds a fresh ordered block list from a template + company settings.
 * Used when creating a new quote with `builderVersion === "blocks"`.
 */
export function createDefaultProposalBlocks(
  template: ProposalTemplate | null | undefined,
  settings: AppSettings | null | undefined
): ProposalBlock[] {
  const t = template;
  const s = settings;

  if (t?.builderVersion === "blocks" && t.proposalBlocks?.length) {
    return normalizeProposalBlocks(t.proposalBlocks);
  }

  const companyName = s?.companyProfile?.businessName ?? "Your Company";
  const trade = t?.trade ?? s?.companyProfile?.mainTrade ?? "Roofing";

  const coverData: CoverBlockData & { type: "cover" } = {
    type: "cover",
    layout: "centrado",
    companyName,
    tagline: t?.cover?.tagline ?? `Professional ${trade} Services`,
    logoUrl: s?.branding?.logoUrl ?? undefined,
  };

  const execData: ExecutiveSummaryBlockData & { type: "executive_summary" } = {
    type: "executive_summary",
    html: [
      t?.executiveSummary?.problemText,
      t?.executiveSummary?.solutionText,
      t?.executiveSummary?.valueText,
    ]
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join("") || "<p>We bring professional expertise to every project.</p>",
  };

  const conditionsData: ConditionsBlockData & { type: "conditions" } = {
    type: "conditions",
    html: t?.existingConditions?.checklistItems?.length
      ? `<ul>${t.existingConditions.checklistItems.map((i) => `<li>${i}</li>`).join("")}</ul>`
      : "<p>Property inspection completed prior to project start.</p>",
  };

  const scopeData: ScopeBlockData & { type: "scope" } = {
    type: "scope",
    html: t?.scopeOfWork?.items?.length
      ? `<ul>${t.scopeOfWork.items.map((i) => `<li>${i}</li>`).join("")}</ul>`
      : "<p>Full scope to be detailed based on inspection.</p>",
    items: t?.scopeOfWork?.items,
  };

  const materialsData: MaterialsTableBlockData & { type: "materials_table" } = {
    type: "materials_table",
    tier: "Better",
    rows:
      t?.materialsSpecs?.items?.map((m) => ({
        description: m.product,
        brand: m.brand,
        qty: "",
        unit: "",
      })) ?? [],
  };

  const timelineData: TimelineBlockData & { type: "timeline" } = {
    type: "timeline",
    html: t?.timeline?.phases?.length
      ? `<ol>${t.timeline.phases.map((p) => `<li><strong>${p.name}</strong> — ${p.description}</li>`).join("")}</ol>`
      : "<p>Timeline to be confirmed after project kickoff.</p>",
    estimatedDays: t?.timeline?.estimatedDays ?? 3,
  };

  const pricingData: PricingBlockData & { type: "pricing" } = {
    type: "pricing",
    showGood: true,
    showBetter: true,
    showBest: true,
    selectedTier: "Better",
  };

  const warrantyData: WarrantyBlockData & { type: "warranty" } = {
    type: "warranty",
    html: t?.warranty
      ? `<p>${t.warranty.workmanshipText}</p><p>${t.warranty.manufacturerText}</p>`
      : "<p>Workmanship warranty included. Manufacturer warranty per product specifications.</p>",
  };

  const termsData: TermsBlockData & { type: "terms" } = {
    type: "terms",
    html: t?.terms?.text
      ? `<p>${t.terms.text}</p>`
      : "<p>Standard terms and conditions apply.</p>",
  };

  const acceptanceData: AcceptanceBlockData & { type: "acceptance" } = {
    type: "acceptance",
    html: t?.acceptance?.paymentScheduleText
      ? `<p>${t.acceptance.paymentScheduleText}</p>`
      : "<p>A deposit is required to schedule your project.</p>",
    requireSignature: true,
  };

  const blocks: Array<Parameters<typeof makeBlock>[1]> = [
    coverData,
    execData,
    conditionsData,
    scopeData,
    materialsData,
    timelineData,
    pricingData,
    warrantyData,
    termsData,
    acceptanceData,
  ];

  return blocks.map((data, i) => makeBlock(i, data));
}

// ---------------------------------------------------------------------------
// quoteToProposalBlocks
// ---------------------------------------------------------------------------

/**
 * Converts an existing tiptap-style quote into a block list.
 * Used when upgrading a quote from builderVersion "tiptap" → "blocks".
 *
 * The tiptap HTML lives in `quote.proposalDocument`.  We can't safely parse
 * arbitrary HTML back into typed blocks, so we put the whole document into a
 * single rich_text block and add a structural cover block at the top.
 */
export function quoteToProposalBlocks(
  quote: Quote,
  settings: AppSettings | null | undefined
): ProposalBlock[] {
  const q = quote as QuoteWithBlocks;

  // If already has blocks, return them (idempotent)
  if (q.proposalBlocks && q.proposalBlocks.length > 0) {
    return normalizeProposalBlocks(q.proposalBlocks);
  }

  const companyName = settings?.companyProfile?.businessName ?? "Your Company";

  const coverData: CoverBlockData & { type: "cover" } = {
    type: "cover",
    layout: "centrado",
    companyName,
    clientName: quote.customerName,
    projectAddress: quote.jobAddress ?? undefined,
    proposalNumber: quote.proposalNumber ?? undefined,
    date: quote.createdAt ? quote.createdAt.slice(0, 10) : undefined,
  };

  if (quote.proposalDocument) {
    return [
      makeBlock(0, coverData),
      makeBlock(1, { type: "rich_text" as const, html: quote.proposalDocument }),
      makeBlock(2, { type: "acceptance" as const, html: "<p>Please sign below to accept this proposal.</p>", requireSignature: true }),
    ];
  }

  // No existing document — fall back to defaults
  return createDefaultProposalBlocks(null, settings);
}

// ---------------------------------------------------------------------------
// normalizeProposalBlocks
// ---------------------------------------------------------------------------

/**
 * Ensures blocks have sequential positions and valid ids.
 * Safe to call after any mutation (add, remove, reorder).
 */
export function normalizeProposalBlocks(blocks: ProposalBlock[]): ProposalBlock[] {
  return blocks
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((block, i) => ({
      ...block,
      id: block.id || uid(),
      position: i,
    }));
}

// ---------------------------------------------------------------------------
// blocksToHtml
// ---------------------------------------------------------------------------

/**
 * Renders a block list to an HTML string suitable for PDF generation.
 * Keeps parity with the existing `proposalDocument` HTML shape so
 * `api/proposals/pdf-tiptap` can render it without changes.
 */
export function blocksToHtml(
  blocks: ProposalBlock[],
  quote: Quote,
  settings: AppSettings | null | undefined
): string {
  const companyName = settings?.companyProfile?.businessName ?? "Your Company";
  const currency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const parts: string[] = [];

  for (const block of blocks.filter((b) => b.enabled).sort((a, b) => a.position - b.position)) {
    const d = block.data;

    switch (d.type) {
      case "cover": {
        parts.push(`
          <div style="text-align:center;padding:80px 0 60px;page-break-after:always">
            <h1 style="font-size:2.4em;margin:0 0 8px">${d.companyName ?? companyName}</h1>
            ${d.tagline ? `<p style="font-size:1.1em;color:#666;margin:0 0 32px">${d.tagline}</p>` : ""}
            <hr style="border:none;border-top:2px solid #c9a227;width:60px;margin:0 auto 32px"/>
            ${d.clientName ? `<p style="margin:4px 0">Prepared for: <strong>${d.clientName}</strong></p>` : ""}
            ${d.projectAddress ? `<p style="margin:4px 0;color:#555">${d.projectAddress}</p>` : ""}
            ${d.proposalNumber ? `<p style="margin:4px 0;color:#888;font-size:.9em">Proposal #${d.proposalNumber}</p>` : ""}
            ${d.date ? `<p style="margin:4px 0;color:#888;font-size:.9em">${d.date}</p>` : ""}
          </div>`);
        break;
      }

      case "executive_summary":
        parts.push(`<div class="section"><h2>Executive Summary</h2>${d.html}</div>`);
        break;

      case "conditions":
        parts.push(`<div class="section"><h2>Existing Conditions</h2>${d.html}</div>`);
        break;

      case "scope":
        parts.push(`<div class="section"><h2>Scope of Work</h2>${d.html}</div>`);
        break;

      case "materials_table": {
        const rows = d.rows.map(
          (r) => `<tr><td>${r.description}</td><td>${r.brand ?? ""}</td><td>${r.qty ?? ""}</td><td>${r.unit ?? ""}</td></tr>`
        );
        parts.push(`
          <div class="section">
            <h2>Materials &amp; Specifications</h2>
            <table style="width:100%;border-collapse:collapse;font-size:.92em">
              <thead><tr style="background:#f5f3ef">
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Product</th>
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Brand</th>
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Qty</th>
                <th style="text-align:left;padding:8px;border:1px solid #ddd">Unit</th>
              </tr></thead>
              <tbody>${rows.join("")}</tbody>
            </table>
          </div>`);
        break;
      }

      case "timeline":
        parts.push(`
          <div class="section">
            <h2>Project Timeline</h2>
            ${d.estimatedDays ? `<p><strong>Estimated duration:</strong> ${d.estimatedDays} day${d.estimatedDays !== 1 ? "s" : ""}</p>` : ""}
            ${d.html}
          </div>`);
        break;

      case "pricing": {
        const tiers = (["Good", "Better", "Best"] as const).filter(
          (t) => (d as PricingBlockData)[`show${t}` as keyof PricingBlockData]
        );
        const tierRows = tiers
          .map((t) => {
            const total = quote[t.toLowerCase() as "good" | "better" | "best"]?.salePrice ?? 0;
            const selected = t === (d as PricingBlockData).selectedTier;
            return `<tr${selected ? ' style="background:#fffbea;font-weight:700"' : ""}>
              <td style="padding:12px 16px;border:1px solid #ddd">${t}</td>
              <td style="padding:12px 16px;border:1px solid #ddd;text-align:right">${currency(total)}</td>
            </tr>`;
          })
          .join("");
        parts.push(`
          <div class="section">
            <h2>Investment Options</h2>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f5f3ef">
                <th style="text-align:left;padding:12px 16px;border:1px solid #ddd">Package</th>
                <th style="text-align:right;padding:12px 16px;border:1px solid #ddd">Total</th>
              </tr></thead>
              <tbody>${tierRows}</tbody>
            </table>
          </div>`);
        break;
      }

      case "warranty":
        parts.push(`<div class="section"><h2>Warranty</h2>${d.html}</div>`);
        break;

      case "terms":
        parts.push(`<div class="section"><h2>Terms &amp; Conditions</h2>${d.html}</div>`);
        break;

      case "acceptance":
        parts.push(`
          <div class="section" style="page-break-before:always">
            <h2>Acceptance</h2>
            ${d.html}
            ${d.requireSignature ? `
              <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
                <div><div style="border-bottom:1px solid #333;height:40px;margin-bottom:6px"></div><p style="font-size:.85em;color:#666">Client Signature / Date</p></div>
                <div><div style="border-bottom:1px solid #333;height:40px;margin-bottom:6px"></div><p style="font-size:.85em;color:#666">Contractor Signature / Date</p></div>
              </div>` : ""}
          </div>`);
        break;

      case "rich_text":
        parts.push(`<div class="section">${d.html}</div>`);
        break;

      case "image":
        parts.push(`
          <div class="section" style="text-align:center">
            <img src="${d.src}" alt="${d.alt ?? ""}" style="max-width:100%;height:auto${d.width ? `;width:${d.width}` : ""}" />
            ${d.caption ? `<p style="font-size:.85em;color:#666;margin-top:6px">${d.caption}</p>` : ""}
          </div>`);
        break;

      case "divider":
        parts.push(`<hr style="border:none;border-top:1px ${d.style ?? "solid"} #ccc;margin:32px 0" />`);
        break;
    }
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: Georgia, serif; font-size: 14px; line-height: 1.7; color: #1a1a1a; margin: 0; padding: 0; }
  .section { margin: 0 0 32px; padding: 0 0 32px; border-bottom: 1px solid #eee; }
  h1 { font-size: 1.8em; }
  h2 { font-size: 1.3em; color: #333; margin-bottom: 12px; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
${parts.join("\n")}
</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// buildBlocksPrintHtml — high-quality print/PDF output
// ---------------------------------------------------------------------------

/**
 * Shared CSS used by both the print preview page and the PDF route.
 * Exported so the print page can inject it via a <style> tag.
 */
export const BLOCKS_PRINT_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  @page {
    size: A4;
    margin: 18mm 20mm 20mm;
  }

  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1a1a1a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Cover ── */
  .blk-cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 240mm;
    text-align: center;
    padding: 60px 40px;
    page-break-after: always;
    break-after: page;
  }
  .blk-cover-logo {
    max-width: 140px;
    max-height: 70px;
    object-fit: contain;
    margin-bottom: 28px;
  }
  .blk-cover h1 {
    font-size: 28pt;
    font-weight: 800;
    color: #1a1a1a;
    margin: 0 0 8px;
    letter-spacing: -.01em;
    line-height: 1.1;
  }
  .blk-cover .tagline {
    font-size: 12pt;
    color: #6b6760;
    margin: 0 0 28px;
  }
  .blk-cover-rule {
    width: 52px;
    height: 3px;
    background: #c9a227;
    margin: 0 auto 28px;
    border: none;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .blk-cover .client-name {
    font-size: 12pt;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 4px;
  }
  .blk-cover .client-addr {
    font-size: 10.5pt;
    color: #6b6760;
    margin: 0 0 20px;
  }
  .blk-cover .meta-row {
    font-size: 9.5pt;
    color: #8a867e;
    margin: 2px 0;
  }

  /* ── Sections ── */
  .blk-section {
    margin-bottom: 28px;
    padding-bottom: 28px;
    border-bottom: 1px solid #eee;
    page-break-inside: avoid;
  }
  /* Each section starts on its own page (cover already forces break-after) */
  .blk-section + .blk-section {
    break-before: page;
    page-break-before: always;
    margin-top: 0;
    border-top: none;
  }
  .blk-section:last-child { border-bottom: none; }

  .blk-section h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e8e4d9;
    page-break-after: avoid;
    break-after: avoid;
    position: relative;
  }
  .blk-section h2::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -2px;
    width: 36px;
    height: 2px;
    background: #c9a227;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .blk-section h3 {
    font-size: 11pt;
    font-weight: 600;
    color: #333;
    margin: 16px 0 6px;
    page-break-after: avoid;
    break-after: avoid;
  }

  .blk-section p { margin: 0 0 9px; }
  .blk-section p:last-child { margin-bottom: 0; }
  .blk-section ul, .blk-section ol {
    padding-left: 1.4em;
    margin: 0 0 10px;
  }
  .blk-section li { margin-bottom: 3px; }

  .blk-section hr {
    border: none;
    border-top: 1px solid #e8e4d9;
    margin: 16px 0;
  }

  /* ── Tables ── */
  .blk-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin: 4px 0 0;
    page-break-inside: avoid;
  }
  .blk-table th {
    background: #213343 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: #fff !important;
    font-weight: 600;
    padding: 9px 12px;
    text-align: left;
    border: 1px solid #1a2a36;
  }
  .blk-table td {
    padding: 9px 12px;
    border: 1px solid #e8e4d9;
    vertical-align: top;
  }
  .blk-table tr:nth-child(even) td {
    background: #f9f8f5 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Pricing table ── */
  .blk-pricing-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11pt;
    margin: 4px 0 0;
    page-break-inside: avoid;
  }
  .blk-pricing-table th {
    background: #213343 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: #fff !important;
    font-weight: 600;
    padding: 10px 16px;
    border: 1px solid #1a2a36;
  }
  .blk-pricing-table th:last-child { text-align: right; }
  .blk-pricing-table td {
    padding: 11px 16px;
    border: 1px solid #e8e4d9;
  }
  .blk-pricing-table td:last-child { text-align: right; font-weight: 600; }
  .blk-pricing-row-selected td {
    background: #fffbea !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-weight: 700;
  }
  .blk-pricing-badge {
    display: inline-block;
    margin-left: 8px;
    font-size: 8pt;
    background: #c9a227 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: #fff !important;
    border-radius: 3px;
    padding: 1px 6px;
    font-weight: 700;
    letter-spacing: .04em;
    vertical-align: middle;
  }

  /* ── Images ── */
  .blk-image-wrap { text-align: center; margin: 8px 0; }
  .blk-image-wrap img {
    max-width: 100%;
    height: auto;
    border-radius: 3px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .blk-image-caption {
    font-size: 9pt;
    color: #8a867e;
    margin-top: 5px;
  }

  /* ── Acceptance / Signature ── */
  .blk-acceptance {
    page-break-before: always;
    break-before: page;
  }
  .blk-sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 44px;
  }
  .blk-sig-line {
    border-bottom: 1px solid #333;
    height: 48px;
    margin-bottom: 6px;
  }
  .blk-sig-label {
    font-size: 9pt;
    color: #6b6760;
  }

  /* ── Dividers ── */
  .blk-hr { border: none; margin: 24px 0; }
  .blk-hr-solid   { border-top: 1px solid #ccc; }
  .blk-hr-dashed  { border-top: 1px dashed #bbb; }
  .blk-hr-dotted  { border-top: 1px dotted #bbb; }

  /* ── Rich text from Tiptap HTML ── */
  .blk-rt strong { font-weight: 700; }
  .blk-rt em { font-style: italic; }
  .blk-rt u { text-decoration: underline; }
  .blk-rt blockquote {
    margin: 10px 0;
    padding: 8px 16px;
    border-left: 3px solid #c9a227;
    color: #555;
    font-style: italic;
  }
  .blk-rt code {
    font-family: monospace;
    background: #f5f3ef;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: .9em;
  }

  /* ── Page ── */
  .blk-page { max-width: 760px; margin: 0 auto; padding: 0 0 40px; }
`;

/**
 * Generates high-quality HTML for print/PDF output.
 * Used by both the PDF route handler and the print preview page.
 * Keeps `blocksToHtml` unchanged for backward compatibility.
 */
export function buildBlocksPrintHtml(
  blocks: ProposalBlock[],
  quote: Quote,
  settings?: AppSettings | null
): string {
  const currency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const resolvedBlocks = applyMergeVariablesToBlocks(blocks, quote, settings);
  const docSettings = resolveProposalSettings(quote.proposalDocumentSettings);
  const margin = docSettings.pageMargins === "compact" ? "14mm 16mm 16mm" : docSettings.pageMargins === "wide" ? "24mm 26mm 26mm" : "18mm 20mm 20mm";
  const enabled = [...resolvedBlocks]
    .filter((b) => b.enabled)
    .sort((a, b) => a.position - b.position);

  const parts: string[] = [];

  for (const block of enabled) {
    const d = block.data;

    switch (d.type) {
      case "cover":
        parts.push(`
<div class="blk-cover"${d.backgroundImageUrl || d.photoUrl ? ` style="background-image:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.16)),url('${esc(d.backgroundImageUrl || d.photoUrl || "")}');background-size:cover;background-position:center;color:#fff;margin:${docSettings.pageMargins === "wide" ? "-24mm -26mm" : "-18mm -20mm"};padding:34mm 26mm;min-height:260mm"` : ""}>
  ${d.logoUrl ? `<img class="blk-cover-logo" src="${esc(d.logoUrl)}" alt="Logo" />` : ""}
  <h1>${esc(d.companyName ?? "Your Company")}</h1>
  ${d.tagline ? `<p class="tagline">${esc(d.tagline)}</p>` : ""}
  <hr class="blk-cover-rule" />
  ${d.clientName ? `<p class="client-name">Prepared for: ${esc(d.clientName)}</p>` : ""}
  ${d.projectAddress ? `<p class="client-addr">${esc(d.projectAddress)}</p>` : ""}
  ${d.proposalNumber ? `<p class="meta-row">Proposal #${esc(d.proposalNumber)}</p>` : ""}
  ${d.date ? `<p class="meta-row">${esc(d.date)}</p>` : ""}
</div>`);
        break;

      case "executive_summary":
        parts.push(`
<div class="blk-section">
  <h2>Executive Summary</h2>
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "conditions":
        parts.push(`
<div class="blk-section">
  <h2>Existing Conditions</h2>
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "scope":
        parts.push(`
<div class="blk-section">
  <h2>Scope of Work</h2>
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "materials_table": {
        const rows = d.rows
          .map(
            (r) => `<tr>
  <td>${esc(r.description)}</td>
  <td>${esc(r.brand ?? "")}</td>
  <td>${esc(r.qty ?? "")}</td>
  <td>${esc(r.unit ?? "")}</td>
</tr>`
          )
          .join("\n");
        parts.push(`
<div class="blk-section">
  <h2>Materials &amp; Specifications</h2>
  <table class="blk-table">
    <thead><tr>
      <th style="width:40%">Product</th>
      <th style="width:25%">Brand</th>
      <th style="width:17.5%">Qty</th>
      <th style="width:17.5%">Unit</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`);
        break;
      }

      case "timeline":
        parts.push(`
<div class="blk-section">
  <h2>Project Timeline</h2>
  ${d.estimatedDays ? `<p><strong>Estimated duration:</strong> ${d.estimatedDays} day${d.estimatedDays !== 1 ? "s" : ""}</p>` : ""}
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "pricing": {
        const tiers = (["Good", "Better", "Best"] as const).filter(
          (t) => (d as PricingBlockData)[`show${t}` as keyof PricingBlockData]
        );
        const tierRows = tiers
          .map((t) => {
            const total = quote[t.toLowerCase() as "good" | "better" | "best"]?.salePrice ?? 0;
            const sel = t === (d as PricingBlockData).selectedTier;
            return `<tr${sel ? ' class="blk-pricing-row-selected"' : ""}>
  <td>${t}${sel ? `<span class="blk-pricing-badge">Selected</span>` : ""}</td>
  <td>${total > 0 ? currency(total) : "—"}</td>
</tr>`;
          })
          .join("\n");
        parts.push(`
<div class="blk-section">
  <h2>Investment Options</h2>
  <table class="blk-pricing-table">
    <thead><tr><th>Package</th><th>Total</th></tr></thead>
    <tbody>${tierRows}</tbody>
  </table>
</div>`);
        break;
      }

      case "warranty":
        parts.push(`
<div class="blk-section">
  <h2>Warranty</h2>
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "terms":
        parts.push(`
<div class="blk-section">
  <h2>Terms &amp; Conditions</h2>
  <div class="blk-rt" style="font-size:9.5pt;line-height:1.55">${d.html}</div>
</div>`);
        break;

      case "acceptance":
        parts.push(`
<div class="blk-section blk-acceptance">
  <h2>Acceptance</h2>
  <div class="blk-rt">${d.html}</div>
  ${
    d.requireSignature
      ? `<div class="blk-sig-grid">
    <div><div class="blk-sig-line"></div><div class="blk-sig-label">Client Signature &amp; Date</div></div>
    <div><div class="blk-sig-line"></div><div class="blk-sig-label">Contractor Signature &amp; Date</div></div>
  </div>`
      : ""
  }
</div>`);
        break;

      case "rich_text":
        parts.push(`
<div class="blk-section">
  <div class="blk-rt">${d.html}</div>
</div>`);
        break;

      case "image":
        parts.push(`
<div class="blk-section">
  <div class="blk-image-wrap">
    <img src="${esc(d.src)}" alt="${esc(d.alt ?? "")}"${d.width ? ` style="width:${esc(d.width)}"` : ""} />
    ${d.caption ? `<div class="blk-image-caption">${esc(d.caption)}</div>` : ""}
  </div>
</div>`);
        break;

      case "testimonial":
        parts.push(`<div class="blk-section blk-card-dark"><p class="blk-quote">“${esc(d.quote)}”</p><p>${esc(d.author)}${d.role ? ` · ${esc(d.role)}` : ""}</p></div>`);
        break;

      case "before_after":
        parts.push(`<div class="blk-section"><h2>Before / After</h2><div class="blk-two">${d.beforeUrl ? `<img src="${esc(d.beforeUrl)}" alt="Before"/>` : ""}${d.afterUrl ? `<img src="${esc(d.afterUrl)}" alt="After"/>` : ""}</div>${d.caption ? `<p>${esc(d.caption)}</p>` : ""}</div>`);
        break;

      case "team":
        parts.push(`<div class="blk-section"><h2>${esc(d.headline)}</h2><div class="blk-grid">${d.members.map((m) => `<div><strong>${esc(m.name)}</strong><br/><span>${esc(m.role)}</span>${m.bio ? `<p>${esc(m.bio)}</p>` : ""}</div>`).join("")}</div></div>`);
        break;

      case "faq":
        parts.push(`<div class="blk-section"><h2>Questions &amp; Answers</h2>${d.items.map((item) => `<h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p>`).join("")}</div>`);
        break;

      case "financing":
        parts.push(`<div class="blk-section blk-callout"><h2>${esc(d.headline)}</h2><p>${esc(d.description)}</p>${d.monthlyPayment ? `<strong>${esc(d.monthlyPayment)}</strong>` : ""}${d.terms ? `<p class="small">${esc(d.terms)}</p>` : ""}</div>`);
        break;

      case "gallery_grid":
        parts.push(`<div class="blk-section"><h2>Project Gallery</h2><div class="blk-gallery">${d.images.map((img) => `<img src="${esc(img.src)}" alt="${esc(img.alt ?? "")}"/>`).join("")}</div></div>`);
        break;

      case "cta":
        parts.push(`<div class="blk-section blk-card-dark"><h2>${esc(d.headline)}</h2><p>${esc(d.body)}</p>${d.buttonLabel ? `<strong>${esc(d.buttonLabel)}</strong>` : ""}</div>`);
        break;

      case "divider":
        parts.push(`<hr class="blk-hr blk-hr-${d.style ?? "solid"}" />`);
        break;
    }
  }

  const title = esc(
    `${quote.proposalNumber ?? "Proposal"} – ${quote.customerName ?? ""}`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${BLOCKS_PRINT_CSS}
@page { size: ${docSettings.pdfPageSize}; margin: ${margin}; }
:root { --blk-primary: ${docSettings.primaryColor}; --blk-font: ${docSettings.fontFamily}; }
body { font-family: var(--blk-font); }
.blk-section h2::after, .blk-cover-rule { background: var(--blk-primary) !important; }
.blk-card-dark { background:#111827;color:#fff;border-radius:14px;padding:28px;border:none; }
.blk-card-dark h2 { color:#fff;border:none; }
.blk-quote { font-size:20pt;line-height:1.3;font-weight:700; }
.blk-two { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
.blk-two img,.blk-gallery img { width:100%;height:auto;border-radius:8px; }
.blk-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px; }
.blk-callout { background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:22px; }
.blk-gallery { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
.proposal-var-chip { color: var(--blk-primary); font-weight:700; }
</style>
</head>
<body>
<div class="blk-page">
${parts.join("\n")}
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// getQuoteBuilderVersion
// ---------------------------------------------------------------------------

/**
 * Returns the builder version for a quote.
 *
 * Existing quotes without the field default to "tiptap" so no data migration
 * is required.  New quotes created by the block editor will have "blocks".
 */
export function getQuoteBuilderVersion(quote: Quote): "tiptap" | "blocks" {
  return (quote as QuoteWithBlocks).builderVersion ?? "tiptap";
}

// ---------------------------------------------------------------------------
// Block list mutations
// ---------------------------------------------------------------------------

/**
 * Returns default data payload for a new block of the given type.
 */
export function getDefaultBlockData(type: BlockType): BlockData {
  switch (type) {
    case "cover":
      return { type: "cover", layout: "centrado", companyName: "Your Company", tagline: "" };
    case "executive_summary":
      return { type: "executive_summary", html: "<p>Enter your executive summary here.</p>" };
    case "scope":
      return { type: "scope", html: "<p>Describe the scope of work.</p>" };
    case "conditions":
      return { type: "conditions", html: "<p>Describe existing conditions.</p>" };
    case "materials_table":
      return { type: "materials_table", tier: "Better", rows: [{ description: "", brand: "", qty: "", unit: "" }] };
    case "timeline":
      return { type: "timeline", html: "<p>Describe the project timeline and phases.</p>", estimatedDays: 3 };
    case "pricing":
      return { type: "pricing", showGood: true, showBetter: true, showBest: true, selectedTier: "Better" };
    case "warranty":
      return { type: "warranty", html: "<p>Describe your warranty terms.</p>" };
    case "terms":
      return { type: "terms", html: "<p>Standard terms and conditions apply.</p>" };
    case "acceptance":
      return { type: "acceptance", html: "<p>Please sign below to accept this proposal.</p>", requireSignature: true };
    case "rich_text":
      return { type: "rich_text", html: "<p>Enter your text here.</p>" };
    case "image":
      return { type: "image", src: "", alt: "" };
    case "divider":
      return { type: "divider", style: "solid" };
    case "testimonial":
      return { type: "testimonial", quote: "They made the process clear, professional, and stress-free.", author: "Happy Client", role: "Homeowner" };
    case "before_after":
      return { type: "before_after", beforeUrl: "", afterUrl: "", caption: "Project transformation" };
    case "team":
      return { type: "team", headline: "Your Project Team", members: [{ name: "Project Manager", role: "Lead", bio: "Responsible for communication, schedule, and quality control." }] };
    case "faq":
      return { type: "faq", items: [{ question: "How long will the project take?", answer: "Most projects are completed within the timeline shown in this proposal, weather permitting." }] };
    case "financing":
      return { type: "financing", headline: "Flexible Financing Available", description: "Ask about monthly payment options for qualified customers.", monthlyPayment: "As low as {{better_price}}", terms: "Subject to credit approval." };
    case "gallery_grid":
      return { type: "gallery_grid", images: [] };
    case "cta":
      return { type: "cta", headline: "Ready to move forward?", body: "Approve this proposal and our team will schedule the next step.", buttonLabel: "Approve Proposal" };
  }
}

/**
 * Appends a new block of `type` to the end of `blocks`.
 */
export function addBlockToList(blocks: ProposalBlock[], type: BlockType): ProposalBlock[] {
  const maxPos = blocks.length > 0 ? Math.max(...blocks.map((b) => b.position)) : -1;
  const data = getDefaultBlockData(type);
  const newBlock: ProposalBlock = { id: uid(), position: maxPos + 1, type, enabled: true, data };
  return [...blocks, newBlock];
}

/**
 * Removes the block with `id` and reassigns sequential positions.
 */
export function removeBlockFromList(blocks: ProposalBlock[], id: string): ProposalBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .sort((a, b) => a.position - b.position)
    .map((b, i) => ({ ...b, position: i }));
}

// ---------------------------------------------------------------------------
// Sidebar preview text
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, 55);
}

/**
 * Returns a short one-line text preview of a block's content for the sidebar.
 */
export function getBlockPreviewText(block: ProposalBlock): string {
  const d = block.data;
  switch (d.type) {
    case "cover":
      return d.clientName ? `For: ${d.clientName}` : (d.tagline ?? d.companyName ?? "");
    case "executive_summary":
    case "scope":
    case "conditions":
    case "warranty":
    case "terms":
    case "acceptance":
    case "rich_text":
      return stripHtml(d.html);
    case "materials_table":
      return `${d.rows.length} item${d.rows.length !== 1 ? "s" : ""}`;
    case "timeline":
      return d.estimatedDays
        ? `${d.estimatedDays} day${d.estimatedDays !== 1 ? "s" : ""}`
        : stripHtml(d.html);
    case "pricing":
      return `${d.selectedTier} recommended`;
    case "image":
      return d.alt ?? d.caption ?? "Image";
    case "divider":
      return d.style ?? "solid";
    case "testimonial":
      return d.author;
    case "before_after":
      return d.caption ?? "Before / after";
    case "team":
      return `${d.members.length} member${d.members.length !== 1 ? "s" : ""}`;
    case "faq":
      return `${d.items.length} question${d.items.length !== 1 ? "s" : ""}`;
    case "financing":
      return d.headline;
    case "gallery_grid":
      return `${d.images.length} image${d.images.length !== 1 ? "s" : ""}`;
    case "cta":
      return d.headline;
    default:
      return "";
  }
}
