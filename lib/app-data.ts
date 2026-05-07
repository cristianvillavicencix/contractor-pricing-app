export type ProjectStatus = "Draft" | "Pricing" | "Quoted" | "Won" | "Lost";

export type Trade =
  | "Roofing"
  | "Siding"
  | "Painting"
  | "Drywall"
  | "Gutters"
  | "Remodeling";

export type SettingsTrade = Trade | "General Contractor";

export type ProjectState =
  | "Connecticut"
  | "New York"
  | "New Jersey"
  | "Florida"
  | "Texas";

export type CompanyLevel =
  | "Solo Owner"
  | "Small Crew"
  | "Established Company"
  | "Premium Company";

export type ProjectSize = "Small" | "Medium" | "Large";
export type RiskLevel = "Low" | "Medium" | "High";
export type Strategy = "Competitive" | "Balanced" | "Premium";
export type PriceOptionName = "Good" | "Better" | "Best";
export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined";
export type ProposalCredentialPlacement =
  | "Before Signatures"
  | "After Scope"
  | "Footer";
export type ProposalCoverLayout = "full" | "half" | "square";

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
  labor: number;
  dumpster: number;
  permits: number;
  equipment: number;
  subcontractor: number;
  miscellaneous: number;
};

export type Project = {
  id: string;
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
  good: PricingResult;
  better: PricingResult;
  best: PricingResult;
  selectedOption: PriceOptionName;
  status: QuoteStatus;
  createdAt: string;
  expiresAt: string;
};

export type AppSettings = {
  companyProfile: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    website: string;
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
  };
  marketLocation: {
    defaultState: ProjectState;
    defaultCity: string;
    defaultZipCode: string;
    marketCompetitiveness: "Low" | "Medium" | "High";
    customerPriceSensitivity: "Low" | "Medium" | "High";
    serviceAreaNotes: string;
    stateAdjustments: {
      Connecticut: number;
      NewYork: number;
      NewJersey: number;
      Florida: number;
      Texas: number;
    };
  };
  costRules: {
    monthlyOverhead: number;
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
  };
};

export const storageKeys = {
  settings: "contractor-pricing-app:settings",
  projects: "contractor-pricing-app:projects",
  contacts: "contractor-pricing-app:contacts",
  quotes: "contractor-pricing-app:quotes",
  calculations: "contractor-pricing-app:pricing-calculations",
  projectForPricing: "contractor-pricing-app:project-for-pricing",
  proposalCounter: "contractor-pricing-app:proposal-counter",
  scopeTemplates: "contractor-pricing-app:scope-templates",
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
  "Connecticut",
  "New York",
  "New Jersey",
  "Florida",
  "Texas",
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
export const statusOptions: ProjectStatus[] = [
  "Draft",
  "Pricing",
  "Quoted",
  "Won",
  "Lost",
];
export const quoteStatusOptions: QuoteStatus[] = [
  "Draft",
  "Sent",
  "Accepted",
  "Declined",
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
    email: "",
    phone: "",
    website: "",
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
  },
  marketLocation: {
    defaultState: "Connecticut",
    defaultCity: "",
    defaultZipCode: "",
    marketCompetitiveness: "Medium",
    customerPriceSensitivity: "Medium",
    serviceAreaNotes: "",
    stateAdjustments: {
      Connecticut: 0,
      NewYork: 3,
      NewJersey: 2,
      Florida: -2,
      Texas: -1,
    },
  },
  costRules: {
    monthlyOverhead: 5000,
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
  },
  branding: {
    logoUrl: "",
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
  },
};

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
  createdAt: project.createdAt,
}));

export function getTotalCost(costs: CostBreakdown) {
  return Object.values(costs).reduce((sum, value) => sum + value, 0);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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
    stateAdjustments: {
      Connecticut: merged.marketLocation.stateAdjustments.Connecticut / 100,
      "New York": merged.marketLocation.stateAdjustments.NewYork / 100,
      "New Jersey": merged.marketLocation.stateAdjustments.NewJersey / 100,
      Florida: merged.marketLocation.stateAdjustments.Florida / 100,
      Texas: merged.marketLocation.stateAdjustments.Texas / 100,
    },
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
  return calculatePricing(createPricingInputFromProject(project, mergeAppSettings(settings)));
}

export function getPricingAdjustment(input: PricingInput) {
  const defaultStateAdjustments: Record<ProjectState, number> = {
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
    state: (input.stateAdjustments ?? defaultStateAdjustments)[input.state],
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

export function getNextProposalNumber(): string {
  if (typeof window === "undefined") return "PRO-001";
  try {
    const raw = window.localStorage.getItem(storageKeys.proposalCounter);
    const next = raw ? Number(raw) + 1 : 1;
    window.localStorage.setItem(storageKeys.proposalCounter, String(next));
    return `PRO-${String(next).padStart(3, "0")}`;
  } catch {
    return `PRO-${Date.now().toString().slice(-6)}`;
  }
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
