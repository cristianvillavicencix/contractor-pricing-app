import type { AppSettings } from "./app-data";
import { setMoneyFormatPrefs, type SupportedCurrency } from "./money-format-prefs";

type AppPrefs = AppSettings["appPreferences"];

let systemMqlCleanup: (() => void) | null = null;

function clearSystemThemeListener() {
  systemMqlCleanup?.();
  systemMqlCleanup = null;
}

/** Stop listening to OS theme (e.g. on sync effect cleanup before re-applying). */
export function disposeAppPreferencesVisualListeners() {
  clearSystemThemeListener();
}

function bindSystemThemeListener(onDark: (dark: boolean) => void) {
  clearSystemThemeListener();
  if (typeof window === "undefined") return;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const fn = () => onDark(mql.matches);
  fn();
  mql.addEventListener("change", fn);
  systemMqlCleanup = () => mql.removeEventListener("change", fn);
}

/**
 * Applies theme (incl. system preference), compact layout class, and number/currency formatting.
 * Safe to call from the browser whenever `appPreferences` changes (settings preview or after load).
 */
export function applyAppPreferencesVisuals(prefs: AppPrefs) {
  if (typeof document === "undefined") return;

  setMoneyFormatPrefs({
    currency: prefs.currency as SupportedCurrency,
    numberFormat: prefs.numberFormat,
  });

  const root = document.documentElement;
  root.classList.toggle("app-compact", prefs.compactMode);

  clearSystemThemeListener();

  if (prefs.theme === "Dark") {
    root.classList.add("dark");
  } else if (prefs.theme === "Light") {
    root.classList.remove("dark");
  } else {
    bindSystemThemeListener((dark) => {
      root.classList.toggle("dark", dark);
    });
  }
}
