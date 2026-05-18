export type PricingSettings = {
  id: string;
  companyId: string;
  defaultOverheadPercent: number;
  defaultProfitMarginPercent: number;
  defaultTaxPercent: number;
  defaultContingencyPercent: number;
  useMarginOrMarkup: "margin" | "markup";
};
