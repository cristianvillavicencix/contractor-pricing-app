/** Fired after settings are saved so `AppPreferencesSync` can re-apply from Supabase. */
export const APP_PREFERENCES_SYNC_EVENT = "contractor-app-preferences-sync";

export function requestAppPreferencesSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_PREFERENCES_SYNC_EVENT));
  }
}
