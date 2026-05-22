import * as React from "react";

export type IconName =
  | "bolt" | "dashboard" | "send" | "briefcase" | "users" | "package" | "settings"
  | "bell" | "plus" | "search" | "filter" | "list" | "kanban" | "calendar"
  | "arrow-r" | "arrow-up" | "arrow-dn" | "more" | "phone" | "mail" | "map"
  | "image" | "calculator" | "check" | "chevron-l" | "chevron-r" | "chevron-d"
  | "sparkle" | "clock" | "building" | "dollar" | "trending" | "shield"
  | "edit" | "eye" | "copy" | "x" | "flag" | "home" | "lock";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.75 as number | string,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "bolt":       return <svg {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor" stroke="none"/></svg>;
    case "dashboard":  return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case "send":       return <svg {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>;
    case "briefcase":  return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
    case "users":      return <svg {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
    case "package":    return <svg {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/></svg>;
    case "settings":   return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
    case "bell":       return <svg {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
    case "plus":       return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":     return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case "filter":     return <svg {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>;
    case "list":       return <svg {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case "kanban":     return <svg {...p}><rect x="3" y="3" width="6" height="18" rx="1"/><rect x="11" y="3" width="6" height="10" rx="1"/><rect x="19" y="3" width="2" height="14" rx="1"/></svg>;
    case "calendar":   return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
    case "arrow-r":    return <svg {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-up":   return <svg {...p}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "arrow-dn":   return <svg {...p}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case "more":       return <svg {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
    case "phone":      return <svg {...p}><path d="M5 3h4l2 5-3 2c1.5 3 3.5 5 6 6l2-3 5 2v4a2 2 0 01-2 2C10 21 3 14 3 5a2 2 0 012-2z"/></svg>;
    case "mail":       return <svg {...p}><path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/></svg>;
    case "map":        return <svg {...p}><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case "image":      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    case "calculator": return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="8" y1="18" x2="8.01" y2="18"/></svg>;
    case "check":      return <svg {...p}><path d="M5 12l5 5L20 7" strokeWidth="2.4"/></svg>;
    case "chevron-l":  return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case "chevron-r":  return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevron-d":  return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>;
    case "sparkle":    return <svg {...p}><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>;
    case "clock":      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "building":   return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22V12h6v10M9 6h.01M15 6h.01M9 10h.01M15 10h.01"/></svg>;
    case "dollar":     return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
    case "trending":   return <svg {...p}><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>;
    case "shield":     return <svg {...p}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>;
    case "edit":       return <svg {...p}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case "eye":        return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "copy":       return <svg {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case "x":          return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "flag":       return <svg {...p}><path d="M4 22V4l9 3-9 3M4 4l16 4-16 4"/></svg>;
    case "home":       return <svg {...p}><path d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z"/></svg>;
    case "lock":       return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
    default:           return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
  }
}
