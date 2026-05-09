import { z } from "zod";
import type { AppSettings } from "./app-data";

const appSettingsShape = z
  .object({
    companyProfile: z
      .object({
        businessName: z.string(),
      })
      .passthrough(),
    pricingDefaults: z
      .object({
        goodMargin: z.number(),
        betterMargin: z.number(),
        bestMargin: z.number(),
        minimumSafeMargin: z.number(),
      })
      .passthrough(),
    proposalSettings: z
      .object({
        defaultExpirationDays: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

/** Returns an error message if settings cannot be saved, or null if OK. */
export function getAppSettingsValidationError(settings: unknown): string | null {
  const parsed = appSettingsShape.safeParse(settings);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ");
  }

  const s = settings as AppSettings;

  if (!s.companyProfile.businessName.trim()) {
    return "Business name should not be empty.";
  }

  if (s.proposalSettings.defaultExpirationDays < 1) {
    return "Default expiration days cannot be below 1.";
  }

  const { goodMargin, betterMargin, bestMargin } = s.pricingDefaults;
  if (goodMargin >= betterMargin) {
    return "Good margin must be lower than Better margin.";
  }
  if (betterMargin >= bestMargin) {
    return "Better margin must be lower than Best margin.";
  }
  if (goodMargin < 5 || bestMargin > 80) {
    return "Margins must be between 5% and 80%.";
  }

  return null;
}
