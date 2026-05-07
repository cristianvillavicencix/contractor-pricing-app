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
  { name: "Proposal", href: "/quotes", icon: FileText },
];

const settingsItem = { name: "Settings", href: "/settings", icon: Settings };

export function AppSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useLocalStorageState(
    "contractor-pricing-app:sidebar-collapsed",
    false
  );

  return (
    <aside
      className={`flex-none border-b border-[#d9e2ec] bg-white p-5 transition-all duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r ${
        isCollapsed ? "lg:w-24 lg:p-4" : "lg:w-64 lg:p-6"
      }`}
    >
      <div
        className={`flex gap-3 ${
          isCollapsed
            ? "lg:flex-col lg:items-center"
            : "items-center justify-between"
        }`}
      >
        <Link
          href="/"
          className={`flex min-w-0 items-center gap-3 ${
            isCollapsed ? "lg:flex-col lg:justify-center lg:gap-0" : ""
          }`}
          aria-label="Pricing App dashboard"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[#ff5c35] text-sm font-semibold text-white">
            PA
          </div>
          <div className={`min-w-0 ${isCollapsed ? "lg:hidden" : ""}`}>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#213343]">
              Pricing App
            </h1>
            <p className="mt-1 truncate text-xs text-[#516f90]">
              Retail pricing intelligence
            </p>
          </div>
        </Link>

        <button
          onClick={() => setIsCollapsed((current) => !current)}
          className={`hidden flex-none items-center justify-center border border-[#d9e2ec] text-[#516f90] transition hover:bg-[#f6f8fb] hover:text-[#213343] lg:flex ${
            isCollapsed
              ? "mt-3 h-8 w-8 rounded-md"
              : "h-9 w-9 rounded-md"
          }`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav
        className={`mt-8 flex gap-2 overflow-x-auto lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden ${
          isCollapsed ? "lg:mt-12 lg:gap-4" : "lg:mt-10 lg:gap-2"
        }`}
      >
        <div className="flex gap-2 lg:block lg:space-y-2">
          {sidebarItems.map((item) => (
            <SidebarLink
              key={item.name}
              item={item}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        <div className="flex gap-2 lg:mt-auto lg:block lg:space-y-2">
          <SidebarLink
            item={settingsItem}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
        </div>
      </nav>

    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  isCollapsed,
}: {
  item: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  pathname: string;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.name : undefined}
      className={`flex items-center rounded-md text-left text-sm transition lg:w-full ${
        isCollapsed
          ? "justify-center px-3 py-3 lg:mx-auto lg:h-11 lg:w-11"
          : "gap-3 px-4 py-3"
      } ${
        isActive
          ? "bg-[#fff1ea] font-medium text-[#213343]"
          : "text-[#516f90] hover:bg-[#f6f8fb] hover:text-[#213343]"
      }`}
    >
      <Icon className="h-4 w-4 flex-none" />
      <span className={isCollapsed ? "lg:hidden" : ""}>{item.name}</span>
    </Link>
  );
}
