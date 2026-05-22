"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  defaultSettings,
  mergeAppSettings,
  settingsTradeOptions,
  stateOptions,
  tradeOptions,
  companyLevelOptions,
  projectSizeOptions,
  riskLevelOptions,
  strategyOptions,
  type AppSettings,
  type Trade,
  type CompanyLevel,
  type ProjectSize,
  type RiskLevel,
  type Strategy,
} from "@/lib/app-data";
import { applyAppPreferencesVisuals } from "@/lib/app-preferences-live";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveCompanySettings, listProposalTemplates, upsertProposalTemplate } from "@/lib/supabase/data";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import {
  PROPOSAL_SECTIONS,
  defaultProposalTemplates,
  mergeProposalTemplates,
  blankTemplate,
  type ProposalTemplate,
} from "@/lib/proposal-templates";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";
import { useV2LiveData } from "../_shared/live-data";

type SectionId = "company" | "documents" | "pricing" | "proposals" | "products" | "app" | "security" | "data";

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
  { id: "company",   label: "Company Profile", icon: "building" },
  { id: "documents", label: "Documents",       icon: "shield" },
  { id: "pricing",   label: "Pricing",         icon: "dollar" },
  { id: "proposals", label: "Proposals",       icon: "send" },
  { id: "products",  label: "Products",        icon: "package" },
  { id: "app",       label: "App preferences", icon: "settings" },
  { id: "security",  label: "Security",        icon: "lock" },
  { id: "data",      label: "Data",            icon: "copy" },
];

export default function SettingsV2() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { settings: liveSettings, refetch } = useV2LiveData();
  const [section, setSection] = useState<SectionId>("company");
  const [settings, setSettings] = useState<AppSettings>(() => mergeAppSettings(liveSettings));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);

  useEffect(() => {
    const merged = mergeAppSettings(liveSettings);
    if (!merged.companyProfile.email) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setSettings((current) => ({
            ...mergeAppSettings(liveSettings),
            companyProfile: { ...mergeAppSettings(liveSettings).companyProfile, email: data.user!.email! },
          }));
        } else {
          setSettings(merged);
        }
      });
    } else {
      setSettings(merged);
    }
  }, [liveSettings, supabase]);

  function patchSettings(patch: (current: AppSettings) => AppSettings) {
    setSettings((current) => mergeAppSettings(patch(current)));
    setSaveStatus("idle");
  }

  async function saveSettings() {
    setSaveStatus("saving");
    try {
      await saveCompanySettings(supabase, settings);
      setSaveStatus("saved");
      refetch();
    } catch {
      setSaveStatus("error");
    }
  }

  async function resetSettings() {
    const fresh = mergeAppSettings(defaultSettings);
    setSettings(fresh);
    setSaveStatus("saving");
    try {
      await saveCompanySettings(supabase, fresh);
      setSaveStatus("saved");
      refetch();
    } catch {
      setSaveStatus("error");
    }
  }

  if (editingTemplate) {
    return (
      <V2Shell fullBleedContent>
        <TemplateEditor
          template={editingTemplate}
          supabase={supabase}
          onClose={() => setEditingTemplate(null)}
          onSave={() => setEditingTemplate(null)}
        />
      </V2Shell>
    );
  }

  return (
    <V2Shell>
      <div className="settings-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Workspace</div>
            <h1 className="page-title">Settings</h1>
            <div className="page-sub">Configure your company, pricing, documents, and how proposals are sent.</div>
          </div>
          <button className="btn primary" onClick={saveSettings} disabled={saveStatus === "saving"}>
            <Icon name="check" size={14} /> {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save changes"}
          </button>
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
              {saveStatus === "error" ? "SAVE FAILED" : saveStatus === "saved" ? "SAVED TO CLOUD" : "READY TO SAVE"}
            </div>
          </div>

          <div className="settings-card">
            {section === "company"   && <CompanyProfile settings={settings} patchSettings={patchSettings} />}
            {section === "documents" && <DocumentsSection settings={settings} patchSettings={patchSettings} />}
            {section === "pricing"   && <PricingSection settings={settings} patchSettings={patchSettings} />}
            {section === "proposals" && <ProposalsTemplatesSection settings={settings} patchSettings={patchSettings} onEditTemplate={setEditingTemplate} />}
            {section === "products"  && <ProductsSettingsSection settings={settings} patchSettings={patchSettings} />}
            {section === "app"       && <AppPrefsSection settings={settings} patchSettings={patchSettings} />}
            {section === "security"  && <SecuritySection supabase={supabase} />}
            {section === "data"      && <DataSection settings={settings} onReset={resetSettings} />}
          </div>
        </div>
      </div>
    </V2Shell>
  );
}

function CompanyProfile({
  settings,
  patchSettings,
}: {
  settings: AppSettings;
  patchSettings: (patch: (current: AppSettings) => AppSettings) => void;
}) {
  const company = settings.companyProfile;
  const updateCompany = (patch: Partial<AppSettings["companyProfile"]>) =>
    patchSettings((current) => ({
      ...current,
      companyProfile: { ...current.companyProfile, ...patch },
    }));
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
        <div className="ss-field"><label>Business name</label><input value={company.businessName} onChange={(e) => updateCompany({ businessName: e.target.value })} /><div className="hint">Appears on proposals, PDFs, and your top profile menu.</div></div>
        <div className="ss-field"><label>Contact name</label><input value={company.contactName} onChange={(e) => updateCompany({ contactName: e.target.value })} /></div>
        <div className="ss-field"><label>Job title / role</label><input value={company.contactJobTitle} onChange={(e) => updateCompany({ contactJobTitle: e.target.value })} placeholder="Owner · Project Manager · Sales Consultant" /></div>
        <div className="ss-field"><label>Business email</label><input type="email" value={company.email} onChange={(e) => updateCompany({ email: e.target.value })} placeholder="you@yourbusiness.com" /></div>
        <div className="ss-field"><label>Business phone</label><input value={company.phone} onChange={(e) => updateCompany({ phone: e.target.value })} /></div>
        <div className="ss-field"><label>Website</label><input value={company.website} onChange={(e) => updateCompany({ website: e.target.value })} /><div className="hint">Used for the top profile icon fallback when no logo is uploaded.</div></div>
      </div>

      <div className="ss-divider">Location</div>
      <div className="field-grid">
        <div className="ss-field full"><label>Business address</label><input value={company.address} onChange={(e) => updateCompany({ address: e.target.value })} /></div>
        <div className="ss-field"><label>City</label><input value={company.city} onChange={(e) => updateCompany({ city: e.target.value })} placeholder="Stamford" /></div>
        <div className="ss-field"><label>State</label><select value={company.state} onChange={(e) => updateCompany({ state: e.target.value as AppSettings["companyProfile"]["state"] })}>{stateOptions.map((state) => <option key={state}>{state}</option>)}</select></div>
        <div className="ss-field"><label>ZIP code</label><input value={company.zipCode} onChange={(e) => updateCompany({ zipCode: e.target.value })} placeholder="06905" /></div>
        <div className="ss-field"><label>Main trade</label><select value={company.mainTrade} onChange={(e) => updateCompany({ mainTrade: e.target.value as AppSettings["companyProfile"]["mainTrade"] })}>{settingsTradeOptions.map((trade) => <option key={trade}>{trade}</option>)}</select></div>
      </div>
    </>
  );
}

function DocumentsSection({ settings, patchSettings }: SP) {
  const certs = settings.companyProfile.certifications ?? [];
  const [uploading, setUploading] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const fileAddRef = useRef<HTMLInputElement | null>(null);

  function updCerts(next: AppSettings["companyProfile"]["certifications"]) {
    patchSettings((c) => ({ ...c, companyProfile: { ...c.companyProfile, certifications: next } }));
  }

  function readFile(file: File, id: string) {
    setUploading(id);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updCerts(certs.map((c) =>
        c.id === id
          ? { ...c, name: nameWithoutExt, documentName: file.name, documentType: file.type, documentDataUrl: dataUrl, uploadedAt: new Date().toISOString() }
          : c
      ));
      setUploading(null);
    };
    reader.onerror = () => setUploading(null);
    reader.readAsDataURL(file);
  }

  function handleAddFile(file: File) {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const id = crypto.randomUUID();
    setUploading(id);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updCerts([...certs, { id, name: nameWithoutExt, enabled: true, documentName: file.name, documentType: file.type, documentDataUrl: dataUrl, uploadedAt: new Date().toISOString() }]);
      setUploading(null);
    };
    reader.onerror = () => setUploading(null);
    reader.readAsDataURL(file);
  }

  function toggle(id: string) {
    updCerts(certs.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c));
  }

  function remove(id: string) {
    updCerts(certs.filter((c) => c.id !== id));
  }

  function removeFile(id: string) {
    updCerts(certs.map((c) => c.id === id ? { ...c, documentName: undefined, documentType: undefined, documentDataUrl: undefined, uploadedAt: undefined } : c));
  }

  function startRename(id: string, current: string) {
    setRenamingId(id);
    setRenameVal(current);
  }

  function commitRename(id: string) {
    if (renameVal.trim()) updCerts(certs.map((c) => c.id === id ? { ...c, name: renameVal.trim() } : c));
    setRenamingId(null);
  }

  return (
    <>
      <h2>Documents</h2>
      <p className="sub">
        Licencias, certificaciones y seguros que aparecen en tus propuestas.
        Los items activados con archivo se adjuntan automáticamente al PDF.
        Los cambios se guardan al hacer clic en <b>Save changes</b>.
      </p>

      {/* Hidden file input for Add */}
      <input
        ref={fileAddRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.svg"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAddFile(f); e.target.value = ""; }}
      />

      <div className="docs-input-row" style={{ marginBottom: 16 }}>
        <button className="btn primary" onClick={() => fileAddRef.current?.click()}>
          <Icon name="plus" size={14} /> Add document
        </button>
        {uploading && !certs.find((c) => c.id === uploading) && (
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Reading file…</span>
        )}
      </div>

      <div className="docs-table">
        <div className="docs-hdr">
          <span>Name</span>
          <span>Enabled</span>
          <span>Actions</span>
        </div>
        {certs.length === 0 && (
          <div style={{ padding: "20px 0", color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
            No hay documentos. Haz clic en Add document para subir el primero.
          </div>
        )}
        {certs.map((doc) => {
          const hasFile = Boolean(doc.documentDataUrl);
          const isRenaming = renamingId === doc.id;
          const iconBtn: React.CSSProperties = {
            background: "none", border: "none", cursor: "pointer", padding: "5px 6px",
            color: "var(--ink-3)", display: "flex", alignItems: "center", borderRadius: 6,
          };
          return (
            <div key={doc.id} className="docs-row">
              {/* Name / rename */}
              <div className="nm">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => commitRename(doc.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") commitRename(doc.id); if (e.key === "Escape") setRenamingId(null); }}
                    style={{ width: "100%", border: "1px solid var(--gold)", borderRadius: 6, padding: "3px 7px", fontSize: 13, fontFamily: "inherit", background: "var(--bg-tint)", outline: "none" }}
                  />
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {hasFile && <Icon name="check" size={13} />}
                    {doc.name}
                  </span>
                )}
              </div>

              {/* Toggle */}
              <div>
                <div className={`switch ${doc.enabled ? "on" : ""}`} onClick={() => toggle(doc.id)} />
              </div>

              {/* Inline icon action bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                {/* Upload / Replace */}
                <label title={hasFile ? "Replace file" : "Upload file"} style={{ ...iconBtn, cursor: "pointer" }}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.svg"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, doc.id); e.target.value = ""; }}
                  />
                  {uploading === doc.id
                    ? <span style={{ fontSize: 10, color: "var(--ink-3)" }}>…</span>
                    : <Icon name={hasFile ? "image" : "plus"} size={15} />}
                </label>

                {/* Rename */}
                <button title="Rename" style={iconBtn} onClick={() => startRename(doc.id, doc.name)}>
                  <Icon name="edit" size={15} />
                </button>

                {/* Download */}
                {hasFile && (
                  <a title="Download" href={doc.documentDataUrl} download={doc.documentName}
                    style={{ ...iconBtn, textDecoration: "none" }}>
                    <Icon name="arrow-dn" size={15} />
                  </a>
                )}

                {/* Delete row */}
                <button title="Delete document" style={{ ...iconBtn, color: "var(--rose)" }} onClick={() => remove(doc.id)}>
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="info-banner" style={{ marginTop: 18 }}>
        <b>Tip:</b> Puedes activar &quot;Licensed &amp; Insured&quot; sin subir archivo — el badge igual aparece en las propuestas. Sube el certificado real para adjuntarlo como página en el PDF.
      </div>
    </>
  );
}

function PricingSection({
  settings,
  patchSettings,
}: {
  settings: AppSettings;
  patchSettings: (patch: (current: AppSettings) => AppSettings) => void;
}) {
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

      {tab === "margins" && <PricingMargins settings={settings} patchSettings={patchSettings} />}
      {tab === "status" && <PricingThresholds settings={settings} patchSettings={patchSettings} />}
      {tab === "market" && <PricingMarketLocation settings={settings} patchSettings={patchSettings} />}
      {tab === "costs"  && <PricingCostsOverhead settings={settings} patchSettings={patchSettings} />}
    </>
  );
}

function PricingMargins({
  settings,
  patchSettings,
}: {
  settings: AppSettings;
  patchSettings: (patch: (current: AppSettings) => AppSettings) => void;
}) {
  const pricing = settings.pricingDefaults;
  const updatePricing = (patch: Partial<AppSettings["pricingDefaults"]>) =>
    patchSettings((current) => ({
      ...current,
      pricingDefaults: { ...current.pricingDefaults, ...patch },
    }));
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
        <div className="adj-cell"><label>Good Margin %</label><div className="inp"><input value={pricing.goodMargin} onChange={(e) => updatePricing({ goodMargin: Number(e.target.value) })} /></div><div className="unit">Budget-friendly</div></div>
        <div className="adj-cell"><label>Better Margin %</label><div className="inp"><input value={pricing.betterMargin} onChange={(e) => updatePricing({ betterMargin: Number(e.target.value) })} /></div><div className="unit">Most customers choose this</div></div>
        <div className="adj-cell"><label>Best Margin %</label><div className="inp"><input value={pricing.bestMargin} onChange={(e) => updatePricing({ bestMargin: Number(e.target.value) })} /></div><div className="unit">Premium tier</div></div>
        <div className="adj-cell"><label>Minimum Safe Margin %</label><div className="inp"><input value={pricing.minimumSafeMargin} onChange={(e) => updatePricing({ minimumSafeMargin: Number(e.target.value) })} /></div><div className="unit">Never price below this</div></div>
      </div>

      <AdjGrid
        title="Trade adjustments %"
        desc="Added to base margin per trade. Positive = more margin, negative = less."
        cols={6}
        items={tradeOptions.map((t) => ({ label: t, value: pricing.tradeAdjustments[t] }))}
        onChange={(label, val) => updatePricing({ tradeAdjustments: { ...pricing.tradeAdjustments, [label as Trade]: val } })}
      />

      <AdjGrid
        title="Project size adjustments %"
        desc="Small jobs have high overhead per dollar; large jobs can afford slightly lower margins."
        cols={3}
        items={projectSizeOptions.map((s) => ({ label: s, value: pricing.sizeAdjustments[s] }))}
        onChange={(label, val) => updatePricing({ sizeAdjustments: { ...pricing.sizeAdjustments, [label as ProjectSize]: val } })}
      />

      <AdjGrid
        title="Risk level adjustments %"
        desc="Extra margin buffer for riskier jobs."
        cols={3}
        items={riskLevelOptions.map((r) => ({ label: r, value: pricing.riskAdjustments[r] }))}
        onChange={(label, val) => updatePricing({ riskAdjustments: { ...pricing.riskAdjustments, [label as RiskLevel]: val } })}
      />

      <AdjGrid
        title="Strategy adjustments %"
        desc="How aggressively you price this job."
        cols={3}
        items={strategyOptions.map((s) => ({ label: s, value: pricing.strategyAdjustments[s] }))}
        onChange={(label, val) => updatePricing({ strategyAdjustments: { ...pricing.strategyAdjustments, [label as Strategy]: val } })}
      />

      <AdjGrid
        title="Company level adjustments %"
        desc="Established and premium companies command higher prices."
        cols={4}
        items={companyLevelOptions.map((c) => ({ label: c, value: pricing.companyAdjustments[c] }))}
        onChange={(label, val) => updatePricing({ companyAdjustments: { ...pricing.companyAdjustments, [label as CompanyLevel]: val } })}
      />

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

function AdjGrid({ title, desc, cols, items, onChange }: {
  title: string; desc: string; cols: 3 | 4 | 6;
  items: { label: string; value: number }[];
  onChange: (label: string, value: number) => void;
}) {
  return (
    <div className="adj-section">
      <div className="adj-head">
        <div><h3>{title}</h3><div className="desc">{desc}</div></div>
      </div>
      <div className={`adj-grid c${cols}`}>
        {items.map((it) => {
          const cls = it.value > 0 ? "positive" : it.value < 0 ? "negative" : "";
          return (
            <div key={it.label} className="adj-cell">
              <label>{it.label}</label>
              <div className="inp">
                <input
                  type="number"
                  value={it.value}
                  className={cls}
                  onChange={(e) => onChange(it.label, Number(e.target.value))}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SP = {
  settings: AppSettings;
  patchSettings: (patch: (current: AppSettings) => AppSettings) => void;
};

function patchCostRules(patch: Partial<AppSettings["costRules"]>): (current: AppSettings) => AppSettings {
  return (current) => ({ ...current, costRules: { ...current.costRules, ...patch } });
}
function patchMarket(patch: Partial<AppSettings["marketLocation"]>): (current: AppSettings) => AppSettings {
  return (current) => ({ ...current, marketLocation: { ...current.marketLocation, ...patch } });
}
function patchThresholds(patch: Partial<AppSettings["pricingThresholds"]>): (current: AppSettings) => AppSettings {
  return (current) => ({ ...current, pricingThresholds: { ...current.pricingThresholds, ...patch } });
}
function patchProposal(patch: Partial<AppSettings["proposalSettings"]>): (current: AppSettings) => AppSettings {
  return (current) => ({ ...current, proposalSettings: { ...current.proposalSettings, ...patch } });
}

// ── Pricing > Costs & overhead ────────────────────────────────────────────────
function PricingCostsOverhead({ settings, patchSettings }: SP) {
  const c = settings.costRules;
  const upd = (patch: Partial<AppSettings["costRules"]>) => patchSettings(patchCostRules(patch));
  const [newLabel, setNewLabel] = useState("");

  function addLine() {
    if (!newLabel.trim()) return;
    upd({ overheadLineItems: [...(c.overheadLineItems ?? []), { id: crypto.randomUUID(), label: newLabel.trim(), amount: 0 }] });
    setNewLabel("");
  }
  function updateLine(id: string, patch: Partial<{ label: string; amount: number }>) {
    upd({ overheadLineItems: c.overheadLineItems.map((l) => l.id === id ? { ...l, ...patch } : l) });
  }
  function removeLine(id: string) {
    upd({ overheadLineItems: c.overheadLineItems.filter((l) => l.id !== id) });
  }

  return (
    <>
      <h2>Costs &amp; overhead</h2>
      <p className="sub">These numbers feed directly into the pricing calculator to protect your margins.</p>

      <div className="ss-divider">Monthly overhead</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Total monthly overhead ($)</label>
          <input type="number" value={c.monthlyOverhead} onChange={(e) => upd({ monthlyOverhead: Number(e.target.value) || 0 })} />
          <div className="hint">Rent, insurance, vehicles, software — everything you pay monthly to stay in business.</div>
        </div>
        <div className="ss-field">
          <label>Default overhead %</label>
          <input type="number" value={c.defaultOverheadPercent} onChange={(e) => upd({ defaultOverheadPercent: Number(e.target.value) || 0 })} />
          <div className="hint">Applied to job cost when allocation method is Percentage.</div>
        </div>
        <div className="ss-field">
          <label>Overhead allocation</label>
          <select value={c.overheadAllocationMethod} onChange={(e) => upd({ overheadAllocationMethod: e.target.value as AppSettings["costRules"]["overheadAllocationMethod"] })}>
            <option value="Percentage">Percentage of job cost</option>
            <option value="Flat Per Project">Flat amount per project</option>
            <option value="Project Duration">By project duration</option>
            <option value="Ignore For Now">Ignore for now</option>
          </select>
        </div>
        <div className="ss-field">
          <label>Flat overhead per project ($)</label>
          <input type="number" value={c.flatOverheadPerProject} onChange={(e) => upd({ flatOverheadPerProject: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Monthly billable days</label>
          <input type="number" value={c.monthlyBillableDays} onChange={(e) => upd({ monthlyBillableDays: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Default project duration (days)</label>
          <input type="number" value={c.defaultProjectDurationDays} onChange={(e) => upd({ defaultProjectDurationDays: Number(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="ss-divider">Overhead breakdown (optional)</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 12px" }}>
        Break down your monthly overhead by category. The sum should equal your total above.
      </p>
      {(c.overheadLineItems ?? []).map((line) => (
        <div key={line.id} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
          <input
            value={line.label}
            onChange={(e) => updateLine(line.id, { label: e.target.value })}
            placeholder="Category"
            style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--bg-tint)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px" }}>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>$</span>
            <input
              type="number"
              value={line.amount}
              onChange={(e) => updateLine(line.id, { amount: Number(e.target.value) || 0 })}
              style={{ width: 80, border: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <button onClick={() => removeLine(line.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLine()}
          placeholder="Add category (e.g. Rent, Insurance, Vehicles…)"
          style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}
        />
        <button className="btn ghost" onClick={addLine}><Icon name="plus" size={13} /> Add</button>
      </div>

      <div className="ss-divider">Labor &amp; fees</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Labor burden %</label>
          <input type="number" value={c.laborBurdenPercent} onChange={(e) => upd({ laborBurdenPercent: Number(e.target.value) || 0 })} />
          <div className="hint">Payroll taxes, workers comp, benefits added on top of hourly labor.</div>
        </div>
        <div className="ss-field">
          <label>Minimum job price ($)</label>
          <input type="number" value={c.minimumJobPrice} onChange={(e) => upd({ minimumJobPrice: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Financing fee %</label>
          <input type="number" value={c.financingFeePercent} onChange={(e) => upd({ financingFeePercent: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Credit card fee %</label>
          <input type="number" value={c.creditCardFeePercent} onChange={(e) => upd({ creditCardFeePercent: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Tax %</label>
          <input type="number" value={c.taxPercent} onChange={(e) => upd({ taxPercent: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Permit buffer %</label>
          <input type="number" value={c.permitBuffer} onChange={(e) => upd({ permitBuffer: Number(e.target.value) || 0 })} />
        </div>
        <div className="ss-field">
          <label>Miscellaneous buffer %</label>
          <input type="number" value={c.miscellaneousBufferPercent} onChange={(e) => upd({ miscellaneousBufferPercent: Number(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="ss-divider">Include in calculations</div>
      {([
        ["includeOverhead", "Include overhead"],
        ["includeFinancingFee", "Include financing fee"],
        ["includeCreditCardFee", "Include credit card fee"],
        ["includeTax", "Include tax"],
        ["includeMiscellaneousBuffer", "Include miscellaneous buffer"],
      ] as const).map(([key, label]) => (
        <div key={key} className="toggle-row">
          <div><div className="ttl">{label}</div></div>
          <div className={`switch ${c[key] ? "on" : ""}`} onClick={() => upd({ [key]: !c[key] })}></div>
        </div>
      ))}
    </>
  );
}

// ── Pricing > Market & location ───────────────────────────────────────────────
function PricingMarketLocation({ settings, patchSettings }: SP) {
  const m = settings.marketLocation;
  const upd = (patch: Partial<AppSettings["marketLocation"]>) => patchSettings(patchMarket(patch));
  return (
    <>
      <h2>Market &amp; location</h2>
      <p className="sub">Default job location and market conditions used by the pricing calculator and proposals.</p>
      <div className="ss-divider">Default location</div>
      <div className="field-grid">
        <div className="ss-field"><label>Default city</label><input value={m.defaultCity} onChange={(e) => upd({ defaultCity: e.target.value })} placeholder="Stamford" /></div>
        <div className="ss-field"><label>Default state</label>
          <select value={m.defaultState} onChange={(e) => upd({ defaultState: e.target.value as AppSettings["marketLocation"]["defaultState"] })}>
            {stateOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="ss-field"><label>Default ZIP</label><input value={m.defaultZipCode} onChange={(e) => upd({ defaultZipCode: e.target.value })} placeholder="06905" /></div>
      </div>
      <div className="ss-divider">Market conditions</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Market competitiveness</label>
          <select value={m.marketCompetitiveness} onChange={(e) => upd({ marketCompetitiveness: e.target.value as AppSettings["marketLocation"]["marketCompetitiveness"] })}>
            <option value="Low">Low — few competitors</option>
            <option value="Medium">Medium — average market</option>
            <option value="High">High — crowded market</option>
          </select>
          <div className="hint">Affects the pricing adjustment applied to quotes.</div>
        </div>
        <div className="ss-field">
          <label>Customer price sensitivity</label>
          <select value={m.customerPriceSensitivity} onChange={(e) => upd({ customerPriceSensitivity: e.target.value as AppSettings["marketLocation"]["customerPriceSensitivity"] })}>
            <option value="Low">Low — price isn&apos;t their main concern</option>
            <option value="Medium">Medium — balanced</option>
            <option value="High">High — very price-conscious</option>
          </select>
        </div>
        <div className="ss-field full">
          <label>Service area notes</label>
          <input value={m.serviceAreaNotes} onChange={(e) => upd({ serviceAreaNotes: e.target.value })} placeholder="e.g. Fairfield County, CT + Westchester NY" />
        </div>
      </div>
    </>
  );
}

// ── Pricing > Status thresholds ───────────────────────────────────────────────
function PricingThresholds({ settings, patchSettings }: SP) {
  const t = settings.pricingThresholds;
  const upd = (patch: Partial<AppSettings["pricingThresholds"]>) => patchSettings(patchThresholds(patch));
  const numField = (label: string, key: keyof AppSettings["pricingThresholds"], hint?: string) => (
    <div className="ss-field">
      <label>{label}</label>
      <input type="number" value={t[key]} onChange={(e) => upd({ [key]: Number(e.target.value) || 0 })} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
  return (
    <>
      <h2>Status thresholds</h2>
      <p className="sub">Control when the calculator surfaces warnings and how margins are clamped. These protect you from underpricing.</p>
      <div className="ss-divider">Margin warnings</div>
      <div className="field-grid">
        {numField("Risky margin %", "riskyMarginPercent", "Calculator shows a red alert below this margin.")}
        {numField("Tight margin %", "tightMarginPercent", "Calculator shows a yellow warning below this margin.")}
        {numField("Safe price cushion %", "safePriceCushionPercent")}
        {numField("Warning: low margin %", "warningMarginLowPercent")}
        {numField("Warning: high margin %", "warningMarginHighPercent")}
      </div>
      <div className="ss-divider">Margin clamps</div>
      <div className="field-grid">
        {numField("Minimum margin %", "marginClampMinPercent", "The floor — calculator never goes below this.")}
        {numField("Maximum margin %", "marginClampMaxPercent", "The ceiling — prevents accidental over-pricing.")}
        {numField("Safe margin risk bonus %", "safeMarginRiskBonusPercent")}
        {numField("Safe margin small bonus %", "safeMarginSmallBonusPercent")}
      </div>
      <div className="ss-divider">Fee warnings</div>
      <div className="field-grid">
        {numField("Warning: commission %", "warningCommissionPercent")}
        {numField("Warning: fee profit %", "warningFeeProfitPercent")}
      </div>
    </>
  );
}

function ProposalsTemplatesSection({
  settings,
  patchSettings,
  onEditTemplate,
}: SP & { onEditTemplate: (template: ProposalTemplate) => void }) {
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
      {tab === "templates" && <TemplateGallery onEditTemplate={onEditTemplate} />}
      {tab === "content"   && <ProposalContentTab settings={settings} patchSettings={patchSettings} />}
      {tab === "defaults"  && <ProposalDefaultsTab settings={settings} patchSettings={patchSettings} />}
      {tab === "logo"      && <ProposalLogoTab settings={settings} patchSettings={patchSettings} />}
    </>
  );
}

// ── Proposals > Content tab ───────────────────────────────────────────────────
function ProposalContentTab({ settings, patchSettings }: SP) {
  const p = settings.proposalSettings;
  const upd = (patch: Partial<AppSettings["proposalSettings"]>) => patchSettings(patchProposal(patch));
  const [newService, setNewService] = useState("");

  function addService() {
    if (!newService.trim()) return;
    upd({ defaultIncludedServices: [...(p.defaultIncludedServices ?? []), newService.trim()] });
    setNewService("");
  }
  function removeService(idx: number) {
    upd({ defaultIncludedServices: p.defaultIncludedServices.filter((_, i) => i !== idx) });
  }

  return (
    <>
      <h2>Proposal content</h2>
      <p className="sub">Default text, tier labels, and included-services list that pre-fill every new proposal.</p>

      <div className="ss-divider">Legal &amp; warranty text</div>
      <div className="field-grid">
        <div className="ss-field full">
          <label>Default warranty text</label>
          <textarea rows={3} value={p.defaultWarrantyText}
            onChange={(e) => upd({ defaultWarrantyText: e.target.value })}
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "9px 11px", width: "100%", boxSizing: "border-box" }} />
          <div className="hint">Shown in the warranty section of every proposal PDF.</div>
        </div>
        <div className="ss-field full">
          <label>Default terms &amp; conditions</label>
          <textarea rows={4} value={p.defaultTerms}
            onChange={(e) => upd({ defaultTerms: e.target.value })}
            style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "9px 11px", width: "100%", boxSizing: "border-box" }} />
          <div className="hint">Displayed above the signature block. Be specific about payment, scope, and change orders.</div>
        </div>
      </div>

      <div className="ss-divider">Tier labels &amp; descriptions</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Good tier label</label>
          <input value={p.goodTierLabel} onChange={(e) => upd({ goodTierLabel: e.target.value })} placeholder="Good" />
          <div className="hint">What customers see for your entry-level option.</div>
        </div>
        <div className="ss-field">
          <label>Better tier label</label>
          <input value={p.betterTierLabel} onChange={(e) => upd({ betterTierLabel: e.target.value })} placeholder="Better" />
        </div>
        <div className="ss-field">
          <label>Best tier label</label>
          <input value={p.bestTierLabel} onChange={(e) => upd({ bestTierLabel: e.target.value })} placeholder="Best" />
        </div>
        <div className="ss-field full">
          <label>Good tier description</label>
          <input value={p.goodDescription} onChange={(e) => upd({ goodDescription: e.target.value })} placeholder="Quality materials, reliable work, solid value." />
        </div>
        <div className="ss-field full">
          <label>Better tier description</label>
          <input value={p.betterDescription} onChange={(e) => upd({ betterDescription: e.target.value })} placeholder="Our most popular choice — best balance of quality and price." />
        </div>
        <div className="ss-field full">
          <label>Best tier description</label>
          <input value={p.bestDescription} onChange={(e) => upd({ bestDescription: e.target.value })} placeholder="Top-of-line materials, extended warranty, and white-glove service." />
        </div>
      </div>

      <div className="ss-divider">Default included services</div>
      <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 12px" }}>
        These items pre-fill the &quot;What&apos;s included&quot; checklist on every new proposal. You can edit per job.
      </p>
      {(p.defaultIncludedServices ?? []).map((svc, idx) => (
        <div key={idx} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
          <input
            value={svc}
            onChange={(e) => {
              const next = [...p.defaultIncludedServices];
              next[idx] = e.target.value;
              upd({ defaultIncludedServices: next });
            }}
            style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}
          />
          <button onClick={() => removeService(idx)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={newService}
          onChange={(e) => setNewService(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addService()}
          placeholder="Add a service (e.g. Cleanup, Disposal, Permit…)"
          style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}
        />
        <button className="btn ghost" onClick={addService}><Icon name="plus" size={13} /> Add</button>
      </div>
    </>
  );
}

// ── Proposals > Defaults & rules tab ─────────────────────────────────────────
function ProposalDefaultsTab({ settings, patchSettings }: SP) {
  const p = settings.proposalSettings;
  const upd = (patch: Partial<AppSettings["proposalSettings"]>) => patchSettings(patchProposal(patch));

  const toggleRow = (label: string, sub: string, key: keyof AppSettings["proposalSettings"]) => (
    <div className="toggle-row" key={key}>
      <div><div className="ttl">{label}</div><div className="sub2">{sub}</div></div>
      <div className={`switch ${p[key] ? "on" : ""}`} onClick={() => upd({ [key]: !p[key] as never })}></div>
    </div>
  );

  return (
    <>
      <h2>Defaults &amp; rules</h2>
      <p className="sub">Control how proposals behave: expiration, e-signatures, tier display, and what credentials appear on PDFs.</p>

      <div className="ss-divider">Proposal rules</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Default expiration (days)</label>
          <input type="number" value={p.defaultExpirationDays}
            onChange={(e) => upd({ defaultExpirationDays: Number(e.target.value) || 14 })} />
          <div className="hint">Proposals expire this many days after sending. Customer sees a countdown timer.</div>
        </div>
      </div>
      {toggleRow("Require customer e-signature", "Customer must sign before the proposal is considered accepted.", "requireCustomerSignature")}
      {toggleRow("Show Good / Better / Best to customer", "Display the three-tier table on the proposal. Turn off for single-price quotes.", "showGoodBetterBest")}
      {toggleRow("Highlight Better as recommended", "Adds a 'Most popular' badge to the Better tier on the customer portal.", "highlightBetterRecommended")}
      {toggleRow("Show profit internally only", "Margin and profit numbers are visible to you but hidden from customer-facing PDFs.", "showProfitInternallyOnly")}
      {toggleRow("Show financing note", "Display a financing availability note at the bottom of the proposal.", "showFinancingNote")}
      {p.showFinancingNote && (
        <div className="ss-field" style={{ marginBottom: 8 }}>
          <label>Financing note text</label>
          <input value={p.financingNote} onChange={(e) => upd({ financingNote: e.target.value })}
            placeholder="Financing available — ask us for details." />
        </div>
      )}
      {toggleRow("Show tax separately", "Break out tax as a line item at the bottom of the proposal total.", "showTaxSeparately")}

      <div className="ss-divider">Credentials on proposals</div>
      {toggleRow("Show certifications", "Print active certifications and badges on proposal PDFs.", "showCertifications")}
      {toggleRow("Show license number", "Print your contractor license number on proposal PDFs.", "showLicenseNumber")}
      {toggleRow("Show insurance badges", "Print your insurance provider name on proposal PDFs.", "showInsuranceBadges")}
      <div className="field-grid" style={{ marginTop: 12 }}>
        <div className="ss-field">
          <label>Credential placement</label>
          <select value={p.credentialPlacement} onChange={(e) => upd({ credentialPlacement: e.target.value as AppSettings["proposalSettings"]["credentialPlacement"] })}>
            <option value="Before Signatures">Before signatures</option>
            <option value="After Scope">After scope section</option>
            <option value="Footer">Footer</option>
          </select>
          <div className="hint">Where licenses and certifications appear in the proposal PDF layout.</div>
        </div>
      </div>
    </>
  );
}

// ── Proposals > Logo & layout tab ─────────────────────────────────────────────
function ProposalLogoTab({ settings, patchSettings }: SP) {
  const b = settings.branding;
  const updBranding = (patch: Partial<AppSettings["branding"]>) =>
    patchSettings((current) => ({ ...current, branding: { ...current.branding, ...patch } }));

  const styleOptions: { id: AppSettings["branding"]["proposalStyle"]; label: string; desc: string }[] = [
    { id: "Minimal",    label: "Minimal",    desc: "Clean lines, maximum whitespace." },
    { id: "Premium",    label: "Premium",    desc: "Dark header, gold accents." },
    { id: "Contractor", label: "Contractor", desc: "Bold, trade-focused layout." },
    { id: "Modern",     label: "Modern",     desc: "Gradient header, card layout." },
  ];

  const coverLayouts: { id: AppSettings["branding"]["proposalCoverLayout"]; label: string; desc: string }[] = [
    { id: "full",    label: "Full bleed",  desc: "Logo fills the full cover." },
    { id: "half",    label: "Half cover",  desc: "Logo left, info right." },
    { id: "square",  label: "Square",      desc: "Centered square logo block." },
    { id: "elegant", label: "Elegant",     desc: "Minimal wordmark-style header." },
  ];

  return (
    <>
      <h2>Logo &amp; layout</h2>
      <p className="sub">Brand your proposals with a logo, colors, and a PDF layout that matches your company style.</p>

      <div className="ss-divider">Logo</div>
      <div className="logo-row">
        <div className="logo-slot" style={{ backgroundImage: b.logoUrl ? `url(${b.logoUrl})` : undefined, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}>
          {!b.logoUrl && "LOGO"}
        </div>
        <div className="logo-meta">
          <h3>Company logo</h3>
          <p>Used on proposal PDFs, the client portal, and your top profile menu. PNG or SVG recommended (transparent background).</p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              placeholder="Logo URL (or upload via storage)"
              value={b.logoUrl}
              onChange={(e) => updBranding({ logoUrl: e.target.value })}
              style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}
            />
          </div>
        </div>
      </div>

      <div className="ss-divider">Brand colors</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Primary color</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={b.primaryColor} onChange={(e) => updBranding({ primaryColor: e.target.value })}
              style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer", padding: 2, background: "var(--bg-tint)" }} />
            <input value={b.primaryColor} onChange={(e) => updBranding({ primaryColor: e.target.value })}
              style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div className="hint">Used for headings and section titles on PDFs.</div>
        </div>
        <div className="ss-field">
          <label>Accent color</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={b.accentColor} onChange={(e) => updBranding({ accentColor: e.target.value })}
              style={{ width: 36, height: 36, border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer", padding: 2, background: "var(--bg-tint)" }} />
            <input value={b.accentColor} onChange={(e) => updBranding({ accentColor: e.target.value })}
              style={{ flex: 1, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)", padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div className="hint">Used for highlights, badges, and dividers.</div>
        </div>
        <div className="ss-field full">
          <label>Tagline</label>
          <input value={b.tagline} onChange={(e) => updBranding({ tagline: e.target.value })}
            placeholder="Quality work, guaranteed." />
          <div className="hint">Short tagline shown under your company name on proposal covers.</div>
        </div>
        <div className="ss-field full">
          <label>Footer text</label>
          <input value={b.footerText} onChange={(e) => updBranding({ footerText: e.target.value })}
            placeholder="Thank you for the opportunity to earn your business." />
          <div className="hint">Appears at the bottom of every proposal page.</div>
        </div>
      </div>

      <div className="ss-divider">Proposal style</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
        {styleOptions.map((opt) => (
          <button key={opt.id} onClick={() => updBranding({ proposalStyle: opt.id })}
            style={{ textAlign: "left", padding: 14, background: b.proposalStyle === opt.id ? "var(--gold-bg)" : "var(--surface)",
              border: "1.5px solid " + (b.proposalStyle === opt.id ? "var(--gold)" : "var(--line)"),
              borderRadius: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
              boxShadow: b.proposalStyle === opt.id ? "0 0 0 3px rgba(201,162,39,.14)" : "none" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{opt.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      <div className="ss-divider">Cover page layout</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {coverLayouts.map((opt) => (
          <button key={opt.id} onClick={() => updBranding({ proposalCoverLayout: opt.id })}
            style={{ textAlign: "left", padding: 14, background: b.proposalCoverLayout === opt.id ? "var(--gold-bg)" : "var(--surface)",
              border: "1.5px solid " + (b.proposalCoverLayout === opt.id ? "var(--gold)" : "var(--line)"),
              borderRadius: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s",
              boxShadow: b.proposalCoverLayout === opt.id ? "0 0 0 3px rgba(201,162,39,.14)" : "none" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{opt.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function TemplateGallery({ onEditTemplate }: { onEditTemplate: (template: ProposalTemplate) => void }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [templates, setTemplates] = useState<ProposalTemplate[]>(defaultProposalTemplates);

  useEffect(() => {
    listProposalTemplates(supabase)
      .then((saved) => setTemplates(mergeProposalTemplates(saved)))
      .catch(() => setTemplates(defaultProposalTemplates));
  }, [supabase]);

  return (
    <>
      <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 6px" }}>Proposal Templates</h3>
      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Customize the 10-section proposal document for each trade. Click a card to edit, use the copy icon to duplicate any template under a new trade name,
        or add a blank template for a new service.
      </p>

      <div className="tpl-grid">
        {templates.map((t) => {
          const enabledCount = PROPOSAL_SECTIONS.filter((s) => {
            const sec = t[s.id] as { enabled?: boolean } | undefined;
            return sec?.enabled !== false;
          }).length;
          return (
            <div key={t.trade} className="tpl-card" onClick={() => onEditTemplate(t)}>
              <div className="tpl-preview">
                <div className="crown">PROPOSAL</div>
                <div className="trade">{t.trade}</div>
                <div className="desc">{t.cover.tagline}</div>
                <div className="sep"></div>
                <div className="tpl-skel gold" style={{ width: "30%", height: 3 }}></div>
                <div className="tpl-section" style={{ marginTop: 14 }}>
                  <div className="b1"></div><div className="b2"></div>
                </div>
                <div className="tpl-skel" style={{ width: "80%" }}></div>
                <div className="tpl-skel short"></div>
                <div className="tpl-progress-mock">
                  {PROPOSAL_SECTIONS.map((s, i) => {
                    const sec = t[s.id] as { enabled?: boolean } | undefined;
                    return <div key={i} className={`b${sec?.enabled === false ? " dim" : ""}`}></div>;
                  })}
                </div>
                <div className="tpl-badge">{enabledCount}/10</div>
              </div>
              <div className="tpl-body">
                <div className="tpl-body-head">
                  <div>
                    <div className="nm">{t.trade}</div>
                    <div className="nm-sub">{t.name}</div>
                  </div>
                  <button
                    className="copy-btn"
                    title="Duplicate"
                    onClick={(e) => {
                      e.stopPropagation();
                      const copy = JSON.parse(JSON.stringify(t)) as ProposalTemplate;
                      copy.trade = t.trade + " (copy)";
                      copy.name = t.name + " (copy)";
                      copy.id = Math.random().toString(36).slice(2);
                      onEditTemplate(copy);
                    }}
                  >
                    <Icon name="copy" size={14} />
                  </button>
                </div>
                <div className="tpl-progress">
                  {PROPOSAL_SECTIONS.map((s, i) => {
                    const sec = t[s.id] as { enabled?: boolean } | undefined;
                    return <div key={i} className={`seg${sec?.enabled === false ? " empty" : ""}`}></div>;
                  })}
                </div>
                <div className="tpl-progress-label">{enabledCount} of 10 sections active</div>
              </div>
            </div>
          );
        })}
        <button className="tpl-add" onClick={() => onEditTemplate(blankTemplate("New Trade"))}>
          <div className="plus-circle"><Icon name="plus" size={20} /></div>
          <div className="name">New template</div>
          <div className="desc">Any trade or service</div>
        </button>
      </div>
    </>
  );
}

// ─── Template editor overlay ──────────────────────────────────────────────────

function TemplateEditor({
  template,
  supabase,
  onClose,
  onSave,
}: {
  template: ProposalTemplate;
  supabase: SupabaseClient;
  onClose: () => void;
  onSave: (t: ProposalTemplate) => void;
}) {
  const [draft, setDraft] = useState<ProposalTemplate>(() => JSON.parse(JSON.stringify(template)));
  const [activeSection, setActiveSection] = useState("cover");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function patch(updater: (d: ProposalTemplate) => void) {
    setDraft((prev) => {
      const copy = JSON.parse(JSON.stringify(prev)) as ProposalTemplate;
      updater(copy);
      return copy;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const updated: ProposalTemplate = { ...draft, lastModified: new Date().toISOString().slice(0, 10) };
    try {
      await upsertProposalTemplate(supabase, updated);
      onSave(updated);
    } catch {
      setSaveError("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const activeMeta = PROPOSAL_SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="tpl-editor">
      <div className="tpl-editor-hdr">
        <button className="btn ghost" style={{ gap: 6 }} onClick={onClose}>
          <Icon name="chevron-l" size={14} /> Templates
        </button>
        <div className="tpl-editor-title">
          <span className="tpl-editor-trade">{draft.trade}</span>
          <input
            className="tpl-editor-name-input"
            value={draft.name}
            onChange={(e) => patch((d) => { d.name = e.target.value; })}
            placeholder="Template name"
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: "auto" }}>
          {saveError && <span style={{ fontSize: 12, color: "var(--red)" }}>{saveError}</span>}
          {activeSection === "cover" && !!draft.sectionDocs?.["cover"] && (
            <button
              className="btn ghost"
              style={{ fontSize: 12, flexShrink: 0 }}
              onClick={() => patch((d) => { if (d.sectionDocs) delete d.sectionDocs["cover"]; })}
            >
              Cambiar layout
            </button>
          )}
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            <Icon name="check" size={13} /> {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>

      <div className="tpl-editor-body">
        {/* Left nav */}
        <div className="tpl-editor-nav">
          <div className="tpl-nav-trade-label">
            <input
              style={{ border: "none", background: "transparent", fontSize: 11.5, color: "var(--ink-3)", width: "100%", padding: "2px 0", fontFamily: "inherit" }}
              value={draft.trade}
              onChange={(e) => patch((d) => { d.trade = e.target.value; })}
              placeholder="Trade name"
            />
          </div>
          {PROPOSAL_SECTIONS.map((s) => {
            const sec = draft[s.id] as { enabled?: boolean } | undefined;
            const enabled = sec?.enabled !== false;
            return (
              <button
                key={s.id}
                className={`tpl-sec-item${activeSection === s.id ? " active" : ""}${!enabled ? " off" : ""}`}
                onClick={() => setActiveSection(s.id)}
              >
                <span className="tpl-sec-label">{s.label}</span>
                <span
                  className={`switch mini${enabled ? " on" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    patch((d) => {
                      const section = d[s.id] as Record<string, unknown>;
                      if (section) section.enabled = !enabled;
                    });
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Right panel */}
        <div className="tpl-editor-panel">
          {activeSection === "cover" && !draft.sectionDocs?.["cover"] ? (
            <div className="tpl-cover-picker-area">
              <CoverLayoutPicker
                trade={draft.trade}
                onSelect={(html) => patch((d) => {
                  if (!d.sectionDocs) d.sectionDocs = {};
                  d.sectionDocs["cover"] = html;
                })}
              />
            </div>
          ) : (
            <SectionTiptapEditor
              key={activeSection}
              documentTitle={`${draft.trade} ${activeMeta.label}`}
              initialContent={
                (draft.sectionDocs?.[activeSection] as string | Record<string, unknown> | undefined) ??
                sectionStarterHtml(activeSection, draft)
              }
              onUpdate={(json) => patch((d) => {
                if (!d.sectionDocs) d.sectionDocs = {};
                d.sectionDocs[activeSection] = json;
              })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cover layout picker ──────────────────────────────────────────────────────

const COVER_LAYOUTS = [
  {
    id: "centrado",
    label: "Centrado",
    desc: "Logo centrado, limpio y profesional",
    html: (trade: string) =>
      `<h1 style="text-align: center">Company Name</h1>` +
      `<p style="text-align: center">Licensed · Insured · Warranted</p>` +
      `<hr>` +
      `<h2 style="text-align: center">${trade} Proposal</h2>` +
      `<p style="text-align: center"><strong>Prepared for:</strong> Client Name</p>` +
      `<p style="text-align: center">123 Property Address, City, State</p>` +
      `<p style="text-align: center">Date: [Date] · Proposal #[Number]</p>` +
      `<hr>` +
      `<p style="text-align: center"><em>Professional ${trade} Services — Licensed, Insured &amp; Warranted</em></p>`,
    preview: (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, paddingTop: 8 }}>
        <div style={{ width: 44, height: 5, background: "#1a1a1a", borderRadius: 2 }} />
        <div style={{ width: 28, height: 2, background: "#bbb", borderRadius: 2 }} />
        <div style={{ width: "65%", height: 1, background: "#e5e5e5", margin: "6px 0" }} />
        <div style={{ width: 38, height: 4, background: "#555", borderRadius: 2 }} />
        <div style={{ width: 30, height: 2, background: "#ccc", borderRadius: 2 }} />
        <div style={{ width: 36, height: 2, background: "#ccc", borderRadius: 2 }} />
        <div style={{ width: 28, height: 2, background: "#ccc", borderRadius: 2 }} />
        <div style={{ width: "65%", height: 1, background: "#e5e5e5", margin: "6px 0" }} />
        <div style={{ width: 50, height: 2, background: "#ddd", borderRadius: 2 }} />
      </div>
    ),
  },
  {
    id: "elegante",
    label: "Elegante",
    desc: "Estructura premium, ideal para propuestas de alto valor",
    html: (trade: string) =>
      `<p><strong>${trade.toUpperCase()} PROPOSAL</strong></p>` +
      `<h1>Prepared Exclusively For:</h1>` +
      `<h2>Client Name</h2>` +
      `<p>123 Property Address<br>City, State ZIP</p>` +
      `<hr>` +
      `<p><strong>Prepared by:</strong> Company Name<br>License #[Number] · Insurance: Active</p>` +
      `<p>Date: [Date] · Proposal Number: #[Number]</p>` +
      `<hr>` +
      `<p><em>Professional ${trade} Services — Licensed, Insured &amp; Warranted</em></p>`,
    preview: (
      <div style={{ paddingTop: 4 }}>
        <div style={{ height: 8, background: "#1a1814", marginBottom: 10, borderRadius: 2 }} />
        <div style={{ width: 28, height: 2, background: "#aaa", borderRadius: 2, marginBottom: 5 }} />
        <div style={{ width: 44, height: 5, background: "#1a1a1a", borderRadius: 2, marginBottom: 4 }} />
        <div style={{ width: 32, height: 3, background: "#555", borderRadius: 2, marginBottom: 4 }} />
        <div style={{ width: 24, height: 2, background: "#ccc", borderRadius: 2, marginBottom: 2 }} />
        <div style={{ width: 20, height: 2, background: "#ccc", borderRadius: 2, marginBottom: 8 }} />
        <div style={{ width: "90%", height: 1, background: "#e5e5e5", marginBottom: 6 }} />
        <div style={{ width: 36, height: 2, background: "#bbb", borderRadius: 2, marginBottom: 3 }} />
        <div style={{ width: 28, height: 2, background: "#ddd", borderRadius: 2 }} />
      </div>
    ),
  },
  {
    id: "moderno",
    label: "Moderno",
    desc: "Directo y ejecutivo — cliente al frente",
    html: (trade: string) =>
      `<p><strong>Company Name</strong> · License #[Number] · Insured</p>` +
      `<hr>` +
      `<h1>Client Name</h1>` +
      `<p>123 Property Address<br>City, State ZIP</p>` +
      `<hr>` +
      `<h2>${trade} Proposal</h2>` +
      `<p>Date: [Date] · Proposal #[Number]</p>` +
      `<p>Contact: Company Name | Phone | Email</p>`,
    preview: (
      <div style={{ display: "flex", gap: 8, paddingTop: 4, height: "100%" }}>
        <div style={{ width: 4, background: "#c9a227", borderRadius: 2, alignSelf: "stretch" }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: 36, height: 2, background: "#bbb", borderRadius: 2, marginBottom: 8 }} />
          <div style={{ width: "90%", height: 1, background: "#e5e5e5", marginBottom: 8 }} />
          <div style={{ width: 44, height: 6, background: "#1a1a1a", borderRadius: 2, marginBottom: 4 }} />
          <div style={{ width: 28, height: 2, background: "#ccc", borderRadius: 2, marginBottom: 2 }} />
          <div style={{ width: 22, height: 2, background: "#ccc", borderRadius: 2, marginBottom: 8 }} />
          <div style={{ width: "90%", height: 1, background: "#e5e5e5", marginBottom: 6 }} />
          <div style={{ width: 36, height: 4, background: "#555", borderRadius: 2, marginBottom: 3 }} />
          <div style={{ width: 24, height: 2, background: "#ddd", borderRadius: 2 }} />
        </div>
      </div>
    ),
  },
];

function CoverLayoutPicker({ trade, onSelect }: { trade: string; onSelect: (html: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16 }}>
        Elige un diseño de portada para empezar. Después puedes editar todo el contenido libremente en el editor.
      </div>
      <div className="cover-layouts">
        {COVER_LAYOUTS.map((layout) => (
          <div key={layout.id} className="cover-layout-card" onClick={() => onSelect(layout.html(trade))}>
            <div className="cover-layout-preview">{layout.preview}</div>
            <div className="cover-layout-footer">
              <div className="name">{layout.label}</div>
              <div className="desc">{layout.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Starter HTML per section (from structured template data) ─────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sectionStarterHtml(sectionId: string, t: ProposalTemplate): string {
  switch (sectionId) {
    case "cover": return "";
    case "executiveSummary": {
      const s = t.executiveSummary;
      return `<h2>${esc(s.problemHeading)}</h2><p>${esc(s.problemText)}</p><h2>${esc(s.solutionHeading)}</h2><p>${esc(s.solutionText)}</p><h2>${esc(s.valueHeading)}</h2><p>${esc(s.valueText)}</p>`;
    }
    case "existingConditions": {
      const s = t.existingConditions;
      return `<p>${esc(s.introText)}</p><ul>${s.checklistItems.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    }
    case "scopeOfWork": {
      const s = t.scopeOfWork;
      return `<p>${esc(s.introText)}</p><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    }
    case "materialsSpecs": {
      const s = t.materialsSpecs;
      const rows = s.items.map((item) => `<li><strong>${esc(item.category)}</strong> — ${esc(item.product)} (${esc(item.brand)}) · Warranty: ${esc(item.warranty)}${item.notes ? " · " + esc(item.notes) : ""}</li>`).join("");
      return `<p>${esc(s.introText)}</p><ul>${rows}</ul>`;
    }
    case "timeline": {
      const s = t.timeline;
      const phases = s.phases.map((p) => `<h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>`).join("");
      return `<p>${esc(s.introText)}</p><p><strong>Estimated duration:</strong> ${s.estimatedDays} day(s)</p>${phases}`;
    }
    case "pricing": {
      const s = t.pricing;
      let html = `<p>${esc(s.introText)}</p>`;
      if (s.showFinancingOption) html += `<h3>Financing Options</h3><p>${esc(s.financingText)}</p>`;
      if (s.allowancesText) html += `<h3>Allowances &amp; Exclusions</h3><p>${esc(s.allowancesText)}</p>`;
      return html;
    }
    case "warranty": {
      const s = t.warranty;
      return `<h2>${s.workmanshipYears}-Year Workmanship Warranty</h2><p>${esc(s.workmanshipText)}</p><h2>Manufacturer Warranty</h2><p>${esc(s.manufacturerText)}</p>`;
    }
    case "terms": {
      return `<p>${esc(t.terms.text).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
    }
    case "acceptance": {
      const s = t.acceptance;
      return `<p>${esc(s.contractIntroText)}</p><h3>Payment Schedule</h3><p>${esc(s.paymentScheduleText)}</p>${s.paymentLinkUrl ? `<p><a href="${esc(s.paymentLinkUrl)}">${esc(s.paymentLinkUrl)}</a></p>` : ""}`;
    }
    default: return "";
  }
}

// ─── Tiptap section editor ────────────────────────────────────────────────────

const PHOTO_PH = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='760' height='380' viewBox='0 0 760 380'><rect width='760' height='380' fill='%23f0ede8'/><rect x='2' y='2' width='756' height='376' rx='3' fill='none' stroke='%23c8c3bb' stroke-width='2' stroke-dasharray='10 7'/><line x1='0' y1='0' x2='760' y2='380' stroke='%23ddd9d2' stroke-width='1.5'/><line x1='760' y1='0' x2='0' y2='380' stroke='%23ddd9d2' stroke-width='1.5'/><text x='380' y='178' text-anchor='middle' fill='%23aaa9a6' font-family='system-ui,sans-serif' font-size='15' font-weight='700' letter-spacing='1'>📷  FOTO DE LA PROPIEDAD</text><text x='380' y='208' text-anchor='middle' fill='%23c4c0b8' font-family='system-ui,sans-serif' font-size='13'>Se reemplaza con la foto real al crear la propuesta</text></svg>`;
const LOGO_PH   = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='100' viewBox='0 0 240 100'><rect width='240' height='100' fill='%23f0ede8'/><rect x='2' y='2' width='236' height='96' rx='3' fill='none' stroke='%23c8c3bb' stroke-width='1.5' stroke-dasharray='7 5'/><text x='120' y='44' text-anchor='middle' fill='%23aaa9a6' font-family='system-ui,sans-serif' font-size='12' font-weight='700'>🏢  LOGO DE EMPRESA</text><text x='120' y='64' text-anchor='middle' fill='%23c4c0b8' font-family='system-ui,sans-serif' font-size='11'>Tu logo aquí</text></svg>`;

const FONT_OPTIONS = ["Manrope", "Arial", "Georgia", "Times New Roman", "Inter", "Helvetica", "Verdana"];
const FONT_SIZE_OPTIONS = ["10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "24pt", "32pt"];
const TEXT_COLORS = ["#111111", "#2f3a4a", "#166534", "#7a5c00", "#b42318", "#2563eb"];
const HIGHLIGHT_COLORS = ["#fff2b8", "#dff7e8", "#dceeff", "#f8d7da", "#eee7ff", "#ffffff"];
const TEMPLATE_VARIABLES = [
  ["Client name", "{{client.name}}"],
  ["Client address", "{{client.address}}"],
  ["Client email", "{{client.email}}"],
  ["Project address", "{{project.address}}"],
  ["Proposal number", "{{proposal.number}}"],
  ["Proposal date", "{{proposal.date}}"],
  ["Expiration date", "{{proposal.expiresAt}}"],
  ["Selected package", "{{proposal.selectedPackage}}"],
  ["Good price", "{{pricing.good}}"],
  ["Better price", "{{pricing.better}}"],
  ["Best price", "{{pricing.best}}"],
  ["Company name", "{{company.name}}"],
  ["Company phone", "{{company.phone}}"],
  ["Company email", "{{company.email}}"],
] as const;

function fullCoverHtml(trade: string) {
  return `
    <div style="text-align:center; min-height:720px; display:flex; flex-direction:column; justify-content:center;">
      <p style="letter-spacing:.18em; text-transform:uppercase; color:#8f836e; font-size:10pt;">{{company.name}}</p>
      <h1 style="font-size:34pt; margin:20px 0 10px;">${esc(trade)} Proposal</h1>
      <p style="font-size:13pt; color:#6f6a60;">Prepared for {{client.name}}</p>
      <p style="font-size:11pt; color:#6f6a60;">{{project.address}}</p>
      <hr>
      <p><strong>Proposal #:</strong> {{proposal.number}}</p>
      <p><strong>Date:</strong> {{proposal.date}} · <strong>Valid until:</strong> {{proposal.expiresAt}}</p>
      <p style="margin-top:52px;">{{company.phone}} · {{company.email}}</p>
    </div>
  `;
}

const PageBreak = TiptapNode.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: false,
  isolating: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-page-break": "true",
      "contenteditable": "false",
      "aria-label": "Salto de hoja",
      class: "tpl-page-break",
    })];
  },
});

function SectionTiptapEditor({
  initialContent,
  onUpdate,
}: {
  documentTitle?: string;
  initialContent: string | Record<string, unknown> | null | undefined;
  onUpdate: (json: Record<string, unknown>) => void;
}) {
  const [, tick] = useState(0);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [darkEditor, setDarkEditor] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const linkMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Superscript,
      Subscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      PageBreak,
    ],
    content: initialContent ?? "",
    onUpdate: ({ editor }) => {
      tick((n) => n + 1);
      onUpdate(editor.getJSON() as Record<string, unknown>);
    },
    onSelectionUpdate: () => tick((n) => n + 1),
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target as Node)) setLinkMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
      setAddMenuOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function insertImageUrl() {
    if (!imgUrl.trim() || !editor) return;
    editor.chain().focus().setImage({ src: imgUrl.trim() }).run();
    setImgUrl("");
    setAddMenuOpen(false);
  }

  function setLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = /^https?:\/\//i.test(url) || url.startsWith("mailto:") || url.startsWith("tel:") ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkUrl("");
    setLinkMenuOpen(false);
  }

  if (!editor) return null;

  function tb(label: ReactNode, active: boolean, onPress: () => void, title?: string) {
    return (
      <button
        className={`tpl-tb-btn${active ? " active" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); onPress(); editor?.commands.focus(); }}
        title={title}
      >
        {label}
      </button>
    );
  }

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
      ? "h2"
      : editor.isActive("heading", { level: 3 })
        ? "h3"
        : "p";
  const listValue = editor.isActive("bulletList") ? "bullet" : editor.isActive("orderedList") ? "ordered" : "none";

  return (
    <div className={`tpl-tiptap-wrap${darkEditor ? " is-dark" : ""}`}>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />

      <div className="tpl-tiptap-bar">
        {tb("↶", false, () => editor.chain().focus().undo().run(), "Undo")}
        {tb("↷", false, () => editor.chain().focus().redo().run(), "Redo")}
        <div className="tpl-tb-sep" />
        <select
          className="tpl-tb-select icon"
          value={headingValue}
          onChange={(e) => {
            if (e.target.value === "p") editor.chain().focus().setParagraph().run();
            if (e.target.value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
            if (e.target.value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            if (e.target.value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          title="Heading"
        >
          <option value="p">H</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
        <select
          className="tpl-tb-select icon"
          value={listValue}
          onChange={(e) => {
            if (e.target.value === "none") editor.chain().focus().liftListItem("listItem").run();
            if (e.target.value === "bullet") editor.chain().focus().toggleBulletList().run();
            if (e.target.value === "ordered") editor.chain().focus().toggleOrderedList().run();
          }}
          title="List"
        >
          <option value="none">☰</option>
          <option value="bullet">•</option>
          <option value="ordered">1.</option>
        </select>
        {tb("⇤", false, () => editor.chain().focus().liftListItem("listItem").run(), "Outdent")}
        {tb("⇥", false, () => editor.chain().focus().sinkListItem("listItem").run(), "Indent")}
        {tb("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Quote")}
        <div className="tpl-tb-sep" />
        {tb("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
        {tb("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic")}
        {tb("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Strike")}
        {tb("</>", editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "Inline code")}
        {tb("U", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline")}
        {tb("⌁", editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight({ color: "#fff2b8" }).run(), "Highlight")}
        <div ref={linkMenuRef} style={{ position: "relative" }}>
          <button
            className={`tpl-tb-btn${editor.isActive("link") ? " active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              setLinkUrl(editor.getAttributes("link").href ?? "");
              setLinkMenuOpen((o) => !o);
              setAddMenuOpen(false);
            }}
            title="Link"
          >
            🔗
          </button>
          {linkMenuOpen && (
            <div className="tpl-table-menu" style={{ minWidth: 240 }}>
              <div className="tpl-table-menu-label">Enlace</div>
              <div style={{ padding: "6px 12px 8px", display: "flex", gap: 6 }}>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setLink()}
                  placeholder="https://example.com"
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "inherit" }}
                />
                <button className="btn primary" style={{ fontSize: 12, padding: "4px 10px" }} onMouseDown={(e) => { e.preventDefault(); setLink(); }}>OK</button>
              </div>
              <button className="tpl-table-menu-item danger" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setLinkMenuOpen(false); }}>Quitar link</button>
            </div>
          )}
        </div>
        {tb("x²", editor.isActive("superscript"), () => editor.chain().focus().toggleSuperscript().run(), "Superscript")}
        {tb("x₂", editor.isActive("subscript"), () => editor.chain().focus().toggleSubscript().run(), "Subscript")}
        <div className="tpl-tb-sep" />
        {tb("≡<", editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Align left")}
        {tb("≡", editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Align center")}
        {tb(">≡", editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "Align right")}
        {tb("▦", editor.isActive({ textAlign: "justify" }), () => editor.chain().focus().setTextAlign("justify").run(), "Justify")}
        <div className="tpl-tb-sep" />
        <div ref={addMenuRef} style={{ position: "relative" }}>
          <button
            className={`tpl-tb-btn${editor.isActive("image") || editor.isActive("table") ? " active" : ""}`}
            onMouseDown={(e) => { e.preventDefault(); setAddMenuOpen((o) => !o); setLinkMenuOpen(false); }}
            title="Add"
          >
            <Icon name="image" size={15} />
            <span className="tpl-tb-label">Add</span>
          </button>
          {addMenuOpen && (
            <div className="tpl-table-menu" style={{ minWidth: 220 }}>
              <div className="tpl-table-menu-label">Imagen</div>
              <button className="tpl-table-menu-item" onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); setAddMenuOpen(false); }}>
                Subir desde computadora
              </button>
              <div style={{ padding: "6px 12px 8px", display: "flex", gap: 6 }}>
                <input
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && insertImageUrl()}
                  placeholder="https://…"
                  style={{ flex: 1, fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "inherit" }}
                />
                <button className="btn primary" style={{ fontSize: 12, padding: "4px 10px" }} onMouseDown={(e) => { e.preventDefault(); insertImageUrl(); }}>OK</button>
              </div>
              <div className="tpl-table-menu-label">Tabla</div>
              {([[2, 2], [3, 3], [3, 4]] as [number, number][]).map(([r, c]) => (
                <button
                  key={`${r}x${c}`}
                  className="tpl-table-menu-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run();
                    setAddMenuOpen(false);
                  }}
                >
                  {r} × {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="tpl-tb-sep" />
        {tb(darkEditor ? "☾" : "☼", darkEditor, () => setDarkEditor((current) => !current), "Theme")}
      </div>

      <div className="tpl-simple-canvas">
        <div className="tpl-simple-paper">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ProductsSettingsSection({ settings, patchSettings }: SP) {
  const ps = settings.productsSettings;
  const upd = (patch: Partial<AppSettings["productsSettings"]>) =>
    patchSettings((c) => ({ ...c, productsSettings: { ...c.productsSettings, ...patch } }));
  return (
    <>
      <h2>Products settings</h2>
      <p className="sub">Default markups, units, and pricing rules for items in your catalog.</p>
      <div className="ss-divider">Default markups</div>
      <div className="field-grid">
        <div className="ss-field">
          <label>Materials markup %</label>
          <input type="number" value={ps.materialsMarkupPercent} onChange={(e) => upd({ materialsMarkupPercent: Number(e.target.value) || 0 })} />
          <div className="hint">Default applied to new material products.</div>
        </div>
        <div className="ss-field">
          <label>Labor markup %</label>
          <input type="number" value={ps.laborMarkupPercent} onChange={(e) => upd({ laborMarkupPercent: Number(e.target.value) || 0 })} />
          <div className="hint">Default applied to labor line items.</div>
        </div>
        <div className="ss-field">
          <label>Default unit</label>
          <select value={ps.defaultUnit} onChange={(e) => upd({ defaultUnit: e.target.value as AppSettings["productsSettings"]["defaultUnit"] })}>
            <option value="each">Each</option>
            <option value="sf">Square foot (sf)</option>
            <option value="sq">Square (sq)</option>
            <option value="lf">Linear foot (lf)</option>
            <option value="hour">Hour</option>
          </select>
        </div>
        <div className="ss-field">
          <label>Default tier</label>
          <select value={ps.defaultTier} onChange={(e) => upd({ defaultTier: e.target.value as AppSettings["productsSettings"]["defaultTier"] })}>
            <option value="Good">Good</option>
            <option value="Better">Better</option>
            <option value="Best">Best</option>
          </select>
        </div>
      </div>
      <div className="ss-divider">Catalog behavior</div>
      <div className="toggle-row">
        <div><div className="ttl">Show inactive products</div><div className="sub2">Display archived items in the catalog browser (grayed out).</div></div>
        <div className={`switch ${ps.showInactiveProducts ? "on" : ""}`} onClick={() => upd({ showInactiveProducts: !ps.showInactiveProducts })}></div>
      </div>
      <div className="toggle-row">
        <div><div className="ttl">Auto-suggest based on trade</div><div className="sub2">When picking products in the Builder, surface items matching the current trade first.</div></div>
        <div className={`switch ${ps.autoSuggestByTrade ? "on" : ""}`} onClick={() => upd({ autoSuggestByTrade: !ps.autoSuggestByTrade })}></div>
      </div>
    </>
  );
}

function AppPrefsSection({
  settings,
  patchSettings,
}: {
  settings: AppSettings;
  patchSettings: (patch: (current: AppSettings) => AppSettings) => void;
}) {
  const prefs = settings.appPreferences;
  const updatePrefs = (patch: Partial<AppSettings["appPreferences"]>) => {
    const nextPrefs = { ...prefs, ...patch };
    patchSettings((current) => ({
      ...current,
      appPreferences: { ...current.appPreferences, ...patch },
    }));
    previewV2Prefs(nextPrefs);
    applyAppPreferencesVisuals(nextPrefs);
  };
  const collapsed = Boolean(prefs.sidebarCollapsed);
  const layout = prefs.navLayout ?? "sidebar";
  const density = prefs.density ?? (prefs.compactMode ? "compact" : "regular");
  const accent = prefs.accent ?? "gold";

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
          active={layout === "sidebar"} onClick={() => updatePrefs({ navLayout: "sidebar" })} />
        <NavLayoutOption id="topbar" label="Top bar" desc="Horizontal nav across the top. Best for narrower screens."
          active={layout === "topbar"} onClick={() => updatePrefs({ navLayout: "topbar" })} />
      </div>
      <div className="toggle-row">
        <div>
          <div className="ttl">Collapse sidebar by default</div>
          <div className="sub2">Show icons only. You can still toggle from the sidebar.</div>
        </div>
        <div className={`switch ${collapsed ? "on" : ""}`} onClick={() => updatePrefs({ sidebarCollapsed: !collapsed })}></div>
      </div>
      <div className="ss-divider">Density</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {(["compact", "regular", "comfy"] as const).map((d) => (
          <button key={d} onClick={() => updatePrefs({ density: d, compactMode: d === "compact" })}
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
          <select value={prefs.theme} onChange={(e) => updatePrefs({ theme: e.target.value as AppSettings["appPreferences"]["theme"] })}>
            <option value="Light">Light</option>
            <option value="Dark">Dark</option>
            <option value="System">Auto (system)</option>
          </select>
        </div>
        <div className="ss-field">
          <label>Accent color</label>
          <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
            {accentColors.map((c) => (
              <button key={c.id} onClick={() => updatePrefs({ accent: c.id })} title={c.name}
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
          <select value={prefs.defaultLandingPage} onChange={(e) => updatePrefs({ defaultLandingPage: e.target.value as AppSettings["appPreferences"]["defaultLandingPage"] })}>
            <option value="Dashboard">Dashboard</option>
            <option value="Projects">Projects</option>
            <option value="Pricing">New proposal (Calculator)</option>
          </select>
        </div>
        <div className="ss-field"><label>Currency</label><select defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>MXN</option></select></div>
        <div className="ss-field"><label>Number format</label><select value={prefs.numberFormat} onChange={(e) => updatePrefs({ numberFormat: e.target.value as AppSettings["appPreferences"]["numberFormat"] })}><option value="1,000.00">1,000.00</option><option value="1000.00">1000.00</option></select></div>
        <div className="ss-field"><label>Date format</label><select defaultValue="us"><option value="us">MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select></div>
      </div>
      <div className="ss-divider">Calculator behavior</div>
      <div className="toggle-row">
        <div><div className="ttl">Show advanced pricing breakdown</div><div className="sub2">Display cost protection details inside the Calculator by default.</div></div>
        <div className={`switch ${prefs.showAdvancedPricingBreakdown ? "on" : ""}`} onClick={() => updatePrefs({ showAdvancedPricingBreakdown: !prefs.showAdvancedPricingBreakdown })}></div>
      </div>
      <div className="toggle-row">
        <div><div className="ttl">Show pricing warnings</div><div className="sub2">Surface &quot;Tight margin&quot; and &quot;Below floor&quot; warnings before saving a quote.</div></div>
        <div className={`switch ${prefs.showPricingWarnings ? "on" : ""}`} onClick={() => updatePrefs({ showPricingWarnings: !prefs.showPricingWarnings })}></div>
      </div>
      <div className="info-banner" style={{ marginTop: 18 }}>
        <b>Heads up:</b> Theme, density, accent, and number format apply as you change them. Default landing applies the next time you sign in.
      </div>
    </>
  );
}

function previewV2Prefs(prefs: AppSettings["appPreferences"]) {
  if (typeof window === "undefined") return;
  const v2Prefs = {
    navLayout: prefs.navLayout ?? "sidebar",
    sidebarCollapsed: Boolean(prefs.sidebarCollapsed),
    density: prefs.density ?? (prefs.compactMode ? "compact" : "regular"),
    accent: prefs.accent ?? "gold",
  };
  try {
    window.localStorage.setItem("v2-prefs", JSON.stringify(v2Prefs));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("v2-prefs-change", { detail: v2Prefs }));
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

function SecuritySection({ supabase }: { supabase: SupabaseClient }) {
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailStatus("busy");
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailStatus("sent");
      setNewEmail("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not update email.");
      setEmailStatus("error");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords don't match.");
      return;
    }
    setPwStatus("busy");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwStatus("saved");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not update password.");
      setPwStatus("error");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-tint)",
    padding: "9px 11px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <>
      <h2>Security</h2>
      <p className="sub">Manage your login email and password. Changes to your email require confirmation via the new address.</p>

      <div className="ss-divider">Login email</div>
      {currentEmail && (
        <div className="info-banner" style={{ marginBottom: 14 }}>
          Current email: <b>{currentEmail}</b>
        </div>
      )}
      {emailStatus === "sent" ? (
        <div className="info-banner" style={{ background: "var(--green-bg, #f0fdf4)", border: "1px solid var(--green-line, #bbf7d0)", marginBottom: 14 }}>
          <Icon name="check" size={14} /> Confirmation sent. Check your new inbox and click the link to confirm the change.
        </div>
      ) : (
        <form onSubmit={handleChangeEmail}>
          <div className="field-grid">
            <div className="ss-field full">
              <label>New email address</label>
              <input type="email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); setEmailStatus("idle"); }}
                placeholder="newaddress@example.com" style={inputStyle} />
              {emailError && <div className="hint" style={{ color: "var(--rose)" }}>{emailError}</div>}
              <div className="hint">Supabase will send a confirmation link to the new address. Your current email stays active until confirmed.</div>
            </div>
          </div>
          <button type="submit" className="btn primary" disabled={emailStatus === "busy"} style={{ marginTop: 4 }}>
            {emailStatus === "busy" ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      )}

      <div className="ss-divider" style={{ marginTop: 24 }}>Password</div>
      {pwStatus === "saved" ? (
        <div className="info-banner" style={{ background: "var(--green-bg, #f0fdf4)", border: "1px solid var(--green-line, #bbf7d0)" }}>
          <Icon name="check" size={14} /> Password updated successfully.
        </div>
      ) : (
        <form onSubmit={handleChangePassword}>
          <div className="field-grid">
            <div className="ss-field full">
              <label>New password</label>
              <div style={{ position: "relative" }}>
                <input type={showNewPw ? "text" : "password"} value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPwStatus("idle"); }}
                  placeholder="Minimum 6 characters" autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowNewPw((v) => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, display: "flex" }}>
                  <Icon name="eye" size={15} />
                </button>
              </div>
            </div>
            <div className="ss-field full">
              <label>Confirm new password</label>
              <input type={showNewPw ? "text" : "password"} value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus("idle"); }}
                placeholder="Repeat the new password" autoComplete="new-password"
                style={inputStyle} />
            </div>
          </div>
          {pwError && <div className="hint" style={{ color: "var(--rose)", marginBottom: 8 }}>{pwError}</div>}
          <button type="submit" className="btn primary" disabled={pwStatus === "busy"} style={{ marginTop: 4 }}>
            {pwStatus === "busy" ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      <div className="ss-divider" style={{ marginTop: 24 }}>Active sessions</div>
      <div className="info-banner">
        To sign out of all devices at once, change your password above — Supabase invalidates all other sessions automatically when your password changes.
      </div>
    </>
  );
}

function DataSection({ settings, onReset }: { settings: AppSettings; onReset: () => Promise<void> }) {
  const [confirmReset, setConfirmReset] = useState(false);
  function downloadSettings() {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contractor-studio-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }
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
        <div className="actions"><button className="btn ghost" onClick={downloadSettings}><Icon name="arrow-dn" size={13} /> Download settings JSON</button></div>
      </div>
      <div className="data-card">
        <h4><span className="ico-mini"><Icon name="settings" size={13} /></span> Reset settings</h4>
        <p>Restores all settings to factory defaults. Your proposals, contacts, and projects are not affected — only the settings.</p>
        {confirmReset ? (
          <div className="actions" style={{ gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: "var(--ink-3)", alignSelf: "center" }}>Are you sure? This cannot be undone.</span>
            <button className="btn ghost" style={{ color: "var(--rose)" }} onClick={async () => { await onReset(); setConfirmReset(false); }}>
              <Icon name="x" size={13} /> Yes, reset
            </button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <div className="actions">
            <button className="btn ghost" style={{ color: "var(--rose)" }} onClick={() => setConfirmReset(true)}>
              <Icon name="x" size={13} /> Reset settings
            </button>
          </div>
        )}
      </div>
      <div className="data-card">
        <h4><span className="ico-mini" style={{ background: "var(--gold-bg)", color: "var(--gold-deep)" }}><Icon name="sparkle" size={13} /></span> Re-run setup wizard</h4>
        <p>Clears the onboarding flag and sends you through the wizard again. Changes are saved to your account when you finish.</p>
        <div className="actions"><a href="/v2/wizard" className="btn primary"><Icon name="arrow-r" size={13} /> Re-run onboarding</a></div>
      </div>
    </>
  );
}
