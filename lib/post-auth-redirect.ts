import type { AppSettings } from "./app-data";
import { defaultSettings, mergeAppSettings } from "./app-data";
import { createSupabaseBrowserClient } from "./supabase/browser";
import { loadCompanySettings } from "./supabase/data";

type SupabaseBrowser = ReturnType<typeof createSupabaseBrowserClient>;

function landingPathFromSettings(settings: AppSettings): string {
  const page = settings.appPreferences.defaultLandingPage;
  if (page === "Projects") return "/projects";
  if (page === "Pricing") return "/pricing";
  return "/";
}

/** After login, send new users to onboarding until the wizard is completed. */
export async function resolvePostAuthPath(
  supabase: SupabaseBrowser,
  next: string
): Promise<string> {
  if (next === "/auth/update-password" || next.startsWith("/auth/update-password?")) {
    return "/auth/update-password";
  }
  try {
    const raw = await loadCompanySettings<AppSettings | null>(supabase);
    const settings = mergeAppSettings(raw ?? defaultSettings);
    if (!settings.onboardingCompletedAt) return "/onboarding";
    const home = landingPathFromSettings(settings);
    if (next === "/" || next === "/projects") return home;
    return next;
  } catch {
    /* Network or missing company row — continue to app; OnboardingGate will enforce onboarding. */
    return next;
  }
}
