"use client";

import { useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { CREW, PROJECT_STATUS, SAMPLE_PROJECTS, colorForId, contactById, fmt$, initials, type ProjectStatus } from "../_shared/data";

const STAGES: { k: ProjectStatus; l: string }[] = [
  { k: "scheduled", l: "Scheduled" },
  { k: "in_progress", l: "In Progress" },
  { k: "on_hold", l: "On Hold" },
  { k: "completed", l: "Completed" },
  { k: "invoiced", l: "Invoiced" },
  { k: "paid", l: "Paid" },
];

const TODAY = new Date("2025-10-01");

export default function ProjectsV2() {
  const projects = SAMPLE_PROJECTS;
  const [query, setQuery] = useState("");

  const filtered = projects.filter((p) => {
    if (!query) return true;
    const c = contactById(p.contactId);
    const q = query.toLowerCase();
    return p.title.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  const active = projects.filter((p) => ["in_progress", "scheduled"].includes(p.status));
  const totalActive = active.reduce((a, p) => a + p.value, 0);
  const completed = projects.filter((p) => ["completed", "invoiced", "paid"].includes(p.status));
  const completedVal = completed.reduce((a, p) => a + p.value, 0);

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
            <button className="btn ghost"><Icon name="calendar" size={14} /> Calendar view</button>
            <button className="btn primary"><Icon name="plus" size={14} /> New project</button>
          </div>
        </div>

        <div className="proj-summary">
          <div className="psum"><div className="l">Active</div><div className="v">{active.length}<small>projects</small></div></div>
          <div className="psum"><div className="l">In flight</div><div className="v">{fmt$(totalActive)}</div></div>
          <div className="psum"><div className="l">Completed this month</div><div className="v">{completed.length}</div></div>
          <div className="psum"><div className="l">Revenue closed</div><div className="v">{fmt$(completedVal)}</div></div>
        </div>

        <div className="proj-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input placeholder="Search projects by customer, job, or #" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn ghost"><Icon name="filter" size={13} /> Filters</button>
        </div>

        <div className="proj-kanban">
          {STAGES.map((s) => {
            const cards = filtered.filter((p) => p.status === s.k);
            const color = PROJECT_STATUS[s.k]?.color ?? "dark";
            return (
              <div key={s.k} className="pk-col">
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
                      <div key={p.id} className="pk-card">
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
                            <span><b>{p.crew.length}</b> on crew</span>
                          </div>
                          <div className="progress-bar"><div className="fill" style={{ width: `${p.progress * 100}%` }}></div></div>
                        </div>
                        <div className="foot">
                          <div className="crew-stack">
                            {p.crew.slice(0, 3).map((cm, i) => (
                              <div key={cm} className="avatar sm" style={{ background: CREW[cm]?.color, width: 22, height: 22, fontSize: 9, marginLeft: i === 0 ? 0 : -6, border: "2px solid #fff" }}>
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
    </V2Shell>
  );
}
