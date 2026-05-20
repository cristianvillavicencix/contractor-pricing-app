"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";

type NavItem = { id: string; label: string; icon: IconName; href: string; badge?: number };

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard",  href: "/v2" },
  { id: "proposals", label: "Proposals", icon: "send",       href: "/v2/proposals", badge: 9 },
  { id: "projects",  label: "Projects",  icon: "briefcase",  href: "/v2/projects",  badge: 8 },
  { id: "contacts",  label: "Contacts",  icon: "users",      href: "/v2/contacts",  badge: 8 },
  { id: "products",  label: "Products",  icon: "package",    href: "/v2/products" },
  { id: "settings",  label: "Settings",  icon: "settings",   href: "/v2/settings" },
];

const TITLES: Record<string, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: "Overview",   title: "Dashboard" },
  builder:   { eyebrow: "Sales",      title: "New proposal" },
  proposals: { eyebrow: "Sales",      title: "Proposals" },
  projects:  { eyebrow: "Operations", title: "Projects" },
  contacts:  { eyebrow: "CRM",        title: "Contacts" },
  products:  { eyebrow: "Catalog",    title: "Products" },
  settings:  { eyebrow: "Workspace",  title: "Settings" },
};

type Prefs = {
  navLayout: "sidebar" | "topbar";
  sidebarCollapsed: boolean;
  density: "compact" | "regular" | "comfy";
  accent: "gold" | "blue" | "green" | "purple" | "rose";
};

const DEFAULT_PREFS: Prefs = {
  navLayout: "sidebar",
  sidebarCollapsed: false,
  density: "regular",
  accent: "gold",
};

function usePrefs(): [Prefs, (k: keyof Prefs, v: Prefs[keyof Prefs]) => void] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("v2-prefs");
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);
  const set = (k: keyof Prefs, v: Prefs[keyof Prefs]) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      try {
        window.localStorage.setItem("v2-prefs", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return [prefs, set];
}

function viewFromPath(pathname: string): string {
  if (pathname === "/v2") return "dashboard";
  const seg = pathname.split("/")[2] ?? "dashboard";
  return seg;
}

export function V2Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/v2";
  const router = useRouter();
  const view = viewFromPath(pathname);
  const [prefs, setPref] = usePrefs();
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const target = NAV_ITEMS[parseInt(e.key, 10) - 1];
        if (target) router.push(target.href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const classNames = useMemo(() => {
    return ["v2-app", `accent-${prefs.accent}`,
      prefs.navLayout === "topbar" ? "nav-topbar" : "",
      prefs.density === "compact" ? "density-compact" : "",
      prefs.density === "comfy" ? "density-comfy" : "",
    ].filter(Boolean).join(" ");
  }, [prefs.accent, prefs.navLayout, prefs.density]);

  return (
    <div className={classNames}>
      <div className="shell">
        {prefs.navLayout !== "topbar" && (
          <Sidebar view={view} collapsed={prefs.sidebarCollapsed} setCollapsed={(c) => setPref("sidebarCollapsed", c)} />
        )}
        <div className="main">
          <Topbar view={view} navLayout={prefs.navLayout} />
          <div className="content" key={pathname}>
            {children}
          </div>
        </div>
        <CalcFab open={calcOpen} setOpen={setCalcOpen} />
      </div>
    </div>
  );
}

function Sidebar({ view, collapsed, setCollapsed }: { view: string; collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="brand-mark"><Icon name="bolt" size={18} /></div>
        <div className="brand-text">
          <span className="name">CONTRACTOR</span>
          <span className="sub">STUDIO</span>
        </div>
        <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
          <Icon name={collapsed ? "chevron-r" : "chevron-l"} size={14} />
        </button>
      </div>
      <div className="sidebar-section">Workspace</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.id} href={item.href} className={`nav-item ${view === item.id ? "active" : ""}`} title={collapsed ? item.label : undefined}>
            <span className="ico"><Icon name={item.icon} size={16} /></span>
            <span className="label">{item.label}</span>
            {item.badge ? <span className="badge">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Link href="/v2/builder" className="quick-action">
          <Icon name="plus" size={14} /> <span className="label">New proposal</span>
        </Link>
        <div className="user-pill">
          <div className="avatar">CV</div>
          <div className="meta">
            <div className="uname">Cristian Villavicencio</div>
            <div className="ubiz">Latino Business Support</div>
          </div>
          {!collapsed && <span className="kbd-hint">⌘K</span>}
        </div>
      </div>
    </aside>
  );
}

function Topbar({ view, navLayout }: { view: string; navLayout: Prefs["navLayout"] }) {
  const t = TITLES[view] ?? { eyebrow: "", title: "" };
  const topbarMode = navLayout === "topbar";
  return (
    <div className="topbar">
      <div className="left">
        {topbarMode && (
          <>
            <div className="topbar-brand">
              <div className="mark"><Icon name="bolt" size={18} /></div>
              <div className="txt"><span className="name">CONTRACTOR</span><span className="sub">STUDIO</span></div>
            </div>
            <div className="topbar-nav">
              {NAV_ITEMS.map((n) => (
                <Link key={n.id} href={n.href} className={`top-nav-item ${view === n.id ? "active" : ""}`}>
                  <Icon name={n.icon} size={15} />
                  <span>{n.label}</span>
                  {n.badge ? <span className="badge">{n.badge}</span> : null}
                </Link>
              ))}
            </div>
          </>
        )}
        {!topbarMode && (
          <div className="crumb">
            <span>{t.eyebrow}</span>
            <Icon name="chevron-r" size={12} />
            <span className="here">{t.title}</span>
          </div>
        )}
      </div>
      <div className="right">
        {!topbarMode && <input className="search mono" placeholder="Search anything…  /  for quick" />}
        {topbarMode && <button className="icon-btn" title="Search"><Icon name="search" size={16} /></button>}
        <button className="icon-btn" title="Help"><Icon name="search" size={16} /></button>
        <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /><span className="dot" /></button>
        <Link href="/v2/builder" className="icon-btn" title="New proposal"><Icon name="plus" size={16} /></Link>
        {topbarMode && (
          <div className="user-chip">
            <div className="avatar" style={{ background: "#3a89e8" }}>CV</div>
            <div><div className="uname">Cristian V.</div><div className="ubiz">LBS</div></div>
            <Icon name="chevron-d" size={14} />
          </div>
        )}
      </div>
    </div>
  );
}

function CalcFab({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  return (
    <>
      <button className="calc-fab" onClick={() => setOpen(!open)} title="Quick calculator">
        <Icon name="calculator" size={20} />
      </button>
      {open && <CalcPopover onClose={() => setOpen(false)} />}
    </>
  );
}

function CalcPopover({ onClose }: { onClose: () => void }) {
  const [cost, setCost] = useState(2000);
  const [margin, setMargin] = useState(35);
  const price = cost / (1 - margin / 100);
  const profit = price - cost;
  return (
    <div style={{
      position: "fixed", bottom: 90, right: 24, width: 300, background: "var(--surface)",
      border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 18,
      boxShadow: "var(--shadow-lg)", zIndex: 50, animation: "v2ViewIn .25s var(--ease) both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Quick price</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
          <Icon name="x" size={16} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>Job cost</label>
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-tint)", borderRadius: 9, padding: "8px 12px", marginTop: 4 }}>
            <span style={{ color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>$</span>
            <input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value) || 0)}
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 18, fontWeight: 600, padding: "0 0 0 4px" }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 600 }}>
            Target margin · <b style={{ color: "var(--gold-deep)" }}>{margin}%</b>
          </label>
          <input type="range" min={10} max={60} value={margin} onChange={(e) => setMargin(Number(e.target.value))}
            style={{ width: "100%", marginTop: 6, accentColor: "var(--gold)" }} />
        </div>
        <div style={{ borderTop: "2px solid var(--ink)", marginTop: 8, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600 }}>Charge customer</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: "-.02em" }}>${Math.round(price).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-jetbrains-mono), monospace", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 600 }}>Profit</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", color: "var(--green)" }}>${Math.round(profit).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
