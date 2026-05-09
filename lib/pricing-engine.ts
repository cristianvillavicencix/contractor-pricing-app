import type {
  CompanyLevel,
  PriceOptionName,
  ProjectSize,
  ProjectState,
  RiskLevel,
  Strategy,
  Trade,
} from "./app-data";

export type CommissionType = "Percentage" | "Flat Amount";

export type PricingEngineInput = {
  costs: {
    material: number;
    labor: number;
    dumpster: number;
    permits: number;
    equipment: number;
    subcontractor: number;
    miscellaneous: number;
  };
  businessCosts: {
    overheadPercent: number;
    overheadAllocationMethod:
      | "Percentage"
      | "Flat Per Project"
      | "Project Duration"
      | "Ignore For Now";
    monthlyOverhead: number;
    flatOverheadPerProject: number;
    monthlyBillableDays: number;
    projectDurationDays: number;
    laborBurdenPercent: number;
    minimumJobPrice: number;
    miscellaneousBufferPercent: number;
    permitBuffer: number;
    creditCardFeePercent: number;
    financingFeePercent: number;
    taxPercent: number;
    includeCreditCardFee: boolean;
    includeFinancingFee: boolean;
    includeTax: boolean;
    includeMiscellaneousBuffer: boolean;
  };
  commission: {
    includeCommission: boolean;
    commissionType: CommissionType;
    commissionPercentage: number;
    commissionFlatAmount: number;
  };
  setup: {
    trade: Trade;
    state: ProjectState;
    companyLevel: CompanyLevel;
    projectSize: ProjectSize;
    riskLevel: RiskLevel;
    strategy: Strategy;
  };
  pricingRules?: {
    baseMargins: Record<PriceOptionName, number>;
    stateAdjustments: Partial<Record<ProjectState, number>>;
    tradeAdjustments?: Partial<Record<Trade, number>>;
    sizeAdjustments?: Partial<Record<ProjectSize, number>>;
    riskAdjustments?: Partial<Record<RiskLevel, number>>;
    strategyAdjustments?: Partial<Record<Strategy, number>>;
    companyAdjustments?: Partial<Record<CompanyLevel, number>>;
    minimumSafeMargin?: number;
    thresholds?: {
      riskyMargin: number;
      tightMargin: number;
      safePriceCushion: number;
      warningMarginLow: number;
      warningMarginHigh: number;
      warningCommission: number;
      warningFeeProfit: number;
      safeMarginRiskBonus: number;
      safeMarginSmallBonus: number;
      marginClampMin: number;
      marginClampMax: number;
    };
  };
};

export type PricingEngineOption = {
  name: PriceOptionName;
  salePrice: number;
  netProfit: number;
  margin: number;
  markup: number;
  commissionCost: number;
  creditCardFeeCost: number;
  financingFeeCost: number;
  taxCost: number;
  finalMargin: number;
  status: "Safe" | "Tight" | "Risky";
  recommended?: boolean;
};

export type PricingEngineResult = {
  baseCost: number;
  bufferCost: number;
  overheadCost: number;
  laborBurdenCost: number;
  permitBufferCost: number;
  taxCost: number;
  businessCostTotal: number;
  breakevenPrice: number;
  minimumSafePrice: number;
  minimumSafeMargin: number;
  options: PricingEngineOption[];
  projectStatus: "Green" | "Yellow" | "Red";
  projectStatusReason: string;
  warnings: string[];
  adjustments: {
    state: number;
    trade: number;
    company: number;
    size: number;
    risk: number;
    strategy: number;
  };
};

const defaultThresholds = {
  riskyMargin: 0.25,
  tightMargin: 0.35,
  safePriceCushion: 1.08,
  warningMarginLow: 0.30,
  warningMarginHigh: 0.55,
  warningCommission: 0.08,
  warningFeeProfit: 0.10,
  safeMarginRiskBonus: 0.03,
  safeMarginSmallBonus: 0.02,
  marginClampMin: 0.15,
  marginClampMax: 0.65,
};

const baseMargins: Record<PriceOptionName, number> = {
  Good: 0.28,
  Better: 0.35,
  Best: 0.42,
};

const stateAdjustments: Partial<Record<ProjectState, number>> = {
  Connecticut: 0,
  "New York": 0.03,
  "New Jersey": 0.02,
  Florida: -0.02,
  Texas: -0.01,
};

const tradeAdjustments: Record<Trade, number> = {
  Roofing: 0.02,
  Siding: 0.01,
  Painting: 0,
  Drywall: -0.01,
  Gutters: 0.01,
  Remodeling: 0.03,
};

const companyAdjustments: Record<CompanyLevel, number> = {
  "Solo Owner": -0.03,
  "Small Crew": 0,
  "Established Company": 0.03,
  "Premium Company": 0.05,
};

const sizeAdjustments: Record<ProjectSize, number> = {
  Small: 0.05,
  Medium: 0,
  Large: -0.04,
};

const riskAdjustments: Record<RiskLevel, number> = {
  Low: -0.01,
  Medium: 0,
  High: 0.05,
};

const strategyAdjustments: Record<Strategy, number> = {
  Competitive: -0.02,
  Balanced: 0,
  Premium: 0.03,
};

export function calculatePricingEngine(
  input: PricingEngineInput
): PricingEngineResult {
  const baseCost = Object.values(input.costs).reduce(
    (sum, value) => sum + value,
    0
  );
  const laborBurdenCost =
    input.costs.labor * percentToDecimal(input.businessCosts.laborBurdenPercent);
  const bufferCost =
    input.businessCosts.includeMiscellaneousBuffer
      ? baseCost *
        percentToDecimal(input.businessCosts.miscellaneousBufferPercent)
      : 0;
  const permitBufferCost = input.businessCosts.permitBuffer;
  const overheadCost = getOverheadCost(input, baseCost);
  const fixedCostBeforeSaleBasedFees =
    baseCost + laborBurdenCost + bufferCost + overheadCost + permitBufferCost;
  const rules = input.pricingRules ?? {
    baseMargins,
    stateAdjustments,
  };
  const t = rules.thresholds ?? defaultThresholds;
  const minimumSafeMargin =
    (input.pricingRules?.minimumSafeMargin ?? 0.2) +
    (input.setup.riskLevel === "High" ? t.safeMarginRiskBonus : 0) +
    (input.setup.projectSize === "Small" ? t.safeMarginSmallBonus : 0);
  const adjustments = {
    state: rules.stateAdjustments[input.setup.state] ?? 0,
    trade: (rules.tradeAdjustments ?? tradeAdjustments)[input.setup.trade] ?? 0,
    company: (rules.companyAdjustments ?? companyAdjustments)[input.setup.companyLevel] ?? 0,
    size: (rules.sizeAdjustments ?? sizeAdjustments)[input.setup.projectSize] ?? 0,
    risk: (rules.riskAdjustments ?? riskAdjustments)[input.setup.riskLevel] ?? 0,
    strategy: (rules.strategyAdjustments ?? strategyAdjustments)[input.setup.strategy] ?? 0,
  };

  const breakevenPrice = solveSalePrice({
    fixedCostBeforeSaleBasedFees,
    targetMargin: 0,
    input,
    enforceMinimumJobPrice: false,
  }).salePrice;

  const minimumSafePrice = Math.max(
    solveSalePrice({
      fixedCostBeforeSaleBasedFees,
      targetMargin: minimumSafeMargin,
      input,
      enforceMinimumJobPrice: false,
    }).salePrice,
    input.businessCosts.minimumJobPrice
  );

  const options = (["Good", "Better", "Best"] as PriceOptionName[]).map(
    (name) => {
      const finalMargin = clamp(
        rules.baseMargins[name] +
          adjustments.state +
          adjustments.trade +
          adjustments.company +
          adjustments.size +
          adjustments.risk +
          adjustments.strategy,
        t.marginClampMin,
        t.marginClampMax
      );
      const solved = solveSalePrice({
        fixedCostBeforeSaleBasedFees,
        targetMargin: finalMargin,
        input,
        enforceMinimumJobPrice: true,
      });
      const netProfit =
        solved.salePrice -
        baseCost -
        laborBurdenCost -
        overheadCost -
        bufferCost -
        permitBufferCost -
        solved.taxCost -
        solved.commissionCost -
        solved.creditCardFeeCost -
        solved.financingFeeCost;
      const margin = solved.salePrice > 0 ? netProfit / solved.salePrice : 0;
      const markup = baseCost > 0 ? netProfit / baseCost : 0;

      return {
        name,
        salePrice: solved.salePrice,
        netProfit,
        margin,
        markup,
        commissionCost: solved.commissionCost,
        creditCardFeeCost: solved.creditCardFeeCost,
        financingFeeCost: solved.financingFeeCost,
        taxCost: solved.taxCost,
        finalMargin,
        status: getOptionStatus(solved.salePrice, minimumSafePrice, margin, t),
        recommended: name === "Better",
      };
    }
  );

  const good = options[0];
  const better = options[1];
  const warnings = getWarnings({
    baseCost,
    good,
    better,
    minimumSafePrice,
    input,
    options,
    thresholds: t,
  });
  const projectStatus = getProjectStatus(good, better, minimumSafePrice, t);

  return {
    baseCost,
    bufferCost,
    overheadCost,
    laborBurdenCost,
    permitBufferCost,
    taxCost: options[1]?.taxCost ?? 0,
    businessCostTotal:
      laborBurdenCost +
      bufferCost +
      overheadCost +
      permitBufferCost +
      (options[1]?.taxCost ?? 0) +
      (options[1]?.commissionCost ?? 0) +
      (options[1]?.creditCardFeeCost ?? 0) +
      (options[1]?.financingFeeCost ?? 0),
    breakevenPrice,
    minimumSafePrice,
    minimumSafeMargin,
    options,
    projectStatus,
    projectStatusReason: getProjectStatusReason(
      projectStatus,
      good,
      better,
      minimumSafePrice
    ),
    warnings,
    adjustments,
  };
}

/**
 * Retail (client) sale price from loaded job costs and a target **net margin on revenue**.
 *
 * Let F = fixedCostBeforeSaleBasedFees (direct job costs + burden + buffer + allocated overhead + permit buffer),
 * m = targetMargin (decimal), and p = sum of sale-price-based deductions as decimals (tax, card, financing, commission %).
 * With optional flat commission C added to the cost side:
 *
 *   salePrice = (F + C) / (1 - m - p)
 *
 * So (1 - m - p) of revenue covers F + C; the engine then sets commission/card/financing/tax as **percent of salePrice**,
 * and reported **margin** = netProfit / salePrice after those amounts (should match m when minimum job price does not bind).
 */
function solveSalePrice({
  fixedCostBeforeSaleBasedFees,
  targetMargin,
  input,
  enforceMinimumJobPrice,
}: {
  fixedCostBeforeSaleBasedFees: number;
  targetMargin: number;
  input: PricingEngineInput;
  enforceMinimumJobPrice: boolean;
}) {
  const creditCardPercent = input.businessCosts.includeCreditCardFee
    ? percentToDecimal(input.businessCosts.creditCardFeePercent)
    : 0;
  const financingPercent = input.businessCosts.includeFinancingFee
    ? percentToDecimal(input.businessCosts.financingFeePercent)
    : 0;
  const commissionPercent =
    input.commission.includeCommission &&
    input.commission.commissionType === "Percentage"
      ? percentToDecimal(input.commission.commissionPercentage)
      : 0;
  const taxPercent = getTaxPercent(input);
  const flatCommission =
    input.commission.includeCommission &&
    input.commission.commissionType === "Flat Amount"
      ? input.commission.commissionFlatAmount
      : 0;
  const denominator =
    1 -
    targetMargin -
    creditCardPercent -
    financingPercent -
    commissionPercent -
    taxPercent;
  const rawSalePrice =
    denominator > 0
      ? (fixedCostBeforeSaleBasedFees + flatCommission) / denominator
      : 0;
  // denominator ≤ 0 means target margin + fee % ≥ 100% — price is undefined; UI should keep totals & toggles realistic
  const salePrice = enforceMinimumJobPrice
    ? Math.max(rawSalePrice, input.businessCosts.minimumJobPrice)
    : rawSalePrice;

  return {
    salePrice,
    commissionCost: flatCommission + salePrice * commissionPercent,
    creditCardFeeCost: salePrice * creditCardPercent,
    financingFeeCost: salePrice * financingPercent,
    taxCost: salePrice * taxPercent,
  };
}

function getOverheadCost(input: PricingEngineInput, baseCost: number) {
  if (input.businessCosts.overheadAllocationMethod === "Ignore For Now") return 0;
  if (input.businessCosts.overheadAllocationMethod === "Flat Per Project") {
    return input.businessCosts.flatOverheadPerProject;
  }
  if (input.businessCosts.overheadAllocationMethod === "Project Duration") {
    const billableDays = Math.max(1, input.businessCosts.monthlyBillableDays);
    const days = Math.max(1, input.businessCosts.projectDurationDays);
    return (input.businessCosts.monthlyOverhead / billableDays) * days;
  }

  return baseCost * percentToDecimal(input.businessCosts.overheadPercent);
}

function getTaxPercent(input: PricingEngineInput) {
  return input.businessCosts.includeTax
    ? percentToDecimal(input.businessCosts.taxPercent)
    : 0;
}

function getOptionStatus(
  salePrice: number,
  minimumSafePrice: number,
  margin: number,
  t: typeof defaultThresholds
): PricingEngineOption["status"] {
  if (salePrice < minimumSafePrice || margin < t.riskyMargin) return "Risky";
  if (margin < t.tightMargin || salePrice < minimumSafePrice * t.safePriceCushion) return "Tight";
  return "Safe";
}

function getProjectStatus(
  good: PricingEngineOption,
  better: PricingEngineOption,
  minimumSafePrice: number,
  t: typeof defaultThresholds
): PricingEngineResult["projectStatus"] {
  if (better.margin < t.riskyMargin || good.salePrice < minimumSafePrice) return "Red";
  if (better.margin >= t.riskyMargin && better.margin < t.tightMargin) return "Yellow";
  return "Green";
}

function getProjectStatusReason(
  status: PricingEngineResult["projectStatus"],
  good: PricingEngineOption,
  better: PricingEngineOption,
  minimumSafePrice: number
) {
  if (status === "Red") {
    return good.salePrice < minimumSafePrice
      ? "Good price is below the minimum safe price."
      : "Better margin is below the minimum health threshold.";
  }

  if (status === "Yellow") {
    return "Better margin is acceptable but tighter than the target range.";
  }

  return "Better margin is healthy and Good remains above the safe price.";
}

function getWarnings({
  baseCost,
  good,
  better,
  minimumSafePrice,
  input,
  options,
  thresholds: t,
}: {
  baseCost: number;
  good: PricingEngineOption;
  better: PricingEngineOption;
  minimumSafePrice: number;
  input: PricingEngineInput;
  options: PricingEngineOption[];
  thresholds: typeof defaultThresholds;
}) {
  const warnings: string[] = [];
  const feeCost =
    better.creditCardFeeCost + better.financingFeeCost + better.commissionCost;

  if (baseCost === 0) warnings.push("Base cost is 0.");
  const betterDenomCheck =
    1 -
    better.finalMargin -
    (input.businessCosts.includeCreditCardFee
      ? percentToDecimal(input.businessCosts.creditCardFeePercent)
      : 0) -
    (input.businessCosts.includeFinancingFee
      ? percentToDecimal(input.businessCosts.financingFeePercent)
      : 0) -
    (input.commission.includeCommission && input.commission.commissionType === "Percentage"
      ? percentToDecimal(input.commission.commissionPercentage)
      : 0) -
    getTaxPercent(input);
  if (betterDenomCheck <= 0 && baseCost > 0) {
    warnings.push(
      "Target margin plus tax/fees/commission reach or exceed 100% — sale price cannot be computed. Lower margins or fee rates."
    );
  }
  if (good.salePrice < minimumSafePrice) {
    warnings.push("Good price is below Minimum Safe Price.");
  }
  if (better.margin < t.warningMarginLow) {
    warnings.push(`Better margin is below ${Math.round(t.warningMarginLow * 100)}%.`);
  }
  if (input.commission.includeCommission && better.commissionCost > better.salePrice * t.warningCommission) {
    warnings.push(`Commission is higher than ${Math.round(t.warningCommission * 100)}% of sale price.`);
  }
  if (feeCost > better.netProfit * t.warningFeeProfit) {
    warnings.push(`Fees reduce profit by more than ${Math.round(t.warningFeeProfit * 100)}%.`);
  }
  if (options.some((option) => option.finalMargin > t.warningMarginHigh)) {
    warnings.push(`Final margin is higher than ${Math.round(t.warningMarginHigh * 100)}%.`);
  }
  if (
    input.businessCosts.minimumJobPrice > 0 &&
    options.some((option) => option.salePrice === input.businessCosts.minimumJobPrice)
  ) {
    warnings.push("Minimum job price is controlling one or more options.");
  }
  if (input.businessCosts.overheadAllocationMethod === "Ignore For Now") {
    warnings.push("Overhead is ignored for this calculation.");
  }
  if (input.businessCosts.laborBurdenPercent === 0 && input.costs.labor > 0) {
    warnings.push("Labor burden is 0%. Payroll taxes, insurance, and benefits may be missing.");
  }

  return warnings;
}

function percentToDecimal(value: number) {
  return value / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
