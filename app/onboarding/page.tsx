"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronLeft, Minus, Plus } from "lucide-react";
import { storageKeys } from "@/lib/app-data";
import { writeLocalStorage } from "@/lib/use-local-storage";

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

type WizardState = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  trade: Trade;
  state: string;
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
};

const STATE_OPTIONS = [
  "Alabama","Arizona","Arkansas","California","Colorado","Connecticut",
  "Florida","Georgia","Idaho","Illinois","Indiana","Iowa","Kansas",
  "Kentucky","Louisiana","Maryland","Massachusetts","Michigan","Minnesota",
  "Mississippi","Missouri","Montana","Nebraska","Nevada","New Jersey",
  "New Mexico","New York","North Carolina","Ohio","Oklahoma","Oregon",
  "Pennsylvania","South Carolina","Tennessee","Texas","Utah","Virginia",
  "Washington","West Virginia","Wisconsin",
];

const TRADE_OPTIONS: { value: Trade; desc: string }[] = [
  { value: "Roofing",            desc: "Shingles, flat roofs, repairs" },
  { value: "Siding",             desc: "Fiber cement, vinyl, trim" },
  { value: "Painting",           desc: "Interior & exterior" },
  { value: "Drywall",            desc: "Hang, tape, finish" },
  { value: "Gutters",            desc: "Install, clean, repair" },
  { value: "Remodeling",         desc: "Kitchen, bath, basement" },
  { value: "General Contractor", desc: "Multi-trade projects" },
];

const COMPANY_LEVEL_OPTIONS: { value: CompanyLevel; desc: string }[] = [
  { value: "Solo Owner",          desc: "Just me — I do the work" },
  { value: "Small Crew",          desc: "2–5 people on jobs" },
  { value: "Established Company", desc: "5+ years, steady clients" },
  { value: "Premium Company",     desc: "High-end brand, premium pricing" },
];

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
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardState>(INITIAL);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKeys.onboarding) === "completed") {
        router.replace("/");
      }
    } catch { /* SSR */ }
  }, [router]);

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setData((prev) => {
      const next = { ...prev, [key]: value };
      if (next.overheadMode === "estimate") {
        next.monthlyOverhead = computeEstimate(next);
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

  function complete() {
    const settings = {
      companyProfile: {
        businessName: data.businessName.trim() || "My Company",
        contactName: data.contactName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        website: "",
        licenseNumber: "",
        insuranceProvider: "",
        mainTrade: data.trade,
        companyLevel: data.companyLevel,
      },
      pricingDefaults: {
        goodMargin: data.goodMargin,
        betterMargin: data.betterMargin,
        bestMargin: data.bestMargin,
        minimumSafeMargin: data.minimumSafeMargin,
      },
      marketLocation: { defaultState: data.state },
      costRules: {
        monthlyOverhead: data.monthlyOverhead,
        laborBurdenPercent: data.laborBurdenPercent,
        includeOverhead: true,
        includeMiscellaneousBuffer: true,
        miscellaneousBufferPercent: 5,
      },
    };
    writeLocalStorage(storageKeys.settings, settings);
    try { localStorage.setItem(storageKeys.onboarding, "completed"); } catch { /* */ }
    router.push("/");
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
          {step === 2 && <StepOverhead data={data} set={set} onNext={next} onBack={back} />}
          {step === 3 && <StepMargins data={data} set={set} error={error} onNext={next} onBack={back} />}
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
              onChange={(e) => set("trade", e.target.value as Trade)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            >
              {TRADE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.value}</option>
              ))}
            </select>
          </Field>
          <Field label="State">
            <select
              value={data.state}
              onChange={(e) => set("state", e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff5c35]"
            >
              {STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Company Size">
          <div className="mt-2 grid grid-cols-2 gap-2">
            {COMPANY_LEVEL_OPTIONS.map((opt) => (
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

function StepOverhead({ data, set, onNext, onBack }: StepProps) {
  const estimated = computeEstimate(data);

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
          </div>
        ) : (
          <div className="mt-5">
            <Field label="Monthly overhead ($)" hint="All fixed costs: rent, insurance, vehicles, phones, software">
              <input
                type="number"
                value={data.monthlyOverhead || ""}
                min={0}
                placeholder="3000"
                onChange={(e) => set("monthlyOverhead", Number(e.target.value) || 0)}
                className="mt-1.5 w-full rounded-lg border border-[#d9e2ec] px-4 py-3 text-sm outline-none focus:border-[#ff5c35]"
              />
            </Field>
            <p className="mt-2 text-xs text-[#9CA3AF]">Not sure? Switch to &quot;Help me estimate&quot; above.</p>
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

      <NavButtons onNext={onNext} onBack={onBack} showBack />
    </div>
  );
}

function StepMargins({ data, set, error, onNext, onBack }: StepProps) {
  return (
    <div>
      <StepHeader
        step={3}
        title="Your Target Margins"
        desc="Margin is what you keep after all costs. We've pre-filled industry averages — you can leave these as-is."
      />

      <div className="mt-5 rounded-xl bg-[#f6f8fb] px-4 py-3 text-xs text-[#6B7280]">
        Formula: <span className="font-mono font-semibold text-[#213343]">Margin % = (Price − Cost) ÷ Price × 100</span>
        <span className="ml-2 text-[#9CA3AF]">— 35% on a $10k job = $3,500 profit</span>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {labels[tier]}
              </p>
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
        <Field
          label="Minimum safe margin %"
          hint="Never price below this, even to win a job. At 20% on a $10k job = $2,000 minimum profit."
        >
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
        </Field>
      </div>

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
        <SummaryRow label="Monthly Overhead" value={`$${data.monthlyOverhead.toLocaleString()}/mo`} />
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
