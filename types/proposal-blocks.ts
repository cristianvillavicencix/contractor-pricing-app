/**
 * Block-based proposal builder types.
 *
 * These types represent the in-memory / JSON-blob model for the new block
 * editor (builderVersion === "blocks").  When a future migration adds real
 * `proposal_blocks` rows the adapter in lib/proposal-blocks.ts absorbs the
 * change without touching this file.
 */

// ---------------------------------------------------------------------------
// Block kinds
// ---------------------------------------------------------------------------

export type BlockType =
  | "cover"
  | "executive_summary"
  | "scope"
  | "materials_table"
  | "timeline"
  | "pricing"
  | "warranty"
  | "conditions"
  | "terms"
  | "acceptance"
  | "rich_text"
  | "image"
  | "divider"
  | "testimonial"
  | "before_after"
  | "team"
  | "faq"
  | "financing"
  | "gallery_grid"
  | "cta";

export type ProposalThemeName =
  | "Modern"
  | "Luxury"
  | "Minimal"
  | "Roofing Dark"
  | "Insurance Clean";

export type ProposalDocumentSettings = {
  theme?: ProposalThemeName;
  primaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  pageMargins?: "comfortable" | "compact" | "wide";
  pdfPageSize?: "A4" | "Letter";
  showPageNumbers?: boolean;
  showTableOfContents?: boolean;
};

// ---------------------------------------------------------------------------
// Per-block data payloads
// ---------------------------------------------------------------------------

export type CoverBlockData = {
  layout: "centrado" | "elegante" | "moderno" | "left" | "center" | "split";
  alignment?: "left" | "center" | "split";
  companyName?: string;
  tagline?: string;
  clientName?: string;
  projectAddress?: string;
  proposalNumber?: string;
  date?: string;
  logoUrl?: string;
  photoUrl?: string;
  backgroundImageUrl?: string;
  overlay?: "auto" | "dark" | "light" | "none";
  logoPosition?: "top-left" | "top-center" | "bottom-left";
};

export type ExecutiveSummaryBlockData = {
  html: string;
};

export type ScopeBlockData = {
  html: string;
  items?: string[];
};

export type MaterialsTableBlockData = {
  tier: "Good" | "Better" | "Best";
  rows: Array<{ description: string; brand?: string; qty?: string; unit?: string }>;
};

export type TimelineBlockData = {
  html: string;
  estimatedDays?: number;
};

export type PricingBlockData = {
  showGood: boolean;
  showBetter: boolean;
  showBest: boolean;
  selectedTier: "Good" | "Better" | "Best";
  goodLabel?: string;
  betterLabel?: string;
  bestLabel?: string;
  mostPopularTier?: "Good" | "Better" | "Best";
  recommendedTier?: "Good" | "Better" | "Best";
  showFeatureComparison?: boolean;
  showFinancing?: boolean;
  financingApr?: number;
  financingMonths?: number;
  features?: Array<{ label: string; good?: boolean; better?: boolean; best?: boolean }>;
  includedRows?: string[];
  excludedRows?: string[];
};

export type WarrantyBlockData = {
  html: string;
};

export type ConditionsBlockData = {
  html: string;
};

export type TermsBlockData = {
  html: string;
};

export type AcceptanceBlockData = {
  html: string;
  requireSignature: boolean;
};

export type RichTextBlockData = {
  html: string;
};

export type ImageBlockData = {
  src: string;
  alt?: string;
  caption?: string;
  width?: string;
};

export type DividerBlockData = {
  style?: "solid" | "dashed" | "dotted";
};

export type TestimonialBlockData = {
  quote: string;
  author: string;
  role?: string;
  photoUrl?: string;
};

export type BeforeAfterBlockData = {
  beforeUrl?: string;
  afterUrl?: string;
  caption?: string;
};

export type TeamBlockData = {
  headline: string;
  members: Array<{ name: string; role: string; photoUrl?: string; bio?: string }>;
};

export type FAQBlockData = {
  items: Array<{ question: string; answer: string }>;
};

export type FinancingBlockData = {
  headline: string;
  description: string;
  monthlyPayment?: string;
  terms?: string;
};

export type GalleryGridBlockData = {
  images: Array<{ src: string; alt?: string; caption?: string }>;
};

export type CTASectionBlockData = {
  headline: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type BlockData =
  | ({ type: "cover" } & CoverBlockData)
  | ({ type: "executive_summary" } & ExecutiveSummaryBlockData)
  | ({ type: "scope" } & ScopeBlockData)
  | ({ type: "materials_table" } & MaterialsTableBlockData)
  | ({ type: "timeline" } & TimelineBlockData)
  | ({ type: "pricing" } & PricingBlockData)
  | ({ type: "warranty" } & WarrantyBlockData)
  | ({ type: "conditions" } & ConditionsBlockData)
  | ({ type: "terms" } & TermsBlockData)
  | ({ type: "acceptance" } & AcceptanceBlockData)
  | ({ type: "rich_text" } & RichTextBlockData)
  | ({ type: "image" } & ImageBlockData)
  | ({ type: "divider" } & DividerBlockData)
  | ({ type: "testimonial" } & TestimonialBlockData)
  | ({ type: "before_after" } & BeforeAfterBlockData)
  | ({ type: "team" } & TeamBlockData)
  | ({ type: "faq" } & FAQBlockData)
  | ({ type: "financing" } & FinancingBlockData)
  | ({ type: "gallery_grid" } & GalleryGridBlockData)
  | ({ type: "cta" } & CTASectionBlockData);

// ---------------------------------------------------------------------------
// The block entity
// ---------------------------------------------------------------------------

/**
 * A single content block inside a proposal.
 *
 * Stored today as an element of `quote.proposalBlocks` (inside the
 * `quotes.data` JSON blob). Future migration target: `proposal_blocks` table
 * with columns (id, quote_id, position, type, data jsonb, enabled boolean).
 */
export type ProposalBlock = {
  /** UUID — stable across saves. */
  id: string;
  /** Render order (0-based). */
  position: number;
  /** Block kind — drives which renderer / editor panel to use. */
  type: BlockType;
  /** Whether this block is included in the exported proposal. */
  enabled: boolean;
  /** Block-specific content payload. */
  data: BlockData;
};
