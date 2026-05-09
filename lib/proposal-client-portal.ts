/** Items the client must acknowledge before signing (proposal + contract). */
export const CLIENT_CONTRACT_CHECKLIST = [
  {
    id: "scope",
    label:
      "I have read and accept the scope of work, materials, and the pricing tier I select below.",
  },
  {
    id: "terms",
    label: "I have read and accept the terms and conditions in this proposal.",
  },
  {
    id: "contract",
    label:
      "I understand this signature is my acceptance of the proposal and my agreement to the contract terms described herein.",
  },
  {
    id: "authority",
    label: "I confirm I have authority to enter into this agreement for the customer named on this proposal.",
  },
] as const;

export type ClientContractChecklistId = (typeof CLIENT_CONTRACT_CHECKLIST)[number]["id"];

export const CLIENT_CONTRACT_CHECKLIST_IDS: ClientContractChecklistId[] =
  CLIENT_CONTRACT_CHECKLIST.map((i) => i.id);

export function isContractChecklistComplete(raw: Record<string, boolean> | undefined | null) {
  if (!raw) return false;
  return CLIENT_CONTRACT_CHECKLIST_IDS.every((id) => raw[id] === true);
}
