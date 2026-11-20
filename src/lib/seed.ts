// Fictional seed data so the pipeline looks alive. All client names are made up.
import { minServiceCharge, PERSONAS } from "./masters";
import { addDays, uid } from "./format";
import type { ActivityEntry, Deal, Gate, GateNo, MachineType, Role, Site } from "./types";

interface SeedSpec {
  n: number;
  client: string;
  city: string;
  zone: string;
  channel: string;
  sub: string;
  customerType: string;
  stage: number;
  sites: [string, number, MachineType, boolean][]; // name, machines, type, branding
  proposed: number;
  daysAgo: number;
  tweak?: (d: Deal, now: string) => void;
}

const SPECS: SeedSpec[] = [
  { n: 1, client: "Northwind Tech Park", city: "Bengaluru", zone: "South 1", channel: "Work", sub: "IT park", customerType: "Enterprise", stage: 1, sites: [["Tower A lobby", 3, "TCN", true]], proposed: 6500, daysAgo: 1 },
  { n: 2, client: "Skyline Hospital", city: "Pune", zone: "West", channel: "Healthcare", sub: "Hospital", customerType: "Mid-market", stage: 2, sites: [["OPD waiting hall", 2, "Seaga", false], ["Staff canteen", 1, "XY", false]], proposed: 7800, daysAgo: 4 },
  {
    n: 3, client: "Metro Line 3 Stations", city: "Mumbai", zone: "West", channel: "Travel", sub: "Metro", customerType: "Government", stage: 3,
    sites: [["BKC station", 4, "ICM", true], ["Worli station", 3, "ICM", true]], proposed: 9200, daysAgo: 9,
    tweak: (d, now) => { d.productMixSubmittedAt = addDays(now, -4); },
  },
  { n: 4, client: "Greenfield University", city: "Chennai", zone: "South 2", channel: "Education", sub: "College", customerType: "Mid-market", stage: 4, sites: [["Library block", 2, "TCN", true], ["Hostel B", 2, "TCN", false]], proposed: 5200, daysAgo: 12 },
  {
    n: 5, client: "Apex Manufacturing", city: "Ahmedabad", zone: "West", channel: "Work", sub: "Manufacturing", customerType: "Enterprise", stage: 6,
    sites: [["Plant 1 shop floor", 5, "Seaga", false]], proposed: 6400, daysAgo: 18,
    tweak: (d, now) => { setGate(d, 2, "cleared", "Operations", now); d.ops = { route: "Route W-14 (Naroda)", manpower: 2, machines: 5, goLiveDate: addDays(now, 21) }; },
  },
  {
    n: 6, client: "Harbour Airport T2", city: "Mumbai", zone: "West", channel: "Travel", sub: "Airport", customerType: "Enterprise", stage: 8,
    sites: [["Departures gate 12", 6, "ICM", true]], proposed: 9600, daysAgo: 30,
    tweak: (d, now) => {
      const g = d.gates[3];
      Object.assign(g, { state: "waiting", outcome: "hold", reasonCode: "Budget approval pending", comment: "Client CFO approval expected next week.", decidedBy: PERSONAS.BD.name, decidedRole: "BD", decidedAt: addDays(now, -2), followUpDate: addDays(now, 3) });
      d.status = "On hold";
    },
  },
  {
    n: 7, client: "Lotus Corporate Tower", city: "Delhi NCR", zone: "North", channel: "Work", sub: "Corporate office", customerType: "Enterprise", stage: 10,
    sites: [["Floors 3–8 pantry", 4, "TCN", true]], proposed: 6800, daysAgo: 40,
    tweak: (d, now) => { d.agreements = [1, 2].map((v) => ({ version: v, fileName: `Lotus_MSA_v${v}.pdf`, approvedTermsStamp: "₹6,800/machine/month · 4 machines · go-live as per Gate 2", signed: false, uploadedAt: addDays(now, -6 + v * 2), uploadedBy: PERSONAS.Legal.name })); },
  },
  {
    n: 8, client: "City Care Clinics", city: "Hyderabad", zone: "South 1", channel: "Healthcare", sub: "Clinic", customerType: "SME", stage: 12,
    sites: [["Banjara Hills clinic", 1, "XY", false], ["Madhapur clinic", 1, "XY", false]], proposed: 8200, daysAgo: 55,
    tweak: (d) => { d.sites[0].deployment = { installed: true, configured: true, stocked: false, cashlessTested: false }; },
  },
  {
    n: 9, client: "Sunrise IT Campus", city: "Bengaluru", zone: "South 1", channel: "Work", sub: "IT park", customerType: "Enterprise", stage: 13,
    sites: [["Block C cafeteria", 4, "Seaga", true]], proposed: 6300, daysAgo: 70,
    tweak: (d, now) => {
      d.hypercareStart = addDays(now, -17);
      d.hypercare = [
        { id: uid("h"), day: 2, issue: "Coin jam on machine 2", fix: "Coin mech cleaned", clientCheckIn: true, by: PERSONAS.Mobilisation.name, at: addDays(now, -16) },
        { id: uid("h"), day: 9, issue: "Cold coffee stock-out", fix: "Refill frequency raised to daily", clientCheckIn: true, by: PERSONAS.Mobilisation.name, at: addDays(now, -9) },
      ];
    },
  },
  {
    n: 10, client: "Chennai Central Mall", city: "Chennai", zone: "South 2", channel: "Entertainment & Leisure", sub: "Mall", customerType: "Mid-market", stage: 14,
    sites: [["Food court entry", 3, "TCN", true]], proposed: 7900, daysAgo: 95,
    tweak: (d, now) => { d.hypercareStart = addDays(now, -32); d.handover.Mobilisation = { by: PERSONAS.Mobilisation.name, at: addDays(now, -1) }; },
  },
  {
    n: 11, client: "Ridgeview Residency", city: "Pune", zone: "West", channel: "Residential", sub: "Gated society", customerType: "SME", stage: 14,
    sites: [["Clubhouse", 2, "XY", false]], proposed: 8100, daysAgo: 120,
    tweak: (d, now) => {
      d.hypercareStart = addDays(now, -45);
      (["Mobilisation", "Operations", "Finance"] as const).forEach((r, i) => (d.handover[r] = { by: PERSONAS[r].name, at: addDays(now, -12 + i) }));
      d.status = "Live";
    },
  },
];

function setGate(d: Deal, n: GateNo, state: Gate["state"], role: Role, now: string, extra: Partial<Gate> = {}) {
  Object.assign(d.gates[n - 1], { state, decidedBy: PERSONAS[role].name, decidedRole: role, decidedAt: now, reasonCode: "Meets criteria", ...extra });
}

export function emptyGates(): Gate[] {
  return [1, 2, 3, 4].map((n) => ({ no: n as GateNo, state: "not_reached" }));
}

export function blankSite(p: Partial<Site> = {}): Site {
  return {
    id: uid("site"),
    name: "",
    address: "",
    footfall: 0,
    machinePoints: 1,
    machineType: "TCN",
    brandingAllowed: false,
    photos: [],
    productLines: [],
    deployment: { installed: false, configured: false, stocked: false, cashlessTested: false },
    ...p,
  };
}

export function buildSeed(): { deals: Deal[]; activity: ActivityEntry[] } {
  const realNow = new Date().toISOString();
  const deals: Deal[] = [];
  const activity: ActivityEntry[] = [];
  for (const sp of SPECS) {
    const created = addDays(realNow, -sp.daysAgo);
    const min = minServiceCharge(sp.channel, sp.customerType);
    const s = sp.stage;
    const d: Deal = {
      id: `VW-2026-${String(sp.n).padStart(4, "0")}`,
      client: {
        id: uid("cl"),
        name: sp.client,
        gst: `27AAB${String(1000 + sp.n * 37).slice(-4)}${"KLMNPQRSTU"[sp.n % 10]}1Z${sp.n % 10}`,
        customerType: sp.customerType,
        contacts: [{ id: uid("c"), name: ["Amit Verma", "Kavya Reddy", "Rahul Nair", "Pooja Gupta"][sp.n % 4], role: "Admin / Facilities head", phone: "+91 98200 1" + String(1000 + sp.n).slice(-4), email: `facilities@${sp.client.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.in` }],
      },
      ownerName: PERSONAS.BD.name,
      channel: sp.channel,
      subChannel: sp.sub,
      zone: sp.zone,
      city: sp.city,
      leadSource: ["Referral", "Inbound website", "Cold outreach", "Event"][sp.n % 4],
      currentStage: s,
      status: s >= 12 ? "In mobilisation" : "Open",
      sites: sp.sites.map(([name, m, t, b], i) =>
        blankSite({
          name,
          address: `${name}, ${sp.client}, ${sp.city}`,
          footfall: 400 + ((sp.n * 173 + i * 91) % 1600),
          machinePoints: m,
          machineType: t,
          brandingAllowed: b,
          productLines:
            s >= 3
              ? ["Haldiram's namkeen", "Coca-Cola 300ml", "Cadbury Dairy Milk", "Bisleri 500ml"].map((p, j) => ({
                  id: uid("pl"),
                  product: p,
                  qty: 20 + j * 10,
                  ...(s >= 4 ? { available: true, marginPct: 18 + j * 2, confirmedBy: PERSONAS.Procurement.name, confirmedAt: addDays(created, 3) } : {}),
                }))
              : [],
          deployment: s >= 13 ? { installed: true, configured: true, stocked: true, cashlessTested: true } : { installed: false, configured: false, stocked: false, cashlessTested: false },
        }),
      ),
      stageDone: Object.fromEntries(Array.from({ length: s - 1 }, (_, i) => [i + 1, true])),
      viability: { minimum: s >= 4 ? min : 0, proposed: sp.proposed, brandingOffset: s >= 5 && sp.proposed < min ? 2500 : 0 },
      gates: emptyGates(),
      legalLocked: false,
      agreements: [],
      hypercare: [],
      handover: {},
      documents: s >= 3 ? [{ id: uid("doc"), name: `${sp.client.split(" ")[0]}_site_survey.pdf`, kind: "Site survey", by: PERSONAS.BD.name, at: addDays(created, 2) }] : [],
      comments: [],
      createdAt: created,
    };
    if (s >= 3 && s !== 3) d.productMixSubmittedAt = addDays(created, 2);
    // gates by stage
    if (s === 4) d.gates[0].state = "waiting";
    if (s >= 5) setGate(d, 1, "cleared", "Finance", addDays(created, 5));
    if (s === 6) { d.gates[1].state = "waiting"; d.gates[2].state = "waiting"; }
    if (s >= 8) {
      setGate(d, 2, "cleared", "Operations", addDays(created, 8));
      setGate(d, 3, "cleared", "Technology", addDays(created, 8));
      d.ops = { route: `Route ${sp.zone.replace(" ", "")}-${sp.n * 3}`, manpower: Math.ceil(sp.sites.length * 1.5), machines: sp.sites.reduce((a, x) => a + x[1], 0), goLiveDate: addDays(created, 30) };
      d.tech = { configuration: sp.sites.map((x) => `${x[1]}× ${x[2]}`).join(", "), telemetryOk: true, cashlessOk: true };
      d.gates[3].state = "waiting";
    }
    if (s >= 9) setGate(d, 4, "cleared", "BD", addDays(created, 12), { outcome: "accept", reasonCode: "Price agreed" });
    if (s >= 12) {
      d.agreements = [{ version: 1, fileName: `${sp.client.split(" ")[0]}_Agreement_signed.pdf`, approvedTermsStamp: `₹${sp.proposed}/machine/month`, signed: true, uploadedAt: addDays(created, 20), uploadedBy: PERSONAS.Legal.name }];
    }
    sp.tweak?.(d, realNow);
    deals.push(d);

    // a few activity entries per deal
    const push = (role: Role, action: string, at: string, extra: Partial<ActivityEntry> = {}) =>
      activity.push({ id: uid("a"), dealId: d.id, user: PERSONAS[role].name, role, action, at, ...extra });
    push("BD", "Created lead", created, { field: "stage", newValue: "1" });
    if (s >= 2) push("BD", "Completed client profile", addDays(created, 1));
    if (s >= 3) push("BD", "Uploaded site survey", addDays(created, 2));
    if (d.productMixSubmittedAt) push("BD", "Submitted product mix to Procurement", d.productMixSubmittedAt);
    if (s >= 4) push("Procurement", "Confirmed product mix", addDays(created, 3), { field: "stage", oldValue: "3", newValue: "4" });
    if (s >= 5) push("Finance", "Cleared Gate 1 · Viability", addDays(created, 5), { field: "Gate 1", oldValue: "waiting", newValue: "cleared" });
    if (s >= 8) push("Operations", "Cleared Gate 2 · Ops readiness", addDays(created, 8));
    if (s >= 8) push("Technology", "Cleared Gate 3 · Tech readiness", addDays(created, 8));
    if (s >= 9) push("BD", "Recorded Gate 4 = Accept", addDays(created, 12));
    if (s >= 12) push("Legal", "Uploaded signed agreement", addDays(created, 20));
  }
  return { deals, activity: activity.sort((a, b) => b.at.localeCompare(a.at)) };
}
