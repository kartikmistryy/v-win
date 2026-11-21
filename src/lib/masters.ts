import type { GateNo, Level, MachineType, Role, Temperature } from "./types";

// All masters are PLACEHOLDERS — the BRD lists them as open items for Vendiman to confirm.

export const CHANNELS: Record<string, string[]> = {
  Work: ["Corporate", "Hybrid", "Onsite"],
  Travel: ["Bus stand", "Metro", "Railway station", "Airport"],
  Education: ["Government college", "Private college", "University", "School"],
  Healthcare: ["Hospital", "Clinic", "Diagnostic centre / Lab"],
  Residential: ["PG", "Housing society", "Hostel"],
  "Entertainment & Leisure": ["Theatre", "Amusement park", "Shopping mall", "Cultural centre", "Fitness centre"],
};

export const ZONES = ["West", "South 1", "South 2", "North", "East"];
export const CITIES: Record<string, string> = {
  Mumbai: "West",
  Pune: "West",
  Ahmedabad: "West",
  Bengaluru: "South 1",
  Hyderabad: "South 1",
  Chennai: "South 2",
  Kochi: "South 2",
  "Delhi NCR": "North",
  Jaipur: "North",
  Kolkata: "East",
};
export const LEAD_SOURCES = ["Referral", "Inbound website", "Cold outreach", "Existing client", "Event"];
export const MACHINE_TYPES: MachineType[] = ["Seaga", "TCN", "XY", "ICM"];
export const CUSTOMER_TYPES = ["Enterprise", "Mid-market", "SME", "Government"];

export const PRODUCTS = [
  "Haldiram's namkeen",
  "Coca-Cola 300ml",
  "Nestlé KitKat",
  "Cadbury Dairy Milk",
  "Bisleri 500ml",
  "Protein bar",
  "Cold coffee",
  "Baked chips",
];

// Minimum Service Charge (₹ per machine per month): channel × customer type
const MIN_TABLE: Record<string, number[]> = {
  Work: [6000, 7000, 8000, 6500],
  Travel: [9000, 9500, 10000, 9000],
  Healthcare: [7000, 7500, 8000, 7000],
  Education: [5000, 5500, 6000, 5000],
};
// ponytail: Residential and Entertainment & Leisure have no confirmed row yet — they use this until Finance confirms.
const MIN_FALLBACK = [7000, 7500, 8000, 7500];
export function minServiceCharge(channel: string, customerType: string): number {
  const row = MIN_TABLE[channel] ?? MIN_FALLBACK;
  const i = Math.max(0, CUSTOMER_TYPES.indexOf(customerType));
  return row[i];
}
export const MIN_TABLE_VIEW = MIN_TABLE;

export const BRANDING_MIN_OFFSET = 2500;

export const REASONS = {
  clear: ["Meets criteria", "Meets with conditions"],
  reject: [
    "Below viability floor",
    "Route not serviceable",
    "Manpower unavailable",
    "Machine stock unavailable",
    "Telemetry/cashless not supported",
    "Other",
  ],
  accept: ["Price agreed", "Terms agreed"],
  hold: ["Budget approval pending", "Decision-maker unavailable"],
  reject4: ["Price too high", "Chose competitor", "Project cancelled"],
  override: ["Strategic account", "Leadership decision"],
};

export const PERSONAS: Record<Role, { name: string; title: string; color: string }> = {
  BD: { name: "Rohan Mehta", title: "Business Development", color: "#E97132" },
  Procurement: { name: "Sneha Iyer", title: "Procurement", color: "#8E5BD9" },
  Finance: { name: "Priya Shah", title: "Finance", color: "#1E88E5" },
  Branding: { name: "Aarav Kapoor", title: "Branding", color: "#D81B60" },
  Operations: { name: "Vikram Rao", title: "Operations", color: "#00897B" },
  Technology: { name: "Neha Joshi", title: "Technology", color: "#5E35B1" },
  Legal: { name: "Ananya Desai", title: "Legal", color: "#6D4C41" },
  Mobilisation: { name: "Karan Singh", title: "Mobilisation", color: "#F4511E" },
  Leadership: { name: "Meera Nair", title: "Leadership (COO)", color: "#2E2F31" },
};
export const ROLES = Object.keys(PERSONAS) as Role[];

/** PERSONAS above are the Senior (approve + review). Juniors can approve only. Leadership has no junior. */
export const JUNIORS: Partial<Record<Role, string>> = {
  BD: "Ishaan Verma",
  Procurement: "Rhea Pillai",
  Finance: "Kunal Bhatt",
  Branding: "Tanya Malhotra",
  Operations: "Arjun Patil",
  Technology: "Dev Khanna",
  Legal: "Sana Qureshi",
  Mobilisation: "Nikhil Das",
};
export const personName = (role: Role, level: Level) => (level === "Junior" ? JUNIORS[role] : undefined) ?? PERSONAS[role].name;

/* ---------- Client portal: fictional company directory (stands in for a GST lookup) ---------- */
const STATE_CODE: Record<string, string> = {
  Mumbai: "27", Pune: "27", Ahmedabad: "24", Bengaluru: "29", Hyderabad: "36",
  Chennai: "33", Kochi: "32", "Delhi NCR": "07", Jaipur: "08", Kolkata: "19",
};
export interface Office { city: string; gstin: string }
export interface Company { name: string; customerType: string; offices: Office[] }

const co = (name: string, pan: string, customerType: string, cities: string[]): Company => ({
  name,
  customerType,
  // one GSTIN per state: 2-digit state code + PAN + entity no. + Z + check char
  offices: cities.map((city) => ({ city, gstin: `${STATE_CODE[city]}${pan}1Z5` })),
});

export const COMPANIES: Company[] = [
  co("Aurora Infotech Pvt Ltd", "AAFCA4821K", "Enterprise", ["Bengaluru", "Hyderabad", "Pune", "Chennai"]),
  co("Bluepeak Logistics Ltd", "AABCB7310L", "Mid-market", ["Mumbai", "Ahmedabad", "Delhi NCR"]),
  co("Cedar Health Systems", "AACCC2290M", "Enterprise", ["Pune", "Mumbai", "Kochi"]),
  co("Deccan Transit Corporation", "AAAGD5512N", "Government", ["Hyderabad", "Bengaluru"]),
  co("Everline Education Trust", "AAATE8834P", "Mid-market", ["Chennai", "Kochi", "Bengaluru"]),
  co("Falcon Aviation Services", "AABCF1147Q", "Enterprise", ["Mumbai", "Delhi NCR", "Kolkata", "Chennai"]),
  co("Greenway Realty Ltd", "AADCG6603R", "SME", ["Pune", "Jaipur"]),
  co("Horizon Cineplex Pvt Ltd", "AAECH3378S", "Mid-market", ["Mumbai", "Kolkata", "Hyderabad"]),
  co("Indigo Fitness Clubs", "AAFCI9921T", "SME", ["Bengaluru", "Mumbai", "Delhi NCR"]),
  co("Jade Retail Malls Ltd", "AABCJ4456U", "Enterprise", ["Ahmedabad", "Jaipur", "Delhi NCR", "Kolkata"]),
  co("Kestrel Manufacturing Co.", "AACCK7782V", "Enterprise", ["Pune", "Ahmedabad"]),
  co("Lumen Diagnostics Pvt Ltd", "AADCL2215W", "SME", ["Hyderabad", "Chennai", "Kochi"]),
];

export const CONTACT_TIERS = [
  { tier: "Decision-maker", hint: "CXO / Head" },
  { tier: "Manager", hint: "Admin / Facilities" },
  { tier: "Coordinator", hint: "Day-to-day contact" },
] as const;

export interface StageMeta {
  no: number;
  name: string;
  owner: string;
  ownerRoles: Role[];
  phase: "A" | "B" | "C" | "D" | "E";
  exit: string;
  gate?: GateNo;
}

export const STAGES: StageMeta[] = [
  { no: 1, name: "Client profile", owner: "Business Development", ownerRoles: ["BD"], phase: "A", exit: "Profile complete" },
  { no: 2, name: "Site & demand sizing", owner: "Business Development", ownerRoles: ["BD"], phase: "A", exit: "Site survey uploaded" },
  { no: 3, name: "Product mix", owner: "Procurement with BD", ownerRoles: ["BD", "Procurement"], phase: "B", exit: "Product mix confirmed" },
  { no: 4, name: "Viability", owner: "Finance", ownerRoles: ["Finance"], phase: "B", exit: "Gate 1 cleared", gate: 1 },
  { no: 5, name: "Commercial alignment", owner: "BD, Finance, Branding", ownerRoles: ["BD", "Branding"], phase: "B", exit: "Certified offer ready" },
  { no: 6, name: "Ops readiness", owner: "Operations", ownerRoles: ["Operations"], phase: "C", exit: "Gate 2 cleared", gate: 2 },
  { no: 7, name: "Tech readiness", owner: "Technology", ownerRoles: ["Technology"], phase: "C", exit: "Gate 3 cleared", gate: 3 },
  { no: 8, name: "Client decision", owner: "Business Development", ownerRoles: ["BD"], phase: "D", exit: "Gate 4 recorded", gate: 4 },
  { no: 9, name: "Draft agreement", owner: "Legal", ownerRoles: ["Legal"], phase: "D", exit: "Draft ready" },
  { no: 10, name: "Submit agreement", owner: "Legal with BD", ownerRoles: ["Legal", "BD"], phase: "D", exit: "Client comments closed" },
  { no: 11, name: "Agreement signed", owner: "Legal", ownerRoles: ["Legal"], phase: "D", exit: "Signed copy uploaded" },
  { no: 12, name: "Deployment", owner: "Mobilisation", ownerRoles: ["Mobilisation"], phase: "E", exit: "Machines live" },
  { no: 13, name: "30-day hypercare", owner: "Mobilisation", ownerRoles: ["Mobilisation"], phase: "E", exit: "30 days stable" },
  { no: 14, name: "Handover", owner: "Mobilisation → Ops, Finance", ownerRoles: ["Mobilisation", "Operations", "Finance"], phase: "E", exit: "Handover signed" },
];

export const PHASES: Record<string, { name: string; temp: Temperature }> = {
  A: { name: "Qualify", temp: "Cold" },
  B: { name: "Proposal", temp: "Warm" },
  C: { name: "Readiness", temp: "Warm" },
  D: { name: "Close", temp: "Hot" },
  E: { name: "Mobilise", temp: "Won" },
};

export const GATES: Record<GateNo, { name: string; owner: Role; question: string; stage: number }> = {
  1: { name: "Viability", owner: "Finance", question: "Does the deal pay at this Service Charge?", stage: 4 },
  2: { name: "Ops readiness", owner: "Operations", question: "Can we service every site, on time?", stage: 6 },
  3: { name: "Tech readiness", owner: "Technology", question: "Will every machine run from day one?", stage: 7 },
  4: { name: "Client decision", owner: "BD", question: "Does the client accept the certified offer?", stage: 8 },
};

export const GATE_CHECKLIST: Record<GateNo, string[]> = {
  1: ["Minimum Service Charge applied for channel & customer type", "Product mix margins reviewed", "Branding offset only where site allows branding"],
  2: ["Refill route covers every site", "Manpower allocated", "Machines reserved", "Go-live date is achievable"],
  3: ["Machine configuration fixed for each site", "Telemetry tested", "Cashless payments tested"],
  4: ["Certified offer presented to client", "Client decision recorded with reason"],
};

export const DEPLOY_ITEMS: { key: "installed" | "configured" | "stocked" | "cashlessTested"; label: string }[] = [
  { key: "installed", label: "Installed" },
  { key: "configured", label: "Configured" },
  { key: "stocked", label: "Stocked to planogram" },
  { key: "cashlessTested", label: "Cashless tested" },
];

export const TEMP_COLORS: Record<Temperature, string> = {
  Cold: "#5B8DEF",
  Warm: "#E97132",
  Hot: "#C85A17",
  Won: "#2E7D32",
};
