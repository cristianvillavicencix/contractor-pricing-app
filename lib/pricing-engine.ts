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
    stateAdjustments: Record<ProjectState, number>;
    minimumSafeMargin?: number;
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

const baseMargins: Record<PriceOptionName, number> = {
  Good: 0.28,
  Better: 0.35,
  Best: 0.42,
};

const stateAdjustments: Record<ProjectState, number> = {
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
  const minimumSafeMargin =
    (input.pricingRules?.minimumSafeMargin ?? 0.2) +
    (input.setup.riskLevel === "High" ? 0.03 : 0) +
    (input.setup.projectSize === "Small" ? 0.02 : 0);
  const adjustments = {
    state: rules.stateAdjustments[input.setup.state],
    trade: tradeAdjustments[input.setup.trade],
    company: companyAdjustments[input.setup.companyLevel],
    size: sizeAdjustments[input.setup.projectSize],
    risk: riskAdjustments[input.setup.riskLevel],
    strategy: strategyAdjustments[input.setup.strategy],
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
        0.15,
        0.65
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
        status: getOptionStatus(solved.salePrice, minimumSafePrice, margin),
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
  });
  const projectStatus = getProjectStatus(good, better, minimumSafePrice);

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
  margin: number
): PricingEngineOption["status"] {
  if (salePrice < minimumSafePrice || margin < 0.25) return "Risky";
  if (margin < 0.35 || salePrice < minimumSafePrice * 1.08) return "Tight";
  return "Safe";
}

function getProjectStatus(
  good: PricingEngineOption,
  better: PricingEngineOption,
  minimumSafePrice: number
): PricingEngineResult["projectStatus"] {
  if (better.margin < 0.25 || good.salePrice < minimumSafePrice) return "Red";
  if (better.margin >= 0.25 && better.margin < 0.35) return "Yellow";
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
}: {
  baseCost: number;
  good: PricingEngineOption;
  better: PricingEngineOption;
  minimumSafePrice: number;
  input: PricingEngineInput;
  options: PricingEngineOption[];
}) {
  const warnings: string[] = [];
  const feeCost =
    better.creditCardFeeCost + better.financingFeeCost + better.commissionCost;

  if (baseCost === 0) warnings.push("Base cost is 0.");
  if (good.salePrice < minimumSafePrice) {
    warnings.push("Good price is below Minimum Safe Price.");
  }
  if (better.margin < 0.3) warnings.push("Better margin is below 30%.");
  if (
    input.commission.includeCommission &&
    better.commissionCost > better.salePrice * 0.08
  ) {
    warnings.push("Commission is higher than 8% of sale price.");
  }
  if (feeCost > better.netProfit * 0.1) {
    warnings.push("Fees reduce profit by more than 10%.");
  }
  if (options.some((option) => option.finalMargin > 0.55)) {
    warnings.push("Final margin is higher than 55%.");
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
