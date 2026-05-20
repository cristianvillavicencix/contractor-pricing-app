"use client";

import { useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";

type SectionId = "company" | "documents" | "pricing" | "proposals" | "products" | "app" | "data";

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: "company",   label: "Company Profile", icon: "building" },
  { id: "documents", label: "Documents",       icon: "shield" },
  { id: "pricing",   label: "Pricing",         icon: "dollar" },
  { id: "proposals", label: "Proposals",       icon: "send" },
  { id: "products",  label: "Products",        icon: "package" },
  { id: "app",       label: "App preferences", icon: "settings" },
  { id: "data",      label: "Data",            icon: "copy" },
];

export default function SettingsV2() {
  const [section, setSection] = useState<SectionId>("company");
  return (
    <V2Shell>
      <div className="settings-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Workspace</div>
            <h1 className="page-title">Settings</h1>
            <div className="page-sub">Configure your company, pricing, documents, and how proposals are sent.</div>
          </div>
        </div>

        <div className="settings-split">
          <div className="settings-nav">
            {SECTIONS.map((s) => (
              <button key={s.id} className={`settings-nav-item ${section === s.id ? "active" : ""}`} onClick={() => setSection(s.id)}>
                <span className="ico"><Icon name={s.icon} size={15} /></span>
                {s.label}
              </button>
            ))}
            <div className="settings-foot-note">
              <span className="saved-dot"></span>
              CHANGES SAVE AUTO
            </div>
          </div>

          <div className="settings-card">
            {section === "company"   && <CompanyProfile />}
            {section === "documents" && <DocumentsSection />}
            {section === "pricing"   && <PricingSection />}
            {section === "proposals" && <ProposalsTemplatesSection />}
            {section === "products"  && <ProductsSettingsSection />}
            {section === "app"       && <AppPrefsSection />}
            {section === "data"      && <DataSection />}
          </div>
        </div>
      </div>
    </V2Shell>
  );
}

function CompanyProfile() {
  return (
    <>
      <h2>Company Profile</h2>
      <p className="sub">Core company identity used across the app, proposals, PDFs, and the top profile menu.</p>

      <div className="logo-row">
        <div className="logo-slot">LOGO</div>
        <div className="logo-meta">
          <h3>Company logo</h3>
          <p>Click the box to upload or replace. Uploaded logos appear in proposals and your top profile menu. PNG or SVG recommended.</p>
        </div>
      </div>

      <div className="ss-divider">Identity</div>
      <div className="field-grid">
        <div className="ss-field"><label>Business name</label><input defaultValue="Latino Business Support" /><div className="hint">Appears on proposals, PDFs, and your top profile menu.</div></div>
        <div className="ss-field"><label>Contact name</label><input defaultValue="Cristian Villavicencio" /></div>
        <div className="ss-field"><label>Job title / role</label><input placeholder="Owner · Project Manager · Sales Consultant" /></div>
        <div className="ss-field"><label>Business email</label><input type="email" placeholder="you@yourbusiness.com" /></div>
        <div className="ss-field"><label>Business phone</label><input defaultValue="(475) 257-0243" /></div>
        <div className="ss-field"><label>Website</label><input defaultValue="https://www.lbs.bz/" /><div className="hint">Used for the top profile icon fallback when no logo is uploaded.</div></div>
      </div>

      <div className="ss-divider">Location</div>
      <div className="field-grid">
        <div className="ss-field full"><label>Business address</label><input defaultValue="1200 Summer St, Stamford, CT 06905" /></div>
        <div className="ss-field"><label>City</label><input placeholder="Stamford" /></div>
        <div className="ss-field"><label>State</label><select defaultValue="CT"><option>Connecticut</option><option>New York</option><option>Massachusetts</option></select></div>
        <div className="ss-field"><label>ZIP code</label><input placeholder="06905" /></div>
        <div className="ss-field"><label>Main trade</label><select><option>Roofing</option><option>Plumbing</option><option>HVAC</option><option>Electrical</option><option>General</option></select></div>
      </div>
    </>
  );
}

type DocItem = { id: number; name: string; status: "uploaded" | "missing"; enabled: boolean; attached: boolean };

function DocumentsSection() {
  const [docs, setDocs] = useState<DocItem[]>([
    { id: 1, name: "Licensed & Insured",              status: "missing",  enabled: true,  attached: false },
    { id: 2, name: "General Liability Insurance",     status: "uploaded", enabled: true,  attached: true  },
    { id: 3, name: "Workers' Compensation Insurance", status: "missing",  enabled: true,  attached: false },
    { id: 4, name: "State Contractor License",        status: "uploaded", enabled: true,  attached: true  },
    { id: 5, name: "EPA Lead-Safe Certification",     status: "missing",  enabled: false, attached: false },
  ]);
  const [newDoc, setNewDoc] = useState("");

  const toggle = (id: number) => setDocs((d) => d.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  const remove = (id: number) => setDocs((d) => d.filter((x) => x.id !== id));
  const add = () => {
    if (!newDoc.trim()) return;
    setDocs((d) => [...d, { id: Date.now(), name: newDoc.trim(), status: "missing", enabled: true, attached: false }]);
    setNewDoc("");
  };

  return (
    <>
      <h2>Documents</h2>
      <p className="sub">Store licenses, certifications, and insurance certificates used by your proposals. Enabled docs auto-attach to proposal PDFs.</p>

      <div className="docs-input-row">
        <input placeholder="Add document or certification name…" value={newDoc}
          onChange={(e) => setNewDoc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn primary" onClick={add}><Icon name="plus" size={14} /> Add document</button>
      </div>

      <div className="docs-table">
        <div className="docs-hdr">
          <span>Name</span>
          <span>Status</span>
          <span>Enabled</span>
          <span>Options</span>
        </div>
        {docs.map((d) => (
          <div key={d.id} className="docs-row">
            <div className="nm">{d.name}</div>
            <div className={`stat ${d.status}`}>
              {d.status === "uploaded" ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="check" size={13} /> Uploaded
                </span>
              ) : "Missing"}
            </div>
            <div><div className={`switch ${d.enabled ? "on" : ""}`} onClick={() => toggle(d.id)}></div></div>
            <div className="opts">
              <button className="upload" type="button">{d.attached ? "Replace" : "Upload"}</button>
              <button className="delete" onClick={() => remove(d.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div className="info-banner" style={{ marginTop: 18 }}>
        <b>Tip:</b> Enable &quot;Licensed &amp; Insured&quot; to display the badge on customer-facing proposals — even without an uploaded certificate.
      </div>
    </>
  );
}

function PricingSection() {
  const [tab, setTab] = useState<"margins" | "status" | "market" | "costs">("margins");
  return (
    <>
      <h2>Calculator pricing engine</h2>
      <p className="sub">
        All tabs below feed the <b style={{ color: "var(--ink)" }}>Calculator</b> and quote cost build-up. To change how the Calculator <i>screen</i> behaves (warnings, advanced breakdown), use{" "}
        <a>App Preferences</a>.
      </p>

      <div className="sub-tabs">
        <button className={`sub-tab ${tab === "margins" ? "active" : ""}`} onClick={() => setTab("margins")}>Margins &amp; tiers</button>
        <button className={`sub-tab ${tab === "status" ? "active" : ""}`} onClick={() => setTab("status")}>Status thresholds</button>
        <button className={`sub-tab ${tab === "market" ? "active" : ""}`} onClick={() => setTab("market")}>Market &amp; location</button>
        <button className={`sub-tab ${tab === "costs" ? "active" : ""}`} onClick={() => setTab("costs")}>Costs &amp; overhead</button>
      </div>

      {tab === "margins" && <PricingMargins />}
      {tab === "status" && <PricingPlaceholder title="Status thresholds" desc="Customize when proposals turn yellow (warning) and red (risk) based on margin, age, and customer behavior." />}
      {tab === "market" && <PricingPlaceholder title="Market & location" desc="Adjust pricing by region, market tier, and seasonality." />}
      {tab === "costs"  && <PricingPlaceholder title="Costs & overhead" desc="Monthly overhead, labor burden %, and per-trade cost rules." />}
    </>
  );
}

function PricingMargins() {
  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14, lineHeight: 1.5, fontStyle: "italic" }}>
        Base Good / Better / Best margins and automatic adjustments by trade, job size, risk, strategy, and company level.
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Pricing Defaults</h3>
      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 16px", lineHeight: 1.5 }}>
        Your starting margins for Good, Better, and Best pricing tiers. These pre-fill the Calculator — you can adjust them per job.
      </p>

      <div className="adj-grid c4">
        <div className="adj-cell"><label>Good Margin %</label><div className="inp"><input defaultValue="28" /></div><div className="unit">Budget-friendly</div></div>
        <div className="adj-cell"><label>Better Margin %</label><div className="inp"><input defaultValue="35" /></div><div className="unit">Most customers choose this</div></div>
        <div className="adj-cell"><label>Best Margin %</label><div className="inp"><input defaultValue="42" /></div><div className="unit">Premium tier</div></div>
        <div className="adj-cell"><label>Minimum Safe Margin %</label><div className="inp"><input defaultValue="20" /></div><div className="unit">Never price below this</div></div>
      </div>

      <AdjGrid title="Trade adjustments %" desc="Added to base margin per trade. Positive = more margin, negative = less." cols={6} items={[
        { label: "Roofing", value: "2" }, { label: "Siding", value: "1" }, { label: "Painting", value: "0" },
        { label: "Drywall", value: "-1" }, { label: "Gutters", value: "1" }, { label: "Remodeling", value: "3" },
      ]} />

      <AdjGrid title="Project size adjustments %" desc="Small jobs have high overhead per dollar; large jobs can afford slightly lower margins." cols={3} items={[
        { label: "Small", value: "5" }, { label: "Medium", value: "0" }, { label: "Large", value: "-4" },
      ]} />

      <AdjGrid title="Risk level adjustments %" desc="Extra margin buffer for riskier jobs." cols={3} items={[
        { label: "Low", value: "-1" }, { label: "Medium", value: "0" }, { label: "High", value: "5" },
      ]} />

      <AdjGrid title="Strategy adjustments %" desc="How aggressively you price this job." cols={3} items={[
        { label: "Competitive", value: "-2" }, { label: "Balanced", value: "0" }, { label: "Premium", value: "3" },
      ]} />

      <AdjGrid title="Company level adjustments %" desc="Established and premium companies command higher prices." cols={4} items={[
        { label: "Solo Owner", value: "-3" }, { label: "Small Crew", value: "0" }, { label: "Established Company", value: "3" }, { label: "Premium Company", value: "5" },
      ]} />

      <div className="edu-note">
        <div className="ico"><Icon name="sparkle" size={16} /></div>
        <div>
          <b>If you&apos;re new to margin-based pricing:</b> margin is NOT the same as markup. A <b>35% margin</b> on a $10,000 job = $3,500 kept after costs.
          A <b>35% markup</b> on $7,000 cost = $9,450 sale price = 26% margin. Always work in <b>margins</b>, not markups, to avoid underpricing.
        </div>
      </div>
    </>
  );
}

function AdjGrid({ title, desc, cols, items }: { title: string; desc: string; cols: 3 | 4 | 6; items: { label: string; value: string }[] }) {
  return (
    <div className="adj-section">
      <div className="adj-head">
        <div>
          <h3>{title}</h3>
          <div className="desc">{desc}</div>
        </div>
      </div>
      <div className={`adj-grid c${cols}`}>
        {items.map((it, i) => {
          const v = parseFloat(it.value);
          const cls = v > 0 ? "positive" : v < 0 ? "negative" : "";
          return (
            <div key={i} className="adj-cell">
              <label>{it.label}</label>
              <div className="inp"><input defaultValue={it.value} className={cls} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PricingPlaceholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--ink-3)", background: "var(--bg-tint)", borderRadius: 12, fontSize: 13 }}>
      <Icon name="dollar" size={28} />
      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>{title}</div>
      <div style={{ maxWidth: 340, margin: "6px auto 0" }}>{desc}</div>
    </div>
  );
}

function ProposalsTemplatesSection() {
  const [tab, setTab] = useState<"templates" | "content" | "defaults" | "logo">("templates");
  return (
    <>
      <h2>Client-facing documents — one hub</h2>
      <p className="sub">
        Use the tabs below for everything that shapes proposals. Your <a>Company Profile</a> (legal name, license, insurance, certifications) is separate
        because it&apos;s shared with pricing and compliance — but those fields still appear on proposals.
      </p>
      <div className="sub-tabs">
        <button className={`sub-tab ${tab === "templates" ? "active" : ""}`} onClick={() => setTab("templates")}>Templates</button>
        <button className={`sub-tab ${tab === "content" ? "active" : ""}`} onClick={() => setTab("content")}>Proposal content</button>
        <button className={`sub-tab ${tab === "defaults" ? "active" : ""}`} onClick={() => setTab("defaults")}>Defaults &amp; rules</button>
        <button className={`sub-tab ${tab === "logo" ? "active" : ""}`} onClick={() => setTab("logo")}>Logo &amp; layout</button>
      </div>
      {tab === "templates" && <TemplateGallery />}
      {tab === "content" && <PricingPlaceholder title="Proposal content" desc="Default cover note, payment terms, scope language, and acceptance text." />}
      {tab === "defaults" && <PricingPlaceholder title="Defaults & rules" desc="Expiration period, auto follow-ups, e-signature requirement, and approval rules." />}
      {tab === "logo" && <PricingPlaceholder title="Logo & layout" desc="PDF cover, color accent, header height, and footer content." />}
    </>
  );
}

function TemplateGallery() {
  const trades = [
    { id: "roofing",    name: "Roofing",            desc: "Professional Roofing Solutions — Licensed, Insured & Warranted" },
    { id: "siding",     name: "Siding",             desc: "Professional Siding Services — Licensed, Insured & Warranted" },
    { id: "painting",   name: "Painting",           desc: "Professional Painting Services — Licensed, Insured & Warranted" },
    { id: "drywall",    name: "Drywall",            desc: "Professional Drywall Services — Licensed, Insured & Warranted" },
    { id: "gutters",    name: "Gutters",            desc: "Professional Gutters Services — Licensed, Insured & Warranted" },
    { id: "remodeling", name: "Remodeling",         desc: "Professional Remodeling Services — Licensed, Insured & Warranted" },
    { id: "general",    name: "General Contractor", desc: "Professional General Contractor Services — Licensed, Insured & Warranted" },
  ];

  return (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Proposal Templates</h3>
      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Customize the 10-section proposal document for each trade. Click a card to edit, use the copy icon to duplicate any template under a new trade name,
        or add a blank template for a new service.
      </p>

      <div className="tpl-grid">
        {trades.map((t) => (
          <div key={t.id} className="tpl-card">
            <div className="tpl-preview">
              <div className="crown">PROPOSAL</div>
              <div className="trade">{t.name}</div>
              <div className="desc">{t.desc}</div>
              <div className="sep"></div>
              <div className="tpl-skel gold" style={{ width: "30%", height: 3 }}></div>
              <div className="tpl-section" style={{ marginTop: 14 }}>
                <div className="b1"></div><div className="b2"></div>
              </div>
              <div className="tpl-skel" style={{ width: "80%" }}></div>
              <div className="tpl-skel short"></div>
              <div className="tpl-progress-mock">
                {Array.from({ length: 10 }).map((_, i) => <div key={i} className="b"></div>)}
              </div>
              <div className="tpl-badge">10/10</div>
            </div>
            <div className="tpl-body">
              <div className="tpl-body-head">
                <div>
                  <div className="nm">{t.name}</div>
                  <div className="nm-sub">Default template</div>
                </div>
                <button className="copy-btn" title="Duplicate"><Icon name="copy" size={14} /></button>
              </div>
              <div className="tpl-progress">
                {Array.from({ length: 10 }).map((_, i) => <div key={i} className="seg"></div>)}
              </div>
              <div className="tpl-progress-label">10 of 10 sections active</div>
            </div>
          </div>
        ))}
        <button className="tpl-add">
          <div className="plus-circle"><Icon name="plus" size={20} /></div>
          <div className="name">New template</div>
          <div className="desc">Any trade or service</div>
        </button>
      </div>
    </>
  );
}

function ProductsSettingsSection() {
  const [show, setShow] = useState(false);
  const [auto, setAuto] = useState(true);
  return (
    <>
      <h2>Products settings</h2>
      <p className="sub">Default markups, units, and pricing rules for items in your catalog.</p>
      <div className="ss-divider">Default markups</div>
      <div className="field-grid">
        <div className="ss-field"><label>Materials markup %</label><input defaultValue="20" /><div className="hint">Default applied to new material products.</div></div>
        <div className="ss-field"><label>Labor markup %</label><input defaultValue="50" /><div className="hint">Default applied to labor line items.</div></div>
        <div className="ss-field"><label>Default unit</label><select defaultValue="each"><option value="each">Each</option><option>Square foot (sf)</option><option>Square (sq)</option><option>Linear foot (lf)</option><option>Hour</option></select></div>
        <div className="ss-field"><label>Default tier</label><select defaultValue="better"><option>Good</option><option>Better</option><option>Best</option></select></div>
      </div>
      <div className="ss-divider">Catalog behavior</div>
      <div className="toggle-row">
        <div><div className="ttl">Show inactive products</div><div className="sub2">Display archived items in the catalog browser (grayed out).</div></div>
        <div className={`switch ${show ? "on" : ""}`} onClick={() => setShow((s) => !s)}></div>
      </div>
      <div className="toggle-row">
        <div><div className="ttl">Auto-suggest based on trade</div><div className="sub2">When picking products in the Builder, surface items matching the current trade first.</div></div>
        <div className={`switch ${auto ? "on" : ""}`} onClick={() => setAuto((s) => !s)}></div>
      </div>
    </>
  );
}

function AppPrefsSection() {
  const [advBreakdown, setAdvBreakdown] = useState(true);
  const [warnings, setWarnings] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [layout, setLayout] = useState<"sidebar" | "topbar">("sidebar");
  const [density, setDensity] = useState<"compact" | "regular" | "comfy">("regular");
  const [accent, setAccent] = useState<"gold" | "blue" | "green" | "purple" | "rose">("gold");

  const accentColors = [
    { id: "gold",   hex: "#C9A227", name: "Gold" },
    { id: "blue",   hex: "#2A6FDB", name: "Blue" },
    { id: "green",  hex: "#2F7D52", name: "Green" },
    { id: "purple", hex: "#7A5AE0", name: "Purple" },
    { id: "rose",   hex: "#C24C3B", name: "Rose" },
  ] as const;

  return (
    <>
      <h2>App Preferences</h2>
      <p className="sub">Controls UI preferences for the dashboard and how the Calculator screen behaves. Margin numbers and cost rules live under <b style={{ color: "var(--ink)" }}>Pricing</b>.</p>
      <div className="info-banner">Defaults for <b>Good / Better / Best</b> margins, thresholds, and overhead are in <a>Pricing</a>.</div>
      <div className="ss-divider">Layout &amp; navigation</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <NavLayoutOption id="sidebar" label="Sidebar" desc="Vertical nav on the left. Best for desktop with room to spare."
          active={layout === "sidebar"} onClick={() => setLayout("sidebar")} />
        <NavLayoutOption id="topbar" label="Top bar" desc="Horizontal nav across the top. Best for narrower screens."
          active={layout === "topbar"} onClick={() => setLayout("topbar")} />
      </div>
      <div className="toggle-row">
        <div>
          <div className="ttl">Collapse sidebar by default</div>
          <div className="sub2">Show icons only. You can still toggle from the sidebar.</div>
        </div>
        <div className={`switch ${collapsed ? "on" : ""}`} onClick={() => setCollapsed((c) => !c)}></div>
      </div>
      <div className="ss-divider">Density</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {(["compact", "regular", "comfy"] as const).map((d) => (
          <button key={d} onClick={() => setDensity(d)}
            style={{ padding: "14px 12px", background: density === d ? "var(--gold-bg)" : "var(--surface)",
              border: "1.5px solid " + (density === d ? "var(--gold)" : "var(--line)"),
              borderRadius: 11, cursor: "pointer", transition: "all .15s", textAlign: "center", fontFamily: "inherit" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textTransform: "capitalize" }}>{d}</div>
            <DensityPreview density={d} />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".04em" }}>
              {d === "compact" ? "Tight spacing" : d === "regular" ? "Balanced" : "Roomy"}
            </div>
          </button>
        ))}
      </div>
      <div className="ss-divider">Theme &amp; color</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Theme</label>
          <select defaultValue="light">
            <option value="light">Light</option>
            <option value="dark">Dark (coming soon)</option>
            <option value="auto">Auto (system)</option>
          </select>
        </div>
        <div className="ss-field">
          <label>Accent color</label>
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            {accentColors.map((c) => (
              <button key={c.id} onClick={() => setAccent(c.id)} title={c.name}
                style={{ width: 34, height: 34, borderRadius: "50%", background: c.hex,
                  border: accent === c.id ? "3px solid var(--ink)" : "3px solid transparent",
                  outline: "2px solid var(--line)", outlineOffset: "-1px", cursor: "pointer",
                  transition: "transform .15s", padding: 0,
                  transform: accent === c.id ? "scale(1.1)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="ss-divider">Defaults</div>
      <div className="field-grid">
        <div className="ss-field"><label>Default landing page</label>
          <select defaultValue="dashboard">
            <option value="dashboard">Dashboard</option>
            <option value="proposals">Proposals</option>
            <option value="projects">Projects</option>
            <option value="builder">New proposal (Calculator)</option>
          </select>
        </div>
        <div className="ss-field"><label>Currency</label><select defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>MXN</option></select></div>
        <div className="ss-field"><label>Number format</label><select defaultValue="us"><option value="us">1,000.00</option><option>1.000,00</option><option>1 000.00</option></select></div>
        <div className="ss-field"><label>Date format</label><select defaultValue="us"><option value="us">MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></div>
      </div>
      <div className="ss-divider">Calculator behavior</div>
      <div className="toggle-row">
        <div><div className="ttl">Show advanced pricing breakdown</div><div className="sub2">Display cost protection details inside the Calculator by default.</div></div>
        <div className={`switch ${advBreakdown ? "on" : ""}`} onClick={() => setAdvBreakdown((c) => !c)}></div>
      </div>
      <div className="toggle-row">
        <div><div className="ttl">Show pricing warnings</div><div className="sub2">Surface &quot;Tight margin&quot; and &quot;Below floor&quot; warnings before saving a quote.</div></div>
        <div className={`switch ${warnings ? "on" : ""}`} onClick={() => setWarnings((c) => !c)}></div>
      </div>
      <div className="info-banner" style={{ marginTop: 18 }}>
        <b>Heads up:</b> Theme, density, accent, and number format apply as you change them. Default landing applies the next time you sign in.
      </div>
    </>
  );
}

function NavLayoutOption({ id, label, desc, active, onClick }: { id: string; label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ textAlign: "left", padding: 14, background: active ? "var(--gold-bg)" : "var(--surface)",
        border: "1.5px solid " + (active ? "var(--gold)" : "var(--line)"), borderRadius: 12,
        cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
        boxShadow: active ? "0 0 0 3px rgba(201,162,39,.14)" : "none" }}>
      <div style={{ aspectRatio: "2/1", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", marginBottom: 10, display: "flex" }}>
        {id === "sidebar" ? (
          <>
            <div style={{ width: "22%", background: "var(--ink)", display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px" }}>
              <div style={{ height: 6, background: "var(--gold)", borderRadius: 2, width: "80%" }}></div>
              <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2 }}></div>
              <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2 }}></div>
              <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2 }}></div>
            </div>
            <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ height: 5, background: "var(--bg-tint)", borderRadius: 2, width: "70%" }}></div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <div style={{ flex: 1, height: 14, background: "var(--bg-tint)", borderRadius: 3 }}></div>
                <div style={{ flex: 1, height: 14, background: "var(--bg-tint)", borderRadius: 3 }}></div>
                <div style={{ flex: 1, height: 14, background: "var(--gold-bg)", borderRadius: 3 }}></div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ height: "30%", background: "var(--ink)", display: "flex", alignItems: "center", gap: 4, padding: "0 6px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }}></div>
              <div style={{ display: "flex", gap: 3 }}>
                <div style={{ height: 3, width: 14, background: "rgba(255,255,255,.2)", borderRadius: 2 }}></div>
                <div style={{ height: 3, width: 14, background: "var(--gold)", borderRadius: 2 }}></div>
                <div style={{ height: 3, width: 14, background: "rgba(255,255,255,.2)", borderRadius: 2 }}></div>
              </div>
            </div>
            <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ height: 5, background: "var(--bg-tint)", borderRadius: 2, width: "70%" }}></div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <div style={{ flex: 1, height: 14, background: "var(--bg-tint)", borderRadius: 3 }}></div>
                <div style={{ flex: 1, height: 14, background: "var(--gold-bg)", borderRadius: 3 }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

function DensityPreview({ density }: { density: "compact" | "regular" | "comfy" }) {
  const gap = density === "compact" ? 2 : density === "regular" ? 4 : 7;
  const h = density === "compact" ? 5 : density === "regular" ? 7 : 9;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, padding: "10px 4px 4px" }}>
      <div style={{ height: h, background: "var(--ink-2)", borderRadius: 2, width: "80%", margin: "0 auto" }}></div>
      <div style={{ height: h, background: "var(--line)", borderRadius: 2, width: "100%" }}></div>
      <div style={{ height: h, background: "var(--line)", borderRadius: 2, width: "70%", margin: "0 auto" }}></div>
    </div>
  );
}

function DataSection() {
  return (
    <>
      <h2>Data</h2>
      <p className="sub">Download a copy of your company settings from this page, or run the setup wizard again. Your projects and quotes stay in your account in the cloud.</p>
      <div className="data-info">
        <div className="ico"><Icon name="shield" size={18} /></div>
        <div>
          <h4>Your company data</h4>
          <p>Projects, quotes, contacts, and settings are saved to your organization&apos;s account in the cloud. If you need a full database export or backups beyond this page, ask whoever manages your IT or the person who set up this app for you.</p>
        </div>
      </div>
      <div className="data-card">
        <h4><span className="ico-mini"><Icon name="copy" size={13} /></span> Export company settings</h4>
        <p>Downloads the current settings JSON from this page (not projects or quotes). For full database backups, use your database or hosting admin console.</p>
        <div className="actions"><button className="btn ghost"><Icon name="arrow-dn" size={13} /> Download settings JSON</button></div>
      </div>
      <div className="data-card">
        <h4><span className="ico-mini"><Icon name="settings" size={13} /></span> Reset settings</h4>
        <p>Restores the default company settings for this account. Use this only when you want to rebuild the setup.</p>
        <div className="actions"><button className="btn ghost" style={{ color: "var(--rose)" }}><Icon name="x" size={13} /> Reset settings</button></div>
      </div>
      <div className="data-card">
        <h4><span className="ico-mini" style={{ background: "var(--gold-bg)", color: "var(--gold-deep)" }}><Icon name="sparkle" size={13} /></span> Re-run setup wizard</h4>
        <p>Clears the onboarding flag and sends you through the wizard again. Changes are saved to your account when you finish.</p>
        <div className="actions"><a href="/v2/wizard" className="btn primary"><Icon name="arrow-r" size={13} /> Re-run onboarding</a></div>
      </div>
    </>
  );
}
