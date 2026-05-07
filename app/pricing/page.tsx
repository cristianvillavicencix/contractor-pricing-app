"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FolderPlus, RotateCcw, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  defaultSettings,
  formatMargin,
  formatMoney,
  getTodayLabel,
  initialProjects,
  companyLevelOptions,
  projectSizeOptions,
  riskLevelOptions,
  stateOptions,
  storageKeys,
  strategyOptions,
  tradeOptions,
  type AppSettings,
  type Project,
  type ProjectState,
  type Trade,
} from "@/lib/app-data";
import {
  calculatePricingEngine,
  type CommissionType,
  type PricingEngineInput,
  type PricingEngineOption,
} from "@/lib/pricing-engine";
import {
  readLocalStorage,
  useLocalStorageState,
  writeLocalStorage,
} from "@/lib/use-local-storage";

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
    miscellaneousBufferPercent: 5,
    creditCardFeePercent: 3,
    financingFeePercent: 3,
    includeCreditCardFee: false,
    includeFinancingFee: false,
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

type ProjectDraft = {
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
};

export default function PricingPage() {
  const router = useRouter();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectDraft, setProjectDraft] = useState<ProjectDraft>({
    projectName: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "",
    city: "",
  });
  const [projectError, setProjectError] = useState("");
  const [settings] = useLocalStorageState<AppSettings>(
    storageKeys.settings,
    defaultSettings
  );
  const [sourceProject, setSourceProject] = useState<Project | null>(() => {
    const savedProjects = readLocalStorage<Project[]>(storageKeys.projects, initialProjects);
    const projectId = readLocalStorage<string | null>(storageKeys.projectForPricing, null);
    return savedProjects.find((p) => p.id === projectId) ?? null;
  });
  const [input, setInput] = useState<PricingEngineInput>(() => {
    const savedProjects = readLocalStorage<Project[]>(storageKeys.projects, initialProjects);
    const projectId = readLocalStorage<string | null>(storageKeys.projectForPricing, null);
    const project = savedProjects.find((p) => p.id === projectId);
    if (!project) return { ...defaultInput, setup: { ...defaultInput.setup, companyLevel: settings.companyProfile.companyLevel, strategy: settings.pricingDefaults.defaultStrategy } };
    return {
      ...defaultInput,
      costs: {
        material: project.costs.materials,
        labor: project.costs.labor,
        dumpster: project.costs.dumpster,
        permits: project.costs.permits,
        equipment: project.costs.equipment,
        subcontractor: project.costs.subcontractor,
        miscellaneous: project.costs.miscellaneous,
      },
      setup: {
        trade: project.trade,
        state: project.state,
        companyLevel: settings.companyProfile.companyLevel,
        projectSize: project.projectSize,
        riskLevel: project.riskLevel,
        strategy: settings.pricingDefaults.defaultStrategy,
      },
    };
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const result = useMemo(() => calculatePricingEngine(input), [input]);
  const baseCost = result.baseCost;
  const hasResults = baseCost > 0;

  function reset() {
    setInput({ ...defaultInput, setup: { ...defaultInput.setup, companyLevel: settings.companyProfile.companyLevel, strategy: settings.pricingDefaults.defaultStrategy } });
    setSourceProject(null);
    writeLocalStorage(storageKeys.projectForPricing, null);
  }

  function saveProject() {
    if (!projectDraft.projectName.trim() || !projectDraft.customerName.trim()) {
      setProjectError("Project name and customer name are required.");
      return;
    }
    const existing = readLocalStorage<Project[]>(storageKeys.projects, initialProjects);
    const newProject: Project = {
      id: crypto.randomUUID(),
      projectName: projectDraft.projectName.trim(),
      customerName: projectDraft.customerName.trim(),
      customerPhone: projectDraft.customerPhone.trim(),
      customerEmail: projectDraft.customerEmail.trim(),
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
    writeLocalStorage(storageKeys.projects, [newProject, ...existing]);
    setShowProjectModal(false);
    setProjectDraft({ projectName: "", customerName: "", customerPhone: "", customerEmail: "", address: "", city: "" });
    setProjectError("");
    router.push("/projects");
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

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-[#213343] lg:flex">
      <AppSidebar />

      <main className="min-w-0 flex-1 overflow-auto p-5 sm:p-8 lg:p-10">
        <div className="w-full">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Calculator</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                Quick Pricing
              </h2>
              {sourceProject && (
                <p className="mt-1 text-sm text-gray-500">
                  From project:{" "}
                  <span className="font-medium text-black">{sourceProject.projectName}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {hasResults && (
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="flex items-center gap-2 rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Project</span>
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm font-medium transition hover:bg-[#f6f8fb]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
            {/* ── Left: inputs ── */}
            <div className="space-y-4">
              {/* Cost inputs */}
              <div className="rounded-lg border border-[#d9e2ec] bg-white p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
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
                {baseCost > 0 && (
                  <div className="mt-4 flex items-center justify-between border-t border-[#f0f4f8] pt-3">
                    <span className="text-sm text-gray-500">Total Cost</span>
                    <span className="text-base font-semibold">{formatMoney(baseCost)}</span>
                  </div>
                )}
              </div>

              {/* Advanced accordion */}
              <div className="rounded-lg border border-[#d9e2ec] bg-white">
                <button
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium transition hover:bg-[#f6f8fb]"
                >
                  <span>Advanced Options</span>
                  {advancedOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </button>
                {advancedOpen && (
                  <div className="border-t border-[#d9e2ec] px-5 pb-5 pt-4 space-y-5">
                    {/* Setup */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Project Setup</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectInput label="Trade" value={input.setup.trade} options={tradeOptions} onChange={(v) => updateSetup("trade", v as PricingEngineInput["setup"]["trade"])} />
                        <SelectInput label="State" value={input.setup.state} options={stateOptions} onChange={(v) => updateSetup("state", v as PricingEngineInput["setup"]["state"])} />
                        <SelectInput label="Company Level" value={input.setup.companyLevel} options={companyLevelOptions} onChange={(v) => updateSetup("companyLevel", v as PricingEngineInput["setup"]["companyLevel"])} />
                        <SelectInput label="Project Size" value={input.setup.projectSize} options={projectSizeOptions} onChange={(v) => updateSetup("projectSize", v as PricingEngineInput["setup"]["projectSize"])} />
                        <SelectInput label="Risk Level" value={input.setup.riskLevel} options={riskLevelOptions} onChange={(v) => updateSetup("riskLevel", v as PricingEngineInput["setup"]["riskLevel"])} />
                        <SelectInput label="Strategy" value={input.setup.strategy} options={strategyOptions} onChange={(v) => updateSetup("strategy", v as PricingEngineInput["setup"]["strategy"])} />
                      </div>
                    </div>

                    {/* Business costs */}
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Business Costs</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <NumberInput label="Overhead %" value={input.businessCosts.overheadPercent} onChange={(v) => updateBiz("overheadPercent", v)} />
                        <NumberInput label="Misc Buffer %" value={input.businessCosts.miscellaneousBufferPercent} onChange={(v) => updateBiz("miscellaneousBufferPercent", v)} />
                        <ToggleNumberInput label="CC Fee %" value={input.businessCosts.creditCardFeePercent} enabled={input.businessCosts.includeCreditCardFee} onToggle={(v) => updateBiz("includeCreditCardFee", v)} onChange={(v) => updateBiz("creditCardFeePercent", v)} />
                        <ToggleNumberInput label="Financing Fee %" value={input.businessCosts.financingFeePercent} enabled={input.businessCosts.includeFinancingFee} onToggle={(v) => updateBiz("includeFinancingFee", v)} onChange={(v) => updateBiz("financingFeePercent", v)} />
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
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#d9e2ec] bg-white">
                  <p className="text-sm text-gray-400">Enter costs to see pricing</p>
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
                    <RefBox label="Base Cost" value={formatMoney(baseCost)} sub={`Mat ${formatMoney(input.costs.material)} · Labor ${formatMoney(input.costs.labor)}`} />
                    <RefBox label="Breakeven" value={formatMoney(result.breakevenPrice)} sub={`Overhead ${formatMoney(result.overheadCost)}`} />
                    <RefBox label="Min Safe Price" value={formatMoney(result.minimumSafePrice)} sub={`${formatMargin(result.minimumSafeMargin)} minimum margin`} />
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
          onClick={() => setShowProjectModal(false)}
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
                  Saves this pricing as a new project · {input.setup.trade} · {input.setup.state}
                </p>
              </div>
              <button
                onClick={() => setShowProjectModal(false)}
                className="rounded-md p-1.5 text-gray-400 transition hover:bg-[#f6f8fb] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              <ModalField
                label="Project name *"
                value={projectDraft.projectName}
                placeholder="e.g. Roof replacement"
                onChange={(v) => setProjectDraft((d) => ({ ...d, projectName: v }))}
                className="sm:col-span-2"
              />
              <ModalField
                label="Customer name *"
                value={projectDraft.customerName}
                placeholder="Full name"
                onChange={(v) => setProjectDraft((d) => ({ ...d, customerName: v }))}
              />
              <ModalField
                label="Customer phone"
                value={projectDraft.customerPhone}
                placeholder="(000) 000-0000"
                onChange={(v) => setProjectDraft((d) => ({ ...d, customerPhone: v }))}
              />
              <ModalField
                label="Customer email"
                value={projectDraft.customerEmail}
                placeholder="email@example.com"
                onChange={(v) => setProjectDraft((d) => ({ ...d, customerEmail: v }))}
              />
              <ModalField
                label="Address"
                value={projectDraft.address}
                placeholder="Street address"
                onChange={(v) => setProjectDraft((d) => ({ ...d, address: v }))}
              />
              <ModalField
                label="City"
                value={projectDraft.city}
                placeholder="City"
                onChange={(v) => setProjectDraft((d) => ({ ...d, city: v }))}
              />

              {/* Pre-filled summary */}
              <div className="sm:col-span-2 rounded-lg border border-[#d9e2ec] bg-[#f6f8fb] px-4 py-3 text-xs text-gray-500">
                <span className="font-semibold text-gray-700">Pre-filled from calculator: </span>
                Trade: {input.setup.trade} · State: {input.setup.state} · Size: {input.setup.projectSize} · Risk: {input.setup.riskLevel} · Total cost: {formatMoney(result.baseCost)}
              </div>
            </div>

            {projectError && (
              <p className="px-6 pb-2 text-sm text-red-600">{projectError}</p>
            )}

            <div className="flex justify-end gap-3 border-t border-[#d9e2ec] px-6 py-4">
              <button
                onClick={() => { setShowProjectModal(false); setProjectError(""); }}
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
