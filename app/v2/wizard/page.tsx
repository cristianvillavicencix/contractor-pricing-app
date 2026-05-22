"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultSettings,
  mergeAppSettings,
  type AppSettings,
  type CompanyLevel,
  type SettingsTrade,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings, saveCompanySettings } from "@/lib/supabase/data";
import { V2BodyTag } from "../_shared/body-tag";

type SizeId = "solo" | "small" | "established" | "premium";

const TRADES = ["Roofing", "Plumbing", "HVAC", "Electrical", "Landscaping", "Painting", "Flooring", "General", "Other"];

const SIZE_OPTIONS: { id: SizeId; title: string; sub: string; defaults: { overhead: number; burden: number; margin: number } }[] = [
  { id: "solo",         title: "Solo Owner",       sub: "Just me — I do the work",       defaults: { overhead: 1800, burden: 18, margin: 32 } },
  { id: "small",        title: "Small Crew",       sub: "2–5 people on jobs",            defaults: { overhead: 5000, burden: 20, margin: 35 } },
  { id: "established",  title: "Established Co.",  sub: "5+ years, steady clients",      defaults: { overhead: 12000, burden: 22, margin: 38 } },
  { id: "premium",      title: "Premium Company",  sub: "High-end brand, premium pricing", defaults: { overhead: 22000, burden: 25, margin: 45 } },
];

const MARGIN_PRESETS = [
  { id: "good",   grade: "GOOD",   pct: 28, desc: "Budget pricing" },
  { id: "better", grade: "BETTER", pct: 35, desc: "Most popular",   recommended: true },
  { id: "best",   grade: "BEST",   pct: 42, desc: "Premium pricing" },
];

const OVERHEAD_CATEGORIES = [
  { id: "rent",      ttl: "Office or shop rent",    hint: "Rent / mortgage / storage",    icon: "home",      weight: 0.20 },
  { id: "insurance", ttl: "Insurance",              hint: "GL, workers comp, vehicle",    icon: "shield",    weight: 0.18 },
  { id: "vehicles",  ttl: "Vehicles & fuel",        hint: "Truck payments, gas, repairs", icon: "truck",     weight: 0.22 },
  { id: "phone",     ttl: "Phone & internet",       hint: "Cell plans, office internet",  icon: "phone",     weight: 0.04 },
  { id: "software",  ttl: "Software & tools",       hint: "CRM, accounting, Bidwise",     icon: "app",       weight: 0.06 },
  { id: "marketing", ttl: "Marketing & ads",        hint: "Website, Google ads, signs",   icon: "megaphone", weight: 0.08 },
  { id: "supplies",  ttl: "Office & supplies",      hint: "Snacks, water, paper, coffee", icon: "cup",       weight: 0.05 },
  { id: "fees",      ttl: "Bank & processing fees", hint: "Card fees, bank, accountant",  icon: "bank",      weight: 0.06 },
];

type CustomCat = { id: string; name: string; amount: number | "" };

type WizardData = {
  bizName: string;
  yourName: string;
  phone: string;
  address: string;
  website: string;
  trade: string;
  size: SizeId | "";
  overhead: number | "";
  overheadDetailed: boolean;
  overheadBreakdown: Record<string, number | "">;
  overheadCustom: CustomCat[];
  burden: number;
  margin: number;
  marginPreset: string;
  minMargin: number;
  _defaultsApplied: boolean;
};

const INITIAL: WizardData = {
  bizName: "", yourName: "", phone: "", address: "", website: "",
  trade: "", size: "", overhead: "", overheadDetailed: false,
  overheadBreakdown: {}, overheadCustom: [],
  burden: 20, margin: 35, marginPreset: "better", minMargin: 20,
  _defaultsApplied: false,
};

const STEPS = [
  { id: 1, key: "name", label: "Name" },
  { id: 2, key: "contact", label: "Contact" },
  { id: 3, key: "profile", label: "Profile" },
  { id: 4, key: "costs", label: "Costs" },
  { id: 5, key: "margins", label: "Margins" },
];

export default function WizardV2() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const totalSteps = STEPS.length;
  const isComplete = step > totalSteps;

  const canAdvance = useMemo(() => {
    if (step === 1) return data.bizName.trim().length > 1;
    if (step === 2) return data.yourName.trim().length > 1;
    if (step === 3) return Boolean(data.trade && data.size);
    if (step === 4) return data.overhead !== "" && Number(data.overhead) >= 0;
    if (step === 5) return Boolean(data.marginPreset);
    return true;
  }, [step, data]);
  const canSkip = step === 2;

  const goNext = () => {
    if (!canAdvance) return;
    if (step === totalSteps) {
      void completeSetup();
      return;
    }
    setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));
  const restart = () => { setStep(1); setData({ ...INITIAL }); };

  async function completeSetup() {
    setError("");
    setSaving(true);
    try {
      const raw = await loadCompanySettings<AppSettings | null>(supabase);
      const base = mergeAppSettings(raw ?? defaultSettings);
      const selectedSize = SIZE_OPTIONS.find((option) => option.id === data.size);
      const overheadLineItems = Object.entries(data.overheadBreakdown)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([id, amount]) => {
          const category = OVERHEAD_CATEGORIES.find((item) => item.id === id);
          return {
            id,
            label: category?.ttl ?? id,
            amount: Number(amount),
          };
        })
        .concat(
          data.overheadCustom
            .filter((item) => item.name.trim() && Number(item.amount) > 0)
            .map((item) => ({
              id: item.id,
              label: item.name.trim(),
              amount: Number(item.amount),
            }))
        );

      const next = mergeAppSettings({
        ...base,
        companyProfile: {
          ...base.companyProfile,
          businessName: data.bizName.trim() || base.companyProfile.businessName,
          contactName: data.yourName.trim() || base.companyProfile.contactName,
          phone: data.phone.trim(),
          address: data.address.trim(),
          website: data.website.trim(),
          mainTrade: mapTrade(data.trade),
          companyLevel: mapCompanyLevel(data.size, selectedSize?.title),
        },
        pricingDefaults: {
          ...base.pricingDefaults,
          goodMargin: Math.max(10, data.margin - 7),
          betterMargin: data.margin,
          bestMargin: Math.min(80, data.margin + 7),
          minimumSafeMargin: data.minMargin,
        },
        costRules: {
          ...base.costRules,
          monthlyOverhead: Number(data.overhead) || 0,
          overheadLineItems,
          laborBurdenPercent: data.burden,
          includeOverhead: true,
          includeMiscellaneousBuffer: true,
          miscellaneousBufferPercent: 5,
        },
        onboardingCompletedAt: new Date().toISOString(),
      });

      await saveCompanySettings(supabase, next);
      setStep(totalSteps + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save setup.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement)?.tagName !== "TEXTAREA") {
        if (canAdvance && !isComplete) {
          e.preventDefault();
          goNext();
        }
      }
      if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canAdvance, isComplete, step]);

  return (
    <div className="v2-wiz">
      <V2BodyTag />
      <div className="app">
        <div className="wiz-topbar">
          <div className="logo">Bid<span className="wise">wise</span></div>
          <div className="topbar-actions">
            {!isComplete && <span>Press <kbd>↵</kbd> to continue</span>}
            {!isComplete && <a>Save &amp; exit</a>}
          </div>
        </div>

        {!isComplete ? (
          <div className="stage">
            <div className="stage-left" key={`motion-${step}`}>
              {step === 1 && <MotionStep1 bizName={data.bizName} />}
              {step === 2 && <MotionStep2 data={data} />}
              {step === 3 && <MotionStep3 trade={data.trade} size={data.size} />}
              {step === 4 && <MotionStep4 amount={Number(data.overhead) || 0} burden={data.burden} />}
              {step === 5 && <MotionStep5 margin={data.margin} jobSize={10000} />}
            </div>

            <div className="stage-right">
              <div className="progress-wrap">
                <div className="progress-meta">
                  <span>STEP <span className="count">{step} / {totalSteps}</span></span>
                  <span>{STEPS[step - 1]?.label}</span>
                </div>
                <div className="progress-bar">
                  {STEPS.map((s) => (
                    <div key={s.id} className={`progress-seg ${step > s.id ? "done" : ""} ${step === s.id ? "active" : ""}`}>
                      <div className="fill"></div>
                    </div>
                  ))}
                </div>
              </div>

              <div key={`step-${step}`}>
                {step === 1 && <Step1 data={data} set={set} />}
                {step === 2 && <Step2 data={data} set={set} />}
                {step === 3 && <Step3 data={data} set={set} />}
                {step === 4 && <Step4 data={data} set={set} />}
                {step === 5 && <Step5 data={data} set={set} />}
              </div>

              <div className="footer-nav">
                <button className="btn" onClick={goBack} disabled={step === 1}>
                  <span style={{ transform: "translateX(-1px)" }}>‹</span> Back
                </button>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {canSkip && <button className="btn-skip" onClick={() => setStep((s) => s + 1)}>Skip for now</button>}
                  <button className={`btn primary ${step === totalSteps ? "solid" : ""}`} onClick={goNext} disabled={!canAdvance || saving}>
                    {saving ? "Saving..." : step === totalSteps ? "Finish setup" : "Continue"} <span className="arr">→</span>
                  </button>
                </div>
              </div>
              {error && <div className="auth-alert error" style={{ marginTop: 14 }}>{error}</div>}
            </div>
          </div>
        ) : (
          <div className="stage">
            <div className="complete-stage">
              <MotionComplete confetti />
              <StepComplete data={data} onRestart={restart} onOpen={() => router.push("/")} />
            </div>
          </div>
        )}

        {!isComplete && (
          <div className="footer-strip">
            <kbd>↵</kbd> continue &nbsp;·&nbsp; <kbd>Esc</kbd> back &nbsp;·&nbsp; setup takes about 2 minutes
          </div>
        )}
      </div>
    </div>
  );
}

function Step1({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  return (
    <div className="step-pane">
      <div className="step-eyebrow">LET&apos;S BEGIN</div>
      <h1 className="step-title">What&apos;s your business called?</h1>
      <p className="step-sub">This shows on every proposal you&apos;ll send. You can edit it later.</p>
      <div className="field" style={{ marginBottom: 8 }}>
        <label>Business name <span style={{ color: "var(--gold-deep)" }}>*</span></label>
        <input className="input input-hero" autoFocus placeholder="e.g. Rincon Latino Roofing"
          value={data.bizName} onChange={(e) => set({ bizName: e.target.value })} />
      </div>
    </div>
  );
}

function Step2({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  return (
    <div className="step-pane">
      <div className="step-eyebrow">QUICK CONTACT</div>
      <h1 className="step-title">How can clients reach you?</h1>
      <p className="step-sub">Your name and contact details will appear in the proposal footer.</p>
      <div className="field-row">
        <div className="field">
          <label>Your name</label>
          <input className="input" placeholder="Alex Johnson" value={data.yourName} onChange={(e) => set({ yourName: e.target.value })} />
        </div>
        <div className="field">
          <label>Phone <span className="hint">optional</span></label>
          <input className="input mono" placeholder="(860) 962-4338" value={data.phone} onChange={(e) => set({ phone: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>Business address <span className="hint">used on proposals</span></label>
        <input className="input" placeholder="449 W Main St, Stamford, CT 06902"
          value={data.address} onChange={(e) => set({ address: e.target.value })} />
      </div>
      <div className="field">
        <label>Website <span className="hint">optional</span></label>
        <input className="input" placeholder="yourbusiness.com" value={data.website} onChange={(e) => set({ website: e.target.value })} />
      </div>
    </div>
  );
}

function Step3({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  return (
    <div className="step-pane">
      <div className="step-eyebrow">YOUR OPERATION</div>
      <h1 className="step-title">What do you do, and how big is the crew?</h1>
      <p className="step-sub">This helps us suggest the right margins for your business profile.</p>
      <div className="field">
        <label>Main trade</label>
        <select className="select" value={data.trade} onChange={(e) => set({ trade: e.target.value })}>
          <option value="" disabled>Pick one…</option>
          {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="field">
        <label style={{ marginBottom: 8 }}>Company size</label>
        <div className="choice-grid cols-2">
          {SIZE_OPTIONS.map((s) => (
            <button key={s.id} className={`choice ${data.size === s.id ? "active" : ""}`}
              onClick={() => set({
                size: s.id,
                overhead: s.defaults.overhead,
                burden: s.defaults.burden,
                margin: s.defaults.margin,
                _defaultsApplied: true,
              })}>
              <div className="check">
                <svg viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              </div>
              <div className="ttl">{s.title}</div>
              <div className="sub">{s.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step4({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  const showSmart = data._defaultsApplied;
  return (
    <div className="step-pane">
      <div className="step-eyebrow">RUNNING COSTS</div>
      <h1 className="step-title">What does it cost just to keep the lights on?</h1>
      <p className="step-sub">Recurring monthly expenses — rent, insurance, vehicles, office. Not job materials or wages.</p>

      {showSmart && (
        <div className="smart-pill" onClick={() => set({ _defaultsApplied: false })} title="Click to clear and enter your own">
          <span className="dot"></span>
          <span>Pre-filled from <b>{data.trade || "your trade"} · {SIZE_OPTIONS.find((s) => s.id === data.size)?.title || "company size"}</b> — typical for your profile</span>
        </div>
      )}

      <div className="field">
        <label>
          Total monthly overhead
          {!data.overheadDetailed && <span className="hint" style={{ color: "var(--ink-3)" }}>If you know it</span>}
        </label>

        {!data.overheadDetailed && (
          <>
            <div className="money-wrap">
              <span className="currency">$</span>
              <input type="number" placeholder="5000" min={0} value={data.overhead}
                onChange={(e) => set({ overhead: e.target.value ? Number(e.target.value) : "", _defaultsApplied: false })} />
              <span className="suffix">/ month</span>
            </div>
            <button type="button" className="breakdown-toggle"
              onClick={() => {
                const current = Number(data.overhead) || 0;
                if (current > 0 && Object.keys(data.overheadBreakdown).length === 0) {
                  const seed: Record<string, number> = {};
                  OVERHEAD_CATEGORIES.forEach((c) => { seed[c.id] = Math.round(current * c.weight); });
                  set({ overheadDetailed: true, overheadBreakdown: seed });
                } else {
                  set({ overheadDetailed: true });
                }
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              Don&apos;t know the total? Build it up by category
            </button>
          </>
        )}

        {data.overheadDetailed && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -2 }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Detailed mode — fill what applies, skip the rest</span>
              <button type="button" className="breakdown-toggle open" onClick={() => set({ overheadDetailed: false })} style={{ marginTop: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                Use simple input
              </button>
            </div>
            <OverheadBreakdown data={data} set={set} />
          </>
        )}
      </div>

      <div className="field" style={{ marginTop: 24 }}>
        <label>
          Labor burden
          <span className="mono" style={{ fontSize: 13, color: "var(--gold-deep)", fontWeight: 600 }}>{data.burden}%</span>
        </label>
        <div className="slider-wrap">
          <div className="slider-track">
            <div className="slider-fill" style={{ width: `${((data.burden - 10) / 30) * 100}%` }}></div>
            <input type="range" min={10} max={40} value={data.burden}
              onChange={(e) => set({ burden: Number(e.target.value), _defaultsApplied: false })} />
          </div>
          <div className="slider-ticks">
            <span>10%</span><span>20%</span><span>30%</span><span>40%</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
          Payroll taxes, workers comp, and similar. Typical 18–25% in the US.
        </div>
      </div>
    </div>
  );
}

function OverheadBreakdown({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  const total = Number(data.overhead) || 0;
  const [highlight, setHighlight] = useState(false);
  const breakdown = data.overheadBreakdown;
  const customCats = data.overheadCustom;

  useEffect(() => {
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 500);
    return () => clearTimeout(t);
  }, [total]);

  const recalc = (b: Record<string, number | "">, c: CustomCat[]) =>
    Object.values(b).reduce<number>((a, v) => a + (Number(v) || 0), 0) +
    c.reduce<number>((a, k) => a + (Number(k.amount) || 0), 0);

  const updateCat = (id: string, val: string) => {
    const next: Record<string, number | ""> = { ...breakdown, [id]: val === "" ? "" : Number(val) };
    set({ overheadBreakdown: next, overhead: recalc(next, customCats), _defaultsApplied: false });
  };
  const addCustom = () => {
    const nextCustom = [...customCats, { id: `c_${Date.now()}`, name: "", amount: "" as const }];
    set({ overheadCustom: nextCustom });
  };
  const updateCustom = (id: string, patch: Partial<CustomCat>) => {
    const nextCustom = customCats.map((c) => (c.id === id ? { ...c, ...patch } : c));
    set({ overheadCustom: nextCustom, overhead: recalc(breakdown, nextCustom), _defaultsApplied: false });
  };
  const removeCustom = (id: string) => {
    const nextCustom = customCats.filter((c) => c.id !== id);
    set({ overheadCustom: nextCustom, overhead: recalc(breakdown, nextCustom) });
  };

  return (
    <div className="breakdown-card">
      {OVERHEAD_CATEGORIES.map((cat) => (
        <div key={cat.id} className="breakdown-row">
          <div className="icon"><OverheadIcon name={cat.icon} /></div>
          <div className="meta">
            <div className="ttl">{cat.ttl}</div>
            <div className="hint">{cat.hint}</div>
          </div>
          <div className="money-mini">
            <span className="c">$</span>
            <input type="number" min={0} placeholder="0"
              value={breakdown[cat.id] ?? ""}
              onChange={(e) => updateCat(cat.id, e.target.value)} />
          </div>
        </div>
      ))}

      {customCats.map((c) => (
        <div key={c.id} className="breakdown-row">
          <div className="icon" style={{ background: "var(--gold-bg)", borderColor: "var(--gold-soft)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </div>
          <div className="meta">
            <input className="ttl-input" placeholder="e.g. Storage unit, accountant, gym…" autoFocus={!c.name}
              value={c.name} onChange={(e) => updateCustom(c.id, { name: e.target.value })} />
            <div className="hint" style={{ marginTop: 3 }}>Your custom category</div>
          </div>
          <div className="money-mini">
            <span className="c">$</span>
            <input type="number" min={0} placeholder="0" value={c.amount}
              onChange={(e) => updateCustom(c.id, { amount: e.target.value === "" ? "" : Number(e.target.value) })} />
          </div>
          <button type="button" className="del-btn" onClick={() => removeCustom(c.id)} title="Remove">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      ))}

      <button type="button" className="add-custom-btn" onClick={addCustom}>
        <span className="plus">+</span>
        Add custom category
      </button>

      <div className="breakdown-total">
        <span className="lbl">Monthly total</span>
        <span className={`val ${highlight ? "changed" : ""}`}>${total.toLocaleString()}</span>
      </div>
      <div className="breakdown-foot">
        <span>{OVERHEAD_CATEGORIES.length + customCats.length} categories · items add up automatically</span>
        <button type="button" onClick={() => set({ overheadBreakdown: {}, overheadCustom: [], overhead: "" })}>Clear all</button>
      </div>
    </div>
  );
}

function OverheadIcon({ name }: { name: string }) {
  const p = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "home":      return <svg {...p}><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z" /></svg>;
    case "shield":    return <svg {...p}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "truck":     return <svg {...p}><rect x="1" y="6" width="14" height="10" /><path d="M15 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
    case "phone":     return <svg {...p}><path d="M5 3h4l2 5-3 2c1.5 3 3.5 5 6 6l2-3 5 2v4a2 2 0 01-2 2C10 21 3 14 3 5a2 2 0 012-2z" /></svg>;
    case "app":       return <svg {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    case "megaphone": return <svg {...p}><path d="M3 11l11-7v16L3 13zM14 8a4 4 0 010 8" /></svg>;
    case "cup":       return <svg {...p}><path d="M5 8h12v8a4 4 0 01-4 4H9a4 4 0 01-4-4V8z" /><path d="M17 11h2a2 2 0 010 4h-2" /><path d="M8 4v2M12 4v2" /></svg>;
    case "bank":      return <svg {...p}><path d="M3 9l9-5 9 5M5 9v9M19 9v9M9 9v9M15 9v9M3 21h18" /></svg>;
    default:          return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function Step5({ data, set }: { data: WizardData; set: (patch: Partial<WizardData>) => void }) {
  const selected = data.marginPreset;
  return (
    <div className="step-pane">
      <div className="step-eyebrow">FINAL STEP</div>
      <h1 className="step-title">What&apos;s your target profit margin?</h1>
      <p className="step-sub">Margin is what you keep after all costs. We&apos;ve pre-filled industry averages — adjust if you like.</p>
      <div className="formula-strip">
        <b>Margin %</b> = (Price − Cost) ÷ Price × 100
      </div>
      <div className="choice-grid cols-3" style={{ marginBottom: 18 }}>
        {MARGIN_PRESETS.map((m) => (
          <div key={m.id} className={`margin-card ${selected === m.id ? "active" : ""}`}
            onClick={() => set({ marginPreset: m.id, margin: m.pct })}>
            {m.recommended && <div className="ribbon">Recommended</div>}
            <div className="grade">{m.grade}</div>
            <div className="pct">{m.pct}<sup>%</sup></div>
            <div className="desc">{m.desc}</div>
          </div>
        ))}
      </div>
      <div className="field">
        <label>
          Minimum safe margin
          <span className="mono" style={{ fontSize: 13, color: "var(--gold-deep)", fontWeight: 600 }}>{data.minMargin}%</span>
        </label>
        <div className="slider-wrap">
          <div className="slider-track">
            <div className="slider-fill" style={{ width: `${((data.minMargin - 10) / 30) * 100}%` }}></div>
            <input type="range" min={10} max={40} value={data.minMargin}
              onChange={(e) => set({ minMargin: Number(e.target.value) })} />
          </div>
          <div className="slider-ticks">
            <span>10%</span><span>20%</span><span>30%</span><span>40%</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
          Never price below this floor, even to win a job.
        </div>
      </div>
    </div>
  );
}

function mapTrade(trade: string): SettingsTrade {
  if (trade === "Roofing" || trade === "Painting" || trade === "Drywall" || trade === "Gutters" || trade === "Siding" || trade === "Remodeling") {
    return trade;
  }
  return "General Contractor";
}

function mapCompanyLevel(size: SizeId | "", label?: string): CompanyLevel {
  if (label === "Solo Owner") return "Solo Owner";
  if (label === "Established Co.") return "Established Company";
  if (label === "Premium Company") return "Premium Company";
  return "Small Crew";
}

function StepComplete({ data, onRestart, onOpen }: { data: WizardData; onRestart: () => void; onOpen: () => void }) {
  return (
    <div className="step-pane" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div className="step-eyebrow" style={{ display: "block" }}>WIZARD COMPLETE</div>
      <h1 className="step-title" style={{ fontSize: 42 }}>You&apos;re all set</h1>
      <p className="step-sub" style={{ margin: "0 auto 28px", maxWidth: "40ch" }}>
        Bidwise is configured for your business. Let&apos;s go price your first job.
      </p>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 18, textAlign: "left", marginBottom: 24, fontSize: 13 }}>
        <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 10.5, letterSpacing: ".14em", color: "var(--ink-3)", textTransform: "uppercase", marginBottom: 10 }}>
          YOUR SETUP · SUMMARY
        </div>
        <SummaryRow label="Business" value={data.bizName || "—"} />
        <SummaryRow label="Trade · Size" value={`${data.trade || "—"} · ${SIZE_OPTIONS.find((s) => s.id === data.size)?.title || "—"}`} />
        <SummaryRow label="Monthly overhead" value={data.overhead ? `$${Number(data.overhead).toLocaleString()}` : "—"} mono />
        <SummaryRow label="Labor burden" value={`${data.burden}%`} mono />
        <SummaryRow label="Target margin" value={`${data.margin}%`} mono accent />
        <SummaryRow label="Minimum margin" value={`${data.minMargin}%`} mono />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" onClick={onOpen} className="btn primary solid">
          Open dashboard <span className="arr">→</span>
        </button>
        <button className="btn" onClick={onRestart}>Restart wizard</button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--line-2)" }}>
      <span style={{ color: "var(--ink-3)" }}>{label}</span>
      <span style={{
        color: accent ? "var(--gold-deep)" : "var(--ink)",
        fontWeight: accent ? 600 : 500,
        fontFamily: mono ? "var(--font-jetbrains-mono), monospace" : "inherit",
      }}>{value}</span>
    </div>
  );
}

/* ============================================================
   Motion graphics
   ============================================================ */
const GOLD = "#C9A227";

function MotionStep1({ bizName }: { bizName: string }) {
  const display = bizName?.trim() || "Your Business Co.";
  return (
    <div className="mg-frame">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="orbit b"><div className="satellite"></div></div>
        <div className="orbit"><div className="satellite"></div></div>
        <div className="nameplate">
          <div className="stamp">✓</div>
          <div className="biz-line1">Proposal · Cover</div>
          <div className="biz-name">{display}{!bizName && <span className="biz-cursor"></span>}</div>
          <div className="biz-divider"></div>
          <div className="biz-meta">
            <span>EST. 2024</span>
            <span>BID #00<span style={{ color: GOLD }}>1</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotionStep2({ data }: { data: WizardData }) {
  return (
    <div className="mg-frame">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div style={{ position: "relative", width: 380, height: 380, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="ripple" style={{ animationDelay: "0s" }}></div>
          <div className="ripple" style={{ animationDelay: "1s" }}></div>
          <div className="ripple" style={{ animationDelay: "2s" }}></div>
          <div className="pin"><div className="core"></div></div>
          <div className="biz-card-mini">
            <div className="lbl">PHONE</div>
            <div className="val mono">{data.phone || "(•••) •••-••••"}</div>
          </div>
          <div className="biz-card-mini b">
            <div className="lbl">ADDRESS</div>
            <div className="val" style={{ fontSize: 11, fontWeight: 500 }}>{data.address ? data.address.slice(0, 22) : "Street, City, ST"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotionStep3({ trade, size }: { trade: string; size: SizeId | "" }) {
  const layouts: Record<SizeId, { x: number; y: number; lead?: boolean }[]> = {
    solo:        [{ x: 150, y: 130, lead: true }],
    small:       [{ x: 150, y: 90, lead: true }, { x: 100, y: 170 }, { x: 200, y: 170 }],
    established: [{ x: 150, y: 80, lead: true }, { x: 80, y: 150 }, { x: 220, y: 150 }, { x: 110, y: 220 }, { x: 190, y: 220 }],
    premium:     [{ x: 150, y: 70, lead: true }, { x: 70, y: 130 }, { x: 230, y: 130 }, { x: 90, y: 210 }, { x: 210, y: 210 }, { x: 150, y: 245 }],
  };
  const dots = layouts[(size as SizeId) || "small"];
  const lead = dots.find((d) => d.lead) ?? dots[0];
  const sizeLabel = size === "solo" ? "1 person" : size === "small" ? "2–5 people" : size === "established" ? "5+ steady" : size === "premium" ? "6+ premium" : "2–5 people";

  return (
    <div className="mg-frame">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="crew-stage">
          {dots.filter((d) => !d.lead).map((d, i) => {
            const dx = d.x - lead.x;
            const dy = d.y - lead.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
            return <div key={i} className="crew-line"
              style={{ left: lead.x + 19, top: lead.y + 19, width: len, transform: `rotate(${ang}deg)`, animationDelay: `${i * 0.08}s` }} />;
          })}
          {dots.map((d, i) => (
            <div key={i} className={`crew-dot ${d.lead ? "lead" : ""}`}
              style={{ left: d.x, top: d.y, animationDelay: `${i * 0.08}s` }}>
              <div className="inner"></div>
            </div>
          ))}
          <div className="crew-label">{trade || "Roofing"} · {sizeLabel}</div>
        </div>
      </div>
    </div>
  );
}

function MotionStep4({ amount, burden }: { amount: number; burden: number }) {
  const max = 8000;
  const a = Math.min(amount / max, 1);
  const cols = [
    { label: "Rent",   h: 0.55 * a },
    { label: "Insur.", h: 0.85 * a },
    { label: "Trucks", h: 0.70 * a },
    { label: "Office", h: 0.35 * a },
    { label: "Other",  h: 0.45 * a },
  ];
  return (
    <div className="mg-frame">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="stack-wrap">
          <div className="coin" style={{ left: "20%", animationDelay: "0s" }}></div>
          <div className="coin" style={{ left: "55%", animationDelay: ".7s" }}></div>
          <div className="coin" style={{ left: "78%", animationDelay: "1.4s" }}></div>
          <div className="coin" style={{ left: "38%", animationDelay: "2.1s" }}></div>
          {cols.map((c, i) => (
            <div key={i} className="stack-col" style={{ height: 60 + c.h * 180, animationDelay: `${i * 0.1}s` }}>
              <span className="num">${Math.round(amount * c.h / 3)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center",
        fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 11, color: "#8A867E", letterSpacing: ".06em" }}>
        OVERHEAD <span style={{ color: "#A88716", fontWeight: 600 }}>${amount.toLocaleString()}</span>
        &nbsp;·&nbsp;BURDEN <span style={{ color: "#A88716", fontWeight: 600 }}>{burden}%</span>
      </div>
    </div>
  );
}

function MotionStep5({ margin, jobSize }: { margin: number; jobSize: number }) {
  const r = 100;
  const c = 2 * Math.PI * r;
  const filled = c * (margin / 100);
  const profit = Math.round((jobSize * margin) / 100);
  return (
    <div className="mg-frame">
      <div className="mg-grid"></div>
      <div className="mg-stage">
        <div className="donut-wrap">
          <svg className="donut-svg" width="300" height="300" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r={r} fill="none" stroke="#E8E4D9" strokeWidth="28" />
            <circle cx="150" cy="150" r={r} fill="none" stroke={GOLD} strokeWidth="28" strokeLinecap="round"
              strokeDasharray={`${filled} ${c}`} style={{ transition: "stroke-dasharray .7s cubic-bezier(.2,.7,.2,1)" }} />
            {[0, 25, 50, 75].map((t, i) => (
              <line key={i} x1="150" y1="20" x2="150" y2="32" stroke="#8A867E" strokeWidth="1.5"
                transform={`rotate(${t * 3.6} 150 150)`} opacity=".4" />
            ))}
          </svg>
          <div className="donut-center">
            <div className="pct-big">{margin}<sup>%</sup></div>
            <div className="pct-label">Target margin</div>
            <div className="pct-money">${profit.toLocaleString()} on a {jobSize / 1000}k job</div>
          </div>
          <div className="floating-tag" style={{ top: "14%", right: "-2%" }}>
            <span style={{ color: "#8A867E" }}>COST</span> <b>${(jobSize - profit).toLocaleString()}</b>
          </div>
          <div className="floating-tag" style={{ bottom: "12%", left: "-4%" }}>
            <span style={{ color: "#8A867E" }}>PROFIT</span> <b style={{ color: "#A88716" }}>${profit.toLocaleString()}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function MotionComplete({ confetti }: { confetti: boolean }) {
  const pieces = useMemo(() =>
    Array.from({ length: confetti ? 24 : 0 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: [GOLD, "#1A1814", "#A88716", "#FBF1C4"][i % 4],
      rot: Math.random() * 360,
    })), [confetti]);
  return (
    <div style={{ position: "relative", width: "100%", height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {pieces.map((p, i) => (
        <div key={i} className="confetti"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }} />
      ))}
      <div className="check-big">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
