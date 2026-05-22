"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  upsertContact, deleteContact,
  listContactNotes, upsertContactNote, deleteContactNote, type ContactNote,
  listContactFiles, upsertContactFile, deleteContactFile, getContactFileWithData, type ContactFile,
} from "@/lib/supabase/data";
import type { Contact as AppContact } from "@/lib/app-data";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";
import {
  CREW, PROJECT_STATUS, PROPOSAL_STATUS,
  colorForId, fmt$, initials, type Contact, type Project, type Proposal,
} from "../_shared/data";
import { useV2LiveData } from "../_shared/live-data";

function relativeDate(d: Date): string {
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} week${Math.floor(diff / 7) > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FILTER_CHIPS = [
  { id: "all", l: "All" },
  { id: "repeat", l: "Repeat" },
  { id: "premium", l: "Premium" },
  { id: "lead", l: "Leads" },
  { id: "inactive", l: "Inactive" },
] as const;

type FilterId = (typeof FILTER_CHIPS)[number]["id"];

type ActivityLine = { id: string; icon: IconName; color: string; line: ReactNode; ref: string; when: string; date: Date };

export default function ContactsV2() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { contacts, appContacts, projects, proposals, refetch } = useV2LiveData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    customerType: "Homeowner" as AppContact["customerType"],
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const counts = useMemo(() => ({
    all: contacts.length,
    repeat: contacts.filter((c) => c.tags.includes("Repeat")).length,
    premium: contacts.filter((c) => c.tags.includes("Premium")).length,
    lead: contacts.filter((c) => c.tags.includes("Lead")).length,
    inactive: contacts.filter((c) => c.spent === 0).length,
  }), [contacts]);

  const filtered = contacts.filter((c) => {
    if (filter === "repeat" && !c.tags.includes("Repeat")) return false;
    if (filter === "premium" && !c.tags.includes("Premium")) return false;
    if (filter === "lead" && !c.tags.includes("Lead")) return false;
    if (filter === "inactive" && c.spent !== 0) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!(c.name.toLowerCase().includes(q) || c.biz.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  async function saveContact() {
    if (!draft.name.trim()) {
      setError("Contact name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await upsertContact(supabase, {
        id: crypto.randomUUID(),
        name: draft.name.trim(),
        customerType: draft.customerType,
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        address: draft.address.trim(),
        notes: draft.notes.trim(),
        leadStage: "New",
        createdAt: new Date().toISOString(),
      });
      setDraft({ name: "", customerType: "Homeowner", phone: "", email: "", address: "", notes: "" });
      setShowNew(false);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  }

  if (selectedId) {
    const contact = contacts.find((c) => c.id === selectedId);
    if (!contact) {
      setSelectedId(null);
      return null;
    }
    return (
      <V2Shell>
        <ContactDetail
          contact={contact}
          appContact={appContacts.find((a) => a.id === contact.id) ?? null}
          projects={projects}
          proposals={proposals}
          tab={tab}
          setTab={setTab}
          onBack={() => setSelectedId(null)}
          supabase={supabase}
          refetch={refetch}
        />
      </V2Shell>
    );
  }

  return (
    <V2Shell>
      <div className="contacts-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">CRM</div>
            <h1 className="page-title">Contacts</h1>
            <div className="page-sub">{contacts.length} contacts · {counts.repeat} repeat · {counts.premium} premium</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost"><Icon name="copy" size={14} /> Import CSV</button>
            <button className="btn primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} /> Add contact</button>
          </div>
        </div>

        <div className="contacts-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input placeholder="Search by name, business, city, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ position: "relative" }}>
            <button
              className={`btn ghost ${filter !== "all" ? "active" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="filter" size={13} />
              {filter === "all" ? "Filter" : FILTER_CHIPS.find((c) => c.id === filter)?.l}
              {filter !== "all" && (
                <span style={{ background: "var(--ink)", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px" }}>
                  {counts[filter]}
                </span>
              )}
              <Icon name="chevron-d" size={11} />
            </button>
            {filterOpen && (
              <div
                style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 120, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 180, padding: "6px 0" }}
                onMouseLeave={() => setFilterOpen(false)}
              >
                {FILTER_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => { setFilter(chip.id); setFilterOpen(false); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: filter === chip.id ? "var(--line)" : "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ink)", gap: 8 }}
                  >
                    <span>{chip.l}</span>
                    <span style={{ background: "var(--line)", borderRadius: 99, fontSize: 11, padding: "1px 7px", color: "var(--ink-2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                      {counts[chip.id]}
                    </span>
                  </button>
                ))}
                {filter !== "all" && (
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
                    <button
                      onClick={() => { setFilter("all"); setFilterOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--ink-3)" }}
                    >
                      <Icon name="x" size={11} /> Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="contacts-table">
          <div className="ct-hdr">
            <div>Contact</div>
            <div className="ct-col-biz">Business</div>
            <div className="ct-col-city">City</div>
            <div className="ct-col-phone">Phone</div>
            <div className="ct-col-num" style={{ textAlign: "right" }}>Projects</div>
            <div style={{ textAlign: "right" }}>Total spent</div>
            <div className="ct-col-last" style={{ textAlign: "right" }}>Since</div>
            <div></div>
          </div>
          {filtered.length === 0 ? (
            <div className="contacts-empty">No contacts match these filters.</div>
          ) : filtered.map((c) => (
            <div key={c.id} className="ct-row" onClick={() => { setSelectedId(c.id); setTab("overview"); }}>
              <div className="ct-cell-name">
                <div className="avatar" style={{ background: colorForId(c.id) }}>{initials(c.name)}</div>
                <div className="meta">
                  <div className="nm">{c.name}</div>
                  <div className="sub">{c.email}</div>
                </div>
              </div>
              <div className="ct-cell-biz ct-col-biz">{c.biz}</div>
              <div className="ct-cell-city ct-col-city">{c.addr}</div>
              <div className="ct-cell-phone ct-col-phone">{c.phone}</div>
              <div className="ct-cell-num ct-col-num">{c.projects}</div>
              <div className="ct-cell-spent">{c.spent > 0 ? fmt$(c.spent) : <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>—</span>}</div>
              <div className="ct-cell-last ct-col-last">
                {c.since ? new Date(c.since + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }) : "—"}
              </div>
              <div className="ct-cell-actions">
                <button className="icon-btn" style={{ width: 28, height: 28, border: "none", background: "transparent" }} onClick={(e) => e.stopPropagation()}>
                  <Icon name="more" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showNew && (
        <ContactDrawer
          draft={draft}
          error={error}
          saving={saving}
          onChange={setDraft}
          onClose={() => setShowNew(false)}
          onSave={saveContact}
        />
      )}
    </V2Shell>
  );
}

function ContactDrawer({
  draft,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  draft: {
    name: string;
    customerType: AppContact["customerType"];
    phone: string;
    email: string;
    address: string;
    notes: string;
  };
  error: string;
  saving: boolean;
  onChange: (draft: {
    name: string;
    customerType: AppContact["customerType"];
    phone: string;
    email: string;
    address: string;
    notes: string;
  }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const patch = (updates: Partial<typeof draft>) => onChange({ ...draft, ...updates });

  return (
    <div className="product-drawer-backdrop" onMouseDown={onClose}>
      <aside className="product-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="product-drawer-head">
          <div>
            <div className="page-eyebrow">CRM</div>
            <h2>New contact</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close contact drawer">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="product-drawer-body">
          <div className="ss-field">
            <label>Contact name</label>
            <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Marisol Rivera" />
          </div>
          <div className="ss-field">
            <label>Customer type</label>
            <select value={draft.customerType} onChange={(e) => patch({ customerType: e.target.value as AppContact["customerType"] })}>
              <option value="Homeowner">Homeowner</option>
              <option value="Business">Business</option>
              <option value="Property Manager">Property Manager</option>
            </select>
          </div>
          <div className="field-grid">
            <div className="ss-field">
              <label>Phone</label>
              <input value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="(203) 555-0118" />
            </div>
            <div className="ss-field">
              <label>Email</label>
              <input value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="client@email.com" />
            </div>
          </div>
          <div className="ss-field">
            <label>Address</label>
            <input value={draft.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Stamford, CT" />
          </div>
          <div className="ss-field">
            <label>Internal notes</label>
            <textarea value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Preferred communication, lead source, follow-up notes..." rows={5} />
          </div>
          {error && <div className="auth-alert error">{error}</div>}
        </div>

        <div className="product-drawer-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save contact"}</button>
        </div>
      </aside>
    </div>
  );
}

function ContactDetail({
  contact,
  appContact,
  projects: allProjects,
  proposals: allProposals,
  tab,
  setTab,
  onBack,
  supabase,
  refetch,
}: {
  contact: Contact;
  appContact: AppContact | null;
  projects: Project[];
  proposals: Proposal[];
  tab: string;
  setTab: (t: string) => void;
  onBack: () => void;
  supabase: ReturnType<typeof createSupabaseBrowserClient>;
  refetch: () => void;
}) {
  const c = contact;
  const projects = allProjects.filter((p) => p.contactId === c.id);
  const proposals = allProposals.filter((p) => p.contactId === c.id);

  // Synthesize activity from real proposals + projects
  const activity = useMemo((): ActivityLine[] => {
    const lines: ActivityLine[] = [];
    proposals.forEach((p) => {
      const d = p.sent ? new Date(p.sent) : null;
      if (!d) return;
      const icon: IconName = p.status === "accepted" ? "check" : p.status === "declined" ? "x" : p.status === "viewed" ? "eye" : "send";
      const color = p.status === "accepted" ? "green" : p.status === "declined" ? "rose" : p.status === "viewed" ? "teal" : "blue";
      const label = p.status === "accepted" ? "Accepted" : p.status === "declined" ? "Declined" : p.status === "viewed" ? "Viewed" : "Sent";
      lines.push({ id: `p-${p.id}`, icon, color, line: <>{label} proposal <b>{p.id}</b></>, ref: p.status === "accepted" ? fmt$(p.value) : "", when: relativeDate(d), date: d });
    });
    projects.forEach((p) => {
      const d = p.start ? new Date(p.start) : null;
      if (!d) return;
      const label = p.status === "completed" || p.status === "paid" ? "Completed project" : p.status === "in_progress" ? "Started project" : "Scheduled project";
      lines.push({ id: `pr-${p.id}`, icon: "briefcase", color: "gold", line: <>{label} <b>{p.title}</b></>, ref: fmt$(p.value), when: relativeDate(d), date: d });
    });
    return lines.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [proposals, projects]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDraft, setEditDraft] = useState({
    name: c.name,
    customerType: (appContact?.customerType ?? "Homeowner") as AppContact["customerType"],
    phone: c.phone,
    email: c.email,
    address: c.addr,
    notes: appContact?.notes ?? "",
  });

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openProposals = allProposals.filter(
    (p) => p.contactId === c.id && !["accepted", "declined"].includes(p.status)
  );
  const activeProjects = allProjects.filter(
    (p) => p.contactId === c.id && !["completed", "invoiced", "paid"].includes(p.status)
  );
  const hasPending = openProposals.length > 0 || activeProjects.length > 0;

  async function handleSaveEdit() {
    if (!editDraft.name.trim()) { setEditError("Name is required."); return; }
    setEditSaving(true);
    setEditError("");
    try {
      await upsertContact(supabase, {
        id: c.id,
        name: editDraft.name.trim(),
        customerType: editDraft.customerType,
        phone: editDraft.phone.trim(),
        email: editDraft.email.trim(),
        address: editDraft.address.trim(),
        notes: editDraft.notes,
        leadStage: appContact?.leadStage ?? "New",
        createdAt: appContact?.createdAt ?? new Date().toISOString(),
      });
      setEditOpen(false);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteContact(supabase, c.id);
      onBack();
      refetch();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete contact.");
      setDeleting(false);
    }
  }

  const totalProjectValue = projects.reduce((a, p) => a + p.value, 0);
  const avgProjectValue = projects.length ? Math.round(totalProjectValue / projects.length) : 0;

  const tabs: { id: string; l: string; icon: IconName; count?: number }[] = [
    { id: "overview",  l: "Overview",  icon: "eye" },
    { id: "projects",  l: "Projects",  icon: "briefcase", count: projects.length },
    { id: "proposals", l: "Proposals", icon: "send",      count: proposals.length },
    { id: "activity",  l: "Activity",  icon: "clock",     count: activity.length },
    { id: "files",     l: "Files",     icon: "image" },
    { id: "notes",     l: "Notes",     icon: "edit" },
  ];

  return (
    <div className="contacts-page view">
      <div className="cd-back-bar">
        <button className="cd-back-btn" onClick={onBack}>
          <Icon name="chevron-l" size={14} /> Back to contacts
        </button>
        <div className="cd-action-row">
          <button className="btn ghost" onClick={() => { setEditDraft({ name: c.name, customerType: appContact?.customerType ?? "Homeowner", phone: c.phone, email: c.email, address: c.addr, notes: appContact?.notes ?? "" }); setEditOpen(true); }}>
            <Icon name="edit" size={13} /> Edit
          </button>
          <button className="btn ghost" style={{ color: "var(--rose)" }} onClick={() => { setDeleteInput(""); setDeleteError(""); setDeleteOpen(true); }}>
            <Icon name="x" size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="cd-hero">
        <div className="hero-row">
          <div className="avatar-lg" style={{ background: colorForId(c.id) }}>{initials(c.name)}</div>
          <div>
            <h2 className="name">{c.name}</h2>
            <div className="biz"><b>{c.biz}</b> · {c.addr}</div>
          </div>
        </div>
        <div className="cd-hero-actions">
          {c.phone ? (
            <a href={`tel:${c.phone}`} className="cd-hero-btn"><Icon name="phone" size={13} /> Call</a>
          ) : (
            <button className="cd-hero-btn" disabled style={{ opacity: 0.4 }}><Icon name="phone" size={13} /> Call</button>
          )}
          {c.email ? (
            <a href={`mailto:${c.email}`} className="cd-hero-btn"><Icon name="mail" size={13} /> Email</a>
          ) : (
            <button className="cd-hero-btn" disabled style={{ opacity: 0.4 }}><Icon name="mail" size={13} /> Email</button>
          )}
          <Link href={`/builder?contactId=${c.id}`} className="cd-hero-btn primary">
            <Icon name="send" size={13} /> New proposal
          </Link>
        </div>
      </div>

      <div className="cd-stats-row">
        <div className="cd-stat-cell">
          <div className="l">Total spent</div>
          <div className="v">{c.spent > 0 ? fmt$(c.spent) : "—"}</div>
          <div className="sub-s">Lifetime value</div>
        </div>
        <div className="cd-stat-cell">
          <div className="l">Projects</div>
          <div className="v">{c.projects}</div>
          <div className="sub-s">
            {projects.filter((p) => p.status === "paid").length} paid ·{" "}
            {projects.filter((p) => !["paid", "completed", "invoiced"].includes(p.status)).length} active
          </div>
        </div>
        <div className="cd-stat-cell">
          <div className="l">Avg project</div>
          <div className="v">{avgProjectValue > 0 ? fmt$(avgProjectValue) : "—"}</div>
          <div className="sub-s">Per job</div>
        </div>
        <div className="cd-stat-cell">
          <div className="l">Proposals</div>
          <div className="v">{proposals.length}</div>
          <div className="sub-s">
            {proposals.filter((p) => p.status === "accepted").length} accepted ·{" "}
            {proposals.filter((p) => ["sent", "viewed", "followup"].includes(p.status)).length} pending
          </div>
        </div>
        <div className="cd-stat-cell">
          <div className="l">Customer since</div>
          <div className="v">{new Date(c.since + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>
          <div className="sub-s">{Math.floor((Date.now() - new Date(c.since + "-01").getTime()) / (1000 * 60 * 60 * 24 * 30))} months</div>
        </div>
      </div>

      <div className="cd-tabs">
        {tabs.map((tt) => (
          <button key={tt.id} className={`cd-tab ${tab === tt.id ? "active" : ""}`} onClick={() => setTab(tt.id)}>
            <Icon name={tt.icon} size={13} />
            {tt.l}
            {tt.count !== undefined && <span className="ct-pill">{tt.count}</span>}
          </button>
        ))}
      </div>

      <div className="cd-content">
        {tab === "overview" && <OverviewTab c={c} projects={projects} proposals={proposals} onEdit={() => { setEditDraft({ name: c.name, customerType: appContact?.customerType ?? "Homeowner", phone: c.phone, email: c.email, address: c.addr, notes: appContact?.notes ?? "" }); setEditOpen(true); }} />}
        {tab === "projects" && <ProjectsTab projects={projects} />}
        {tab === "proposals" && <ProposalsTab proposals={proposals} />}
        {tab === "activity" && <ActivityTab activity={activity} />}
        {tab === "files" && <FilesTab contactId={c.id} supabase={supabase} />}
        {tab === "notes" && <NotesTab contactId={c.id} supabase={supabase} />}
      </div>

      {/* Edit drawer */}
      {editOpen && (
        <div className="product-drawer-backdrop" onMouseDown={() => setEditOpen(false)}>
          <aside className="product-drawer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="product-drawer-head">
              <div><div className="page-eyebrow">CRM</div><h2>Edit contact</h2></div>
              <button className="icon-btn" onClick={() => setEditOpen(false)}><Icon name="x" size={16} /></button>
            </div>
            <div className="product-drawer-body">
              <div className="ss-field"><label>Contact name</label><input value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} /></div>
              <div className="ss-field">
                <label>Customer type</label>
                <select value={editDraft.customerType} onChange={(e) => setEditDraft((d) => ({ ...d, customerType: e.target.value as AppContact["customerType"] }))}>
                  <option value="Homeowner">Homeowner</option>
                  <option value="Business">Business</option>
                  <option value="Property Manager">Property Manager</option>
                </select>
              </div>
              <div className="field-grid">
                <div className="ss-field"><label>Phone</label><input value={editDraft.phone} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} /></div>
                <div className="ss-field"><label>Email</label><input value={editDraft.email} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} /></div>
              </div>
              <div className="ss-field"><label>Address</label><input value={editDraft.address} onChange={(e) => setEditDraft((d) => ({ ...d, address: e.target.value }))} /></div>
              <div className="ss-field"><label>Internal notes</label><textarea value={editDraft.notes} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} rows={4} /></div>
              {editError && <div className="auth-alert error">{editError}</div>}
            </div>
            <div className="product-drawer-foot">
              <button className="btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={editSaving} onClick={handleSaveEdit}>{editSaving ? "Saving..." : "Save changes"}</button>
            </div>
          </aside>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="product-drawer-backdrop" onMouseDown={() => setDeleteOpen(false)}>
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 28, width: 440, maxWidth: "92vw", boxShadow: "0 24px 64px rgba(0,0,0,.18)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--rose)", marginBottom: 4 }}>Danger zone</div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Delete {c.name}?</h3>
              </div>
              <button className="icon-btn" onClick={() => setDeleteOpen(false)}><Icon name="x" size={16} /></button>
            </div>

            {hasPending && (
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
                <b style={{ color: "#C2410C" }}>This contact has pending activity:</b>
                {openProposals.length > 0 && <div style={{ marginTop: 4, color: "#C2410C" }}>· {openProposals.length} open proposal{openProposals.length > 1 ? "s" : ""}</div>}
                {activeProjects.length > 0 && <div style={{ marginTop: 2, color: "#C2410C" }}>· {activeProjects.length} active project{activeProjects.length > 1 ? "s" : ""}</div>}
                <div style={{ marginTop: 6, color: "#7C2D12" }}>Deleting will permanently remove the contact and all associated data.</div>
              </div>
            )}

            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 16, lineHeight: 1.55 }}>
              This action is <b>permanent</b> and cannot be undone. To confirm, type the contact&apos;s name below:
            </p>
            <div style={{ background: "var(--bg-tint)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 13, color: "var(--ink-2)" }}>
              {c.name}
            </div>
            <input
              autoFocus
              placeholder={`Type "${c.name}" to confirm`}
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
            />
            {deleteError && <div className="auth-alert error" style={{ marginBottom: 12 }}>{deleteError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button
                className="btn"
                disabled={deleteInput !== c.name || deleting}
                onClick={handleDelete}
                style={{ background: deleteInput === c.name ? "var(--rose)" : "var(--line)", color: deleteInput === c.name ? "#fff" : "var(--ink-3)", border: "none", cursor: deleteInput === c.name ? "pointer" : "not-allowed" }}
              >
                {deleting ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ c, projects, proposals, onEdit }: { c: Contact; projects: Project[]; proposals: Proposal[]; onEdit: () => void }) {
  const latestProj = projects[0];
  const latestProp = proposals[0];
  return (
    <div className="ov-grid">
      <div className="ov-panel">
        <h3>Contact info <button className="edit" onClick={onEdit}><Icon name="edit" size={11} /> Edit</button></h3>
        <div className="ov-info-row">
          <div className="ico"><Icon name="mail" size={14} /></div>
          <div className="meta"><div className="l2">Email</div><div className="v2text">{c.email}</div></div>
        </div>
        <div className="ov-info-row">
          <div className="ico"><Icon name="phone" size={14} /></div>
          <div className="meta"><div className="l2">Phone</div><div className="v2text">{c.phone}</div></div>
        </div>
        <div className="ov-info-row">
          <div className="ico"><Icon name="map" size={14} /></div>
          <div className="meta"><div className="l2">Address</div><div className="v2text">{c.addr}</div></div>
        </div>
        <div className="ov-info-row">
          <div className="ico"><Icon name="building" size={14} /></div>
          <div className="meta"><div className="l2">Business</div><div className="v2text">{c.biz}</div></div>
        </div>
      </div>

      <div className="ov-panel">
        <h3>Latest activity</h3>
        {latestProj && (
          <div className="ov-info-row" style={{ cursor: "pointer" }}>
            <div className="ico" style={{ background: "var(--gold-bg)", color: "var(--gold-deep)" }}><Icon name="briefcase" size={14} /></div>
            <div className="meta">
              <div className="l2">Most recent project</div>
              <div className="v2text">{latestProj.title} · <span className="mono" style={{ color: "var(--ink-3)", fontWeight: 400 }}>{latestProj.id}</span></div>
            </div>
            <span className={`pill ${PROJECT_STATUS[latestProj.status]?.color}`}><span className="dot"></span>{PROJECT_STATUS[latestProj.status]?.label}</span>
          </div>
        )}
        {latestProp && (
          <div className="ov-info-row" style={{ cursor: "pointer" }}>
            <div className="ico" style={{ background: "var(--blue-bg)", color: "var(--blue)" }}><Icon name="send" size={14} /></div>
            <div className="meta">
              <div className="l2">Most recent proposal</div>
              <div className="v2text">{latestProp.title}</div>
            </div>
            <span className="mono" style={{ color: "var(--gold-deep)", fontWeight: 700, fontSize: 13 }}>{fmt$(latestProp.value)}</span>
          </div>
        )}
        {!latestProj && !latestProp && (
          <div style={{ padding: "18px 0", color: "var(--ink-3)", fontSize: 12.5, textAlign: "center" }}>No activity yet.</div>
        )}
      </div>

      <div className="ov-panel" style={{ gridColumn: "1/-1" }}>
        <h3>Summary</h3>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
          <b style={{ color: "var(--ink)" }}>{c.name}</b> has been a customer since{" "}
          <b style={{ color: "var(--ink)" }}>
            {new Date(c.since + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </b>
          {c.spent > 0 ? (
            <> and has spent a total of <b style={{ color: "var(--gold-deep)" }}>{fmt$(c.spent)}</b> across {c.projects} {c.projects === 1 ? "project" : "projects"}</>
          ) : " and has no completed projects yet"}.
          {c.tags.includes("Premium") && <> Tagged as <b style={{ color: "var(--ink)" }}>Premium</b> — prioritize quick responses and premium materials. </>}
          {c.tags.includes("Repeat") && <>Frequent repeat customer — consider offering a loyalty discount on the next job.</>}
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects }: { projects: Project[] }) {
  if (!projects.length) return <EmptyTab icon="briefcase" title="No projects yet" desc="When you start a project for this contact, it will show up here." />;
  return (
    <div className="cd-table">
      <div className="cd-table-hdr cd-projects-grid">
        <div>Project #</div>
        <div>Job</div>
        <div>Crew</div>
        <div style={{ textAlign: "right" }}>Value</div>
        <div>Status</div>
        <div></div>
      </div>
      {projects.map((p) => (
        <div key={p.id} className="cd-table-row cd-projects-grid">
          <div className="ref-c">{p.id}</div>
          <div className="ttl-c">{p.title}<span className="sub-c">{p.start} → {p.due} · {Math.round(p.progress * 100)}% complete</span></div>
          <div style={{ display: "flex" }}>
            {p.crew.slice(0, 3).map((cm, i) => (
              <div key={cm} className="avatar sm" style={{ background: CREW[cm]?.color, width: 22, height: 22, fontSize: 9, marginLeft: i === 0 ? 0 : -6, border: "2px solid #fff" }}>
                {cm}
              </div>
            ))}
          </div>
          <div className="val-c">{fmt$(p.value)}</div>
          <div><span className={`pill ${PROJECT_STATUS[p.status]?.color}`}><span className="dot"></span>{PROJECT_STATUS[p.status]?.label}</span></div>
          <div style={{ textAlign: "right" }}><Icon name="chevron-r" size={14} /></div>
        </div>
      ))}
    </div>
  );
}

function ProposalsTab({ proposals }: { proposals: Proposal[] }) {
  if (!proposals.length) return <EmptyTab icon="send" title="No proposals yet" desc="When you build a proposal for this contact, it will appear here." />;
  return (
    <div className="cd-table">
      <div className="cd-table-hdr cd-proposals-grid">
        <div>Proposal #</div>
        <div>Job</div>
        <div style={{ textAlign: "right" }}>Value</div>
        <div>Status</div>
        <div style={{ textAlign: "right" }}>Margin</div>
        <div></div>
      </div>
      {proposals.map((p) => (
        <div key={p.id} className="cd-table-row cd-proposals-grid">
          <div className="ref-c">{p.id}</div>
          <div className="ttl-c">{p.title}<span className="sub-c">{p.items} items · {p.sent ? `sent ${p.sent}` : "draft"}</span></div>
          <div className="val-c">{fmt$(p.value)}</div>
          <div><span className={`pill ${PROPOSAL_STATUS[p.status]?.color}`}><span className="dot"></span>{PROPOSAL_STATUS[p.status]?.label}</span></div>
          <div className="val-c" style={{ color: "var(--gold-deep)" }}>{p.margin}%</div>
          <div style={{ textAlign: "right" }}><Icon name="chevron-r" size={14} /></div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityLine[] }) {
  if (!activity.length) return <EmptyTab icon="clock" title="No activity yet" desc="Activity will appear here as you send proposals and start projects for this contact." />;
  return (
    <div className="timeline">
      {activity.map((a) => (
        <div key={a.id} className={`tl-row ${a.color}`}>
          <div className="ico-circ"><Icon name={a.icon} size={15} /></div>
          <div className="meta">
            <div className="line1">{a.line}</div>
            <div className="line2">{a.when}</div>
          </div>
          {a.ref && <div className="when" style={{ fontWeight: 700, color: "var(--gold-deep)" }}>{a.ref}</div>}
        </div>
      ))}
    </div>
  );
}

function FilesTab({ contactId, supabase }: { contactId: string; supabase: ReturnType<typeof createSupabaseBrowserClient> }) {
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    listContactFiles(supabase, contactId).then(setFiles).finally(() => setLoading(false));
  }, [contactId, supabase]);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
      const newFile: ContactFile = {
        id: crypto.randomUUID(),
        contactId,
        name: file.name,
        ext,
        mimeType: file.type,
        sizeBytes: file.size,
        dataUrl: reader.result as string,
        createdAt: new Date().toISOString(),
      };
      try {
        await upsertContactFile(supabase, newFile);
        setFiles((prev) => [{ ...newFile, dataUrl: undefined }, ...prev]);
      } catch { /* silently ignore */ }
      setUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleDownload(fileId: string) {
    const full = await getContactFileWithData(supabase, fileId);
    if (!full?.dataUrl) return;
    const a = document.createElement("a");
    a.href = full.dataUrl;
    a.download = full.name;
    a.click();
  }

  async function handleDelete(fileId: string) {
    await deleteContactFile(supabase, fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  function fmtSize(bytes: number) {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
    return `${bytes} B`;
  }

  const iconForExt = (ext: string): IconName => {
    const e = ext.toLowerCase();
    if (e === "pdf") return "copy";
    if (["jpg", "jpeg", "png", "gif", "webp", "zip"].includes(e)) return "image";
    return "copy";
  };

  if (loading) return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading files…</div>;

  return (
    <>
      <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleUpload} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{files.length} file{files.length !== 1 ? "s" : ""}</div>
        <button className="btn ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Icon name="plus" size={13} /> {uploading ? "Uploading…" : "Upload file"}
        </button>
      </div>
      {files.length === 0
        ? <EmptyTab icon="image" title="No files yet" desc="Upload contracts, photos, or any document related to this contact." />
        : (
          <div className="files-grid">
            {files.map((f) => (
              <div key={f.id} className="file-card" style={{ position: "relative" }}>
                <div className={`file-thumb ${f.ext.toLowerCase() === "pdf" ? "pdf" : ""}`}>
                  <Icon name={iconForExt(f.ext)} size={28} />
                  <div className="ext-tag">{f.ext || "FILE"}</div>
                </div>
                <div className="file-meta">
                  <div className="nm-f" title={f.name}>{f.name}</div>
                  <div className="sub-f">{fmtSize(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  <button className="btn ghost" style={{ flex: 1, fontSize: 11.5, padding: "4px 8px" }} onClick={() => handleDownload(f.id)}>
                    <Icon name="copy" size={11} /> Download
                  </button>
                  <button className="icon-btn" style={{ color: "var(--rose)", border: "1px solid var(--line)", borderRadius: 8, width: 28, height: 28 }} onClick={() => handleDelete(f.id)}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </>
  );
}

function NotesTab({ contactId, supabase }: { contactId: string; supabase: ReturnType<typeof createSupabaseBrowserClient> }) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    listContactNotes(supabase, contactId).then(setNotes).finally(() => setLoading(false));
  }, [contactId, supabase]);

  const isTask = draft.trimStart().startsWith("[]");

  async function saveNote() {
    const body = isTask ? draft.replace(/^\[\]\s*/, "").trim() : draft.trim();
    if (!body) return;
    setSaving(true);
    const note: ContactNote = {
      id: crypto.randomUUID(),
      contactId,
      kind: isTask ? "task" : "note",
      body,
      done: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await upsertContactNote(supabase, note);
      setNotes((prev) => [note, ...prev]);
      setDraft("");
    } catch { /* silently ignore */ }
    setSaving(false);
  }

  async function toggleDone(note: ContactNote) {
    const updated = { ...note, done: !note.done };
    setNotes((prev) => prev.map((n) => n.id === note.id ? updated : n));
    await upsertContactNote(supabase, updated);
  }

  async function removeNote(noteId: string) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await deleteContactNote(supabase, noteId);
  }

  if (loading) return <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading notes…</div>;

  return (
    <>
      <div className="notes-add">
        <textarea
          placeholder="Write a note… start with [] to create a task"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void saveNote(); } }}
        />
        <div className="footer-add">
          <div className="hint">⌘+Enter to save{isTask ? " · Task detected" : " · Start with [] for a task"}</div>
          <button className="btn primary" disabled={!draft.trim() || saving} onClick={saveNote}>
            <Icon name="check" size={13} /> {saving ? "Saving…" : "Save note"}
          </button>
        </div>
      </div>
      {notes.length === 0
        ? <EmptyTab icon="edit" title="No notes yet" desc="Add notes or tasks to keep track of important details about this contact." />
        : notes.map((n) => (
          <div key={n.id} className={`note-card ${n.kind} ${n.done ? "done" : ""}`}>
            <div className="head-n">
              <div className="who-n">
                {n.kind === "task" && (
                  <button onClick={() => toggleDone(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", marginRight: 4 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid", borderColor: n.done ? "var(--gold)" : "var(--ink-3)", background: n.done ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {n.done && <Icon name="check" size={10} />}
                    </div>
                  </button>
                )}
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>{n.kind === "task" ? "Task" : "Note"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                  {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <button className="icon-btn" style={{ width: 22, height: 22, color: "var(--ink-3)" }} onClick={() => removeNote(n.id)}>
                  <Icon name="x" size={11} />
                </button>
              </div>
            </div>
            <div className="body-n" style={{ textDecoration: n.done ? "line-through" : "none", color: n.done ? "var(--ink-3)" : "var(--ink)" }}>{n.body}</div>
          </div>
        ))
      }
    </>
  );
}

function EmptyTab({ icon, title, desc }: { icon: IconName; title: string; desc: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "60px 20px", textAlign: "center", color: "var(--ink-3)" }}>
      <Icon name={icon} size={32} />
      <div style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>{title}</div>
      <div style={{ maxWidth: 340, margin: "6px auto 0", fontSize: 13 }}>{desc}</div>
    </div>
  );
}
