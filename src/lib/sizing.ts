// Client-portal sizing: which questions each sub-channel asks, and how they become a footfall estimate.
// All formulas are PLACEHOLDERS for Vendiman to confirm. Ranges use their midpoint; open-ended ranges use 1.5× the floor.
import { CHANNELS } from "./masters";

export interface Bucket {
  label: string;
  mid: number;
}

const fmt = (n: number) => n.toLocaleString("en-IN");
function buckets(edges: number[]): Bucket[] {
  // edges [100, 200, 500, 1000] → 1–100, 101–200, 201–500, 501–1,000, 1,000+
  const out = edges.map((hi, i) => {
    const lo = i ? edges[i - 1] + 1 : 1;
    return { label: `${fmt(lo)}–${fmt(hi)}`, mid: Math.round((lo + hi) / 2) };
  });
  const top = edges.at(-1)!;
  return [...out, { label: `${fmt(top)}+`, mid: Math.round(top * 1.5) }];
}

export const RANGES = {
  people: buckets([100, 200, 500, 1000]),
  crowd: buckets([1000, 5000, 20000, 50000]),
  airport: buckets([5000, 20000, 50000, 100000]),
};

export type SizingField =
  | { key: string; label: string; kind: "range"; buckets: Bucket[] }
  | { key: string; label: string; kind: "number"; min?: number; max?: number };

export interface SizingSpec {
  fields: SizingField[];
  formula: string; // shown to the client next to the result
  daily: (v: (key: string) => number) => number;
}

const range = (key: string, label: string, b: Bucket[] = RANGES.people): SizingField => ({ key, label, kind: "range", buckets: b });
const num = (key: string, label: string, min = 1, max?: number): SizingField => ({ key, label, kind: "number", min, max });

const SHOWS_PER_DAY = 4;
const OCCUPANCY = 0.5;

const commuters: SizingSpec = { fields: [range("commuters", "Commuters per day", RANGES.crowd)], formula: "Commuters per day", daily: (v) => v("commuters") };
const students: SizingSpec = { fields: [range("students", "Students per day")], formula: "Students per day", daily: (v) => v("students") };
const rooms: SizingSpec = {
  fields: [num("rooms", "Number of rooms"), num("perRoom", "People allowed per room")],
  formula: "Rooms × people per room",
  daily: (v) => v("rooms") * v("perRoom"),
};
const visits = (key: string, label: string): SizingSpec => ({
  fields: [range(key, label), num("guardians", "Guardians with each patient", 0, 5)],
  formula: `${label} × (1 patient + guardians)`,
  daily: (v) => v(key) * (1 + v("guardians")),
});

export const SIZING: Record<string, SizingSpec> = {
  Corporate: { fields: [range("employees", "Number of employees")], formula: "Employees", daily: (v) => v("employees") },
  Hybrid: {
    fields: [range("employees", "Number of employees"), num("officeDays", "Mandatory office days per week", 1, 5)],
    formula: "Employees × office days ÷ 5",
    daily: (v) => (v("employees") * v("officeDays")) / 5,
  },
  Onsite: {
    fields: [range("employees", "Regular employees"), num("onsiteStaff", "Onsite employees", 0), num("onsiteDays", "Days onsite per week", 0, 7)],
    formula: "Regular employees + onsite employees × onsite days ÷ 5 (max 5)",
    daily: (v) => v("employees") + (v("onsiteStaff") * Math.min(v("onsiteDays"), 5)) / 5,
  },
  "Bus stand": commuters,
  Metro: commuters,
  "Railway station": commuters,
  Airport: {
    fields: [range("footfall", "Total daily footfall", RANGES.airport), num("terminals", "Number of terminals"), num("gates", "Gates per terminal")],
    formula: "Total daily footfall (terminals and gates help Operations plan machine points)",
    daily: (v) => v("footfall"),
  },
  "Government college": students,
  "Private college": students,
  University: students,
  School: students,
  Hospital: {
    fields: [
      num("floors", "Number of floors"),
      num("beds", "Beds per floor"),
      num("attendants", "Attendants per bed", 0, 5),
      range("opd", "OPD patients per day"),
      num("dayStaff", "Working staff · day shift", 0),
      num("nightStaff", "Working staff · night shift", 0),
    ],
    formula: "OPD + floors × beds × attendants + day staff + night staff",
    daily: (v) => v("opd") + v("floors") * v("beds") * v("attendants") + v("dayStaff") + v("nightStaff"),
  },
  Clinic: visits("appointments", "Appointments per day"),
  "Diagnostic centre / Lab": visits("patients", "Patients per day"),
  PG: rooms,
  Hostel: rooms,
  "Housing society": {
    fields: [num("wings", "Number of wings"), num("floors", "Floors in each wing"), num("flats", "Apartments on each floor"), num("perFlat", "People per apartment (approx.)")],
    formula: "Wings × floors × apartments × people per apartment",
    daily: (v) => v("wings") * v("floors") * v("flats") * v("perFlat"),
  },
  Theatre: {
    fields: [num("screens", "Number of screens"), range("seats", "Seats per screen"), num("staff", "Working staff", 0)],
    formula: `Screens × seats × ${SHOWS_PER_DAY} shows × ${OCCUPANCY * 100}% occupancy + staff`,
    daily: (v) => v("screens") * v("seats") * SHOWS_PER_DAY * OCCUPANCY + v("staff"),
  },
  "Amusement park": {
    fields: [range("tickets", "Tickets sold per day", RANGES.crowd), num("staff", "Working staff", 0)],
    formula: "Tickets per day + staff",
    daily: (v) => v("tickets") + v("staff"),
  },
  "Shopping mall": {
    fields: [num("floors", "Number of floors"), range("staff", "Total working staff"), range("visitors", "Daily visitors (approx.)", RANGES.crowd)],
    formula: "Daily visitors + working staff",
    daily: (v) => v("visitors") + v("staff"),
  },
  "Cultural centre": {
    fields: [num("auditoriums", "Number of auditoriums"), num("events", "Events per day", 0), num("tickets", "Tickets / passes per event (approx.)", 0), range("visitors", "Other daily visitors (approx.)")],
    formula: "Events × tickets per event + other daily visitors",
    daily: (v) => v("events") * v("tickets") + v("visitors"),
  },
  "Fitness centre": { fields: [range("members", "Members per day")], formula: "Members per day", daily: (v) => v("members") },
};

/** Working days a month: offices and campuses run weekdays, everything else every day. */
export const daysPerMonth = (channel: string) => (channel === "Work" || channel === "Education" ? 22 : 30);

/** A field's value: range answers are stored as the bucket index. */
const valueOf = (f: SizingField, raw: number | undefined) => (raw === undefined ? 0 : f.kind === "range" ? (f.buckets[raw]?.mid ?? 0) : raw);

export function missingFields(sub: string, values: Record<string, number>): string[] {
  return (SIZING[sub]?.fields ?? []).filter((f) => values[f.key] === undefined || Number.isNaN(values[f.key])).map((f) => f.label);
}

export function estimateFootfall(channel: string, sub: string, values: Record<string, number>) {
  const spec = SIZING[sub];
  if (!spec) return { daily: 0, monthly: 0 };
  const byKey = Object.fromEntries(spec.fields.map((f) => [f.key, f]));
  const daily = Math.round(spec.daily((k) => valueOf(byKey[k], values[k])));
  return { daily, monthly: daily * daysPerMonth(channel) };
}

/** Readable answer for the deal room, e.g. "201–500" or "3". */
export function answerLabel(sub: string, key: string, raw: number) {
  const f = SIZING[sub]?.fields.find((x) => x.key === key);
  if (!f) return String(raw);
  return f.kind === "range" ? (f.buckets[raw]?.label ?? "—") : fmt(raw);
}

export const ALL_SUBCHANNELS = Object.values(CHANNELS).flat();
