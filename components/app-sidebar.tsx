"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  Menu,
  Package,
  Send,
  Settings,
  Users,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  defaultSettings,
  getUploadedCompanyLogoUrl,
  mergeAppSettings,
  type AppSettings,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings } from "@/lib/supabase/data";

const navItems = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Proposals", href: "/proposals", icon: Send },
  { name: "Projects", href: "/projects", icon: BriefcaseBusiness },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Products", href: "/products", icon: Package },
];

const settingsItem = { name: "Settings", href: "/settings", icon: Settings };
const mobileItems = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Proposals", href: "/proposals", icon: Send },
  { name: "Projects", href: "/projects", icon: BriefcaseBusiness },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  settingsItem,
];

type TopbarProfile = {
  companyName: string;
  contactName: string;
  companyIconUrls: string[];
};

const defaultTopbarProfile: TopbarProfile = {
  companyName: defaultSettings.companyProfile.businessName,
  contactName: "",
  companyIconUrls: [],
};

let cachedTopbarProfile: TopbarProfile | null = null;
const failedCompanyIconUrls = new Set<string>();
const TOPBAR_PROFILE_CACHE_KEY = "contractor-pricing-app:topbar-profile";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [topbarProfile, setTopbarProfile] = useState(
    () => cachedTopbarProfile ?? defaultTopbarProfile
  );
  const [topbarProfileReady, setTopbarProfileReady] = useState(() => Boolean(cachedTopbarProfile));

  useEffect(() => {
    let cancelled = false;

    if (!cachedTopbarProfile) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setTopbarProfile(getCachedTopbarProfile());
        setTopbarProfileReady(true);
      });
    }

    loadCompanySettings<AppSettings | null>(supabase)
      .then((raw) => {
        if (cancelled) return;
        const merged = mergeAppSettings(raw ?? defaultSettings);
        const nextCompanyName =
          merged.companyProfile.businessName.trim() || defaultSettings.companyProfile.businessName;
        const uploadedLogoUrl = getUploadedCompanyLogoUrl(merged.branding.logoUrl);
        const nextProfile = {
          companyName: nextCompanyName,
          contactName: merged.companyProfile.contactName.trim(),
          companyIconUrls: uniqueUrls([uploadedLogoUrl]),
        };
        cacheTopbarProfile(nextProfile);
        setTopbarProfile(nextProfile);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function isSalesActive() {
    return pathname.startsWith("/pricing") || pathname.startsWith("/quotes") || pathname.startsWith("/proposals");
  }

  const prefetchRoute = useCallback(
    (href: string) => {
      if (prefetchedRoutesRef.current.has(href)) return;
      prefetchedRoutesRef.current.add(href);
      void router.prefetch(href);
    },
    [router]
  );

  return (
    <header
      data-app-topbar
      className="fixed inset-x-0 top-0 z-50 border-b border-black/20 bg-[#1e1e1e] shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
    >
      <div className="mx-auto flex h-18 max-w-[1720px] items-center gap-4 px-4 text-white sm:px-6">
        <Link
          href="/"
          onMouseEnter={() => prefetchRoute("/")}
          onFocus={() => prefetchRoute("/")}
          onClick={() => {
            prefetchRoute("/");
            setMobileOpen(false);
          }}
          className="flex min-w-0 items-center gap-3"
          aria-label="Bidwise dashboard"
        >
          <BrandLogo variant="dark" className="h-auto w-[160px] object-contain sm:w-[190px]" />
        </Link>

        <nav className="ml-4 hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex">
          {navItems.map((item) => (
            <TopNavLink
              key={item.name}
              item={item}
              active={item.name === "Proposals" ? isSalesActive() : isActive(item.href)}
              onPrefetch={prefetchRoute}
            />
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 xl:flex">
          <AdminMenu
            active={isActive(settingsItem.href)}
            companyName={topbarProfile.companyName}
            contactName={topbarProfile.contactName}
            companyIconUrls={topbarProfile.companyIconUrls}
            ready={topbarProfileReady}
            onPrefetch={prefetchRoute}
          />
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/14 xl:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/10 bg-[#1e1e1e] p-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] xl:hidden">
          <div className="grid gap-1 sm:grid-cols-2">
            {mobileItems.map((item) => (
              <MobileNavLink
                key={item.name}
                item={item}
                active={isActive(item.href)}
                onPrefetch={prefetchRoute}
                onClose={() => setMobileOpen(false)}
              />
            ))}
          </div>
          <div className="mt-3 border-t border-white/10 pt-3">
            <SignOutButton layout="menu" />
          </div>
        </div>
      ) : null}
    </header>
  );
}

function TopNavLink({
  item,
  active,
  onPrefetch,
}: {
  item: {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  };
  active: boolean;
  onPrefetch: (href: string) => void;
}) {
  const Icon = item.icon;

  if (item.children?.length) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onMouseEnter={() => {
              onPrefetch(item.href);
              item.children?.forEach((child) => onPrefetch(child.href));
            }}
            onFocus={() => onPrefetch(item.href)}
            className={`relative inline-flex h-18 items-center gap-2 px-4 text-sm font-semibold transition after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-[#ffd400] after:transition ${
              active
                ? "text-white after:opacity-100"
                : "text-white/68 after:opacity-0 hover:text-white hover:after:opacity-100"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.name}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 rounded-xl border border-black/10 bg-white p-2 text-[#111111] shadow-xl">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <DropdownMenuItem key={child.href} asChild className="cursor-pointer px-2 py-2.5">
                <Link href={child.href} onClick={() => onPrefetch(child.href)}>
                  <ChildIcon className="h-4 w-4" />
                  {child.name}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link
      href={item.href}
      onMouseEnter={() => onPrefetch(item.href)}
      onFocus={() => onPrefetch(item.href)}
      onClick={() => onPrefetch(item.href)}
      className={`relative inline-flex h-18 items-center gap-2 px-4 text-sm font-semibold transition after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-[#ffd400] after:transition ${
        active
          ? "text-white after:opacity-100"
          : "text-white/68 after:opacity-0 hover:text-white hover:after:opacity-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  );
}

function AdminMenu({
  active,
  companyName,
  contactName,
  companyIconUrls,
  ready,
  onPrefetch,
}: {
  active: boolean;
  companyName: string;
  contactName: string;
  companyIconUrls: string[];
  ready: boolean;
  onPrefetch: (href: string) => void;
}) {
  const displayName = contactName.trim() || companyName;
  const initials = getInitials(companyName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => onPrefetch(settingsItem.href)}
          onFocus={() => onPrefetch(settingsItem.href)}
          className={`flex items-center gap-3 rounded-full py-1 pl-1 pr-0 text-white transition hover:text-white ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <CompanyAvatar imageUrls={companyIconUrls} initials={initials} />
          <div className="min-w-0 leading-tight">
            <p className="max-w-42 truncate text-sm font-semibold">{displayName}</p>
            <p className="max-w-42 truncate text-xs text-white/58">{companyName}</p>
          </div>
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              active ? "bg-[#ffd400] text-black" : "bg-white/12 text-white/65 hover:bg-white/18 hover:text-white"
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl border border-black/10 bg-white p-2 text-[#111111] shadow-xl">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-sm font-semibold text-[#111111]">{displayName}</span>
          <span className="block truncate text-xs font-normal text-gray-500">{companyName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer px-2 py-2.5">
          <Link href={settingsItem.href} onClick={() => onPrefetch(settingsItem.href)}>
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutButton layout="menu" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CompanyAvatar({ imageUrls, initials }: { imageUrls: string[]; initials: string }) {
  const [failedImageUrls, setFailedImageUrls] = useState(() => Array.from(failedCompanyIconUrls));
  const imageUrl = imageUrls.find((url) => url && !failedImageUrls.includes(url));

  if (imageUrl) {
    return (
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-black ring-1 ring-white/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => {
            failedCompanyIconUrls.add(imageUrl);
            setFailedImageUrls(Array.from(failedCompanyIconUrls));
          }}
        />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff,#8d949f)] text-sm font-black text-black">
      {initials}
    </span>
  );
}

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "CP";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean))).filter(
    (url) => !isFaviconFallbackUrl(url)
  );
}

function isFaviconFallbackUrl(url: string) {
  return /\/(?:favicon\.ico|favicon\.png|apple-touch-icon\.png)(?:\?|$)/i.test(url)
    || /\/\/www\.google\.com\/s2\/favicons/i.test(url);
}

function getCachedTopbarProfile() {
  if (cachedTopbarProfile) return cachedTopbarProfile;
  if (typeof window === "undefined") return defaultTopbarProfile;

  try {
    const raw = window.localStorage.getItem(TOPBAR_PROFILE_CACHE_KEY);
    if (!raw) return defaultTopbarProfile;
    const parsed = JSON.parse(raw) as Partial<TopbarProfile>;
    const profile = {
      companyName: parsed.companyName?.trim() || defaultTopbarProfile.companyName,
      contactName: parsed.contactName?.trim() || "",
      companyIconUrls: parsed.companyIconUrls?.length
        ? uniqueUrls(parsed.companyIconUrls)
        : defaultTopbarProfile.companyIconUrls,
    };
    cachedTopbarProfile = profile;
    return profile;
  } catch {
    return defaultTopbarProfile;
  }
}

function cacheTopbarProfile(profile: TopbarProfile) {
  cachedTopbarProfile = profile;
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(TOPBAR_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore unavailable storage */
  }
}

function MobileNavLink({
  item,
  active,
  onPrefetch,
  onClose,
}: {
  item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  onPrefetch: (href: string) => void;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onMouseEnter={() => onPrefetch(item.href)}
      onFocus={() => onPrefetch(item.href)}
      onClick={() => {
        onPrefetch(item.href);
        onClose();
      }}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
        active ? "bg-[#ffd400] text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  );
}
