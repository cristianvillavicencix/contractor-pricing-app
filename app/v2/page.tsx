"use client";

import Link from "next/link";
import { V2Shell } from "./_shared/Shell";
import { Icon } from "./_shared/icons";
import {
  ACTIVITY, CREW, PROJECT_STATUS, SAMPLE_PROJECTS, SAMPLE_PROPOSALS, UPCOMING,
  type ProjectStatus, type ProposalStatus,
} from "./_shared/data";

function Sparkline({ points, color = "#C9A227" }: { points: number[]; color?: string }) {
  if (!points.length) return null;
  const w = 80, h = 32;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(" ");
  const last = points.length - 1;
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

export default function DashboardV2() {
  const proposals = SAMPLE_PROPOSALS;
  const projects = SAMPLE_PROJECTS;

  const stageCounts: Record<ProposalStatus, number> = { draft: 0, sent: 0, viewed: 0, followup: 0, accepted: 0, declined: 0 };
  let pipelineValue = 0;
  let acceptedValue = 0;
  proposals.forEach((p) => {
    stageCounts[p.status]++;
    if (["sent", "viewed", "followup"].includes(p.status)) pipelineValue += p.value;
    if (p.status === "accepted") acceptedValue += p.value;
  });

  const activeProjects = projects.filter((p) => ["in_progress", "scheduled"].includes(p.status)).length;
  const pendingProposals = stageCounts.sent + stageCounts.viewed + stageCounts.followup;
  const avgMargin = Math.round(proposals.reduce((a, p) => a + p.margin, 0) / proposals.length);

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
            <div className="greeting">Tuesday · October 1, 2025</div>
            <h1 className="h1">
              Welcome back, <span className="biz">Cristian</span>
            </h1>
            <div className="page-sub">
              You have <b style={{ color: "var(--ink)" }}>{pendingProposals} proposals</b> awaiting decision and{" "}
              <b style={{ color: "var(--ink)" }}>{activeProjects} active projects</b> in the field.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost"><Icon name="calendar" size={14} /> This month</button>
            <Link href="/v2/builder" className="btn primary"><Icon name="plus" size={14} /> New proposal</Link>
          </div>
        </div>

        <div className="metric-strip">
          <div className="metric dark">
            <div className="ttl">Pipeline value</div>
            <div className="val">${pipelineValue.toLocaleString()}</div>
            <div className="sub">
              <span className="trend up"><Icon name="arrow-up" size={11} /> 18%</span>
              <span>vs. last month</span>
            </div>
            <Sparkline points={[14, 18, 16, 22, 28, 26, 32, 38, 42]} color="#C9A227" />
          </div>
          <div className="metric">
            <div className="ttl">Active projects</div>
            <div className="val">{activeProjects}</div>
            <div className="sub">
              <span className="trend up"><Icon name="arrow-up" size={11} /> 2</span>
              <span>this week</span>
            </div>
            <Sparkline points={[3, 2, 4, 4, 5, 4, 5, 6, 5]} color="#2A6FDB" />
          </div>
          <div className="metric">
            <div className="ttl">Pending proposals</div>
            <div className="val">{pendingProposals}</div>
            <div className="sub">
              <span className="trend down"><Icon name="arrow-dn" size={11} /> 1</span>
              <span>follow-up due</span>
            </div>
            <Sparkline points={[5, 4, 6, 7, 5, 8, 6, 5, 4]} color="#D98F1E" />
          </div>
          <div className="metric">
            <div className="ttl">Approved revenue</div>
            <div className="val">${acceptedValue.toLocaleString()}</div>
            <div className="sub">
              <span>Win rate <b style={{ color: "var(--green)" }}>62%</b></span>
              <span>· Avg margin {avgMargin}%</span>
            </div>
            <Sparkline points={[8, 12, 18, 14, 22, 26, 30, 28, 33]} color="#2F7D52" />
          </div>
        </div>

        <div className="dash-row">
          <div className="card">
            <div className="card-head">
              <h3>Sales pipeline</h3>
              <Link href="/v2/proposals" className="more">View all proposals <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="funnel">
              {stages.map((s) => {
                const items = proposals.filter((p) => p.status === s.key);
                const val = items.reduce((a, p) => a + p.value, 0);
                const pct = Math.min(100, (val / Math.max(1, pipelineValue + acceptedValue + 8000)) * 110);
                return (
                  <div key={s.key} className="funnel-row">
                    <div className="lbl">
                      {s.label}
                      <span className="ct">{items.length} {items.length === 1 ? "item" : "items"}</span>
                    </div>
                    <div className="funnel-bar">
                      <div className={`fill ${s.key}`} style={{ width: `${pct}%` }}>${val.toLocaleString()}</div>
                    </div>
                    <div className="val">{Math.round((items.length / proposals.length) * 100)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Projects by status</h3>
              <Link href="/v2/projects" className="more">View board <Icon name="arrow-r" size={12} /></Link>
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

        <div className="dash-row">
          <div className="card">
            <div className="card-head">
              <h3>Recent activity</h3>
              <button className="more">View all <Icon name="arrow-r" size={12} /></button>
            </div>
            <div className="activity">
              {ACTIVITY.map((a) => (
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
              <h3>Upcoming this week</h3>
              <Link href="/v2/projects" className="more">Schedule <Icon name="arrow-r" size={12} /></Link>
            </div>
            <div className="upcoming">
              {UPCOMING.map((u) => (
                <div key={u.id} className="up-row">
                  <div className="up-date">
                    <div className="day">{u.day}</div>
                    <div className="num">{u.date.split(" ")[1]}</div>
                  </div>
                  <div className="up-meta">
                    <div className="ttl">{u.title}</div>
                    <div className="sub">
                      <span><Icon name="map" size={11} /> {u.addr}</span>
                      <span><Icon name="clock" size={11} /> {u.duration}</span>
                    </div>
                  </div>
                  <div className="crew-stack">
                    {u.crew.map((c) => (
                      <div key={c} className="avatar sm" style={{ background: CREW[c]?.color ?? "#888" }} title={CREW[c]?.name}>
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Quick actions</h3></div>
          <div className="card-pad">
            <div className="quick-grid">
              <Link href="/v2/builder" className="quick-tile">
                <div className="ico-wrap"><Icon name="send" size={18} /></div>
                <div className="ttl">New proposal</div>
                <div className="sub">Start pricing a job from scratch.</div>
              </Link>
              <Link href="/v2/contacts" className="quick-tile">
                <div className="ico-wrap"><Icon name="users" size={18} /></div>
                <div className="ttl">Add a client</div>
                <div className="sub">Save contact details for later proposals.</div>
              </Link>
              <Link href="/v2/products" className="quick-tile">
                <div className="ico-wrap"><Icon name="package" size={18} /></div>
                <div className="ttl">Add a product</div>
                <div className="sub">Add a service or material with markup.</div>
              </Link>
              <Link href="/v2/settings" className="quick-tile">
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
