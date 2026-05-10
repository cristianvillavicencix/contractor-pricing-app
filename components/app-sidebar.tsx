"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  ChevronLeft,
  ChevronRight,
  FileText,
  Settings,
  Users,
} from "lucide-react";
import { defaultSettings, mergeAppSettings, type AppSettings } from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings, saveCompanySettings } from "@/lib/supabase/data";
import { SignOutButton } from "@/components/sign-out-button";

const sidebarItems = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Calculator", href: "/pricing", icon: Calculator },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Projects", href: "/projects", icon: BriefcaseBusiness },
  { name: "Proposals", href: "/quotes", icon: FileText },
];

const settingsItem = { name: "Settings", href: "/settings", icon: Settings };
const allMobileItems = [...sidebarItems, settingsItem];

export function AppSidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        if (cancelled) return;
        const merged = mergeAppSettings(raw ?? defaultSettings);
        setIsCollapsed(Boolean(merged.appPreferences.sidebarCollapsed));
      } catch {
        /* unauthenticated or network */
      } finally {
        if (!cancelled) setPrefsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const persistCollapsed = useCallback(
    async (next: boolean) => {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        const base = mergeAppSettings(raw ?? defaultSettings);
        await saveCompanySettings(supabase, {
          ...base,
          appPreferences: { ...base.appPreferences, sidebarCollapsed: next },
        });
      } catch {
        /* non-fatal */
      }
    },
    [supabase]
  );

  function toggleCollapsed() {
    setIsCollapsed((c) => {
      const next = !c;
      void persistCollapsed(next);
      return next;
    });
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  // Avoid layout jump: keep default expanded until prefs load (usually instant).
  const collapsed = prefsLoaded ? isCollapsed : false;

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        data-app-sidebar
        data-collapsed={collapsed ? "true" : "false"}
        className={`hidden flex-none border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:sticky lg:top-0 ${
          collapsed ? "lg:w-20 lg:p-4" : "lg:w-64 lg:p-6"
        }`}
      >
        <div
          className={`flex gap-3 ${
            collapsed ? "flex-col items-center" : "items-center justify-between"
          }`}
        >
          <Link
            href="/"
            className={`flex min-w-0 items-center gap-3 ${
              collapsed ? "flex-col justify-center gap-0" : ""
            }`}
            aria-label="Pricing App dashboard"
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#ff5c35] text-sm font-semibold text-white">
              PA
            </div>
            <div className={`min-w-0 ${collapsed ? "hidden" : ""}`}>
              <h1 className="truncate text-lg font-semibold tracking-tight text-sidebar-foreground">
                Pricing App
              </h1>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                Retail pricing intelligence
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            className={`flex flex-none items-center justify-center border border-sidebar-border text-muted-foreground transition hover:bg-muted hover:text-foreground ${
              collapsed ? "mt-3 h-8 w-8 rounded-md" : "h-9 w-9 rounded-md"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav
          className={`mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden gap-1 ${
            collapsed ? "mt-10 gap-3" : ""
          }`}
        >
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <DesktopLink
                key={item.name}
                item={item}
                active={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
          <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
            <DesktopLink
              item={settingsItem}
              active={isActive(settingsItem.href)}
              collapsed={collapsed}
            />
            <SignOutButton collapsed={collapsed} />
          </div>
        </nav>
      </aside>

      {/* ── Mobile bottom nav (<lg) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden">
        {allMobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-[#ff5c35]" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function DesktopLink({
  item,
  active,
  collapsed,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      className={`flex w-full items-center rounded-md text-sm transition ${
        collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
      } ${
        active
          ? "bg-accent font-medium text-[#ff5c35]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4 flex-none" />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  );
}
