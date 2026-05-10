"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { defaultSettings, mergeAppSettings, type AppSettings } from "@/lib/app-data";
import { APP_PREFERENCES_SYNC_EVENT } from "@/lib/app-preferences-events";
import {
  applyAppPreferencesVisuals,
  disposeAppPreferencesVisualListeners,
} from "@/lib/app-preferences-live";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadCompanySettings } from "@/lib/supabase/data";

/**
 * Loads company `appPreferences` and applies theme, compact mode, and money formatting.
 * Re-runs on navigation (reverts unsaved settings preview) and when `requestAppPreferencesSync()` fires.
 */
export function AppPreferencesSync() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function pullAndApply() {
      try {
        const raw = await loadCompanySettings<AppSettings | null>(supabase);
        if (cancelled) return;
        const merged = mergeAppSettings(raw ?? defaultSettings);
        applyAppPreferencesVisuals(merged.appPreferences);
      } catch {
        if (cancelled) return;
        applyAppPreferencesVisuals(defaultSettings.appPreferences);
      }
    }

    void pullAndApply();
    window.addEventListener(APP_PREFERENCES_SYNC_EVENT, pullAndApply);
    return () => {
      cancelled = true;
      window.removeEventListener(APP_PREFERENCES_SYNC_EVENT, pullAndApply);
      disposeAppPreferencesVisualListeners();
    };
  }, [pathname, supabase]);

  return null;
}
