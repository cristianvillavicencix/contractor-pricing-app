"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { useLocalStorageState } from "@/lib/use-local-storage";

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
  const [isCollapsed, setIsCollapsed] = useLocalStorageState(
    "contractor-pricing-app:sidebar-collapsed",
    false
  );

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className={`hidden flex-none border-r border-[#d9e2ec] bg-white transition-all duration-200 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:sticky lg:top-0 ${
          isCollapsed ? "lg:w-20 lg:p-4" : "lg:w-64 lg:p-6"
        }`}
      >
        <div
          className={`flex gap-3 ${
            isCollapsed ? "flex-col items-center" : "items-center justify-between"
          }`}
        >
          <Link
            href="/"
            className={`flex min-w-0 items-center gap-3 ${
              isCollapsed ? "flex-col justify-center gap-0" : ""
            }`}
            aria-label="Pricing App dashboard"
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#ff5c35] text-sm font-semibold text-white">
              PA
            </div>
            <div className={`min-w-0 ${isCollapsed ? "hidden" : ""}`}>
              <h1 className="truncate text-lg font-semibold tracking-tight text-[#213343]">
                Pricing App
              </h1>
              <p className="mt-1 truncate text-xs text-[#516f90]">
                Retail pricing intelligence
              </p>
            </div>
          </Link>

          <button
            onClick={() => setIsCollapsed((c) => !c)}
            className={`flex flex-none items-center justify-center border border-[#d9e2ec] text-[#516f90] transition hover:bg-[#f6f8fb] hover:text-[#213343] ${
              isCollapsed ? "mt-3 h-8 w-8 rounded-md" : "h-9 w-9 rounded-md"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav
          className={`mt-8 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden gap-1 ${
            isCollapsed ? "mt-10 gap-3" : ""
          }`}
        >
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <DesktopLink
                key={item.name}
                item={item}
                active={isActive(item.href)}
                collapsed={isCollapsed}
              />
            ))}
          </div>
          <div className="mt-auto space-y-1">
            <DesktopLink
              item={settingsItem}
              active={isActive(settingsItem.href)}
              collapsed={isCollapsed}
            />
          </div>
        </nav>
      </aside>

      {/* ── Mobile bottom nav (<lg) ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-[#d9e2ec] bg-white lg:hidden">
        {allMobileItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? "text-[#ff5c35]" : "text-[#516f90]"
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
        collapsed
          ? "justify-center px-0 py-3"
          : "gap-3 px-4 py-3"
      } ${
        active
          ? "bg-[#fff1ea] font-medium text-[#213343]"
          : "text-[#516f90] hover:bg-[#f6f8fb] hover:text-[#213343]"
      }`}
    >
      <Icon className="h-4 w-4 flex-none" />
      {!collapsed && <span>{item.name}</span>}
    </Link>
  );
}
