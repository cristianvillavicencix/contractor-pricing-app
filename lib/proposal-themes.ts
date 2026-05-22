import type { ProposalDocumentSettings, ProposalThemeName } from "@/types/proposal-blocks";

export const PROPOSAL_THEMES: Record<ProposalThemeName, Required<Pick<ProposalDocumentSettings, "primaryColor" | "fontFamily" | "pageMargins">> & {
  background: string;
  ink: string;
  muted: string;
  surface: string;
  accentSoft: string;
}> = {
  Modern: {
    primaryColor: "#166534",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pageMargins: "comfortable",
    background: "#f8fafc",
    ink: "#111827",
    muted: "#6b7280",
    surface: "#ffffff",
    accentSoft: "#f0fdf4",
  },
  Luxury: {
    primaryColor: "#b88917",
    fontFamily: "Georgia, 'Times New Roman', serif",
    pageMargins: "wide",
    background: "#fbfaf7",
    ink: "#1f1a14",
    muted: "#786f63",
    surface: "#fffdf8",
    accentSoft: "#fff8db",
  },
  Minimal: {
    primaryColor: "#111827",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pageMargins: "compact",
    background: "#ffffff",
    ink: "#111827",
    muted: "#71717a",
    surface: "#ffffff",
    accentSoft: "#f4f4f5",
  },
  "Roofing Dark": {
    primaryColor: "#d6a817",
    fontFamily: "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pageMargins: "comfortable",
    background: "#11100d",
    ink: "#f7f2e8",
    muted: "#b8ad9c",
    surface: "#1b1914",
    accentSoft: "#342a10",
  },
  "Insurance Clean": {
    primaryColor: "#2563eb",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pageMargins: "comfortable",
    background: "#f8fbff",
    ink: "#172033",
    muted: "#667085",
    surface: "#ffffff",
    accentSoft: "#eff6ff",
  },
};

export function resolveProposalSettings(settings?: ProposalDocumentSettings): Required<ProposalDocumentSettings> {
  const themeName = settings?.theme ?? "Modern";
  const theme = PROPOSAL_THEMES[themeName];
  return {
    theme: themeName,
    primaryColor: settings?.primaryColor ?? theme.primaryColor,
    fontFamily: settings?.fontFamily ?? theme.fontFamily,
    logoUrl: settings?.logoUrl ?? "",
    pageMargins: settings?.pageMargins ?? theme.pageMargins,
    pdfPageSize: settings?.pdfPageSize ?? "A4",
    showPageNumbers: settings?.showPageNumbers ?? true,
    showTableOfContents: settings?.showTableOfContents ?? false,
  };
}
