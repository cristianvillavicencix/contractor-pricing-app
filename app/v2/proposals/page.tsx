"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { V2Shell } from "../_shared/Shell";
import { Icon } from "../_shared/icons";
import { PROPOSAL_STATUS, SAMPLE_PROPOSALS, colorForId, contactById, fmt$, initials, type Proposal, type ProposalStatus } from "../_shared/data";

const STATUS_CHIPS: { k: ProposalStatus | "all"; l: string }[] = [
  { k: "all", l: "All" },
  { k: "draft", l: "Draft" },
  { k: "sent", l: "Sent" },
  { k: "viewed", l: "Viewed" },
  { k: "followup", l: "Follow-up" },
  { k: "accepted", l: "Accepted" },
  { k: "declined", l: "Declined" },
];

const STAGES: { k: ProposalStatus; l: string }[] = [
  { k: "draft", l: "Draft" },
  { k: "sent", l: "Sent" },
  { k: "viewed", l: "Viewed" },
  { k: "followup", l: "Follow-up" },
  { k: "accepted", l: "Accepted" },
  { k: "declined", l: "Declined" },
];

export default function ProposalsV2() {
  const props = SAMPLE_PROPOSALS;
  const [view, setView] = useState<"list" | "kanban">("list");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: props.length };
    props.forEach((p) => { c[p.status] = (c[p.status] ?? 0) + 1; });
    return c;
  }, [props]);

  const filtered = props.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const contact = contactById(p.contactId);
      return p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || contact.name.toLowerCase().includes(q);
    }
    return true;
  });

  const totalValue = filtered.reduce((a, p) => a + p.value, 0);
  const avgValue = filtered.length ? Math.round(totalValue / filtered.length) : 0;
  const avgMargin = filtered.length ? Math.round(filtered.reduce((a, p) => a + p.margin, 0) / filtered.length) : 0;
  const acceptedCount = filtered.filter((p) => p.status === "accepted").length;
  const winRate = filtered.length ? Math.round((acceptedCount / filtered.length) * 100) : 0;

  return (
    <V2Shell>
      <div className="props-page view">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Sales</div>
            <h1 className="page-title">Proposals</h1>
            <div className="page-sub">{filtered.length} of {props.length} proposals · {fmt$(totalValue)} total value</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost"><Icon name="copy" size={14} /> Templates</button>
            <Link href="/v2/builder" className="btn primary"><Icon name="plus" size={14} /> New proposal</Link>
          </div>
        </div>

        <div className="props-stats">
          <div className="pstat"><div className="l">Total value</div><div className="v">{fmt$(totalValue)}</div></div>
          <div className="pstat"><div className="l">Avg value</div><div className="v">{fmt$(avgValue)}</div></div>
          <div className="pstat"><div className="l">Avg margin</div><div className="v">{avgMargin}<small>%</small></div></div>
          <div className="pstat"><div className="l">Win rate</div><div className="v">{winRate}<small>%</small></div></div>
        </div>

        <div className="props-toolbar">
          <div className="search-wrap">
            <Icon name="search" size={15} />
            <input placeholder="Search by customer, job, or proposal #" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="status-chips">
            {STATUS_CHIPS.map((s) => (
              <button key={s.k} className={`chip ${statusFilter === s.k ? "active" : ""}`} onClick={() => setStatusFilter(s.k)}>
                {s.l} <span className="ct">{counts[s.k] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="view-toggle">
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" size={13} /> List</button>
            <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}><Icon name="kanban" size={13} /> Stages</button>
          </div>
        </div>

        {view === "list" ? <ProposalsList items={filtered} /> : <ProposalsKanban items={filtered} />}
      </div>
    </V2Shell>
  );
}

function ProposalsList({ items }: { items: Proposal[] }) {
  return (
    <div className="props-list">
      <div className="hdr">
        <div>Proposal #</div>
        <div>Job</div>
        <div>Customer</div>
        <div style={{ textAlign: "right" }}>Value</div>
        <div>Status</div>
        <div style={{ textAlign: "right" }}>Age</div>
        <div></div>
      </div>
      {items.length === 0 && (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--ink-3)", fontSize: 13.5 }}>
          No proposals match your filters.
        </div>
      )}
      {items.map((p) => {
        const c = contactById(p.contactId);
        const status = PROPOSAL_STATUS[p.status];
        const isOpen = ["sent", "viewed", "followup"].includes(p.status);
        const ageWarn = p.age >= 14 && isOpen;
        const ageHot = p.age >= 21 && isOpen;
        return (
          <div key={p.id} className="row">
            <div className="ref">{p.id}</div>
            <div className="title">{p.title}<span className="sub">{p.items} items · {p.margin}% margin</span></div>
            <div className="contact">
              <div className="avatar sm" style={{ background: colorForId(c.id || p.contactId) }}>{initials(c.name)}</div>
              <div className="meta">
                <div className="cn">{c.name}</div>
                <div className="cb">{c.biz}</div>
              </div>
            </div>
            <div className="val">{fmt$(p.value)}</div>
            <div><span className={`pill ${status.color}`}><span className="dot"></span>{status.label}</span></div>
            <div style={{ textAlign: "right" }}>
              {p.sent ? <span className={`age-badge ${ageHot ? "hot" : ageWarn ? "warn" : ""}`}>{p.age}d</span> : <span className="age-badge">—</span>}
            </div>
            <div className="actions">
              <button className="icon-btn" style={{ width: 30, height: 30, border: "none", background: "transparent" }}><Icon name="more" size={16} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProposalsKanban({ items }: { items: Proposal[] }) {
  return (
    <div className="kanban">
      {STAGES.map((s) => {
        const cards = items.filter((p) => p.status === s.k);
        const sum = cards.reduce((a, p) => a + p.value, 0);
        const color = PROPOSAL_STATUS[s.k]?.color ?? "dark";
        return (
          <div key={s.k} className="kb-col">
            <div className="kb-col-head">
              <span className={`pill ${color}`}><span className="dot"></span>{s.l}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="sum">{fmt$(sum)}</span>
                <span className="ct">{cards.length}</span>
              </div>
            </div>
            <div className="kb-body">
              {cards.length === 0 && <div className="kb-empty">No proposals here</div>}
              {cards.map((p) => {
                const c = contactById(p.contactId);
                return (
                  <div key={p.id} className="kb-card">
                    <div className="top">
                      <span className="ref">{p.id}</span>
                      <span className="val">{fmt$(p.value)}</span>
                    </div>
                    <div className="title">{p.title}</div>
                    <div className="foot">
                      <div className="contact-mini">
                        <div className="avatar sm" style={{ background: colorForId(c.id || p.contactId), width: 20, height: 20, fontSize: 9 }}>
                          {initials(c.name)}
                        </div>
                        <span className="cn">{c.name}</span>
                      </div>
                      <span className="mono">{p.margin}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
