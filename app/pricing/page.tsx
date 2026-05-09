"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, FolderPlus, RotateCcw, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  defaultSettings,
  formatMargin,
  formatMoney,
  getTodayLabel,
  companyLevelOptions,
  mergeAppSettings,
  projectSizeOptions,
  riskLevelOptions,
  stateOptions,
  strategyOptions,
  tradeOptions,
  TYPICAL_COSTS,
  type AppSettings,
  type CompanyLevel,
  type Contact,
  type Project,
  type ProjectSize,
  type ProjectState,
  type RiskLevel,
  type Strategy,
  type Trade,
} from "@/lib/app-data";
import {
  calculatePricingEngine,
  type CommissionType,
  type PricingEngineInput,
  type PricingEngineOption,
} from "@/lib/pricing-engine";
import {
  appendPricingSessionHistory,
  PRICING_SESSION_RESTORE_EVENT,
  type PricingSessionHistoryEntry,
} from "@/lib/pricing-session-history";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listContacts,
  listProjects,
  loadCompanySettings,
  upsertContact,
  upsertProject,
} from "@/lib/supabase/data";

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Florida: "FL", Georgia: "GA", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "South Carolina": "SC", Tennessee: "TN", Texas: "TX",
  Utah: "UT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
};

const defaultInput: PricingEngineInput = {
  costs: {
    material: 0,
    labor: 0,
    dumpster: 0,
    permits: 0,
    equipment: 0,
    subcontractor: 0,
    miscellaneous: 0,
  },
  businessCosts: {
    overheadPercent: 10,
    overheadAllocationMethod: "Percentage",
    monthlyOverhead: 5000,
    flatOverheadPerProject: 500,
    monthlyBillableDays: 20,
    projectDurationDays: 1,
    laborBurdenPercent: 18,
    minimumJobPrice: 850,
    miscellaneousBufferPercent: 5,
    permitBuffer: 0,
    creditCardFeePercent: 3,
    financingFeePercent: 3,
    taxPercent: 0,
    includeCreditCardFee: false,
    includeFinancingFee: false,
    includeTax: false,
    includeMiscellaneousBuffer: true,
  },
  commission: {
    includeCommission: false,
    commissionType: "Percentage",
    commissionPercentage: 5,
    commissionFlatAmount: 500,
  },
  setup: {
    trade: "Roofing",
    state: "Connecticut",
    companyLevel: "Small Crew",
    projectSize: "Medium",
    riskLevel: "Medium",
    strategy: "Balanced",
  },
};

function createInputFromSettings(
  settings: AppSettings,
  project?: Project | null
): PricingEngineInput {
  const merged = mergeAppSettings(settings);
  const mainTrade =
    merged.companyProfile.mainTrade === "General Contractor"
      ? "Remodeling"
      : merged.companyProfile.mainTrade;

  return {
    ...defaultInput,
    costs: project
      ? {
          material: project.costs.materials,
          labor: project.costs.labor,
          dumpster: project.costs.dumpster,
          permits: project.costs.permits,
          equipment: project.costs.equipment,
          subcontractor: project.costs.subcontractor,
          miscellaneous: project.costs.miscellaneous,
        }
      : defaultInput.costs,
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
      miscellaneousBufferPercent: merged.costRules.miscellaneousBufferPercent,
      permitBuffer: merged.costRules.permitBuffer,
      creditCardFeePercent: merged.costRules.creditCardFeePercent,
      financingFeePercent: merged.costRules.financingFeePercent,
      taxPercent: merged.costRules.taxPercent,
      includeCreditCardFee: merged.costRules.includeCreditCardFee,
      includeFinancingFee: merged.costRules.includeFinancingFee,
      includeTax: merged.costRules.includeTax,
      includeMiscellaneousBuffer: merged.costRules.includeMiscellaneousBuffer,
    },
    setup: {
      trade: project?.trade ?? mainTrade,
      state: project?.state ?? merged.marketLocation.defaultState,
      companyLevel: merged.companyProfile.companyLevel,
      projectSize: project?.projectSize ?? merged.pricingDefaults.defaultProjectSize,
      riskLevel: project?.riskLevel ?? merged.pricingDefaults.defaultRiskLevel,
      strategy: merged.pricingDefaults.defaultStrategy,
    },
    pricingRules: getPricingRules(merged),
  };
}

function getPricingRules(settings: AppSettings): PricingEngineInput["pricingRules"] {
  const pd = settings.pricingDefaults;
  return {
    baseMargins: {
      Good: pd.goodMargin / 100,
      Better: pd.betterMargin / 100,
      Best: pd.bestMargin / 100,
    },
    minimumSafeMargin: pd.minimumSafeMargin / 100,
    stateAdjustments: Object.fromEntries(
      stateOptions.map((s) => [s, (settings.marketLocation.stateAdjustments[s] ?? 0) / 100])
    ) as Record<ProjectState, number>,
    tradeAdjustments: Object.fromEntries(
      tradeOptions.map((t) => [t, (pd.tradeAdjustments[t] ?? 0) / 100])
    ) as Record<Trade, number>,
    sizeAdjustments: Object.fromEntries(
      projectSizeOptions.map((s) => [s, (pd.sizeAdjustments[s] ?? 0) / 100])
    ) as Record<ProjectSize, number>,
    riskAdjustments: Object.fromEntries(
      riskLevelOptions.map((r) => [r, (pd.riskAdjustments[r] ?? 0) / 100])
    ) as Record<RiskLevel, number>,
    strategyAdjustments: Object.fromEntries(
      strategyOptions.map((s) => [s, (pd.strategyAdjustments[s] ?? 0) / 100])
    ) as Record<Strategy, number>,
    companyAdjustments: Object.fromEntries(
      companyLevelOptions.map((c) => [c, (pd.companyAdjustments[c] ?? 0) / 100])
    ) as Record<CompanyLevel, number>,
    thresholds: settings.pricingThresholds ? {
      riskyMargin: settings.pricingThresholds.riskyMarginPercent / 100,
      tightMargin: settings.pricingThresholds.tightMarginPercent / 100,
      safePriceCushion: 1 + settings.pricingThresholds.safePriceCushionPercent / 100,
      warningMarginLow: settings.pricingThresholds.warningMarginLowPercent / 100,
      warningMarginHigh: settings.pricingThresholds.warningMarginHighPercent / 100,
      warningCommission: settings.pricingThresholds.warningCommissionPercent / 100,
      warningFeeProfit: settings.pricingThresholds.warningFeeProfitPercent / 100,
      safeMarginRiskBonus: settings.pricingThresholds.safeMarginRiskBonusPercent / 100,
      safeMarginSmallBonus: settings.pricingThresholds.safeMarginSmallBonusPercent / 100,
      marginClampMin: settings.pricingThresholds.marginClampMinPercent / 100,
      marginClampMax: settings.pricingThresholds.marginClampMaxPercent / 100,
    } : undefined,
  };
}

type ProjectDraft = {
  contactId: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
};

const emptyDraft: ProjectDraft = {
  contactId: "",
  projectName: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  address: "",
  city: "",
};

function cloneEngineInput(i: PricingEngineInput): PricingEngineInput {
  return JSON.parse(JSON.stringify(i)) as PricingEngineInput;
}

function PricingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showModalConfirm, setShowModalConfirm] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>(emptyDraft);
  const [projectError, setProjectError] = useState("");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceProject, setSourceProject] = useState<Project | null>(null);
  const [input, setInput] = useState<PricingEngineInput>(defaultInput);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const mergedSettings = useMemo(() => mergeAppSettings(settings), [settings]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadError(null);
      try {
        const [rawSettings, dbContacts, dbProjects] = await Promise.all([
          loadCompanySettings<AppSettings | null>(supabase),
          listContacts(supabase),
          listProjects(supabase),
        ]);
        if (cancelled) return;
        const merged = mergeAppSettings(rawSettings ?? defaultSettings);
        setSettings(merged);
        setContacts(dbContacts);
        setProjects(dbProjects);
        setDataReady(true);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load pricing data");
          setDataReady(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!dataReady || loadError) return;
    const proj = projectIdFromUrl ? projects.find((p) => p.id === projectIdFromUrl) ?? null : null;
    /* eslint-disable react-hooks/set-state-in-effect -- derive calculator input when URL / settings load */
    setSourceProject(proj);
    setInput(createInputFromSettings(mergedSettings, proj));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dataReady, loadError, projectIdFromUrl, projects, mergedSettings]);

  useEffect(() => {
    function onRestore(ev: Event) {
      const e = ev as CustomEvent<PricingSessionHistoryEntry>;
      const d = e.detail;
      setInput(cloneEngineInput(d.input));
      setProjectDraft({
        contactId: d.projectDraft.contactId ?? "",
        projectName: d.projectDraft.projectName ?? "",
        customerName: d.projectDraft.customerName ?? "",
        customerPhone: d.projectDraft.customerPhone ?? "",
        customerEmail: d.projectDraft.customerEmail ?? "",
        address: d.projectDraft.address ?? "",
        city: d.projectDraft.city ?? "",
      });
      /* Avoid ?projectId= sync effect overwriting restored numbers — snapshot is source of truth. */
      setSourceProject(null);
      router.replace("/pricing");
    }
    window.addEventListener(PRICING_SESSION_RESTORE_EVENT, onRestore);
    return () => window.removeEventListener(PRICING_SESSION_RESTORE_EVENT, onRestore);
  }, [router]);

  const result = useMemo(() => calculatePricingEngine(input), [input]);
  const baseCost = result.baseCost;
  const hasResults = baseCost > 0;

  // Cost breakdown percentages
  const matAmt = input.costs.material;
  const labAmt = input.costs.labor;
  const othAmt = baseCost - matAmt - labAmt;
  const matPct = baseCost > 0 ? Math.round((matAmt / baseCost) * 100) : 0;
  const labPct = baseCost > 0 ? Math.round((labAmt / baseCost) * 100) : 0;
  const othPct = baseCost > 0 ? Math.max(0, 100 - matPct - labPct) : 0;

  // Modal dirty check
  const isModalDirty =
    projectDraft.projectName.trim() !== "" ||
    projectDraft.customerName.trim() !== "" ||
    projectDraft.address.trim() !== "";

  function handleAttemptCloseModal() {
    if (isModalDirty) {
      setShowModalConfirm(true);
    } else {
      closeModal();
    }
  }

  function closeModal() {
    setShowProjectModal(false);
    setShowModalConfirm(false);
    setProjectDraft(emptyDraft);
    setProjectError("");
  }

  function reset() {
    setInput(createInputFromSettings(mergedSettings));
    setSourceProject(null);
    router.replace("/pricing");
  }

  function saveSessionToHistory() {
    appendPricingSessionHistory({
      label: `${input.setup.trade} · base ${formatMoney(baseCost)}`,
      input: cloneEngineInput(input),
      projectDraft: { ...projectDraft },
      sourceProjectId: sourceProject?.id ?? null,
    });
  }

  function saveProject() {
    if (!projectDraft.projectName.trim() || !projectDraft.customerName.trim()) {
      setProjectError("Project name and customer name are required.");
      return;
    }
    const matchedContact =
      contacts.find((contact) => contact.id === projectDraft.contactId) ??
      contacts.find(
        (contact) =>
          sameText(contact.name, projectDraft.customerName) ||
          (Boolean(contact.email) && sameText(contact.email, projectDraft.customerEmail)) ||
          (Boolean(contact.phone) && sameText(contact.phone, projectDraft.customerPhone))
      );
    const contact =
      matchedContact ??
      createContact({
        name: projectDraft.customerName.trim(),
        phone: projectDraft.customerPhone.trim(),
        email: projectDraft.customerEmail.trim(),
        address: [projectDraft.address, projectDraft.city, input.setup.state]
          .filter((part) => part.trim())
          .join(", "),
        notes: "",
        customerType: "Homeowner",
      });
    const newProject: Project = {
      id: crypto.randomUUID(),
      projectName: projectDraft.projectName.trim(),
      customerName: projectDraft.customerName.trim(),
      customerPhone: projectDraft.customerPhone.trim(),
      customerEmail: projectDraft.customerEmail.trim(),
      contactId: contact.id,
      address: projectDraft.address.trim(),
      city: projectDraft.city.trim(),
      state: input.setup.state as ProjectState,
      zipCode: "",
      trade: input.setup.trade as Trade,
      projectSize: input.setup.projectSize,
      riskLevel: input.setup.riskLevel,
      status: "Pricing",
      notes: "",
      costs: {
        materials: input.costs.material,
        labor: input.costs.labor,
        dumpster: input.costs.dumpster,
        permits: input.costs.permits,
        equipment: input.costs.equipment,
        subcontractor: input.costs.subcontractor,
        miscellaneous: input.costs.miscellaneous,
      },
      createdAt: getTodayLabel(),
    };
    setProjects((prev) => [newProject, ...prev]);
    upsertContact(supabase, contact).catch(() => undefined);
    upsertProject(supabase, newProject).catch(() => undefined);
    appendPricingSessionHistory({
      label: `Saved: ${newProject.projectName}`,
      input: cloneEngineInput(input),
      projectDraft: { ...projectDraft },
      sourceProjectId: newProject.id,
    });
    closeModal();
    router.push(`/projects?projectId=${newProject.id}`);
  }

  function createContact(contact: Omit<Contact, "id" | "createdAt">) {
    const nextContact: Contact = {
      id: crypto.randomUUID(),
      ...contact,
      createdAt: getTodayLabel(),
    };
    setContacts((current) => [nextContact, ...current]);
    upsertContact(supabase, nextContact).catch(() => undefined);
    return nextContact;
  }

  function applyContact(contactId: string) {
    const contact = contacts.find((item) => item.id === contactId);
    setProjectDraft((current) => ({
      ...current,
      contactId,
      customerName: contact?.name ?? current.customerName,
      customerPhone: contact?.phone ?? current.customerPhone,
      customerEmail: contact?.email ?? current.customerEmail,
      address: contact?.address.split(",")[0]?.trim() || current.address,
      city: contact?.address.split(",")[1]?.trim() || current.city,
    }));
  }

  function updateCost<K extends keyof PricingEngineInput["costs"]>(key: K, value: number) {
    setInput((c) => ({ ...c, costs: { ...c.costs, [key]: value } }));
  }
  function updateBiz<K extends keyof PricingEngineInput["businessCosts"]>(key: K, value: PricingEngineInput["businessCosts"][K]) {
    setInput((c) => ({ ...c, businessCosts: { ...c.businessCosts, [key]: value } }));
  }
  function updateCommission<K extends keyof PricingEngineInput["commission"]>(key: K, value: PricingEngineInput["commission"][K]) {
    setInput((c) => ({ ...c, commission: { ...c.commission, [key]: value } }));
  }
  function updateSetup<K extends keyof PricingEngineInput["setup"]>(key: K, value: PricingEngineInput["setup"][K]) {
    setInput((c) => ({ ...c, setup: { ...c.setup, [key]: value } }));
  }

  if (!dataReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
        Loading calculator…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] px-6">
        <p className="text-center text-[#b42318]">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 sm:p-8 lg:p-10">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Calculator</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Quick Pricing</h2>
              {sourceProject && (
                <p className="mt-1 text-sm text-gray-500">
                  From project:{" "}
                  <span className="font-medium text-black">{sourceProject.projectName}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {hasResults && (
                <button
                  type="button"
                  onClick={() => setShowProjectModal(true)}
                  className="flex items-center gap-2 rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Project</span>
                </button>
              )}
              <button
                type="button"
                onClick={saveSessionToHistory}
                className="flex items-center gap-2 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                title="Store this scenario in Historial (next to the calculator) to restore later"
              >
                Save session
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[400px_1fr]">
            {/* ── Left: inputs ── */}
            <div className="space-y-4">
              {/* Job setup + costs in one card */}
              <div className="rounded-lg border border-[#d9e2ec] bg-white p-5">
                {/* Job Setup — always visible */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Job Setup
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <CompactSelect
                    label="Trade"
                    value={input.setup.trade}
                    options={tradeOptions}
                    onChange={(v) => updateSetup("trade", v as PricingEngineInput["setup"]["trade"])}
                  />
                  <CompactSelect
                    label="State"
                    value={input.setup.state}
                    options={stateOptions}
                    displayMap={STATE_ABBR}
                    onChange={(v) => updateSetup("state", v as PricingEngineInput["setup"]["state"])}
                  />
                  <CompactSelect
                    label="Size"
                    value={input.setup.projectSize}
                    options={projectSizeOptions}
                    onChange={(v) => updateSetup("projectSize", v as PricingEngineInput["setup"]["projectSize"])}
                  />
                  <CompactSelect
                    label="Risk"
                    value={input.setup.riskLevel}
                    options={riskLevelOptions}
                    onChange={(v) => updateSetup("riskLevel", v as PricingEngineInput["setup"]["riskLevel"])}
                  />
                </div>

                <div className="my-4 border-t border-[#f0f4f8]" />

                {/* Cost inputs */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Project Costs
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MoneyInput label="Materials" value={input.costs.material} onChange={(v) => updateCost("material", v)} />
                  <MoneyInput label="Labor" value={input.costs.labor} onChange={(v) => updateCost("labor", v)} />
                  <MoneyInput label="Dumpster" value={input.costs.dumpster} onChange={(v) => updateCost("dumpster", v)} />
                  <MoneyInput label="Permits" value={input.costs.permits} onChange={(v) => updateCost("permits", v)} />
                  <MoneyInput label="Equipment" value={input.costs.equipment} onChange={(v) => updateCost("equipment", v)} />
                  <MoneyInput label="Subcontractor" value={input.costs.subcontractor} onChange={(v) => updateCost("subcontractor", v)} />
                  <MoneyInput label="Miscellaneous" value={input.costs.miscellaneous} onChange={(v) => updateCost("miscellaneous", v)} className="sm:col-span-2" />
                </div>

                {/* Cost summary + breakdown */}
                {baseCost > 0 && (
                  <div className="mt-4 border-t border-[#f0f4f8] pt-3 space-y-3">
                    {/* Total row */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Total Direct Cost</span>
                      <span className="text-base font-semibold">{formatMoney(baseCost)}</span>
                    </div>

                    {/* Stacked breakdown bar */}
                    {(matAmt > 0 || labAmt > 0) && (
                      <div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-[#f0f4f8]">
                          {matPct > 0 && (
                            <div
                              style={{ width: `${matPct}%` }}
                              className="bg-blue-400 transition-all"
                            />
                          )}
                          {labPct > 0 && (
                            <div
                              style={{ width: `${labPct}%` }}
                              className="bg-orange-400 transition-all"
                            />
                          )}
                          {othPct > 0 && (
                            <div
                              style={{ width: `${othPct}%` }}
                              className="bg-gray-300 transition-all"
                            />
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                          {matAmt > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                              Materials {matPct}%
                            </span>
                          )}
                          {labAmt > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-orange-400" />
                              Labor {labPct}%
                            </span>
                          )}
                          {othAmt > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                              Other {othPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Typical cost hint */}
                    <TypicalCostHint
                      trade={input.setup.trade}
                      size={input.setup.projectSize}
                      baseCost={baseCost}
                    />
                  </div>
                )}
              </div>

              {/* Business Rules (Advanced) */}
              <div className="rounded-lg border border-[#d9e2ec] bg-white">
                <button
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  <span>Business Rules</span>
                  {advancedOpen
                    ? <ChevronUp className="h-4 w-4 text-gray-400" />
                    : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {advancedOpen && (
                  <div className="space-y-5 border-t border-[#d9e2ec] px-5 pb-5 pt-4">
                    {/* Strategy + Company Level */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pricing Strategy</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectInput label="Strategy" value={input.setup.strategy} options={strategyOptions} onChange={(v) => updateSetup("strategy", v as PricingEngineInput["setup"]["strategy"])} />
                        <SelectInput label="Company Level" value={input.setup.companyLevel} options={companyLevelOptions} onChange={(v) => updateSetup("companyLevel", v as PricingEngineInput["setup"]["companyLevel"])} />
                      </div>
                    </div>

                    {/* Business costs */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Overhead & Fees</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectInput label="Overhead Method" value={input.businessCosts.overheadAllocationMethod} options={["Percentage", "Flat Per Project", "Project Duration", "Ignore For Now"]} onChange={(v) => updateBiz("overheadAllocationMethod", v as PricingEngineInput["businessCosts"]["overheadAllocationMethod"])} />
                        <NumberInput label="Minimum Job $" value={input.businessCosts.minimumJobPrice} onChange={(v) => updateBiz("minimumJobPrice", v)} />
                        {input.businessCosts.overheadAllocationMethod === "Percentage" && (
                          <NumberInput label="Overhead %" value={input.businessCosts.overheadPercent} onChange={(v) => updateBiz("overheadPercent", v)} />
                        )}
                        {input.businessCosts.overheadAllocationMethod === "Flat Per Project" && (
                          <NumberInput label="Flat Overhead $" value={input.businessCosts.flatOverheadPerProject} onChange={(v) => updateBiz("flatOverheadPerProject", v)} />
                        )}
                        {input.businessCosts.overheadAllocationMethod === "Project Duration" && (
                          <>
                            <NumberInput label="Monthly Overhead $" value={input.businessCosts.monthlyOverhead} onChange={(v) => updateBiz("monthlyOverhead", v)} />
                            <NumberInput label="Billable Days / Month" value={input.businessCosts.monthlyBillableDays} onChange={(v) => updateBiz("monthlyBillableDays", v)} />
                            <NumberInput label="Project Duration Days" value={input.businessCosts.projectDurationDays} onChange={(v) => updateBiz("projectDurationDays", v)} />
                          </>
                        )}
                        <NumberInput label="Labor Burden %" value={input.businessCosts.laborBurdenPercent} onChange={(v) => updateBiz("laborBurdenPercent", v)} />
                        <ToggleNumberInput label="Misc Buffer %" value={input.businessCosts.miscellaneousBufferPercent} enabled={input.businessCosts.includeMiscellaneousBuffer} onToggle={(v) => updateBiz("includeMiscellaneousBuffer", v)} onChange={(v) => updateBiz("miscellaneousBufferPercent", v)} />
                        <NumberInput label="Permit Buffer $" value={input.businessCosts.permitBuffer} onChange={(v) => updateBiz("permitBuffer", v)} />
                        <ToggleNumberInput label="CC Fee %" value={input.businessCosts.creditCardFeePercent} enabled={input.businessCosts.includeCreditCardFee} onToggle={(v) => updateBiz("includeCreditCardFee", v)} onChange={(v) => updateBiz("creditCardFeePercent", v)} />
                        <ToggleNumberInput label="Financing Fee %" value={input.businessCosts.financingFeePercent} enabled={input.businessCosts.includeFinancingFee} onToggle={(v) => updateBiz("includeFinancingFee", v)} onChange={(v) => updateBiz("financingFeePercent", v)} />
                        <ToggleNumberInput label="Tax %" value={input.businessCosts.taxPercent} enabled={input.businessCosts.includeTax} onToggle={(v) => updateBiz("includeTax", v)} onChange={(v) => updateBiz("taxPercent", v)} />
                      </div>
                    </div>

                    {/* Commission */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Commission</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center justify-between rounded border border-[#d9e2ec] px-3 py-2.5 text-sm">
                          Include Commission
                          <input type="checkbox" checked={input.commission.includeCommission} onChange={(e) => updateCommission("includeCommission", e.target.checked)} className="accent-[#ff5c35]" />
                        </label>
                        <SelectInput label="Type" value={input.commission.commissionType} options={["Percentage", "Flat Amount"]} onChange={(v) => updateCommission("commissionType", v as CommissionType)} />
                        {input.commission.commissionType === "Percentage" ? (
                          <NumberInput label="Commission %" value={input.commission.commissionPercentage} onChange={(v) => updateCommission("commissionPercentage", v)} />
                        ) : (
                          <MoneyInput label="Flat Amount" value={input.commission.commissionFlatAmount} onChange={(v) => updateCommission("commissionFlatAmount", v)} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: results ── */}
            <div className="space-y-4">
              {!hasResults ? (
                <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#d9e2ec] bg-white">
                  <p className="text-sm font-medium text-gray-500">Enter your costs to see pricing</p>
                  <p className="text-xs text-gray-400">Trade: {input.setup.trade} · {input.setup.projectSize} · {input.setup.state}</p>
                </div>
              ) : (
                <>
                  {/* Pricing cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    {result.options.map((opt) => (
                      <ResultCard key={opt.name} option={opt} commissionEnabled={input.commission.includeCommission} />
                    ))}
                  </div>

                  {/* Reference row */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <RefBox
                      label="Base Cost"
                      value={formatMoney(baseCost)}
                      sub={`Mat ${formatMoney(input.costs.material)} · Labor ${formatMoney(input.costs.labor)}`}
                    />
                    <RefBox
                      label="Breakeven"
                      value={formatMoney(result.breakevenPrice)}
                      sub={`Overhead ${formatMoney(result.overheadCost)} · Burden ${formatMoney(result.laborBurdenCost)}`}
                    />
                    <RefBox
                      label="Min Safe Price"
                      value={formatMoney(result.minimumSafePrice)}
                      sub={`${formatMargin(result.minimumSafeMargin)} min · Floor ${formatMoney(input.businessCosts.minimumJobPrice)}`}
                    />
                  </div>

                  {/* Cost Protection */}
                  <div className="rounded-lg border border-[#d9e2ec] bg-white p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Cost Protection (added to base)
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <Row label="Labor burden" value={formatMoney(result.laborBurdenCost)} />
                      <Row label="Overhead" value={formatMoney(result.overheadCost)} />
                      <Row label="Misc buffer" value={formatMoney(result.bufferCost)} />
                      <Row label="Permit buffer" value={formatMoney(result.permitBufferCost)} />
                      <Row label="Tax on Better" value={formatMoney(result.taxCost)} />
                      <Row label="Total protection" value={formatMoney(result.businessCostTotal)} strong />
                    </div>
                  </div>

                  {/* Project health */}
                  <HealthBanner status={result.projectStatus} reason={result.projectStatusReason} />

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-700">Warnings</p>
                      <ul className="space-y-1">
                        {result.warnings.map((w) => (
                          <li key={w} className="text-sm text-yellow-800">{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      {showProjectModal && (
        <div
          onClick={handleAttemptCloseModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#213343]/30 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#d9e2ec] bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">Create Project</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {input.setup.trade} · {input.setup.state} · {input.setup.projectSize} · Total cost {formatMoney(result.baseCost)}
                </p>
              </div>
              <button
                onClick={handleAttemptCloseModal}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
                Existing contact
                <select
                  value={projectDraft.contactId}
                  onChange={(event) => applyContact(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#ff5c35]"
                >
                  <option value="">Create or match by customer info</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <ModalField label="Project name *" value={projectDraft.projectName} placeholder="e.g. Roof replacement" onChange={(v) => setProjectDraft((d) => ({ ...d, projectName: v }))} className="sm:col-span-2" />
              <ModalField label="Customer name *" value={projectDraft.customerName} placeholder="Full name" onChange={(v) => setProjectDraft((d) => ({ ...d, customerName: v }))} />
              <ModalField label="Customer phone" value={projectDraft.customerPhone} placeholder="(000) 000-0000" onChange={(v) => setProjectDraft((d) => ({ ...d, customerPhone: v }))} />
              <ModalField label="Customer email" value={projectDraft.customerEmail} placeholder="email@example.com" onChange={(v) => setProjectDraft((d) => ({ ...d, customerEmail: v }))} />
              <ModalField label="Address" value={projectDraft.address} placeholder="Street address" onChange={(v) => setProjectDraft((d) => ({ ...d, address: v }))} />
              <ModalField label="City" value={projectDraft.city} placeholder="City" onChange={(v) => setProjectDraft((d) => ({ ...d, city: v }))} />
            </div>

            {projectError && (
              <p className="px-6 pb-2 text-sm text-red-600">{projectError}</p>
            )}

            {/* Discard confirmation */}
            {showModalConfirm && (
              <div className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">Discard unsaved changes?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={closeModal}
                      className="rounded-md bg-yellow-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-yellow-800"
                    >
                      Yes, discard
                    </button>
                    <button
                      onClick={() => setShowModalConfirm(false)}
                      className="rounded-md border border-yellow-300 px-3 py-1.5 text-xs font-medium text-yellow-800 transition hover:bg-yellow-100"
                    >
                      Keep editing
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-[#d9e2ec] px-6 py-4">
              <button
                onClick={handleAttemptCloseModal}
                className="rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                Cancel
              </button>
              <button
                onClick={saveProject}
                className="rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
              >
                Create & Go to Projects
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Typical cost hint ── */
function TypicalCostHint({ trade, size, baseCost }: { trade: string; size: string; baseCost: number }) {
  const hint = TYPICAL_COSTS[trade as Trade]?.[size as ProjectSize];
  if (!hint) return null;

  const isLow = baseCost < hint.low * 0.7;
  const isHigh = baseCost > hint.high * 1.5;

  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-gray-400">
        Typical {trade} ({size}): {formatMoney(hint.low)}–{formatMoney(hint.high)}
        <span className="mx-1 text-gray-300">·</span>
        {hint.note}
      </span>
      {isLow && (
        <span className="shrink-0 font-semibold text-yellow-600">↓ Below range</span>
      )}
      {isHigh && (
        <span className="shrink-0 font-semibold text-orange-600">↑ Above range</span>
      )}
    </div>
  );
}

/* ── Compact select for job setup ── */
function CompactSelect({ label, value, options, onChange, displayMap }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; displayMap?: Record<string, string> }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-[#213343] outline-none transition focus:border-[#111111]"
      >
        {options.map((o) => <option key={o} value={o}>{displayMap ? displayMap[o] ?? o : o}</option>)}
      </select>
    </label>
  );
}

/* ── Modal field ── */
function ModalField({ label, value, placeholder, onChange, className = "" }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-gray-600 ${className}`}>
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/* ── Result card ── */
function ResultCard({ option, commissionEnabled }: { option: PricingEngineOption; commissionEnabled: boolean }) {
  const healthStyle =
    option.status === "Safe"
      ? "bg-green-50 text-green-700"
      : option.status === "Tight"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-red-50 text-red-700";

  return (
    <div className={`relative rounded-lg border bg-white p-5 ${option.recommended ? "border-[#111111]" : "border-[#d9e2ec]"}`}>
      {option.recommended && (
        <span className="absolute right-3 top-3 rounded bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">
          RECOMMENDED
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{option.name}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-black">
        {formatMoney(option.salePrice)}
      </p>
      <div className="mt-4 space-y-2 border-t border-[#f0f4f8] pt-3">
        <Row label="Profit" value={formatMoney(option.netProfit)} strong />
        <Row label="Margin" value={formatMargin(option.margin)} />
        <Row label="Markup" value={formatMargin(option.markup)} />
        {commissionEnabled && <Row label="Commission" value={formatMoney(option.commissionCost)} />}
      </div>
      <div className="mt-3">
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${healthStyle}`}>
          {option.status}
        </span>
      </div>
    </div>
  );
}

/* ── Reference box ── */
function RefBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#d9e2ec] bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

/* ── Health banner ── */
function HealthBanner({ status, reason }: { status: "Green" | "Yellow" | "Red"; reason: string }) {
  const cfg = {
    Green: { dot: "bg-green-500", label: "Healthy", ring: "border-green-100 bg-green-50", text: "text-green-700" },
    Yellow: { dot: "bg-yellow-500", label: "Caution", ring: "border-yellow-100 bg-yellow-50", text: "text-yellow-700" },
    Red: { dot: "bg-red-500", label: "At Risk", ring: "border-red-100 bg-red-50", text: "text-red-700" },
  }[status];

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cfg.ring}`}>
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
      <div>
        <p className={`text-sm font-semibold ${cfg.text}`}>Project Health: {cfg.label}</p>
        <p className="mt-0.5 text-sm text-gray-600">{reason}</p>
      </div>
    </div>
  );
}

/* ── Small helpers ── */
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "font-semibold text-black" : "text-gray-700"}>{value}</span>
    </div>
  );
}

function MoneyInput({ label, value, onChange, className = "" }: { label: string; value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-gray-600 ${className}`}>
      {label}
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
        <input
          type="number"
          min="0"
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-[#d9e2ec] py-2.5 pl-7 pr-3 text-sm outline-none transition focus:border-[#111111]"
        />
      </div>
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <input
        type="number"
        min="0"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

function ToggleNumberInput({ label, value, enabled, onToggle, onChange }: { label: string; value: number; enabled: boolean; onToggle: (v: boolean) => void; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <label className="flex cursor-pointer items-center gap-1 text-[11px] text-gray-400">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="accent-[#ff5c35]" />
          On
        </label>
      </div>
      <input
        type="number"
        min="0"
        value={value || ""}
        disabled={!enabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none transition focus:border-[#111111] disabled:bg-[#f6f8fb] disabled:text-gray-400"
      />
    </div>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#111111]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  );
}
