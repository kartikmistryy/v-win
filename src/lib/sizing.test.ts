import { describe, expect, it } from "vitest";
import { ALL_SUBCHANNELS, estimateFootfall, missingFields, RANGES, SIZING } from "./sizing";

describe("client-portal sizing", () => {
  it("every sub-channel has questions and a formula", () => {
    for (const s of ALL_SUBCHANNELS) expect(SIZING[s]?.fields.length, s).toBeGreaterThan(0);
  });

  it("range labels follow the agreed buckets", () => {
    expect(RANGES.people.map((b) => b.label)).toEqual(["1–100", "101–200", "201–500", "501–1,000", "1,000+"]);
  });

  it("hybrid = employees midpoint × office days ÷ 5, monthly × 22", () => {
    // 201–500 → mid 351 (rounded), 3 days → 210.6 → 211
    expect(estimateFootfall("Work", "Hybrid", { employees: 2, officeDays: 3 })).toEqual({ daily: 211, monthly: 211 * 22 });
  });

  it("hospital adds OPD, bed attendants and both shifts; monthly × 30", () => {
    // OPD 101–200 → 151; 4 floors × 20 beds × 1 attendant = 80; staff 60 + 30
    const r = estimateFootfall("Healthcare", "Hospital", { floors: 4, beds: 20, attendants: 1, opd: 1, dayStaff: 60, nightStaff: 30 });
    expect(r).toEqual({ daily: 321, monthly: 321 * 30 });
  });

  it("reports unanswered questions", () => {
    expect(missingFields("Clinic", { appointments: 0 })).toEqual(["Guardians with each patient"]);
    expect(missingFields("Clinic", { appointments: 0, guardians: 1 })).toEqual([]);
  });
});
