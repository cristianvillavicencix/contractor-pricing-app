import { getMoneyFormatPrefs } from "./money-format-prefs";
import { calculatePricingEngine } from "./pricing-engine";
import type { MaterialItem, ProposalTemplate } from "./proposal-templates";
import {
  defaultRoofingBestTierMaterialsTable,
  defaultRoofingBetterTierMaterialsTable,
  defaultRoofingGoodTierMaterialsTable,
} from "./default-roofing-tier-materials";

export type ProjectStatus =
  | "Draft"
  | "Pricing"
  | "Quoted"
  | "Won"
  | "Lost"
  | "Archived"
  | "Planned"
  | "In Progress"
  | "Completed"
  | "On Hold"
  | "Cancelled"
  | "not_started"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "invoiced"
  | "paid"
  | "closed"
  | "cancelled";

export type Trade =
  | "Roofing"
  | "Siding"
  | "Painting"
  | "Drywall"
  | "Gutters"
  | "Remodeling";

export type SettingsTrade = Trade | "General Contractor";

export type ProjectState =
  | "Alabama" | "Arizona" | "Arkansas" | "California" | "Colorado"
  | "Connecticut" | "Florida" | "Georgia" | "Idaho" | "Illinois"
  | "Indiana" | "Iowa" | "Kansas" | "Kentucky" | "Louisiana"
  | "Maryland" | "Massachusetts" | "Michigan" | "Minnesota" | "Mississippi"
  | "Missouri" | "Montana" | "Nebraska" | "Nevada" | "New Jersey"
  | "New Mexico" | "New York" | "North Carolina" | "Ohio" | "Oklahoma"
  | "Oregon" | "Pennsylvania" | "South Carolina" | "Tennessee" | "Texas"
  | "Utah" | "Virginia" | "Washington" | "West Virginia" | "Wisconsin";

export type CompanyLevel =
  | "Solo Owner"
  | "Small Crew"
  | "Established Company"
  | "Premium Company";

export type ProjectSize = "Small" | "Medium" | "Large";
export type RiskLevel = "Low" | "Medium" | "High";
export type Strategy = "Competitive" | "Balanced" | "Premium";
export type PriceOptionName = "Good" | "Better" | "Best";
export type QuoteStatus =
  | "Draft"
  | "Sent"
  | "Viewed"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "converted_to_project";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded";
export type LeadStage =
  | "New"
  | "Qualified"
  | "Proposal Sent"
  | "Negotiation"
  | "Won"
  | "Lost";
export type ProposalCredentialPlacement =
  | "Before Signatures"
  | "After Scope"
  | "Footer";
export type ProposalCoverLayout = "full" | "half" | "square" | "elegant";

export type CompanyCredential = {
  id: string;
  name: string;
  enabled: boolean;
  documentName?: string;
  documentType?: string;
  documentDataUrl?: string;
  uploadedAt?: string;
};

export type CostBreakdown = {
  materials: number;
  /** Optional: material $ for Good tier; when unset, `materials` is used for all tiers without overrides. */
  materialsGood?: number;
  materialsBetter?: number;
  materialsBest?: number;
  labor: number;
  dumpster: number;
  permits: number;
  equipment: number;
  subcontractor: number;
  miscellaneous: number;
};

export type Project = {
  id: string;
  quoteId?: string;
  proposalId?: string;
  selectedOptionId?: string;
  selectedTier?: PriceOptionName;
  approvedAmount?: number;
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  state: ProjectState;
  zipCode: string;
  trade: Trade;
  projectSize: ProjectSize;
  riskLevel: RiskLevel;
  status: ProjectStatus;
  notes: string;
  costs: CostBreakdown;
  createdAt: string;
  contactId?: string;
};

export type ScopeTemplate = {
  id: string;
  name: string;
  trade: Trade | "General";
  text: string;
};

export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  customerType: "Homeowner" | "Business" | "Property Manager";
  leadStage: LeadStage;
  leadSource?: string;
  nextFollowUpAt?: string;
  owner?: string;
  createdAt: string;
};

export type PricingInput = {
  cost: number;
  trade: Trade;
  state: ProjectState;
  companyLevel: CompanyLevel;
  projectSize: ProjectSize;
  riskLevel: RiskLevel;
  overheadPercent: number;
  strategy: Strategy;
  baseMargins: Record<PriceOptionName, number>;
  stateAdjustments?: Record<ProjectState, number>;
};

export type PricingResult = {
  name: PriceOptionName;
  salePrice: number;
  profit: number;
  margin: number;
  markup: number;
  description: string;
  useCase: string;
  recommended?: boolean;
};

export type PricingCalculation = {
  id: string;
  projectId?: string;
  projectName?: string;
  customerName?: string;
  input: unknown;
  results: PricingResult[];
  selectedOption?: PriceOptionName;
  createdAt: string;
};

export type Quote = {
  id: string;
  projectId?: string;
  contactId?: string;
  projectName: string;
  customerName: string;
  // Snapshot fields populated at creation time
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  trade?: string;
  // Editable proposal content
  proposalTitle?: string;
  proposalNumber?: string;
  scopeSummary?: string;
  warrantyText?: string;
  termsText?: string;
  includedServices?: string[];
  certifications?: string[];
  sectionOverrides?: Partial<Record<string, boolean>>;
  sectionLayouts?: Partial<Record<string, string>>;
  sectionOrder?: string[];
  customSections?: Array<{ id: string; title: string; content: string; enabled: boolean }>;
  good: PricingResult;
  better: PricingResult;
  best: PricingResult;
  /** Per-job materials / brand line per tier (e.g. Good: IKO, Better: GAF). Overrides company defaults when set. */
  tierMaterials?: Partial<Record<PriceOptionName, string>>;
  /** Optional per-tier materials table rows for the proposal (overrides company defaults when set for that tier). */
  tierMaterialsTable?: Partial<Record<PriceOptionName, MaterialItem[]>>;
  selectedOption: PriceOptionName;
  status: QuoteStatus;
  depositStatus?: PaymentStatus;
  depositPaidAt?: string;
  createdAt: string;
  expiresAt: string;
  signedAt?: string;
  signedBy?: string;
  projectCreatedAt?: string;
  projectCreatedFromProposalId?: string;
  jobAddress?: string;
  jobCity?: string;
  jobState?: ProjectState;
  jobZipCode?: string;
  projectSize?: ProjectSize;
  riskLevel?: RiskLevel;
  /** TipTap proposal document (HTML string). Replaces ProposalDocument + paged.js when present. */
  proposalDocument?: string;
  /** TipTap proposal document (JSON). */
  proposalDocumentJson?: object;
  /** Secret for client link: `/proposal/:id/accept?t=…` (stored in quote JSON). */
  clientPortalToken?: string;
  /** Supabase Storage paths (`proposal-photos`, company-prefixed). */
  coverImagePath?: string | null;
  existingPhotoPaths?: string[];
  existingPhotoCaptions?: string[];
  coverLayout?: ProposalCoverLayout;
};

/** One row of monthly overhead breakdown (Settings + onboarding). */
export type OverheadLineItem = { id: string; label: string; amount: number };

export type TierProduct = {
  id: string;
  trade: string;
  tier: string;
  productId?: string;
  productName: string;
  productType?: string;
  description?: string;
  productBrand: string;
  productLine: string;
  colorName?: string;
  colorHex?: string;
  imageUrl: string;
  warrantyYears: number;
  unitCost?: number;
  laborCost?: number;
  defaultMargin?: number;
  defaultMarkup?: number;
  isActive?: boolean;
  notes: string;
};

export function sumOverheadLineItems(items: OverheadLineItem[]): number {
  return items.reduce((s, row) => s + Math.max(0, row.amount), 0);
}

/** Suggested labels when adding overhead rows in Settings or onboarding. */
export const OVERHEAD_BREAKDOWN_SUGGESTIONS = [
  "Office or shop rent",
  "Utilities (electric, gas, water)",
  "Work vehicles (payments, insurance, fuel)",
  "Equipment / tool leases",
  "General liability + workers comp",
  "Phone, internet, software",
  "Admin / estimator payroll (non-field)",
  "Marketing & advertising",
  "Licenses, memberships, lead services",
  "Business loan / line of credit payments",
  "Training & certifications",
  "Other fixed monthly costs",
] as const;

export type AppSettings = {
  companyProfile: {
    businessName: string;
    contactName: string;
    /** Job title / role shown under the contact name on the elegant cover and PDF. */
    contactJobTitle: string;
    /** Headshot for the person who prepares proposals (elegant cover footer, PDF). */
    contactPhotoUrl: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    state: ProjectState;
    zipCode: string;
    licenseNumber: string;
    insuranceProvider: string;
    mainTrade: SettingsTrade;
    companyLevel: CompanyLevel;
    certifications: CompanyCredential[];
  };
  pricingDefaults: {
    goodMargin: number;
    betterMargin: number;
    bestMargin: number;
    minimumSafeMargin: number;
    defaultStrategy: Strategy;
    defaultRiskLevel: RiskLevel;
    defaultProjectSize: ProjectSize;
    tradeAdjustments: Record<Trade, number>;
    sizeAdjustments: Record<ProjectSize, number>;
    riskAdjustments: Record<RiskLevel, number>;
    strategyAdjustments: Record<Strategy, number>;
    companyAdjustments: Record<CompanyLevel, number>;
  };
  marketLocation: {
    defaultState: ProjectState;
    defaultCity: string;
    defaultZipCode: string;
    marketCompetitiveness: "Low" | "Medium" | "High";
    customerPriceSensitivity: "Low" | "Medium" | "High";
    serviceAreaNotes: string;
    stateAdjustments: Partial<Record<ProjectState, number>>;
  };
  costRules: {
    monthlyOverhead: number;
    /** Optional saved breakdown (onboarding guide, manual lines, or edited here). Sum should match monthlyOverhead when used. */
    overheadLineItems: OverheadLineItem[];
    overheadAllocationMethod:
      | "Percentage"
      | "Flat Per Project"
      | "Project Duration"
      | "Ignore For Now";
    defaultOverheadPercent: number;
    flatOverheadPerProject: number;
    monthlyBillableDays: number;
    defaultProjectDurationDays: number;
    laborBurdenPercent: number;
    minimumJobPrice: number;
    financingFeePercent: number;
    creditCardFeePercent: number;
    taxPercent: number;
    permitBuffer: number;
    miscellaneousBufferPercent: number;
    includeOverhead: boolean;
    includeFinancingFee: boolean;
    includeCreditCardFee: boolean;
    includeTax: boolean;
    includeMiscellaneousBuffer: boolean;
  };
  proposalSettings: {
    defaultProposalTitle: string;
    defaultWarrantyText: string;
    defaultTerms: string;
    defaultExpirationDays: number;
    showGoodBetterBest: boolean;
    highlightBetterRecommended: boolean;
    showProfitInternallyOnly: boolean;
    showFinancingNote: boolean;
    financingNote: string;
    showTaxSeparately: boolean;
    requireCustomerSignature: boolean;
    showCertifications: boolean;
    showLicenseNumber: boolean;
    showInsuranceBadges: boolean;
    credentialPlacement: ProposalCredentialPlacement;
    goodDescription: string;
    betterDescription: string;
    bestDescription: string;
    /** Customer-facing label for the Good tier (internal key stays Good). */
    goodTierLabel: string;
    betterTierLabel: string;
    bestTierLabel: string;
    /** Default “materials / brand” line for Good tier (shown on proposals; editable per quote). */
    goodTierMaterialsSummary: string;
    betterTierMaterialsSummary: string;
    bestTierMaterialsSummary: string;
    /**
     * Rows for the “Materials & Specifications” table when this tier is selected on the proposal.
     * If empty for a tier, the proposal falls back to the template’s materials table for that trade.
     */
    goodTierMaterialsTable: MaterialItem[];
    betterTierMaterialsTable: MaterialItem[];
    bestTierMaterialsTable: MaterialItem[];
    defaultIncludedServices: string[];
  };
  pricingThresholds: {
    riskyMarginPercent: number;
    tightMarginPercent: number;
    safePriceCushionPercent: number;
    warningMarginLowPercent: number;
    warningMarginHighPercent: number;
    warningCommissionPercent: number;
    warningFeeProfitPercent: number;
    safeMarginRiskBonusPercent: number;
    safeMarginSmallBonusPercent: number;
    marginClampMinPercent: number;
    marginClampMaxPercent: number;
  };
  contentDefaults: {
    tradeServices: Record<string, string[]>;
    scopeTemplates: Record<string, string[]>;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
    tagline: string;
    footerText: string;
    proposalStyle: "Minimal" | "Premium" | "Contractor" | "Modern";
    proposalCoverLayout: ProposalCoverLayout;
  };
  appPreferences: {
    defaultLandingPage: "Dashboard" | "Projects" | "Pricing";
    currency: "USD";
    numberFormat: "1,000.00" | "1000.00";
    theme: "Light" | "Dark" | "System";
    compactMode: boolean;
    showAdvancedPricingBreakdown: boolean;
    showPricingWarnings: boolean;
    /** Desktop sidebar narrow mode; synced via Supabase `company_settings`. */
    sidebarCollapsed?: boolean;
  };
  /** When set (ISO date), onboarding wizard is skipped; stored in Supabase `company_settings`. */
  onboardingCompletedAt?: string;
};

export const DEFAULT_COMPANY_LOGO_URL = "/branding/bidwise-logo-light.png";

export const storageKeys = {
  settings: "contractor-pricing-app:settings",
  projects: "contractor-pricing-app:projects",
  contacts: "contractor-pricing-app:contacts",
  quotes: "contractor-pricing-app:quotes",
  calculations: "contractor-pricing-app:pricing-calculations",
  projectForPricing: "contractor-pricing-app:project-for-pricing",
  proposalCounter: "contractor-pricing-app:proposal-counter",
  scopeTemplates: "contractor-pricing-app:scope-templates",
  onboarding: "contractor-pricing-app:onboarding",
  proposalTemplates: "contractor-pricing-app:proposal-templates",
} as const;

export const tradeOptions: Trade[] = [
  "Roofing",
  "Siding",
  "Painting",
  "Drywall",
  "Gutters",
  "Remodeling",
];

export const settingsTradeOptions: SettingsTrade[] = [
  ...tradeOptions,
  "General Contractor",
];

export const stateOptions: ProjectState[] = [
  "Alabama", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Florida", "Georgia", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Jersey",
  "New Mexico", "New York", "North Carolina", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "South Carolina", "Tennessee", "Texas",
  "Utah", "Virginia", "Washington", "West Virginia", "Wisconsin",
];

export const companyLevelOptions: CompanyLevel[] = [
  "Solo Owner",
  "Small Crew",
  "Established Company",
  "Premium Company",
];

export const projectSizeOptions: ProjectSize[] = ["Small", "Medium", "Large"];
export const riskLevelOptions: RiskLevel[] = ["Low", "Medium", "High"];
export const strategyOptions: Strategy[] = [
  "Competitive",
  "Balanced",
  "Premium",
];

/** Short labels for onboarding / pickers (single source of truth). */
export const tradeOptionDescriptions: Record<SettingsTrade, string> = {
  Roofing: "Shingles, flat roofs, repairs",
  Siding: "Fiber cement, vinyl, trim",
  Painting: "Interior & exterior",
  Drywall: "Hang, tape, finish",
  Gutters: "Install, clean, repair",
  Remodeling: "Kitchen, bath, basement",
  "General Contractor": "Multi-trade projects",
};

export const onboardingTradeOptions: { value: SettingsTrade; desc: string }[] =
  settingsTradeOptions.map((value) => ({
    value,
    desc: tradeOptionDescriptions[value],
  }));

export const companyLevelDescriptions: Record<CompanyLevel, string> = {
  "Solo Owner": "Just me — I do the work",
  "Small Crew": "2–5 people on jobs",
  "Established Company": "5+ years, steady clients",
  "Premium Company": "High-end brand, premium pricing",
};

export const companyLevelOptionsWithDesc: {
  value: CompanyLevel;
  desc: string;
}[] = companyLevelOptions.map((value) => ({
  value,
  desc: companyLevelDescriptions[value],
}));
export const statusOptions: ProjectStatus[] = [
  "not_started",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "invoiced",
  "paid",
  "closed",
  "cancelled",
];
export const quoteStatusOptions: QuoteStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "converted_to_project",
  "Declined",
  "Expired",
];

export const defaultCompanyCredentials: CompanyCredential[] = [
  { id: "licensed-insured", name: "Licensed & Insured", enabled: true },
  {
    id: "general-liability",
    name: "General Liability Insurance",
    enabled: true,
  },
  {
    id: "workers-compensation",
    name: "Workers' Compensation Insurance",
    enabled: true,
  },
  {
    id: "state-license",
    name: "State Contractor License",
    enabled: true,
  },
];

export const defaultSettings: AppSettings = {
  companyProfile: {
    businessName: "Contractor Company",
    contactName: "",
    contactJobTitle: "",
    contactPhotoUrl: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "Connecticut",
    zipCode: "",
    licenseNumber: "",
    insuranceProvider: "",
    mainTrade: "Roofing",
    companyLevel: "Small Crew",
    certifications: defaultCompanyCredentials,
  },
  pricingDefaults: {
    goodMargin: 28,
    betterMargin: 35,
    bestMargin: 42,
    minimumSafeMargin: 20,
    defaultStrategy: "Balanced",
    defaultRiskLevel: "Medium",
    defaultProjectSize: "Medium",
    tradeAdjustments: { Roofing: 2, Siding: 1, Painting: 0, Drywall: -1, Gutters: 1, Remodeling: 3 },
    sizeAdjustments: { Small: 5, Medium: 0, Large: -4 },
    riskAdjustments: { Low: -1, Medium: 0, High: 5 },
    strategyAdjustments: { Competitive: -2, Balanced: 0, Premium: 3 },
    companyAdjustments: { "Solo Owner": -3, "Small Crew": 0, "Established Company": 3, "Premium Company": 5 },
  },
  marketLocation: {
    defaultState: "Connecticut",
    defaultCity: "",
    defaultZipCode: "",
    marketCompetitiveness: "Medium",
    customerPriceSensitivity: "Medium",
    serviceAreaNotes: "",
    stateAdjustments: {
      // Premium markets — high labor + permit costs, market supports higher prices
      California: 5, Massachusetts: 4, "New York": 3, Washington: 3,
      // Above-average markets
      Colorado: 2, Maryland: 2, "New Jersey": 2, Virginia: 2,
      Arizona: 1, Georgia: 1, Illinois: 1, Minnesota: 1, Nevada: 1,
      "North Carolina": 1, Oregon: 1, Pennsylvania: 1,
      // Baseline
      Connecticut: 0, Michigan: 0, Ohio: 0, Wisconsin: 0,
      // Below-average — competitive or lower cost-of-living
      Idaho: -1, Indiana: -1, Missouri: -1, "New Mexico": -1,
      "South Carolina": -1, Tennessee: -1, Texas: -1, Utah: -1,
      Alabama: -2, Florida: -2, Iowa: -2, Kansas: -2, Kentucky: -2, Louisiana: -2,
      Montana: -2, Nebraska: -2, Oklahoma: -2, "West Virginia": -2,
      // Highly competitive / rural
      Arkansas: -3, Mississippi: -3,
    } satisfies Partial<Record<ProjectState, number>>,
  },
  costRules: {
    monthlyOverhead: 5000,
    overheadLineItems: [],
    overheadAllocationMethod: "Percentage",
    defaultOverheadPercent: 10,
    flatOverheadPerProject: 500,
    monthlyBillableDays: 20,
    defaultProjectDurationDays: 1,
    laborBurdenPercent: 18,
    minimumJobPrice: 850,
    financingFeePercent: 3,
    creditCardFeePercent: 3,
    taxPercent: 0,
    permitBuffer: 0,
    miscellaneousBufferPercent: 5,
    includeOverhead: true,
    includeFinancingFee: false,
    includeCreditCardFee: false,
    includeTax: false,
    includeMiscellaneousBuffer: true,
  },
  proposalSettings: {
    defaultProposalTitle: "Project Proposal",
    defaultWarrantyText:
      "Warranty details will be provided based on the selected package and final scope of work.",
    defaultTerms:
      "Proposal pricing is valid until the expiration date shown. Any hidden conditions or scope changes may require price adjustment.",
    defaultExpirationDays: 14,
    showGoodBetterBest: true,
    highlightBetterRecommended: true,
    showProfitInternallyOnly: true,
    showFinancingNote: false,
    financingNote: "Financing options may be available upon approval.",
    showTaxSeparately: false,
    requireCustomerSignature: false,
    showCertifications: true,
    showLicenseNumber: true,
    showInsuranceBadges: true,
    credentialPlacement: "Before Signatures",
    goodDescription: "Competitive option for budget-conscious customers.",
    betterDescription: "Recommended option with balanced value and quality.",
    bestDescription: "Premium option for enhanced service and long-term value.",
    goodTierLabel: "Good",
    betterTierLabel: "Better",
    bestTierLabel: "Best",
    goodTierMaterialsSummary:
      "IKO Cambridge architectural system — RoofGard synthetic, GoldShield ice & water, matching ridge and accessories.",
    betterTierMaterialsSummary:
      "GAF Timberline HDZ with Pro-Start, Seal-A-Ridge, FeltBuster, WeatherWatch, and System Plus warranty upgrade path.",
    bestTierMaterialsSummary:
      "Owens Corning Duration FLEX impact-resistant system — Deck Defense, WeatherLock Flex, VentSure, Platinum-level warranty upgrades.",
    goodTierMaterialsTable: defaultRoofingGoodTierMaterialsTable,
    betterTierMaterialsTable: defaultRoofingBetterTierMaterialsTable,
    bestTierMaterialsTable: defaultRoofingBestTierMaterialsTable,
    defaultIncludedServices: ["Materials", "Labor", "Cleanup", "Disposal", "Warranty", "Licensed & Insured"],
  },
  pricingThresholds: {
    riskyMarginPercent: 25,
    tightMarginPercent: 35,
    safePriceCushionPercent: 8,
    warningMarginLowPercent: 30,
    warningMarginHighPercent: 55,
    warningCommissionPercent: 8,
    warningFeeProfitPercent: 10,
    safeMarginRiskBonusPercent: 3,
    safeMarginSmallBonusPercent: 2,
    marginClampMinPercent: 15,
    marginClampMaxPercent: 65,
  },
  contentDefaults: {
    tradeServices: {
      Roofing: ["Remove & Dispose of Old Roofing","Install Underlayment","Install Ice & Water Shield","Install Shingles","Install Ridge Cap","Flash Valleys & Penetrations","Install Drip Edge","Inspect & Replace Decking","Ventilation","Gutters & Downspouts"],
      Siding: ["Remove Old Siding","Install House Wrap / Moisture Barrier","Install New Siding","Corner Trim","Window & Door Trim","Soffit & Fascia","Caulking & Sealing","Paint Touch-up"],
      Painting: ["Pressure Washing","Surface Prep & Sanding","Priming","Interior Painting","Exterior Painting","Trim & Detail Work","Ceiling Painting","Touch-up & Final Walk"],
      Drywall: ["Tear-out & Demo","Install New Drywall","Tape & Mud","Sand & Finish","Texture Matching","Prime"],
      Gutters: ["Remove Old Gutters","Install Seamless Gutters","Install Downspouts","Leaf Guards","Seal & Test"],
      Remodeling: ["Demolition","Framing","Plumbing Rough-in","Electrical Rough-in","Insulation","Drywall","Flooring","Trim & Molding","Painting","Final Cleanup"],
    },
    scopeTemplates: {
      Roofing: [
        "Remove and dispose of existing roofing materials. Install new underlayment, ice & water shield, and architectural shingles. Flash all valleys, penetrations, and perimeter. Install ridge cap and ventilation. Final clean-up included.",
        "Full roof replacement including tear-off, new decking inspection and repair where needed, synthetic underlayment, and premium architectural shingles. All flashing replaced. 5-year workmanship warranty.",
        "Roof repair and spot replacement. Address damaged or missing shingles, re-flash affected areas, and reseal penetrations. Includes debris removal and site clean-up.",
      ],
      Siding: [
        "Remove existing siding and trim. Install moisture barrier and house wrap. Install new fiber cement siding with matching corner trim, window wraps, and caulking. Paint-ready finish.",
        "Full re-siding including removal, new sheathing wrap, premium vinyl siding installation, corner trim, soffit, and fascia. All seams caulked and sealed.",
        "Partial siding repair and replacement. Match existing profile and color as closely as possible. Includes caulking, priming, and touch-up paint.",
      ],
      Painting: [
        "Power wash all surfaces. Scrape, sand, and prime as needed. Apply two coats of premium exterior paint on all siding, trim, doors, and shutters. Final walk-through included.",
        "Interior painting of all walls and ceilings. Protect floors and furnishings. Patch nail holes and minor imperfections. Apply two coats of low-VOC paint throughout. Clean-up included.",
        "Full interior and exterior paint package. Includes surface prep, spot priming, two finish coats on all surfaces, trim work, and final punch-list touch-ups.",
      ],
      Drywall: [
        "Tear out damaged drywall sections. Install new 5/8\" drywall, tape, mud, and sand to a Level 5 finish. Ready for primer and paint.",
        "Install new drywall on all walls and ceilings. Tape, bed, and sand to smooth finish. Includes texture matching where applicable.",
        "Patch and repair drywall damage. Match existing texture, prime patched areas, and prepare for final paint.",
      ],
      Gutters: [
        "Remove existing gutters and downspouts. Install new seamless aluminum gutters sized for roof area. Add downspout extensions to direct water away from foundation. Seal all joints.",
        "Full seamless gutter installation with leaf guards. Install all downspouts and underground drainage extensions. Final test with water.",
        "Gutter cleaning, resealing, and spot repair. Re-secure any loose sections, reseal end caps and seams, and flush all downspouts.",
      ],
      Remodeling: [
        "Complete kitchen remodel including demo, new cabinets, countertops, backsplash, plumbing fixtures, and electrical updates. Flooring and painting included.",
        "Bathroom remodel including tile removal, new shower/tub surround, vanity, fixtures, toilet, and tile floor. Permit included where required.",
        "Basement finishing including framing, insulation, drywall, electrical, lighting, and flooring. Bathroom rough-in optional.",
      ],
    },
  },
  branding: {
    logoUrl: DEFAULT_COMPANY_LOGO_URL,
    primaryColor: "#111111",
    accentColor: "#737373",
    tagline: "",
    footerText: "Thank you for the opportunity to earn your business.",
    proposalStyle: "Minimal",
    proposalCoverLayout: "full",
  },
  appPreferences: {
    defaultLandingPage: "Dashboard",
    currency: "USD",
    numberFormat: "1,000.00",
    theme: "Light",
    compactMode: false,
    showAdvancedPricingBreakdown: true,
    showPricingWarnings: true,
    sidebarCollapsed: false,
  },
};

export function getUploadedCompanyLogoUrl(logoUrl: string | null | undefined) {
  const trimmed = logoUrl?.trim() ?? "";
  return trimmed || DEFAULT_COMPANY_LOGO_URL;
}

export function mergeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...defaultSettings,
    ...settings,
    companyProfile: {
      ...defaultSettings.companyProfile,
      ...settings.companyProfile,
      certifications:
        settings.companyProfile?.certifications ??
        defaultSettings.companyProfile.certifications,
    },
    pricingDefaults: {
      ...defaultSettings.pricingDefaults,
      ...settings.pricingDefaults,
      tradeAdjustments: { ...defaultSettings.pricingDefaults.tradeAdjustments, ...settings.pricingDefaults?.tradeAdjustments },
      sizeAdjustments: { ...defaultSettings.pricingDefaults.sizeAdjustments, ...settings.pricingDefaults?.sizeAdjustments },
      riskAdjustments: { ...defaultSettings.pricingDefaults.riskAdjustments, ...settings.pricingDefaults?.riskAdjustments },
      strategyAdjustments: { ...defaultSettings.pricingDefaults.strategyAdjustments, ...settings.pricingDefaults?.strategyAdjustments },
      companyAdjustments: { ...defaultSettings.pricingDefaults.companyAdjustments, ...settings.pricingDefaults?.companyAdjustments },
    },
    marketLocation: {
      ...defaultSettings.marketLocation,
      ...settings.marketLocation,
      stateAdjustments: {
        ...defaultSettings.marketLocation.stateAdjustments,
        ...settings.marketLocation?.stateAdjustments,
      },
    },
    costRules: {
      ...defaultSettings.costRules,
      ...settings.costRules,
    },
    proposalSettings: {
      ...defaultSettings.proposalSettings,
      ...settings.proposalSettings,
    },
    pricingThresholds: {
      ...defaultSettings.pricingThresholds,
      ...settings.pricingThresholds,
    },
    contentDefaults: {
      tradeServices: { ...defaultSettings.contentDefaults.tradeServices, ...settings.contentDefaults?.tradeServices },
      scopeTemplates: { ...defaultSettings.contentDefaults.scopeTemplates, ...settings.contentDefaults?.scopeTemplates },
    },
    branding: {
      ...defaultSettings.branding,
      ...settings.branding,
    },
    appPreferences: {
      ...defaultSettings.appPreferences,
      ...settings.appPreferences,
    },
  };
}

/** Customer-facing tier title from Settings (falls back to Good / Better / Best). */
export function getTierDisplayName(settings: AppSettings, tier: PriceOptionName): string {
  const p = mergeAppSettings(settings).proposalSettings;
  const raw =
    tier === "Good"
      ? p.goodTierLabel
      : tier === "Better"
        ? p.betterTierLabel
        : p.bestTierLabel;
  const s = String(raw ?? "").trim();
  return s || tier;
}

/** Materials / brand line per tier for proposals: quote overrides, then company defaults. */
export function getTierMaterialSummaries(
  settings: AppSettings,
  quote?: Pick<Quote, "tierMaterials"> | null
): Record<PriceOptionName, string> {
  const p = mergeAppSettings(settings).proposalSettings;
  const q = quote?.tierMaterials;
  const one = (name: PriceOptionName, settingsFallback: string) => {
    const fromQuote = q?.[name];
    if (fromQuote !== undefined && fromQuote !== null) return String(fromQuote).trim();
    return (settingsFallback || "").trim();
  };
  return {
    Good: one("Good", p.goodTierMaterialsSummary),
    Better: one("Better", p.betterTierMaterialsSummary),
    Best: one("Best", p.bestTierMaterialsSummary),
  };
}

function materialRowHasContent(row: MaterialItem): boolean {
  return [row.category, row.product, row.brand, row.warranty, row.notes, row.imageUrl, row.imagePath].some((x) =>
    String(x ?? "").trim()
  );
}

function normalizeMaterialRows(rows: MaterialItem[] | undefined): MaterialItem[] {
  if (!rows?.length) return [];
  return rows.filter(materialRowHasContent).map((row, i) => ({
    ...row,
    id: row.id?.trim() ? row.id : `mat-${i}-${Math.random().toString(36).slice(2, 9)}`,
  }));
}

/**
 * Rows for the proposal “Materials & Specifications” section for the selected tier:
 * quote override → template per-tier rows → company defaults for that tier → `materialsSpecs.items`.
 */
export function getTierMaterialsTableForProposal(
  settings: AppSettings,
  selectedTier: PriceOptionName,
  template: Pick<ProposalTemplate, "materialsSpecs" | "tierMaterialsByPackage">,
  quote?: Pick<Quote, "tierMaterialsTable"> | null
): MaterialItem[] {
  const p = mergeAppSettings(settings).proposalSettings;
  const fromQuote = normalizeMaterialRows(quote?.tierMaterialsTable?.[selectedTier]);
  if (fromQuote.length > 0) return fromQuote;

  const fromTemplateTier = normalizeMaterialRows(
    template.tierMaterialsByPackage?.[selectedTier]
  );
  if (fromTemplateTier.length > 0) return fromTemplateTier;

  const settingsRows = normalizeMaterialRows(
    selectedTier === "Good"
      ? p.goodTierMaterialsTable
      : selectedTier === "Better"
        ? p.betterTierMaterialsTable
        : p.bestTierMaterialsTable
  );
  if (settingsRows.length > 0) return settingsRows;

  return template.materialsSpecs.items;
}

export function getEnabledCompanyCredentials(settings: AppSettings) {
  const merged = mergeAppSettings(settings);
  const credentials = merged.companyProfile.certifications
    .filter((credential) => credential.enabled)
    .map((credential) => credential.name);

  if (merged.proposalSettings.showLicenseNumber && merged.companyProfile.licenseNumber) {
    credentials.push(`License: ${merged.companyProfile.licenseNumber}`);
  }

  if (
    merged.proposalSettings.showInsuranceBadges &&
    merged.companyProfile.insuranceProvider
  ) {
    credentials.push(`Insurance: ${merged.companyProfile.insuranceProvider}`);
  }

  return credentials;
}

export function getEnabledCompanyCredentialDocuments(settings: AppSettings) {
  const merged = mergeAppSettings(settings);

  return merged.companyProfile.certifications
    .filter(
      (credential) =>
        credential.enabled &&
        credential.documentName &&
        credential.documentDataUrl
    )
    .map((credential) => ({
      credentialName: credential.name,
      fileName: credential.documentName ?? "",
      fileType: credential.documentType ?? "",
      dataUrl: credential.documentDataUrl ?? "",
      uploadedAt: credential.uploadedAt ?? "",
    }));
}

export const initialProjects: Project[] = [
  {
    id: "project-001",
    projectName: "Architectural roof replacement",
    customerName: "Maria Alvarez",
    customerPhone: "(203) 555-0148",
    customerEmail: "maria@example.com",
    address: "42 Maple Ridge Road",
    city: "Stamford",
    state: "Connecticut",
    zipCode: "06903",
    trade: "Roofing",
    projectSize: "Medium",
    riskLevel: "Medium",
    status: "Pricing",
    notes: "Customer wants a clean Good / Better / Best quote with warranty options.",
    costs: {
      materials: 4800,
      labor: 2400,
      dumpster: 450,
      permits: 250,
      equipment: 0,
      subcontractor: 0,
      miscellaneous: 300,
    },
    createdAt: "May 1, 2026",
  },
  {
    id: "project-002",
    projectName: "Cedar siding refresh",
    customerName: "James Whitaker",
    customerPhone: "(212) 555-0194",
    customerEmail: "james@example.com",
    address: "118 Hudson Street",
    city: "New York",
    state: "New York",
    zipCode: "10013",
    trade: "Siding",
    projectSize: "Large",
    riskLevel: "High",
    status: "Quoted",
    notes: "Access is tight. Include buffer for staging and city logistics.",
    costs: {
      materials: 9200,
      labor: 6100,
      dumpster: 750,
      permits: 600,
      equipment: 900,
      subcontractor: 0,
      miscellaneous: 500,
    },
    createdAt: "Apr 28, 2026",
  },
  {
    id: "project-003",
    projectName: "Interior repaint package",
    customerName: "Olivia Grant",
    customerPhone: "(305) 555-0122",
    customerEmail: "olivia@example.com",
    address: "734 Palm Avenue",
    city: "Orlando",
    state: "Florida",
    zipCode: "32801",
    trade: "Painting",
    projectSize: "Small",
    riskLevel: "Low",
    status: "Draft",
    notes: "Customer is comparing two painters. Keep Good option competitive.",
    costs: {
      materials: 850,
      labor: 1600,
      dumpster: 0,
      permits: 0,
      equipment: 150,
      subcontractor: 0,
      miscellaneous: 200,
    },
    createdAt: "Apr 25, 2026",
  },
];

export const initialContacts: Contact[] = initialProjects.map((project) => ({
  id: `contact-${project.id}`,
  name: project.customerName,
  phone: project.customerPhone,
  email: project.customerEmail,
  address: `${project.address}, ${project.city}, ${project.state} ${project.zipCode}`,
  notes: `Created from ${project.projectName}.`,
  customerType: "Homeowner",
  leadStage: "Qualified",
  leadSource: "Existing customer",
  nextFollowUpAt: "",
  owner: "",
  createdAt: project.createdAt,
}));

export function getTotalCost(costs: CostBreakdown) {
  return (
    (Number(costs.materials) || 0) +
    (Number(costs.labor) || 0) +
    (Number(costs.dumpster) || 0) +
    (Number(costs.permits) || 0) +
    (Number(costs.equipment) || 0) +
    (Number(costs.subcontractor) || 0) +
    (Number(costs.miscellaneous) || 0)
  );
}

export function formatMoney(value: number) {
  const { currency, numberFormat } = getMoneyFormatPrefs();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    useGrouping: numberFormat === "1,000.00",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMargin(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPercentNumber(value: number) {
  return `${value.toFixed(1)}%`;
}

export function createPricingInputFromSettings(
  settings: AppSettings,
  overrides: Partial<PricingInput> = {}
): PricingInput {
  const merged = mergeAppSettings(settings);
  const mainTrade =
    merged.companyProfile.mainTrade === "General Contractor"
      ? "Remodeling"
      : merged.companyProfile.mainTrade;

  return {
    cost: 7900,
    trade: mainTrade,
    state: merged.marketLocation.defaultState,
    companyLevel: merged.companyProfile.companyLevel,
    projectSize: merged.pricingDefaults.defaultProjectSize,
    riskLevel: merged.pricingDefaults.defaultRiskLevel,
    overheadPercent: merged.costRules.includeOverhead
      ? merged.costRules.defaultOverheadPercent
      : 0,
    strategy: merged.pricingDefaults.defaultStrategy,
    baseMargins: {
      Good: merged.pricingDefaults.goodMargin / 100,
      Better: merged.pricingDefaults.betterMargin / 100,
      Best: merged.pricingDefaults.bestMargin / 100,
    },
    stateAdjustments: Object.fromEntries(
      stateOptions.map((s) => [s, (merged.marketLocation.stateAdjustments[s] ?? 0) / 100])
    ) as Record<ProjectState, number>,
    ...overrides,
  };
}

export function createPricingInputFromProject(
  project: Project,
  settings: AppSettings
): PricingInput {
  return createPricingInputFromSettings(settings, {
    cost: getTotalCost(project.costs),
    trade: project.trade,
    state: project.state,
    projectSize: project.projectSize,
    riskLevel: project.riskLevel,
  });
}

export function calculatePricing(input: PricingInput): PricingResult[] {
  const adjustment = getPricingAdjustment(input);

  return (["Good", "Better", "Best"] as PriceOptionName[]).map((name) => {
    const margin = clamp(input.baseMargins[name] + adjustment.total, 0.15, 0.65);
    const salePrice = input.cost > 0 ? input.cost / (1 - margin) : 0;
    const profit = salePrice - input.cost;

    return {
      name,
      salePrice,
      profit,
      margin,
      markup: input.cost > 0 ? profit / input.cost : 0,
      description: getPricingDescription(name),
      useCase: getPricingUseCase(name),
      recommended: name === "Better",
    };
  });
}

export function calculateProjectPricing(
  project: Project,
  settings: AppSettings = defaultSettings
) {
  const merged = mergeAppSettings(settings);
  const result = calculatePricingEngine({
    costs: {
      material: project.costs.materials,
      labor: project.costs.labor,
      dumpster: project.costs.dumpster,
      permits: project.costs.permits,
      equipment: project.costs.equipment,
      subcontractor: project.costs.subcontractor,
      miscellaneous: project.costs.miscellaneous,
    },
    businessCosts: {
      overheadPercent: merged.costRules.includeOverhead
        ? merged.costRules.defaultOverheadPercent
        : 0,
      overheadAllocationMethod: merged.costRules.includeOverhead
        ? merged.costRules.overheadAllocationMethod
        : "Ignore For Now",
      monthlyOverhead: merged.costRules.monthlyOverhead,
      flatOverheadPerProject: merged.costRules.flatOverheadPerProject,
      monthlyBillableDays: merged.costRules.monthlyBillableDays,
      projectDurationDays: merged.costRules.defaultProjectDurationDays,
      laborBurdenPercent: merged.costRules.laborBurdenPercent,
      minimumJobPrice: merged.costRules.minimumJobPrice,
      miscellaneousBufferPercent: merged.costRules.includeMiscellaneousBuffer
        ? merged.costRules.miscellaneousBufferPercent
        : 0,
      permitBuffer: merged.costRules.permitBuffer,
      creditCardFeePercent: merged.costRules.creditCardFeePercent,
      financingFeePercent: merged.costRules.financingFeePercent,
      taxPercent: merged.costRules.taxPercent,
      includeCreditCardFee: merged.costRules.includeCreditCardFee,
      includeFinancingFee: merged.costRules.includeFinancingFee,
      includeTax: merged.costRules.includeTax,
      includeMiscellaneousBuffer: merged.costRules.includeMiscellaneousBuffer,
    },
    commission: {
      includeCommission: false,
      commissionType: "Percentage",
      commissionPercentage: 0,
      commissionFlatAmount: 0,
    },
    setup: {
      trade: project.trade,
      state: project.state,
      companyLevel: merged.companyProfile.companyLevel,
      projectSize: project.projectSize,
      riskLevel: project.riskLevel,
      strategy: merged.pricingDefaults.defaultStrategy,
    },
    ...(() => {
      const tier: Partial<Record<PriceOptionName, number>> = {};
      const c = project.costs;
      if (typeof c.materialsGood === "number" && !Number.isNaN(c.materialsGood)) {
        tier.Good = c.materialsGood;
      }
      if (typeof c.materialsBetter === "number" && !Number.isNaN(c.materialsBetter)) {
        tier.Better = c.materialsBetter;
      }
      if (typeof c.materialsBest === "number" && !Number.isNaN(c.materialsBest)) {
        tier.Best = c.materialsBest;
      }
      return Object.keys(tier).length ? { materialCostByTier: tier } : {};
    })(),
    pricingRules: {
      baseMargins: {
        Good: merged.pricingDefaults.goodMargin / 100,
        Better: merged.pricingDefaults.betterMargin / 100,
        Best: merged.pricingDefaults.bestMargin / 100,
      },
      stateAdjustments: Object.fromEntries(
        Object.entries(merged.marketLocation.stateAdjustments).map(([state, value]) => [
          state,
          (value ?? 0) / 100,
        ])
      ) as Partial<Record<ProjectState, number>>,
      tradeAdjustments: Object.fromEntries(
        Object.entries(merged.pricingDefaults.tradeAdjustments).map(([trade, value]) => [
          trade,
          value / 100,
        ])
      ) as Partial<Record<Trade, number>>,
      sizeAdjustments: Object.fromEntries(
        Object.entries(merged.pricingDefaults.sizeAdjustments).map(([size, value]) => [
          size,
          value / 100,
        ])
      ) as Partial<Record<ProjectSize, number>>,
      riskAdjustments: Object.fromEntries(
        Object.entries(merged.pricingDefaults.riskAdjustments).map(([risk, value]) => [
          risk,
          value / 100,
        ])
      ) as Partial<Record<RiskLevel, number>>,
      strategyAdjustments: Object.fromEntries(
        Object.entries(merged.pricingDefaults.strategyAdjustments).map(([strategy, value]) => [
          strategy,
          value / 100,
        ])
      ) as Partial<Record<Strategy, number>>,
      companyAdjustments: Object.fromEntries(
        Object.entries(merged.pricingDefaults.companyAdjustments).map(([company, value]) => [
          company,
          value / 100,
        ])
      ) as Partial<Record<CompanyLevel, number>>,
      minimumSafeMargin: merged.pricingDefaults.minimumSafeMargin / 100,
      thresholds: {
        riskyMargin: merged.pricingThresholds.riskyMarginPercent / 100,
        tightMargin: merged.pricingThresholds.tightMarginPercent / 100,
        safePriceCushion: merged.pricingThresholds.safePriceCushionPercent / 100,
        warningMarginLow: merged.pricingThresholds.warningMarginLowPercent / 100,
        warningMarginHigh: merged.pricingThresholds.warningMarginHighPercent / 100,
        warningCommission: merged.pricingThresholds.warningCommissionPercent / 100,
        warningFeeProfit: merged.pricingThresholds.warningFeeProfitPercent / 100,
        safeMarginRiskBonus: merged.pricingThresholds.safeMarginRiskBonusPercent / 100,
        safeMarginSmallBonus: merged.pricingThresholds.safeMarginSmallBonusPercent / 100,
        marginClampMin: merged.pricingThresholds.marginClampMinPercent / 100,
        marginClampMax: merged.pricingThresholds.marginClampMaxPercent / 100,
      },
    },
  });

  return result.options.map((option) => ({
    name: option.name,
    salePrice: option.salePrice,
    profit: option.netProfit,
    margin: option.margin,
    markup: option.markup,
    description: getPricingDescription(option.name),
    useCase: getPricingUseCase(option.name),
    recommended: option.recommended,
  }));
}

export function getPricingAdjustment(input: PricingInput) {
  const defaultStateAdjustments: Partial<Record<ProjectState, number>> = {
    Connecticut: 0,
    "New York": 0.03,
    "New Jersey": 0.02,
    Florida: -0.02,
    Texas: -0.01,
  };
  const tradeAdjustments: Record<Trade, number> = {
    Roofing: 0.02,
    Siding: 0.01,
    Painting: 0,
    Drywall: -0.01,
    Gutters: 0.01,
    Remodeling: 0.03,
  };
  const companyAdjustments: Record<CompanyLevel, number> = {
    "Solo Owner": -0.03,
    "Small Crew": 0,
    "Established Company": 0.03,
    "Premium Company": 0.05,
  };
  const sizeAdjustments: Record<ProjectSize, number> = {
    Small: 0.05,
    Medium: 0,
    Large: -0.04,
  };
  const riskAdjustments: Record<RiskLevel, number> = {
    Low: -0.01,
    Medium: 0,
    High: 0.05,
  };
  const strategyAdjustments: Record<Strategy, number> = {
    Competitive: -0.02,
    Balanced: 0,
    Premium: 0.03,
  };
  const overhead = (input.overheadPercent / 100) * 0.35;
  const parts = {
    state: (input.stateAdjustments ?? defaultStateAdjustments)[input.state] ?? 0,
    trade: tradeAdjustments[input.trade],
    companyLevel: companyAdjustments[input.companyLevel],
    projectSize: sizeAdjustments[input.projectSize],
    risk: riskAdjustments[input.riskLevel],
    strategy: strategyAdjustments[input.strategy],
    overhead,
  };

  return {
    ...parts,
    total: Object.values(parts).reduce((sum, value) => sum + value, 0),
  };
}

export function getMinimumSafePrice(input: PricingInput, settings: AppSettings) {
  const adjustment = getPricingAdjustment(input);
  const safeMargin = clamp(
    settings.pricingDefaults.minimumSafeMargin / 100 +
      adjustment.risk / 2 +
      adjustment.overhead / 2,
    0.15,
    0.65
  );
  const salePrice = input.cost > 0 ? input.cost / (1 - safeMargin) : 0;

  return {
    salePrice,
    profit: salePrice - input.cost,
    margin: safeMargin,
  };
}

function getPricingDescription(name: PriceOptionName) {
  if (name === "Good") return "Competitive option for price-sensitive customers.";
  if (name === "Better")
    return "Recommended option. Best balance between profit and closing probability.";
  return "Premium option for high-value jobs, urgency, stronger warranty, or more service.";
}

function getPricingUseCase(name: PriceOptionName) {
  if (name === "Good")
    return "Use when the customer needs a leaner price and scope is clear.";
  if (name === "Better")
    return "Use as the default retail recommendation for most projects.";
  return "Use when service level, speed, warranty, or risk justify more margin.";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Next proposal number from existing quotes (Supabase-backed). Avoids localStorage counters. */
export function computeNextProposalNumber(quotes: Quote[]): string {
  let max = 0;
  for (const q of quotes) {
    const raw = (q.proposalNumber ?? "").trim();
    const m = raw.match(/^PRO-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PRO-${String(max + 1).padStart(3, "0")}`;
}

export const TYPICAL_COSTS: Record<
  Trade,
  Record<ProjectSize, { low: number; high: number; note: string }>
> = {
  Roofing: {
    Small: { low: 3000, high: 6000, note: "Repairs, small sections" },
    Medium: { low: 7000, high: 14000, note: "Full residential replacement" },
    Large: { low: 15000, high: 30000, note: "Large or commercial roof" },
  },
  Siding: {
    Small: { low: 2000, high: 5000, note: "Partial siding, minor repairs" },
    Medium: { low: 8000, high: 18000, note: "Full home re-siding" },
    Large: { low: 20000, high: 45000, note: "Large home or commercial" },
  },
  Painting: {
    Small: { low: 800, high: 2500, note: "1–2 rooms or exterior touch-up" },
    Medium: { low: 3000, high: 8000, note: "Full interior or exterior" },
    Large: { low: 9000, high: 20000, note: "Large home or multi-unit" },
  },
  Drywall: {
    Small: { low: 500, high: 2000, note: "Patch work, single room" },
    Medium: { low: 3000, high: 8000, note: "Multiple rooms, finish work" },
    Large: { low: 10000, high: 25000, note: "Full new construction" },
  },
  Gutters: {
    Small: { low: 400, high: 1200, note: "Partial replacement or repair" },
    Medium: { low: 1500, high: 3500, note: "Full residential gutters" },
    Large: { low: 4000, high: 9000, note: "Large home or commercial" },
  },
  Remodeling: {
    Small: { low: 5000, high: 15000, note: "Single room, cosmetic update" },
    Medium: { low: 20000, high: 60000, note: "Kitchen, bath, or addition" },
    Large: { low: 70000, high: 200000, note: "Full home remodel" },
  },
};

export function getTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getExpirationLabel(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
