"use client";

import { Check, ChevronDown, Pencil, Plus, RotateCcw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { ErrorPanel, PageSkeleton } from "@/components/ui/list-states";
import {
  blankTemplate,
  mergeProposalTemplates,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { TemplateEditorPanel } from "@/components/proposals/template-editor-panel";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listProposalTemplates,
  loadCompanySettings,
  saveCompanySettings,
  upsertProposalTemplate,
} from "@/lib/supabase/data";
import type {
  AppSettings,
  CompanyLevel,
  ProjectSize,
  ProjectState,
  ProposalCredentialPlacement,
  ProposalCoverLayout,
  RiskLevel,
  SettingsTrade,
  Strategy,
} from "@/lib/app-data";
import {
  companyLevelOptions,
  defaultSettings,
  mergeAppSettings,
  projectSizeOptions,
  riskLevelOptions,
  settingsTradeOptions,
  stateOptions,
  strategyOptions,
  tradeOptions,
} from "@/lib/app-data";
import { getAppSettingsValidationError } from "@/lib/settings-validation";

type Trade = SettingsTrade;
type Level = "Low" | "Medium" | "High";

type SettingsSection =
  | "Company Profile"
  | "Pricing Defaults"
  | "Pricing Thresholds"
  | "Market & Location"
  | "Cost Rules"
  | "Proposals"
  | "Branding"
  | "App Preferences"
  | "Data";

const sectionItems: SettingsSection[] = [
  "Company Profile",
  "Pricing Defaults",
  "Pricing Thresholds",
  "Market & Location",
  "Cost Rules",
  "Proposals",
  "Branding",
  "App Preferences",
  "Data",
];

const levelOptions: Level[] = ["Low", "Medium", "High"];
const credentialPlacementOptions: ProposalCredentialPlacement[] = [
  "Before Signatures",
  "After Scope",
  "Footer",
];
const coverLayoutOptions: { value: ProposalCoverLayout; label: string }[] = [
  { value: "full", label: "Full bleed (photo + overlay)" },
  { value: "half", label: "Half — photo on top" },
  { value: "square", label: "Square photo" },
  { value: "elegant", label: "Elegante" },
];

const TRADE_KEYS = tradeOptions;

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("Company Profile");
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const normalizedSavedSettings = useMemo(
    () => mergeAppSettings(savedSettings),
    [savedSettings]
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    mergeAppSettings(savedSettings)
  );
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const db = await loadCompanySettings<AppSettings | null>(supabase);
      const merged = mergeAppSettings(db ?? defaultSettings);
      setSavedSettings(merged);
      setSettings(merged);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch hydrates form state
    void loadSettings();
  }, [loadSettings]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(normalizedSavedSettings),
    [settings, normalizedSavedSettings]
  );

  const validationMessage = getAppSettingsValidationError(settings);

  function resetSettings() {
    setSettings(defaultSettings);
    setMessage("");
    saveCompanySettings(supabase, defaultSettings)
      .then(() => setSavedSettings(defaultSettings))
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Failed to reset settings")
      );
  }

  function saveSettings() {
    const validation = getAppSettingsValidationError(settings);
    if (validation) {
      setMessage(validation);
      return;
    }

    saveCompanySettings(supabase, settings)
      .then(() => {
        setSavedSettings(settings);
        setMessage("");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      })
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Failed to save settings")
      );
  }

  if (isLoading && !loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <PageSkeleton rows={5} />
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md">
            <ErrorPanel message={loadError} onRetry={() => void loadSettings()} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--brand-navy)] lg:flex">
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
              <SignOutButton layout="toolbar" />
              <button
                onClick={resetSettings}
                className="inline-flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-3 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={saveSettings}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-white transition-all duration-300 ${
                  saveStatus === "saved"
                    ? "bg-[#16a34a] hover:bg-[#15803d]"
                    : "bg-[#ff5c35] hover:bg-[#e94820]"
                }`}
              >
                {saveStatus === "saved" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
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
              {activeSection === "Pricing Thresholds" ? (
                <PricingThresholdsSection
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
              {activeSection === "Proposals" ? (
                <ProposalsSection settings={settings} setSettings={setSettings} />
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
              {activeSection === "Data" ? (
                <DataSection
                  onExportSettings={() => {
                    const blob = new Blob([JSON.stringify(settings, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `company-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onResetOnboarding={async () => {
                    const next = mergeAppSettings({ ...settings, onboardingCompletedAt: undefined });
                    setSettings(next);
                    await saveCompanySettings(supabase, next);
                    window.location.href = "/onboarding";
                  }}
                />
              ) : null}
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
  const [newCredential, setNewCredential] = useState("");

  function addCredential() {
    const name = newCredential.trim();
    if (!name) return;

    setSettings((current) => ({
      ...current,
      companyProfile: {
        ...current.companyProfile,
        certifications: [
          ...current.companyProfile.certifications,
          {
            id: `credential-${Date.now()}`,
            name,
            enabled: true,
          },
        ],
      },
    }));
    setNewCredential("");
  }

  function uploadCredentialDocument(credentialId: string, file: File) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;

      setSettings((current) => ({
        ...current,
        companyProfile: {
          ...current.companyProfile,
          certifications: current.companyProfile.certifications.map((item) =>
            item.id === credentialId
              ? {
                  ...item,
                  documentName: file.name,
                  documentType: file.type || "application/octet-stream",
                  documentDataUrl: result,
                  uploadedAt: new Date().toLocaleDateString("en-US"),
                }
              : item
          ),
        },
      }));
    };

    reader.readAsDataURL(file);
  }

  function removeCredentialDocument(credentialId: string) {
    setSettings((current) => ({
      ...current,
      companyProfile: {
        ...current.companyProfile,
        certifications: current.companyProfile.certifications.map((item) =>
          item.id === credentialId
            ? {
                ...item,
                documentName: undefined,
                documentType: undefined,
                documentDataUrl: undefined,
                uploadedAt: undefined,
              }
            : item
        ),
      },
    }));
  }

  return (
    <SettingsSection
      title="Company Profile"
      description="Basic business info used on proposals, PDFs, and pricing defaults."
    >
      {/* ── Basic fields ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Business Name"
          placeholder="GA Castro Construction LLC"
          value={profile.businessName}
          helperText="Appears on all proposals and PDFs."
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
          label="Job title / role"
          placeholder="Senior Loan Officer · Owner · Project Manager"
          value={profile.contactJobTitle}
          helperText="Shown under the contact name on the elegant proposal cover and PDF."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, contactJobTitle: value },
            }))
          }
        />
        <TextField
          label="Contact photo URL"
          placeholder="/branding/default-contact-photo.png"
          value={profile.contactPhotoUrl}
          helperText="Headshot shown on the elegant cover footer (circle). Use a public URL or path under /public."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, contactPhotoUrl: value },
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
        <SelectField
          label="Main Trade"
          value={profile.mainTrade}
          options={settingsTradeOptions}
          helperText="Default trade in the Calculator and new projects."
          tooltip="Used as the default trade when you open the Calculator or create a new project. You can always change it per job. Pick the trade that represents most of your revenue."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, mainTrade: value as Trade },
            }))
          }
        />
        <SelectField
          label="Company Level"
          value={profile.companyLevel}
          options={companyLevelOptions}
          helperText="Adds or subtracts margin points automatically."
          tooltip="Solo Owner = just you, no crew. Small Crew = 2–5 people on jobs. Established Company = 5+ years, solid reputation, repeat customers. Premium Company = recognized brand, high-end clients, premium pricing power. Established and Premium companies can typically charge more because customers trust their name."
          onChange={(value) =>
            setSettings((current) => ({
              ...current,
              companyProfile: { ...current.companyProfile, companyLevel: value as CompanyLevel },
            }))
          }
        />
      </div>

      {/* ── Advanced ── */}
      <AdvancedFields>
        <div className="grid gap-4 md:grid-cols-2">
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
          <TextField
            label="State License Number"
            value={profile.licenseNumber}
            helperText="Loaded automatically into proposals when enabled."
            tooltip="Your official state contractor license number. Find it on your license certificate or your state's Contractor Board website. Examples: CT-HIC-0123456, ROC-123456 (AZ), CGC-012345 (FL)."
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                companyProfile: { ...current.companyProfile, licenseNumber: value },
              }))
            }
          />
          <TextField
            label="Insurance Provider"
            value={profile.insuranceProvider}
            helperText="Company name shown as a proposal credential."
            tooltip="The name of your General Liability insurance company — not the policy number. Examples: Travelers, Nationwide, Zurich, The Hartford. Check your Certificate of Insurance (COI) or call your insurance agent."
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                companyProfile: { ...current.companyProfile, insuranceProvider: value },
              }))
            }
          />
        </div>

      <div className="mt-8 rounded-lg border border-[#d9e2ec] bg-[#f6f8fb] p-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <h4 className="text-sm font-semibold text-[#213343]">
              Certifications & Credentials
            </h4>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
              These are company-level defaults. Future proposals can load them
              automatically so you do not repeat this setup every time.
            </p>
          </div>
          <span className="w-fit rounded-md border border-[#d9e2ec] bg-white px-3 py-1 text-xs text-gray-500">
            Company default
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {profile.certifications.map((credential) => (
            <div
              key={credential.id}
              className="rounded-md border border-[#d9e2ec] bg-white p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <label className="flex min-w-0 items-center gap-3 font-medium">
                  <input
                    type="checkbox"
                    checked={credential.enabled}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        companyProfile: {
                          ...current.companyProfile,
                          certifications: current.companyProfile.certifications.map(
                            (item) =>
                              item.id === credential.id
                                ? { ...item, enabled: event.target.checked }
                                : item
                          ),
                        },
                      }))
                    }
                    className="h-4 w-4 flex-none accent-[#ff5c35]"
                  />
                  <span
                    className={`truncate ${
                      credential.enabled ? "text-[#213343]" : "text-gray-400"
                    }`}
                  >
                    {credential.name}
                  </span>
                </label>
                {credential.documentDataUrl ? (
                  <span className="rounded-md bg-[#f6f8fb] px-2 py-1 text-xs text-gray-500">
                    Uploaded
                  </span>
                ) : null}
              </div>

              <div className="mt-3 rounded-md border border-dashed border-[#d9e2ec] bg-[#f6f8fb] p-3">
                {credential.documentDataUrl ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#213343]">
                        {credential.documentName}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Uploaded {credential.uploadedAt}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={credential.documentDataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-medium transition hover:bg-[#f6f8fb]"
                      >
                        View
                      </a>
                      <button
                        onClick={() => removeCredentialDocument(credential.id)}
                        className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-medium transition hover:bg-[#f6f8fb]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-gray-500 transition hover:text-[#213343]">
                    <span>Upload PDF or image proof</span>
                    <span className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 font-medium">
                      Choose File
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadCredentialDocument(credential.id, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={newCredential}
            onChange={(event) => setNewCredential(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCredential();
            }}
            placeholder="Add custom certification..."
            className="min-w-0 flex-1 rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
          />
          <button
            onClick={addCredential}
            className="rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Add
          </button>
        </div>
      </div>
      </AdvancedFields>
    </SettingsSection>
  );
}

function PricingDefaultsSection({ settings, setSettings }: SectionProps) {
  const pricing = settings.pricingDefaults;

  return (
    <SettingsSection
      title="Pricing Defaults"
      description="Your starting margins for Good, Better, and Best pricing tiers. These pre-fill the Calculator — you can adjust them per job. The adjustment grids below show how trade, size, risk, strategy, and company level modify your base margin automatically."
      footer="If you're new to margin-based pricing: margin is NOT the same as markup. A 35% margin on a $10,000 job = $3,500 kept after costs. A 35% markup on $7,000 cost = $9,450 sale price = 26% margin. Always work in margins, not markups, to avoid underpricing."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NumberField
          label="Good Margin %"
          value={pricing.goodMargin}
          min={0}
          max={80}
          helperText="Budget-friendly option for price-sensitive customers."
          tooltip="Margin = what you keep after covering ALL costs. Formula: Margin % = (Sale Price − Total Cost) ÷ Sale Price × 100. At 28% margin on a $10,000 job you keep $2,800. This is your lowest-tier option — use it to stay competitive without losing money."
          onChange={(value) => updatePricingDefault(setSettings, "goodMargin", value)}
        />
        <NumberField
          label="Better Margin %"
          value={pricing.betterMargin}
          min={0}
          max={80}
          helperText="Your main option — most customers choose this."
          tooltip="Your most important number. Most customers choose the middle option, so this is your primary revenue driver. Aim to close 60%+ of bids at this tier. If you're not winning enough, your costs or market position may be off — not necessarily your margin."
          onChange={(value) =>
            updatePricingDefault(setSettings, "betterMargin", value)
          }
        />
        <NumberField
          label="Best Margin %"
          value={pricing.bestMargin}
          min={0}
          max={80}
          helperText="Premium tier — fewer customers, higher profit per job."
          tooltip="Only 20–30% of clients choose the top tier, but those who do deliver the highest profit per job. Justify it with: longer warranty, premium materials, faster timeline, or white-glove service. Never present it as 'just more expensive.'"
          onChange={(value) => updatePricingDefault(setSettings, "bestMargin", value)}
        />
        <NumberField
          label="Minimum Safe Margin %"
          value={pricing.minimumSafeMargin}
          min={0}
          max={80}
          helperText="Never price below this, even to win a job."
          tooltip="The absolute floor. At 20% on a $10k job, you keep $2,000 gross profit — barely enough to cover overhead and risk. Going below this means you might finish the job and have nothing left. Ask your accountant what your actual break-even margin is based on your P&L."
          onChange={(value) =>
            updatePricingDefault(setSettings, "minimumSafeMargin", value)
          }
        />
        <SelectField
          label="Default Strategy"
          value={pricing.defaultStrategy}
          options={strategyOptions}
          tooltip="Competitive = lower margins to win more volume (good for slow periods or new markets). Balanced = standard margins for typical jobs. Premium = higher margins for quality-focused clients who value your reputation. You can change this per job in the Calculator."
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
          tooltip="Low = straightforward job, clear scope, no unknowns. Medium = typical job with some variables. High = complex scope, unknown site conditions, callback risk, hazardous access. Higher risk adds margin points automatically to protect you from unexpected costs."
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
          tooltip="Small = roughly under $3k. Medium = $3k–$15k. Large = over $15k. Small jobs cost almost as much to mobilize as large ones (fuel, setup, crew minimum), so they carry a higher margin per dollar to cover those fixed costs."
          onChange={(value) =>
            updatePricingDefault(
              setSettings,
              "defaultProjectSize",
              value as ProjectSize
            )
          }
        />
      </div>

      <AdvancedFields>
      {/* Trade Adjustments */}
      <div>
        <h4 className="flex items-center text-sm font-medium text-black">
          Trade Adjustments %
          <InfoTip text="Each trade has a different risk profile and overhead cost. Roofing involves more liability and callbacks than painting, so it earns a higher margin. These values add or subtract percentage points from your base margin. To calibrate: look at your last 20 jobs by trade and compare your actual profit margin. Ask your accountant to pull a profit-by-trade report from your P&L." />
        </h4>
        <p className="mt-1 text-xs text-gray-500">Added to base margin per trade. Positive = more margin, negative = less. Reflects the real cost and risk difference between trades.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {(["Roofing", "Siding", "Painting", "Drywall", "Gutters", "Remodeling"] as const).map((trade) => (
            <NumberField
              key={trade}
              label={trade}
              value={pricing.tradeAdjustments[trade] ?? 0}
              allowNegative
              onChange={(value) =>
                setSettings((c) => ({ ...c, pricingDefaults: { ...c.pricingDefaults, tradeAdjustments: { ...c.pricingDefaults.tradeAdjustments, [trade]: value } } }))
              }
            />
          ))}
        </div>
      </div>

      {/* Size Adjustments */}
      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Project Size Adjustments %
          <InfoTip text="A small job (e.g., $800 gutter repair) costs almost as much to mobilize as a $12,000 job — fuel, crew time, truck, setup. So small jobs need a higher margin per dollar just to break even. Large jobs spread your fixed costs further and let you price more competitively without sacrificing profit. Set Small positive and Large slightly negative." />
        </h4>
        <p className="mt-1 text-xs text-gray-500">Small jobs have high overhead per dollar; large jobs can afford slightly lower margins. Adjust to reflect your actual mobilization costs.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["Small", "Medium", "Large"] as const).map((size) => (
            <NumberField
              key={size}
              label={size}
              value={pricing.sizeAdjustments[size] ?? 0}
              allowNegative
              onChange={(value) =>
                setSettings((c) => ({ ...c, pricingDefaults: { ...c.pricingDefaults, sizeAdjustments: { ...c.pricingDefaults.sizeAdjustments, [size]: value } } }))
              }
            />
          ))}
        </div>
      </div>

      {/* Risk Adjustments */}
      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Risk Level Adjustments %
          <InfoTip text="High risk jobs (unknown site conditions, hazardous access, complex coordination) are more likely to run over budget or generate callbacks. Adding extra margin on risky jobs protects you when things go wrong. Think about your last few problem jobs — what was the risk level, and how much did the overruns cost you?" />
        </h4>
        <p className="mt-1 text-xs text-gray-500">Extra margin buffer for riskier jobs. Covers unexpected costs, callbacks, and complexity on difficult projects.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["Low", "Medium", "High"] as const).map((risk) => (
            <NumberField
              key={risk}
              label={risk}
              value={pricing.riskAdjustments[risk] ?? 0}
              allowNegative
              onChange={(value) =>
                setSettings((c) => ({ ...c, pricingDefaults: { ...c.pricingDefaults, riskAdjustments: { ...c.pricingDefaults.riskAdjustments, [risk]: value } } }))
              }
            />
          ))}
        </div>
      </div>

      {/* Strategy Adjustments */}
      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Strategy Adjustments %
          <InfoTip text="Competitive pricing lowers your margin to win more bids — useful when you're slow or entering a new market. Premium pricing adds margin for jobs where the client values quality over price. You can switch strategy per job in the Calculator. These adjustments are applied on top of your base margins." />
        </h4>
        <p className="mt-1 text-xs text-gray-500">How aggressively you price this job. Competitive wins more bids; Premium earns more per job. You can change this per job in the Calculator.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(["Competitive", "Balanced", "Premium"] as const).map((strategy) => (
            <NumberField
              key={strategy}
              label={strategy}
              value={pricing.strategyAdjustments[strategy] ?? 0}
              allowNegative
              onChange={(value) =>
                setSettings((c) => ({ ...c, pricingDefaults: { ...c.pricingDefaults, strategyAdjustments: { ...c.pricingDefaults.strategyAdjustments, [strategy]: value } } }))
              }
            />
          ))}
        </div>
      </div>

      {/* Company Level Adjustments */}
      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Company Level Adjustments %
          <InfoTip text="A well-known, established company can charge more because customers trust their name and reduce their own risk by hiring them. A solo owner competing with larger companies may need to price more aggressively to close deals. This is also about your overhead — Premium companies have higher fixed costs that need to be covered." />
        </h4>
        <p className="mt-1 text-xs text-gray-500">Established and premium companies command higher prices due to reputation, trust, and overhead. Adjust to match where your company stands.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(["Solo Owner", "Small Crew", "Established Company", "Premium Company"] as const).map((level) => (
            <NumberField
              key={level}
              label={level}
              value={pricing.companyAdjustments[level] ?? 0}
              allowNegative
              onChange={(value) =>
                setSettings((c) => ({ ...c, pricingDefaults: { ...c.pricingDefaults, companyAdjustments: { ...c.pricingDefaults.companyAdjustments, [level]: value } } }))
              }
            />
          ))}
        </div>
      </div>
      </AdvancedFields>
    </SettingsSection>
  );
}

function MarketLocationSection({ settings, setSettings }: SectionProps) {
  const market = settings.marketLocation;
  const stateRows = stateOptions.map((state) => [state, state] as const);

  return (
    <SettingsSection
      title="Market & Location"
      description="Helps the app understand your local market. Your default location pre-fills the Calculator, and the state adjustments ensure your pricing reflects regional cost differences — what's profitable in Texas may not be profitable in California."
      footer="State adjustments are pre-loaded based on regional construction cost data. You can override any state based on your own experience. If you work exclusively in one state, you can leave the others at their defaults."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Default State"
          value={market.defaultState}
          options={stateOptions}
          helperText="Pre-filled in the Calculator for every new job."
          onChange={(value) =>
            updateMarket(setSettings, "defaultState", value as ProjectState)
          }
        />
        <TextField
          label="Default City"
          value={market.defaultCity}
          onChange={(value) => updateMarket(setSettings, "defaultCity", value)}
        />
      </div>

      <AdvancedFields>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Default ZIP Code"
            value={market.defaultZipCode}
            onChange={(value) => updateMarket(setSettings, "defaultZipCode", value)}
          />
          <SelectField
            label="Market Competitiveness"
            value={market.marketCompetitiveness}
            options={levelOptions}
            tooltip="How many other contractors compete for the same jobs in your area? High = lots of competitors bidding on every job, pricing must be sharp. Low = you're one of few qualified options, giving you more pricing power. This is informational — used to contextualize your strategy."
            onChange={(value) =>
              updateMarket(setSettings, "marketCompetitiveness", value as Level)
            }
          />
          <SelectField
            label="Customer Price Sensitivity"
            value={market.customerPriceSensitivity}
            options={levelOptions}
            tooltip="Are your typical customers price-shoppers or quality-focused? High = they get 3+ bids and pick the cheapest. Low = they value your reputation and won't balk at premium prices. If most clients ask 'can you do it cheaper?', set this to High."
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

        <div>
          <h4 className="flex items-center text-sm font-medium text-black">
            State Margin Adjustments %
            <InfoTip text="Construction labor costs, material prices, and market expectations vary significantly by state. California and New York average 15–20% above the national baseline; Mississippi and Arkansas run 10–15% below. Positive values = you can charge more in that state. Negative = be more price-competitive. Based on Bureau of Labor Statistics regional construction wage data and RSMeans Cost Data. You can override any value based on your own experience in that market." />
          </h4>
          <p className="mt-1 text-xs text-gray-500">Adds or subtracts margin points based on the project&apos;s state. Reflects regional labor costs and market pricing power.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stateRows.map(([label, key]) => (
              <NumberField
                key={key}
                label={label}
                value={market.stateAdjustments[key as ProjectState] ?? 0}
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
      </AdvancedFields>
    </SettingsSection>
  );
}

function CostRulesSection({ settings, setSettings }: SectionProps) {
  const costs = settings.costRules;

  return (
    <SettingsSection
      title="Cost Rules"
      description="These numbers protect your profit by making sure every job covers its full cost — not just materials and labor, but overhead, fees, and the small costs that add up. Most contractors undercharge because they forget to include these."
      footer="Start with estimates if you don't have exact numbers — you can refine them over time. Your accountant can pull your actual overhead and labor burden from your P&L and payroll reports. The toggles below control which costs are actively included in your pricing calculations."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NumberField
          label="Monthly Overhead ($)"
          value={costs.monthlyOverhead}
          helperText="All fixed business costs not tied to specific jobs."
          tooltip="Add up: rent or office lease, vehicle payments (trucks, trailers), insurance premiums, phone and internet, software subscriptions, tools and equipment payments, any salaried office staff. Run your P&L report with your accountant — look for 'Total Fixed Expenses' per month. If you're not sure, start with a rough estimate and refine it."
          onChange={(value) => updateCostRule(setSettings, "monthlyOverhead", value)}
        />
        <NumberField
          label="Labor Burden %"
          value={costs.laborBurdenPercent}
          helperText="True cost of labor beyond base wages."
          tooltip="The real cost of an employee beyond their base hourly wage. Includes: FICA payroll taxes (~7.65%), workers' compensation insurance (3–10%), federal/state unemployment insurance (~3%), health benefits if provided, paid time off, and any supervision cost. Industry average: 18–28%. Ask your payroll provider or accountant for your exact 'loaded labor rate' — it's on your payroll reports."
          onChange={(value) =>
            updateCostRule(setSettings, "laborBurdenPercent", value)
          }
        />
        <NumberField
          label="Minimum Job Price ($)"
          value={costs.minimumJobPrice}
          helperText="Never sell a job below this price."
          tooltip="The absolute lowest you'll charge for any job, regardless of what the math suggests. Even tiny jobs have irreducible costs: fuel, crew minimum, setup, cleanup, billing time. Set this based on your minimum half-day rate. Example: if your crew costs $400/half-day and you need 30% margin, your minimum job price should be at least $570."
          onChange={(value) =>
            updateCostRule(setSettings, "minimumJobPrice", value)
          }
        />
        <NumberField
          label="Miscellaneous Buffer %"
          value={costs.miscellaneousBufferPercent}
          helperText="Safety net for small missed costs."
          tooltip="A catch-all for small costs that are easy to forget: extra hardware, touch-up paint, caulk, fuel for additional trips, minor disposal overages. Industry standard: 3–7%. This is added to your job cost before calculating margin — it's the difference between 'I priced it right' and 'where did my profit go?'"
          onChange={(value) =>
            updateCostRule(setSettings, "miscellaneousBufferPercent", value)
          }
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <ToggleField
          label="Include overhead in pricing"
          checked={costs.includeOverhead}
          tooltip="When ON, the overhead allocation (% or flat amount) is added to the job cost before calculating your sale price. Recommended: ON. Turning it off means your margin must cover overhead on its own, which requires higher base margins."
          onChange={(value) => updateCostRule(setSettings, "includeOverhead", value)}
        />
        <ToggleField
          label="Include miscellaneous buffer"
          checked={costs.includeMiscellaneousBuffer}
          tooltip="When ON, the miscellaneous buffer % is added to the job cost before calculating your price. Highly recommended — this covers the small costs that always seem to appear (extra materials, hardware runs, disposal). Turning it off means your margin must cover these surprises."
          onChange={(value) =>
            updateCostRule(setSettings, "includeMiscellaneousBuffer", value)
          }
        />
      </div>

      <AdvancedFields>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Overhead Allocation Method"
          value={costs.overheadAllocationMethod}
          options={[
            "Percentage",
            "Flat Per Project",
            "Project Duration",
            "Ignore For Now",
          ]}
          tooltip="How to spread your monthly overhead across jobs. Percentage: adds X% to every job's direct cost (simplest, most common). Flat Per Project: adds a fixed dollar amount per job regardless of size. Project Duration: divides monthly overhead by billable days to get a daily rate per project. Ignore For Now: skip overhead allocation and rely on your margin instead. Ask your accountant which matches your bookkeeping method."
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
          helperText="Used with the Percentage allocation method."
          tooltip="What % of each job's direct cost (materials + labor) goes toward overhead. Example: 10% on a $5,000 cost job = $500 overhead charge added to cost. To calculate yours: divide your monthly overhead by your monthly revenue, then multiply by 100. Your accountant can pull this from your income statement."
          onChange={(value) =>
            updateCostRule(setSettings, "defaultOverheadPercent", value)
          }
        />
        <NumberField
          label="Flat Overhead Per Project ($)"
          value={costs.flatOverheadPerProject}
          helperText="Used with the Flat Per Project allocation method."
          tooltip="A fixed dollar amount added to every job regardless of its size. Example: $400 per project. Works best when your jobs are similar in size and duration. If your jobs vary widely in scope, the Percentage method may be more accurate."
          onChange={(value) =>
            updateCostRule(setSettings, "flatOverheadPerProject", value)
          }
        />
        <NumberField
          label="Monthly Billable Days"
          value={costs.monthlyBillableDays}
          helperText="Actual days your crew works on paid jobs per month."
          tooltip="How many days per month your crew actually works on paying jobs — not admin days, training, callbacks, or travel. Typical range: 18–22 days. Used to calculate your daily overhead rate when using the Project Duration method. Formula: Monthly Overhead ÷ Billable Days = Daily Overhead Rate."
          min={1}
          onChange={(value) =>
            updateCostRule(setSettings, "monthlyBillableDays", Math.max(1, value))
          }
        />
        <NumberField
          label="Default Project Duration (days)"
          value={costs.defaultProjectDurationDays}
          helperText="Default job length used in overhead calculations."
          tooltip="How long a typical job takes in calendar days. Used by the Project Duration overhead method (Daily Rate × Duration Days = Overhead Per Job). Can be overridden per project. If your jobs vary widely, set this to your most common duration."
          min={1}
          onChange={(value) =>
            updateCostRule(
              setSettings,
              "defaultProjectDurationDays",
              Math.max(1, value)
            )
          }
        />
        <NumberField
          label="Financing Fee %"
          value={costs.financingFeePercent}
          helperText="Dealer fee charged by financing partners."
          tooltip="If you partner with a financing company (GreenSky, Synchrony, Foundation Finance, etc.), they charge you a dealer fee of 2–8% of the financed amount. This fee gets passed into the price when financing is offered. Enable it in the toggles below to include it automatically."
          onChange={(value) =>
            updateCostRule(setSettings, "financingFeePercent", value)
          }
        />
        <NumberField
          label="Credit Card Fee %"
          value={costs.creditCardFeePercent}
          helperText="Processing fee charged by card payment providers."
          tooltip="Payment processors (Square, Stripe, QuickBooks Payments, etc.) charge 2.6–3.5% per transaction. Enable this in the toggles below to automatically build card fees into your price when the customer pays by card. Common rates: Square 2.6% + 10¢, Stripe 2.9% + 30¢."
          onChange={(value) =>
            updateCostRule(setSettings, "creditCardFeePercent", value)
          }
        />
        <NumberField
          label="Tax %"
          value={costs.taxPercent}
          helperText="Sales tax on materials or services, if applicable."
          tooltip="Sales tax on materials or services, if required in your state. Many states do not charge sales tax on contractor labor — only on materials. Laws vary widely. Ask your accountant or check your state's Department of Revenue website before enabling this. Set to 0 if unsure."
          onChange={(value) => updateCostRule(setSettings, "taxPercent", value)}
        />
        <NumberField
          label="Permit Buffer ($)"
          value={costs.permitBuffer}
          helperText="Flat dollar amount reserved for permit costs."
          tooltip="Average permit cost for a typical project in your area. Usually $100–$500 for residential work, more for commercial. Check your local municipality's building department fee schedule. Set to 0 if you bill permits separately as a line item on your proposals."
          onChange={(value) => updateCostRule(setSettings, "permitBuffer", value)}
        />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleField
            label="Include financing fee in pricing"
            checked={costs.includeFinancingFee}
            tooltip="When ON, the financing fee % is added to the job cost, which raises the sale price slightly. Only affects jobs where financing is offered. Turn ON if you routinely offer financing through a lending partner."
            onChange={(value) =>
              updateCostRule(setSettings, "includeFinancingFee", value)
            }
          />
          <ToggleField
            label="Include credit card fee in pricing"
            checked={costs.includeCreditCardFee}
            tooltip="When ON, the credit card fee % is added to the job cost, which raises the sale price. Only applicable when the customer pays by card. Turn ON if most of your customers pay by card and you absorb the processing fee."
            onChange={(value) =>
              updateCostRule(setSettings, "includeCreditCardFee", value)
            }
          />
          <ToggleField
            label="Include tax in pricing"
            checked={costs.includeTax}
            tooltip="When ON, the tax % is added on top of the sale price. Only enable this if your state requires you to collect sales tax on contractor work or materials. Check with your accountant first — many contractor services are tax-exempt."
            onChange={(value) => updateCostRule(setSettings, "includeTax", value)}
          />
        </div>
      </AdvancedFields>
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
          tooltip="The title printed at the top of every new proposal. Examples: 'Project Proposal', 'Roofing Estimate', 'Home Improvement Proposal'. You can change it per quote."
          onChange={(value) =>
            updateProposal(setSettings, "defaultProposalTitle", value)
          }
        />
        <NumberField
          label="Default Expiration Days"
          value={proposal.defaultExpirationDays}
          min={1}
          helperText="How long a new quote stays valid before expiring."
          tooltip="Proposals expire to protect you from clients accepting an old price after material or labor costs have changed. Industry standard: 14–30 days. Short expirations create urgency; long ones reduce friction. You can always extend per quote."
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
          label="Show Good / Better / Best options"
          checked={proposal.showGoodBetterBest}
          tooltip="When ON, proposals show three price options side-by-side. This is the recommended approach — it anchors the client to the middle option and increases your average sale value. Studies show 3-tier pricing increases revenue vs. single-price proposals."
          onChange={(value) =>
            updateProposal(setSettings, "showGoodBetterBest", value)
          }
        />
        <ToggleField
          label="Highlight Better as Recommended"
          checked={proposal.highlightBetterRecommended}
          tooltip="When ON, the middle (Better) option gets a 'Recommended' badge on the proposal. This nudges most clients toward your primary revenue option. Recommended: keep this ON unless your clients specifically prefer non-directed proposals."
          onChange={(value) =>
            updateProposal(setSettings, "highlightBetterRecommended", value)
          }
        />
        <ToggleField
          label="Keep profit & margin internal only"
          checked={proposal.showProfitInternallyOnly}
          tooltip="When ON, your margin %, profit amount, and cost breakdown are NEVER shown to the customer — only the sale price. This should always be ON. Clients don't need to see your profit; showing it creates unnecessary negotiation pressure."
          onChange={(value) =>
            updateProposal(setSettings, "showProfitInternallyOnly", value)
          }
        />
        <ToggleField
          label="Show financing note on proposals"
          checked={proposal.showFinancingNote}
          tooltip="When ON, a financing note is printed on the proposal (you can customize the text below). Use this if you offer payment plans or partner with a financing company. It can help close larger jobs."
          onChange={(value) => updateProposal(setSettings, "showFinancingNote", value)}
        />
        <ToggleField
          label="Show tax as a separate line item"
          checked={proposal.showTaxSeparately}
          tooltip="When ON, sales tax is shown as a separate line on the proposal instead of being included in the price. Some clients and states prefer transparency. Turn OFF if your price already includes tax or if tax doesn't apply in your state."
          onChange={(value) =>
            updateProposal(setSettings, "showTaxSeparately", value)
          }
        />
        <ToggleField
          label="Require customer signature"
          checked={proposal.requireCustomerSignature}
          tooltip="When ON, the proposal includes a signature line for the customer to sign and date. A signed proposal is a basic form of authorization — it's not a legal contract, but it confirms the customer agreed to the scope and price. Recommended: ON."
          onChange={(value) =>
            updateProposal(setSettings, "requireCustomerSignature", value)
          }
        />
        <ToggleField
          label="Show certifications & credentials"
          checked={proposal.showCertifications}
          tooltip="When ON, your license number, insurance badges, and certifications appear on the proposal. This builds trust and differentiates you from unlicensed competitors. Strongly recommended for all proposals — customers often choose the contractor they perceive as most legitimate."
          onChange={(value) =>
            updateProposal(setSettings, "showCertifications", value)
          }
        />
        <ToggleField
          label="Show license number on proposals"
          checked={proposal.showLicenseNumber}
          tooltip="When ON, your state contractor license number is printed on the proposal. In many states this is legally required on any written estimate or contract. Check your state's contractor licensing requirements."
          onChange={(value) =>
            updateProposal(setSettings, "showLicenseNumber", value)
          }
        />
        <ToggleField
          label="Show insurance credentials"
          checked={proposal.showInsuranceBadges}
          tooltip="When ON, your insurance provider and coverage types (General Liability, Workers' Comp) are shown on the proposal. Customers increasingly ask 'are you insured?' — showing it proactively removes that objection before they even ask."
          onChange={(value) =>
            updateProposal(setSettings, "showInsuranceBadges", value)
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SelectField
          label="Credential Placement"
          value={proposal.credentialPlacement}
          options={credentialPlacementOptions}
          helperText="Controls where Proposal Builder should place company credentials later."
          onChange={(value) =>
            updateProposal(
              setSettings,
              "credentialPlacement",
              value as ProposalCredentialPlacement
            )
          }
        />
        <TextAreaField
          label="Financing Note"
          value={proposal.financingNote}
          onChange={(value) => updateProposal(setSettings, "financingNote", value)}
        />
      </div>

      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Pricing Option Descriptions
          <InfoTip text="Short taglines that appear under each price on the proposal. Keep them benefit-focused, not feature-focused. Good: 'Budget-friendly option with core coverage.' Better: 'Our most popular package — great balance of value and quality.' Best: 'Premium materials and extended warranty for lasting peace of mind.'" />
        </h4>
        <p className="mt-1 text-xs text-gray-500">One line of text shown under each price tier in customer-facing proposals. Focus on the benefit the customer gets, not the price difference.</p>
        <div className="mt-4 grid gap-4">
          <TextField
            label="Good — tagline"
            value={proposal.goodDescription ?? ""}
            tooltip="Keep this short and honest. The customer choosing 'Good' is budget-conscious — validate their choice. Example: 'A reliable, professional solution at the most accessible price.'"
            onChange={(value) => updateProposal(setSettings, "goodDescription", value)}
          />
          <TextField
            label="Better — tagline"
            value={proposal.betterDescription ?? ""}
            tooltip="This is your most important tier — most clients choose it. Make it sound like the smart, balanced choice. Example: 'Our most popular option — the right balance of quality and value.'"
            onChange={(value) => updateProposal(setSettings, "betterDescription", value)}
          />
          <TextField
            label="Best — tagline"
            value={proposal.bestDescription ?? ""}
            tooltip="Justify the premium with a tangible benefit: longer warranty, better materials, faster timeline, or white-glove service. Example: 'Premium materials and our longest warranty — built to last.'"
            onChange={(value) => updateProposal(setSettings, "bestDescription", value)}
          />
        </div>
      </div>

      <div className="mt-8">
        <h4 className="flex items-center text-sm font-medium text-black">
          Default Included Services
          <InfoTip text="These appear as pre-checked items in the 'What's Included' section of new quotes. Keep them accurate — don't promise what you don't deliver. Common defaults: Materials, Labor, Cleanup, Disposal, Warranty, Licensed & Insured. You can customize per trade in Content Defaults." />
        </h4>
        <p className="mt-1 text-xs text-gray-500">One item per line. Pre-checked by default on every new quote. Customers see these in the proposal.</p>
        <textarea
          value={(proposal.defaultIncludedServices ?? []).join("\n")}
          onChange={(e) =>
            setSettings((c) => ({
              ...c,
              proposalSettings: {
                ...c.proposalSettings,
                defaultIncludedServices: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              },
            }))
          }
          className="mt-3 min-h-36 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
        />
      </div>
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
          <label className="block text-sm font-medium">
            <span className="flex items-center">Default Cover Layout</span>
            <select
              value={branding.proposalCoverLayout}
              onChange={(event) =>
                updateBranding(
                  setSettings,
                  "proposalCoverLayout",
                  event.target.value as ProposalCoverLayout
                )
              }
              className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            >
              {coverLayoutOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs leading-5 text-gray-500">
              Loaded as the starting cover layout in future proposal previews.
            </span>
          </label>
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

function AdvancedFields({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8 border-t border-dashed border-[#d9e2ec] pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium text-gray-400 transition hover:text-gray-700"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        {open ? "Hide advanced settings" : "Show advanced settings"}
      </button>
      {open && <div className="mt-6 space-y-8">{children}</div>}
    </div>
  );
}

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

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative ml-1.5 inline-flex shrink-0 align-middle">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d9e2ec] bg-[#f6f8fb] text-[9px] font-bold text-[#9CA3AF] transition hover:border-[#9CA3AF] hover:text-[#6B7280]"
        aria-label="More info"
      >
        i
      </button>
      {open && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-72 -translate-x-1/2 rounded-lg border border-[#d9e2ec] bg-white p-3.5 text-xs font-normal leading-relaxed text-[#374151] shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  tooltip,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  tooltip?: string;
  type?: "text" | "email";
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      <span className="flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
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
  tooltip,
  min = 0,
  max,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  helperText?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  allowNegative?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
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
  tooltip,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  helperText?: string;
  tooltip?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
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
  tooltip,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  tooltip?: string;
}) {
  return (
    <label className={`block text-sm font-medium ${className}`}>
      <span className="flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
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
  tooltip,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  tooltip?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-[#d9e2ec] bg-white p-4 text-sm font-medium">
      <span className="flex items-center">
        {label}
        {tooltip && <InfoTip text={tooltip} />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#ff5c35]"
      />
    </label>
  );
}

function PricingThresholdsSection({ settings, setSettings }: SectionProps) {
  const t = settings.pricingThresholds ?? defaultSettings.pricingThresholds;
  const set = (key: keyof AppSettings["pricingThresholds"], value: number) =>
    setSettings((c) => ({ ...c, pricingThresholds: { ...(c.pricingThresholds ?? defaultSettings.pricingThresholds), [key]: value } }));

  return (
    <SettingsSection
      title="Pricing Thresholds"
      description="Controls the color-coded status badges (Red, Yellow, Green) and advisory warnings in the Calculator. These don't block you from pricing — they're guardrails to help you stay profitable."
      footer="The defaults work well for most contractors. Only change these if the badges are firing too often (lower the thresholds) or not enough (raise them). When in doubt, leave them at the defaults and revisit after a few months of use."
    >
      <div className="mt-2">
        <h4 className="text-sm font-medium text-black">Status Thresholds</h4>
        <p className="mt-1 text-xs text-gray-500">Margins below these values trigger the corresponding status labels.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <NumberField label="Risky below %" value={t.riskyMarginPercent} min={0} max={80} onChange={(v) => set("riskyMarginPercent", v)} helperText="Margin below this = Risky (red badge)" tooltip="If a job's margin falls below this number, the app shows a red 'Risky' badge. Default: 25%. Example: on a $10k job, margin below 25% means less than $2,500 gross profit — often not enough to cover overhead and risk." />
          <NumberField label="Tight below %" value={t.tightMarginPercent} min={0} max={80} onChange={(v) => set("tightMarginPercent", v)} helperText="Margin below this = Tight (yellow badge)" tooltip="If margin is above 'Risky' but still below this threshold, the app shows a yellow 'Tight' badge. Default: 35%. Use this as a nudge to push your prices a bit higher — you're covering costs but not thriving." />
          <NumberField label="Safe price cushion %" value={t.safePriceCushionPercent} min={0} max={30} onChange={(v) => set("safePriceCushionPercent", v)} helperText="Extra % above min margin required for green status" tooltip="How far above the minimum safe margin a price needs to be before showing a green badge. Example: if minimum safe margin is 20% and cushion is 8%, you need a 28%+ margin for green. This prevents borderline jobs from looking 'safe' when they're actually just scraping by." />
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-medium text-black">Margin Clamp Limits</h4>
        <p className="mt-1 text-xs text-gray-500">Hard floor and ceiling for any calculated margin.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <NumberField label="Minimum margin %" value={t.marginClampMinPercent} min={0} max={50} onChange={(v) => set("marginClampMinPercent", v)} helperText="Hard floor — no option can drop below this" tooltip="Hard floor. Even if all adjustments (trade, state, risk, etc.) push the margin lower, no pricing option will ever go below this number. Prevents accidentally pricing below your costs due to stacked negative adjustments." />
          <NumberField label="Maximum margin %" value={t.marginClampMaxPercent} min={30} max={90} onChange={(v) => set("marginClampMaxPercent", v)} helperText="Hard ceiling — no option can exceed this" tooltip="Hard ceiling. Prevents the app from recommending unrealistically high prices that could embarrass you or lose bids. If you find yourself capping out, your base margins or adjustments may be set too high." />
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-medium text-black">Minimum Safe Margin Bonuses</h4>
        <p className="mt-1 text-xs text-gray-500">Extra margin added to the minimum safe price for riskier jobs.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <NumberField label="High risk bonus %" value={t.safeMarginRiskBonusPercent} min={0} max={15} onChange={(v) => set("safeMarginRiskBonusPercent", v)} helperText="Added to the minimum safe margin for High risk jobs" tooltip="Extra margin buffer applied specifically to High risk jobs when calculating the minimum safe price. A High risk job has more chance of overruns, callbacks, or complications — this bonus ensures you have enough cushion to absorb those without going underwater." />
          <NumberField label="Small job bonus %" value={t.safeMarginSmallBonusPercent} min={0} max={15} onChange={(v) => set("safeMarginSmallBonusPercent", v)} helperText="Added to the minimum safe margin for Small jobs" tooltip="Small jobs (under ~$3k) have proportionally higher fixed costs — driving there, setup, minimum crew time. This bonus raises the minimum safe price so even small jobs cover those unavoidable costs." />
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-medium text-black">Warning Thresholds</h4>
        <p className="mt-1 text-xs text-gray-500">Trigger advisory messages in the Calculator.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NumberField label="Warn margin low %" value={t.warningMarginLowPercent} min={0} max={80} onChange={(v) => set("warningMarginLowPercent", v)} helperText={'Advisory shown when Better margin falls below this'} tooltip="If the Better (middle) option's margin falls below this number, the Calculator shows an advisory warning. It doesn't block pricing — it's a nudge to reconsider. Lower this if the warnings are too frequent; raise it if you want a stricter alert." />
          <NumberField label="Warn margin high %" value={t.warningMarginHighPercent} min={0} max={90} onChange={(v) => set("warningMarginHighPercent", v)} helperText={'Advisory shown when any margin is unusually high'} tooltip="If any pricing option's margin exceeds this, the app flags it. Very high margins can mean you're overpriced and losing bids you could have won. A warning here is a sanity check — not a hard stop." />
          <NumberField label="Warn commission %" value={t.warningCommissionPercent} min={0} max={30} onChange={(v) => set("warningCommissionPercent", v)} helperText="Advisory if sales commission exceeds this % of price" tooltip="If the sales commission you enter in the Calculator exceeds this % of the sale price, the app warns you. Helps prevent high commissions from silently eroding your margin." />
          <NumberField label="Warn fees % of profit" value={t.warningFeeProfitPercent} min={0} max={50} onChange={(v) => set("warningFeeProfitPercent", v)} helperText="Advisory if financing/card fees eat more than this % of profit" tooltip="If financing or credit card fees consume more than this percentage of your gross profit, the app warns you. Example: at 10%, if your profit is $1,000 but fees are $120, you'll see a warning — the fees are too large relative to what you're keeping." />
        </div>
      </div>
    </SettingsSection>
  );
}


function ContentDefaultsSection({ settings, setSettings }: SectionProps) {
  const content = settings.contentDefaults ?? defaultSettings.contentDefaults;

  return (
    <SettingsSection
      title="Content Defaults"
      description="Default service items and scope templates loaded when creating quotes per trade."
      footer="Trade services appear as suggestion checkboxes in the quote sidebar. Scope templates are pre-written text options the wizard can insert. One item per line."
    >
      <div>
        <h4 className="text-sm font-medium text-black">Trade Service Items</h4>
        <p className="mt-1 text-xs text-gray-500">One item per line. These are the suggested services shown in the quote sidebar per trade.</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TRADE_KEYS.map((trade) => (
            <label key={trade} className="block text-sm font-medium">
              {trade}
              <textarea
                value={(content.tradeServices[trade] ?? []).join("\n")}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    contentDefaults: {
                      ...(c.contentDefaults ?? defaultSettings.contentDefaults),
                      tradeServices: {
                        ...(c.contentDefaults ?? defaultSettings.contentDefaults).tradeServices,
                        [trade]: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                      },
                    },
                  }))
                }
                className="mt-2 min-h-40 w-full resize-none rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#ff5c35]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h4 className="text-sm font-medium text-black">Scope Templates</h4>
        <p className="mt-1 text-xs text-gray-500">One template per line. The wizard shows these as quick-select options for the scope of work.</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {TRADE_KEYS.map((trade) => (
            <label key={trade} className="block text-sm font-medium">
              {trade}
              <textarea
                value={(content.scopeTemplates[trade] ?? []).join("\n---\n")}
                onChange={(e) =>
                  setSettings((c) => ({
                    ...c,
                    contentDefaults: {
                      ...(c.contentDefaults ?? defaultSettings.contentDefaults),
                      scopeTemplates: {
                        ...(c.contentDefaults ?? defaultSettings.contentDefaults).scopeTemplates,
                        [trade]: e.target.value.split("\n---\n").map((s) => s.trim()).filter(Boolean),
                      },
                    },
                  }))
                }
                className="mt-2 min-h-48 w-full resize-none rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#ff5c35]"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">Separate each template with a line containing only <code>---</code></p>
      </div>
    </SettingsSection>
  );
}

function clampMargin(value: number) {
  return Math.min(Math.max(value, 0), 80);
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

type ProposalTab = "templates" | "content" | "settings";

function ProposalsSection({ settings, setSettings }: SectionProps) {
  const [tab, setTab] = useState<ProposalTab>("templates");

  const tabs: { id: ProposalTab; label: string; description: string }[] = [
    { id: "templates", label: "Templates", description: "Full proposal documents sent to clients" },
    { id: "content",   label: "Content Snippets", description: "Service lists and scope text for the quote builder" },
    { id: "settings",  label: "Settings", description: "Proposal format, expiration, and display options" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#d9e2ec] bg-[#f5f8fa] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-[#213343] shadow-sm"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Tab description */}
      <p className="mb-6 text-sm text-gray-400">
        {tabs.find((t) => t.id === tab)?.description}
      </p>

      {tab === "templates" && <TemplatesSection />}
      {tab === "content"   && <ContentDefaultsSection settings={settings} setSettings={setSettings} />}
      {tab === "settings"  && <ProposalSettingsSection settings={settings} setSettings={setSettings} />}
    </div>
  );
}

const TEMPLATE_SECTION_KEYS = [
  "cover",
  "executiveSummary",
  "existingConditions",
  "scopeOfWork",
  "materialsSpecs",
  "timeline",
  "pricing",
  "warranty",
  "terms",
  "acceptance",
] as const;

const TEMPLATE_SECTION_LABELS: Record<string, string> = {
  cover: "Cover",
  executiveSummary: "Summary",
  existingConditions: "Conditions",
  scopeOfWork: "Scope",
  materialsSpecs: "Materials",
  timeline: "Timeline",
  pricing: "Pricing",
  warranty: "Warranty",
  terms: "Terms",
  acceptance: "Acceptance",
};

function ProposalThumbnail({ template }: { template: ProposalTemplate }) {
  const enabledSections = TEMPLATE_SECTION_KEYS.filter(
    (k) => template[k].enabled
  );

  return (
    <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: "3/4" }}>
      {/* Cover area */}
      <div className="relative flex flex-col bg-[#1a2733]" style={{ height: "38%" }}>
        <div className="h-[3px] w-full bg-[#ff5c35]" />
        <div className="flex flex-1 flex-col justify-center px-4 pb-2 pt-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#ff5c35]/80">
            Proposal
          </p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-white">
            {template.trade}
          </p>
          {template.cover.tagline && (
            <p className="mt-0.5 line-clamp-1 text-[7px] text-white/40">
              {template.cover.tagline}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-1.5">
          <div className="h-[3px] w-10 rounded-full bg-white/10" />
          <div className="h-[3px] w-5 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Content wireframe */}
      <div className="flex flex-col gap-2 bg-white px-4 py-3" style={{ height: "62%" }}>
        {/* Section 1 — heading + lines */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-[3px] w-[3px] rounded-full bg-[#ff5c35]" />
            <div className="h-[3px] w-14 rounded-full bg-[#213343]/20" />
          </div>
          <div className="h-[2px] w-full rounded-full bg-gray-100" />
          <div className="h-[2px] w-4/5 rounded-full bg-gray-100" />
          <div className="h-[2px] w-3/5 rounded-full bg-gray-100" />
        </div>

        {/* Section 2 — 2-col grid */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="rounded bg-[#f5f8fa] p-1.5">
            <div className="mb-1 h-[3px] w-8 rounded-full bg-[#213343]/15" />
            <div className="h-[2px] w-full rounded-full bg-gray-100" />
            <div className="mt-0.5 h-[2px] w-3/4 rounded-full bg-gray-100" />
          </div>
          <div className="rounded bg-[#f5f8fa] p-1.5">
            <div className="mb-1 h-[3px] w-6 rounded-full bg-[#213343]/15" />
            <div className="h-[2px] w-full rounded-full bg-gray-100" />
            <div className="mt-0.5 h-[2px] w-2/3 rounded-full bg-gray-100" />
          </div>
        </div>

        {/* Section 3 — table rows */}
        <div className="space-y-0.5">
          {[90, 75, 85, 60].map((w, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-[2px] w-[2px] rounded-full bg-[#ff5c35]/50 shrink-0" />
              <div
                className="h-[2px] rounded-full bg-gray-100"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>

        {/* Footer line */}
        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-1.5">
          <div className="h-[2px] w-12 rounded-full bg-gray-100" />
          <div className="h-[2px] w-6 rounded-full bg-gray-100" />
        </div>
      </div>

      {/* Enabled section count badge */}
      <div className="absolute bottom-2 right-2 rounded bg-[#213343]/80 px-1.5 py-0.5">
        <p className="text-[7px] font-semibold text-white">
          {enabledSections.length}/10
        </p>
      </div>
    </div>
  );
}

function TemplatesSection() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [savedTemplates, setSavedTemplates] = useState<ProposalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const templates = useMemo(() => mergeProposalTemplates(savedTemplates), [savedTemplates]);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradeError, setNewTradeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const db = await listProposalTemplates(supabase);
        if (cancelled) return;
        setSavedTemplates(db);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load templates");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function handleSave(updated: ProposalTemplate) {
    upsertProposalTemplate(supabase, updated)
      .then(() => {
        setSavedTemplates((prev) => {
          const idx = prev.findIndex((t) => t.trade === updated.trade);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
        setEditingTemplate(null);
      })
      .catch(() => undefined);
  }

  function handleDelete(template: ProposalTemplate) {
    // For now just remove locally; server delete can be added once you want it.
    setSavedTemplates((prev) => prev.filter((t) => t.trade !== template.trade));
  }

  function handleCreateNew() {
    const name = newTradeName.trim();
    if (!name) { setNewTradeError("Enter a name for your template."); return; }
    if (name.length < 2) { setNewTradeError("Name must be at least 2 characters."); return; }
    const id = `custom-${Math.random().toString(36).slice(2, 10)}`;
    const fresh: ProposalTemplate = {
      ...blankTemplate(name),
      id,
      name: `${name} Proposal`,
    };
    setShowNewModal(false);
    setNewTradeName("");
    setNewTradeError("");
    setEditingTemplate(fresh);
  }

  return (
    <>
      <SettingsSection
        title="Proposal Templates"
        description="Customize the 10-section proposal document for each trade. Click any card to open the editor, or create a new template for any service you offer."
      >
        {loadError ? (
          <div className="mb-4 rounded-lg border border-[#ffe0d5] bg-[#fff1ea] p-4 text-sm text-[#b42318]">
            {loadError}
          </div>
        ) : isLoading ? (
          <div className="mb-4 rounded-lg border border-[#d9e2ec] bg-white p-4 text-sm text-gray-500">
            Loading templates…
          </div>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {/* Existing templates */}
          {templates.map((template) => {
            const savedEntry = savedTemplates.find((t) => t.trade === template.trade);
            const isModified = Boolean(savedEntry?.lastModified);
            const isCustom = !["default-roofing", "default-siding", "default-painting", "default-drywall", "default-gutters", "default-remodeling", "default-general-contractor"].includes(template.id);

            return (
              <div
                key={template.id}
                className="group overflow-hidden rounded-xl border border-[#d9e2ec] bg-white transition duration-200 hover:border-[#213343] hover:shadow-lg"
              >
                {/* Document thumbnail — clickable */}
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="relative w-full text-left focus:outline-none"
                >
                  <ProposalThumbnail template={template} />
                  <div className="absolute inset-0 flex items-center justify-center bg-[#213343]/0 transition-colors duration-200 group-hover:bg-[#213343]/60">
                    <div className="flex translate-y-2 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#213343] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                      <Pencil className="h-3 w-3" />
                      Edit Template
                    </div>
                  </div>
                </button>

                {/* Card footer */}
                <div className="border-t border-[#d9e2ec] px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#213343]">
                        {template.trade}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {isModified
                          ? `Modified ${savedEntry?.lastModified}`
                          : "Default template"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isCustom && (
                        <button
                          onClick={() => handleDelete(template)}
                          title="Delete custom template"
                          className="rounded p-1 text-gray-300 transition hover:bg-red-50 hover:text-red-400"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      {(isModified || isCustom) && (
                        <span className="rounded-full bg-[#fff1ea] px-2 py-0.5 text-[10px] font-semibold text-[#ff5c35]">
                          {isCustom ? "Custom" : "Edited"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section dots */}
                  <div className="mt-3 flex items-center gap-1">
                    {TEMPLATE_SECTION_KEYS.map((k) => (
                      <div
                        key={k}
                        title={TEMPLATE_SECTION_LABELS[k]}
                        className={`h-1.5 flex-1 rounded-full transition ${
                          template[k].enabled ? "bg-[#ff5c35]" : "bg-[#e9eef2]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    {TEMPLATE_SECTION_KEYS.filter((k) => template[k].enabled).length} of 10 sections active
                  </p>
                </div>
              </div>
            );
          })}

          {/* New template card */}
          <button
            onClick={() => setShowNewModal(true)}
            className="group flex min-h-65 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d9e2ec] bg-white text-center transition duration-200 hover:border-[#ff5c35] hover:bg-[#fff9f7]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-gray-200 transition group-hover:border-[#ff5c35] group-hover:bg-[#fff1ea]">
              <Plus className="h-5 w-5 text-gray-300 transition group-hover:text-[#ff5c35]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-400 transition group-hover:text-[#213343]">
                New Template
              </p>
              <p className="mt-1 text-xs text-gray-300 transition group-hover:text-gray-500">
                Any trade or service
              </p>
            </div>
          </button>
        </div>
      </SettingsSection>

      {/* New template modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
            <h3 className="text-lg font-bold text-[#213343]">New Proposal Template</h3>
            <p className="mt-1 text-sm text-gray-500">
              Give your template a name — this becomes the trade or service type label.
            </p>
            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-[#213343]">
                Trade / Service Name
              </label>
              <input
                autoFocus
                value={newTradeName}
                onChange={(e) => { setNewTradeName(e.target.value); setNewTradeError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleCreateNew()}
                placeholder="e.g. HVAC, Landscaping, Concrete…"
                className="w-full rounded-lg border border-[#d9e2ec] px-4 py-2.5 text-sm outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
              />
              {newTradeError && (
                <p className="mt-1.5 text-xs text-red-500">{newTradeError}</p>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setShowNewModal(false); setNewTradeName(""); setNewTradeError(""); }}
                className="flex-1 rounded-lg border border-[#d9e2ec] py-2.5 text-sm text-gray-500 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                className="flex-1 rounded-lg bg-[#ff5c35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTemplate && (
        <TemplateEditorPanel
          template={editingTemplate}
          open={true}
          onClose={() => setEditingTemplate(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function DataSection({
  onExportSettings,
  onResetOnboarding,
}: {
  onExportSettings: () => void;
  onResetOnboarding: () => Promise<void>;
}) {
  const [onboardingBusy, setOnboardingBusy] = useState(false);

  return (
    <SettingsSection
      title="Data"
      description="Projects, quotes, and contacts live in your Supabase database. Use this section for settings backup and re-running setup."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-[#d9e2ec] p-5">
          <p className="text-sm font-medium text-black">Where your data lives</p>
          <p className="mt-1 text-sm text-gray-500">
            Production data is not tied to this browser. Set{" "}
            <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
            <code className="rounded bg-gray-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on Vercel so every deploy uses
            the same backend.
          </p>
        </div>

        <div className="rounded-lg border border-[#d9e2ec] p-5">
          <p className="text-sm font-medium text-black">Export company settings</p>
          <p className="mt-1 text-sm text-gray-500">
            Downloads the current settings JSON from this page (not projects or quotes). For full database backups, use
            the Supabase dashboard.
          </p>
          <button
            type="button"
            onClick={onExportSettings}
            className="mt-4 rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Download settings JSON
          </button>
        </div>

        <div className="rounded-lg border border-[#d9e2ec] p-5">
          <p className="text-sm font-medium text-black">Re-run setup wizard</p>
          <p className="mt-1 text-sm text-gray-500">
            Clears the onboarding flag and sends you through the wizard again. Changes are saved to Supabase when you
            finish.
          </p>
          <button
            type="button"
            disabled={onboardingBusy}
            onClick={() => {
              setOnboardingBusy(true);
              onResetOnboarding().catch(() => setOnboardingBusy(false));
            }}
            className="mt-4 rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f6f8fb] disabled:opacity-50"
          >
            {onboardingBusy ? "Saving…" : "Re-run onboarding"}
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}
