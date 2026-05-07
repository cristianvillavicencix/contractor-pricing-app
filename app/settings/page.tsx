"use client";

import { RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { storageKeys } from "@/lib/app-data";
import { useLocalStorageState } from "@/lib/use-local-storage";

type Trade =
  | "Roofing"
  | "Siding"
  | "Painting"
  | "Drywall"
  | "Gutters"
  | "Remodeling"
  | "General Contractor";

type CompanyLevel =
  | "Solo Owner"
  | "Small Crew"
  | "Established Company"
  | "Premium Company";

type Strategy = "Competitive" | "Balanced" | "Premium";
type RiskLevel = "Low" | "Medium" | "High";
type ProjectSize = "Small" | "Medium" | "Large";
type Level = "Low" | "Medium" | "High";
type SettingsSection =
  | "Company Profile"
  | "Pricing Defaults"
  | "Market & Location"
  | "Cost Rules"
  | "Proposal Settings"
  | "Branding"
  | "App Preferences"
  | "Data";

type AppSettings = {
  companyProfile: {
    businessName: string;
    contactName: string;
    email: string;
    phone: string;
    website: string;
    mainTrade: Trade;
    companyLevel: CompanyLevel;
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
    defaultState: string;
    defaultCity: string;
    defaultZipCode: string;
    marketCompetitiveness: Level;
    customerPriceSensitivity: Level;
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
      | "Ignore For Now";
    defaultOverheadPercent: number;
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
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    accentColor: string;
    tagline: string;
    footerText: string;
    proposalStyle: "Minimal" | "Premium" | "Contractor" | "Modern";
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

const sectionItems: SettingsSection[] = [
  "Company Profile",
  "Pricing Defaults",
  "Market & Location",
  "Cost Rules",
  "Proposal Settings",
  "Branding",
  "App Preferences",
  "Data",
];

const tradeOptions: Trade[] = [
  "Roofing",
  "Siding",
  "Painting",
  "Drywall",
  "Gutters",
  "Remodeling",
  "General Contractor",
];

const companyLevelOptions: CompanyLevel[] = [
  "Solo Owner",
  "Small Crew",
  "Established Company",
  "Premium Company",
];

const stateOptions = [
  "Connecticut",
  "New York",
  "New Jersey",
  "Florida",
  "Texas",
];
const levelOptions: Level[] = ["Low", "Medium", "High"];
const strategyOptions: Strategy[] = ["Competitive", "Balanced", "Premium"];
const riskLevelOptions: RiskLevel[] = ["Low", "Medium", "High"];
const projectSizeOptions: ProjectSize[] = ["Small", "Medium", "Large"];

const defaultSettings: AppSettings = {
  companyProfile: {
    businessName: "Contractor Company",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    mainTrade: "Roofing",
    companyLevel: "Small Crew",
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
  },
  branding: {
    logoUrl: "",
    primaryColor: "#111111",
    accentColor: "#737373",
    tagline: "",
    footerText: "Thank you for the opportunity to earn your business.",
    proposalStyle: "Minimal",
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

export default function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("Company Profile");
  const [savedSettings, setSavedSettings] =
    useLocalStorageState<AppSettings>(storageKeys.settings, defaultSettings);
  const [settings, setSettings] = useState<AppSettings>(savedSettings);
  const [message, setMessage] = useState("");

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings]
  );

  const validationMessage = getValidationMessage(settings);

  function resetSettings() {
    setSettings(defaultSettings);
    setSavedSettings(defaultSettings);
    setMessage("");
  }

  function saveSettings() {
    const validation = getValidationMessage(settings);
    if (validation) {
      setMessage(validation);
      return;
    }

    setSavedSettings(settings);
    setMessage("Settings saved locally for this session.");
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 sm:p-8 lg:p-10">
        <div className="w-full">
          <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Settings</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Settings
              </h2>
              <p className="mt-3 max-w-3xl text-gray-500">
                Configure your business profile, pricing defaults, and proposal
                preferences.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasUnsavedChanges ? (
                <span className="rounded-md border border-[#d9e2ec] px-3 py-2 text-xs font-medium text-gray-600">
                  Unsaved changes
                </span>
              ) : null}
              <button
                onClick={resetSettings}
                className="inline-flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-3 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={saveSettings}
                className="inline-flex items-center gap-2 rounded-md bg-[#ff5c35] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#e94820]"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </header>

          {message || validationMessage ? (
            <div className="mt-6 rounded-lg border border-[#d9e2ec] bg-white px-5 py-4 text-sm text-gray-700">
              {message || validationMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="h-fit rounded-lg border border-[#d9e2ec] bg-white p-2">
              {sectionItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveSection(item)}
                  className={`w-full rounded-md px-4 py-3 text-left text-sm transition ${
                    activeSection === item
                      ? "bg-[#fff1ea] font-medium text-[#213343]"
                      : "text-gray-500 hover:bg-[#f6f8fb] hover:text-black"
                  }`}
                >
                  {item}
                </button>
              ))}
            </aside>

            <div>
              {activeSection === "Company Profile" ? (
                <CompanyProfileSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Pricing Defaults" ? (
                <PricingDefaultsSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Market & Location" ? (
                <MarketLocationSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Cost Rules" ? (
                <CostRulesSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Proposal Settings" ? (
                <ProposalSettingsSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Branding" ? (
                <BrandingSection settings={settings} setSettings={setSettings} />
              ) : null}
              {activeSection === "App Preferences" ? (
                <AppPreferencesSection
                  settings={settings}
                  setSettings={setSettings}
                />
              ) : null}
              {activeSection === "Data" ? <DataSection /> : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CompanyProfileSection({
  settings,
  setSettings,
}: SectionProps) {
  const profile = settings.companyProfile;

  return (
    <SettingsSection
      title="Company Profile"
      description="Stores the contractor's business identity for future proposals, PDFs, and pricing defaults."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Business Name"
          placeholder="GA Castro Construction LLC"
          value={profile.businessName}
          helperText="Used on future proposals and PDFs."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, businessName: value },
            }))
          }
        />
        <TextField
          label="Contact Name"
          placeholder="Cristian Villavicencio"
          value={profile.contactName}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, contactName: value },
            }))
          }
        />
        <TextField
          label="Business Email"
          type="email"
          value={profile.email}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, email: value },
            }))
          }
        />
        <TextField
          label="Business Phone"
          value={profile.phone}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, phone: value },
            }))
          }
        />
        <TextField
          label="Website"
          value={profile.website}
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, website: value },
            }))
          }
        />
        <SelectField
          label="Main Trade"
          value={profile.mainTrade}
          options={tradeOptions}
          helperText="Used as default trade in Pricing and Projects."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: {
                ...current.companyProfile,
                mainTrade: value as Trade,
              },
            }))
          }
        />
        <SelectField
          label="Company Level"
          value={profile.companyLevel}
          options={companyLevelOptions}
          helperText="Affects pricing margin adjustments."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: {
                ...current.companyProfile,
                companyLevel: value as CompanyLevel,
              },
            }))
          }
        />
      </div>
    </SettingsSection>
  );
}

function PricingDefaultsSection({ settings, setSettings }: SectionProps) {
  const pricing = settings.pricingDefaults;

  return (
    <SettingsSection
      title="Pricing Defaults"
      description="Controls default Good, Better, and Best margins used when starting new pricing calculations."
      footer="Pricing Calculator uses these defaults when starting a new calculation. Projects use these defaults when a new project is created. Quotes use the final calculated prices."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NumberField
          label="Good Margin %"
          value={pricing.goodMargin}
          min={0}
          max={80}
          helperText="Competitive option for price-sensitive customers."
          onChange={(value) => updatePricingDefault(setSettings, "goodMargin", value)}
        />
        <NumberField
          label="Better Margin %"
          value={pricing.betterMargin}
          min={0}
          max={80}
          helperText="Recommended option. Balanced between profit and closing probability."
          onChange={(value) =>
            updatePricingDefault(setSettings, "betterMargin", value)
          }
        />
        <NumberField
          label="Best Margin %"
          value={pricing.bestMargin}
          min={0}
          max={80}
          helperText="Premium option for stronger value, urgency, or warranty."
          onChange={(value) => updatePricingDefault(setSettings, "bestMargin", value)}
        />
        <NumberField
          label="Minimum Safe Margin %"
          value={pricing.minimumSafeMargin}
          min={0}
          max={80}
          helperText="Lowest acceptable margin before a project becomes too risky."
          onChange={(value) =>
            updatePricingDefault(setSettings, "minimumSafeMargin", value)
          }
        />
        <SelectField
          label="Default Strategy"
          value={pricing.defaultStrategy}
          options={strategyOptions}
          onChange={(value) =>
            updatePricingDefault(
              setSettings,
              "defaultStrategy",
              value as Strategy
            )
          }
        />
        <SelectField
          label="Default Risk Level"
          value={pricing.defaultRiskLevel}
          options={riskLevelOptions}
          onChange={(value) =>
            updatePricingDefault(
              setSettings,
              "defaultRiskLevel",
              value as RiskLevel
            )
          }
        />
        <SelectField
          label="Default Project Size"
          value={pricing.defaultProjectSize}
          options={projectSizeOptions}
          onChange={(value) =>
            updatePricingDefault(
              setSettings,
              "defaultProjectSize",
              value as ProjectSize
            )
          }
        />
      </div>
    </SettingsSection>
  );
}

function MarketLocationSection({ settings, setSettings }: SectionProps) {
  const market = settings.marketLocation;
  const stateRows = [
    ["Connecticut Adjustment %", "Connecticut"],
    ["New York Adjustment %", "NewYork"],
    ["New Jersey Adjustment %", "NewJersey"],
    ["Florida Adjustment %", "Florida"],
    ["Texas Adjustment %", "Texas"],
  ] as const;

  return (
    <SettingsSection
      title="Market & Location"
      description="Sets default market assumptions and state margin adjustments."
      footer="Market adjustments help the app avoid applying the same margin in every state. Pricing Engine uses the state adjustment, Projects use the project address, and Dashboard can later show performance by market."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Default State"
          value={market.defaultState}
          options={stateOptions}
          onChange={(value) => updateMarket(setSettings, "defaultState", value)}
        />
        <TextField
          label="Default City"
          value={market.defaultCity}
          onChange={(value) => updateMarket(setSettings, "defaultCity", value)}
        />
        <TextField
          label="Default ZIP Code"
          value={market.defaultZipCode}
          onChange={(value) => updateMarket(setSettings, "defaultZipCode", value)}
        />
        <SelectField
          label="Market Competitiveness"
          value={market.marketCompetitiveness}
          options={levelOptions}
          onChange={(value) =>
            updateMarket(setSettings, "marketCompetitiveness", value as Level)
          }
        />
        <SelectField
          label="Customer Price Sensitivity"
          value={market.customerPriceSensitivity}
          options={levelOptions}
          onChange={(value) =>
            updateMarket(setSettings, "customerPriceSensitivity", value as Level)
          }
        />
        <TextAreaField
          label="Service Area Notes"
          value={market.serviceAreaNotes}
          className="md:col-span-2"
          onChange={(value) =>
            updateMarket(setSettings, "serviceAreaNotes", value)
          }
        />
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-medium text-black">
          Location Margin Adjustments
        </h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stateRows.map(([label, key]) => (
            <NumberField
              key={key}
              label={label}
              value={market.stateAdjustments[key]}
              allowNegative
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  marketLocation: {
                    ...current.marketLocation,
                    stateAdjustments: {
                      ...current.marketLocation.stateAdjustments,
                      [key]: value,
                    },
                  },
                }))
              }
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}

function CostRulesSection({ settings, setSettings }: SectionProps) {
  const costs = settings.costRules;

  return (
    <SettingsSection
      title="Cost Rules"
      description="Controls overhead, buffers, and extra business costs that protect profit."
      footer="Pricing Calculator uses overhead and buffer rules. Projects use these rules when calculating real cost. Quotes may display or hide fees depending on proposal settings."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NumberField
          label="Monthly Overhead"
          value={costs.monthlyOverhead}
          helperText="Used later to understand how much the business needs to cover."
          onChange={(value) => updateCostRule(setSettings, "monthlyOverhead", value)}
        />
        <SelectField
          label="Overhead Allocation Method"
          value={costs.overheadAllocationMethod}
          options={["Percentage", "Flat Per Project", "Ignore For Now"]}
          onChange={(value) =>
            updateCostRule(
              setSettings,
              "overheadAllocationMethod",
              value as AppSettings["costRules"]["overheadAllocationMethod"]
            )
          }
        />
        <NumberField
          label="Default Overhead %"
          value={costs.defaultOverheadPercent}
          helperText="Adds a margin buffer to protect profit."
          onChange={(value) =>
            updateCostRule(setSettings, "defaultOverheadPercent", value)
          }
        />
        <NumberField
          label="Financing Fee %"
          value={costs.financingFeePercent}
          helperText="Can be added when offering financing."
          onChange={(value) =>
            updateCostRule(setSettings, "financingFeePercent", value)
          }
        />
        <NumberField
          label="Credit Card Fee %"
          value={costs.creditCardFeePercent}
          helperText="Can be added when customer pays by card."
          onChange={(value) =>
            updateCostRule(setSettings, "creditCardFeePercent", value)
          }
        />
        <NumberField
          label="Tax %"
          value={costs.taxPercent}
          onChange={(value) => updateCostRule(setSettings, "taxPercent", value)}
        />
        <NumberField
          label="Permit Buffer"
          value={costs.permitBuffer}
          onChange={(value) => updateCostRule(setSettings, "permitBuffer", value)}
        />
        <NumberField
          label="Miscellaneous Buffer %"
          value={costs.miscellaneousBufferPercent}
          helperText="Protects against small missed costs."
          onChange={(value) =>
            updateCostRule(setSettings, "miscellaneousBufferPercent", value)
          }
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <ToggleField
          label="Include overhead in pricing"
          checked={costs.includeOverhead}
          onChange={(value) => updateCostRule(setSettings, "includeOverhead", value)}
        />
        <ToggleField
          label="Include financing fee in pricing"
          checked={costs.includeFinancingFee}
          onChange={(value) =>
            updateCostRule(setSettings, "includeFinancingFee", value)
          }
        />
        <ToggleField
          label="Include credit card fee in pricing"
          checked={costs.includeCreditCardFee}
          onChange={(value) =>
            updateCostRule(setSettings, "includeCreditCardFee", value)
          }
        />
        <ToggleField
          label="Include tax in pricing"
          checked={costs.includeTax}
          onChange={(value) => updateCostRule(setSettings, "includeTax", value)}
        />
        <ToggleField
          label="Include miscellaneous buffer"
          checked={costs.includeMiscellaneousBuffer}
          onChange={(value) =>
            updateCostRule(setSettings, "includeMiscellaneousBuffer", value)
          }
        />
      </div>
    </SettingsSection>
  );
}

function ProposalSettingsSection({ settings, setSettings }: SectionProps) {
  const proposal = settings.proposalSettings;

  return (
    <SettingsSection
      title="Proposal Settings"
      description="Controls how client-facing proposals should look when Proposal Builder and PDFs are added."
      footer="Profit and margin should never appear on client-facing proposals by default. They are internal contractor values only."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Default Proposal Title"
          value={proposal.defaultProposalTitle}
          onChange={(value) =>
            updateProposal(setSettings, "defaultProposalTitle", value)
          }
        />
        <NumberField
          label="Default Expiration Days"
          value={proposal.defaultExpirationDays}
          min={1}
          onChange={(value) =>
            updateProposal(setSettings, "defaultExpirationDays", Math.max(1, value))
          }
        />
        <TextAreaField
          label="Default Warranty Text"
          value={proposal.defaultWarrantyText}
          className="md:col-span-2"
          onChange={(value) =>
            updateProposal(setSettings, "defaultWarrantyText", value)
          }
        />
        <TextAreaField
          label="Default Terms & Conditions"
          value={proposal.defaultTerms}
          className="md:col-span-2"
          onChange={(value) => updateProposal(setSettings, "defaultTerms", value)}
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <ToggleField
          label="Show Good / Better / Best"
          checked={proposal.showGoodBetterBest}
          onChange={(value) =>
            updateProposal(setSettings, "showGoodBetterBest", value)
          }
        />
        <ToggleField
          label="Highlight Better as Recommended"
          checked={proposal.highlightBetterRecommended}
          onChange={(value) =>
            updateProposal(setSettings, "highlightBetterRecommended", value)
          }
        />
        <ToggleField
          label="Show Profit Internally Only"
          checked={proposal.showProfitInternallyOnly}
          onChange={(value) =>
            updateProposal(setSettings, "showProfitInternallyOnly", value)
          }
        />
        <ToggleField
          label="Show Financing Note"
          checked={proposal.showFinancingNote}
          onChange={(value) => updateProposal(setSettings, "showFinancingNote", value)}
        />
        <ToggleField
          label="Show Tax Separately"
          checked={proposal.showTaxSeparately}
          onChange={(value) =>
            updateProposal(setSettings, "showTaxSeparately", value)
          }
        />
        <ToggleField
          label="Require Customer Signature"
          checked={proposal.requireCustomerSignature}
          onChange={(value) =>
            updateProposal(setSettings, "requireCustomerSignature", value)
          }
        />
      </div>

      <TextAreaField
        label="Financing Note"
        value={proposal.financingNote}
        className="mt-6"
        onChange={(value) => updateProposal(setSettings, "financingNote", value)}
      />
    </SettingsSection>
  );
}

function BrandingSection({ settings, setSettings }: SectionProps) {
  const branding = settings.branding;
  const profile = settings.companyProfile;

  return (
    <SettingsSection
      title="Branding"
      description="Controls visual identity for future proposals, PDFs, and client-facing documents."
      footer="Proposal Builder and PDF Generator will use these settings. Future emails may use the same branding."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Logo URL"
            value={branding.logoUrl}
            onChange={(value) => updateBranding(setSettings, "logoUrl", value)}
          />
          <SelectField
            label="Proposal Style"
            value={branding.proposalStyle}
            options={["Minimal", "Premium", "Contractor", "Modern"]}
            onChange={(value) =>
              updateBranding(
                setSettings,
                "proposalStyle",
                value as AppSettings["branding"]["proposalStyle"]
              )
            }
          />
          <TextField
            label="Primary Color"
            value={branding.primaryColor}
            onChange={(value) => updateBranding(setSettings, "primaryColor", value)}
          />
          <TextField
            label="Accent Color"
            value={branding.accentColor}
            onChange={(value) => updateBranding(setSettings, "accentColor", value)}
          />
          <TextField
            label="Company Tagline"
            value={branding.tagline}
            onChange={(value) => updateBranding(setSettings, "tagline", value)}
          />
          <TextAreaField
            label="Footer Text"
            value={branding.footerText}
            className="md:col-span-2"
            onChange={(value) => updateBranding(setSettings, "footerText", value)}
          />
        </div>

        <div className="rounded-lg border border-[#d9e2ec] bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Proposal Preview</p>
          <div className="mt-5 rounded-lg border border-[#d9e2ec] bg-[#f6f8fb] p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-md text-xs font-semibold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Logo
              </div>
              <div>
                <p className="font-semibold tracking-tight">
                  {profile.businessName || "Contractor Company"}
                </p>
                <p className="text-sm text-gray-500">
                  {branding.tagline || "Professional contractor proposal"}
                </p>
              </div>
            </div>
            <button
              className="mt-6 rounded-md px-4 py-3 text-sm font-medium text-white"
              style={{ backgroundColor: branding.primaryColor }}
            >
              Recommended Package
            </button>
            <p className="mt-6 border-t border-gray-100 pt-4 text-sm leading-6 text-gray-500">
              {branding.footerText || "Footer text preview"}
            </p>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

function AppPreferencesSection({ settings, setSettings }: SectionProps) {
  const preferences = settings.appPreferences;

  return (
    <SettingsSection
      title="App Preferences"
      description="Controls UI preferences for dashboard, pricing display, and future saved workflows."
      footer="Dashboard and Pricing use these display preferences. Pricing warnings can be turned on or off, and advanced breakdowns can be hidden for simpler users."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Default Landing Page"
          value={preferences.defaultLandingPage}
          options={["Dashboard", "Projects", "Pricing"]}
          onChange={(value) =>
            updatePreference(
              setSettings,
              "defaultLandingPage",
              value as AppSettings["appPreferences"]["defaultLandingPage"]
            )
          }
        />
        <SelectField
          label="Currency"
          value={preferences.currency}
          options={["USD"]}
          onChange={(value) => updatePreference(setSettings, "currency", value as "USD")}
        />
        <SelectField
          label="Number Format"
          value={preferences.numberFormat}
          options={["1,000.00", "1000.00"]}
          onChange={(value) =>
            updatePreference(
              setSettings,
              "numberFormat",
              value as AppSettings["appPreferences"]["numberFormat"]
            )
          }
        />
        <SelectField
          label="Theme"
          value={preferences.theme}
          options={["Light", "Dark", "System"]}
          onChange={(value) =>
            updatePreference(
              setSettings,
              "theme",
              value as AppSettings["appPreferences"]["theme"]
            )
          }
        />
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <ToggleField
          label="Compact Mode"
          checked={preferences.compactMode}
          onChange={(value) => updatePreference(setSettings, "compactMode", value)}
        />
        <ToggleField
          label="Show Advanced Pricing Breakdown"
          checked={preferences.showAdvancedPricingBreakdown}
          onChange={(value) =>
            updatePreference(setSettings, "showAdvancedPricingBreakdown", value)
          }
        />
        <ToggleField
          label="Show Pricing Warnings"
          checked={preferences.showPricingWarnings}
          onChange={(value) =>
            updatePreference(setSettings, "showPricingWarnings", value)
          }
        />
      </div>
    </SettingsSection>
  );
}

type SectionProps = {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
};

function SettingsSection({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#d9e2ec] bg-white p-5 sm:p-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
      {footer ? (
        <p className="mt-6 rounded-lg bg-[#f6f8fb] p-4 text-sm leading-6 text-gray-600">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  type?: "text" | "email";
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-gray-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  helperText,
  min = 0,
  max,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helperText?: string;
  min?: number;
  max?: number;
  allowNegative?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type="number"
        min={allowNegative ? undefined : min}
        max={max}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (!Number.isFinite(nextValue)) return;
          if (!allowNegative && nextValue < min) return;
          if (typeof max === "number" && nextValue > max) return;
          onChange(nextValue);
        }}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-gray-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  helperText?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-gray-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-[#d9e2ec] bg-white p-4 text-sm font-medium">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-black"
      />
    </label>
  );
}

function clampMargin(value: number) {
  return Math.min(Math.max(value, 0), 80);
}

function getValidationMessage(settings: AppSettings) {
  if (!settings.companyProfile.businessName.trim()) {
    return "Business name should not be empty.";
  }

  if (settings.proposalSettings.defaultExpirationDays < 1) {
    return "Default expiration days cannot be below 1.";
  }

  return "";
}

function updatePricingDefault<K extends keyof AppSettings["pricingDefaults"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["pricingDefaults"][K]
) {
  setSettings((current) => ({
    ...current,
    pricingDefaults: {
      ...current.pricingDefaults,
      [key]: typeof value === "number" ? clampMargin(value) : value,
    },
  }));
}

function updateMarket<K extends keyof AppSettings["marketLocation"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["marketLocation"][K]
) {
  setSettings((current) => ({
    ...current,
    marketLocation: { ...current.marketLocation, [key]: value },
  }));
}

function updateCostRule<K extends keyof AppSettings["costRules"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["costRules"][K]
) {
  setSettings((current) => ({
    ...current,
    costRules: { ...current.costRules, [key]: value },
  }));
}

function updateProposal<K extends keyof AppSettings["proposalSettings"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["proposalSettings"][K]
) {
  setSettings((current) => ({
    ...current,
    proposalSettings: { ...current.proposalSettings, [key]: value },
  }));
}

function updateBranding<K extends keyof AppSettings["branding"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["branding"][K]
) {
  setSettings((current) => ({
    ...current,
    branding: { ...current.branding, [key]: value },
  }));
}

function updatePreference<K extends keyof AppSettings["appPreferences"]>(
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
  key: K,
  value: AppSettings["appPreferences"][K]
) {
  setSettings((current) => ({
    ...current,
    appPreferences: { ...current.appPreferences, [key]: value },
  }));
}

function DataSection() {
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  function exportData() {
    const data: Record<string, unknown> = {};
    for (const key of Object.values(storageKeys)) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) data[key] = JSON.parse(raw);
      } catch {
        // skip corrupted keys
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contractor-pricing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError("");
    setImportSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const validKeys = new Set<string>(Object.values(storageKeys));
        let count = 0;
        for (const [k, v] of Object.entries(parsed)) {
          if (validKeys.has(k as string)) {
            window.localStorage.setItem(k, JSON.stringify(v));
            count++;
          }
        }
        setImportSuccess(`Imported ${count} data section${count !== 1 ? "s" : ""}. Reload the page to see changes.`);
      } catch {
        setImportError("Invalid backup file. Please export a valid JSON backup first.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function clearAllData() {
    for (const key of Object.values(storageKeys)) {
      window.localStorage.removeItem(key);
    }
    window.location.reload();
  }

  return (
    <SettingsSection
      title="Data"
      description="Export a full backup of your local data, restore from a previous backup, or clear all app data."
    >
      <div className="space-y-6">
        {/* Export */}
        <div className="rounded-lg border border-[#d9e2ec] p-5">
          <p className="text-sm font-medium text-black">Export Data</p>
          <p className="mt-1 text-sm text-gray-500">
            Download all projects, quotes, contacts, and settings as a JSON file.
          </p>
          <button
            onClick={exportData}
            className="mt-4 rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Download Backup
          </button>
        </div>

        {/* Import */}
        <div className="rounded-lg border border-[#d9e2ec] p-5">
          <p className="text-sm font-medium text-black">Import Data</p>
          <p className="mt-1 text-sm text-gray-500">
            Restore from a previously exported backup. Existing data will be overwritten.
          </p>
          <label className="mt-4 inline-block cursor-pointer rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f6f8fb]">
            Choose Backup File
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          {importError && (
            <p className="mt-3 text-sm text-red-600">{importError}</p>
          )}
          {importSuccess && (
            <p className="mt-3 text-sm text-green-700">{importSuccess}</p>
          )}
        </div>

        {/* Clear */}
        <div className="rounded-lg border border-red-100 p-5">
          <p className="text-sm font-medium text-red-700">Clear All Data</p>
          <p className="mt-1 text-sm text-gray-500">
            Permanently removes all locally stored data. This cannot be undone.
          </p>
          <button
            onClick={() => {
              if (window.confirm("Delete all app data? This cannot be undone.")) {
                clearAllData();
              }
            }}
            className="mt-4 rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
