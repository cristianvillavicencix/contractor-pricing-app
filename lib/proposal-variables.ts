export const PROPOSAL_VARIABLES = [
  { key: "client_name", label: "Client name" },
  { key: "client_address", label: "Client address" },
  { key: "proposal_date", label: "Proposal date" },
  { key: "proposal_number", label: "Proposal number" },
  { key: "company_name", label: "Company name" },
  { key: "company_phone", label: "Company phone" },
  { key: "sales_rep", label: "Sales rep" },
  { key: "good_price", label: "Good price" },
  { key: "better_price", label: "Better price" },
  { key: "best_price", label: "Best price" },
] as const;

export function variableToken(key: string) {
  return `{{${key}}}`;
}

export function highlightVariablesHtml(html: string) {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const known = PROPOSAL_VARIABLES.some((v) => v.key === key);
    return `<span class="proposal-var-chip${known ? "" : " unknown"}" data-var="${key}">{{${key}}}</span>`;
  });
}
