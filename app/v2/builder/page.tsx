"use client";

import Link from "next/link";
import { useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";
import { fmt$ } from "../_shared/data";

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
  const [trade, setTrade] = useState<Trade>("Roofing");
  const [size, setSize] = useState<Size>("Medium");
  const [risk, setRisk] = useState<(typeof RISKS)[number]>("Medium");
  const [costs, setCosts] = useState<Costs>(EMPTY_COSTS);
  const [protOpen, setProtOpen] = useState(false);

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

  const laborBurden = ownLabor * 0.22;
  const miscBuffer = misc * 0.1;
  const taxOnBetter = 0;
  const overhead = directCost > 0 ? Math.round(directCost * 0.1) : 0;
  const permitBuffer = permits > 0 ? Math.round(permits * 0.05) : 0;
  const totalProt = Math.round(laborBurden + miscBuffer + taxOnBetter + overhead + permitBuffer);

  const baseCost = Math.round(directCost);
  const breakeven = Math.round(baseCost + overhead);
  const minMargin = 20;
  const minSafePrice = Math.round(breakeven / (1 - minMargin / 100));

  const gMargin = 30;
  const bMargin = 37;
  const bestMargin = 44;
  const protectedCost = baseCost + totalProt;
  const good = directCost > 0 ? Math.round(protectedCost / (1 - gMargin / 100)) : 0;
  const better = directCost > 0 ? Math.round(protectedCost / (1 - bMargin / 100)) : 0;
  const best = directCost > 0 ? Math.round(protectedCost / (1 - bestMargin / 100)) : 0;

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
            <Link href="/v2/proposals" className="back-btn" title="Back to proposals">
              <Icon name="chevron-l" size={16} />
            </Link>
            <div>
              <div className="id">DRAFT · P-1043</div>
              <h1>New proposal</h1>
              <div className="customer">
                <Icon name="users" size={12} />
                <span><b>Marisol Rivera</b> · Rivera &amp; Co. · Stamford, CT</span>
                <button style={{ background: "none", border: "none", color: "var(--gold-deep)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Change</button>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn ghost" title="Saved session history"><Icon name="clock" size={13} /></button>
            <button className="btn ghost">Save session</button>
            <button className="btn ghost">Business rules</button>
            <button className="btn dark"><Icon name="eye" size={13} /> Preview</button>
            <button className="btn primary" disabled={!hasData}><Icon name="check" size={13} /> Create Proposal</button>
          </div>
        </div>

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
