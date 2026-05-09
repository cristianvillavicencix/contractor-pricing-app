import type { AppSettings } from "./app-data";
import { defaultSettings, mergeAppSettings } from "./app-data";
import { createSupabaseBrowserClient } from "./supabase/browser";
import { loadCompanySettings } from "./supabase/data";

type SupabaseBrowser = ReturnType<typeof createSupabaseBrowserClient>;

/** After login, send new users to onboarding until the wizard is completed. */
export async function resolvePostAuthPath(
  supabase: SupabaseBrowser,
  next: string
): Promise<string> {
  try {
    const raw = await loadCompanySettings<AppSettings | null>(supabase);
    const settings = mergeAppSettings(raw ?? defaultSettings);
    if (!settings.onboardingCompletedAt) return "/onboarding";
  } catch {
    /* Network or missing company row — continue to app; OnboardingGate will enforce onboarding. */
    return next;
  }
  return next;
}
