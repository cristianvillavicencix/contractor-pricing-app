"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  defaultSettings,
  mergeAppSettings,
  type AppSettings,
} from "@/lib/app-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings } from "@/lib/supabase/data";

const ONBOARDING_PATH = "/onboarding";
const LOGIN_PREFIX = "/login";
const AUTH_PREFIX = "/auth";

const SKIP_PREFIXES = [
  ONBOARDING_PATH,
  LOGIN_PREFIX,
  "/signup",
  "/forgot-password",
  AUTH_PREFIX,
  "/proposal/",
];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  // Once we confirm onboarding is done, skip all future checks this session.
  const onboardingConfirmed = useRef(false);

  useEffect(() => {
    if (!pathname) return;
    if (onboardingConfirmed.current) return;
    if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return;

    let cancelled = false;
    (async () => {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        if (cancelled) return;
        const settings = mergeAppSettings(raw ?? defaultSettings);
        if (!settings.onboardingCompletedAt) {
          router.replace(ONBOARDING_PATH);
        } else {
          onboardingConfirmed.current = true;
        }
      } catch {
        router.replace(ONBOARDING_PATH);
      }
    })();

    return () => { cancelled = true; };
  }, [pathname, router, supabase]);

  return <>{children}</>;
}
