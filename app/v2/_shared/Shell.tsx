"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { initials } from "./data";
import { useV2LiveData } from "./live-data";
import type { AppSettings } from "@/lib/app-data";
import { applyAppPreferencesVisuals, disposeAppPreferencesVisualListeners } from "@/lib/app-preferences-live";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearCompanyIdCache } from "@/lib/supabase/data";

type NavItem = { id: string; label: string; icon: IconName; href: string; badge?: number };

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard",  href: "/" },
  { id: "proposals", label: "Proposals", icon: "send",       href: "/proposals", badge: 9 },
  { id: "projects",  label: "Projects",  icon: "briefcase",  href: "/projects",  badge: 8 },
  { id: "contacts",  label: "Contacts",  icon: "users",      href: "/contacts",  badge: 8 },
  { id: "products",  label: "Products",  icon: "package",    href: "/products" },
  { id: "assets",    label: "Assets",    icon: "image",      href: "/assets" },
];

const TITLES: Record<string, { eyebrow: string; title: string }> = {
  dashboard: { eyebrow: "Overview",   title: "Dashboard" },
  builder:   { eyebrow: "Sales",      title: "New proposal" },
  proposals: { eyebrow: "Sales",      title: "Proposals" },
  projects:  { eyebrow: "Operations", title: "Projects" },
  contacts:  { eyebrow: "CRM",        title: "Contacts" },
  products:  { eyebrow: "Catalog",    title: "Products" },
  assets:    { eyebrow: "Library",    title: "Assets" },
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

function prefsFromAppSettings(appPrefs?: AppSettings["appPreferences"]): Prefs {
  return {
    navLayout: appPrefs?.navLayout ?? DEFAULT_PREFS.navLayout,
    sidebarCollapsed: appPrefs?.sidebarCollapsed ?? DEFAULT_PREFS.sidebarCollapsed,
    density: appPrefs?.density ?? (appPrefs?.compactMode ? "compact" : DEFAULT_PREFS.density),
    accent: appPrefs?.accent ?? DEFAULT_PREFS.accent,
  };
}

function readStoredPrefs(base: Prefs): Prefs {
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem("v2-prefs");
    return raw ? { ...base, ...JSON.parse(raw) } : base;
  } catch {
    return base;
  }
}

function usePrefs(appPrefs?: AppSettings["appPreferences"]): [Prefs, (k: keyof Prefs, v: Prefs[keyof Prefs]) => void] {
  const basePrefs = useMemo(() => prefsFromAppSettings(appPrefs), [appPrefs]);
  const [prefs, setPrefs] = useState<Prefs>(() => readStoredPrefs(basePrefs));

  useEffect(() => {
    setPrefs(readStoredPrefs(basePrefs));
  }, [basePrefs]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setPrefs(detail ? { ...basePrefs, ...detail } : readStoredPrefs(basePrefs));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("v2-prefs-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("v2-prefs-change", sync);
    };
  }, [basePrefs]);

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
  if (pathname === "/" || pathname === "/v2") return "dashboard";
  if (pathname.startsWith("/v2/")) return pathname.split("/")[2] ?? "dashboard";
  const seg = pathname.split("/")[1] ?? "dashboard";
  if (seg === "pricing") return "builder";
  if (seg === "quotes") return "proposals";
  return seg;
}

function hrefsForPath(_pathname: string) {
  return {
    dashboard: "/",
    proposals: "/proposals",
    projects: "/projects",
    contacts: "/contacts",
    products: "/products",
    assets: "/assets",
    settings: "/settings",
    builder: "/builder",
  };
}

export function V2Shell({ children, fullBleedContent }: { children: React.ReactNode; fullBleedContent?: boolean }) {
  const pathname = usePathname() ?? "/v2";
  const router = useRouter();
  const view = viewFromPath(pathname);
  const hrefs = useMemo(() => hrefsForPath(pathname), [pathname]);
  const [calcOpen, setCalcOpen] = useState(false);
  const { proposals, projects, contacts, settings } = useV2LiveData();
  const [prefs, setPref] = usePrefs(settings.appPreferences);
  const companyName = settings.companyProfile.businessName || "Contractor Studio";
  const contactName = settings.companyProfile.contactName || "Cristian Villavicencio";
  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => {
        const href = hrefs[item.id as keyof typeof hrefs] ?? item.href;
        if (item.id === "proposals") return { ...item, href, badge: proposals.length };
        if (item.id === "projects") return { ...item, href, badge: projects.length };
        if (item.id === "contacts") return { ...item, href, badge: contacts.length };
        return { ...item, href };
      }),
    [contacts.length, hrefs, projects.length, proposals.length]
  );

  useEffect(() => {
    applyAppPreferencesVisuals(settings.appPreferences);
    return () => disposeAppPreferencesVisualListeners();
  }, [settings.appPreferences]);

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
          <Sidebar
            view={view}
            collapsed={prefs.sidebarCollapsed}
            setCollapsed={(c) => setPref("sidebarCollapsed", c)}
            navItems={navItems}
            companyName={companyName}
            contactName={contactName}
            builderHref={hrefs.builder}
          />
        )}
        <div className="main">
          <Topbar
            view={view}
            navLayout={prefs.navLayout}
            navItems={navItems}
            companyName={companyName}
            contactName={contactName}
            builderHref={hrefs.builder}
          />
          <div
            className={fullBleedContent ? "content content-bleed" : "content"}
            key={pathname}
          >
            {children}
          </div>
        </div>
        <CalcFab open={calcOpen} setOpen={setCalcOpen} />
      </div>
    </div>
  );
}

function Sidebar({
  view,
  collapsed,
  setCollapsed,
  navItems,
  companyName,
  contactName,
  builderHref,
}: {
  view: string;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  navItems: NavItem[];
  companyName: string;
  contactName: string;
  builderHref: string;
}) {
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userOpen]);

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
        {navItems.map((item) => (
          <Link key={item.id} href={item.href} className={`nav-item ${view === item.id ? "active" : ""}`} title={collapsed ? item.label : undefined}>
            <span className="ico"><Icon name={item.icon} size={16} /></span>
            <span className="label">{item.label}</span>
            {item.badge ? <span className="badge">{item.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Link href={builderHref} className="quick-action">
          <Icon name="plus" size={14} /> <span className="label">New proposal</span>
        </Link>
        <div ref={userRef} style={{ position: "relative" }}>
          <div
            className="user-pill"
            onClick={() => setUserOpen((v) => !v)}
            style={{ cursor: "pointer" }}
            title={collapsed ? contactName : undefined}
          >
            <div className="avatar">{initials(contactName)}</div>
            <div className="meta">
              <div className="uname">{contactName}</div>
              <div className="ubiz">{companyName}</div>
            </div>
            {!collapsed && <span style={{ opacity: 0.5, flexShrink: 0, display: "flex" }}><Icon name="chevron-d" size={13} /></span>}
          </div>
          {userOpen && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, zIndex: 100 }}>
              <UserDropdown onClose={() => setUserOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  view,
  navLayout,
  navItems,
  companyName,
  contactName,
  builderHref,
}: {
  view: string;
  navLayout: Prefs["navLayout"];
  navItems: NavItem[];
  companyName: string;
  contactName: string;
  builderHref: string;
}) {
  const t = TITLES[view] ?? { eyebrow: "", title: "" };
  const topbarMode = navLayout === "topbar";
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [userOpen]);

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
              {navItems.map((n) => (
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
        {topbarMode && (
          <div ref={userRef} style={{ position: "relative" }}>
            <div className="user-chip" onClick={() => setUserOpen((v) => !v)} style={{ cursor: "pointer" }}>
              <div className="avatar" style={{ background: "#3a89e8" }}>{initials(contactName)}</div>
              <div><div className="uname">{contactName}</div><div className="ubiz">{companyName}</div></div>
              <Icon name="chevron-d" size={14} />
            </div>
            {userOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100 }}>
                <UserDropdown onClose={() => setUserOpen(false)} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UserDropdown({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      clearCompanyIdCache();
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "6px 0",
      boxShadow: "0 8px 32px rgba(26,24,20,.18)", minWidth: 180,
    }}>
      <Link
        href="/settings"
        onClick={onClose}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 14px", fontSize: 13, fontWeight: 500,
          color: "var(--ink-2)", textDecoration: "none", transition: "background .12s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-tint)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Icon name="settings" size={15} />
        Settings
      </Link>
      <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
      <button
        onClick={() => void handleSignOut()}
        disabled={busy}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "9px 14px", fontSize: 13, fontWeight: 500,
          color: "var(--rose)", background: "transparent", border: "none",
          cursor: busy ? "wait" : "pointer", textAlign: "left", transition: "background .12s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--rose-bg)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Icon name="x" size={15} />
        {busy ? "Signing out…" : "Sign out"}
      </button>
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
