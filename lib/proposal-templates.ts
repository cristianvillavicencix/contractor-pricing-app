import {
  defaultRoofingBetterTierMaterialsTable,
  defaultRoofingBestTierMaterialsTable,
  defaultRoofingGoodTierMaterialsTable,
} from "./default-roofing-tier-materials";

// ─── Section types ────────────────────────────────────────────────────────────

export type CoverSection = {
  enabled: boolean;
  tagline: string;
  /** Small uppercase line above the hero price on the Elegante cover (e.g. PROPOSED INVESTMENT). */
  bannerHeadline?: string;
  /**
   * Elegante layout — optional overrides stored on the template (per trade).
   * Unset/empty falls back to Settings and the live quote total.
   */
  elegantBusinessName?: string;
  /** Data URL or https — overrides branding logo on Elegante cover header only. */
  elegantLogoUrl?: string;
  /** Overrides formatted selected-tier total on Elegante cover (e.g. custom wording). */
  elegantPriceDisplay?: string;
  elegantContactName?: string;
  elegantContactPhotoUrl?: string;
  elegantContactJobTitle?: string;
  showPreparedBy: boolean;
  showProposalNumber: boolean;
};

export type ExecutiveSummarySection = {
  enabled: boolean;
  problemHeading: string;
  problemText: string;
  solutionHeading: string;
  solutionText: string;
  valueHeading: string;
  valueText: string;
};

export type ExistingConditionsSection = {
  enabled: boolean;
  introText: string;
  checklistItems: string[];
};

export type ScopeSection = {
  enabled: boolean;
  introText: string;
  items: string[];
};

export type MaterialItem = {
  id: string;
  category: string;
  product: string;
  brand: string;
  warranty: string;
  notes: string;
};

export type MaterialsSpecsSection = {
  enabled: boolean;
  introText: string;
  items: MaterialItem[];
};

/** Good / Better / Best — matches pricing tier names in app data. */
export type ProposalPackageName = "Good" | "Better" | "Best";

/**
 * Optional per-tier rows for the Materials & Specifications section (per trade template).
 * When a tier has at least one filled row, it overrides company Settings for that package.
 * Empty / omitted tiers fall back to Settings, then to `materialsSpecs.items`.
 */
export type TierMaterialsByPackage = Partial<
  Record<ProposalPackageName, MaterialItem[]>
>;

export type TimelinePhase = {
  id: string;
  name: string;
  description: string;
};

export type TimelineSection = {
  enabled: boolean;
  estimatedDays: number;
  introText: string;
  phases: TimelinePhase[];
};

export type PricingSection = {
  enabled: boolean;
  introText: string;
  showFinancingOption: boolean;
  financingText: string;
  allowancesText: string;
};

export type WarrantySection = {
  enabled: boolean;
  workmanshipYears: number;
  workmanshipText: string;
  manufacturerText: string;
};

export type TermsSection = {
  enabled: boolean;
  text: string;
};

export type AcceptanceSection = {
  enabled: boolean;
  paymentScheduleText: string;
  paymentLinkUrl: string;
  showFinancingOption: boolean;
  contractIntroText: string;
};

export type CustomSection = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
};

export type ProposalTemplate = {
  id: string;
  trade: string;
  name: string;
  lastModified: string;
  cover: CoverSection;
  executiveSummary: ExecutiveSummarySection;
  existingConditions: ExistingConditionsSection;
  scopeOfWork: ScopeSection;
  materialsSpecs: MaterialsSpecsSection;
  /** Per-package materials rows; overrides company Settings when non-empty for that tier. */
  tierMaterialsByPackage?: TierMaterialsByPackage;
  timeline: TimelineSection;
  pricing: PricingSection;
  warranty: WarrantySection;
  terms: TermsSection;
  acceptance: AcceptanceSection;
  customSections?: CustomSection[];
};

// ─── Section metadata for the editor ─────────────────────────────────────────

export const PROPOSAL_SECTIONS: { id: keyof Omit<ProposalTemplate, "id" | "trade" | "name" | "lastModified">; label: string; description: string }[] = [
  { id: "cover",              label: "1. Cover",                 description: "Logo, property photo, address, customer, proposal number" },
  { id: "executiveSummary",   label: "2. Executive Summary",     description: "Problem → Solution → Value. Short and powerful." },
  { id: "existingConditions", label: "3. Existing Conditions",   description: "Damage found, inspection findings, photos" },
  { id: "scopeOfWork",        label: "4. Scope of Work",         description: "Detailed list of all work to be performed" },
  { id: "materialsSpecs",     label: "5. Materials & Specs",     description: "Brands, models, warranties, code references" },
  { id: "timeline",           label: "6. Project Timeline",      description: "Estimated dates and process phases" },
  { id: "pricing",            label: "7. Investment / Pricing",  description: "Good/Better/Best options, financing, allowances" },
  { id: "warranty",           label: "8. Warranty",              description: "Workmanship warranty and manufacturer warranty" },
  { id: "terms",              label: "9. Terms & Conditions",    description: "Full legal terms of the contract" },
  { id: "acceptance",         label: "10. Acceptance",           description: "Signature, payment schedule, payment portal" },
];

// ─── Default Roofing template ─────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const ROOFING_TERMS = `PROPOSAL & CONTRACT TERMS

1. ACCEPTANCE. This proposal becomes a binding contract upon execution by both parties. Prices are valid for the number of days indicated on the proposal. Work will be scheduled upon receipt of signed contract and deposit.

2. PAYMENT TERMS. Payment is due per the schedule outlined in the Acceptance section. Final payment is due upon completion of work and homeowner walk-through. A service charge of 1.5% per month (18% per year) will be applied to all past-due balances.

3. SCOPE OF WORK. The contractor will perform only the work described in this proposal. Any additional work requested by the owner must be authorized in writing via a signed change order before work begins. Change orders may affect the project price and schedule.

4. PERMITS & CODES. Contractor will obtain all required building permits and perform work in compliance with applicable building codes. Permit fees are included in the contract price unless noted otherwise. Owner is responsible for providing access and ensuring the property meets all requirements prior to permit application.

5. HIDDEN CONDITIONS. This proposal is based on conditions visible at the time of inspection. If hidden conditions are discovered during the work (including but not limited to rotted decking, structural damage, or code violations not apparent during initial assessment), contractor will stop work, notify owner, and provide a written change order before proceeding.

6. OWNER RESPONSIBILITIES. Owner must provide clear access to the work area, remove or protect personal property from the work zone, and ensure all utilities are clearly marked. Contractor is not responsible for damage to unmarked underground utilities.

7. MATERIALS & SUBSTITUTIONS. All materials will be new and of the grade specified. Contractor reserves the right to substitute materials of equal or greater quality if specified materials are unavailable, with written notice to owner.

8. WARRANTY. Contractor's workmanship warranty is described in the Warranty section of this proposal. Manufacturer product warranties are subject to the terms and conditions of each manufacturer and require proper installation per their specifications.

9. INSURANCE & LIEN RIGHTS. Contractor carries General Liability Insurance and Workers' Compensation coverage. Upon final payment, contractor will provide a lien waiver releasing all lien rights to the property.

10. DISPUTES & GOVERNING LAW. Any disputes arising from this contract shall be governed by the laws of the state where the project is located. The parties agree to attempt to resolve disputes through written notice followed by good-faith negotiation before pursuing legal remedies.

11. ENTIRE AGREEMENT. This proposal constitutes the entire agreement between the parties and supersedes all prior discussions, proposals, or representations. No modification shall be effective unless made in writing and signed by both parties.

By signing this contract, both parties acknowledge they have read, understood, and agreed to all terms and conditions stated herein.`;

export const defaultRoofingTemplate: ProposalTemplate = {
  id: "default-roofing",
  trade: "Roofing",
  name: "Roofing Proposal",
  lastModified: new Date().toISOString().slice(0, 10),

  cover: {
    enabled: true,
    tagline: "Professional Roofing Solutions — Licensed, Insured & Warranted",
    showPreparedBy: true,
    showProposalNumber: true,
  },

  executiveSummary: {
    enabled: true,
    problemHeading: "The Hidden Cost of Waiting",
    problemText: "Roof damage — whether from age, storm impact, or deferred maintenance — doesn't stay contained. A compromised roof allows water infiltration that silently damages insulation, framing, drywall, and can lead to mold growth that threatens both your home's structure and your family's health. What starts as a few missing shingles can quickly become a $20,000+ interior repair problem. Early, professional intervention is always less expensive than emergency remediation.",
    solutionHeading: "A Complete, Turnkey Solution",
    solutionText: "Our team provides a fully managed roofing replacement — from thorough pre-installation inspection and complete tear-off, to precision installation using manufacturer-approved methods and materials. Every component is installed to meet or exceed local building codes. We handle permits, cleanup, and final inspection, so you experience zero disruption beyond the actual work days.",
    valueHeading: "Why This Investment Pays for Itself",
    valueText: "A properly installed roof by a licensed, warranted contractor does more than stop leaks. It protects your home's resale value, qualifies you for lower homeowner's insurance premiums, and provides decades of documented workmanship coverage. Our clients consistently report that choosing a professional installation over the lowest bid saves them significantly on callbacks, re-work, and warranty disputes — because we stand behind our work with a written guarantee.",
  },

  existingConditions: {
    enabled: true,
    introText: "The following conditions were identified during our on-site inspection. This assessment documents the current state of the roof system and serves as the basis for the recommended scope of work. Photos are provided where applicable.",
    checklistItems: [
      "Missing, cracked, or curling shingles observed across multiple roof sections",
      "Significant granule loss exposing bare asphalt substrate",
      "Damaged or deteriorated flashing at chimney, skylights, or pipe penetrations",
      "Valley flashing inadequate or showing signs of rust and separation",
      "Soft spots identified indicating underlying decking damage or rot",
      "Visible daylight or light infiltration through attic decking",
      "Inadequate attic ventilation — baffles blocked or insufficient ridge/soffit venting",
      "Clogged or damaged gutters causing water backup at eaves",
      "Ice dam damage visible along eave line",
      "Interior water staining or active leak reported by homeowner",
      "Storm or hail impact damage — impact marks on shingles and soft metals",
      "Roofing system has exceeded typical useful life (20+ years)",
    ],
  },

  scopeOfWork: {
    enabled: true,
    introText: "The following scope represents all work to be performed under this contract. All work will be completed by our licensed crew per manufacturer specifications and applicable building codes. No subcontractors will be used without written owner consent.",
    items: [
      "Protect all landscaping, driveway, HVAC equipment, and exterior surfaces with tarps and plywood before work begins",
      "Complete removal of all existing roofing materials, including shingles, felt, and existing drip edge, down to bare decking",
      "Thorough inspection of all roof decking — replace any damaged, rotted, or structurally compromised sections (replacement boards billed per linear/square foot as change order if not included in base scope)",
      "Install code-required ice & water shield membrane at all eaves (minimum 24\" past interior wall line), all valleys, and within 12\" of all roof penetrations",
      "Install high-performance synthetic underlayment across all remaining deck areas",
      "Install new galvanized drip edge on all perimeter edges — eaves first, then rakes over underlayment",
      "Re-flash all roof penetrations including pipe boots, skylights, and HVAC curbs with new lead or metal flashing",
      "Re-flash chimney with new step flashing, counter flashing, and sealant — properly woven into course installation",
      "Install open metal valley flashing in all valleys, properly integrated with underlayment",
      "Install selected architectural shingles per manufacturer's installation specifications — proper offset, nail pattern, and starter course",
      "Install ventilated ridge cap using manufacturer's matching ridge product",
      "Ensure proper attic ventilation balance between intake (soffit) and exhaust (ridge/box vents) per code",
      "Conduct thorough magnetic nail sweep of all work areas including driveway and landscaping",
      "Remove and dispose of all debris from the property — leave jobsite cleaner than found",
      "Final walk-through inspection with homeowner, photo documentation of completed work, and delivery of all permit final paperwork and warranty documentation",
    ],
  },

  materialsSpecs: {
    enabled: true,
    introText: "All materials used are new, first-quality products from industry-leading manufacturers. Specifications are provided for review. Color and product selections will be confirmed with homeowner prior to material ordering.",
    items: [
      { id: makeId(), category: "Shingles", product: "Timberline HDZ", brand: "GAF", warranty: "Limited Lifetime (transferable)", notes: "Class 4 Impact Resistant available; Energy Star rated; 130 mph wind resistance" },
      { id: makeId(), category: "Starter Strip", product: "Pro-Start Eave/Rake Starter", brand: "GAF", warranty: "Per shingle warranty", notes: "Pre-applied adhesive for faster, more consistent installation" },
      { id: makeId(), category: "Ridge Cap", product: "Seal-A-Ridge", brand: "GAF", warranty: "Limited Lifetime", notes: "3× thicker than standard 3-tab; color-matched to field shingle" },
      { id: makeId(), category: "Underlayment", product: "FeltBuster Synthetic Roofing Felt", brand: "GAF", warranty: "Limited Lifetime when used with qualifying GAF shingles", notes: "4× greater tear resistance than #30 felt; slip-resistant surface" },
      { id: makeId(), category: "Ice & Water Shield", product: "WeatherWatch Mineral-Surfaced Leak Barrier", brand: "GAF", warranty: "Per manufacturer specs", notes: "Self-adhering; applied at eaves, valleys, and all penetrations per code" },
      { id: makeId(), category: "Drip Edge", product: "26-gauge galvanized drip edge", brand: "Standard grade or better", warranty: "N/A", notes: "Installed at all perimeter edges; eaves first, rakes second" },
      { id: makeId(), category: "Pipe Boots", product: "No-Calk Lead Pipe Boots", brand: "Oatey or equivalent", warranty: "N/A", notes: "Malleable lead — sized to match existing pipe diameter; long-lasting seal" },
      { id: makeId(), category: "Nails", product: "1-1/4\" Ring-Shank Roofing Nails", brand: "Grip-Rite or equivalent", warranty: "N/A", notes: "11-gauge; hot-dipped galvanized; 4-nail pattern minimum per shingle" },
    ],
  },

  tierMaterialsByPackage: {
    Good: defaultRoofingGoodTierMaterialsTable,
    Better: defaultRoofingBetterTierMaterialsTable,
    Best: defaultRoofingBestTierMaterialsTable,
  },

  timeline: {
    enabled: true,
    estimatedDays: 2,
    introText: "The following timeline represents a typical installation for this scope of work under normal weather conditions. Your project manager will confirm specific dates upon contract execution and material delivery confirmation.",
    phases: [
      { id: makeId(), name: "Pre-Installation (1–3 days prior)", description: "Materials ordered and delivered to site. Permits pulled and approved (if required by municipality). Project scheduled and confirmed with homeowner. Pre-installation checklist completed including access, protection areas, and utility locations." },
      { id: makeId(), name: "Day 1 — Tear-Off & Prep", description: "Crew arrives by 7:00 AM. All landscaping and surfaces protected. Complete tear-off of existing roofing materials. Full decking inspection — all damaged sections documented and replacement quoted if applicable. Installation of ice & water shield at eaves, valleys, and penetrations. Installation of synthetic underlayment across remaining deck areas. Property secured overnight with fully underlaid deck — weatherproof until installation resumes." },
      { id: makeId(), name: "Day 2 — Full Installation", description: "Drip edge installation on all perimeter edges. Complete shingle installation — starter course, field shingles, hip and ridge. All flashing work including pipe boots, step flashing, counter flashing, and valley metal. Ventilated ridge cap installed. Preliminary cleanup and inspection." },
      { id: makeId(), name: "Final Day — Cleanup & Closeout", description: "Thorough magnetic nail sweep of entire property including driveway and lawn areas. Removal of all debris and protective coverings. Final inspection by project manager. Walk-through with homeowner — all work reviewed and verified. Delivery of all warranty documentation and permit final paperwork. Balance invoice presented." },
    ],
  },

  pricing: {
    enabled: true,
    introText: "The following investment options represent three levels of service for your roofing project. All options include the full scope of work described in this proposal — the difference between tiers reflects material grade, warranty coverage, and service enhancements.",
    showFinancingOption: true,
    financingText: "Flexible financing options are available through our lending partners for qualified homeowners. 0% interest options may be available for terms up to 18 months. Ask us about current promotions. Financing approval does not affect your project pricing.",
    allowancesText: "Pricing includes up to 3 sheets of 7/16\" OSB decking replacement. Additional decking is billed at $85/sheet installed. Any additional work found during tear-off will be presented as a written change order before proceeding.",
  },

  warranty: {
    enabled: true,
    workmanshipYears: 5,
    workmanshipText: "We provide a 5-year written workmanship warranty covering all labor and installation-related defects. If any issue arises from our installation during this period, we will return to correct it at no charge to you. This warranty is transferable to the next homeowner and adds real value to your property. Our warranty is backed by our business reputation — we have been serving this community for years and we stand behind every project we complete.",
    manufacturerText: "All products specified in this proposal carry their respective manufacturer limited lifetime warranties, which cover material defects under normal use and maintenance conditions. Warranty coverage requires installation by a licensed contractor per manufacturer specifications. Upon project completion, we will register all eligible products in your name to activate full warranty coverage. GAF's System Plus Limited Warranty is available when qualifying GAF components are used together — providing enhanced protection against manufacturing defects for the life of the home.",
  },

  terms: {
    enabled: true,
    text: ROOFING_TERMS,
  },

  acceptance: {
    enabled: true,
    contractIntroText: "By signing below, you authorize the contractor to proceed with the work described in this proposal under the terms and conditions stated herein. You confirm that you have read and understood all sections of this proposal, including the scope of work, materials specifications, timeline, warranty, and terms and conditions.",
    paymentScheduleText: "50% deposit due at contract signing to secure your scheduled installation date and order materials. Remaining 50% balance due upon project completion and homeowner walk-through approval. Accepted payment methods: check, ACH bank transfer, or credit card (card processing fee of 3% applies).",
    paymentLinkUrl: "",
    showFinancingOption: true,
  },
};

// ─── Default templates for all trades ────────────────────────────────────────

export function blankTemplate(trade: string): ProposalTemplate {
  return {
    id: `default-${trade.toLowerCase().replace(/\s+/g, "-")}`,
    trade,
    name: `${trade} Proposal`,
    lastModified: new Date().toISOString().slice(0, 10),
    cover: { enabled: true, tagline: `Professional ${trade} Services — Licensed, Insured & Warranted`, showPreparedBy: true, showProposalNumber: true },
    executiveSummary: {
      enabled: true,
      problemHeading: "The Problem",
      problemText: `Describe the core problem your ${trade.toLowerCase()} customers face and why it matters to act now.`,
      solutionHeading: "Our Solution",
      solutionText: `Describe how your ${trade.toLowerCase()} process solves the problem completely and professionally.`,
      valueHeading: "The Value",
      valueText: "Explain why investing in quality work with your company is the right long-term decision.",
    },
    existingConditions: {
      enabled: true,
      introText: "The following conditions were identified during our on-site assessment and serve as the basis for the recommended scope of work.",
      checklistItems: ["Condition 1 — describe what was found", "Condition 2 — add more items as needed"],
    },
    scopeOfWork: {
      enabled: true,
      introText: "The following scope represents all work to be performed under this contract.",
      items: ["Item 1 — describe work in detail", "Item 2 — be specific about materials and methods"],
    },
    materialsSpecs: {
      enabled: true,
      introText: "All materials are new, first-quality products from industry-leading manufacturers.",
      items: [{ id: makeId(), category: "Primary Material", product: "Product Name", brand: "Brand", warranty: "Warranty details", notes: "Notes" }],
    },
    timeline: {
      enabled: true,
      estimatedDays: 1,
      introText: "The following timeline represents a typical project under normal conditions.",
      phases: [
        { id: makeId(), name: "Pre-Installation", description: "Materials ordered, permits pulled, project scheduled." },
        { id: makeId(), name: "Installation Day", description: "Full installation completed by our licensed crew." },
        { id: makeId(), name: "Cleanup & Closeout", description: "Final inspection, walk-through, and warranty documentation." },
      ],
    },
    pricing: { enabled: true, introText: "The following investment options cover the full scope of work described in this proposal.", showFinancingOption: false, financingText: "Financing options may be available. Ask us for details.", allowancesText: "" },
    warranty: { enabled: true, workmanshipYears: 2, workmanshipText: "We provide a written workmanship warranty covering all installation-related defects.", manufacturerText: "All specified products carry their respective manufacturer warranties." },
    terms: { enabled: true, text: ROOFING_TERMS },
    acceptance: { enabled: true, contractIntroText: "By signing below, you authorize the contractor to proceed with the work described in this proposal under all terms stated herein.", paymentScheduleText: "50% at contract signing, 50% upon completion.", paymentLinkUrl: "", showFinancingOption: false },
  };
}

export const defaultProposalTemplates: ProposalTemplate[] = [
  defaultRoofingTemplate,
  blankTemplate("Siding"),
  blankTemplate("Painting"),
  blankTemplate("Drywall"),
  blankTemplate("Gutters"),
  blankTemplate("Remodeling"),
  blankTemplate("General Contractor"),
];

/**
 * Deep-clone a proposal template under a new trade / id (e.g. Duplicate in Settings).
 * Caller should `upsertProposalTemplate` after the user saves from the editor.
 */
export function cloneProposalTemplateWithNewIdentity(
  source: ProposalTemplate,
  next: { id: string; trade: string; name: string }
): ProposalTemplate {
  const copy = JSON.parse(JSON.stringify(source)) as ProposalTemplate;
  copy.id = next.id.trim();
  copy.trade = next.trade.trim();
  copy.name = next.name.trim();
  copy.lastModified = new Date().toISOString().slice(0, 10);
  return copy;
}

export function mergeProposalTemplates(saved: ProposalTemplate[]): ProposalTemplate[] {
  const merged = [...defaultProposalTemplates];
  for (const savedTemplate of saved) {
    const idx = merged.findIndex((t) => t.trade === savedTemplate.trade);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...savedTemplate };
    } else {
      merged.push(savedTemplate);
    }
  }
  return merged;
}
