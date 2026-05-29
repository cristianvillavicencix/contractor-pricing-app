"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Info, Minus, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  companyLevelOptionsWithDesc,
  defaultSettings,
  mergeAppSettings,
  onboardingTradeOptions,
  OVERHEAD_BREAKDOWN_SUGGESTIONS,
  stateOptions,
  type AppSettings,
  type CompanyLevel,
  type ProjectState,
  type SettingsTrade,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings, saveCompanySettings } from "@/lib/supabase/data";
import { BrandLogo } from "@/components/brand-logo";

type WizardState = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  trade: SettingsTrade;
  state: ProjectState;
  companyLevel: CompanyLevel;
  overheadMode: "manual" | "estimate";
  monthlyOverhead: number;
  laborBurdenPercent: number;
  vehicles: number;
  hasOffice: boolean;
  officeRent: number;
  /** Luz, agua, gas del local si no van incluidos en la renta */
  utilitiesMonthly: number;
  nonJobStaff: number;
  insurance: number;
  phonesInternet: number;
  marketingAdvertising: number;
  equipmentLeaseMonthly: number;
  professionalFeesMonthly: number;
  licensesMembershipsMonthly: number;
  businessDebtPaymentsMonthly: number;
  trainingCertsMonthly: number;
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
    s.utilitiesMonthly +
    s.nonJobStaff * 3500 +
    s.insurance +
    s.phonesInternet +
    s.marketingAdvertising +
    s.equipmentLeaseMonthly +
    s.professionalFeesMonthly +
    s.licensesMembershipsMonthly +
    s.businessDebtPaymentsMonthly +
    s.trainingCertsMonthly +
    s.otherCosts
  );
}

const INITIAL: WizardState = {
  businessName: "", contactName: "", phone: "", email: "", address: "", website: "",
  trade: "Roofing", state: "Connecticut", companyLevel: "Small Crew",
  overheadMode: "manual",
  monthlyOverhead: 0,
  laborBurdenPercent: 20,
  vehicles: 0,
  hasOffice: false,
  officeRent: 0,
  utilitiesMonthly: 0,
  nonJobStaff: 0,
  insurance: 0,
  phonesInternet: 0,
  marketingAdvertising: 0,
  equipmentLeaseMonthly: 0,
  professionalFeesMonthly: 0,
  licensesMembershipsMonthly: 0,
  businessDebtPaymentsMonthly: 0,
  trainingCertsMonthly: 0,
  otherCosts: 0,
  goodMargin: 28, betterMargin: 35, bestMargin: 42, minimumSafeMargin: 20,
  manualOverheadStyle: "total",
  overheadLineItems: [],
};

function sumOverheadLines(lines: OverheadLine[]): number {
  return lines.reduce((s, row) => s + Math.max(0, row.amount), 0);
}

function linesFromEstimate(d: WizardState): OverheadLine[] {
  const rows: OverheadLine[] = [];
  if (d.hasOffice && d.officeRent > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Office or shop rent",
      amount: d.officeRent,
    });
  }
  if (d.utilitiesMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Utilities (not in rent)",
      amount: d.utilitiesMonthly,
    });
  }
  if (d.vehicles > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: `Work vehicles (${d.vehicles} × $700/mo est.)`,
      amount: d.vehicles * 700,
    });
  }
  if (d.equipmentLeaseMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Equipment / tool leases",
      amount: d.equipmentLeaseMonthly,
    });
  }
  if (d.nonJobStaff > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: `Non-field staff (${d.nonJobStaff} × $3,500/mo est.)`,
      amount: d.nonJobStaff * 3500,
    });
  }
  if (d.professionalFeesMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Professional fees (CPA, legal, etc.)",
      amount: d.professionalFeesMonthly,
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
  if (d.marketingAdvertising > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Marketing & advertising",
      amount: d.marketingAdvertising,
    });
  }
  if (d.licensesMembershipsMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Licenses, memberships, lead services",
      amount: d.licensesMembershipsMonthly,
    });
  }
  if (d.businessDebtPaymentsMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Business loan / LOC payments",
      amount: d.businessDebtPaymentsMonthly,
    });
  }
  if (d.trainingCertsMonthly > 0) {
    rows.push({
      id: crypto.randomUUID(),
      label: "Training & certifications (monthly)",
      amount: d.trainingCertsMonthly,
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

/** Lines persisted to company settings after onboarding (guided estimate, line items, or empty). */
function buildOverheadLinesForSettings(d: WizardState): AppSettings["costRules"]["overheadLineItems"] {
  if (d.overheadMode === "estimate") return linesFromEstimate(d);
  if (d.manualOverheadStyle === "lineItems" && d.overheadLineItems.length > 0) {
    return d.overheadLineItems.map((row) => ({
      id: row.id,
      label: row.label,
      amount: Math.max(0, row.amount),
    }));
  }
  return [];
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
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f8fa] text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** Lets you open `/onboarding?preview=1` even after completion (design / QA). Must be logged in. */
  const previewMode =
    searchParams.get("preview") === "1" || searchParams.get("force") === "1";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardState>(INITIAL);
  const [error, setError] = useState("");

  useEffect(() => {
    if (previewMode) return;
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
  }, [supabase, router, previewMode]);

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
    if (step === 0 && !data.businessName.trim()) return "Please enter your business name.";
    if (step === 4) {
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

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Enter" && step < 5) next();
      if (e.key === "Escape" && step > 0) back();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data]);

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
          address: data.address.trim(),
          website: data.website.trim(),
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
          overheadLineItems: buildOverheadLinesForSettings(data),
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

  const STEP_LABELS = ["NAME", "CONTACT", "PROFILE", "COSTS", "MARGINS"];

  /* ── Step 5: full-page centered Done screen ── */
  if (step === 5) {
    return (
      <motion.div
        className="flex min-h-screen flex-col bg-[#FAFAF6]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Top bar */}
        <div className="border-b border-[#E8E3D6] px-8 py-5">
          <BrandLogo className="h-auto w-[150px] object-contain" />
        </div>
        {/* Centered content */}
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <StepDone data={data} onComplete={complete} onRestart={() => setStep(0)} error={error} />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAF6]">
      {/* ── Left visual panel ── */}
      <div className="relative hidden overflow-hidden bg-[#213343] lg:flex lg:w-[44%] lg:flex-col">
        <div className="absolute left-8 top-8 z-10">
          <BrandLogo variant="dark" className="h-auto w-[150px] object-contain" />
        </div>
        {/* Grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative flex-1">
          <AnimatePresence mode="wait">
            <StepHero key={step} step={step} data={data} />
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col bg-[#FAFAF6]">
        {/* Mobile brand */}
        <div className="flex items-center justify-between border-b border-[#E8E3D6] px-6 py-4 lg:hidden">
          <BrandLogo className="h-auto w-[150px] object-contain" />
        </div>

        <div className="flex flex-1 items-center justify-center overflow-y-auto">
          <div className="w-full max-w-lg px-6 py-10 lg:px-12 lg:py-14">
            {previewMode && (
              <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-950">
                Preview mode
              </p>
            )}

            {/* Step indicator + progress */}
            <div className="mb-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                  Step {step + 1} / 5
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">
                  {STEP_LABELS[step]}
                </span>
              </div>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${
                      s <= step ? "bg-[#ff5c35]" : "bg-[#DDD8CE]"
                    }`}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {step === 0 && <StepName data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />}
                {step === 1 && <StepContact data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />}
                {step === 2 && <StepProfile data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />}
                {step === 3 && <StepCosts data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />}
                {step === 4 && <StepMargins data={data} set={set} patch={patchWizard} error={error} onNext={next} onBack={back} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type StepProps = {
  data: WizardState;
  set: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
  patch?: (patch: Partial<WizardState>) => void;
  error?: string;
  onNext: () => void;
  onBack: () => void;
};

type PlaceSuggestion = { place_id: string; name: string; address: string; rating: number | null; total_ratings: number };

// ─── Heroes (light, geometric) ───────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className="h-3 w-3" viewBox="0 0 20 20" fill={i <= Math.round(rating) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-[11px] font-medium text-[#f59e0b]">{rating.toFixed(1)}</span>
    </span>
  );
}

function HeroName({ data }: { data: WizardState }) {
  const name = data.businessName.trim() || "Your Company";
  return (
    <div className="flex h-full w-full items-center justify-center p-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* Concentric rings */}
        {[120, 180, 240].map((size, i) => (
          <motion.div
            key={size}
            className="absolute rounded-full border border-white"
            style={{ width: size, height: size, top: "50%", left: "50%", x: "-50%", y: "-50%", opacity: 0.08 + i * 0.06 }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {/* Proposal card */}
        <motion.div
          className="relative z-10 w-56 rounded-2xl border border-[#E8E3D6] bg-white px-6 py-5 shadow-lg"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Proposal · Cover</p>
          <p className="mt-2 text-base font-bold text-[#213343] leading-tight">{name}</p>
          <div className="mt-3 border-t border-[#F0EDE6] pt-2 flex items-center justify-between">
            <p className="text-[10px] text-[#9CA3AF]">Est. 2024</p>
            <p className="text-[10px] text-[#9CA3AF]">Bid #001</p>
          </div>
        </motion.div>
        {/* Checkmark badge */}
        <motion.div
          className="absolute -right-3 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-[#ff5c35] shadow"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </div>
  );
}

function BlinkingCursor() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-5 w-[2px] rounded-full bg-[#ff5c35] align-middle"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

function HeroContact({ data }: { data: WizardState }) {
  const phone = data.phone;
  const address = data.address;
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">

      {/* Ripple rings — large, expand from dot and fade out */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-white"
          style={{ width: 48, height: 48 }}
          animate={{ width: [48, 340], height: [48, 340], opacity: [0.55, 0] }}
          transition={{ duration: 3, delay: i * 1, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Center bullseye */}
      <div className="absolute z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30">
        <div className="h-5 w-5 rounded-full bg-[#ff5c35] shadow-[0_0_14px_rgba(255,92,53,0.6)]" />
      </div>

      {/* Phone card — left, inside the rings */}
      <motion.div
        className="absolute left-6 top-[30%] z-20 rounded-xl border border-[#E8E3D6] bg-white px-5 py-3 shadow-lg"
        style={{ rotate: -6 }}
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#ff5c35]">Phone</p>
        <div className="mt-1.5 flex items-center">
          <motion.p
            key={phone}
            initial={{ opacity: 0.5, x: 3 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
            className={`font-mono text-sm font-semibold ${phone ? "text-[#213343]" : "text-[#C0BAB0]"}`}
          >
            {phone || "(···) ···-····"}
          </motion.p>
          {phone && <BlinkingCursor />}
        </div>
      </motion.div>

      {/* Address card — right, inside the rings */}
      <motion.div
        className="absolute bottom-[28%] right-6 z-20 rounded-xl border border-[#E8E3D6] bg-white px-5 py-3 shadow-lg"
        style={{ rotate: 5 }}
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-[#ff5c35]">Address</p>
        <div className="mt-1.5 flex items-center">
          <motion.p
            key={address}
            initial={{ opacity: 0.5, x: 3 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
            className={`text-sm font-semibold ${address ? "text-[#213343]" : "text-[#C0BAB0]"}`}
          >
            {address || "Street, City, ST"}
          </motion.p>
          {address && <BlinkingCursor />}
        </div>
      </motion.div>

    </div>
  );
}

function HeroProfile({ data }: { data: WizardState }) {
  const sizes = { "Solo Owner": 1, "Small Crew": 3, "Established Company": 5, "Premium Company": 7 };
  const count = sizes[data.companyLevel] ?? 3;
  const dots = Array.from({ length: Math.min(count, 7) });
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-12">
      <div className="flex flex-wrap items-end justify-center gap-3">
        {dots.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full bg-white"
            style={{ width: 18 + i * 4, height: 18 + i * 4, opacity: 0.2 + i * 0.12 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
          />
        ))}
      </div>
      <div className="rounded-full border border-[#E8E3D6] bg-white px-4 py-1.5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
          {data.trade} · {data.companyLevel}
        </p>
      </div>
    </div>
  );
}

function HeroCosts({ data }: { data: WizardState }) {
  const bars = [0.4, 0.65, 0.5, 0.85, 0.6];
  const overhead = data.monthlyOverhead;
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-6 p-12">
      {/* Bars + falling dots in same container */}
      <div className="relative flex items-end gap-2">
        {/* Falling dots — positioned relative to the bar group */}
        {[
          { size: 9,  left: "8%",  delay: 0,   dur: 2.6, startY: -60 },
          { size: 13, left: "78%", delay: 0.5, dur: 3.2, startY: -80 },
          { size: 7,  left: "42%", delay: 1.0, dur: 2.3, startY: -50 },
          { size: 11, left: "62%", delay: 0.2, dur: 2.9, startY: -70 },
          { size: 6,  left: "25%", delay: 1.6, dur: 2.1, startY: -45 },
        ].map((d, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: d.size, height: d.size, left: d.left, bottom: "100%" }}
            animate={{ y: [d.startY, 30], opacity: [0, 0.75, 0] }}
            transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, repeatDelay: 1.0, ease: "easeIn" }}
          />
        ))}
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="w-9 rounded-t-lg border border-[#ff5c35] bg-[#ff5c35]"
            style={{ opacity: 0.2 + h * 0.6 }}
            initial={{ height: 0 }}
            animate={{ height: `${h * 100}px` }}
            transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut", repeat: Infinity, repeatType: "reverse", repeatDelay: 3 }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-[#E8E3D6] bg-white px-3 py-1 shadow-sm">
          <p className="text-[10px] font-semibold text-[#9CA3AF]">
            Overhead <span className="text-[#213343]">${overhead > 0 ? overhead.toLocaleString() : "—"}</span>
          </p>
        </div>
        <div className="rounded-full border border-[#E8E3D6] bg-white px-3 py-1 shadow-sm">
          <p className="text-[10px] font-semibold text-[#9CA3AF]">
            Burden <span className="text-[#213343]">{data.laborBurdenPercent}%</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroMargins({ data }: { data: WizardState }) {
  const margin = data.betterMargin;
  const profit = Math.round(10000 * margin / 100);
  const cost = 10000 - profit;
  const pct = margin / 100;
  const r = 40;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex h-full w-full items-center justify-center p-10">
      {/* Wrapper: donut + floating pills positioned around it */}
      <div className="relative">
        {/* Donut */}
        <svg className="h-60 w-60" viewBox="0 0 100 100">
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
          {/* Fill */}
          <motion.circle
            cx="50" cy="50" r={r} fill="none" stroke="#ff5c35" strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            animate={{ strokeDasharray: `${pct * circ} ${circ}` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.p
            key={margin}
            initial={{ opacity: 0.5, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-5xl font-bold leading-none text-white"
          >
            {margin}<span className="text-2xl font-medium">%</span>
          </motion.p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-white/50">Target margin</p>
          <p className="mt-1.5 text-[11px] font-medium text-[#ff5c35]">${profit.toLocaleString()} on a $10k job</p>
        </div>

        {/* Cost pill — top right */}
        <motion.div
          className="absolute -right-20 top-6 rounded-xl border border-[#E8E3D6] bg-white px-4 py-2.5 shadow-lg"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Cost</p>
          <p className="mt-0.5 text-sm font-bold text-[#213343]">${cost.toLocaleString()}</p>
        </motion.div>

        {/* Profit pill — bottom left */}
        <motion.div
          className="absolute -bottom-2 -left-20 rounded-xl border border-[#E8E3D6] bg-white px-4 py-2.5 shadow-lg"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Profit</p>
          <p className="mt-0.5 text-sm font-bold text-[#ff5c35]">${profit.toLocaleString()}</p>
        </motion.div>
      </div>
    </div>
  );
}

function HeroDone() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[#ff5c35]"
          style={{ width: 6 + i * 3, height: 6 + i * 3 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1, 0], opacity: [0, 0.8, 0], x: Math.cos((i / 8) * Math.PI * 2) * 90, y: Math.sin((i / 8) * Math.PI * 2) * 90 }}
          transition={{ duration: 1.8, delay: i * 0.1, repeat: Infinity, repeatDelay: 2.5 }}
        />
      ))}
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ff5c35] shadow-xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
      >
        <Check className="h-10 w-10 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
}

function StepHero({ step, data }: { step: number; data: WizardState }) {
  return (
    <motion.div key={step} className="h-full w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      {step === 0 && <HeroName data={data} />}
      {step === 1 && <HeroContact data={data} />}
      {step === 2 && <HeroProfile data={data} />}
      {step === 3 && <HeroCosts data={data} />}
      {step === 4 && <HeroMargins data={data} />}
      {step === 5 && <HeroDone />}
    </motion.div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepName({ data, set, patch, error, onNext, onBack }: StepProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    set("businessName", value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(value)}`);
        const json = await res.json() as { suggestions?: PlaceSuggestion[] };
        setSuggestions(json.suggestions ?? []);
        setShowSuggestions((json.suggestions ?? []).length > 0);
      } catch { setSuggestions([]); }
    }, 400);
  }

  async function selectSuggestion(s: PlaceSuggestion) {
    patch?.({ businessName: s.name, address: s.address });
    setShowSuggestions(false);
    setSuggestions([]);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/places/details?place_id=${s.place_id}`);
      const json = await res.json() as { name?: string; phone?: string; state?: string; address?: string; website?: string };
      const updates: Partial<WizardState> = {};
      if (json.name) updates.businessName = json.name;
      if (json.phone) {
        const digits = json.phone.replace(/\D/g, "").slice(-10);
        updates.phone = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : json.phone;
      }
      if (json.address) updates.address = json.address;
      if (json.website) updates.website = json.website;
      if (json.state) {
        const match = stateOptions.find((st) => st === json.state);
        if (match) updates.state = match;
      }
      patch?.(updates);
    } catch { /* keep values */ } finally { setLoadingDetails(false); }
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Let&apos;s begin</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#213343] lg:text-4xl">
        What&apos;s your business called?
      </h1>
      <p className="mt-2 text-sm text-[#9CA3AF]">This shows on every proposal you&apos;ll send. You can edit it later.</p>

      <div className="mt-8" ref={wrapperRef}>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-[#213343]">
          Business name <span className="text-[#ff5c35]">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={data.businessName}
            placeholder="Apex Roofing LLC"
            autoComplete="off"
            autoFocus
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onNext(); } }}
            className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-4 text-base text-[#213343] outline-none transition placeholder:text-[#C0BAB0] focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10"
          />
          {loadingDetails && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">Loading…</span>}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-[#DDD8CE] bg-white shadow-xl">
              {suggestions.map((s) => (
                <li key={s.place_id} className="border-b border-[#F5F3EF] last:border-0">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                    className="flex w-full flex-col px-4 py-3 text-left transition hover:bg-[#FFF8F5]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#213343]">{s.name}</span>
                      {s.rating !== null && <Stars rating={s.rating} />}
                    </div>
                    <span className="mt-0.5 text-xs text-[#9CA3AF]">{s.address}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack={false} disabled={!data.businessName.trim()} />
    </div>
  );
}

function StepContact({ data, set, error, onNext, onBack }: StepProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Quick contact</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#213343]">
        How can clients reach you?
      </h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">Your name and contact details will appear in the proposal footer.</p>

      <div className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Your name" hint="optional">
            <input
              type="text" value={data.contactName} placeholder="Alex Johnson"
              onChange={(e) => set("contactName", e.target.value)}
              className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 text-sm text-[#213343] outline-none transition placeholder:text-[#C0BAB0] focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10"
            />
          </FormField>
          <FormField label="Phone" hint="optional">
            <input
              type="tel" value={data.phone} placeholder="(555) 000-0000"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                let f = digits;
                if (digits.length > 6) f = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
                else if (digits.length > 3) f = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
                else if (digits.length > 0) f = `(${digits}`;
                set("phone", f);
              }}
              className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 text-sm text-[#213343] outline-none transition placeholder:text-[#C0BAB0] focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10"
            />
          </FormField>
        </div>

        <FormField label="Business address" hint="used on proposals">
          <input
            type="text" value={data.address} placeholder="449 W Main St, Stamford, CT 06902"
            onChange={(e) => set("address", e.target.value)}
            className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 text-sm text-[#213343] outline-none transition placeholder:text-[#C0BAB0] focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10"
          />
        </FormField>

        <FormField label="Website" hint="optional">
          <input
            type="url" value={data.website} placeholder="yourbusiness.com"
            onChange={(e) => set("website", e.target.value)}
            className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 text-sm text-[#213343] outline-none transition placeholder:text-[#C0BAB0] focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10"
          />
        </FormField>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <div className="mt-10 flex items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] transition hover:text-[#213343]">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={onNext} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#213343] transition hover:text-[#ff5c35]">
          Continue <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StepProfile({ data, set, error, onNext, onBack }: StepProps) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Your operation</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#213343]">
        What do you do, and how big is the crew?
      </h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">This helps us suggest the right margins for your business profile.</p>

      <div className="mt-8 space-y-6">
        <FormField label="Main trade">
          <select
            value={data.trade}
            onChange={(e) => set("trade", e.target.value as SettingsTrade)}
            className="w-full rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 text-sm text-[#213343] outline-none transition focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23213343%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22/%3E%3C/svg%3E')] bg-position-[right_12px_center] bg-no-repeat pr-10"
          >
            {onboardingTradeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.value}</option>
            ))}
          </select>
        </FormField>

        <div>
          <p className="mb-3 text-sm font-medium text-[#213343]">Company size</p>
          <div className="grid grid-cols-2 gap-3">
            {companyLevelOptionsWithDesc.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("companyLevel", opt.value)}
                className={`relative rounded-xl border p-4 text-left transition ${
                  data.companyLevel === opt.value
                    ? "border-[#ff5c35] bg-[#FFF8F5]"
                    : "border-[#DDD8CE] bg-white hover:border-[#C0BAB0]"
                }`}
              >
                {data.companyLevel === opt.value && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#ff5c35]">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                )}
                <p className="text-sm font-semibold text-[#213343]">{opt.value}</p>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack />
    </div>
  );
}

const OVERHEAD_CATEGORIES = [
  { id: "rent",       label: "Office or shop rent",    desc: "Rent / mortgage / storage" },
  { id: "insurance",  label: "Insurance",              desc: "GL, workers comp, vehicle" },
  { id: "vehicles",   label: "Vehicles & fuel",        desc: "Truck payments, gas, repairs" },
  { id: "phone",      label: "Phone & internet",       desc: "Cell plans, office internet" },
  { id: "software",   label: "Software & tools",       desc: "CRM, accounting, Bidwise" },
  { id: "marketing",  label: "Marketing & ads",        desc: "Website, Google ads, signs" },
  { id: "supplies",   label: "Office & supplies",      desc: "Snacks, water, paper, coffee" },
  { id: "banking",    label: "Bank & processing fees", desc: "Card fees, bank, accountant" },
];

function StepCosts({ data, set, patch, error, onNext, onBack }: StepProps) {
  const isDetailed = data.manualOverheadStyle === "lineItems";
  const total = isDetailed ? sumOverheadLines(data.overheadLineItems) : data.monthlyOverhead;

  function switchToDetailed() {
    patch?.({
      manualOverheadStyle: "lineItems",
      overheadLineItems: OVERHEAD_CATEGORIES.map((c) => ({ id: c.id, label: c.label, amount: 0 })),
    });
  }

  function switchToSimple() {
    set("manualOverheadStyle", "total");
  }

  function updateItem(id: string, amount: number) {
    const items = data.overheadLineItems.map((item) =>
      item.id === id ? { ...item, amount: Math.max(0, amount) } : item
    );
    patch?.({ overheadLineItems: items });
  }

  function updateItemLabel(id: string, label: string) {
    const items = data.overheadLineItems.map((item) =>
      item.id === id ? { ...item, label } : item
    );
    patch?.({ overheadLineItems: items });
  }

  function addCustom() {
    patch?.({ overheadLineItems: [...data.overheadLineItems, { id: crypto.randomUUID(), label: "", amount: 0 }] });
  }

  function removeItem(id: string) {
    patch?.({ overheadLineItems: data.overheadLineItems.filter((r) => r.id !== id) });
  }

  const filledCount = data.overheadLineItems.filter((r) => r.amount > 0).length;

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Running costs</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#213343]">
        Your fixed monthly costs
      </h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">Just the recurring stuff — rent, trucks, insurance.</p>

      {/* Profile badge */}
      <div className="mt-5 flex items-center gap-2">
        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#ff5c35]" />
        <p className="text-xs text-[#9CA3AF]">
          Pre-filled from{" "}
          <span className="font-semibold text-[#213343]">{data.trade} · {data.companyLevel}</span>
          {" "}— typical for your profile
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* ── Simple mode ── */}
        {!isDetailed && (
          <>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-[#213343]">Total monthly overhead</label>
                <span className="text-[11px] text-[#9CA3AF]">If you know it</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#DDD8CE] bg-white px-4 py-3 transition focus-within:border-[#ff5c35] focus-within:ring-2 focus-within:ring-[#ff5c35]/10">
                <span className="text-xl font-medium text-[#9CA3AF]">$</span>
                <input
                  type="number" min={0}
                  value={data.monthlyOverhead || ""}
                  placeholder="0"
                  onChange={(e) => set("monthlyOverhead", Math.max(0, Number(e.target.value) || 0))}
                  className="w-full border-0 bg-transparent text-2xl font-bold tabular-nums text-[#213343] outline-none placeholder:text-[#DDD8CE]"
                />
                <span className="whitespace-nowrap text-sm text-[#9CA3AF]">/ month</span>
              </div>
            </div>

            <button
              type="button"
              onClick={switchToDetailed}
              className="flex items-center gap-1 text-sm font-medium text-[#ff5c35] hover:text-[#e94820]"
            >
              <ChevronRight className="h-4 w-4" />
              Don&apos;t know the total? Build it up by category
            </button>
          </>
        )}

        {/* ── Detailed mode ── */}
        {isDetailed && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#213343]">Total monthly overhead</p>
              <button type="button" onClick={switchToSimple} className="flex items-center gap-0.5 text-xs text-[#ff5c35] hover:text-[#e94820]">
                <ChevronRight className="h-3 w-3 rotate-180" /> Use simple input
              </button>
            </div>
            <p className="mb-3 text-xs text-[#9CA3AF]">Detailed mode — fill what applies, skip the rest</p>

            <div className="overflow-hidden rounded-xl border border-[#DDD8CE] bg-white">
              {data.overheadLineItems.map((item) => {
                const cat = OVERHEAD_CATEGORIES.find((c) => c.id === item.id);
                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-[#F0EDE6] px-4 py-3 last:border-0">
                    <div className="flex-1 min-w-0">
                      {cat ? (
                        <>
                          <p className="text-sm font-medium text-[#213343]">{item.label}</p>
                          <p className="text-xs text-[#9CA3AF]">{cat.desc}</p>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={item.label}
                          placeholder="Category name"
                          onChange={(e) => updateItemLabel(item.id, e.target.value)}
                          className="w-full text-sm font-medium text-[#213343] outline-none placeholder:text-[#C0BAB0]"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm text-[#9CA3AF]">$</span>
                      <input
                        type="number" min={0}
                        value={item.amount || ""}
                        placeholder="0"
                        onChange={(e) => updateItem(item.id, Number(e.target.value) || 0)}
                        className="w-20 text-right text-sm font-semibold tabular-nums text-[#213343] outline-none placeholder:text-[#DDD8CE]"
                      />
                    </div>
                    {!cat && (
                      <button type="button" onClick={() => removeItem(item.id)} className="flex-shrink-0 text-[#C0BAB0] hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addCustom}
                className="flex w-full items-center justify-center gap-2 py-3 text-sm text-[#9CA3AF] hover:text-[#ff5c35]"
              >
                <Plus className="h-4 w-4" /> Add custom category
              </button>
            </div>

            {/* Monthly total */}
            <div className="mt-4 flex items-end justify-between border-t border-[#E8E3D6] pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Monthly total</p>
                <p className="text-xs text-[#9CA3AF]">{filledCount} {filledCount === 1 ? "category" : "categories"} · Items add up automatically</p>
              </div>
              <p className="text-2xl font-bold text-[#213343]">${total.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Labor burden — always visible */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#213343]">Labor burden</p>
            <span className="text-sm font-bold text-[#ff5c35]">{data.laborBurdenPercent}%</span>
          </div>
          <input
            type="range" min={10} max={40} step={1}
            value={data.laborBurdenPercent}
            onChange={(e) => set("laborBurdenPercent", Number(e.target.value))}
            className="mt-2 w-full accent-[#ff5c35]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#C0BAB0]">
            <span>10%</span><span>20%</span><span>30%</span><span>40%</span>
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">Payroll taxes, workers comp, and similar. Typical 18–25% in the US.</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack />
    </div>
  );
}

function StepMargins({ data, set, patch, error, onNext, onBack }: StepProps) {
  const suggestion = useMemo(() => suggestMarginsFromWizard(data), [data]);

  function applySuggestion() {
    patch?.({ goodMargin: suggestion.goodMargin, betterMargin: suggestion.betterMargin, bestMargin: suggestion.bestMargin, minimumSafeMargin: suggestion.minimumSafeMargin });
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Final step</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#213343]">
        What&apos;s your target profit margin?
      </h2>
      <p className="mt-2 text-sm text-[#9CA3AF]">
        Margin is what you keep after all costs. We&apos;ve pre-filled industry averages — adjust if you like.
      </p>

      <div className="mt-6 rounded-xl border border-[#DDD8CE] bg-[#F5F3EF] px-4 py-3">
        <code className="text-xs text-[#213343]">Margin % = (Price − Cost) ÷ Price × 100</code>
      </div>

      <div className="mt-4 rounded-xl border border-[#DDD8CE] bg-white px-4 py-3">
        <p className="text-xs text-[#9CA3AF]">{suggestion.summary}</p>
        <button type="button" onClick={applySuggestion} className="mt-1.5 text-xs font-semibold text-[#ff5c35] hover:text-[#e94820]">
          Use suggested margins
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(["good", "better", "best"] as const).map((tier) => {
          const labels = { good: "Good", better: "Better", best: "Best" };
          const descs  = { good: "Budget pricing", better: "Most popular", best: "Premium pricing" };
          const key = `${tier}Margin` as "goodMargin" | "betterMargin" | "bestMargin";
          const isBetter = tier === "better";
          return (
            <div
              key={tier}
              className={`relative rounded-xl border p-4 text-center ${
                isBetter ? "border-[#ff5c35] bg-[#FFF8F5]" : "border-[#DDD8CE] bg-white"
              }`}
            >
              {isBetter && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#213343] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Recommended
                </span>
              )}
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isBetter ? "text-[#ff5c35]" : "text-[#9CA3AF]"}`}>
                {labels[tier]}
              </p>
              <div className="mt-2 flex items-end justify-center gap-0.5">
                <input
                  type="number" min={1} max={80}
                  value={data[key]}
                  onChange={(e) => set(key, Math.max(1, Math.min(80, Number(e.target.value) || 1)))}
                  className="w-14 border-0 bg-transparent text-center text-2xl font-bold text-[#213343] outline-none"
                />
                <span className="mb-1 text-sm font-bold text-[#9CA3AF]">%</span>
              </div>
              <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{descs[tier]}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#213343]">Minimum safe margin</p>
          <span className="text-sm font-bold text-[#ff5c35]">{data.minimumSafeMargin}%</span>
        </div>
        <input
          type="range" min={10} max={40} step={1}
          value={data.minimumSafeMargin}
          onChange={(e) => set("minimumSafeMargin", Number(e.target.value))}
          className="mt-2 w-full accent-[#ff5c35]"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[#C0BAB0]">
          <span>10%</span><span>20%</span><span>30%</span><span>40%</span>
        </div>
        <p className="mt-1.5 text-xs text-[#9CA3AF]">Never price below this floor, even to win a job.</p>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <NavButtons onNext={onNext} onBack={onBack} showBack nextLabel="Finish setup" primary />
    </div>
  );
}

function StepDone({ data, onComplete, onRestart, error }: { data: WizardState; onComplete: () => void; onRestart: () => void; error?: string }) {
  const rows: [string, string, boolean?][] = [
    ["Business",         data.businessName || "—",                                    false],
    ["Trade · Size",     `${data.trade} · ${data.companyLevel}`,                      false],
    ["Monthly overhead", `$${getEffectiveMonthlyOverhead(data).toLocaleString()}`,     false],
    ["Labor burden",     `${data.laborBurdenPercent}%`,                               false],
    ["Target margin",    `${data.betterMargin}%`,                                      true],
    ["Minimum margin",   `${data.minimumSafeMargin}%`,                                false],
  ];

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      {/* Check circle */}
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ff5c35] shadow-xl"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
      >
        <Check className="h-10 w-10 text-white" strokeWidth={2.5} />
      </motion.div>

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-widest text-[#ff5c35]">Wizard complete</p>
      <h2 className="mt-2 text-5xl font-bold tracking-tight text-[#213343]">All done!</h2>
      <p className="mt-3 text-sm text-[#9CA3AF]">Setup complete. Time to make your first bid.</p>

      {/* Summary card */}
      <div className="mt-10 w-full overflow-hidden rounded-2xl border border-[#E8E3D6] bg-white shadow-sm">
        <div className="border-b border-[#F0EDE6] px-6 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">Your setup · Summary</p>
        </div>
        {rows.map(([label, value, highlight]) => (
          <div key={label} className="flex items-center justify-between border-b border-[#F0EDE6] px-6 py-3.5 last:border-0">
            <p className="text-sm text-[#9CA3AF]">{label}</p>
            <p className={`text-sm font-semibold ${highlight ? "text-[#ff5c35]" : "text-[#213343]"}`}>{value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div className="mt-8 flex items-center gap-5">
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 rounded-xl bg-[#213343] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2e4a60]"
        >
          Open dashboard <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-[#9CA3AF] transition hover:text-[#213343]"
        >
          Restart wizard
        </button>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function NavButtons({ onNext, onBack, showBack = false, nextLabel = "Continue", disabled = false, primary = false }: {
  onNext: () => void; onBack: () => void; showBack?: boolean; nextLabel?: string; disabled?: boolean; primary?: boolean;
}) {
  return (
    <div className={`mt-10 flex items-center ${showBack ? "justify-between" : "justify-end"}`}>
      {showBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] transition hover:text-[#213343]">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
      )}
      {primary ? (
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition ${
            disabled
              ? "cursor-not-allowed bg-[#DDD8CE] text-white"
              : "bg-[#213343] text-white hover:bg-[#2e4a60]"
          }`}
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold transition ${
            disabled
              ? "cursor-not-allowed text-[#C0BAB0]"
              : "text-[#213343] hover:text-[#ff5c35]"
          }`}
        >
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium text-[#213343]">{label}</label>
        {hint && <span className="text-[11px] text-[#9CA3AF]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
