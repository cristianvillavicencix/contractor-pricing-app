"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Trash2 } from "lucide-react";
import {
  calculatePricingEngine,
  type PricingEngineInput,
  type PricingEngineOption,
} from "@/lib/pricing-engine";
import {
  formatMargin,
  formatMoney,
  getTierDisplayName,
  getTotalCost,
  mergeAppSettings,
  projectSizeOptions,
  riskLevelOptions,
  stateOptions,
  statusOptions,
  strategyOptions,
  TYPICAL_COSTS,
  type AppSettings,
  type CostBreakdown,
  type PriceOptionName,
  type PricingResult,
  type Project,
  type ProjectSize,
  type ProjectStatus,
  type RiskLevel,
  type Strategy,
  type Trade,
} from "@/lib/app-data";

type Tab = "costs" | "proposal" | "notes";

type CoreCostFieldKey = keyof Pick<
  CostBreakdown,
  "materials" | "labor" | "dumpster" | "permits" | "equipment" | "subcontractor" | "miscellaneous"
>;

const costFields: { key: CoreCostFieldKey; label: string }[] = [
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
  settings,
  pricingResults: _pricingResults,
  initialTab = "costs",
  onClose,
  onUpdateProject,
  onPriceProject: _onPriceProject,
  onCreateQuote,
  onDuplicateProject: _onDuplicateProject,
  onOpenContact,
  onDeleteProject,
  quotes = [],
  onPreviewQuote,
}: {
  project: Project;
  settings: AppSettings;
  pricingResults?: PricingResult[];
  initialTab?: Tab;
  onClose: () => void;
  onUpdateProject: (project: Project) => void;
  onPriceProject: (project: Project) => void;
  onDeleteProject?: (
    project: Project,
    options: { deleteQuotes: boolean }
  ) => Promise<void>;
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
  onOpenContact?: () => void;
  quotes?: import("@/lib/app-data").Quote[];
  onPreviewQuote?: (quoteId: string) => void;
}) {
  const mergedSettings = useMemo(() => mergeAppSettings(settings), [settings]);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [draftProject, setDraftProject] = useState(project);
  const [selectedOption, setSelectedOption] = useState<PriceOptionName>("Better");
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteQuotesToo, setDeleteQuotesToo] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

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
      ...(() => {
        const c = draftProject.costs;
        const tier: Partial<Record<PriceOptionName, number>> = {};
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
          Good: mergedSettings.pricingDefaults.goodMargin / 100,
          Better: mergedSettings.pricingDefaults.betterMargin / 100,
          Best: mergedSettings.pricingDefaults.bestMargin / 100,
        },
        minimumSafeMargin: mergedSettings.pricingDefaults.minimumSafeMargin / 100,
        stateAdjustments: Object.fromEntries(
          stateOptions.map((s) => [
            s,
            (mergedSettings.marketLocation.stateAdjustments[s] ?? 0) / 100,
          ])
        ) as Record<import("@/lib/app-data").ProjectState, number>,
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
      draftProject.costs.materialsGood,
      draftProject.costs.materialsBetter,
      draftProject.costs.materialsBest,
    ]
  );

  const result = useMemo(() => calculatePricingEngine(engineInput), [engineInput]);
  const baseCost = getTotalCost(draftProject.costs);
  const recommendedOption = result.options.find((opt) => opt.recommended) ?? result.options[1];
  const lastCalculationDate = quotes[0]?.createdAt ?? new Date().toLocaleDateString();
  const selectedProposalResult =
    selectedOption === "Good"
      ? result.options[0]
      : selectedOption === "Better"
        ? result.options[1]
        : result.options[2];

  function updateCost(key: CoreCostFieldKey, value: number) {
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

  function saveNotes() {
    onUpdateProject(draftProject);
    setMessage("Notes saved.");
  }

  function createProposal() {
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
    setMessage(`${getTierDisplayName(mergedSettings, selectedOption)} proposal created.`);
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
            <h2 className="text-xl font-semibold tracking-tight text-[#0f172a]">
              {draftProject.projectName}{" "}
              <span className="font-normal text-gray-400">|</span>{" "}
              <span className="text-lg font-medium">{draftProject.status}</span>{" "}
              <span className="font-normal text-gray-400">|</span>{" "}
              <span className="text-lg font-medium">{draftProject.trade}</span>
            </h2>
            <div className="mt-2 space-y-0.5 text-sm text-gray-600">
              <p>
                Contact:{" "}
                {onOpenContact ? (
                  <button
                    type="button"
                    onClick={onOpenContact}
                    className="font-semibold text-[var(--brand-accent)] underline underline-offset-2"
                  >
                    {draftProject.customerName}
                  </button>
                ) : (
                  <span className="font-medium text-gray-700">{draftProject.customerName}</span>
                )}
              </p>
              <p className="whitespace-nowrap overflow-hidden text-ellipsis">
                Address: {[draftProject.address, draftProject.city, draftProject.state, draftProject.zipCode].filter(Boolean).join(", ") || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="sr-only" htmlFor="project-status-select">Project status</label>
            <select
              id="project-status-select"
              value={draftProject.status}
              onChange={(e) => updateStatus(e.target.value as ProjectStatus)}
              className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#213343] outline-none transition hover:bg-[#f6f8fb] focus:border-[#ff5c35]"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
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
              { id: "costs", label: "Costs" },
              { id: "proposal", label: "Proposal" },
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

        {/* ── Costs ── */}
        {activeTab === "costs" && (
          <div className="mt-5 space-y-5">
            {baseCost > 0 ? (
              <div className="rounded border border-[#d9e2ec]/80 bg-[#f8fafd] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Calculator summary
                </p>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                  <MiniRow label="Last calculation" value={lastCalculationDate} />
                  <MiniRow
                    label="Recommended option"
                    value={getTierDisplayName(mergedSettings, recommendedOption.name)}
                    strong
                  />
                  <MiniRow label="Recommended price" value={formatMoney(recommendedOption.salePrice)} strong />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Full pricing controls live in Calculator.
                </p>
                <button
                  type="button"
                  onClick={() => _onPriceProject(draftProject)}
                  className="mt-3 rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  Open Calculator
                </button>
              </div>
            ) : (
              <div className="rounded border border-[#d9e2ec]/80 bg-[#f8fafd] p-4">
                <p className="text-sm text-gray-500">
                  No calculator summary yet for this project.
                </p>
                <button
                  type="button"
                  onClick={() => _onPriceProject(draftProject)}
                  className="mt-3 rounded-md border border-[#d9e2ec] px-4 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  Open Calculator
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Proposal ── */}
        {activeTab === "proposal" && (
          <div className="mt-5 space-y-5">
            {/* Existing proposals for this project */}
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
                            {getTierDisplayName(mergedSettings, q.selectedOption)} ·{" "}
                            {formatMoney(selected.salePrice)} · {q.status}
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

            {/* Create new proposal */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {quotes.length > 0 ? "New Proposal" : "Create Proposal"}
              </p>
              {baseCost === 0 ? (
                <p className="text-sm text-gray-400">
                  Add costs in the Costs tab first.
                </p>
              ) : (
                <>
                  <div className="rounded-lg border border-[#d9e2ec] bg-white p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Proposal tier
                      <select
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(e.target.value as PriceOptionName)}
                        className="mt-2 w-full rounded-md border border-[#d9e2ec] bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#ff5c35]"
                      >
                        {result.options.map((opt) => (
                          <option key={opt.name} value={opt.name}>
                            {getTierDisplayName(mergedSettings, opt.name)}
                            {opt.recommended ? " (Recommended)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <MiniRow label="Sale Price" value={formatMoney(selectedProposalResult.salePrice)} strong />
                      <MiniRow label="Profit" value={formatMoney(selectedProposalResult.netProfit)} />
                      <MiniRow label="Margin" value={formatMargin(selectedProposalResult.margin)} />
                    </div>
                  </div>
                  <button
                    onClick={createProposal}
                    className="mt-4 rounded-md bg-[#ff5c35] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#e94820]"
                  >
                    Create {getTierDisplayName(mergedSettings, selectedOption)} Proposal
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
              onChange={(e) => setDraftProject((prev) => ({ ...prev, notes: e.target.value }))}
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

        {onDeleteProject ? (
          <div className="mt-8 border-t border-[#d9e2ec] pt-6">
            {!deleteOpen ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteErr(null);
                  setDeleteQuotesToo(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete project
              </button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-4">
                <p className="text-sm font-semibold text-red-800">Delete this project?</p>
                <p className="mt-2 text-xs text-red-700">
                  This cannot be undone.{" "}
                  {quotes.length > 0 ? (
                    <>
                      There {quotes.length === 1 ? "is" : "are"}{" "}
                      <strong>{quotes.length}</strong> proposal
                      {quotes.length === 1 ? "" : "s"} linked to this project.
                    </>
                  ) : (
                    "No proposals are linked."
                  )}
                </p>
                {quotes.length > 0 ? (
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-red-900">
                    <input
                      type="checkbox"
                      checked={deleteQuotesToo}
                      onChange={(e) => setDeleteQuotesToo(e.target.checked)}
                      className="mt-0.5 rounded border-red-300"
                    />
                    <span>
                      Also delete {quotes.length === 1 ? "this proposal" : "these proposals"} from the
                      database (required to remove the project).
                    </span>
                  </label>
                ) : null}
                {deleteErr ? (
                  <p className="mt-2 text-xs font-medium text-red-700">{deleteErr}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      deleteBusy || (quotes.length > 0 && !deleteQuotesToo)
                    }
                    onClick={async () => {
                      if (quotes.length > 0 && !deleteQuotesToo) return;
                      setDeleteErr(null);
                      setDeleteBusy(true);
                      try {
                        await onDeleteProject(draftProject, {
                          deleteQuotes: deleteQuotesToo && quotes.length > 0,
                        });
                      } catch (e) {
                        setDeleteErr(
                          e instanceof Error ? e.message : "Could not delete project"
                        );
                      } finally {
                        setDeleteBusy(false);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteBusy ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteErr(null);
                    }}
                    className="rounded-md border border-[#d9e2ec] bg-white px-4 py-2 text-xs font-medium transition hover:bg-[#f6f8fb]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
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
  tierLabel,
  selected,
  onSelect,
}: {
  option: PricingEngineOption;
  tierLabel: string;
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
          {tierLabel}
        </span>
        {option.recommended && (
          <span className="shrink-0 rounded bg-[#ff5c35] px-1.5 py-0.5 text-[10px] font-semibold text-white">
            Recommended
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
