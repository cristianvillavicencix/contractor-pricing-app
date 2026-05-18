import type { PriceOptionName } from "@/lib/app-data";

export type QuoteStatus = "draft" | "ready" | "archived";

export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "expired"
  | "converted_to_project";

export type ProposalOption = {
  id: string;
  quoteId: string;
  tier: PriceOptionName;
  title: string;
  description: string;
  finalPrice: number;
  marginPercent: number;
  markupPercent: number;
  isRecommended: boolean;
};

export type Proposal = {
  id: string;
  quoteId: string;
  companyId: string;
  contactId: string;
  publicToken: string;
  status: ProposalStatus;
  title: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  acceptedOptionId?: string;
};
