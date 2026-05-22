"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, FolderPlus, History, Info, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  defaultSettings,
  computeNextProposalNumber,
  getExpirationLabel,
  formatMargin,
  formatMoney,
  getTierMaterialSummaries,
  getTodayLabel,
  companyLevelOptions,
  mergeAppSettings,
  projectSizeOptions,
  riskLevelOptions,
  strategyOptions,
  tradeOptions,
  TYPICAL_COSTS,
  type AppSettings,
  type CompanyLevel,
  type Contact,
  type PriceOptionName,
  type Project,
  type ProjectSize,
  type Quote,
  type ProjectState,
  type RiskLevel,
  stateOptions,
  type Strategy,
  type Trade,
} from "@/lib/app-data";
import {
  calculatePricingEngine,
  type CommissionType,
  type PricingEngineInput,
  type PricingEngineOption,
} from "@/lib/pricing-engine";
import type { MaterialItem } from "@/lib/proposal-templates";
import {
  appendPricingSessionHistory,
  loadPricingSessionHistory,
  PRICING_SESSION_RESTORE_EVENT,
  removePricingSessionHistory,
  type PricingSessionHistoryEntry,
} from "@/lib/pricing-session-history";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  listContacts,
  listProjects,
  listQuotes,
  listTierProducts,
  loadCompanySettings,
  upsertContact,
  upsertProject,
  upsertQuote,
} from "@/lib/supabase/data";
import type { TierProduct } from "@/lib/app-data";

const TRADE_INFO: Record<string, string> = {
  Roofing: "Shingles, flat roofs, metal, repairs & replacements.\n\n📦 Include: underlayment, ice barrier, drip edge, ridge caps, nails.\n🗑️ Budget for dumpster — tear-off adds significant disposal cost.\n📋 Most jurisdictions require a permit for full replacements.\n⏱️ Typical job: 1–3 days for a standard residential roof.",
  Siding: "Vinyl, fiber cement, wood & composite cladding.\n\n📦 Include: house wrap, trim boards, J-channel, fasteners.\n🔧 Account for removal & disposal of existing siding.\n🪟 Windows and corners add labor — price carefully.\n⏱️ Typical job: 3–10 days depending on size and material.",
  Painting: "Interior & exterior residential and commercial painting.\n\n🖌️ Exterior: factor in pressure washing, caulking, and priming.\n🏠 Interior: ceiling cuts, trim detail, and furniture protection add time.\n🎨 Two-coat jobs cost more — specify in your quote.\n⏱️ Typical job: 1–5 days for a standard home.",
  Drywall: "Hanging, taping, finishing, and texturing.\n\n📐 Price by the sheet or square foot — include waste (10–15%).\n🔧 Finish level matters: Level 3 for texture, Level 5 for paint-ready.\n💧 Water-damaged areas may need mold-resistant board.\n⏱️ Typical job: 2–7 days including drying time between coats.",
  Gutters: "Installation, cleaning, repair, and gutter guards.\n\n📏 Price by linear foot — don't forget downspouts and elbows.\n🏚️ Inspect fascia condition before quoting — rotted fascia adds cost.\n🍃 Gutter guards significantly increase material cost.\n⏱️ Typical job: 4–8 hours for a standard home.",
  Remodeling: "Kitchen, bath, basement, and room renovations.\n\n📋 Always get a permit for structural, electrical, or plumbing work.\n🔨 Demo and haul-away can be 10–20% of total job cost.\n🤝 Subcontractors (electrician, plumber) need their own markup.\n⏱️ Varies widely — budget extra time for surprises behind walls.",
  "General Contractor": "Multi-trade projects managing subcontractors and scope.\n\n💼 Your markup covers coordination, scheduling, and liability.\n📋 Pull all permits and manage inspections.\n🤝 Sub costs should be marked up 10–20% minimum.\n⏱️ Timeline depends on trade sequence — plan for dependencies.",
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
type ContactInput = Omit<Contact, "id" | "createdAt" | "leadStage"> &
  Partial<Pick<Contact, "leadStage" | "leadSource" | "nextFollowUpAt" | "owner">>;

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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sourceProject, setSourceProject] = useState<Project | null>(null);
  const [input, setInput] = useState<PricingEngineInput>(defaultInput);
  const [showBusinessRulesDrawer, setShowBusinessRulesDrawer] = useState(false);
  const [pendingProposalOption, setPendingProposalOption] = useState<PriceOptionName | null>(null);
  const [expandedCard, setExpandedCard] = useState<PriceOptionName | null>(null);
  const [tierProducts, setTierProducts] = useState<TierProduct[]>([]);
  const [rawMaterial, setRawMaterial] = useState(0);
  const [wastePercent, setWastePercent] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<PricingSessionHistoryEntry[]>([]);
  const [showSessionHistoryModal, setShowSessionHistoryModal] = useState(false);

  const { data: initialData, isPending, error: queryError } = useQuery({
    queryKey: ["pricing", "initial-data"],
    queryFn: () => Promise.all([
      loadCompanySettings<AppSettings | null>(supabase),
      listContacts(supabase),
      listProjects(supabase),
      listQuotes(supabase),
      listTierProducts(supabase),
    ]),
    staleTime: 30_000,
  });

  const dataReady = !isPending;
  const loadError = queryError ? (queryError instanceof Error ? queryError.message : "Failed to load pricing data") : null;

  useEffect(() => {
    if (!initialData) return;
    const [rawSettings, dbContacts, dbProjects, dbQuotes, dbTierProducts] = initialData;
    setSettings(mergeAppSettings(rawSettings ?? defaultSettings));
    setContacts(dbContacts);
    setProjects(dbProjects);
    setQuotes(dbQuotes);
    setTierProducts(dbTierProducts);
  }, [initialData]);

  const mergedSettings = useMemo(() => mergeAppSettings(settings), [settings]);
  const showAdvancedBreakdown = mergedSettings.appPreferences.showAdvancedPricingBreakdown;
  const showPricingWarnings = mergedSettings.appPreferences.showPricingWarnings;

  useEffect(() => {
    if (!dataReady || loadError) return;
    const proj = projectIdFromUrl ? projects.find((p) => p.id === projectIdFromUrl) ?? null : null;
    /* eslint-disable react-hooks/set-state-in-effect -- derive calculator input when URL / settings load */
    setSourceProject(proj);
    setInput(createInputFromSettings(mergedSettings, proj));
    setRawMaterial(proj?.costs.materials ?? 0);
    setWastePercent(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dataReady, loadError, projectIdFromUrl, projects, mergedSettings]);

  useEffect(() => {
    function onRestore(ev: Event) {
      const e = ev as CustomEvent<PricingSessionHistoryEntry>;
      const d = e.detail;
      setInput(cloneEngineInput(d.input));
      setRawMaterial(d.input.costs.material);
      setWastePercent(0);
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

  useEffect(() => {
    setSessionHistory(loadPricingSessionHistory());
  }, []);

  const result = useMemo(() => calculatePricingEngine(input), [input]);
  const baseCost = result.baseCost;
  const hasResults = baseCost > 0;
  const tierMaterials = useMemo(
    () => getTierMaterialSummaries(mergedSettings, null),
    [mergedSettings]
  );
  const expandedOption = useMemo(
    () => (expandedCard ? result.options.find((opt) => opt.name === expandedCard) ?? null : null),
    [expandedCard, result.options]
  );
  const expandedTierItems =
    expandedCard === "Good"
      ? mergedSettings.proposalSettings.goodTierMaterialsTable ?? []
      : expandedCard === "Better"
        ? mergedSettings.proposalSettings.betterTierMaterialsTable ?? []
        : expandedCard === "Best"
          ? mergedSettings.proposalSettings.bestTierMaterialsTable ?? []
          : [];
  const sessionHistoryRows = useMemo(
    () =>
      sessionHistory.map((entry) => {
        const computed = calculatePricingEngine(entry.input);
        const suggestedOption = computed.options.find((opt) => opt.recommended)?.name ?? "Better";
        return {
          entry,
          baseCost: computed.baseCost,
          suggestedOption,
        };
      }),
    [sessionHistory]
  );

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
    setPendingProposalOption(null);
  }

  function saveSessionToHistory() {
    appendPricingSessionHistory({
      label: `${input.setup.trade} · base ${formatMoney(baseCost)}`,
      input: cloneEngineInput(input),
      projectDraft: { ...projectDraft },
      sourceProjectId: sourceProject?.id ?? null,
    });
    setSessionHistory(loadPricingSessionHistory());
  }

  async function createProposalOnly() {
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
        leadStage: "Qualified",
        leadSource: "Calculator",
        nextFollowUpAt: "",
        owner: "",
      });
    const proposalSelection =
      pendingProposalOption ?? result.options.find((opt) => opt.recommended)?.name ?? "Better";
    try {
      await upsertContact(supabase, contact);
    } catch {
      setProjectError("Could not save contact. Check your connection and try again.");
      return;
    }
    appendPricingSessionHistory({
      label: `Proposal: ${projectDraft.projectName.trim()}`,
      input: cloneEngineInput(input),
      projectDraft: { ...projectDraft },
      sourceProjectId: sourceProject?.id ?? null,
    });
    setSessionHistory(loadPricingSessionHistory());
    const pricingForQuote = result.options.map((opt) => ({
      name: opt.name,
      salePrice: opt.salePrice,
      profit: opt.netProfit,
      margin: opt.margin,
      markup: opt.markup,
      description: "",
      useCase: "",
      recommended: opt.recommended,
    }));
    const quote: Quote = {
      id: crypto.randomUUID(),
      projectId: sourceProject?.id,
      contactId: contact.id,
      projectName: projectDraft.projectName.trim(),
      customerName: projectDraft.customerName.trim(),
      customerPhone: projectDraft.customerPhone.trim(),
      customerEmail: projectDraft.customerEmail.trim(),
      customerAddress: [projectDraft.address.trim(), projectDraft.city.trim(), input.setup.state]
        .filter((part) => part.trim())
        .join(", "),
      trade: input.setup.trade,
      jobAddress: projectDraft.address.trim(),
      jobCity: projectDraft.city.trim(),
      jobState: input.setup.state as ProjectState,
      jobZipCode: "",
      projectSize: input.setup.projectSize,
      riskLevel: input.setup.riskLevel,
      proposalTitle: mergedSettings.proposalSettings.defaultProposalTitle,
      proposalNumber: computeNextProposalNumber(quotes),
      warrantyText: mergedSettings.proposalSettings.defaultWarrantyText,
      termsText: mergedSettings.proposalSettings.defaultTerms,
      tierMaterials: getTierMaterialSummaries(mergedSettings, null),
      good: pricingForQuote[0],
      better: pricingForQuote[1],
      best: pricingForQuote[2],
      selectedOption: proposalSelection,
      status: "Draft",
      depositStatus: "Pending",
      createdAt: getTodayLabel(),
      expiresAt: getExpirationLabel(14),
    };
    try {
      await upsertQuote(supabase, quote);
      setQuotes((prev) => [quote, ...prev]);
      closeModal();
      router.push(`/proposals/preview?id=${encodeURIComponent(quote.id)}`);
      return;
    } catch {
      setProjectError(
        "Could not create proposal. Please try again."
      );
      return;
    }
  }

  function toggleCardBreakdown(optionName: PriceOptionName) {
    setExpandedCard((current) => (current === optionName ? null : optionName));
  }

  function restoreSession(entry: PricingSessionHistoryEntry) {
    setInput(cloneEngineInput(entry.input));
    setRawMaterial(entry.input.costs.material);
    setWastePercent(0);
    setProjectDraft({
      contactId: entry.projectDraft.contactId ?? "",
      projectName: entry.projectDraft.projectName ?? "",
      customerName: entry.projectDraft.customerName ?? "",
      customerPhone: entry.projectDraft.customerPhone ?? "",
      customerEmail: entry.projectDraft.customerEmail ?? "",
      address: entry.projectDraft.address ?? "",
      city: entry.projectDraft.city ?? "",
    });
    setSourceProject(null);
    router.replace("/pricing");
  }

  function continueFromSession(entry: PricingSessionHistoryEntry) {
    setShowSessionHistoryModal(false);
    restoreSession(entry);
  }

  function createProposalFromSession(entry: PricingSessionHistoryEntry, suggestedOption: PriceOptionName) {
    setShowSessionHistoryModal(false);
    restoreSession(entry);
    setPendingProposalOption(suggestedOption);
    setProjectError("");
    setShowProjectModal(true);
  }

  function removeSessionRow(id: string) {
    removePricingSessionHistory(id);
    setSessionHistory(loadPricingSessionHistory());
  }

  function createContact(contact: ContactInput) {
    const nextContact: Contact = {
      id: crypto.randomUUID(),
      ...contact,
      leadStage: contact.leadStage ?? "New",
      leadSource: contact.leadSource ?? "",
      nextFollowUpAt: contact.nextFollowUpAt ?? "",
      owner: contact.owner ?? "",
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-sm text-gray-500">
        Loading calculator…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-6">
        <p className="text-center text-[#b42318]">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 sm:p-8 lg:p-10">
        <div className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {sourceProject ? (
              <p className="text-sm text-gray-500">
                From project:{" "}
                <span className="font-medium text-neutral-900 dark:text-slate-100">
                  {sourceProject.projectName}
                </span>
              </p>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              {hasResults && (
                <button
                  type="button"
                  onClick={() => {
                    const recommended = result.options.find((opt) => opt.recommended)?.name ?? "Better";
                    setPendingProposalOption(recommended);
                    setShowProjectModal(true);
                  }}
                  className="flex items-center gap-2 rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Proposal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBusinessRulesDrawer(true)}
                className="flex items-center gap-2 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-[#f6f8fb] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Business Rules
              </button>
              <button
                type="button"
                onClick={saveSessionToHistory}
                className="flex items-center gap-2 rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-[#f6f8fb] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                title="Store this scenario in Historial (next to the calculator) to restore later"
              >
                Save session
              </button>
              <button
                type="button"
                onClick={() => setShowSessionHistoryModal(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d9e2ec] bg-white text-neutral-900 transition hover:bg-[#f6f8fb] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                title="Saved sessions"
                aria-label="Saved sessions"
              >
                <History className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="elevated-panel mt-6 grid gap-6 xl:grid-cols-[400px_1fr]">
            {/* ── Left: inputs ── */}
            <div className="space-y-4">
              {/* Job setup + costs in one card */}
              <div className="rounded-lg border border-[#d9e2ec] bg-white p-5">
                {/* Job Setup — always visible */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Job Setup
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <CompactSelect
                    label="Trade"
                    value={input.setup.trade}
                    options={tradeOptions}
                    onChange={(v) => updateSetup("trade", v as PricingEngineInput["setup"]["trade"])}
                  />
                  <CompactSelect
                    label="Size"
                    value={input.setup.projectSize}
                    options={projectSizeOptions}
                    onChange={(v) => updateSetup("projectSize", v as PricingEngineInput["setup"]["projectSize"])}
                    info={`How big is this job?\n\n• Small — Under $5k, 1-2 days (patch, small repair)\n• Medium — $5k–$25k, up to 2 weeks\n• Large — $25k–$100k, multi-week project\n• Extra Large — $100k+, complex or multi-phase`}
                  />
                  <CompactSelect
                    label="Risk"
                    value={input.setup.riskLevel}
                    options={riskLevelOptions}
                    onChange={(v) => updateSetup("riskLevel", v as PricingEngineInput["setup"]["riskLevel"])}
                    info={`How uncertain or complex is this job?\n\n• Low — Clear scope, known client, easy access\n• Medium — Some unknowns, standard complexity\n• High — Tight timeline, hard access, vague scope, or new client\n• Critical — High stakes, penalties for delays, or unusual conditions`}
                  />
                </div>

                <div className="my-4 border-t border-[#f0f4f8]" />

                {/* Cost inputs */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Project Costs
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <MoneyInput
                      label="Materials"
                      value={rawMaterial}
                      onChange={(v) => {
                        setRawMaterial(v);
                        updateCost("material", v * (1 + wastePercent / 100));
                      }}
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[11px] text-gray-400">Waste %</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={wastePercent || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const pct = Math.max(0, Math.min(50, Number(e.target.value) || 0));
                          setWastePercent(pct);
                          updateCost("material", rawMaterial * (1 + pct / 100));
                        }}
                        className="w-14 rounded border border-[#d9e2ec] px-1.5 py-0.5 text-center text-xs text-neutral-900 outline-none transition focus:border-[#111111]"
                      />
                      {wastePercent > 0 && rawMaterial > 0 && (
                        <span className="text-[11px] font-medium text-[#ff5c35]">
                          = {formatMoney(rawMaterial * (1 + wastePercent / 100))}
                        </span>
                      )}
                    </div>
                  </div>
                  <MoneyInput label="Own Labor" value={input.costs.labor} onChange={(v) => updateCost("labor", v)} />
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

                    {showAdvancedBreakdown && (
                      <>
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
                      </>
                    )}
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
                      <ResultCard
                        key={opt.name}
                        option={opt}
                        commissionEnabled={input.commission.includeCommission}
                        showAdvancedBreakdown={showAdvancedBreakdown}
                        onToggleBreakdown={() => toggleCardBreakdown(opt.name)}
                      />
                    ))}
                  </div>

                  {showAdvancedBreakdown && (
                    <>
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
                    </>
                  )}

                  {/* Project health */}
                  <HealthBanner status={result.projectStatus} reason={result.projectStatusReason} />

                  {/* Warnings */}
                  {showPricingWarnings && result.warnings.length > 0 && (
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

      {/* Create Proposal Modal */}
      {showProjectModal && (
        <div
          onClick={handleAttemptCloseModal}
          className="fixed inset-0 z-50 bg-[#213343]/30 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[#d9e2ec] bg-white shadow-2xl dark:border-slate-600"
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#213343]">Create Proposal</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {pendingProposalOption
                    ? `Create ${pendingProposalOption} proposal · ${input.setup.trade} · ${input.setup.state} · ${input.setup.projectSize}`
                    : `${input.setup.trade} · ${input.setup.state} · ${input.setup.projectSize} · Total cost ${formatMoney(result.baseCost)}`}
                </p>
              </div>
              <button
                onClick={handleAttemptCloseModal}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-auto px-6 py-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-600 sm:col-span-2">
                Existing contact
                <select
                  value={projectDraft.contactId}
                  onChange={(event) => applyContact(event.target.value)}
                  className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
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
              <ModalField label="Proposal title / job name *" value={projectDraft.projectName} placeholder="e.g. Roof replacement" onChange={(v) => setProjectDraft((d) => ({ ...d, projectName: v }))} className="sm:col-span-2" />
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

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-[#d9e2ec] bg-white px-6 py-4">
              <button
                onClick={handleAttemptCloseModal}
                className="rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-[#f6f8fb] dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => void createProposalOnly()}
                className="rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
              >
                {pendingProposalOption
                  ? `Create ${pendingProposalOption} Proposal`
                  : "Create Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedCard && expandedOption && (
        <div
          className="fixed inset-0 z-50 bg-[#213343]/35 backdrop-blur-sm"
          onClick={() => setExpandedCard(null)}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-[#d9e2ec] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#213343]">
                  {expandedCard} materials breakdown
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {formatMoney(expandedOption.salePrice)} · Margin {formatMargin(expandedOption.margin)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedCard(null)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-auto px-6 py-5">
              {(() => {
                const assignedProduct = tierProducts.find(
                  (p) => p.tier === expandedCard && p.trade === input.setup.trade && p.productName.trim()
                );
                if (!assignedProduct) return null;
                return (
                  <div className="flex items-start gap-3 rounded-lg border border-[#d9e2ec] bg-white p-3">
                    {assignedProduct.imageUrl ? (
                      <img
                        src={assignedProduct.imageUrl}
                        alt={assignedProduct.productName}
                        className="h-14 w-14 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-dashed border-[#d9e2ec] bg-[#f8fafc] text-[10px] text-gray-400">
                        No img
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#ff5c35]">Assigned Product</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#213343]">
                        {assignedProduct.productBrand ? `${assignedProduct.productBrand} · ` : ""}
                        {assignedProduct.productName}
                      </p>
                      {assignedProduct.productLine && (
                        <p className="text-xs text-gray-500">{assignedProduct.productLine}</p>
                      )}
                      {assignedProduct.warrantyYears > 0 && (
                        <p className="mt-0.5 text-xs text-gray-400">{assignedProduct.warrantyYears}-year warranty</p>
                      )}
                      {assignedProduct.notes && (
                        <p className="mt-0.5 text-xs text-gray-400">{assignedProduct.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-md bg-[#f6f8fb] px-3 py-2 text-sm text-gray-600">
                <span className="font-semibold text-gray-700">Summary:</span>{" "}
                {tierMaterials[expandedCard]?.trim() || "No summary set yet."}
              </div>

              {expandedTierItems.length > 0 ? (
                expandedTierItems.map((item, index) => {
                  const brand = item.brand?.trim();
                  const materialType = item.product?.trim() || item.category?.trim();
                  const label = [brand || "No brand", materialType || "Material type pending"].join(" · ");
                  const details = [item.warranty, item.notes]
                    .filter((value) => value && value.trim())
                    .join(" · ");
                  return (
                    <div key={item.id ?? `${expandedCard}-${index}`} className="rounded-lg border border-[#e8eef3] bg-white p-3">
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={`${materialType || "Material"} image`}
                            className="h-16 w-16 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded border border-dashed border-[#d9e2ec] bg-[#f8fafc]" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#213343]">{label}</p>
                          {details ? (
                            <p className="mt-1 text-xs text-gray-500">{details}</p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400">No extra characteristics set.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-md border border-dashed border-[#d9e2ec] px-3 py-2 text-sm text-gray-500">
                  No material table rows configured for this package yet.
                </p>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end border-t border-[#d9e2ec] bg-white px-6 py-4">
              <Link
                href={`/settings?section=Proposals&proposalTab=settings&tier=${expandedCard}`}
                className="inline-flex rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
              >
                Edit {expandedCard} materials in Settings
              </Link>
            </div>
          </aside>
        </div>
      )}

      {showBusinessRulesDrawer && (
        <div
          className="fixed inset-0 z-50 bg-[#213343]/35 backdrop-blur-sm"
          onClick={() => setShowBusinessRulesDrawer(false)}
        >
          <aside
            className="ml-auto flex h-full w-full max-w-[min(50vw,760px)] min-w-[360px] flex-col border-l border-[#d9e2ec] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#213343]">Business Rules</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Advanced pricing controls for overhead, strategy, fees, and commission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBusinessRulesDrawer(false)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-auto px-6 py-5">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Pricing Strategy</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectInput label="Strategy" value={input.setup.strategy} options={strategyOptions} onChange={(v) => updateSetup("strategy", v as PricingEngineInput["setup"]["strategy"])} />
                  <SelectInput label="Company Level" value={input.setup.companyLevel} options={companyLevelOptions} onChange={(v) => updateSetup("companyLevel", v as PricingEngineInput["setup"]["companyLevel"])} />
                </div>
              </div>

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

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Commission</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded border border-[#d9e2ec] px-3 py-2.5 text-sm text-neutral-900">
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
          </aside>
        </div>
      )}

      {showSessionHistoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#213343]/40 px-4 backdrop-blur-sm"
          onClick={() => setShowSessionHistoryModal(false)}
        >
          <div
            className="flex h-[min(82vh,760px)] w-full max-w-6xl flex-col rounded-xl border border-[#d9e2ec] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#d9e2ec] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-[#213343]">Saved Sessions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Continue where you left off or create a proposal directly from a saved scenario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionHistoryModal(false)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              {sessionHistoryRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e8eef3] text-[11px] uppercase tracking-wide text-gray-400">
                        <th className="px-2 py-2">Saved</th>
                        <th className="px-2 py-2">Scenario</th>
                        <th className="px-2 py-2">Direct Cost</th>
                        <th className="px-2 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionHistoryRows.map(({ entry, baseCost, suggestedOption }) => (
                        <tr key={entry.id} className="border-b border-[#f0f4f8] last:border-0">
                          <td className="px-2 py-2 text-gray-500">
                            {new Date(entry.savedAt).toLocaleString()}
                          </td>
                          <td className="px-2 py-2">
                            <p className="font-medium text-[#213343]">{entry.label}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500">
                              {entry.input.setup.trade} · {entry.input.setup.state} · {entry.input.setup.projectSize}
                            </p>
                          </td>
                          <td className="px-2 py-2 font-semibold text-[#213343]">
                            {formatMoney(baseCost)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => continueFromSession(entry)}
                                className="rounded border border-[#d9e2ec] px-2.5 py-1 text-[11px] font-medium text-[#213343] transition hover:bg-[#f6f8fb]"
                              >
                                Continue
                              </button>
                              <button
                                type="button"
                                onClick={() => createProposalFromSession(entry, suggestedOption)}
                                className="rounded bg-[#111111] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-black"
                              >
                                Create Proposal
                              </button>
                              <button
                                type="button"
                                onClick={() => removeSessionRow(entry.id)}
                                className="rounded border border-[#f0d5d2] px-2.5 py-1 text-[11px] font-medium text-[#b42318] transition hover:bg-[#fff5f4]"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-500">No saved sessions yet. Use “Save session” to create one.</p>
                </div>
              )}
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
function CompactSelect({ label, value, options, onChange, displayMap, info }: {
  label: string; value: string; options: readonly string[];
  onChange: (v: string) => void; displayMap?: Record<string, string>; info?: string;
}) {
  return (
    <div className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      <div className="flex items-center gap-1 mb-1">
        <span>{label}</span>
        {info && (
          <div className="relative flex items-center">
            <Info className="peer h-3 w-3 cursor-default text-gray-300 transition-colors hover:text-[#ff5c35]" />
            <div className="pointer-events-none invisible peer-hover:visible absolute top-full left-1/2 z-50 mt-2 w-64 -translate-x-1/2 rounded-lg border border-[#d9e2ec] bg-white p-3 text-[11px] font-normal normal-case tracking-normal text-[#213343] shadow-lg opacity-0 peer-hover:opacity-100 transition-opacity">
              <div className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-[#d9e2ec] bg-white" />
              <div className="whitespace-pre-line leading-relaxed">{info}</div>
            </div>
          </div>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[#d9e2ec] bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-[#213343] outline-none transition focus:border-[#111111]"
      >
        {options.map((o) => <option key={o} value={o}>{displayMap ? displayMap[o] ?? o : o}</option>)}
      </select>
    </div>
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
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
      />
    </label>
  );
}

function sameText(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/* ── Result card ── */
function ResultCard({
  option,
  commissionEnabled,
  showAdvancedBreakdown,
  onToggleBreakdown,
}: {
  option: PricingEngineOption;
  commissionEnabled: boolean;
  showAdvancedBreakdown: boolean;
  onToggleBreakdown: () => void;
}) {
  const healthStyle =
    option.status === "Safe"
      ? "bg-green-50 text-green-700"
      : option.status === "Tight"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-red-50 text-red-700";

  return (
    <div className={`group relative rounded-lg border bg-white p-5 ${option.recommended ? "border-[#111111]" : "border-[#d9e2ec]"}`}>
      {option.recommended && (
        <span className="absolute right-3 top-3 rounded bg-[#111111] px-2 py-0.5 text-[10px] font-semibold text-white">
          RECOMMENDED
        </span>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{option.name}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-black">
        {formatMoney(option.salePrice)}
      </p>
      {showAdvancedBreakdown && (
        <div className="mt-4 space-y-2 border-t border-[#f0f4f8] pt-3">
          <Row label="Profit" value={formatMoney(option.netProfit)} strong />
          <Row label="Margin" value={formatMargin(option.margin)} />
          <Row label="Markup" value={formatMargin(option.markup)} />
          {commissionEnabled && <Row label="Commission" value={formatMoney(option.commissionCost)} />}
        </div>
      )}
      <div className="mt-3">
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${healthStyle}`}>
          {option.status}
        </span>
      </div>
      <div className="mt-3 flex sm:hidden">
        <button
          type="button"
          onClick={onToggleBreakdown}
          className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-xs font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
        >
          View breakdown
        </button>
      </div>
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-[#213343]/55 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 sm:flex">
        <div className="flex w-full max-w-[220px] flex-col gap-2 px-4">
          <button
            type="button"
            onClick={onToggleBreakdown}
            className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#213343] transition hover:bg-[#f6f8fb]"
          >
            View breakdown
          </button>
        </div>
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
          className="w-full rounded-md border border-[#d9e2ec] bg-white py-2.5 pl-7 pr-3 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
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
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
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
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#111111] disabled:bg-[#f6f8fb] disabled:text-gray-400"
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
        className="mt-1 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#111111]"
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <PricingPageInner />
    </Suspense>
  );
}
