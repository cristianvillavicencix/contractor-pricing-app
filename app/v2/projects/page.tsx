"use client";

import { useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { upsertProject } from "@/lib/supabase/data";
import type { ProjectStatus as AppProjectStatus } from "@/lib/app-data";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { CREW, PROJECT_STATUS, colorForId, fmt$, initials, type ProjectStatus } from "../_shared/data";
import { useV2LiveData } from "../_shared/live-data";

const STAGES: { k: ProjectStatus; l: string }[] = [
  { k: "scheduled", l: "Scheduled" },
  { k: "in_progress", l: "In Progress" },
  { k: "on_hold", l: "On Hold" },
  { k: "completed", l: "Completed" },
  { k: "invoiced", l: "Invoiced" },
  { k: "paid", l: "Paid" },
];

const TODAY = new Date();

export default function ProjectsV2() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { projects, appProjects, contacts, settings, contactById, refetch } = useV2LiveData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "stages">("stages");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<ProjectStatus | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ProjectStatus>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const draggedOnceRef = useRef(false);
  const [draft, setDraft] = useState({
    projectName: "",
    contactId: "",
    approvedAmount: "",
    status: "scheduled" as ProjectStatus,
    startDate: "",
    endDate: "",
  });

  const boardProjects = useMemo(
    () => projects.map((project) => ({ ...project, status: statusOverrides[project.id] ?? project.status })),
    [projects, statusOverrides]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: boardProjects.length };
    boardProjects.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [boardProjects]);

  const filtered = boardProjects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!query) return true;
    const c = contactById(p.contactId);
    const q = query.toLowerCase();
    return p.title.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  const active = boardProjects.filter((p) => ["in_progress", "scheduled"].includes(p.status));
  const totalActive = active.reduce((a, p) => a + p.value, 0);
  const completed = boardProjects.filter((p) => ["completed", "invoiced", "paid"].includes(p.status));
  const completedVal = completed.reduce((a, p) => a + p.value, 0);
  const thisMonth = TODAY.toISOString().slice(0, 7);
  const completedThisMonth = completed.filter((p) => (p.due ?? p.start ?? "").slice(0, 7) === thisMonth);
  const selectedProject = selectedProjectId ? boardProjects.find((project) => project.id === selectedProjectId) ?? null : null;

  async function saveProject() {
    const contact = contacts.find((c) => c.id === draft.contactId) ?? contacts[0];
    if (!draft.projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const now = new Date().toISOString();
      await upsertProject(supabase, {
        id: crypto.randomUUID(),
        projectName: draft.projectName.trim(),
        customerName: contact?.name ?? "Customer",
        customerPhone: contact?.phone ?? "",
        customerEmail: contact?.email ?? "",
        address: contact?.addr ?? settings.companyProfile.address,
        city: settings.marketLocation.defaultCity,
        state: settings.marketLocation.defaultState,
        zipCode: settings.marketLocation.defaultZipCode,
        trade: settings.companyProfile.mainTrade === "General Contractor" ? "Remodeling" : settings.companyProfile.mainTrade,
        projectSize: settings.pricingDefaults.defaultProjectSize,
        riskLevel: settings.pricingDefaults.defaultRiskLevel,
        status: toAppProjectStatus(draft.status),
        notes: "",
        costs: {
          materials: 0,
          labor: 0,
          dumpster: 0,
          permits: 0,
          equipment: 0,
          subcontractor: 0,
          miscellaneous: 0,
        },
        approvedAmount: Number(draft.approvedAmount) || 0,
        createdAt: now,
        contactId: contact?.id,
        startDate: draft.startDate || now.slice(0, 10),
        endDate: draft.endDate || undefined,
      });
      setDraft({ projectName: "", contactId: "", approvedAmount: "", status: "scheduled", startDate: "", endDate: "" });
      setShowNew(false);
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(projectId: string, status: ProjectStatus) {
    const source = appProjects.find((project) => project.id === projectId || project.proposalId === projectId);
    setStatusOverrides((current) => ({ ...current, [projectId]: status }));
    if (!source || source.status === toAppProjectStatus(status)) return;
    try {
      await upsertProject(supabase, { ...source, status: toAppProjectStatus(status) });
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update project status.");
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[projectId];
        return next;
      });
    }
  }

  function startDrag(projectId: string) {
    draggedOnceRef.current = true;
    setDraggingId(projectId);
  }

  function endDrag() {
    setDraggingId(null);
    setOverStage(null);
    window.setTimeout(() => {
      draggedOnceRef.current = false;
    }, 0);
  }

  function allowDrop(e: React.DragEvent, stage: ProjectStatus) {
    e.preventDefault();
    setOverStage(stage);
  }

  function dropOnStage(e: React.DragEvent, stage: ProjectStatus) {
    e.preventDefault();
    const projectId = draggingId || e.dataTransfer.getData("text/plain");
    if (!projectId) return;
    void updateStatus(projectId, stage);
    endDrag();
  }

  return (
    <V2Shell>
      <div className="proj-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Operations</div>
            <h1 className="page-title">Projects</h1>
            <div className="page-sub">{active.length} active · {fmt$(totalActive)} in flight</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} /> New project</button>
          </div>
        </div>

        <div className="proj-summary">
          <div className="psum"><div className="l">Active</div><div className="v">{active.length}<small>projects</small></div></div>
          <div className="psum"><div className="l">In flight</div><div className="v">{fmt$(totalActive)}</div></div>
          <div className="psum"><div className="l">Completed this month</div><div className="v">{completedThisMonth.length}</div></div>
          <div className="psum"><div className="l">Revenue closed</div><div className="v">{fmt$(completedVal)}</div></div>
        </div>

        <div className="proj-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input placeholder="Search by customer, job, or project #" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={{ position: "relative" }}>
            <button
              className={`btn ghost ${statusFilter !== "all" ? "active" : ""}`}
              onClick={() => setFilterOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="filter" size={13} />
              {statusFilter === "all" ? "Filter" : STAGES.find((s) => s.k === statusFilter)?.l}
              {statusFilter !== "all" && (
                <span style={{ background: "var(--ink)", color: "#fff", borderRadius: 99, fontSize: 10, padding: "1px 6px" }}>
                  {counts[statusFilter] ?? 0}
                </span>
              )}
              <Icon name="chevron-d" size={11} />
            </button>
            {filterOpen && (
              <div
                style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 120, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 190, padding: "6px 0" }}
                onMouseLeave={() => setFilterOpen(false)}
              >
                {([{ k: "all" as const, l: "All" }, ...STAGES]).map((s) => (
                  <button
                    key={s.k}
                    onClick={() => { setStatusFilter(s.k); setFilterOpen(false); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: statusFilter === s.k ? "var(--line)" : "transparent", border: "none", cursor: "pointer", fontSize: 13, color: "var(--ink)", gap: 8 }}
                  >
                    <span>{s.l}</span>
                    <span style={{ background: "var(--line)", borderRadius: 99, fontSize: 11, padding: "1px 7px", color: "var(--ink-2)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                      {counts[s.k] ?? 0}
                    </span>
                  </button>
                ))}
                {statusFilter !== "all" && (
                  <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
                    <button
                      onClick={() => { setStatusFilter("all"); setFilterOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "7px 14px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12.5, color: "var(--ink-3)" }}
                    >
                      <Icon name="x" size={11} /> Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" size={13} /> List</button>
            <button className={view === "stages" ? "active" : ""} onClick={() => setView("stages")}><Icon name="kanban" size={13} /> Stages</button>
          </div>
        </div>

        {view === "list"
          ? <ProjectsList items={filtered} contactById={contactById} onSelect={(id) => setSelectedProjectId(id)} />
          : null}
        <div className="proj-kanban" style={view === "list" ? { display: "none" } : undefined}>
          {STAGES.map((s) => {
            const cards = filtered.filter((p) => p.status === s.k);
            const color = PROJECT_STATUS[s.k]?.color ?? "dark";
            return (
              <div
                key={s.k}
                className="pk-col"
                onDragOver={(e) => allowDrop(e, s.k)}
                onDragLeave={() => setOverStage((current) => current === s.k ? null : current)}
                onDrop={(e) => dropOnStage(e, s.k)}
                style={overStage === s.k ? { outline: "2px solid var(--gold)", outlineOffset: 2, background: "color-mix(in oklab, var(--gold-bg) 55%, white)" } : undefined}
              >
                <div className="pk-col-head">
                  <span className={`pill ${color}`}><span className="dot"></span>{s.l}</span>
                  <span className="ct">{cards.length}</span>
                </div>
                <div className="pk-body">
                  {cards.length === 0 && <div className="pk-empty">No projects</div>}
                  {cards.map((p) => {
                    const c = contactById(p.contactId);
                    const dueDate = new Date(p.due);
                    const daysLeft = Math.round((dueDate.getTime() - TODAY.getTime()) / 86_400_000);
                    const isLate = daysLeft < 0 && p.progress < 1;
                    const dueLbl =
                      p.progress >= 1 ? "Completed" :
                      isLate ? `${Math.abs(daysLeft)}d late` :
                      daysLeft === 0 ? "Due today" :
                      daysLeft <= 7 ? `${daysLeft}d left` :
                      dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <div
                        key={p.id}
                        className="pk-card"
                        draggable
                        onClick={() => {
                          if (draggedOnceRef.current) return;
                          setSelectedProjectId(p.id);
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", p.id);
                          startDrag(p.id);
                        }}
                        onDragEnd={endDrag}
                        style={draggingId === p.id ? { opacity: 0.55, transform: "rotate(1deg)" } : undefined}
                      >
                        <div className="top">
                          <span className="ref">{p.id}</span>
                          <span className="val">{fmt$(p.value)}</span>
                        </div>
                        <div className="title">{p.title}</div>
                        <div className="contact">
                          <div className="avatar sm" style={{ background: colorForId(c.id || p.contactId), width: 20, height: 20, fontSize: 9 }}>
                            {initials(c.name)}
                          </div>
                          {c.name}
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-meta">
                            <span>{Math.round(p.progress * 100)}% complete</span>
                          </div>
                          <div className="progress-bar"><div className="fill" style={{ width: `${p.progress * 100}%` }}></div></div>
                        </div>
                        <div className="foot">
                          <div className="crew-stack">
                            {p.crew.length === 0 ? (
                              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>No crew assigned</span>
                            ) : p.crew.slice(0, 3).map((cm, i) => (
                              <div key={cm} className="avatar sm" style={{ background: CREW[cm]?.color ?? colorForId(cm), width: 22, height: 22, fontSize: 9, marginLeft: i === 0 ? 0 : -6, border: "2px solid #fff" }}>
                                {cm}
                              </div>
                            ))}
                            {p.crew.length > 3 && (
                              <div className="avatar sm" style={{ background: "#999", width: 22, height: 22, fontSize: 9, marginLeft: -6, border: "2px solid #fff" }}>
                                +{p.crew.length - 3}
                              </div>
                            )}
                          </div>
                          <span className={`due ${isLate ? "late" : ""}`}>
                            <Icon name="clock" size={11} /> {dueLbl}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showNew && (
        <ProjectDrawer
          draft={draft}
          contacts={contacts}
          error={error}
          saving={saving}
          onChange={setDraft}
          onClose={() => setShowNew(false)}
          onSave={saveProject}
        />
      )}
      {selectedProject && (
        <ProjectDetailDrawer
          project={selectedProject}
          contact={contactById(selectedProject.contactId)}
          onClose={() => setSelectedProjectId(null)}
          onStatusChange={(status) => void updateStatus(selectedProject.id, status)}
        />
      )}
    </V2Shell>
  );
}

function ProjectsList({
  items,
  contactById,
  onSelect,
}: {
  items: ReturnType<typeof useV2LiveData>["projects"];
  contactById: (id: string) => ReturnType<typeof useV2LiveData>["contacts"][number];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "60px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13.5 }}>
        No projects match your filters.
      </div>
    );
  }
  return (
    <div className="props-list">
      <div className="hdr" style={{ gridTemplateColumns: "120px 1fr 160px 100px 120px 60px 36px" }}>
        <div>Project #</div>
        <div>Job</div>
        <div>Customer</div>
        <div style={{ textAlign: "right" }}>Value</div>
        <div>Status</div>
        <div>Progress</div>
        <div></div>
      </div>
      {items.map((p) => {
        const c = contactById(p.contactId);
        const status = PROJECT_STATUS[p.status];
        const dueDate = new Date(p.due);
        const daysLeft = Math.round((dueDate.getTime() - TODAY.getTime()) / 86_400_000);
        const isLate = daysLeft < 0 && p.progress < 1;
        return (
          <div key={p.id} className="row" style={{ cursor: "pointer", gridTemplateColumns: "120px 1fr 160px 100px 120px 60px 36px" }} onClick={() => onSelect(p.id)}>
            <div className="ref">{p.id}</div>
            <div className="title">
              {p.title}
              <span className="sub">
                {p.start ? new Date(p.start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                {" → "}
                {p.due ? new Date(p.due).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                {isLate && <span style={{ color: "var(--rose)", marginLeft: 6 }}>{Math.abs(daysLeft)}d late</span>}
              </span>
            </div>
            <div className="contact">
              <div className="avatar sm" style={{ background: colorForId(c.id || p.contactId) }}>{initials(c.name)}</div>
              <div className="meta"><div className="cn">{c.name}</div></div>
            </div>
            <div className="val">{fmt$(p.value)}</div>
            <div><span className={`pill ${status?.color}`}><span className="dot"></span>{status?.label}</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, height: 4, background: "var(--line)", borderRadius: 4 }}>
                <div style={{ width: `${p.progress * 100}%`, height: "100%", background: "var(--gold)", borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace", minWidth: 28 }}>{Math.round(p.progress * 100)}%</span>
            </div>
            <div style={{ textAlign: "right" }}><Icon name="chevron-r" size={14} /></div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDetailDrawer({
  project,
  contact,
  onClose,
  onStatusChange,
}: {
  project: ReturnType<typeof useV2LiveData>["projects"][number];
  contact: ReturnType<typeof useV2LiveData>["contacts"][number];
  onClose: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}) {
  const statusMeta = PROJECT_STATUS[project.status] ?? PROJECT_STATUS.scheduled;

  return (
    <div className="product-drawer-backdrop" onMouseDown={onClose}>
      <aside className="product-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="product-drawer-head">
          <div>
            <div className="page-eyebrow">Project details</div>
            <h2>{project.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close project details">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="product-drawer-body">
          <div className="product-preview-card">
            <div className="product-preview-copy">
              <span className={`pill ${statusMeta.color}`}><span className="dot"></span>{statusMeta.label}</span>
              <h3>{fmt$(project.value)}</h3>
              <p>{project.id}</p>
            </div>
          </div>

          <div className="field-grid">
            <div className="ss-field">
              <label>Customer</label>
              <input value={contact.name} readOnly />
            </div>
            <div className="ss-field">
              <label>Contact</label>
              <input value={contact.phone || contact.email || "No contact info"} readOnly />
            </div>
          </div>

          <div className="ss-field">
            <label>Address</label>
            <input value={contact.addr || "No address"} readOnly />
          </div>

          <div className="field-grid">
            <div className="ss-field">
              <label>Start date</label>
              <input value={project.start ? new Date(project.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} readOnly />
            </div>
            <div className="ss-field">
              <label>End date</label>
              <input value={project.due ? new Date(project.due).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} readOnly />
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-meta">
              <span>{Math.round(project.progress * 100)}% complete</span>
            </div>
            <div className="progress-bar"><div className="fill" style={{ width: `${project.progress * 100}%` }}></div></div>
          </div>

          <div className="ss-field">
            <label>Move to status</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STAGES.map((stage) => (
                <button
                  key={stage.k}
                  className={`btn ${project.status === stage.k ? "primary" : "ghost"}`}
                  onClick={() => onStatusChange(stage.k)}
                >
                  {stage.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="product-drawer-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </aside>
    </div>
  );
}

function ProjectDrawer({
  draft,
  contacts,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  draft: {
    projectName: string;
    contactId: string;
    approvedAmount: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
  };
  contacts: ReturnType<typeof useV2LiveData>["contacts"];
  error: string;
  saving: boolean;
  onChange: (draft: {
    projectName: string;
    contactId: string;
    approvedAmount: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
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
            <div className="page-eyebrow">Operations</div>
            <h2>New project</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close project drawer">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="product-drawer-body">
          <div className="ss-field">
            <label>Project name</label>
            <input value={draft.projectName} onChange={(e) => patch({ projectName: e.target.value })} placeholder="Rivera house roof replacement" />
          </div>
          <div className="ss-field">
            <label>Customer</label>
            <select value={draft.contactId} onChange={(e) => patch({ contactId: e.target.value })}>
              <option value="">Select customer...</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field-grid">
            <div className="ss-field">
              <label>Approved amount</label>
              <input type="number" value={draft.approvedAmount} onChange={(e) => patch({ approvedAmount: e.target.value })} placeholder="28400" />
            </div>
            <div className="ss-field">
              <label>Status</label>
              <select value={draft.status} onChange={(e) => patch({ status: e.target.value as ProjectStatus })}>
                {STAGES.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
            </div>
          </div>
          <div className="field-grid">
            <div className="ss-field">
              <label>Start date</label>
              <input type="date" value={draft.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            </div>
            <div className="ss-field">
              <label>End date</label>
              <input type="date" value={draft.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
            </div>
          </div>
          {error && <div className="auth-alert error">{error}</div>}
        </div>

        <div className="product-drawer-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save project"}</button>
        </div>
      </aside>
    </div>
  );
}

function toAppProjectStatus(status: ProjectStatus): AppProjectStatus {
  if (status === "scheduled") return "scheduled";
  if (status === "in_progress") return "in_progress";
  if (status === "on_hold") return "on_hold";
  if (status === "completed") return "completed";
  if (status === "invoiced") return "invoiced";
  if (status === "paid") return "paid";
  return "scheduled";
}
