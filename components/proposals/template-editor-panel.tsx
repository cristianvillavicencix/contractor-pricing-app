"use client";

import { useRef, useState } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { ProposalTemplate, MaterialItem, TimelinePhase } from "@/lib/proposal-templates";
import { PROPOSAL_SECTIONS } from "@/lib/proposal-templates";

type Props = {
  template: ProposalTemplate;
  open: boolean;
  onClose: () => void;
  onSave: (template: ProposalTemplate) => void;
};

type SectionId = keyof Omit<ProposalTemplate, "id" | "trade" | "name" | "lastModified">;

export function TemplateEditorPanel({ template, open, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ProposalTemplate>(template);
  const [activeSection, setActiveSection] = useState<SectionId>("cover");

  if (!open) return null;

  function set<K extends SectionId>(section: K, value: ProposalTemplate[K]) {
    setDraft((prev) => ({ ...prev, [section]: value }));
  }

  function handleSave() {
    onSave({ ...draft, lastModified: new Date().toISOString().slice(0, 10) });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[75vw] flex-col bg-white shadow-2xl md:w-[75vw]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d9e2ec] px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Proposal Template</p>
            <h2 className="text-lg font-semibold text-[#213343]">{draft.trade} — {draft.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-[#d9e2ec] px-4 py-2 text-sm text-gray-500 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-md bg-[#ff5c35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e94820]"
            >
              Save Template
            </button>
            <button onClick={onClose} className="ml-1 rounded-md p-2 text-gray-400 transition hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Section nav */}
          <nav className="w-56 shrink-0 overflow-y-auto border-r border-[#d9e2ec] bg-[#f5f8fa] p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</p>
            {PROPOSAL_SECTIONS.map((s) => {
              const enabled = (draft[s.id] as { enabled: boolean }).enabled;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`mb-0.5 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition ${
                    activeSection === s.id
                      ? "bg-white font-medium text-[#213343] shadow-sm"
                      : "text-gray-500 hover:bg-white/70 hover:text-black"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${enabled ? "bg-[#ff5c35]" : "bg-gray-300"}`} />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Section editor */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === "cover" && (
              <CoverEditor section={draft.cover} onChange={(v) => set("cover", v)} />
            )}
            {activeSection === "executiveSummary" && (
              <ExecSummaryEditor section={draft.executiveSummary} onChange={(v) => set("executiveSummary", v)} />
            )}
            {activeSection === "existingConditions" && (
              <ExistingConditionsEditor section={draft.existingConditions} onChange={(v) => set("existingConditions", v)} />
            )}
            {activeSection === "scopeOfWork" && (
              <ScopeEditor section={draft.scopeOfWork} onChange={(v) => set("scopeOfWork", v)} />
            )}
            {activeSection === "materialsSpecs" && (
              <MaterialsEditor section={draft.materialsSpecs} onChange={(v) => set("materialsSpecs", v)} />
            )}
            {activeSection === "timeline" && (
              <TimelineEditor section={draft.timeline} onChange={(v) => set("timeline", v)} />
            )}
            {activeSection === "pricing" && (
              <PricingEditor section={draft.pricing} onChange={(v) => set("pricing", v)} />
            )}
            {activeSection === "warranty" && (
              <WarrantyEditor section={draft.warranty} onChange={(v) => set("warranty", v)} />
            )}
            {activeSection === "terms" && (
              <TermsEditor section={draft.terms} onChange={(v) => set("terms", v)} />
            )}
            {activeSection === "acceptance" && (
              <AcceptanceEditor section={draft.acceptance} onChange={(v) => set("acceptance", v)} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Section Editors ───────────────────────────────────────────────────────────

function SectionToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        onClick={() => onChange(!enabled)}
        className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-[#ff5c35]" : "bg-gray-200"}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-gray-500">{enabled ? "Enabled" : "Disabled"}</span>
    </label>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-sm font-medium text-[#213343]">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
    />
  );
}

function Textarea({ value, onChange, rows = 4, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35] focus:ring-2 focus:ring-[#ff5c35]/20"
    />
  );
}

function SectionEditorHeader({ title, enabled, onToggle }: { title: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-[#d9e2ec] pb-4">
      <h3 className="text-base font-semibold text-[#213343]">{title}</h3>
      <SectionToggle enabled={enabled} onChange={onToggle} />
    </div>
  );
}

// ── Cover ─────────────────────────────────────────────────────────────────────
function CoverEditor({ section, onChange }: { section: ProposalTemplate["cover"]; onChange: (v: ProposalTemplate["cover"]) => void }) {
  const elegantLogoRef = useRef<HTMLInputElement>(null);
  const elegantPhotoRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }

  function readImageFile(file: File, key: "elegantLogoUrl" | "elegantContactPhotoUrl") {
    const MAX = 1.2 * 1024 * 1024;
    if (!file.type.startsWith("image/") || file.size > MAX) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") set(key, r);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <SectionEditorHeader title="Cover Page" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Tagline">
        <Input value={section.tagline} onChange={(v) => set("tagline", v)} placeholder="Professional Services — Licensed, Insured & Warranted" />
      </FieldGroup>
      <FieldGroup label="Banner headline (Elegante layout)">
        <Input
          value={section.bannerHeadline ?? ""}
          onChange={(v) => set("bannerHeadline", v.trim() === "" ? undefined : v.trim())}
          placeholder="PROPOSED INVESTMENT"
        />
      </FieldGroup>
      <div className="mt-6 rounded-lg border border-[#e8eef5] bg-[#fafbfc] p-4">
        <p className="mb-1 text-sm font-semibold text-[#213343]">Elegante — optional overrides</p>
        <p className="mb-4 text-xs text-gray-500">
          Used when the quote uses the Elegante cover layout. Leave blank to use Settings and the live quote total. The address line on the cover still comes from the quote.
        </p>
        <FieldGroup label="Company name">
          <Input
            value={section.elegantBusinessName ?? ""}
            onChange={(v) => set("elegantBusinessName", v.trim() === "" ? undefined : v.trim())}
            placeholder="From Settings if empty"
          />
        </FieldGroup>
        <FieldGroup label="Header logo">
          <input
            ref={elegantLogoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) readImageFile(f, "elegantLogoUrl");
            }}
          />
          {section.elegantLogoUrl ? (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.elegantLogoUrl} alt="" className="h-12 max-w-[140px] border border-[#d9e2ec] bg-white object-contain p-1" />
              <button
                type="button"
                className="text-xs text-[#ff5c35] underline"
                onClick={() => set("elegantLogoUrl", undefined)}
              >
                Remove override
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="rounded border border-[#d9e2ec] px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            onClick={() => elegantLogoRef.current?.click()}
          >
            {section.elegantLogoUrl ? "Replace logo image" : "Upload logo image"}
          </button>
        </FieldGroup>
        <FieldGroup label="Price text (hero)">
          <Input
            value={section.elegantPriceDisplay ?? ""}
            onChange={(v) => set("elegantPriceDisplay", v.trim() === "" ? undefined : v)}
            placeholder="Formatted quote total if empty"
          />
        </FieldGroup>
        <FieldGroup label="Footer contact name">
          <Input
            value={section.elegantContactName ?? ""}
            onChange={(v) => set("elegantContactName", v.trim() === "" ? undefined : v.trim())}
            placeholder="From Settings if empty"
          />
        </FieldGroup>
        <FieldGroup label="Footer job title">
          <Input
            value={section.elegantContactJobTitle ?? ""}
            onChange={(v) => set("elegantContactJobTitle", v.trim() === "" ? undefined : v.trim())}
            placeholder="From Settings if empty"
          />
        </FieldGroup>
        <FieldGroup label="Footer contact photo">
          <input
            ref={elegantPhotoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) readImageFile(f, "elegantContactPhotoUrl");
            }}
          />
          {section.elegantContactPhotoUrl ? (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.elegantContactPhotoUrl} alt="" className="h-14 w-14 rounded-full border border-[#d9e2ec] object-cover" />
              <button
                type="button"
                className="text-xs text-[#ff5c35] underline"
                onClick={() => set("elegantContactPhotoUrl", undefined)}
              >
                Remove override
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="rounded border border-[#d9e2ec] px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            onClick={() => elegantPhotoRef.current?.click()}
          >
            {section.elegantContactPhotoUrl ? "Replace photo" : "Upload photo"}
          </button>
        </FieldGroup>
      </div>
      <div className="mt-6 flex gap-6">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={section.showPreparedBy} onChange={(e) => set("showPreparedBy", e.target.checked)} className="accent-[#ff5c35]" />
          Show prepared date
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={section.showProposalNumber} onChange={(e) => set("showProposalNumber", e.target.checked)} className="accent-[#ff5c35]" />
          Show proposal number
        </label>
      </div>
    </div>
  );
}

// ── Executive Summary ─────────────────────────────────────────────────────────
function ExecSummaryEditor({ section, onChange }: { section: ProposalTemplate["executiveSummary"]; onChange: (v: ProposalTemplate["executiveSummary"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  return (
    <div>
      <SectionEditorHeader title="Executive Summary" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <CollapseCard title="Problem Block" defaultOpen>
        <FieldGroup label="Heading"><Input value={section.problemHeading} onChange={(v) => set("problemHeading", v)} /></FieldGroup>
        <FieldGroup label="Body Text"><Textarea value={section.problemText} onChange={(v) => set("problemText", v)} rows={5} /></FieldGroup>
      </CollapseCard>
      <CollapseCard title="Solution Block">
        <FieldGroup label="Heading"><Input value={section.solutionHeading} onChange={(v) => set("solutionHeading", v)} /></FieldGroup>
        <FieldGroup label="Body Text"><Textarea value={section.solutionText} onChange={(v) => set("solutionText", v)} rows={5} /></FieldGroup>
      </CollapseCard>
      <CollapseCard title="Value Block">
        <FieldGroup label="Heading"><Input value={section.valueHeading} onChange={(v) => set("valueHeading", v)} /></FieldGroup>
        <FieldGroup label="Body Text"><Textarea value={section.valueText} onChange={(v) => set("valueText", v)} rows={5} /></FieldGroup>
      </CollapseCard>
    </div>
  );
}

// ── Existing Conditions ───────────────────────────────────────────────────────
function ExistingConditionsEditor({ section, onChange }: { section: ProposalTemplate["existingConditions"]; onChange: (v: ProposalTemplate["existingConditions"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  function addItem() { set("checklistItems", [...section.checklistItems, ""]); }
  function updateItem(i: number, val: string) {
    const items = [...section.checklistItems];
    items[i] = val;
    set("checklistItems", items);
  }
  function removeItem(i: number) {
    set("checklistItems", section.checklistItems.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <SectionEditorHeader title="Existing Conditions" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Intro Text">
        <Textarea value={section.introText} onChange={(v) => set("introText", v)} rows={3} />
      </FieldGroup>
      <FieldGroup label="Condition Checklist">
        <div className="space-y-2">
          {section.checklistItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                className="flex-1 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
                placeholder={`Condition ${i + 1}`}
              />
              <button onClick={() => removeItem(i)} className="rounded-md border border-red-200 p-2 text-red-400 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-[#ff5c35] hover:underline">
          <Plus className="h-4 w-4" /> Add condition
        </button>
      </FieldGroup>
    </div>
  );
}

// ── Scope of Work ─────────────────────────────────────────────────────────────
function ScopeEditor({ section, onChange }: { section: ProposalTemplate["scopeOfWork"]; onChange: (v: ProposalTemplate["scopeOfWork"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  function addItem() { set("items", [...section.items, ""]); }
  function updateItem(i: number, val: string) {
    const items = [...section.items];
    items[i] = val;
    set("items", items);
  }
  function removeItem(i: number) {
    set("items", section.items.filter((_, idx) => idx !== i));
  }
  return (
    <div>
      <SectionEditorHeader title="Scope of Work" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Intro Text">
        <Textarea value={section.introText} onChange={(v) => set("introText", v)} rows={3} />
      </FieldGroup>
      <FieldGroup label="Work Items">
        <div className="space-y-2">
          {section.items.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f5f8fa] text-xs font-bold text-gray-500 mt-1.5">{i + 1}</span>
              <textarea
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                rows={2}
                className="flex-1 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
                placeholder={`Work item ${i + 1}`}
              />
              <button onClick={() => removeItem(i)} className="rounded-md border border-red-200 p-2 text-red-400 hover:bg-red-50 self-start mt-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-[#ff5c35] hover:underline">
          <Plus className="h-4 w-4" /> Add scope item
        </button>
      </FieldGroup>
    </div>
  );
}

// ── Materials & Specs ─────────────────────────────────────────────────────────
function MaterialsEditor({ section, onChange }: { section: ProposalTemplate["materialsSpecs"]; onChange: (v: ProposalTemplate["materialsSpecs"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  function addItem() {
    const newItem: MaterialItem = { id: makeId(), category: "", product: "", brand: "", warranty: "", notes: "" };
    set("items", [...section.items, newItem]);
  }
  function updateItem(id: string, field: keyof MaterialItem, val: string) {
    set("items", section.items.map((item) => item.id === id ? { ...item, [field]: val } : item));
  }
  function removeItem(id: string) {
    set("items", section.items.filter((item) => item.id !== id));
  }
  return (
    <div>
      <SectionEditorHeader title="Materials & Specifications" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Intro Text">
        <Textarea value={section.introText} onChange={(v) => set("introText", v)} rows={3} />
      </FieldGroup>
      <FieldGroup label="Materials Table">
        <div className="space-y-3">
          {section.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-[#d9e2ec] p-3">
              <div className="mb-2 flex items-center justify-between">
                <Input value={item.category} onChange={(v) => updateItem(item.id, "category", v)} placeholder="Category (e.g. Shingles)" />
                <button onClick={() => removeItem(item.id)} className="ml-2 shrink-0 text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input value={item.product} onChange={(e) => updateItem(item.id, "product", e.target.value)} placeholder="Product name" className="rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm outline-none focus:border-[#ff5c35]" />
                <input value={item.brand} onChange={(e) => updateItem(item.id, "brand", e.target.value)} placeholder="Brand" className="rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm outline-none focus:border-[#ff5c35]" />
                <input value={item.warranty} onChange={(e) => updateItem(item.id, "warranty", e.target.value)} placeholder="Warranty" className="rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm outline-none focus:border-[#ff5c35]" />
                <input value={item.notes} onChange={(e) => updateItem(item.id, "notes", e.target.value)} placeholder="Notes" className="rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm outline-none focus:border-[#ff5c35]" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1.5 text-sm text-[#ff5c35] hover:underline">
          <Plus className="h-4 w-4" /> Add material
        </button>
      </FieldGroup>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function TimelineEditor({ section, onChange }: { section: ProposalTemplate["timeline"]; onChange: (v: ProposalTemplate["timeline"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  function addPhase() {
    const newPhase: TimelinePhase = { id: makeId(), name: "", description: "" };
    set("phases", [...section.phases, newPhase]);
  }
  function updatePhase(id: string, field: keyof TimelinePhase, val: string) {
    set("phases", section.phases.map((p) => p.id === id ? { ...p, [field]: val } : p));
  }
  function removePhase(id: string) {
    set("phases", section.phases.filter((p) => p.id !== id));
  }
  return (
    <div>
      <SectionEditorHeader title="Project Timeline" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <div className="mb-5 grid grid-cols-2 gap-4">
        <FieldGroup label="Estimated Days on Site">
          <input
            type="number"
            min={1}
            value={section.estimatedDays}
            onChange={(e) => set("estimatedDays", Number(e.target.value))}
            className="w-full rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]"
          />
        </FieldGroup>
      </div>
      <FieldGroup label="Intro Text">
        <Textarea value={section.introText} onChange={(v) => set("introText", v)} rows={3} />
      </FieldGroup>
      <FieldGroup label="Phases">
        <div className="space-y-3">
          {section.phases.map((phase, i) => (
            <div key={phase.id} className="rounded-lg border border-[#d9e2ec] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">Phase {i + 1}</span>
                <button onClick={() => removePhase(phase.id)} className="ml-auto text-red-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input value={phase.name} onChange={(e) => updatePhase(phase.id, "name", e.target.value)} placeholder="Phase name" className="mb-2 w-full rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm font-medium outline-none focus:border-[#ff5c35]" />
              <textarea value={phase.description} onChange={(e) => updatePhase(phase.id, "description", e.target.value)} rows={3} placeholder="Description" className="w-full rounded-md border border-[#d9e2ec] px-2 py-1.5 text-sm outline-none focus:border-[#ff5c35]" />
            </div>
          ))}
        </div>
        <button onClick={addPhase} className="mt-3 flex items-center gap-1.5 text-sm text-[#ff5c35] hover:underline">
          <Plus className="h-4 w-4" /> Add phase
        </button>
      </FieldGroup>
    </div>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function PricingEditor({ section, onChange }: { section: ProposalTemplate["pricing"]; onChange: (v: ProposalTemplate["pricing"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  return (
    <div>
      <SectionEditorHeader title="Investment / Pricing" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Intro Text">
        <Textarea value={section.introText} onChange={(v) => set("introText", v)} rows={3} />
      </FieldGroup>
      <FieldGroup label="Allowances & Exclusions Text">
        <Textarea value={section.allowancesText} onChange={(v) => set("allowancesText", v)} rows={3} placeholder="e.g. Price includes up to 3 sheets of decking. Additional boards are extra." />
      </FieldGroup>
      <label className="mb-4 flex items-center gap-3">
        <input type="checkbox" checked={section.showFinancingOption} onChange={(e) => set("showFinancingOption", e.target.checked)} className="accent-[#ff5c35]" />
        <span className="text-sm font-medium text-[#213343]">Show financing option</span>
      </label>
      {section.showFinancingOption && (
        <FieldGroup label="Financing Text">
          <Textarea value={section.financingText} onChange={(v) => set("financingText", v)} rows={3} />
        </FieldGroup>
      )}
    </div>
  );
}

// ── Warranty ──────────────────────────────────────────────────────────────────
function WarrantyEditor({ section, onChange }: { section: ProposalTemplate["warranty"]; onChange: (v: ProposalTemplate["warranty"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  return (
    <div>
      <SectionEditorHeader title="Warranty" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Workmanship Warranty (years)">
        <input type="number" min={1} value={section.workmanshipYears} onChange={(e) => set("workmanshipYears", Number(e.target.value))} className="w-32 rounded-md border border-[#d9e2ec] px-3 py-2 text-sm outline-none focus:border-[#ff5c35]" />
      </FieldGroup>
      <FieldGroup label="Workmanship Warranty Text">
        <Textarea value={section.workmanshipText} onChange={(v) => set("workmanshipText", v)} rows={5} />
      </FieldGroup>
      <FieldGroup label="Manufacturer Warranty Text">
        <Textarea value={section.manufacturerText} onChange={(v) => set("manufacturerText", v)} rows={5} />
      </FieldGroup>
    </div>
  );
}

// ── Terms ─────────────────────────────────────────────────────────────────────
function TermsEditor({ section, onChange }: { section: ProposalTemplate["terms"]; onChange: (v: ProposalTemplate["terms"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  return (
    <div>
      <SectionEditorHeader title="Terms & Conditions" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Full Terms Text">
        <Textarea value={section.text} onChange={(v) => set("text", v)} rows={20} />
      </FieldGroup>
    </div>
  );
}

// ── Acceptance ────────────────────────────────────────────────────────────────
function AcceptanceEditor({ section, onChange }: { section: ProposalTemplate["acceptance"]; onChange: (v: ProposalTemplate["acceptance"]) => void }) {
  function set<K extends keyof typeof section>(key: K, val: (typeof section)[K]) {
    onChange({ ...section, [key]: val });
  }
  return (
    <div>
      <SectionEditorHeader title="Acceptance & Authorization" enabled={section.enabled} onToggle={(v) => set("enabled", v)} />
      <FieldGroup label="Contract Intro Text">
        <Textarea value={section.contractIntroText} onChange={(v) => set("contractIntroText", v)} rows={4} />
      </FieldGroup>
      <FieldGroup label="Payment Schedule Text">
        <Textarea value={section.paymentScheduleText} onChange={(v) => set("paymentScheduleText", v)} rows={4} placeholder="e.g. 50% at signing, 50% upon completion." />
      </FieldGroup>
      <FieldGroup label="Payment Portal Link (optional)">
        <Input value={section.paymentLinkUrl} onChange={(v) => set("paymentLinkUrl", v)} placeholder="https://pay.stripe.com/your-link" />
      </FieldGroup>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={section.showFinancingOption} onChange={(e) => set("showFinancingOption", e.target.checked)} className="accent-[#ff5c35]" />
        <span className="text-sm font-medium text-[#213343]">Mention financing option</span>
      </label>
    </div>
  );
}

// ─── CollapseCard ─────────────────────────────────────────────────────────────
function CollapseCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-[#d9e2ec]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-[#f5f8fa] px-4 py-3 text-sm font-medium text-[#213343] hover:bg-[#eef2f6]"
      >
        {title}
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}
