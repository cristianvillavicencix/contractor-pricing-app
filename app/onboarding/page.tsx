"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Info, Minus, Plus, X } from "lucide-react";
import {
  companyLevelOptionsWithDesc,
  defaultSettings,
  mergeAppSettings,
  onboardingTradeOptions,
  stateOptions,
  type AppSettings,
  type CompanyLevel,
  type ProjectState,
  type SettingsTrade,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings, saveCompanySettings } from "@/lib/supabase/data";

type WizardState = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  trade: SettingsTrade;
  state: ProjectState;
  companyLevel: CompanyLevel;
  overheadMode: "manual" | "estimate";
  monthlyOverhead: number;
  laborBurdenPercent: number;
  vehicles: number;
  hasOffice: boolean;
  officeRent: number;
  nonJobStaff: number;
  insurance: number;
  phonesInternet: number;
  otherCosts: number;
  goodMargin: number;
  betterMargin: number;
  bestMargin: number;
  minimumSafeMargin: number;
  /** manual mode only: single number vs itemized lines */
  manualOverheadStyle: "total" | "lineItems";
  /** When non-empty in manual+lineItems, monthly total = sum(amounts) */
  overheadLineItems: OverheadLine[];
};

type OverheadLine = { id: string; label: string; amount: number };

function computeEstimate(s: WizardState): number {
  return (
    s.vehicles * 700 +
    (s.hasOffice ? s.officeRent : 0) +
    s.nonJobStaff * 3500 +
    s.insurance +
    s.phonesInternet +
    s.otherCosts
  );
}

const INITIAL: WizardState = {
  businessName: "", contactName: "", phone: "", email: "",
  trade: "Roofing", state: "Connecticut", companyLevel: "Small Crew",
  overheadMode: "estimate",
  monthlyOverhead: 1400,
  laborBurdenPercent: 20,
  vehicles: 1, hasOffice: false, officeRent: 0, nonJobStaff: 0,
  insurance: 500, phonesInternet: 200, otherCosts: 0,
  goodMargin: 28, betterMargin: 35, bestMargin: 42, minimumSafeMargin: 20,
  manualOverheadStyle: "total",
  overheadLineItems: [],
};

const OVERHEAD_LINE_TEMPLATES = [
  "Office or shop rent",
  "Vehicles (payments, insurance, fuel)",
  "General liability + workers comp",
  "Phone, internet, software",
  "Admin / estimator payroll (non-field)",
  "Equipment leases or tool purchases",
  "Marketing & advertising",
  "Other fixed monthly costs",
] as const;

function sumOverheadLines(lines: OverheadLine[]): number {
  return lines.reduce((s, row) => s + Math.max(0, row.amount), 0);
}

function linesFromEstimate(d: WizardState): OverheadLine[] {
  const rows: OverheadLine[] = [];
  if (d.vehicles > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: `Work vehicles (${d.vehicles} × $700/mo est.)`,
      amount: d.vehicles * 700,
    });
  }
  if (d.hasOffice && d.officeRent > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Office or shop rent",
      amount: d.officeRent,
    });
  }
  if (d.nonJobStaff > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: `Non-field staff (${d.nonJobStaff} × $3,500/mo est.)`,
      amount: d.nonJobStaff * 3500,
    });
  }
  if (d.insurance > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Insurance (GL, workers comp, etc.)",
      amount: d.insurance,
    });
  }
  if (d.phonesInternet > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Phone, internet, software",
      amount: d.phonesInternet,
    });
  }
  if (d.otherCosts > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Other monthly costs",
      amount: d.otherCosts,
    });
  }
  return rows;
}

function getEffectiveMonthlyOverhead(d: WizardState): number {
  if (d.overheadMode === "estimate") return computeEstimate(d);
  if (d.manualOverheadStyle === "lineItems" && d.overheadLineItems.length > 0) {
    return sumOverheadLines(d.overheadLineItems);
  }
  return d.monthlyOverhead;
}

type MarginSuggestion = {
  goodMargin: number;
  betterMargin: number;
  bestMargin: number;
  minimumSafeMargin: number;
  summary: string;
};

function suggestMarginsFromWizard(d: WizardState): MarginSuggestion {
  const overhead = getEffectiveMonthlyOverhead(d);
  const burden = d.laborBurdenPercent;
  let good = 28;
  let better = 35;
  let best = 42;
  let minSafe = 20;

  switch (d.companyLevel) {
    case "Solo Owner":
      good = 30;
      better = 38;
      best = 46;
      minSafe = 22;
      break;
    case "Small Crew":
      good = 28;
      better = 35;
      best = 42;
      minSafe = 20;
      break;
    case "Established Company":
      good = 27;
      better = 34;
      best = 41;
      minSafe = 20;
      break;
    case "Premium Company":
      good = 32;
      better = 40;
      best = 48;
      minSafe = 24;
      break;
    default:
      break;
  }

  let pressure = 0;
  if (overhead > 12_000) pressure = 3;
  else if (overhead > 7_000) pressure = 2;
  else if (overhead > 3_500) pressure = 1;

  good += pressure;
  better += pressure;
  best += pressure;

  if (burden >= 26) {
    good += 1;
    better += 1;
    best += 1;
    minSafe += 1;
  } else if (burden >= 22) {
    minSafe += 1;
  }

  minSafe = Math.min(minSafe, good - 5);
  minSafe = Math.max(12, minSafe);
  good = Math.min(75, good);
  better = Math.min(78, Math.max(good + 5, better));
  best = Math.min(80, Math.max(better + 5, best));

  const summary =
    pressure > 0 || burden >= 22
      ? `Based on your company size, monthly overhead (~$${overhead.toLocaleString()}), and labor burden (${burden}%): higher fixed costs usually mean you need a few extra points of margin to stay safe.`
      : `Based on your company size and typical overhead. Adjust if you already know your numbers — these are starting points.`;

  return { goodMargin: good, betterMargin: better, bestMargin: best, minimumSafeMargin: minSafe, summary };
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardState>(INITIAL);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        if (cancelled) return;
        if (raw && mergeAppSettings(raw).onboardingCompletedAt) {
          router.replace("/");
        }
      } catch {
        /* not logged in or network */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "overheadMode" && value === "estimate") {
        next.overheadLineItems = [];
        next.manualOverheadStyle = "total";
      }
      if (key === "overheadMode" && value === "manual" && prev.overheadMode === "estimate") {
        next.overheadLineItems = [];
        next.manualOverheadStyle = "total";
        next.monthlyOverhead = computeEstimate(prev);
      }
      if (
        key === "manualOverheadStyle" &&
        value === "total" &&
        prev.manualOverheadStyle === "lineItems"
      ) {
        const sum = sumOverheadLines(prev.overheadLineItems);
        if (sum > 0) next.monthlyOverhead = sum;
        next.overheadLineItems = [];
      }
      if (
        key === "manualOverheadStyle" &&
        value === "lineItems" &&
        prev.manualOverheadStyle === "total"
      ) {
        next.overheadLineItems =
          prev.monthlyOverhead > 0
            ? [{ id: crypto.randomUUID(), label: "Monthly overhead", amount: prev.monthlyOverhead }]
            : [{ id: crypto.randomUUID(), label: "", amount: 0 }];
      }
      if (next.overheadMode === "estimate") {
        next.monthlyOverhead = computeEstimate(next);
      }
      if (next.overheadMode === "manual" && next.manualOverheadStyle === "lineItems") {
        next.monthlyOverhead = sumOverheadLines(next.overheadLineItems);
      }
      return next;
    });
  }

  function patchWizard(patch: Partial<WizardState>) {
    setData((prev) => {
      const next = { ...prev, ...patch };
      if (patch.overheadMode === "estimate") {
        next.overheadLineItems = [];
        next.manualOverheadStyle = "total";
      }
      if (patch.manualOverheadStyle === "total") {
        const sum = sumOverheadLines(prev.overheadLineItems);
        if (
          prev.manualOverheadStyle === "lineItems" &&
          sum > 0 &&
          patch.monthlyOverhead === undefined
        ) {
          next.monthlyOverhead = sum;
        }
        next.overheadLineItems = [];
      }
      if (next.overheadMode === "estimate") {
        next.monthlyOverhead = computeEstimate(next);
      } else if (next.manualOverheadStyle === "lineItems") {
        next.monthlyOverhead = sumOverheadLines(next.overheadLineItems);
      }
      return next;
    });
  }

  function validate(): string {
    if (step === 1 && !data.businessName.trim()) return "Please enter your business name.";
    if (step === 3) {
      if (data.goodMargin >= data.betterMargin) return "Better margin must be higher than Good.";
      if (data.betterMargin >= data.bestMargin) return "Best margin must be higher than Better.";
      if (data.minimumSafeMargin >= data.goodMargin) return "Minimum safe margin should be below Good margin.";
    }
    return "";
  }

  function next() {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  async function complete() {
    try {
      const raw = await loadCompanySettings<AppSettings | null>(supabase);
      const base = mergeAppSettings(raw ?? defaultSettings);
      const state = data.state as ProjectState;
      const next = mergeAppSettings({
        ...base,
        companyProfile: {
          ...base.companyProfile,
          businessName: data.businessName.trim() || "My Company",
          contactName: data.contactName.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          mainTrade: data.trade,
          companyLevel: data.companyLevel,
        },
        pricingDefaults: {
          ...base.pricingDefaults,
          goodMargin: data.goodMargin,
          betterMargin: data.betterMargin,
          bestMargin: data.bestMargin,
          minimumSafeMargin: data.minimumSafeMargin,
        },
        marketLocation: {
          ...base.marketLocation,
          defaultState: state,
        },
        costRules: {
          ...base.costRules,
          monthlyOverhead: getEffectiveMonthlyOverhead(data),
          laborBurdenPercent: data.laborBurdenPercent,
          includeOverhead: true,
          includeMiscellaneousBuffer: true,
          miscellaneousBufferPercent: 5,
        },
        onboardingCompletedAt: new Date().toISOString(),
      });
      await saveCompanySettings(supabase, next);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f8fa] p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-xl font-bold tracking-tight text-[#213343]">ContractorPricing</p>
        </div>

        <div className="rounded-2xl border border-[#d9e2ec] bg-white p-8 shadow-sm">
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
          {step === 1 && <StepBusiness data={data} set={set} error={error} onNext={next} onBack={back} />}
          {step === 2 && <StepOverhead data={data} set={set} patch={patchWizard} onNext={next} onBack={back} />}
          {step === 3 && (
            <StepMargins data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />
          )}
          {step === 4 && <StepDone data={data} onComplete={complete} />}
        </div>

        {step > 0 && step < 4 && (
          <div className="mt-5 flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s < step ? "w-8 bg-[#ff5c35]" : s === step ? "w-8 bg-[#ff5c35]" : "w-8 bg-[#d9e2ec]"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1ea]">
        <span className="text-2xl">🏗️</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#213343]">
        Welcome to ContractorPricing
      </h1>
      <p className="mt-3 text-[#6B7280]">
        Let&apos;s set up your account in about 3 minutes. You&apos;ll be pricing jobs right after.
      </p>

      <div className="mt-6 space-y-3 rounded-xl bg-[#f6f8fb] p-5 text-left">
        {[
          { label: "Your business info", desc: "Name, trade, and location" },
          { label: "Your monthly costs", desc: "We help you estimate if you don't know the exact number" },
          { label: "Your target margins", desc: "We start with proven industry defaults" },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff5c35] text-[10px] font-bold text-white">
              {i + 1}
            </div>
            <div>
              <p className="text-sm font-medium text-[#213343]">{item.label}</p>
              <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5c35] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
      >
        Get Started
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-xs text-[#9CA3AF]">You can change everything later in Settings</p>
    </div>
  );
}

type StepProps = {
  data: WizardState;
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  patch?: (patch: Partial<WizardState>) => void;
  error?: string;
  onNext: () => void;
  onBack: () => void;
};

function StepBusiness({ data, set, error, onNext, onBack }: StepProps) {
  return (
    <div>
      <StepHeader step={1} title="Your Business" desc="Basic info that goes on your proposals." />

      <div className="mt-6 space-y-4">
        <Field label="Business Name" required>
          <input
            type="text"
            value={data.businessName}
            placeholder="GA Castro Construction LLC"
            onChange={(e) => set("businessName", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Your Name">
            <input
              type="text"
              value={data.contactName}
              placeholder="Cristian"
              onChange={(e) => set("contactName", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={data.phone}
              placeholder="(555) 000-0000"
              onChange={(e) => set("phone", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Main Trade">
            <select
              value={data.trade}
              onChange={(e) => set("trade", e.target.value as SettingsTrade)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            >
              {onboardingTradeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.value}</option>
              ))}
            </select>
          </Field>
          <Field label="State">
            <select
              value={data.state}
              onChange={(e) => set("state", e.target.value as ProjectState)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            >
              {stateOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Company Size">
          <div className="mt-2 grid grid-cols-2 gap-2">
            {companyLevelOptionsWithDesc.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("companyLevel", opt.value)}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  data.companyLevel === opt.value
                    ? "border-[#ff5c35] bg-[#fff1ea] font-medium text-[#213343]"
                    : "border-[#d9e2ec] text-[#6B7280] hover:border-[#b7c7d6]"
                }`}
              >
                <p className="font-medium text-[#213343]">{opt.value}</p>
                <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{opt.desc}</p>
              </button>
            ))}
          </div>
        </Field>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack />
    </div>
  );
}

function OverheadDetailModal({
  open,
  draft,
  onChangeDraft,
  onApply,
  onClose,
}: {
  open: boolean;
  draft: OverheadLine[];
  onChangeDraft: (lines: OverheadLine[]) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const total = sumOverheadLines(draft);

  function addRow() {
    onChangeDraft([...draft, { id: crypto.randomUUID(), label: "", amount: 0 }]);
  }

  function addSuggestedCategories() {
    const taken = new Set(draft.map((r) => r.label.trim().toLowerCase()).filter(Boolean));
    const toAdd: OverheadLine[] = [];
    for (const label of OVERHEAD_LINE_TEMPLATES) {
      const key = label.toLowerCase();
      if (!taken.has(key)) {
        toAdd.push({ id: crypto.randomUUID(), label, amount: 0 });
        taken.add(key);
      }
    }
    if (toAdd.length === 0) return;
    onChangeDraft([...draft, ...toAdd]);
  }

  function updateRow(id: string, patch: Partial<Pick<OverheadLine, "label" | "amount">>) {
    onChangeDraft(draft.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onChangeDraft(draft.filter((r) => r.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-[#d9e2ec] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overhead-detail-title"
      >
        <div className="flex items-start justify-between border-b border-[#d9e2ec] px-5 py-4">
          <div>
            <h3 id="overhead-detail-title" className="text-lg font-bold text-[#213343]">
              Monthly overhead — line by line
            </h3>
            <p className="mt-1 text-xs text-[#6B7280]">
              Add every fixed monthly cost. The total updates as you go — include rent, vehicles, insurance,
              software, admin payroll, marketing, and anything else you pay every month whether you work or not.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-[#f6f8fb] hover:text-[#213343]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {draft.map((row) => (
              <div key={row.id} className="flex gap-2 rounded-xl border border-[#d9e2ec] bg-[#f9fafb] p-3">
                <div className="min-w-0 flex-1">
                  <label className="sr-only">Description</label>
                  <input
                    type="text"
                    value={row.label}
                    placeholder="e.g. Shop rent"
                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                    className="w-full rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
                  />
                </div>
                <div className="flex w-28 shrink-0 flex-col">
                  <label className="sr-only">Amount per month</label>
                  <div className="flex items-center rounded-lg border border-[#d9e2ec] bg-white px-2">
                    <span className="text-xs text-[#9CA3AF]">$</span>
                    <input
                      type="number"
                      min={0}
                      value={row.amount || ""}
                      onChange={(e) =>
                        updateRow(row.id, { amount: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full min-w-0 border-0 bg-transparent py-2 pl-1 text-sm outline-none"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-center rounded-lg p-2 text-[#9CA3AF] transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove line"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-medium text-[#213343] transition hover:border-[#ff5c35]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </button>
            <button
              type="button"
              onClick={addSuggestedCategories}
              className="rounded-lg border border-dashed border-[#b7c7d6] bg-white px-3 py-2 text-xs font-medium text-[#6B7280] transition hover:border-[#ff5c35] hover:text-[#213343]"
            >
              Add common categories
            </button>
          </div>
        </div>

        <div className="border-t border-[#d9e2ec] bg-[#f6f8fb] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[#213343]">Total (this month)</span>
            <span className="text-lg font-bold text-[#213343]">${total.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#d9e2ec] bg-white py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#f9fafb]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 rounded-lg bg-[#ff5c35] py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
            >
              Apply total
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepOverhead({ data, set, patch, onNext, onBack }: StepProps) {
  const estimated = computeEstimate(data);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDraft, setDetailDraft] = useState<OverheadLine[]>([]);
  const effective = getEffectiveMonthlyOverhead(data);

  /** Optional: prefills line items from the estimate and switches to manual — no popup until user taps Edit. */
  function applyEstimateBreakdown() {
    const raw = linesFromEstimate(data);
    const lines = raw.length ? raw : [{ id: crypto.randomUUID(), label: "", amount: 0 }];
    const withIds = lines.map((l) => ({ ...l, id: crypto.randomUUID() }));
    patch?.({
      overheadMode: "manual",
      manualOverheadStyle: "lineItems",
      overheadLineItems: withIds,
      monthlyOverhead: sumOverheadLines(withIds),
    });
  }

  /** Opens the line-item editor only when the user explicitly asks (button). */
  function openDetailModal() {
    const lines =
      data.overheadLineItems.length > 0
        ? data.overheadLineItems.map((l) => ({ ...l }))
        : data.monthlyOverhead > 0
          ? [{ id: crypto.randomUUID(), label: "Monthly overhead", amount: data.monthlyOverhead }]
          : [{ id: crypto.randomUUID(), label: "", amount: 0 }];
    if (data.manualOverheadStyle !== "lineItems") {
      patch?.({
        manualOverheadStyle: "lineItems",
        overheadLineItems: lines,
        monthlyOverhead: sumOverheadLines(lines),
      });
    }
    setDetailDraft(lines.map((l) => ({ ...l })));
    setDetailOpen(true);
  }

  function applyDetail() {
    const lines = detailDraft.length
      ? detailDraft
      : [{ id: crypto.randomUUID(), label: "", amount: 0 }];
    patch?.({
      overheadMode: "manual",
      manualOverheadStyle: "lineItems",
      overheadLineItems: lines,
      monthlyOverhead: sumOverheadLines(lines),
    });
    setDetailOpen(false);
  }

  return (
    <div>
      <StepHeader
        step={2}
        title="Your Monthly Costs"
        desc="We need this to make sure every job covers your overhead — not just materials and labor."
      />

      <div className="mt-6">
        <div className="flex gap-2 rounded-xl bg-[#f6f8fb] p-1">
          {(["estimate", "manual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (mode === "manual" && data.overheadMode === "estimate") {
                  set("monthlyOverhead", estimated);
                }
                set("overheadMode", mode);
              }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                data.overheadMode === mode
                  ? "bg-white text-[#213343] shadow-sm"
                  : "text-[#9CA3AF]"
              }`}
            >
              {mode === "estimate" ? "Help me estimate" : "I know my number"}
            </button>
          ))}
        </div>

        {data.overheadMode === "estimate" ? (
          <div className="mt-5 space-y-4">
            <EstimatorRow label="Work vehicles / trucks" hint="$700 each — payments, insurance, fuel">
              <Stepper value={data.vehicles} min={0} max={10} onChange={(v) => set("vehicles", v)} />
            </EstimatorRow>

            <EstimatorRow label="Office or shop rent?" hint="Monthly lease payment">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.hasOffice}
                  onChange={(e) => set("hasOffice", e.target.checked)}
                  className="h-4 w-4 accent-[#ff5c35]"
                />
                <span className="text-sm text-[#6B7280]">Yes, I pay rent</span>
              </label>
              {data.hasOffice && (
                <input
                  type="number"
                  value={data.officeRent || ""}
                  min={0}
                  placeholder="1200"
                  onChange={(e) => set("officeRent", Number(e.target.value) || 0)}
                  className="mt-2 w-full rounded-lg border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
                />
              )}
            </EstimatorRow>

            <EstimatorRow label="Non-job employees" hint="Office, admin, estimator — not crew ($3,500 ea.)">
              <Stepper value={data.nonJobStaff} min={0} max={5} onChange={(v) => set("nonJobStaff", v)} />
            </EstimatorRow>

            <EstimatorRow label="Insurance (GL + Workers Comp)" hint="Monthly premium — check your policy">
              <DollarInput value={data.insurance} onChange={(v) => set("insurance", v)} placeholder="500" />
            </EstimatorRow>

            <EstimatorRow label="Phone, internet, software" hint="Cell plans, email, apps, subscriptions">
              <DollarInput value={data.phonesInternet} onChange={(v) => set("phonesInternet", v)} placeholder="200" />
            </EstimatorRow>

            <EstimatorRow label="Other monthly costs" hint="Anything else that's fixed every month">
              <DollarInput value={data.otherCosts} onChange={(v) => set("otherCosts", v)} placeholder="0" />
            </EstimatorRow>

            <div className="rounded-xl bg-[#213343] px-5 py-4 text-white">
              <p className="text-xs text-white/60">Estimated monthly overhead</p>
              <p className="mt-1 text-2xl font-bold">${estimated.toLocaleString()}/mo</p>
              <p className="mt-1 text-xs text-white/50">You can refine this anytime in Settings</p>
            </div>

            <button
              type="button"
              onClick={applyEstimateBreakdown}
              className="w-full rounded-xl border border-[#d9e2ec] bg-white py-3 text-sm font-medium text-[#213343] transition hover:border-[#ff5c35]"
            >
              Break into line items (optional)
            </button>
            <p className="text-center text-[11px] text-[#9CA3AF]">
              Only if you want a breakdown. Prefills from your answers above — use &quot;Edit line items&quot; to open
              the detailed editor.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex gap-2 rounded-xl bg-[#f6f8fb] p-1">
              {(["total", "lineItems"] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => {
                    if (style === "lineItems") {
                      set("manualOverheadStyle", "lineItems");
                    } else {
                      patch?.({ manualOverheadStyle: "total" });
                    }
                  }}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition sm:text-sm ${
                    data.manualOverheadStyle === style
                      ? "bg-white text-[#213343] shadow-sm"
                      : "text-[#9CA3AF]"
                  }`}
                >
                  {style === "total" ? "One monthly total" : "Itemize (detailed)"}
                </button>
              ))}
            </div>

            {data.manualOverheadStyle === "total" ? (
              <>
                <Field
                  label="Monthly overhead ($)"
                  hint="All fixed costs: rent, insurance, vehicles, phones, software"
                >
                  <input
                    type="number"
                    value={data.monthlyOverhead || ""}
                    min={0}
                    placeholder="3000"
                    onChange={(e) => set("monthlyOverhead", Number(e.target.value) || 0)}
                    className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none focus:border-[#ff5c35]"
                  />
                </Field>
                <p className="text-xs text-[#9CA3AF]">Not sure? Switch to &quot;Help me estimate&quot; above.</p>
                <button
                  type="button"
                  onClick={openDetailModal}
                  className="w-full rounded-xl border border-dashed border-[#b7c7d6] py-3 text-sm font-medium text-[#6B7280] transition hover:border-[#ff5c35] hover:text-[#213343]"
                >
                  Enter detailed line items instead…
                </button>
              </>
            ) : (
              <div className="rounded-xl border border-[#d9e2ec] bg-[#f9fafb] px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
                  Itemized total
                </p>
                <p className="mt-1 text-2xl font-bold text-[#213343]">${effective.toLocaleString()}/mo</p>
                <p className="mt-1 text-xs text-[#6B7280]">
                  {data.overheadLineItems.length} line{data.overheadLineItems.length === 1 ? "" : "s"} — sum updates
                  automatically
                </p>
                <button
                  type="button"
                  onClick={openDetailModal}
                  className="mt-3 w-full rounded-lg bg-[#213343] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d4a5e]"
                >
                  Edit line items
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 border-t border-[#d9e2ec] pt-5">
          <Field
            label="Labor burden %"
            hint="Payroll taxes + workers comp on top of base wages. Typical: 18–25%. Ask your payroll provider if unsure."
          >
            <div className="mt-1.5 flex items-center gap-3">
              <input
                type="number"
                value={data.laborBurdenPercent}
                min={0}
                max={50}
                onChange={(e) => set("laborBurdenPercent", Math.max(0, Number(e.target.value) || 0))}
                className="w-24 rounded-lg border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none focus:border-[#ff5c35]"
              />
              <span className="text-sm text-[#9CA3AF]">% — leave at 20% if unsure</span>
            </div>
          </Field>
        </div>
      </div>

      <OverheadDetailModal
        open={detailOpen}
        draft={detailDraft}
        onChangeDraft={setDetailDraft}
        onApply={applyDetail}
        onClose={() => setDetailOpen(false)}
      />

      <NavButtons onNext={onNext} onBack={onBack} showBack />
    </div>
  );
}

function MarginsInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d9e2ec] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="margins-info-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="margins-info-title" className="text-lg font-bold text-[#213343]">
            How to think about margins
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-[#f6f8fb]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
          <p>
            <span className="font-medium text-[#213343]">Good / Better / Best</span> are three price tiers you can
            offer on proposals. Customers pick a package; each tier should still clear your true cost plus the profit
            you need.
          </p>
          <p>
            <span className="font-medium text-[#213343]">Margin</span> here means:{" "}
            <span className="font-mono text-xs text-[#213343]">(Price − full job cost) ÷ Price × 100</span>. Full job
            cost includes materials, field labor, burden, equipment, and a fair share of monthly overhead spread across
            your work.
          </p>
          <p>
            <span className="font-medium text-[#213343]">What to factor in:</span> callbacks and punch-list time,
            warranty reserves, financing or card fees, slow months (overhead still runs), sales commissions, and
            taxes. If overhead or labor burden is high, you usually need higher margins to stay safe.
          </p>
          <p>
            <span className="font-medium text-[#213343]">Minimum safe margin</span> is your floor — the lowest margin
            you&apos;re willing to accept before walking away. Keep it below &quot;Good&quot; so you still have room
            for standard tiers.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-[#213343] py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d4a5e]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function StepMargins({ data, set, patch, error, onNext, onBack }: StepProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const suggestion = useMemo(() => suggestMarginsFromWizard(data), [data]);

  function applySuggestion() {
    const s = suggestMarginsFromWizard(data);
    patch?.({
      goodMargin: s.goodMargin,
      betterMargin: s.betterMargin,
      bestMargin: s.bestMargin,
      minimumSafeMargin: s.minimumSafeMargin,
    });
  }

  return (
    <div>
      <div className="relative pr-12">
        <StepHeader
          step={3}
          title="Your Target Margins"
          desc="Margin is what you keep after all costs. We've pre-filled industry averages — you can leave these as-is."
        />
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#d9e2ec] text-[#6B7280] transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
          aria-label="How margins work"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 rounded-xl bg-[#f6f8fb] px-4 py-3 text-xs text-[#6B7280]">
        Formula: <span className="font-mono font-semibold text-[#213343]">Margin % = (Price − Cost) ÷ Price × 100</span>
        <span className="ml-2 text-[#9CA3AF]">— 35% on a $10k job = $3,500 profit</span>
      </div>

      <div className="mt-4 rounded-xl border border-[#e8edf2] bg-white px-4 py-3">
        <p className="text-xs text-[#6B7280]">{suggestion.summary}</p>
        <button
          type="button"
          onClick={applySuggestion}
          className="mt-2 text-sm font-semibold text-[#ff5c35] transition hover:text-[#e94820]"
        >
          Use suggested margins
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(["good", "better", "best"] as const).map((tier) => {
          const labels = { good: "Good", better: "Better", best: "Best" };
          const descs = { good: "Budget option", better: "Most popular", best: "Premium" };
          const key = `${tier}Margin` as "goodMargin" | "betterMargin" | "bestMargin";
          return (
            <div
              key={tier}
              className={`rounded-xl border p-4 text-center ${
                tier === "better" ? "border-[#213343] bg-[#f9fafb]" : "border-[#d9e2ec]"
              }`}
            >
              {tier === "better" && (
                <span className="mb-2 inline-block rounded bg-[#213343] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Recommended
                </span>
              )}
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">{labels[tier]}</p>
              <input
                type="number"
                value={data[key]}
                min={1}
                max={80}
                onChange={(e) => set(key, Math.max(1, Math.min(80, Number(e.target.value) || 1)))}
                className="mt-2 w-full rounded-lg border border-[#d9e2ec] px-2 py-2 text-center text-lg font-bold outline-none focus:border-[#ff5c35]"
              />
              <p className="mt-1 text-[10px] text-[#9CA3AF]">% — {descs[tier]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-[#213343]">Minimum safe margin %</label>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d9e2ec] text-[#9CA3AF] transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
            aria-label="About minimum safe margin"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">
          Never price below this, even to win a job. At 20% on a $10k job = $2,000 minimum profit.
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            type="number"
            value={data.minimumSafeMargin}
            min={1}
            max={50}
            onChange={(e) => set("minimumSafeMargin", Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-[#d9e2ec] px-3 py-2.5 text-sm outline-none focus:border-[#ff5c35]"
          />
          <span className="text-sm text-[#9CA3AF]">% floor — leave at 20% if unsure</span>
        </div>
      </div>

      <MarginsInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack nextLabel="Finish Setup" />
    </div>
  );
}

function StepDone({ data, onComplete }: { data: WizardState; onComplete: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7]">
        <Check className="h-7 w-7 text-[#16a34a]" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[#213343]">You&apos;re all set!</h2>
      <p className="mt-2 text-[#6B7280]">Here&apos;s what we configured for you.</p>

      <div className="mt-6 rounded-xl bg-[#f6f8fb] p-5 text-left space-y-3">
        <SummaryRow label="Business" value={data.businessName || "—"} />
        <SummaryRow label="Main Trade" value={data.trade} />
        <SummaryRow label="State" value={data.state} />
        <SummaryRow
          label="Monthly Overhead"
          value={`$${getEffectiveMonthlyOverhead(data).toLocaleString()}/mo`}
        />
        <SummaryRow label="Labor Burden" value={`${data.laborBurdenPercent}%`} />
        <SummaryRow
          label="Margins (G/B/B)"
          value={`${data.goodMargin}% / ${data.betterMargin}% / ${data.bestMargin}%`}
        />
      </div>

      <button
        onClick={onComplete}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff5c35] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
      >
        Start Pricing
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-xs text-[#9CA3AF]">
        Everything can be adjusted anytime in Settings
      </p>
    </div>
  );
}

function StepHeader({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#ff5c35]">
        Step {step} of 3
      </p>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight text-[#213343]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{desc}</p>
    </div>
  );
}

function NavButtons({
  onNext,
  onBack,
  showBack = false,
  nextLabel = "Continue",
}: {
  onNext: () => void;
  onBack: () => void;
  showBack?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className={`mt-8 flex gap-3 ${showBack ? "justify-between" : "justify-end"}`}>
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9e2ec] px-4 py-2.5 text-sm font-medium text-[#6B7280] transition hover:bg-[#f6f8fb]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-lg bg-[#ff5c35] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e94820]"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#213343]">
        {label}
        {required && <span className="ml-1 text-[#ff5c35]">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-[#9CA3AF]">{hint}</p>}
      {children}
    </div>
  );
}

function EstimatorRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#d9e2ec] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#213343]">{label}</p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d9e2ec] text-[#6B7280] transition hover:bg-[#f6f8fb] disabled:opacity-30"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-[#213343]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d9e2ec] text-[#6B7280] transition hover:bg-[#f6f8fb] disabled:opacity-30"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function DollarInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-[#9CA3AF]">$</span>
      <input
        type="number"
        value={value || ""}
        min={0}
        placeholder={placeholder}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-24 rounded-lg border border-[#d9e2ec] px-3 py-1.5 text-sm outline-none focus:border-[#ff5c35]"
      />
      <span className="text-xs text-[#9CA3AF]">/mo</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-[#6B7280]">{label}</p>
      <p className="text-sm font-semibold text-[#213343]">{value}</p>
    </div>
  );
}
