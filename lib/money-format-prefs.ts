/** Mutable prefs read by `formatMoney` (no React context = works in plain helpers). */

export type SupportedCurrency = "USD";

export type NumberFormatStyle = "1,000.00" | "1000.00";

let currency: SupportedCurrency = "USD";
let numberFormat: NumberFormatStyle = "1,000.00";

export function setMoneyFormatPrefs(next: {
  currency?: SupportedCurrency;
  numberFormat?: NumberFormatStyle;
}) {
  if (next.currency !== undefined) currency = next.currency;
  if (next.numberFormat !== undefined) numberFormat = next.numberFormat;
}

export function getMoneyFormatPrefs() {
  return { currency, numberFormat } as const;
}
