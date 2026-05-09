"use client";

import { useEffect, useMemo } from "react";
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

/**
 * Redirects to onboarding when the user is authenticated but has not completed the wizard.
 * Does not block paint; skips login, auth, public proposal routes, and onboarding itself.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!pathname) return;

    if (
      pathname === ONBOARDING_PATH ||
      pathname.startsWith(LOGIN_PREFIX) ||
      pathname.startsWith(AUTH_PREFIX) ||
      pathname.startsWith("/proposal/") ||
      pathname.startsWith("/auth/complete")
    ) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        if (cancelled) return;
        const settings = mergeAppSettings(raw ?? defaultSettings);
        if (!settings.onboardingCompletedAt) {
          router.replace(ONBOARDING_PATH);
        }
      } catch {
        /* Missing company / settings row — new accounts should complete onboarding */
        router.replace(ONBOARDING_PATH);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, supabase]);

  return <>{children}</>;
}
