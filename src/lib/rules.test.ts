import { describe, expect, it } from "vitest";
import { buildSeed } from "./seed";
import {
  canMoveTo,
  deriveTemperature,
  gate1Block,
  isLive,
  offsetError,
  procurementOverdue,
  validateDecision,
  viabilityGap,
} from "./rules";
import type { Deal } from "./types";

const seed = () => buildSeed().deals;
const at = (stage: number) => structuredClone(seed().find((d) => d.currentStage === stage)!) as Deal;

describe("temperature (BR-09)", () => {
  it("Cold/Warm/Hot/Won by stage", () => {
    expect(deriveTemperature(at(1))).toBe("Cold");
    expect(deriveTemperature(at(4))).toBe("Warm");
    expect(deriveTemperature(at(10))).toBe("Hot");
    expect(deriveTemperature(at(13))).toBe("Won");
  });
  it("AC-07: Gate 2 cleared, Gate 3 waiting → stays Warm, cannot enter Stage 8", () => {
    const d = at(6);
    expect(d.gates[1].state).toBe("cleared");
    expect(d.gates[2].state).toBe("waiting");
    expect(deriveTemperature(d)).toBe("Warm");
    expect(canMoveTo(d, 8).reason).toMatch(/Gate 3/);
  });
  it("Hot drops to Warm when a gate is re-opened after Gate 4", () => {
    const d = at(10);
    d.gates[0].state = "waiting";
    expect(deriveTemperature(d)).toBe("Warm");
  });
});

describe("stage movement (BR-01, BR-02)", () => {
  it("AC-06: Stage 4 → 6 is blocked naming the missing gate", () => {
    const r = canMoveTo(at(4), 6);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Gate 1 \(Finance · Viability\)/);
  });
  it("cannot skip stages", () => {
    expect(canMoveTo(at(1), 3).reason).toMatch(/can't be skipped/);
  });
});

describe("viability (BR-05, BR-06)", () => {
  it("AC-04: below minimum with no branding blocks Gate 1", () => {
    const d = at(4);
    const v = { minimum: 6000, proposed: 5000, brandingOffset: 0 };
    expect(viabilityGap(v)).toBe(-1000);
    expect(gate1Block(d, v)).toMatch(/below the minimum/);
  });
  it("AC-05: ₹2,500 branding offset closes the gap", () => {
    const d = at(4); // has a branding-allowed site
    const v = { minimum: 6000, proposed: 5000, brandingOffset: 2500 };
    expect(viabilityGap(v)).toBe(1500);
    expect(gate1Block(d, v)).toBeNull();
  });
  it("offset under ₹2,500 or without branding is refused", () => {
    const d = at(4);
    expect(offsetError(d, 1000)).toMatch(/2,500/);
    d.sites.forEach((s) => (s.brandingAllowed = false));
    expect(offsetError(d, 3000)).toMatch(/only allowed/);
  });
});

describe("decisions (BR-07, BR-12)", () => {
  it("AC-08: reject without comment is refused", () => {
    expect(validateDecision({ decision: "reject", reasonCode: "Other" })).toMatch(/comment/);
    expect(validateDecision({ decision: "reject" })).toMatch(/reason/);
    expect(validateDecision({ decision: "reject", reasonCode: "Other", comment: "x" })).toBeNull();
  });
  it("hold requires a follow-up date", () => {
    expect(validateDecision({ decision: "hold", reasonCode: "x", comment: "y" })).toMatch(/follow-up/);
  });
});

describe("procurement SLA (BR-11) and handover (BR-13)", () => {
  it("AC-03: overdue after 1 working day", () => {
    const d = at(3);
    expect(procurementOverdue(d, new Date())).toBe(true);
    d.productMixSubmittedAt = new Date().toISOString();
    expect(procurementOverdue(d, new Date())).toBe(false);
  });
  it("AC-14: not Live without Finance", () => {
    const d = at(14);
    d.handover = { Mobilisation: { by: "a", at: "" }, Operations: { by: "b", at: "" } };
    expect(isLive(d)).toBe(false);
    d.handover.Finance = { by: "c", at: "" };
    expect(isLive(d)).toBe(true);
  });
});
