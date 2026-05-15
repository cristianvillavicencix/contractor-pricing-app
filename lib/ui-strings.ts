/**
 * Lightweight copy map for future i18n. Use `strings[locale].key`.
 */
export const strings = {
  en: {
    emptyProjects: "No projects yet",
    emptyProjectsHint: "Create a project to track costs and send proposals.",
    emptyQuotes: "No proposals yet",
    emptyQuotesHint: "Open a project and build a proposal to see it here.",
    emptyContacts: "No contacts yet",
    emptyContactsHint: "Add homeowners and businesses you work with.",
    emptyDashboardQuotes: "No recent proposals",
  },
  es: {
    emptyProjects: "Aún no hay proyectos",
    emptyProjectsHint: "Crea un proyecto para seguir costos y enviar propuestas.",
    emptyQuotes: "Aún no hay propuestas",
    emptyQuotesHint: "Abre un proyecto y arma una cotización para verla aquí.",
    emptyContacts: "Aún no hay contactos",
    emptyContactsHint: "Agrega clientes con los que trabajas.",
    emptyDashboardQuotes: "No hay propuestas recientes",
  },
} as const;

export type Locale = keyof typeof strings;

export function pickLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

export function t<K extends keyof (typeof strings)["en"]>(key: K): string {
  const locale = pickLocale();
  return strings[locale][key] ?? strings.en[key];
}
