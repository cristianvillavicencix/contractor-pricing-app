import type { PriceOptionName } from "@/lib/app-data";

export type ProjectStatus =
  | "not_started"
  | "scheduled"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "invoiced"
  | "paid"
  | "closed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded" | "cancelled";

export type Project = {
  id: string;
  companyId: string;
  contactId: string;
  quoteId: string;
  proposalId: string;
  selectedOptionId?: string;
  title: string;
  address: string;
  status: ProjectStatus;
  approvedAmount: number;
  selectedTier: PriceOptionName;
  startDate?: string;
  endDate?: string;
};
