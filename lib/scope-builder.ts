export type AnswerValue = string | number | boolean;
export type Answers = Record<string, AnswerValue>;

export type Question =
  | { id: string; label: string; type: "select"; options: string[]; default: string }
  | { id: string; label: string; type: "number"; unit: string; default: number; min?: number }
  | { id: string; label: string; type: "checkbox"; default: boolean };

export type TradeWizard = {
  trade: string;
  questions: Question[];
  generate: (a: Answers) => string;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function check(a: Answers, id: string) { return a[id] === true; }
function sel(a: Answers, id: string) { return String(a[id] ?? ""); }
function num(a: Answers, id: string) { return Number(a[id] ?? 0); }
function list(items: string[]) { return items.filter(Boolean).join(", "); }

// ── ROOFING ────────────────────────────────────────────────────────────────
const roofingWizard: TradeWizard = {
  trade: "Roofing",
  questions: [
    { id: "shingle", label: "Shingle / material type", type: "select", options: ["Architectural Shingles", "3-Tab Shingles", "Metal Panel", "TPO / Flat Roof", "Tile"], default: "Architectural Shingles" },
    { id: "squares", label: "Roof size (squares)", type: "number", unit: "sq", default: 20, min: 1 },
    { id: "stories", label: "Stories", type: "select", options: ["1-story", "2-story", "3+ stories"], default: "1-story" },
    { id: "tearoff", label: "Existing roof layers", type: "select", options: ["1-layer tear-off", "2-layer tear-off", "New construction (no tear-off)"], default: "1-layer tear-off" },
    { id: "decking", label: "Inspect & replace damaged decking", type: "checkbox", default: true },
    { id: "drip", label: "Install drip edge", type: "checkbox", default: true },
    { id: "starter", label: "Install starter strip", type: "checkbox", default: true },
    { id: "ice", label: "Ice & water shield", type: "select", options: ["Full deck coverage", "Eaves & valleys only", "Not included"], default: "Eaves & valleys only" },
    { id: "underlayment", label: "Underlayment type", type: "select", options: ["Synthetic underlayment", "Felt 30#", "Felt 15#"], default: "Synthetic underlayment" },
    { id: "ridge", label: "Ridge cap", type: "select", options: ["Standard ridge cap", "Hip & Ridge premium cap"], default: "Standard ridge cap" },
    { id: "vent", label: "Ventilation", type: "select", options: ["Install ridge vent", "Install box vents", "No change"], default: "Install ridge vent" },
    { id: "gutters", label: "Include gutter work", type: "checkbox", default: false },
  ],
  generate(a) {
    const sq = num(a, "squares");
    const tearoff = sel(a, "tearoff");
    const isNew = tearoff === "New construction (no tear-off)";
    const layers = tearoff === "2-layer tear-off" ? "2 layers" : "1 layer";

    const parts: string[] = [];

    if (!isNew) {
      parts.push(`Remove and properly dispose of ${layers} of existing roofing material (${sq} squares).`);
    }

    if (check(a, "decking")) {
      parts.push(`Inspect all roof decking and replace any damaged, rotted, or soft sections as needed.`);
    }

    const installItems: string[] = [];
    if (sel(a, "ice") !== "Not included") {
      installItems.push(`${sel(a, "ice").toLowerCase()}`);
    }
    installItems.push(sel(a, "underlayment").toLowerCase());

    parts.push(`Install ${list(installItems)}.`);

    const shingleLine: string[] = [`Install ${sel(a, "shingle").toLowerCase()} (${sq} squares)`];
    if (check(a, "drip")) shingleLine.push("drip edge on all perimeter edges");
    if (check(a, "starter")) shingleLine.push("starter strip");
    parts.push(`${shingleLine.join(", ")}.`);
    parts.push(`Install ${sel(a, "ridge").toLowerCase()}.`);

    const vent = sel(a, "vent");
    if (vent !== "No change") parts.push(`${vent} for proper roof ventilation.`);

    if (check(a, "gutters")) parts.push(`Clean, re-secure, and seal existing gutters, or install new gutters as scoped.`);

    parts.push(`All work performed by licensed & insured crew. Final site cleanup and debris disposal included.`);

    return parts.map(p => "• " + p).join("\n");
  },
};

// ── SIDING ─────────────────────────────────────────────────────────────────
const sidingWizard: TradeWizard = {
  trade: "Siding",
  questions: [
    { id: "material", label: "Siding material", type: "select", options: ["Vinyl Siding", "Fiber Cement (Hardie)", "Wood / Cedar", "Engineered Wood", "Stucco"], default: "Vinyl Siding" },
    { id: "stories", label: "Stories", type: "select", options: ["1-story", "2-story", "3+ stories"], default: "1-story" },
    { id: "squares", label: "Estimated squares", type: "number", unit: "sq", default: 30, min: 1 },
    { id: "tearoff", label: "Remove existing siding", type: "checkbox", default: true },
    { id: "wrap", label: "Install house wrap / moisture barrier", type: "checkbox", default: true },
    { id: "corners", label: "Install corner trim", type: "checkbox", default: true },
    { id: "windows", label: "Window & door trim / wraps", type: "checkbox", default: true },
    { id: "soffit", label: "Soffit & fascia replacement", type: "checkbox", default: false },
    { id: "caulk", label: "Caulk & seal all seams", type: "checkbox", default: true },
    { id: "paint", label: "Paint touch-up on trim", type: "checkbox", default: false },
  ],
  generate(a) {
    const parts: string[] = [];
    const sq = num(a, "squares");

    if (check(a, "tearoff")) parts.push(`Remove and dispose of existing siding (${sq} squares).`);
    if (check(a, "wrap")) parts.push(`Install house wrap / moisture barrier on all exterior walls.`);

    const installItems: string[] = [`${sq} squares of ${sel(a, "material").toLowerCase()}`];
    if (check(a, "corners")) installItems.push("corner trim");
    if (check(a, "windows")) installItems.push("window & door trim wraps");
    parts.push(`Install ${list(installItems)}.`);

    if (check(a, "soffit")) parts.push(`Replace soffit and fascia to match new siding profile.`);
    if (check(a, "caulk")) parts.push(`Caulk and seal all seams, joints, and penetrations.`);
    if (check(a, "paint")) parts.push(`Touch-up paint on all trim for a clean finished appearance.`);

    parts.push(`Site cleanup and debris removal included. Work performed by licensed & insured crew.`);
    return parts.map(p => "• " + p).join("\n");
  },
};

// ── PAINTING ───────────────────────────────────────────────────────────────
const paintingWizard: TradeWizard = {
  trade: "Painting",
  questions: [
    { id: "area", label: "Work area", type: "select", options: ["Interior only", "Exterior only", "Interior & Exterior"], default: "Interior only" },
    { id: "rooms", label: "Number of rooms / areas", type: "number", unit: "rooms", default: 4, min: 1 },
    { id: "coats", label: "Finish coats", type: "select", options: ["1 coat", "2 coats"], default: "2 coats" },
    { id: "prep", label: "Surface preparation level", type: "select", options: ["Light (patch & dust)", "Medium (sand & spot prime)", "Heavy (scrape, strip & prime)"], default: "Medium (sand & spot prime)" },
    { id: "ceilings", label: "Include ceilings", type: "checkbox", default: true },
    { id: "trim", label: "Include trim & doors", type: "checkbox", default: true },
    { id: "primer", label: "Full primer coat", type: "checkbox", default: false },
    { id: "pressure", label: "Pressure wash before painting", type: "checkbox", default: false },
  ],
  generate(a) {
    const parts: string[] = [];
    const area = sel(a, "area");
    const rooms = num(a, "rooms");
    const isInterior = area !== "Exterior only";
    const isExterior = area !== "Interior only";

    if (check(a, "pressure")) parts.push(`Pressure wash all surfaces to be painted.`);

    const prepLevel = sel(a, "prep");
    parts.push(`Surface preparation: ${prepLevel.toLowerCase()} — fill all holes, repair imperfections.`);

    if (check(a, "primer")) parts.push(`Apply full primer coat on all surfaces.`);

    if (isInterior) {
      const items: string[] = [`all walls in ${rooms} room${rooms !== 1 ? "s" : ""}`];
      if (check(a, "ceilings")) items.push("ceilings");
      if (check(a, "trim")) items.push("trim & doors");
      parts.push(`Paint ${list(items)} — ${sel(a, "coats")} of premium low-VOC paint.`);
    }

    if (isExterior) {
      const items: string[] = ["all exterior siding"];
      if (check(a, "trim")) items.push("trim, shutters, and doors");
      parts.push(`Paint ${list(items)} — ${sel(a, "coats")} of weather-resistant exterior paint.`);
    }

    parts.push(`Protect all floors, furniture, and fixtures. Final touch-up walk and cleanup included.`);
    return parts.map(p => "• " + p).join("\n");
  },
};

// ── DRYWALL ────────────────────────────────────────────────────────────────
const drywallWizard: TradeWizard = {
  trade: "Drywall",
  questions: [
    { id: "jobtype", label: "Job type", type: "select", options: ["New installation", "Repair / patch work", "Tear-out and replace"], default: "New installation" },
    { id: "rooms", label: "Number of rooms", type: "number", unit: "rooms", default: 3, min: 1 },
    { id: "thickness", label: "Drywall thickness", type: "select", options: ['1/2" standard', '5/8" Type X (fire-rated)', '3/8" thin'], default: '1/2" standard' },
    { id: "finish", label: "Finish level", type: "select", options: ["Level 3 (textured ready)", "Level 4 (paint ready)", "Level 5 (smooth skim coat)"], default: "Level 4 (paint ready)" },
    { id: "texture", label: "Match existing texture", type: "checkbox", default: false },
    { id: "prime", label: "Apply primer coat after finish", type: "checkbox", default: true },
    { id: "tearout", label: "Tear out existing drywall first", type: "checkbox", default: false },
  ],
  generate(a) {
    const parts: string[] = [];
    const rooms = num(a, "rooms");
    const jobtype = sel(a, "jobtype");

    if (check(a, "tearout") || jobtype === "Tear-out and replace") {
      parts.push(`Remove and dispose of existing drywall in ${rooms} room${rooms !== 1 ? "s" : ""}.`);
    }

    if (jobtype === "Repair / patch work") {
      parts.push(`Patch and repair damaged drywall sections in ${rooms} area${rooms !== 1 ? "s" : ""}.`);
    } else {
      parts.push(`Install ${sel(a, "thickness")} drywall in ${rooms} room${rooms !== 1 ? "s" : ""}.`);
    }

    parts.push(`Tape, bed, and sand to a ${sel(a, "finish").toLowerCase()}.`);

    if (check(a, "texture")) parts.push(`Match and blend existing texture throughout.`);
    if (check(a, "prime")) parts.push(`Apply primer coat on all finished surfaces — ready for final paint.`);

    parts.push(`All dust control, cleanup, and debris removal included.`);
    return parts.map(p => "• " + p).join("\n");
  },
};

// ── GUTTERS ────────────────────────────────────────────────────────────────
const guttersWizard: TradeWizard = {
  trade: "Gutters",
  questions: [
    { id: "style", label: "Gutter style", type: "select", options: ["K-style seamless", "Half-round", "Box gutter"], default: "K-style seamless" },
    { id: "size", label: "Gutter size", type: "select", options: ['5" standard', '6" oversized'], default: '5" standard' },
    { id: "material", label: "Material", type: "select", options: ["Aluminum", "Galvanized Steel", "Copper"], default: "Aluminum" },
    { id: "linft", label: "Linear feet of gutter", type: "number", unit: "lf", default: 150, min: 10 },
    { id: "downspouts", label: "Number of downspouts", type: "number", unit: "pcs", default: 4, min: 1 },
    { id: "remove", label: "Remove & dispose existing gutters", type: "checkbox", default: true },
    { id: "guards", label: "Install leaf guards", type: "checkbox", default: false },
    { id: "underground", label: "Underground drainage extensions", type: "checkbox", default: false },
    { id: "seal", label: "Seal, test & walk-through", type: "checkbox", default: true },
  ],
  generate(a) {
    const parts: string[] = [];
    const lf = num(a, "linft");
    const ds = num(a, "downspouts");

    if (check(a, "remove")) parts.push(`Remove and dispose of all existing gutters and downspouts.`);

    parts.push(`Install ${sel(a, "size")} ${sel(a, "style").toLowerCase()} in ${sel(a, "material").toLowerCase()} — ${lf} linear feet.`);
    parts.push(`Install ${ds} downspout${ds !== 1 ? "s" : ""} with proper slope and drainage direction.`);

    if (check(a, "guards")) parts.push(`Install leaf guards / gutter protection system throughout.`);
    if (check(a, "underground")) parts.push(`Install underground drainage extensions to direct water away from foundation.`);
    if (check(a, "seal")) parts.push(`Seal all joints and end caps, flush system with water, and perform final walk-through.`);

    parts.push(`All hardware, hangers, and fasteners included. Cleanup and debris removal included.`);
    return parts.map(p => "• " + p).join("\n");
  },
};

// ── REMODELING ─────────────────────────────────────────────────────────────
const remodelingWizard: TradeWizard = {
  trade: "Remodeling",
  questions: [
    { id: "room", label: "Room / area type", type: "select", options: ["Kitchen", "Bathroom", "Basement", "Master Suite", "Addition", "Full home"], default: "Kitchen" },
    { id: "demo", label: "Demolition included", type: "checkbox", default: true },
    { id: "framing", label: "Framing work", type: "checkbox", default: false },
    { id: "plumbing", label: "Plumbing rough-in / fixtures", type: "checkbox", default: false },
    { id: "electrical", label: "Electrical rough-in / fixtures", type: "checkbox", default: false },
    { id: "insulation", label: "Insulation", type: "checkbox", default: false },
    { id: "drywall", label: "Drywall & finish", type: "checkbox", default: true },
    { id: "flooring", label: "Flooring installation", type: "checkbox", default: true },
    { id: "cabinets", label: "Cabinets & hardware", type: "checkbox", default: false },
    { id: "counters", label: "Countertops", type: "checkbox", default: false },
    { id: "tile", label: "Tile work", type: "checkbox", default: false },
    { id: "painting", label: "Painting", type: "checkbox", default: true },
    { id: "trim", label: "Trim & molding", type: "checkbox", default: true },
  ],
  generate(a) {
    const parts: string[] = [];
    const room = sel(a, "room");

    if (check(a, "demo")) parts.push(`Complete demolition of existing ${room.toLowerCase()} — all debris removed and disposed of.`);

    const structural: string[] = [];
    if (check(a, "framing")) structural.push("framing");
    if (check(a, "plumbing")) structural.push("plumbing rough-in and fixture installation");
    if (check(a, "electrical")) structural.push("electrical rough-in and fixture installation");
    if (check(a, "insulation")) structural.push("insulation");
    if (structural.length) parts.push(`Rough-in work including ${list(structural)}.`);

    const finishes: string[] = [];
    if (check(a, "drywall")) finishes.push("drywall and finish");
    if (check(a, "flooring")) finishes.push("flooring");
    if (check(a, "cabinets")) finishes.push("cabinets and hardware");
    if (check(a, "counters")) finishes.push("countertops");
    if (check(a, "tile")) finishes.push("tile work");
    if (check(a, "painting")) finishes.push("painting");
    if (check(a, "trim")) finishes.push("trim and molding");
    if (finishes.length) parts.push(`Finish work including ${list(finishes)}.`);

    parts.push(`Final punch-list walk-through, touch-ups, and complete site cleanup included. All work to code and permitted where required.`);
    return `${room} remodel scope of work:\n` + parts.map(p => "• " + p).join("\n");
  },
};

// ── Registry ───────────────────────────────────────────────────────────────
export const TRADE_WIZARDS: Record<string, TradeWizard> = {
  Roofing: roofingWizard,
  Siding: sidingWizard,
  Painting: paintingWizard,
  Drywall: drywallWizard,
  Gutters: guttersWizard,
  Remodeling: remodelingWizard,
};
