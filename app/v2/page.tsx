"use client";

import Link from "next/link";
import { useMemo } from "react";
import { V2Shell } from "./_shared/Shell";
import { Icon } from "./_shared/icons";
import { PROJECT_STATUS, CREW, type ProjectStatus, type ProposalStatus } from "./_shared/data";
import { useV2LiveData } from "./_shared/live-data";
import type { Proposal, Project, Contact } from "./_shared/data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Returns 9 monthly sums of `value` for items that have a `date` field, newest last. */
function monthlyValues(items: { date: string | null | undefined; value: number }[], months = 9): number[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1).getTime();
    const end   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1).getTime();
    return items.filter(x => {
      if (!x.date) return false;
      const t = new Date(x.date).getTime();
      return t >= start && t < end;
    }).reduce((s, x) => s + x.value, 0);
  });
}

/** Returns 9 monthly counts of items that match a predicate and have a `date` field. */
function monthlyCounts(items: { date: string | null | undefined }[], months = 9): number[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const offset = months - 1 - i;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1).getTime();
    const end   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1).getTime();
    return items.filter(x => {
      if (!x.date) return false;
      const t = new Date(x.date).getTime();
      return t >= start && t < end;
    }).length;
  });
}

function trendPct(current: number, previous: number): { pct: number; dir: "up" | "down" | "flat" } {
  if (previous === 0) return { pct: 0, dir: "flat" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
}

function winRate(proposals: Proposal[]): number {
  const decided = proposals.filter(p => p.status === "accepted" || p.status === "declined");
  if (!decided.length) return 0;
  const won = decided.filter(p => p.status === "accepted").length;
  return Math.round((won / decided.length) * 100);
}

type ActivityRow = {
  id: string; icon: string; color: string;
  who: string; what: string; ref: string; when: string; val?: string;
};

function buildActivity(proposals: Proposal[], contacts: Contact[]): ActivityRow[] {
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const rows: ActivityRow[] = proposals
    .filter(p => p.sent)
    .sort((a, b) => new Date(b.sent!).getTime() - new Date(a.sent!).getTime())
    .slice(0, 6)
    .map(p => {
      const name = contactMap.get(p.contactId)?.name ?? p.title;
      const val  = `$${p.value.toLocaleString()}`;
      const ago  = p.age === 0 ? "today" : p.age === 1 ? "1d ago" : `${p.age}d ago`;
      if (p.status === "accepted") return { id: p.id, icon: "check",   color: "green",  who: name, what: "accepted the proposal",   ref: p.id, when: ago, val };
      if (p.status === "viewed")   return { id: p.id, icon: "eye",     color: "gold",   who: name, what: "viewed the proposal",     ref: p.id, when: ago, val };
      if (p.status === "sent")     return { id: p.id, icon: "send",    color: "blue",   who: name, what: "was sent a proposal",     ref: p.id, when: ago, val };
      if (p.status === "declined") return { id: p.id, icon: "x",       color: "rose",   who: name, what: "declined the proposal",   ref: p.id, when: ago };
      if (p.status === "followup") return { id: p.id, icon: "bell",    color: "gold",   who: name, what: "— follow-up due",         ref: p.id, when: ago, val };
      return                              { id: p.id, icon: "send",    color: "",       who: name, what: "proposal drafted",        ref: p.id, when: ago, val };
    });
  return rows;
}

type UpcomingRow = {
  id: string; day: string; dateStr: string;
  title: string; addr: string; status: string; crew: string[];
};

function buildUpcoming(projects: Project[], contacts: Contact[]): UpcomingRow[] {
  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const days    = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months  = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return projects
    .filter(p => ["scheduled", "in_progress"].includes(p.status))
    .slice(0, 4)
    .map(p => {
      const d = new Date(p.start);
      const isValid = !isNaN(d.getTime());
      const addr = contactMap.get(p.contactId)?.addr ?? "";
      return {
        id: p.id,
        day: isValid ? days[d.getDay()] : "—",
        dateStr: isValid ? `${months[d.getMonth()]} ${d.getDate()}` : "TBD",
        title: p.title,
        addr,
        status: p.status,
        crew: p.crew,
      };
    });
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points, color = "#C9A227" }: { points: number[]; color?: string }) {
  if (!points.length) return null;
  const w = 80, h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / Math.max(points.length - 1, 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(" ");
  const last  = points.length - 1;
  const lastX = last * step;
  const lastY = h - ((points[last] - min) / range) * (h - 4) - 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark">
      <path d={`${d} L ${w},${h} L 0,${h} Z`} fill={color} fillOpacity="0.1" />
      <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardV2() {
  const { proposals, projects, contacts, settings } = useV2LiveData();

  const firstName = settings.companyProfile.contactName.split(/\s+/)[0] || "";
  const today = useMemo(() => formatDate(new Date()), []);

  // ── Stage counts ──────────────────────────────────────────────────────────
  const stageCounts: Record<ProposalStatus, number> = { draft: 0, sent: 0, viewed: 0, followup: 0, accepted: 0, declined: 0 };
  let pipelineValue  = 0;
  let acceptedValue  = 0;
  proposals.forEach((p) => {
    stageCounts[p.status]++;
    if (["sent", "viewed", "followup"].includes(p.status)) pipelineValue += p.value;
    if (p.status === "accepted") acceptedValue += p.value;
  });
  const activeProjects   = projects.filter(p => ["in_progress", "scheduled"].includes(p.status)).length;
  const pendingProposals = stageCounts.sent + stageCounts.viewed + stageCounts.followup;
  const avgMargin        = proposals.length ? Math.round(proposals.reduce((a, p) => a + p.margin, 0) / proposals.length) : 0;
  const rate             = winRate(proposals);

  // ── Sparkline data (from real dates) ─────────────────────────────────────
  const pipelineSpark = useMemo(() => {
    const items = proposals.filter(p => ["sent","viewed","followup"].includes(p.status)).map(p => ({ date: p.sent, value: p.value }));
    const vals = monthlyValues(items);
    return vals.every(v => v === 0) ? [10, 14, 12, 18, 22, 20, 26, 30, pipelineValue > 0 ? pipelineValue / 1000 : 34] : vals;
  }, [proposals, pipelineValue]);

  const projectSpark = useMemo(() => {
    const items = projects.map(p => ({ date: p.start }));
    const vals = monthlyCounts(items);
    return vals.every(v => v === 0) ? [3, 2, 4, 4, 5, 4, 5, 6, activeProjects] : vals;
  }, [projects, activeProjects]);

  const pendingSpark = useMemo(() => {
    const items = proposals.filter(p => ["sent","viewed","followup"].includes(p.status)).map(p => ({ date: p.sent }));
    const vals = monthlyCounts(items);
    return vals.every(v => v === 0) ? [5, 4, 6, 7, 5, 8, 6, 5, pendingProposals] : vals;
  }, [proposals, pendingProposals]);

  const revenueSpark = useMemo(() => {
    const items = proposals.filter(p => p.status === "accepted").map(p => ({ date: p.sent, value: p.value }));
    const vals = monthlyValues(items);
    return vals.every(v => v === 0) ? [8, 12, 18, 14, 22, 26, 30, 28, acceptedValue > 0 ? acceptedValue / 1000 : 33] : vals;
  }, [proposals, acceptedValue]);

  // ── Trends ────────────────────────────────────────────────────────────────
  const pipelineTrend = useMemo(() => {
    const cur  = pipelineSpark[pipelineSpark.length - 1];
    const prev = pipelineSpark[pipelineSpark.length - 2] || 0;
    return trendPct(cur, prev);
  }, [pipelineSpark]);

  const projectTrend = useMemo(() => {
    const cur  = projectSpark[projectSpark.length - 1];
    const prev = projectSpark[projectSpark.length - 2] || 0;
    return trendPct(cur, prev);
  }, [projectSpark]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const activity = useMemo(() => buildActivity(proposals, contacts), [proposals, contacts]);
  const upcoming = useMemo(() => buildUpcoming(projects, contacts), [projects, contacts]);

  const projectStatusCounts = (Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((k) => ({
    key: k,
    label: PROJECT_STATUS[k].label,
    color: PROJECT_STATUS[k].color,
    count: projects.filter((p) => p.status === k).length,
  }));

  const stages: { key: ProposalStatus; label: string }[] = [
    { key: "draft",    label: "Draft" },
    { key: "sent",     label: "Sent" },
    { key: "viewed",   label: "Viewed" },
    { key: "followup", label: "Follow-up" },
    { key: "accepted", label: "Accepted" },
  ];

  return (
    <V2Shell>
      <div className="dash view">
        <div className="page-head" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="greeting">{today}</div>
            <h1 className="h1">
              Welcome back{firstName ? <>, <span className="biz">{firstName}</span></> : null}
            </h1>
            <div className="page-sub">
              You have <b style={{ color: "var(--ink)" }}>{pendingProposals} proposal{pendingProposals !== 1 ? "s" : ""}</b> awaiting decision and{" "}
              <b style={{ color: "var(--ink)" }}>{activeProjects} active project{activeProjects !== 1 ? "s" : ""}</b> in the field.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost"><Icon name="calendar" size={14} /> This month</button>
            <Link href="/builder" className="btn primary"><Icon name="plus" size={14} /> New proposal</Link>
          </div>
        </div>

        {/* ── Metric strip ── */}
        <div className="metric-strip">
          <div className="metric dark">
            <div className="ttl">Pipeline value</div>
            <div className="val">${pipelineValue.toLocaleString()}</div>
            <div className="sub">
              {pipelineTrend.dir !== "flat" ? (
                <span className={`trend ${pipelineTrend.dir}`}>
                  <Icon name={pipelineTrend.dir === "up" ? "arrow-up" : "arrow-dn"} size={11} /> {pipelineTrend.pct}%
                </span>
              ) : <span className="trend">—</span>}
              <span>vs. last month</span>
            </div>
            <Sparkline points={pipelineSpark} color="#C9A227" />
          </div>

          <div className="metric">
            <div className="ttl">Active projects</div>
            <div className="val">{activeProjects}</div>
            <div className="sub">
              {projectTrend.dir !== "flat" ? (
                <span className={`trend ${projectTrend.dir}`}>
                  <Icon name={projectTrend.dir === "up" ? "arrow-up" : "arrow-dn"} size={11} /> {projectTrend.pct > 0 ? `${projectTrend.pct}%` : "same"}
                </span>
              ) : <span className="trend">—</span>}
              <span>vs. last month</span>
            </div>
            <Sparkline points={projectSpark} color="#2A6FDB" />
          </div>

          <div className="metric">
            <div className="ttl">Pending proposals</div>
            <div className="val">{pendingProposals}</div>
            <div className="sub">
              <span>Avg margin <b style={{ color: "var(--green)" }}>{avgMargin}%</b></span>
            </div>
            <Sparkline points={pendingSpark} color="#D98F1E" />
          </div>

          <div className="metric">
            <div className="ttl">Approved revenue</div>
            <div className="val">${acceptedValue.toLocaleString()}</div>
            <div className="sub">
              <span>Win rate <b style={{ color: "var(--green)" }}>{rate}%</b></span>
              <span>· Avg margin {avgMargin}%</span>
            </div>
            <Sparkline points={revenueSpark} color="#2F7D52" />
          </div>
        </div>

        {/* ── Row 1 ── */}
        <div className="dash-row">
          <div className="card">
            <div className="card-head">
              <h3>Sales pipeline</h3>
              <Link href="/proposals" className="more">View all <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="funnel">
              {stages.map((s) => {
                const items = proposals.filter((p) => p.status === s.key);
                const val   = items.reduce((a, p) => a + p.value, 0);
                const pct   = Math.min(100, (val / Math.max(1, pipelineValue + acceptedValue + 1)) * 100);
                return (
                  <div key={s.key} className="funnel-row">
                    <div className="lbl">
                      {s.label}
                      <span className="ct">{items.length} {items.length === 1 ? "item" : "items"}</span>
                    </div>
                    <div className="funnel-bar">
                      <div className={`fill ${s.key}`} style={{ width: `${Math.max(pct, items.length ? 4 : 0)}%` }}>
                        {val > 0 ? `$${val.toLocaleString()}` : ""}
                      </div>
                    </div>
                    <div className="val">
                      {proposals.length ? `${Math.round((items.length / proposals.length) * 100)}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Projects by status</h3>
              <Link href="/projects" className="more">View board <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="tally-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {projectStatusCounts.map((s) => (
                <div key={s.key} className={`tally ${s.count > 0 && (s.key === "in_progress" || s.key === "paid") ? "gold" : ""}`}>
                  <div className="lbl">
                    <span className={`pill ${s.color}`} style={{ padding: "1px 6px", fontSize: 9 }}>
                      <span className="dot"></span>{s.label}
                    </span>
                  </div>
                  <div className="num">{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2 ── */}
        <div className="dash-row">
          <div className="card">
            <div className="card-head">
              <h3>Recent activity</h3>
              <Link href="/proposals" className="more">All proposals <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="activity">
              {activity.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                  No activity yet — send your first proposal to get started.
                </div>
              ) : activity.map((a) => (
                <div key={a.id} className={`act-row ${a.color}`}>
                  <div className="icon-pill"><Icon name={a.icon as never} size={15} /></div>
                  <div className="meta">
                    <div className="line1">
                      <b>{a.who}</b> {a.what} <span className="mono" style={{ color: "var(--ink-3)" }}>· {a.ref}</span>
                    </div>
                    <div className="line2">{a.when}</div>
                  </div>
                  {a.val && <div className="val">{a.val}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Active &amp; scheduled</h3>
              <Link href="/projects" className="more">All projects <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="upcoming">
              {upcoming.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                  No active or scheduled projects yet.
                </div>
              ) : upcoming.map((u) => (
                <div key={u.id} className="up-row">
                  <div className="up-date">
                    <div className="day">{u.day}</div>
                    <div className="num">{u.dateStr.split(" ")[1] ?? "—"}</div>
                  </div>
                  <div className="up-meta">
                    <div className="ttl">{u.title}</div>
                    <div className="sub">
                      {u.addr && <span><Icon name="map" size={11} /> {u.addr}</span>}
                      <span style={{ textTransform: "capitalize" }}>{u.status.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="crew-stack">
                    {u.crew.map((c) => (
                      <div key={c} className="avatar sm" style={{ background: CREW[c]?.color ?? "#3a89e8" }} title={CREW[c]?.name ?? c}>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="card">
          <div className="card-head"><h3>Quick actions</h3></div>
          <div className="card-pad">
            <div className="quick-grid">
              <Link href="/builder" className="quick-tile">
                <div className="ico-wrap"><Icon name="send" size={18} /></div>
                <div className="ttl">New proposal</div>
                <div className="sub">Start pricing a job from scratch.</div>
              </Link>
              <Link href="/contacts" className="quick-tile">
                <div className="ico-wrap"><Icon name="users" size={18} /></div>
                <div className="ttl">Add a client</div>
                <div className="sub">Save contact details for later proposals.</div>
              </Link>
              <Link href="/products" className="quick-tile">
                <div className="ico-wrap"><Icon name="package" size={18} /></div>
                <div className="ttl">Add a product</div>
                <div className="sub">Add a service or material with markup.</div>
              </Link>
              <Link href="/settings" className="quick-tile">
                <div className="ico-wrap"><Icon name="settings" size={18} /></div>
                <div className="ttl">Tune your pricing</div>
                <div className="sub">Update overhead, burden, and margins.</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </V2Shell>
  );
}
