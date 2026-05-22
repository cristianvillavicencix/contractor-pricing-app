"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  computeNextProposalNumber,
  defaultSettings,
  mergeAppSettings,
  type AppSettings,
  type PriceOptionName,
  type PricingResult,
  type ProjectSize,
  type ProjectState,
  type RiskLevel,
  type Trade as AppTrade,
} from "@/lib/app-data";
import { calculatePricingEngine, type PricingEngineInput, type PricingEngineOption } from "@/lib/pricing-engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { upsertQuote } from "@/lib/supabase/data";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";
import { fmt$ } from "../_shared/data";
import { useV2LiveData } from "../_shared/live-data";

const TRADES = ["Roofing", "Plumbing", "HVAC", "Electrical", "Painting", "Flooring", "Remodeling"] as const;
const SIZES = ["Small", "Medium", "Large", "XL"] as const;
const RISKS = ["Low", "Medium", "High"] as const;

type Trade = (typeof TRADES)[number];
type Size = (typeof SIZES)[number];

const RANGE_TABLE: Record<Trade, Record<Size, [number, number]>> = {
  Roofing:    { Small: [3500, 7000],  Medium: [7000, 14000],  Large: [14000, 28000], XL: [28000, 60000] },
  Plumbing:   { Small: [800, 2500],   Medium: [2500, 7000],   Large: [7000, 14000],  XL: [14000, 30000] },
  HVAC:       { Small: [1200, 3500],  Medium: [3500, 8500],   Large: [8500, 18000],  XL: [18000, 40000] },
  Electrical: { Small: [600, 2000],   Medium: [2000, 5500],   Large: [5500, 12000],  XL: [12000, 28000] },
  Painting:   { Small: [1500, 4000],  Medium: [4000, 10000],  Large: [10000, 22000], XL: [22000, 50000] },
  Flooring:   { Small: [2000, 5000],  Medium: [5000, 12000],  Large: [12000, 26000], XL: [26000, 55000] },
  Remodeling: { Small: [5000, 15000], Medium: [15000, 40000], Large: [40000, 90000], XL: [90000, 200000] },
};

type CostKey = "materials" | "ownLabor" | "dumpster" | "permits" | "equipment" | "subcontractor" | "misc";
type Costs = Record<CostKey, number | ""> & { waste: number | "" };

const EMPTY_COSTS: Costs = {
  materials: "", ownLabor: "", waste: 0,
  dumpster: "", permits: "", equipment: "", subcontractor: "", misc: "",
};

export default function ProposalBuilderV2() {
  const router = useRouter();
  const proposalsHref = "/proposals";
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { contacts, settings: rawSettings, proposals } = useV2LiveData();
  const settings = mergeAppSettings(rawSettings ?? defaultSettings);
  const [trade, setTrade] = useState<Trade>("Roofing");
  const [size, setSize] = useState<Size>("Medium");
  const [risk, setRisk] = useState<(typeof RISKS)[number]>("Medium");
  const [costs, setCosts] = useState<Costs>(EMPTY_COSTS);
  const [protOpen, setProtOpen] = useState(false);
  const [projectName, setProjectName] = useState("New project");
  const [customerName, setCustomerName] = useState(contacts[0]?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const setCost = (k: keyof Costs, v: string) => {
    setCosts((c) => ({ ...c, [k]: v === "" ? "" : Number(v) }));
  };

  const num = (v: number | "") => (typeof v === "number" ? v : 0);

  const materials = num(costs.materials);
  const wasteAmt = (materials * num(costs.waste)) / 100;
  const ownLabor = num(costs.ownLabor);
  const dumpster = num(costs.dumpster);
  const permits = num(costs.permits);
  const equipment = num(costs.equipment);
  const subcontractor = num(costs.subcontractor);
  const misc = num(costs.misc);

  const directCost = materials + wasteAmt + ownLabor + dumpster + permits + equipment + subcontractor + misc;

  const engineInput = useMemo(
    () => createEngineInput(settings, {
      trade,
      size,
      risk,
      materials: materials + wasteAmt,
      ownLabor,
      dumpster,
      permits,
      equipment,
      subcontractor,
      misc,
    }),
    [dumpster, equipment, materials, misc, ownLabor, permits, risk, settings, size, subcontractor, trade, wasteAmt]
  );
  const engineResult = useMemo(() => calculatePricingEngine(engineInput), [engineInput]);
  const optionByName = Object.fromEntries(engineResult.options.map((option) => [option.name, option])) as Record<PriceOptionName, PricingEngineOption>;
  const goodOption = optionByName.Good;
  const betterOption = optionByName.Better;
  const bestOption = optionByName.Best;

  const laborBurden = engineResult.laborBurdenCost;
  const miscBuffer = engineResult.bufferCost;
  const taxOnBetter = betterOption?.taxCost ?? 0;
  const overhead = engineResult.overheadCost;
  const permitBuffer = engineResult.permitBufferCost;
  const totalProt = Math.round(engineResult.businessCostTotal);

  const baseCost = Math.round(engineResult.baseCost);
  const breakeven = Math.round(engineResult.breakevenPrice);
  const minMargin = Math.round(engineResult.minimumSafeMargin * 100);
  const minSafePrice = Math.round(engineResult.minimumSafePrice);

  const gMargin = Math.round((goodOption?.margin ?? 0) * 100);
  const bMargin = Math.round((betterOption?.margin ?? 0) * 100);
  const bestMargin = Math.round((bestOption?.margin ?? 0) * 100);
  const good = directCost > 0 ? Math.round(goodOption?.salePrice ?? 0) : 0;
  const better = directCost > 0 ? Math.round(betterOption?.salePrice ?? 0) : 0;
  const best = directCost > 0 ? Math.round(bestOption?.salePrice ?? 0) : 0;

  const tightness = (price: number): "safe" | "tight" | "loose" => {
    if (price <= 0) return "safe";
    const buffer = price - minSafePrice;
    if (buffer < 50) return "tight";
    if (buffer > price * 0.15) return "loose";
    return "safe";
  };

  const range = RANGE_TABLE[trade][size];
  const recommendedPrice = better;
  let position: "in" | "below" | "above" = "in";
  if (recommendedPrice && recommendedPrice < range[0]) position = "below";
  else if (recommendedPrice && recommendedPrice > range[1]) position = "above";

  const meterMin = range[0] * 0.5;
  const meterMax = range[1] * 1.5;
  const markerPct = recommendedPrice
    ? Math.max(2, Math.min(98, ((recommendedPrice - meterMin) / (meterMax - meterMin)) * 100))
    : 50;

  let health: { tone: "healthy" | "warn" | "risk"; icon: IconName; title: string; desc: string } = {
    tone: "healthy",
    icon: "check",
    title: "Project Health: Healthy",
    desc: "Better margin is healthy and Good remains above the safe price.",
  };
  if (better && better < minSafePrice) {
    health = { tone: "risk", icon: "flag", title: "Below safe floor", desc: "Better is priced under your minimum margin. Increase price or reduce costs." };
  } else if (good && good < minSafePrice) {
    health = { tone: "warn", icon: "flag", title: "Good tier is risky", desc: "Your Good tier is below the safe price. Consider promoting Better as the entry option." };
  } else if (position === "below") {
    health = { tone: "warn", icon: "arrow-dn", title: "Below typical range", desc: "Your price is under the market range for this job size. Confirm scope before sending." };
  } else if (position === "above") {
    health = { tone: "warn", icon: "arrow-up", title: "Above typical range", desc: "Your price is above the market range. Make sure premium scope is reflected in the proposal." };
  }

  const hasData = directCost > 0;
  const selectedContact = contacts.find((contact) => contact.name === customerName) ?? contacts[0];

  async function createProposal() {
    if (!hasData || !goodOption || !betterOption || !bestOption) return;
    setSaving(true);
    setSaveError("");
    try {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + settings.proposalSettings.defaultExpirationDays);
      const quoteId = crypto.randomUUID();
      const legacyQuotes = proposals.map((proposal) => ({
        id: proposal.id,
        projectName: proposal.title,
        customerName: selectedContact?.name ?? (customerName || "Customer"),
        good: toPricingResult(goodOption, settings, "Good"),
        better: toPricingResult(betterOption, settings, "Better"),
        best: toPricingResult(bestOption, settings, "Best"),
        selectedOption: "Better" as const,
        status: "Draft" as const,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }));
      await upsertQuote(supabase, {
        id: quoteId,
        contactId: selectedContact?.id,
        projectName: projectName.trim() || `${trade} project`,
        customerName: selectedContact?.name ?? (customerName || "Customer"),
        customerPhone: selectedContact?.phone,
        customerEmail: selectedContact?.email,
        customerAddress: selectedContact?.addr,
        trade,
        proposalTitle: settings.proposalSettings.defaultProposalTitle,
        proposalNumber: computeNextProposalNumber(legacyQuotes),
        scopeSummary: `${trade} proposal created from Contractor Studio v2 builder.`,
        warrantyText: settings.proposalSettings.defaultWarrantyText,
        termsText: settings.proposalSettings.defaultTerms,
        includedServices: settings.proposalSettings.defaultIncludedServices,
        certifications: settings.companyProfile.certifications.filter((c) => c.enabled).map((c) => c.name),
        good: toPricingResult(goodOption, settings, "Good"),
        better: toPricingResult(betterOption, settings, "Better"),
        best: toPricingResult(bestOption, settings, "Best"),
        selectedOption: "Better",
        status: "Draft",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        projectSize: mapSize(size),
        riskLevel: risk,
        jobState: settings.marketLocation.defaultState,
        clientPortalToken: crypto.randomUUID(),
      });
      router.push(`/quotes/editor?id=${quoteId}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not create proposal.");
    } finally {
      setSaving(false);
    }
  }

  const segments = [
    { k: "materials",     l: "Materials",  v: materials,      c: "var(--blue)" },
    { k: "waste",         l: "Waste",      v: wasteAmt,       c: "var(--teal)" },
    { k: "ownLabor",      l: "Own Labor",  v: ownLabor,       c: "var(--gold)" },
    { k: "subcontractor", l: "Subs",       v: subcontractor,  c: "var(--purple)" },
    { k: "equipment",     l: "Equipment",  v: equipment,      c: "var(--amber)" },
    { k: "permits",       l: "Permits",    v: permits,        c: "var(--rose)" },
    { k: "dumpster",      l: "Dumpster",   v: dumpster,       c: "var(--ink-2)" },
    { k: "misc",          l: "Misc",       v: misc,           c: "var(--ink-3)" },
  ].filter((s) => s.v > 0);

  return (
    <V2Shell>
      <div className="builder-page view">
        <div className="builder-head">
          <div className="ctx">
            <Link href={proposalsHref} className="back-btn" title="Back to proposals">
              <Icon name="chevron-l" size={16} />
            </Link>
            <div>
              <div className="id">DRAFT · P-1043</div>
              <input
                aria-label="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                style={{ border: "none", background: "transparent", font: "inherit", fontSize: 30, fontWeight: 800, letterSpacing: "-.04em", color: "var(--ink)", padding: 0, outline: "none", width: "100%" }}
              />
              <div className="customer">
                <Icon name="users" size={12} />
                {contacts.length > 0 ? (
                  <select value={customerName || contacts[0]?.name} onChange={(e) => setCustomerName(e.target.value)} style={{ border: "none", background: "transparent", color: "var(--ink)", fontWeight: 700, outline: "none" }}>
                    {contacts.map((contact) => <option key={contact.id}>{contact.name}</option>)}
                  </select>
                ) : (
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" style={{ border: "none", background: "transparent", outline: "none", fontWeight: 700 }} />
                )}
                <span>· {selectedContact?.biz || "Customer"} · {selectedContact?.addr || settings.marketLocation.defaultCity || "Service area"}</span>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn ghost" title="Saved session history"><Icon name="clock" size={13} /></button>
            <button className="btn ghost">Save session</button>
            <button className="btn ghost">Business rules</button>
            <button className="btn dark"><Icon name="eye" size={13} /> Preview</button>
            <button className="btn primary" disabled={!hasData || saving} onClick={createProposal}><Icon name="check" size={13} /> {saving ? "Creating..." : "Create Proposal"}</button>
          </div>
        </div>
        {saveError ? <div className="auth-alert error">{saveError}</div> : null}

        <div className="builder-grid">
          <div className="input-col">
            <div className="input-card">
              <h3>Job setup <span className="help-tip" title="Drives benchmarks and recommendations">?</span></h3>
              <div className="job-setup-grid">
                <div className="b-field">
                  <label>Trade</label>
                  <select value={trade} onChange={(e) => setTrade(e.target.value as Trade)}>
                    {TRADES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="b-field">
                  <label>Size <span className="info" title="Approx. dollar magnitude of the job">i</span></label>
                  <select value={size} onChange={(e) => setSize(e.target.value as Size)}>
                    {SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="b-field">
                  <label>Risk <span className="info" title="Higher risk increases recommended margin">i</span></label>
                  <select value={risk} onChange={(e) => setRisk(e.target.value as (typeof RISKS)[number])}>
                    {RISKS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="input-card">
              <h3>Project costs <span className="help-tip" title="Only direct job costs — not your fixed overhead">?</span></h3>
              <div className="cost-grid">
                <div className="cost-field full">
                  <label>
                    Materials
                    <span style={{ color: "var(--ink-3)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>Tip: pick from products →</span>
                  </label>
                  <div className="cost-input-wrap">
                    <span className="currency">$</span>
                    <input type="number" placeholder="0" min={0} value={costs.materials} onChange={(e) => setCost("materials", e.target.value)} />
                  </div>
                  <div className="waste-row">
                    <span>Waste %</span>
                    <input type="number" value={costs.waste} min={0} max={30} onChange={(e) => setCost("waste", e.target.value)} />
                    {wasteAmt > 0 && <span style={{ color: "var(--gold-deep)" }}>+{fmt$(Math.round(wasteAmt))}</span>}
                  </div>
                </div>

                {(["ownLabor", "subcontractor", "equipment", "permits", "dumpster", "misc"] as CostKey[]).map((k) => (
                  <div key={k} className="cost-field">
                    <label>{labelFor(k)}</label>
                    <div className="cost-input-wrap">
                      <span className="currency">$</span>
                      <input type="number" placeholder="0" min={0} value={costs[k]} onChange={(e) => setCost(k, e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="total-card">
                <div className="label">Total direct cost</div>
                <div className="value">{fmt$(directCost)}</div>
                {hasData && (
                  <>
                    <div className="breakdown-bar">
                      {segments.map((s) => (
                        <div key={s.k} className="seg" style={{ width: `${(s.v / directCost) * 100}%`, background: s.c }} title={`${s.l}: ${fmt$(Math.round(s.v))}`} />
                      ))}
                    </div>
                    <div className="breakdown-legend">
                      {segments.map((s) => (
                        <span key={s.k}>
                          <span className="swatch" style={{ background: s.c }}></span>
                          {s.l} {Math.round((s.v / directCost) * 100)}%
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {hasData && (
              <div className="range-card">
                <div className="lbl">
                  Typical <b>{trade} ({size})</b>: ${range[0].toLocaleString()}–${range[1].toLocaleString()}
                </div>
                <div className="range-meter">
                  <div className="typical"></div>
                  <div className="labels"><span>LOW</span><span>HIGH</span></div>
                  <div className="marker" style={{ left: `calc(${markerPct}% - 1.5px)` }}></div>
                </div>
                <div className="range-status">
                  <span>Your price: <b style={{ color: "var(--ink)", fontWeight: 700 }}>{fmt$(recommendedPrice)}</b></span>
                  <span className={`pos ${position}`}>
                    {position === "below" ? "↓ Below range" : position === "above" ? "↑ Above range" : "✓ In range"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="output-col">
            {!hasData ? (
              <div className="empty-pricing">
                <div className="ghost-cards">
                  {["GOOD", "BETTER", "BEST"].map((label) => (
                    <div key={label} className="ghost-card">
                      <div className="g-l">{label}</div>
                      <div className="g-v"></div>
                      <div className="g-line"></div>
                      <div className="g-line short"></div>
                    </div>
                  ))}
                </div>
                <h3>Enter your costs to see pricing</h3>
                <p>Materials, labor, and subs feed into 3 price tiers — Good, Better, and Best — with margin, markup, and a safety check against your floor.</p>
                <div className="ctx-strip">TRADE: {trade} · {size} · CONNECTICUT</div>
              </div>
            ) : (
              <>
                <div className="price-grid">
                  {[
                    { key: "good", label: "Good", price: good, margin: gMargin, recommended: false },
                    { key: "better", label: "Better", price: better, margin: bMargin, recommended: true },
                    { key: "best", label: "Best", price: best, margin: bestMargin, recommended: false },
                  ].map((c) => {
                    const profit = Math.round((c.price * c.margin) / 100);
                    const markup = c.price > 0 ? Math.round(((c.price - baseCost) / baseCost) * 1000) / 10 : 0;
                    const t = tightness(c.price);
                    return (
                      <div key={c.key} className={`price-card ${c.recommended ? "recommended" : ""}`}>
                        <div className="grade-row">
                          <span className="grade">{c.label}</span>
                          {c.recommended && <span className="recommended-badge">RECOMMENDED</span>}
                        </div>
                        <div className="price">{fmt$(c.price)}</div>
                        <div className="stats">
                          <div className="stat-row">
                            <span className="k">Profit</span>
                            <span className={`v ${c.recommended ? "gold" : ""}`}>{fmt$(profit)}</span>
                          </div>
                          <div className="stat-row">
                            <span className="k">Margin</span>
                            <span className="v">{c.margin}%</span>
                          </div>
                          <div className="stat-row">
                            <span className="k">Markup</span>
                            <span className="v">{markup}%</span>
                          </div>
                        </div>
                        <div className="tightness">
                          <span className="label">Safety</span>
                          <span className={`tight-pill ${t}`}>{t === "safe" ? "Safe" : t === "tight" ? "Tight" : "Loose"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mini-stats">
                  <div className="mini-stat">
                    <div className="l">Base cost</div>
                    <div className="v">{fmt$(baseCost)}</div>
                    <div className="sub">Materials {fmt$(Math.round(materials + wasteAmt))} · Labor {fmt$(ownLabor)}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="l">Breakeven</div>
                    <div className="v">{fmt$(breakeven)}</div>
                    <div className="sub">Includes overhead {fmt$(overhead)}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="l">Min safe price</div>
                    <div className="v">{fmt$(minSafePrice)}</div>
                    <div className="sub">{minMargin}% min · Floor {fmt$(Math.round(minSafePrice * 0.5))}</div>
                  </div>
                </div>

                <div className="cost-prot">
                  <div className={`cost-prot-head ${protOpen ? "open" : ""}`} onClick={() => setProtOpen((o) => !o)}>
                    <h4>Cost protection · added to base</h4>
                    <span className="total-prot">+{fmt$(totalProt)}</span>
                    <span className="chev"><Icon name="chevron-d" size={16} /></span>
                  </div>
                  {protOpen && (
                    <div className="cost-prot-body">
                      <div className="cost-prot-item">
                        <div className="ttl">Labor burden</div>
                        <div className="val">{fmt$(Math.round(laborBurden))}</div>
                        <div className="desc">22% on own labor</div>
                      </div>
                      <div className="cost-prot-item">
                        <div className="ttl">Overhead</div>
                        <div className="val">{fmt$(overhead)}</div>
                        <div className="desc">10% allocation</div>
                      </div>
                      <div className="cost-prot-item">
                        <div className="ttl">Misc buffer</div>
                        <div className="val">{fmt$(Math.round(miscBuffer))}</div>
                        <div className="desc">10% of misc</div>
                      </div>
                      <div className="cost-prot-item">
                        <div className="ttl">Permit buffer</div>
                        <div className="val">{fmt$(permitBuffer)}</div>
                        <div className="desc">5% on permits</div>
                      </div>
                      <div className="cost-prot-item">
                        <div className="ttl">Tax on Better</div>
                        <div className="val">{fmt$(taxOnBetter)}</div>
                        <div className="desc">Per setting</div>
                      </div>
                      <div className="cost-prot-item">
                        <div className="ttl">Total protection</div>
                        <div className="val" style={{ color: "var(--gold-deep)" }}>{fmt$(totalProt)}</div>
                        <div className="desc">Hidden in base cost</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`health-banner ${health.tone}`}>
                  <div className="ico"><Icon name={health.icon} size={20} /></div>
                  <div className="meta">
                    <h4>{health.title}</h4>
                    <p>{health.desc}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </V2Shell>
  );
}

function labelFor(k: CostKey): string {
  switch (k) {
    case "ownLabor": return "Own Labor";
    case "subcontractor": return "Subcontractor";
    case "equipment": return "Equipment";
    case "permits": return "Permits";
    case "dumpster": return "Dumpster";
    case "misc": return "Miscellaneous";
    case "materials": return "Materials";
  }
}

function createEngineInput(
  settings: AppSettings,
  values: {
    trade: Trade;
    size: Size;
    risk: RiskLevel;
    materials: number;
    ownLabor: number;
    dumpster: number;
    permits: number;
    equipment: number;
    subcontractor: number;
    misc: number;
  }
): PricingEngineInput {
  const mappedTrade = mapTrade(values.trade);
  const mappedSize = mapSize(values.size);
  return {
    costs: {
      material: values.materials,
      labor: values.ownLabor,
      dumpster: values.dumpster,
      permits: values.permits,
      equipment: values.equipment,
      subcontractor: values.subcontractor,
      miscellaneous: values.misc,
    },
    businessCosts: {
      overheadPercent: settings.costRules.includeOverhead ? settings.costRules.defaultOverheadPercent : 0,
      overheadAllocationMethod: settings.costRules.includeOverhead ? settings.costRules.overheadAllocationMethod : "Ignore For Now",
      monthlyOverhead: settings.costRules.monthlyOverhead,
      flatOverheadPerProject: settings.costRules.flatOverheadPerProject,
      monthlyBillableDays: settings.costRules.monthlyBillableDays,
      projectDurationDays: settings.costRules.defaultProjectDurationDays,
      laborBurdenPercent: settings.costRules.laborBurdenPercent,
      minimumJobPrice: settings.costRules.minimumJobPrice,
      miscellaneousBufferPercent: settings.costRules.miscellaneousBufferPercent,
      permitBuffer: settings.costRules.permitBuffer,
      creditCardFeePercent: settings.costRules.creditCardFeePercent,
      financingFeePercent: settings.costRules.financingFeePercent,
      taxPercent: settings.costRules.taxPercent,
      includeCreditCardFee: settings.costRules.includeCreditCardFee,
      includeFinancingFee: settings.costRules.includeFinancingFee,
      includeTax: settings.costRules.includeTax,
      includeMiscellaneousBuffer: settings.costRules.includeMiscellaneousBuffer,
    },
    commission: {
      includeCommission: false,
      commissionType: "Percentage",
      commissionPercentage: 0,
      commissionFlatAmount: 0,
    },
    setup: {
      trade: mappedTrade,
      state: settings.marketLocation.defaultState,
      companyLevel: settings.companyProfile.companyLevel,
      projectSize: mappedSize,
      riskLevel: values.risk,
      strategy: settings.pricingDefaults.defaultStrategy,
    },
    pricingRules: {
      baseMargins: {
        Good: settings.pricingDefaults.goodMargin / 100,
        Better: settings.pricingDefaults.betterMargin / 100,
        Best: settings.pricingDefaults.bestMargin / 100,
      },
      minimumSafeMargin: settings.pricingDefaults.minimumSafeMargin / 100,
      stateAdjustments: Object.fromEntries(
        Object.entries(settings.marketLocation.stateAdjustments).map(([state, value]) => [state, (value ?? 0) / 100])
      ) as Partial<Record<ProjectState, number>>,
      tradeAdjustments: Object.fromEntries(
        Object.entries(settings.pricingDefaults.tradeAdjustments).map(([tradeKey, value]) => [tradeKey, value / 100])
      ) as Partial<Record<AppTrade, number>>,
      sizeAdjustments: Object.fromEntries(
        Object.entries(settings.pricingDefaults.sizeAdjustments).map(([sizeKey, value]) => [sizeKey, value / 100])
      ) as Partial<Record<ProjectSize, number>>,
      riskAdjustments: Object.fromEntries(
        Object.entries(settings.pricingDefaults.riskAdjustments).map(([riskKey, value]) => [riskKey, value / 100])
      ) as Partial<Record<RiskLevel, number>>,
      strategyAdjustments: Object.fromEntries(
        Object.entries(settings.pricingDefaults.strategyAdjustments).map(([strategyKey, value]) => [strategyKey, value / 100])
      ) as NonNullable<PricingEngineInput["pricingRules"]>["strategyAdjustments"],
      companyAdjustments: Object.fromEntries(
        Object.entries(settings.pricingDefaults.companyAdjustments).map(([companyKey, value]) => [companyKey, value / 100])
      ) as NonNullable<PricingEngineInput["pricingRules"]>["companyAdjustments"],
      thresholds: {
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
      },
    },
  };
}

function mapTrade(trade: Trade): AppTrade {
  if (trade === "Roofing" || trade === "Painting" || trade === "Remodeling") return trade;
  return "Remodeling";
}

function mapSize(size: Size): ProjectSize {
  if (size === "Small") return "Small";
  if (size === "Large" || size === "XL") return "Large";
  return "Medium";
}

function toPricingResult(
  option: PricingEngineOption,
  settings: AppSettings,
  name: PriceOptionName
): PricingResult {
  const descriptions = {
    Good: settings.proposalSettings.goodDescription,
    Better: settings.proposalSettings.betterDescription,
    Best: settings.proposalSettings.bestDescription,
  };
  return {
    name,
    salePrice: Math.round(option.salePrice),
    profit: Math.round(option.netProfit),
    margin: option.margin,
    markup: option.markup,
    description: descriptions[name],
    useCase: name === "Good" ? "Budget" : name === "Better" ? "Recommended" : "Premium",
    recommended: name === "Better",
  };
}
