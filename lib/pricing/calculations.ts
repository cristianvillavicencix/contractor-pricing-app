export type PricingMethod = "margin" | "markup";

export function assertNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative`);
  }
}

export function calculateMarkupPrice(cost: number, markupPercent: number) {
  assertNonNegative(cost, "Cost");
  assertNonNegative(markupPercent, "Markup");
  return cost * (1 + markupPercent / 100);
}

export function calculateMarginPrice(cost: number, marginPercent: number) {
  assertNonNegative(cost, "Cost");
  assertNonNegative(marginPercent, "Margin");
  if (marginPercent >= 100) {
    throw new Error("Margin must be less than 100%");
  }
  return cost / (1 - marginPercent / 100);
}

export function calculateMarginPercent(cost: number, price: number) {
  assertNonNegative(cost, "Cost");
  assertNonNegative(price, "Price");
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function calculateMarkupPercent(cost: number, price: number) {
  assertNonNegative(cost, "Cost");
  assertNonNegative(price, "Price");
  if (cost === 0) return 0;
  return ((price - cost) / cost) * 100;
}

export function calculateDirectCost(input: {
  materials: number;
  labor: number;
  equipment: number;
  subcontractor: number;
  permits: number;
  otherCosts?: number;
}) {
  const values = [
    input.materials,
    input.labor,
    input.equipment,
    input.subcontractor,
    input.permits,
    input.otherCosts ?? 0,
  ];
  values.forEach((value, index) => assertNonNegative(value, `Cost ${index + 1}`));
  return values.reduce((sum, value) => sum + value, 0);
}

export function calculateFinalPrice(input: {
  directCost: number;
  overheadPercent: number;
  contingencyAmount?: number;
  taxAmount?: number;
  method: PricingMethod;
  marginPercent?: number;
  markupPercent?: number;
}) {
  assertNonNegative(input.directCost, "Direct cost");
  assertNonNegative(input.overheadPercent, "Overhead");
  const overheadAmount = input.directCost * (input.overheadPercent / 100);
  const costWithOverhead =
    input.directCost + overheadAmount + (input.contingencyAmount ?? 0) + (input.taxAmount ?? 0);
  const finalPrice =
    input.method === "margin"
      ? calculateMarginPrice(costWithOverhead, input.marginPercent ?? 0)
      : calculateMarkupPrice(costWithOverhead, input.markupPercent ?? 0);

  return {
    overheadAmount,
    costWithOverhead,
    finalPrice,
    profitAmount: finalPrice - costWithOverhead,
    marginPercent: calculateMarginPercent(costWithOverhead, finalPrice),
    markupPercent: calculateMarkupPercent(costWithOverhead, finalPrice),
  };
}
