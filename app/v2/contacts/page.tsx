"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon, type IconName } from "../_shared/icons";
import {
  CREW, PROJECT_STATUS, PROPOSAL_STATUS, SAMPLE_CONTACTS, SAMPLE_PROJECTS, SAMPLE_PROPOSALS,
  colorForId, fmt$, initials, type Contact, type Project, type Proposal,
} from "../_shared/data";

const FILTER_CHIPS = [
  { id: "all", l: "All" },
  { id: "repeat", l: "Repeat" },
  { id: "premium", l: "Premium" },
  { id: "lead", l: "Leads" },
  { id: "inactive", l: "Inactive" },
] as const;

type FilterId = (typeof FILTER_CHIPS)[number]["id"];

type ActivityLine = { id: string; icon: IconName; color: string; line: ReactNode; ref: string; when: string };
type FileItem = { id: string; name: string; size: string; ext: string; kind: "image" | "pdf" | "contract"; when: string };
type Note = { id: string; kind: "task" | "note"; author: string; when: string; body: ReactNode; done?: boolean };

const activityFor = (): ActivityLine[] => [
  { id: "tl1", icon: "check",   color: "green",  line: <>Accepted proposal <b>P-1042</b></>, ref: "$28,400", when: "2 days ago" },
  { id: "tl2", icon: "eye",     color: "teal",   line: <>Viewed proposal <b>P-1041</b></>,   ref: "",        when: "4 days ago" },
  { id: "tl3", icon: "phone",   color: "amber",  line: <>Phone call <b>· 12 min</b> — follow-up on roof scope</>, ref: "", when: "1 week ago" },
  { id: "tl4", icon: "mail",    color: "blue",   line: <>Sent proposal <b>P-1042</b></>,     ref: "",        when: "10 days ago" },
  { id: "tl5", icon: "sparkle", color: "purple", line: <>Added to <b>Premium</b> tag</>,     ref: "",        when: "3 weeks ago" },
  { id: "tl6", icon: "dollar",  color: "gold",   line: <>Paid invoice <b>INV-082</b></>,     ref: "$18,900", when: "5 weeks ago" },
];

const filesFor = (): FileItem[] => [
  { id: "f1", name: "Roof inspection photos.zip",  size: "24 MB",  ext: "ZIP",  kind: "image",    when: "Oct 1" },
  { id: "f2", name: "Signed contract P-1042.pdf",  size: "2.1 MB", ext: "PDF",  kind: "contract", when: "Sep 23" },
  { id: "f3", name: "Before — kitchen.jpg",         size: "4.4 MB", ext: "JPG",  kind: "image",    when: "Sep 20" },
  { id: "f4", name: "Insurance certificate.pdf",   size: "380 KB", ext: "PDF",  kind: "pdf",      when: "Sep 18" },
  { id: "f5", name: "Property survey.pdf",         size: "1.2 MB", ext: "PDF",  kind: "pdf",      when: "Sep 15" },
  { id: "f6", name: "Material list — roofing.xlsx", size: "88 KB", ext: "XLSX", kind: "image",    when: "Sep 10" },
];

const notesFor = (): Note[] => [
  { id: "n1", kind: "task", author: "Cristian", when: "Today",      body: <>Call to confirm <b>Saturday start time</b> for tear-off. Crew will arrive at 7:00 AM.</>, done: false },
  { id: "n2", kind: "note", author: "Cristian", when: "Yesterday",  body: <>Client mentioned interest in <b>solar add-on</b> after roof replacement. Send brochure when project closes.</> },
  { id: "n3", kind: "task", author: "Cristian", when: "2 days ago", body: <>Send final invoice once city inspection passes.</>, done: true },
  { id: "n4", kind: "note", author: "Cristian", when: "1 week ago", body: <>Prefers communication via SMS over email. Confirmed during walkthrough.</> },
];

export default function ContactsV2() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const counts = useMemo(() => ({
    all: SAMPLE_CONTACTS.length,
    repeat: SAMPLE_CONTACTS.filter((c) => c.tags.includes("Repeat")).length,
    premium: SAMPLE_CONTACTS.filter((c) => c.tags.includes("Premium")).length,
    lead: SAMPLE_CONTACTS.filter((c) => c.tags.includes("Lead")).length,
    inactive: SAMPLE_CONTACTS.filter((c) => c.spent === 0).length,
  }), []);

  const filtered = SAMPLE_CONTACTS.filter((c) => {
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

  if (selectedId) {
    const contact = SAMPLE_CONTACTS.find((c) => c.id === selectedId);
    if (!contact) {
      setSelectedId(null);
      return null;
    }
    return (
      <V2Shell>
        <ContactDetail contact={contact} tab={tab} setTab={setTab} onBack={() => setSelectedId(null)} />
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
            <div className="page-sub">{SAMPLE_CONTACTS.length} contacts · {counts.repeat} repeat · {counts.premium} premium</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost"><Icon name="copy" size={14} /> Import CSV</button>
            <button className="btn primary"><Icon name="plus" size={14} /> Add contact</button>
          </div>
        </div>

        <div className="contacts-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input placeholder="Search by name, business, city, or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="filter-chips">
            {FILTER_CHIPS.map((c) => (
              <button key={c.id} className={`chip-flt ${filter === c.id ? "active" : ""}`} onClick={() => setFilter(c.id)}>
                {c.l} <span className="ct">{counts[c.id]}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost"><Icon name="filter" size={13} /> More filters</button>
        </div>

        <div className="contacts-table">
          <div className="ct-hdr">
            <div>Contact</div>
            <div>Business</div>
            <div>City</div>
            <div>Phone</div>
            <div style={{ textAlign: "right" }}>Projects</div>
            <div style={{ textAlign: "right" }}>Total spent</div>
            <div>Tags</div>
            <div style={{ textAlign: "right" }}>Last contact</div>
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
              <div className="ct-cell-biz">{c.biz}</div>
              <div className="ct-cell-city">{c.addr}</div>
              <div className="ct-cell-phone">{c.phone}</div>
              <div className="ct-cell-num">{c.projects}</div>
              <div className="ct-cell-spent">{c.spent > 0 ? fmt$(c.spent) : <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>—</span>}</div>
              <div className="ct-cell-tags">
                {c.tags.slice(0, 2).map((t) => {
                  const color = t === "Premium" ? "gold" : t === "Repeat" ? "green" : t === "Lead" ? "blue" : "dark";
                  return (
                    <span key={t} className={`pill ${color}`} style={{ padding: "2px 7px", fontSize: 9.5 }}>
                      <span className="dot"></span>{t}
                    </span>
                  );
                })}
              </div>
              <div className="ct-cell-last">
                {new Date(c.since + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
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
    </V2Shell>
  );
}

function ContactDetail({ contact, tab, setTab, onBack }: { contact: Contact; tab: string; setTab: (t: string) => void; onBack: () => void }) {
  const c = contact;
  const projects = SAMPLE_PROJECTS.filter((p) => p.contactId === c.id);
  const proposals = SAMPLE_PROPOSALS.filter((p) => p.contactId === c.id);
  const activity = activityFor();
  const files = filesFor();
  const notes = notesFor();

  const totalProjectValue = projects.reduce((a, p) => a + p.value, 0);
  const avgProjectValue = projects.length ? Math.round(totalProjectValue / projects.length) : 0;

  const tabs: { id: string; l: string; icon: IconName; count?: number }[] = [
    { id: "overview",  l: "Overview",  icon: "eye" },
    { id: "projects",  l: "Projects",  icon: "briefcase", count: projects.length },
    { id: "proposals", l: "Proposals", icon: "send",      count: proposals.length },
    { id: "activity",  l: "Activity",  icon: "clock",     count: activity.length },
    { id: "files",     l: "Files",     icon: "image",     count: files.length },
    { id: "notes",     l: "Notes",     icon: "edit",      count: notes.length },
  ];

  return (
    <div className="contacts-page view">
      <div className="cd-back-bar">
        <button className="cd-back-btn" onClick={onBack}>
          <Icon name="chevron-l" size={14} /> Back to contacts
        </button>
        <div className="cd-action-row">
          <button className="btn ghost"><Icon name="copy" size={13} /> Duplicate</button>
          <button className="btn ghost"><Icon name="edit" size={13} /> Edit</button>
          <button className="btn ghost" style={{ color: "var(--rose)" }}><Icon name="x" size={13} /> Archive</button>
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
        <div className="cd-tags">
          {c.tags.map((t) => (
            <span key={t} className="cd-tag">
              <span className="dot-tag"></span>{t}
            </span>
          ))}
        </div>
        <div className="cd-hero-actions">
          <button className="cd-hero-btn"><Icon name="phone" size={13} /> Call</button>
          <button className="cd-hero-btn"><Icon name="mail" size={13} /> Email</button>
          <Link href="/v2/builder" className="cd-hero-btn primary">
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
        {tab === "overview" && <OverviewTab c={c} projects={projects} proposals={proposals} />}
        {tab === "projects" && <ProjectsTab projects={projects} />}
        {tab === "proposals" && <ProposalsTab proposals={proposals} />}
        {tab === "activity" && <ActivityTab activity={activity} />}
        {tab === "files" && <FilesTab files={files} />}
        {tab === "notes" && <NotesTab notes={notes} />}
      </div>
    </div>
  );
}

function OverviewTab({ c, projects, proposals }: { c: Contact; projects: Project[]; proposals: Proposal[] }) {
  const latestProj = projects[0];
  const latestProp = proposals[0];
  return (
    <div className="ov-grid">
      <div className="ov-panel">
        <h3>Contact info <button className="edit"><Icon name="edit" size={11} /> Edit</button></h3>
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

function FilesTab({ files }: { files: FileItem[] }) {
  const totalMB = files.reduce((a, f) => a + parseFloat(f.size), 0).toFixed(1);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{files.length} files · {totalMB} MB total</div>
        <button className="btn ghost"><Icon name="plus" size={13} /> Upload file</button>
      </div>
      <div className="files-grid">
        {files.map((f) => (
          <div key={f.id} className="file-card">
            <div className={`file-thumb ${f.kind === "pdf" ? "pdf" : f.kind === "contract" ? "contract" : ""}`}>
              <Icon name={f.kind === "contract" ? "check" : f.kind === "pdf" ? "copy" : "image"} size={28} />
              <div className="ext-tag">{f.ext}</div>
            </div>
            <div className="file-meta">
              <div className="nm-f">{f.name}</div>
              <div className="sub-f">{f.size} · {f.when}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function NotesTab({ notes }: { notes: Note[] }) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <div className="notes-add">
        <textarea placeholder="Write a note or quick task… use [] for a task" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="footer-add">
          <div className="hint">⌘+Enter to save · Start with [] for a task</div>
          <button className="btn primary" disabled={!draft.trim()}><Icon name="check" size={13} /> Save note</button>
        </div>
      </div>
      {notes.map((n) => (
        <div key={n.id} className={`note-card ${n.kind} ${n.done ? "done" : ""}`}>
          <div className="head-n">
            <div className="who-n">
              <div className="avatar sm" style={{ background: "var(--ink)", width: 22, height: 22, fontSize: 9 }}>CV</div>
              {n.author}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".04em" }}>{n.when}</div>
          </div>
          <div className="body-n">{n.body}</div>
        </div>
      ))}
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
