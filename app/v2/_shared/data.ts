// Sample data lifted from the design bundle's cs-data.jsx.
// All views below operate on this in-memory data — replace with Supabase queries when wiring for real.

export type Contact = {
  id: string; name: string; biz: string; email: string; phone: string; addr: string;
  since: string; projects: number; spent: number; tags: string[];
};

export type ProposalStatus = "draft" | "sent" | "viewed" | "followup" | "accepted" | "declined";
export type Proposal = {
  id: string; title: string; contactId: string; value: number;
  status: ProposalStatus; sent: string | null; age: number; margin: number; items: number;
};

export type ProjectStatus = "scheduled" | "in_progress" | "on_hold" | "completed" | "invoiced" | "paid";
export type Project = {
  id: string; title: string; contactId: string; value: number;
  status: ProjectStatus; start: string; due: string; crew: string[]; progress: number;
};

export type Product = {
  id: string; cat: string; tier: "good" | "better" | "best"; active: boolean;
  brand: string; name: string; type: string; line: string; warranty: string;
  desc: string; price: number; unit: string;
};

export type ActivityEntry = {
  id: string; who: string; what: string; ref: string; val: string; when: string;
  icon: string; color: string;
};

export type Upcoming = {
  id: string; day: string; date: string; title: string; crew: string[]; addr: string; duration: string;
};

export const SAMPLE_CONTACTS: Contact[] = [
  { id: "c1", name: "Marisol Rivera",   biz: "Rivera & Co.",          email: "marisol@riveraco.com",     phone: "(203) 555-0118", addr: "Stamford, CT",   since: "2024-03", projects: 4, spent: 86400,  tags: ["Repeat", "Premium"] },
  { id: "c2", name: "James O. Brennan", biz: "Brennan Holdings",      email: "james@brennanholdings.io", phone: "(203) 555-2271", addr: "Greenwich, CT",  since: "2025-01", projects: 2, spent: 41200,  tags: ["Premium"] },
  { id: "c3", name: "Tina Park",        biz: "Park Family Trust",     email: "tina.park@gmail.com",      phone: "(914) 555-9803", addr: "Rye, NY",         since: "2024-08", projects: 3, spent: 62700,  tags: ["Repeat"] },
  { id: "c4", name: "Dwayne Coleman",   biz: "Coleman Property Mgmt", email: "dwayne@cpmgmt.co",         phone: "(475) 555-4419", addr: "Norwalk, CT",     since: "2025-04", projects: 1, spent: 18500,  tags: ["Property"] },
  { id: "c5", name: "Renata Lozada",    biz: "Lozada Architects",     email: "r.lozada@lozada.studio",   phone: "(203) 555-3110", addr: "New Haven, CT",   since: "2024-11", projects: 5, spent: 124300, tags: ["Repeat", "Architect"] },
  { id: "c6", name: "Kennedy Walsh",    biz: "Walsh Renovations",     email: "kennedy@walsh-reno.com",   phone: "(617) 555-7732", addr: "Boston, MA",      since: "2025-06", projects: 1, spent: 9800,   tags: ["New"] },
  { id: "c7", name: "Hugo Pereira",     biz: "Pereira Residence",     email: "hugo.p@protonmail.com",    phone: "(203) 555-2266", addr: "Darien, CT",      since: "2025-09", projects: 1, spent: 0,      tags: ["Lead"] },
  { id: "c8", name: "Ada Whitmore",     biz: "Whitmore Estate",       email: "ada@whitmore-estate.com",  phone: "(203) 555-1184", addr: "Westport, CT",    since: "2024-05", projects: 2, spent: 47600,  tags: ["Premium", "Repeat"] },
];

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; color: string }> = {
  draft:    { label: "Draft",     color: "dark" },
  sent:     { label: "Sent",      color: "blue" },
  viewed:   { label: "Viewed",    color: "teal" },
  followup: { label: "Follow-up", color: "amber" },
  accepted: { label: "Accepted",  color: "green" },
  declined: { label: "Declined",  color: "rose" },
};

export const SAMPLE_PROPOSALS: Proposal[] = [
  { id: "P-1042", title: "Full roof replacement — Rivera house", contactId: "c1", value: 28400, status: "accepted", sent: "2025-09-22", age: 8,  margin: 38, items: 12 },
  { id: "P-1041", title: "Master bath remodel",                  contactId: "c5", value: 41200, status: "viewed",   sent: "2025-09-28", age: 2,  margin: 41, items: 18 },
  { id: "P-1040", title: "Siding replacement — south facade",    contactId: "c2", value: 16800, status: "sent",     sent: "2025-09-30", age: 1,  margin: 36, items: 8  },
  { id: "P-1039", title: "Kitchen renovation Phase 2",           contactId: "c3", value: 52400, status: "followup", sent: "2025-09-12", age: 18, margin: 39, items: 24 },
  { id: "P-1038", title: "Gutter & downspout install",           contactId: "c4", value: 4800,  status: "accepted", sent: "2025-09-18", age: 12, margin: 33, items: 5  },
  { id: "P-1037", title: "Deck rebuild — composite",             contactId: "c8", value: 22600, status: "declined", sent: "2025-09-08", age: 22, margin: 42, items: 14 },
  { id: "P-1036", title: "Annual maintenance package",           contactId: "c1", value: 6200,  status: "draft",    sent: null,         age: 0,  margin: 28, items: 4  },
  { id: "P-1035", title: "Front entry & porch reno",             contactId: "c6", value: 9800,  status: "sent",     sent: "2025-10-01", age: 0,  margin: 35, items: 7  },
  { id: "P-1034", title: "Whole-home painting interior",         contactId: "c5", value: 18900, status: "viewed",   sent: "2025-09-26", age: 4,  margin: 34, items: 6  },
];

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string }> = {
  scheduled:   { label: "Scheduled",   color: "blue" },
  in_progress: { label: "In Progress", color: "gold" },
  on_hold:     { label: "On Hold",     color: "amber" },
  completed:   { label: "Completed",   color: "teal" },
  invoiced:    { label: "Invoiced",    color: "purple" },
  paid:        { label: "Paid",        color: "green" },
};

export const SAMPLE_PROJECTS: Project[] = [
  { id: "PR-204", title: "Rivera house — full roof",     contactId: "c1", value: 28400, status: "in_progress", start: "2025-10-07", due: "2025-10-21", crew: ["LO", "MR", "TJ"],       progress: 0.62 },
  { id: "PR-203", title: "Coleman gutter install",       contactId: "c4", value: 4800,  status: "completed",   start: "2025-09-20", due: "2025-09-25", crew: ["LO", "TJ"],             progress: 1.0  },
  { id: "PR-202", title: "Lozada bath remodel",          contactId: "c5", value: 41200, status: "scheduled",   start: "2025-10-14", due: "2025-11-10", crew: ["LO", "MR", "HD", "TJ"], progress: 0    },
  { id: "PR-201", title: "Park kitchen renovation",      contactId: "c3", value: 52400, status: "on_hold",     start: "2025-09-08", due: "2025-11-15", crew: ["LO", "MR", "HD"],       progress: 0.40 },
  { id: "PR-200", title: "Whitmore porch & entry",       contactId: "c8", value: 9800,  status: "invoiced",    start: "2025-09-12", due: "2025-09-26", crew: ["LO", "TJ"],             progress: 1.0  },
  { id: "PR-199", title: "Brennan siding south facade",  contactId: "c2", value: 16800, status: "in_progress", start: "2025-09-25", due: "2025-10-12", crew: ["LO", "MR"],             progress: 0.85 },
  { id: "PR-198", title: "Pereira maintenance package",  contactId: "c7", value: 6200,  status: "paid",        start: "2025-08-20", due: "2025-09-04", crew: ["LO"],                    progress: 1.0  },
  { id: "PR-197", title: "Walsh interior paint",         contactId: "c6", value: 9800,  status: "paid",        start: "2025-08-12", due: "2025-08-28", crew: ["LO", "TJ"],             progress: 1.0  },
];

export const CREW: Record<string, { name: string; color: string }> = {
  LO: { name: "Luis Ortega",    color: "#2A6FDB" },
  MR: { name: "Manuel Reyes",   color: "#7A5AE0" },
  HD: { name: "Héctor Delgado", color: "#1B8A8A" },
  TJ: { name: "Tyler Jenkins",  color: "#C24C3B" },
};

export const PRODUCT_CATEGORIES = [
  { id: "roofing",    label: "Roofing",    count: 90 },
  { id: "siding",     label: "Siding",     count: 34 },
  { id: "painting",   label: "Painting",   count: 28 },
  { id: "drywall",    label: "Drywall",    count: 14 },
  { id: "gutters",    label: "Gutters",    count: 9  },
  { id: "remodeling", label: "Remodeling", count: 22 },
];

export const SAMPLE_PRODUCTS: Product[] = [
  { id: "pr1", cat: "roofing", tier: "good",   active: true, brand: "Atlas Roofing", name: "GlassMaster 3-Tab Shingles",     type: "Asphalt Shingle", line: "GlassMaster",   warranty: "25y",      desc: "Traditional 3-tab shingles. Fiberglass-reinforced construction. Budget-friendly with 25-year warranty.", price: 38,  unit: "sq" },
  { id: "pr2", cat: "roofing", tier: "good",   active: true, brand: "Atlas Roofing", name: "ProLam Architectural Shingles",  type: "Asphalt Shingle", line: "ProLam",        warranty: "50y",      desc: "Entry-level architectural laminated shingles. Reliable performance with dimensional appearance. Available in popular colors.", price: 64, unit: "sq" },
  { id: "pr3", cat: "roofing", tier: "good",   active: true, brand: "CertainTeed",   name: "Landmark Architectural Shingles", type: "Asphalt Shingle", line: "Landmark",      warranty: "50y",      desc: "Dual-layered architectural shingle with dimensional appearance. 21 colors available. 110 MPH wind warranty.", price: 78, unit: "sq" },
  { id: "pr4", cat: "roofing", tier: "better", active: true, brand: "CertainTeed",   name: "CertainTeed Strip Shingles",     type: "Asphalt Shingle", line: "Strip",         warranty: "25y",      desc: "Basic 3-tab shingles for budget-conscious projects. Reliable weather protection with standard warranty.", price: 42, unit: "sq" },
  { id: "pr5", cat: "roofing", tier: "better", active: true, brand: "GAF",           name: "Timberline HDZ Shingles",        type: "Asphalt Shingle", line: "Timberline",    warranty: "Lifetime", desc: "Industry-leading lifetime laminated shingle with LayerLock technology. Industry-best 130 MPH wind warranty.", price: 92, unit: "sq" },
  { id: "pr6", cat: "roofing", tier: "better", active: true, brand: "GAF",           name: "Grand Sequoia Shingles",         type: "Asphalt Shingle", line: "Grand Sequoia", warranty: "Lifetime", desc: "Designer wood shake look, vivid color blends. Premium aesthetic with engineered protection.", price: 124, unit: "sq" },
  { id: "pr7", cat: "roofing", tier: "best",   active: true, brand: "IKO",           name: "Cambridge Architectural",        type: "Asphalt Shingle", line: "Cambridge",     warranty: "30y",      desc: "Two-piece laminated shingle with weather-tested durability. Multiple color blends and shadows.", price: 86, unit: "sq" },
  { id: "pr8", cat: "roofing", tier: "best",   active: true, brand: "IKO",           name: "Dynasty Shingles",               type: "Asphalt Shingle", line: "Dynasty",       warranty: "Lifetime", desc: "Premium designer shingle. Multi-tonal color blends with deep shadows. Lifetime limited warranty.", price: 138, unit: "sq" },
];

export const ACTIVITY: ActivityEntry[] = [
  { id: "a1", who: "Marisol Rivera", what: "accepted proposal",   ref: "P-1042",  val: "$28,400", when: "2h ago", icon: "check",   color: "green"  },
  { id: "a2", who: "Renata Lozada",  what: "viewed proposal",     ref: "P-1041",  val: "",        when: "4h ago", icon: "eye",     color: "teal"   },
  { id: "a3", who: "Tina Park",      what: "paid invoice",        ref: "INV-082", val: "$18,900", when: "6h ago", icon: "dollar",  color: "gold"   },
  { id: "a4", who: "James Brennan",  what: "requested follow-up", ref: "P-1040",  val: "",        when: "1d ago", icon: "phone",   color: "amber"  },
  { id: "a5", who: "Ada Whitmore",   what: "left feedback",       ref: "PR-200",  val: "★ 5/5",   when: "2d ago", icon: "sparkle", color: "purple" },
];

export const UPCOMING: Upcoming[] = [
  { id: "u1", day: "Mon", date: "Oct 7",  title: "Rivera roof — tear off",      crew: ["LO", "MR"],             addr: "Stamford, CT",  duration: "8h" },
  { id: "u2", day: "Wed", date: "Oct 9",  title: "Brennan siding — final coat", crew: ["LO", "MR", "TJ"],       addr: "Greenwich, CT", duration: "6h" },
  { id: "u3", day: "Fri", date: "Oct 11", title: "Lozada bath — site walk",     crew: ["LO"],                   addr: "New Haven, CT", duration: "2h" },
  { id: "u4", day: "Mon", date: "Oct 14", title: "Lozada bath — demo start",    crew: ["LO", "MR", "HD", "TJ"], addr: "New Haven, CT", duration: "8h" },
];

const PALETTE = ["#2A6FDB", "#7A5AE0", "#1B8A8A", "#C24C3B", "#D98F1E", "#2F7D52", "#A88716", "#3D5A80"];

export const contactById = (id: string): Contact =>
  SAMPLE_CONTACTS.find((c) => c.id === id) ?? { id, name: "—", biz: "", email: "", phone: "", addr: "", since: "", projects: 0, spent: 0, tags: [] };

export const initials = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
};

export const colorForId = (id: string): string => {
  let h = 0;
  for (const ch of id ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const fmt$ = (n: number): string => "$" + Math.round(Number(n) || 0).toLocaleString();
