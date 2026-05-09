import type { PricingEngineInput } from "@/lib/pricing-engine";

const STORAGE_KEY = "contractor-pricing-sessions-v1";
const MAX_ENTRIES = 30;

export type PricingProjectDraftSnapshot = {
  contactId: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
};

export type PricingSessionHistoryEntry = {
  id: string;
  savedAt: string;
  label: string;
  input: PricingEngineInput;
  projectDraft: PricingProjectDraftSnapshot;
  sourceProjectId: string | null;
};

function readRaw(): PricingSessionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PricingSessionHistoryEntry[];
  } catch {
    return [];
  }
}

function writeRaw(entries: PricingSessionHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadPricingSessionHistory(): PricingSessionHistoryEntry[] {
  return readRaw();
}

export function appendPricingSessionHistory(
  entry: Omit<PricingSessionHistoryEntry, "id" | "savedAt"> & {
    id?: string;
    savedAt?: string;
  }
) {
  const full: PricingSessionHistoryEntry = {
    id: entry.id ?? crypto.randomUUID(),
    savedAt: entry.savedAt ?? new Date().toISOString(),
    label: entry.label,
    input: entry.input,
    projectDraft: entry.projectDraft,
    sourceProjectId: entry.sourceProjectId,
  };
  const next = [full, ...readRaw().filter((e) => e.id !== full.id)].slice(0, MAX_ENTRIES);
  writeRaw(next);
}

export function removePricingSessionHistory(id: string) {
  writeRaw(readRaw().filter((e) => e.id !== id));
}

export function clearPricingSessionHistory() {
  writeRaw([]);
}

export const PRICING_SESSION_RESTORE_EVENT = "contractor-pricing-restore-session";

export function dispatchRestorePricingSession(entry: PricingSessionHistoryEntry) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRICING_SESSION_RESTORE_EVENT, { detail: entry }));
}
