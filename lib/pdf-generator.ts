import {
  getEnabledCompanyCredentialDocuments,
  getEnabledCompanyCredentials,
  mergeAppSettings,
  type AppSettings,
  type Project,
  type Quote,
} from "./app-data";
import type { ProposalTemplate } from "./proposal-templates";

export type CoverLayout = "full" | "half" | "square" | "elegant";

export type QuoteDocument = {
  // Company
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyLogoUrl: string;
  /** Headshot URL for proposal preparer (elegant cover / footer). */
  contactPhotoUrl: string;
  companyTagline: string;
  companyFooterText: string;
  // Proposal meta
  proposalTitle: string;
  proposalNumber: string;
  dateCreated: string;
  expiresAt: string;
  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  // Project
  projectName: string;
  trade: string;
  /** Uppercase line above hero price on the \"Elegante\" cover (from template). */
  coverBannerHeadline?: string;
  /** Elegante cover overrides (from proposal template). */
  elegantCoverBusinessName?: string;
  elegantCoverLogoUrl?: string;
  elegantCoverPriceDisplay?: string;
  elegantCoverContactName?: string;
  elegantCoverContactPhotoUrl?: string;
  elegantCoverContactJobTitle?: string;
  contactName: string;
  contactTitle: string;
  // Content
  scopeSummary: string;
  warrantyText: string;
  termsText: string;
  includedServices: string[];
  certifications: string[];
  existingPhotos: string[];
  existingPhotoCaptions: string[];
  sectionOverrides: Partial<Record<string, boolean>>;
  sectionLayouts: Partial<Record<string, string>>;
  certificationDocuments: {
    credentialName: string;
    fileName: string;
    fileType: string;
    dataUrl: string;
    uploadedAt: string;
  }[];
  // Pricing — NO margin/profit/markup shown to customer
  goodPrice: number;
  betterPrice: number;
  bestPrice: number;
  selectedOption: "Good" | "Better" | "Best";
  pricingDescriptions: Record<"Good" | "Better" | "Best", string>;
  tradeServiceSuggestions: string[];
};

export const defaultCertifications = [
  "Licensed & Insured",
  "General Liability Insurance",
  "Workers' Compensation Insurance",
  "State Contractor License",
];

export const defaultIncludedServices = [
  "Materials",
  "Labor",
  "Cleanup",
  "Disposal",
  "Warranty",
  "Licensed & Insured",
];

export const pricingDescriptions: Record<"Good" | "Better" | "Best", string> = {
  Good: "Competitive option for budget-conscious customers.",
  Better: "Recommended option with balanced value and quality.",
  Best: "Premium option for enhanced service and long-term value.",
};

export function getPricingDescriptions(settings: AppSettings): Record<"Good" | "Better" | "Best", string> {
  const merged = mergeAppSettings(settings);
  return {
    Good: merged.proposalSettings.goodDescription || pricingDescriptions.Good,
    Better: merged.proposalSettings.betterDescription || pricingDescriptions.Better,
    Best: merged.proposalSettings.bestDescription || pricingDescriptions.Best,
  };
}

export function buildQuoteDocument(
  quote: Quote,
  project: Project | undefined,
  settings: AppSettings,
  proposalTemplate?: Pick<ProposalTemplate, "cover"> | null
): QuoteDocument {
  const mergedSettings = mergeAppSettings(settings);
  const projectAddress = project
    ? `${project.address}, ${project.city}, ${project.state} ${project.zipCode}`
    : "";

  const certifications = mergedSettings.proposalSettings.showCertifications
    ? quote.certifications ?? getEnabledCompanyCredentials(mergedSettings)
    : [];

  return {
    companyName: mergedSettings.companyProfile.businessName || "Your Company",
    companyPhone: mergedSettings.companyProfile.phone,
    companyEmail: mergedSettings.companyProfile.email,
    companyWebsite: mergedSettings.companyProfile.website,
    companyLogoUrl: mergedSettings.branding.logoUrl,
    contactPhotoUrl: mergedSettings.companyProfile.contactPhotoUrl?.trim() || "",
    companyTagline: mergedSettings.branding.tagline,
    companyFooterText: mergedSettings.branding.footerText,

    proposalTitle:
      quote.proposalTitle ||
      mergedSettings.proposalSettings.defaultProposalTitle ||
      "Project Proposal",
    proposalNumber: quote.proposalNumber || generateProposalNumber(quote.id),
    dateCreated: quote.createdAt,
    expiresAt: quote.expiresAt,

    customerName: quote.customerName,
    customerPhone: quote.customerPhone || project?.customerPhone || "",
    customerEmail: quote.customerEmail || project?.customerEmail || "",
    customerAddress: quote.customerAddress || projectAddress,

    projectName: quote.projectName,
    trade: quote.trade || project?.trade || "",
    coverBannerHeadline: proposalTemplate?.cover.bannerHeadline?.trim() || undefined,
    elegantCoverBusinessName: proposalTemplate?.cover.elegantBusinessName?.trim() || undefined,
    elegantCoverLogoUrl: proposalTemplate?.cover.elegantLogoUrl?.trim() || undefined,
    elegantCoverPriceDisplay: proposalTemplate?.cover.elegantPriceDisplay?.trim() || undefined,
    elegantCoverContactName: proposalTemplate?.cover.elegantContactName?.trim() || undefined,
    elegantCoverContactPhotoUrl: proposalTemplate?.cover.elegantContactPhotoUrl?.trim() || undefined,
    elegantCoverContactJobTitle: proposalTemplate?.cover.elegantContactJobTitle?.trim() || undefined,
    contactName: mergedSettings.companyProfile.contactName || mergedSettings.companyProfile.businessName || "",
    contactTitle: mergedSettings.companyProfile.contactJobTitle?.trim() || "",

    scopeSummary: quote.scopeSummary || "",
    warrantyText:
      quote.warrantyText || mergedSettings.proposalSettings.defaultWarrantyText,
    termsText: quote.termsText || mergedSettings.proposalSettings.defaultTerms,
    includedServices: quote.includedServices ?? mergedSettings.proposalSettings.defaultIncludedServices ?? defaultIncludedServices,
    certifications,
    existingPhotos: [],
    existingPhotoCaptions: [],
    sectionOverrides: quote.sectionOverrides ?? {},
    sectionLayouts: quote.sectionLayouts ?? {},
    certificationDocuments: mergedSettings.proposalSettings.showCertifications
      ? getEnabledCompanyCredentialDocuments(mergedSettings).filter((document) =>
          certifications.includes(document.credentialName)
        )
      : [],

    goodPrice: quote.good.salePrice,
    betterPrice: quote.better.salePrice,
    bestPrice: quote.best.salePrice,
    selectedOption: quote.selectedOption,
    pricingDescriptions: getPricingDescriptions(settings),
    tradeServiceSuggestions: mergedSettings.contentDefaults.tradeServices[quote.trade ?? ""] ?? [],
  };
}

function generateProposalNumber(id: string) {
  return `PRO-${id.slice(-6).toUpperCase()}`;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const SCOPE_TEMPLATES: Record<string, string[]> = {
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
};

export const TRADE_SERVICES: Record<string, string[]> = {
  Roofing: [
    "Remove & Dispose of Old Roofing",
    "Install Underlayment",
    "Install Ice & Water Shield",
    "Install Shingles",
    "Install Ridge Cap",
    "Flash Valleys & Penetrations",
    "Install Drip Edge",
    "Inspect & Replace Decking",
    "Ventilation",
    "Gutters & Downspouts",
  ],
  Siding: [
    "Remove Old Siding",
    "Install House Wrap / Moisture Barrier",
    "Install New Siding",
    "Corner Trim",
    "Window & Door Trim",
    "Soffit & Fascia",
    "Caulking & Sealing",
    "Paint Touch-up",
  ],
  Painting: [
    "Pressure Washing",
    "Surface Prep & Sanding",
    "Priming",
    "Interior Painting",
    "Exterior Painting",
    "Trim & Detail Work",
    "Ceiling Painting",
    "Touch-up & Final Walk",
  ],
  Drywall: [
    "Tear-out & Demo",
    "Install New Drywall",
    "Tape & Mud",
    "Sand & Finish",
    "Texture Matching",
    "Prime",
  ],
  Gutters: [
    "Remove Old Gutters",
    "Install Seamless Gutters",
    "Install Downspouts",
    "Leaf Guards",
    "Seal & Test",
  ],
  Remodeling: [
    "Demolition",
    "Framing",
    "Plumbing Rough-in",
    "Electrical Rough-in",
    "Insulation",
    "Drywall",
    "Flooring",
    "Trim & Molding",
    "Painting",
    "Final Cleanup",
  ],
};
