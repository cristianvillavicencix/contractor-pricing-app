"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, ExternalLink } from "lucide-react";
import {
  calculatePricingEngine,
  type PricingEngineInput,
  type PricingEngineOption,
} from "@/lib/pricing-engine";
import {
  defaultSettings,
  formatMargin,
  formatMoney,
  getTotalCost,
  mergeAppSettings,
  projectSizeOptions,
  riskLevelOptions,
  stateOptions,
  statusOptions,
  strategyOptions,
  storageKeys,
  tradeOptions,
  TYPICAL_COSTS,
  type AppSettings,
  type CostBreakdown,
  type PriceOptionName,
  type PricingResult,
  type Project,
  type ProjectSize,
  type ProjectState,
  type ProjectStatus,
  type RiskLevel,
  type Strategy,
  type Trade,
} from "@/lib/app-data";
import { useLocalStorageState } from "@/lib/use-local-storage";
import { ProjectStatusBadge } from "./project-status-badge";

type Tab = "overview" | "costs" | "quote" | "notes";

const costFields: { key: keyof CostBreakdown; label: string }[] = [
  { key: "materials", label: "Materials" },
  { key: "labor", label: "Labor" },
  { key: "subcontractor", label: "Subcontractor" },
  { key: "dumpster", label: "Dumpster / Disposal" },
  { key: "equipment", label: "Equipment" },
  { key: "permits", label: "Permits" },
  { key: "miscellaneous", label: "Miscellaneous" },
];

export function ProjectDetailPanel({
  project,
  pricingResults: _pricingResults,
  initialTab = "costs",
  onClose,
  onUpdateProject,
  onPriceProject: _onPriceProject,
  onCreateQuote,
  onDuplicateProject,
  quotes = [],
  onPreviewQuote,
}: {
  project: Project;
  pricingResults?: PricingResult[];
  initialTab?: Tab;
  onClose: () => void;
  onUpdateProject: (project: Project) => void;
  onPriceProject: (project: Project) => void;
  onCreateQuote: (
    project: Project,
    pricing: PricingResult[],
    selectedOption: PriceOptionName,
    snapshot?: {
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      trade?: string;
      warrantyText?: string;
      termsText?: string;
      proposalTitle?: string;
    }
  ) => void;
  onDuplicateProject?: (project: Project) => void;
  quotes?: import("@/lib/app-data").Quote[];
  onPreviewQuote?: (quoteId: string) => void;
}) {
  const [settings] = useLocalStorageState<AppSettings>(
    storageKeys.settings,
    defaultSettings
  );
  const mergedSettings = useMemo(() => mergeAppSettings(settings), [settings]);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [draftProject, setDraftProject] = useState(project);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<PriceOptionName>("Better");
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [overheadPct, setOverheadPct] = useState(() =>
    mergedSettings.costRules.includeOverhead ? mergedSettings.costRules.defaultOverheadPercent : 0
  );
  const [overheadMethod, setOverheadMethod] = useState<
    PricingEngineInput["businessCosts"]["overheadAllocationMethod"]
  >(() =>
    mergedSettings.costRules.includeOverhead
      ? mergedSettings.costRules.overheadAllocationMethod
      : "Ignore For Now"
  );
  const [flatOverhead, setFlatOverhead] = useState(
    () => mergedSettings.costRules.flatOverheadPerProject
  );
  const [monthlyOverhead, setMonthlyOverhead] = useState(
    () => mergedSettings.costRules.monthlyOverhead
  );
  const [billableDays, setBillableDays] = useState(
    () => mergedSettings.costRules.monthlyBillableDays
  );
  const [durationDays, setDurationDays] = useState(
    () => mergedSettings.costRules.defaultProjectDurationDays
  );
  const [laborBurdenPct, setLaborBurdenPct] = useState(
    () => mergedSettings.costRules.laborBurdenPercent
  );
  const [minimumJobPrice, setMinimumJobPrice] = useState(
    () => mergedSettings.costRules.minimumJobPrice
  );
  const [miscBufferPct, setMiscBufferPct] = useState(
    () => mergedSettings.costRules.miscellaneousBufferPercent
  );
  const [includeMiscBuffer, setIncludeMiscBuffer] = useState(
    () => mergedSettings.costRules.includeMiscellaneousBuffer
  );
  const [permitBuffer, setPermitBuffer] = useState(
    () => mergedSettings.costRules.permitBuffer
  );
  const [commissionPct, setCommissionPct] = useState(0);
  const [includeCommission, setIncludeCommission] = useState(false);
  const [financingPct, setFinancingPct] = useState(() => mergedSettings.costRules.financingFeePercent);
  const [includeFinancing, setIncludeFinancing] = useState(
    () => mergedSettings.costRules.includeFinancingFee
  );
  const [ccPct, setCcPct] = useState(() => mergedSettings.costRules.creditCardFeePercent);
  const [includeCc, setIncludeCc] = useState(() => mergedSettings.costRules.includeCreditCardFee);
  const [taxPct, setTaxPct] = useState(() => mergedSettings.costRules.taxPercent);
  const [includeTax, setIncludeTax] = useState(() => mergedSettings.costRules.includeTax);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(() => draftProject.riskLevel);
  const [projectSize, setProjectSize] = useState<ProjectSize>(() => draftProject.projectSize);
  const [strategy, setStrategy] = useState<Strategy>(
    () => mergedSettings.pricingDefaults.defaultStrategy
  );

  const engineInput = useMemo<PricingEngineInput>(
    () => ({
      costs: {
        material: draftProject.costs.materials,
        labor: draftProject.costs.labor,
        dumpster: draftProject.costs.dumpster,
        permits: draftProject.costs.permits,
        equipment: draftProject.costs.equipment,
        subcontractor: draftProject.costs.subcontractor,
        miscellaneous: draftProject.costs.miscellaneous,
      },
      businessCosts: {
        overheadPercent: overheadPct,
        overheadAllocationMethod: overheadMethod,
        monthlyOverhead,
        flatOverheadPerProject: flatOverhead,
        monthlyBillableDays: billableDays,
        projectDurationDays: durationDays,
        laborBurdenPercent: laborBurdenPct,
        minimumJobPrice,
        miscellaneousBufferPercent: miscBufferPct,
        permitBuffer,
        creditCardFeePercent: ccPct,
        financingFeePercent: financingPct,
        taxPercent: taxPct,
        includeCreditCardFee: includeCc,
        includeFinancingFee: includeFinancing,
        includeTax,
        includeMiscellaneousBuffer: includeMiscBuffer,
      },
      commission: {
        includeCommission,
        commissionType: "Percentage",
        commissionPercentage: commissionPct,
        commissionFlatAmount: 0,
      },
      setup: {
        trade: draftProject.trade,
        state: draftProject.state,
        companyLevel: mergedSettings.companyProfile.companyLevel,
        projectSize,
        riskLevel,
        strategy,
      },
      pricingRules: {
        baseMargins: {
          Good: mergedSettings.pricingDefaults.goodMargin / 100,
          Better: mergedSettings.pricingDefaults.betterMargin / 100,
          Best: mergedSettings.pricingDefaults.bestMargin / 100,
        },
        minimumSafeMargin: mergedSettings.pricingDefaults.minimumSafeMargin / 100,
        stateAdjustments: {
          Connecticut:
            mergedSettings.marketLocation.stateAdjustments.Connecticut / 100,
          "New York": mergedSettings.marketLocation.stateAdjustments.NewYork / 100,
          "New Jersey":
            mergedSettings.marketLocation.stateAdjustments.NewJersey / 100,
          Florida: mergedSettings.marketLocation.stateAdjustments.Florida / 100,
          Texas: mergedSettings.marketLocation.stateAdjustments.Texas / 100,
        },
      },
    }),
    [
      draftProject,
      overheadPct,
      overheadMethod,
      flatOverhead,
      monthlyOverhead,
      billableDays,
      durationDays,
      laborBurdenPct,
      minimumJobPrice,
      miscBufferPct,
      includeMiscBuffer,
      permitBuffer,
      commissionPct,
      includeCommission,
      financingPct,
      includeFinancing,
      ccPct,
      includeCc,
      taxPct,
      includeTax,
      riskLevel,
      projectSize,
      strategy,
      mergedSettings,
    ]
  );

  const result = useMemo(() => calculatePricingEngine(engineInput), [engineInput]);
  const baseCost = getTotalCost(draftProject.costs);

  function updateField<K extends keyof Project>(key: K, value: Project[K]) {
    setDraftProject((prev) => ({ ...prev, [key]: value }));
  }

  function updateCost(key: keyof CostBreakdown, value: number) {
    setDraftProject((prev) => ({
      ...prev,
      costs: { ...prev.costs, [key]: Number.isFinite(value) ? value : 0 },
    }));
  }

  function saveCosts() {
    const next: Project = {
      ...draftProject,
      riskLevel,
      projectSize,
      status: baseCost > 0 ? "Pricing" : "Draft",
    };
    setDraftProject(next);
    onUpdateProject(next);
    setMessage("Costs saved.");
  }

  function saveOverview() {
    onUpdateProject(draftProject);
    setIsEditing(false);
    setMessage("Project saved.");
  }

  function saveNotes() {
    onUpdateProject(draftProject);
    setMessage("Notes saved.");
  }

  function createQuote() {
    const pricingForQuote: PricingResult[] = result.options.map((opt) => ({
      name: opt.name,
      salePrice: opt.salePrice,
      profit: opt.netProfit,
      margin: opt.margin,
      markup: opt.markup,
      description: "",
      useCase: "",
      recommended: opt.recommended,
    }));
    const next: Project = { ...draftProject, status: "Quoted" };
    setDraftProject(next);
    onCreateQuote(next, pricingForQuote, selectedOption, {
      customerPhone: draftProject.customerPhone,
      customerEmail: draftProject.customerEmail,
      customerAddress: `${draftProject.address}, ${draftProject.city}, ${draftProject.state} ${draftProject.zipCode}`,
      trade: draftProject.trade,
      warrantyText: mergedSettings.proposalSettings.defaultWarrantyText,
      termsText: mergedSettings.proposalSettings.defaultTerms,
      proposalTitle: mergedSettings.proposalSettings.defaultProposalTitle,
    });
    setMessage(`${selectedOption} quote created.`);
  }

  function updateStatus(status: ProjectStatus) {
    const next = { ...draftProject, status };
    setDraftProject(next);
    onUpdateProject(next);
    setMessage(`Marked as ${status}.`);
  }

  const pricingInsight = buildInsight(
    draftProject,
    result,
    overheadPct,
    riskLevel,
    strategy,
    overheadMethod
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#213343]/20 backdrop-blur-sm"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="ml-auto h-full w-full overflow-auto border-l border-[#d9e2ec] bg-white p-5 sm:p-6 lg:w-1/2"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight">
                {draftProject.projectName}
              </h2>
              <ProjectStatusBadge status={draftProject.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {draftProject.trade} · {draftProject.customerName} · {draftProject.createdAt}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
          >
            Close
          </button>
        </div>

        {message ? (
          <p className="mt-3 rounded border border-[#d9e2ec] bg-[#f6f8fb] px-4 py-2.5 text-sm text-gray-600">
            {message}
          </p>
        ) : null}

        {/* Tab bar */}
        <div className="mt-5 flex border-b border-[#d9e2ec]">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "costs", label: "Costs & Pricing" },
              { id: "quote", label: "Quote" },
              { id: "notes", label: "Notes" },
            ] as { id: Tab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-black text-black"
                  : "border-transparent text-gray-400 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <span />
              <div className="flex gap-2">
                {isEditing && (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => (isEditing ? saveOverview() : setIsEditing(true))}
                  className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  {isEditing ? "Save" : "Edit"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PanelBlock title="Customer">
                {isEditing ? (
                  <div className="space-y-4">
                    <InputField
                      label="Name"
                      value={draftProject.customerName}
                      onChange={(v) => updateField("customerName", v)}
                    />
                    <InputField
                      label="Phone"
                      value={draftProject.customerPhone}
                      onChange={(v) => updateField("customerPhone", v)}
                    />
                    <InputField
                      label="Email"
                      value={draftProject.customerEmail}
                      onChange={(v) => updateField("customerEmail", v)}
                    />
                  </div>
                ) : (
                  <>
                    <FieldText label="Name" value={draftProject.customerName} />
                    <FieldText
                      label="Phone"
                      value={draftProject.customerPhone || "Not set"}
                    />
                    <FieldText
                      label="Email"
                      value={draftProject.customerEmail || "Not set"}
                    />
                  </>
                )}
              </PanelBlock>

              <PanelBlock title="Address">
                {isEditing ? (
                  <div className="space-y-4">
                    <InputField
                      label="Street"
                      value={draftProject.address}
                      onChange={(v) => updateField("address", v)}
                    />
                    <InputField
                      label="City"
                      value={draftProject.city}
                      onChange={(v) => updateField("city", v)}
                    />
                    <InputField
                      label="ZIP"
                      value={draftProject.zipCode}
                      onChange={(v) => updateField("zipCode", v)}
                    />
                    <SelectField
                      label="State"
                      value={draftProject.state}
                      options={stateOptions}
                      onChange={(v) => updateField("state", v as ProjectState)}
                    />
                  </div>
                ) : (
                  <>
                    <FieldText label="Street" value={draftProject.address} />
                    <FieldText
                      label="City, State ZIP"
                      value={`${draftProject.city}, ${draftProject.state} ${draftProject.zipCode}`}
                    />
                  </>
                )}
              </PanelBlock>
            </div>

            <div className="border border-[#d9e2ec]/80 p-5">
              <h3 className="text-sm font-medium">Project Setup</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Project name"
                  value={draftProject.projectName}
                  disabled={!isEditing}
                  onChange={(v) => updateField("projectName", v)}
                />
                <SelectField
                  label="Trade"
                  value={draftProject.trade}
                  options={tradeOptions}
                  disabled={!isEditing}
                  onChange={(v) => updateField("trade", v as Trade)}
                />
                <SelectField
                  label="Status"
                  value={draftProject.status}
                  options={statusOptions}
                  disabled={!isEditing}
                  onChange={(v) => updateField("status", v as ProjectStatus)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateStatus("Won")}
                className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                Mark as Won
              </button>
              <button
                onClick={() => updateStatus("Lost")}
                className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                Mark as Lost
              </button>
              {onDuplicateProject && (
                <button
                  onClick={() => onDuplicateProject(draftProject)}
                  className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Costs & Pricing ── */}
        {activeTab === "costs" && (
          <div className="mt-5 space-y-5">
            {/* Quick cost inputs */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Quick Costs
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {costFields.map((field) => (
                  <MoneyField
                    key={field.key}
                    label={field.label}
                    value={draftProject.costs[field.key]}
                    onChange={(v) => updateCost(field.key, v)}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#d9e2ec] pt-3">
                <span className="text-sm text-gray-500">Base Cost</span>
                <span className="text-base font-semibold">{formatMoney(baseCost)}</span>
              </div>
            </div>

            {/* Advanced options */}
            <div className="rounded border border-[#d9e2ec]/80">
              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                <span>Advanced Options</span>
                {advancedOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {advancedOpen && (
                <div className="border-t border-[#d9e2ec] px-5 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="Overhead Method"
                      value={overheadMethod}
                      options={[
                        "Percentage",
                        "Flat Per Project",
                        "Project Duration",
                        "Ignore For Now",
                      ]}
                      onChange={(v) =>
                        setOverheadMethod(
                          v as PricingEngineInput["businessCosts"]["overheadAllocationMethod"]
                        )
                      }
                    />

                    <NumberField
                      label="Minimum Job Price"
                      value={minimumJobPrice}
                      onChange={setMinimumJobPrice}
                    />

                    <NumberField
                      label="Overhead %"
                      value={overheadPct}
                      onChange={setOverheadPct}
                    />

                    <NumberField
                      label="Flat Overhead"
                      value={flatOverhead}
                      onChange={setFlatOverhead}
                    />

                    <NumberField
                      label="Monthly Overhead"
                      value={monthlyOverhead}
                      onChange={setMonthlyOverhead}
                    />

                    <NumberField
                      label="Billable Days / Month"
                      value={billableDays}
                      onChange={setBillableDays}
                    />

                    <NumberField
                      label="Project Duration Days"
                      value={durationDays}
                      onChange={setDurationDays}
                    />

                    <NumberField
                      label="Labor Burden %"
                      value={laborBurdenPct}
                      onChange={setLaborBurdenPct}
                    />

                    <ToggleNumberField
                      label="Misc Buffer %"
                      value={miscBufferPct}
                      enabled={includeMiscBuffer}
                      onToggle={setIncludeMiscBuffer}
                      onChange={setMiscBufferPct}
                    />

                    <NumberField
                      label="Permit Buffer"
                      value={permitBuffer}
                      onChange={setPermitBuffer}
                    />

                    <ToggleNumberField
                      label="Commission %"
                      value={commissionPct}
                      enabled={includeCommission}
                      onToggle={setIncludeCommission}
                      onChange={setCommissionPct}
                    />

                    <ToggleNumberField
                      label="Financing Fee %"
                      value={financingPct}
                      enabled={includeFinancing}
                      onToggle={setIncludeFinancing}
                      onChange={setFinancingPct}
                    />

                    <ToggleNumberField
                      label="Credit Card Fee %"
                      value={ccPct}
                      enabled={includeCc}
                      onToggle={setIncludeCc}
                      onChange={setCcPct}
                    />

                    <ToggleNumberField
                      label="Tax %"
                      value={taxPct}
                      enabled={includeTax}
                      onToggle={setIncludeTax}
                      onChange={setTaxPct}
                    />

                    <SelectField
                      label="Risk Level"
                      value={riskLevel}
                      options={riskLevelOptions}
                      onChange={(v) => setRiskLevel(v as RiskLevel)}
                    />

                    <SelectField
                      label="Project Size"
                      value={projectSize}
                      options={projectSizeOptions}
                      onChange={(v) => setProjectSize(v as ProjectSize)}
                    />

                    <SelectField
                      label="Strategy"
                      value={strategy}
                      options={strategyOptions}
                      onChange={(v) => setStrategy(v as Strategy)}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Defaults loaded from your Settings. Changes here only affect this calculation.
                  </p>
                </div>
              )}
            </div>

            {/* Real-time results */}
            {baseCost > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded border border-[#d9e2ec]/80 p-4">
                    <p className="text-xs text-gray-500">Breakeven Price</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMoney(result.breakevenPrice)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Includes overhead, burden, buffers, fees.
                    </p>
                  </div>
                  <div className="rounded border border-[#d9e2ec]/80 p-4">
                    <p className="text-xs text-gray-500">Min Safe Price</p>
                    <p className="mt-1 text-lg font-semibold">
                      {formatMoney(result.minimumSafePrice)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatMargin(result.minimumSafeMargin)} min margin
                    </p>
                  </div>
                </div>

                <div className="rounded border border-[#d9e2ec]/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Cost Protection
                  </p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <MiniRow label="Labor burden" value={formatMoney(result.laborBurdenCost)} />
                    <MiniRow label="Overhead" value={formatMoney(result.overheadCost)} />
                    <MiniRow label="Misc buffer" value={formatMoney(result.bufferCost)} />
                    <MiniRow label="Permit buffer" value={formatMoney(result.permitBufferCost)} />
                    <MiniRow label="Tax on Better" value={formatMoney(result.taxCost)} />
                    <MiniRow label="Total protection" value={formatMoney(result.businessCostTotal)} strong />
                  </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-3 gap-3">
                  {result.options.map((opt) => (
                    <PricingCard
                      key={opt.name}
                      option={opt}
                      selected={selectedOption === opt.name}
                      onSelect={() => setSelectedOption(opt.name)}
                    />
                  ))}
                </div>

                {/* Project health */}
                <ProjectHealthBadge
                  status={result.projectStatus}
                  reason={result.projectStatusReason}
                />

                {/* Pricing insight */}
                <div className="rounded border border-[#d9e2ec]/80 bg-[#f6f8fb] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Pricing Insight
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{pricingInsight}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                Enter costs above to see pricing recommendations.
              </p>
            )}

            <TypicalCostHint trade={draftProject.trade} size={projectSize} />

            <button
              onClick={saveCosts}
              className="rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
            >
              Save Costs
            </button>
          </div>
        )}

        {/* ── Quote ── */}
        {activeTab === "quote" && (
          <div className="mt-5 space-y-5">
            {/* Existing quotes for this project */}
            {quotes.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Proposals
                </p>
                <div className="space-y-2">
                  {quotes.map((q) => {
                    const selected =
                      q.selectedOption === "Good"
                        ? q.good
                        : q.selectedOption === "Better"
                          ? q.better
                          : q.best;
                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-3 rounded border border-[#d9e2ec] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black">
                            {q.proposalNumber ?? q.id.slice(-6).toUpperCase()}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {q.selectedOption} · {formatMoney(selected.salePrice)} · {q.status}
                          </p>
                        </div>
                        {onPreviewQuote && (
                          <button
                            onClick={() => onPreviewQuote(q.id)}
                            className="flex shrink-0 items-center gap-1.5 rounded border border-[#d9e2ec] px-3 py-1.5 text-xs font-medium transition hover:bg-[#f6f8fb]"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Preview
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create new quote */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {quotes.length > 0 ? "New Quote" : "Create Quote"}
              </p>
              {baseCost === 0 ? (
                <p className="text-sm text-gray-400">
                  Add costs in the Costs &amp; Pricing tab first.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {result.options.map((opt) => (
                      <PricingCard
                        key={opt.name}
                        option={opt}
                        selected={selectedOption === opt.name}
                        onSelect={() => setSelectedOption(opt.name)}
                      />
                    ))}
                  </div>
                  <button
                    onClick={createQuote}
                    className="mt-4 rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
                  >
                    Create {selectedOption} Quote
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Notes ── */}
        {activeTab === "notes" && (
          <div className="mt-5 space-y-4">
            <textarea
              value={draftProject.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Add project notes..."
              className="min-h-48 w-full resize-none rounded-md border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            />
            <button
              onClick={saveNotes}
              className="rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
            >
              Save Notes
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function buildInsight(
  project: Project,
  result: ReturnType<typeof calculatePricingEngine>,
  overheadPct: number,
  riskLevel: RiskLevel,
  strategy: Strategy,
  overheadMethod: PricingEngineInput["businessCosts"]["overheadAllocationMethod"]
): string {
  const parts: string[] = [`${project.trade} work in ${project.state}`];

  if (result.adjustments.trade !== 0) {
    parts.push(`${project.trade} trade factor`);
  }
  if (result.adjustments.state !== 0) {
    const dir = result.adjustments.state > 0 ? "upward" : "downward";
    parts.push(`${project.state} market (${dir})`);
  }
  if (result.adjustments.company !== 0) {
    parts.push("company level adjustment");
  }
  if (overheadMethod === "Percentage" && overheadPct > 0) {
    parts.push(`${overheadPct}% overhead`);
  } else if (overheadMethod !== "Ignore For Now") {
    parts.push(`${overheadMethod.toLowerCase()} overhead`);
  }
  if (riskLevel !== "Medium") {
    parts.push(`${riskLevel.toLowerCase()} risk premium`);
  }
  if (strategy !== "Balanced") {
    parts.push(`${strategy.toLowerCase()} pricing strategy`);
  }

  return `Pricing adjusted automatically for ${parts.join(", ")}.`;
}

function PricingCard({
  option,
  selected,
  onSelect,
}: {
  option: PricingEngineOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const statusStyle =
    option.status === "Safe"
      ? "bg-green-50 text-green-700"
      : option.status === "Tight"
        ? "bg-yellow-50 text-yellow-700"
        : "bg-red-50 text-red-700";

  return (
    <button
      onClick={onSelect}
      className={`rounded border p-3 text-left transition hover:bg-[#f6f8fb] ${
        selected
          ? "border-black bg-[#f6f8fb]"
          : option.recommended
            ? "border-black"
            : "border-[#d9e2ec]"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {option.name}
        </span>
        {option.recommended && (
          <span className="shrink-0 rounded bg-[#ff5c35] px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Best
          </span>
        )}
      </div>
      <p className="mt-2 text-lg font-bold tracking-tight">
        {formatMoney(option.salePrice)}
      </p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between text-gray-500">
          <span>Profit</span>
          <span className="font-medium text-black">{formatMoney(option.netProfit)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Margin</span>
          <span className="font-medium text-black">{formatMargin(option.margin)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Markup</span>
          <span className="font-medium text-black">{formatMargin(option.markup)}</span>
        </div>
      </div>
      <div className="mt-3">
        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
          {option.status}
        </span>
      </div>
    </button>
  );
}

function ProjectHealthBadge({
  status,
  reason,
}: {
  status: "Green" | "Yellow" | "Red";
  reason: string;
}) {
  const cfg = {
    Green: { dot: "bg-green-500", label: "Healthy", text: "text-green-700" },
    Yellow: { dot: "bg-yellow-500", label: "Caution", text: "text-yellow-700" },
    Red: { dot: "bg-red-500", label: "At Risk", text: "text-red-700" },
  }[status];

  return (
    <div className="flex items-start gap-3 rounded border border-[#d9e2ec]/80 px-4 py-3">
      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
      <div>
        <p className={`text-sm font-medium ${cfg.text}`}>
          Project Health: {cfg.label}
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{reason}</p>
      </div>
    </div>
  );
}

function PanelBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#d9e2ec]/80 p-5">
      <h3 className="text-sm font-medium text-black">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function FieldText({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-black">{value}</p>
    </div>
  );
}

function MiniRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "font-semibold text-black" : "font-medium text-black"}>
        {value}
      </span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5c35] disabled:bg-[#f6f8fb] disabled:text-gray-500"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5c35]"
      />
    </label>
  );
}

function ToggleNumberField({
  label,
  value,
  enabled,
  onToggle,
  onChange,
}: {
  label: string;
  value: number;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded"
          />
          Include
        </label>
      </div>
      <input
        type="number"
        min="0"
        value={value}
        disabled={!enabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5c35] disabled:bg-[#f6f8fb] disabled:text-gray-400"
      />
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          $
        </span>
        <input
          type="number"
          min="0"
          value={value || ""}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border border-[#d9e2ec] py-2.5 pl-7 pr-4 text-sm outline-none transition focus:border-[#ff5c35]"
        />
      </div>
    </label>
  );
}

function TypicalCostHint({ trade, size }: { trade: Trade; size: ProjectSize }) {
  const range = TYPICAL_COSTS[trade]?.[size];
  if (!range) return null;

  return (
    <div className="rounded border border-[#d9e2ec]/80 bg-[#f6f8fb] px-4 py-3 text-xs text-gray-500">
      <span className="font-semibold text-gray-700">Typical {trade} ({size}): </span>
      ${range.low.toLocaleString()}–${range.high.toLocaleString()} total cost · {range.note}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[#ff5c35] disabled:bg-[#f6f8fb] disabled:text-gray-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
