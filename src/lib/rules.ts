// Pure business rules (BR-01 … BR-15). No React, no store — easy to unit test.
import { BRANDING_MIN_OFFSET, GATES, STAGES } from "./masters";
import { addWorkingDays, daysBetween } from "./format";
import type { Deal, GateNo, Role, Temperature } from "./types";

export const gate = (d: Deal, n: GateNo) => d.gates[n - 1];
export const gateLabel = (n: GateNo) => `Gate ${n} (${GATES[n].owner === "BD" ? "Business Development" : GATES[n].owner} · ${GATES[n].name})`;

/** BR-09 — temperature is derived, never stored. */
export function deriveTemperature(d: Deal): Temperature {
  const s = d.currentStage;
  if (s >= 12) return "Won";
  if (s >= 8) return [1, 2, 3].every((n) => gate(d, n as GateNo).state === "cleared") ? "Hot" : "Warm";
  if (s >= 3) return "Warm";
  return "Cold";
}

export const brandingAllowed = (d: Deal) => d.sites.some((s) => s.brandingAllowed);
export const totalMachines = (d: Deal) => d.sites.reduce((a, s) => a + (s.machinePoints || 0), 0);

/** Viability gap = proposed + branding offset − minimum (FR-05, FR-06). */
export function viabilityGap(v: { minimum: number; proposed: number; brandingOffset: number }) {
  return v.proposed + v.brandingOffset - v.minimum;
}

/** BR-06 — offset only where branding is allowed, and only ≥ ₹2,500/month. */
export function offsetError(d: Deal, offset: number): string | null {
  if (!offset) return null;
  if (!brandingAllowed(d)) return "Branding offset is only allowed when a site allows branding.";
  if (offset < BRANDING_MIN_OFFSET) return `Branding offset must be at least ₹2,500 per month.`;
  return null;
}

/** BR-05 — Gate 1 (and the offer) is blocked while the gap is negative. */
export function gate1Block(d: Deal, v = d.viability): string | null {
  const oe = offsetError(d, v.brandingOffset);
  if (oe) return oe;
  if (!v.minimum) return "Set the minimum Service Charge first.";
  if (viabilityGap(v) < 0)
    return "Proposed Service Charge is below the minimum (after branding offset). Gate 1 can't be cleared and the offer is blocked.";
  return null;
}

export type Check = { ok: boolean; reason: string };

/** BR-01 … BR-04 — stages move strictly in order; gates block progress. */
export function canMoveTo(d: Deal, target: number): Check {
  const cur = d.currentStage;
  if (d.status === "Lost") return { ok: false, reason: "This deal is Lost and read-only." };
  if (target <= cur) return { ok: false, reason: `Stage ${target} is already reached.` };
  const missing: string[] = [];
  if (target >= 5 && gate(d, 1).state !== "cleared") missing.push(gateLabel(1));
  if (target >= 8) {
    if (gate(d, 2).state !== "cleared") missing.push(gateLabel(2));
    if (gate(d, 3).state !== "cleared") missing.push(gateLabel(3));
  }
  if (target >= 9 && gate(d, 4).outcome !== "accept") missing.push(`${gateLabel(4)} = Accept`);
  if (missing.length)
    return {
      ok: false,
      reason: `Can't move to Stage ${target} — ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} not cleared yet.`,
    };
  const curMeta = STAGES[Math.min(cur, 14) - 1];
  // stage 6 & 7 run in parallel — treat them as one step
  const next = cur === 6 ? 8 : cur + 1;
  if (target > next)
    return { ok: false, reason: `Stages can't be skipped — finish Stage ${cur} (${curMeta.name}) first.` };
  return { ok: false, reason: `Stage ${cur} isn't finished yet — exit criterion: “${curMeta.exit}”.` };
}

/** BR-07 / BR-12 — every decision needs a reason; reject & hold need a comment; hold needs a date. */
export function validateDecision(x: {
  decision: "clear" | "reject" | "accept" | "hold" | "override";
  reasonCode?: string;
  comment?: string;
  followUpDate?: string;
}): string | null {
  if (!x.reasonCode) return "Pick a reason code.";
  if ((x.decision === "reject" || x.decision === "hold" || x.decision === "override") && !x.comment?.trim())
    return x.decision === "override" ? "A written reason is required for an override." : "A comment is required to reject or hold.";
  if (x.decision === "hold" && !x.followUpDate) return "Hold needs a follow-up date.";
  return null;
}

/** BR-10 — which gate a post-Gate-4 change re-opens. */
export const REOPEN_MAP = { price: 1, productMix: 1, sites: 2, goLiveDate: 2, machines: 3 } as const;
export type ChangeKind = keyof typeof REOPEN_MAP;

export const afterGate4 = (d: Deal) => gate(d, 4).outcome === "accept" && d.currentStage >= 9 && d.currentStage <= 11;

/** BR-11 — Procurement must confirm within 1 working day. */
export function procurementOverdue(d: Deal, now: Date): boolean {
  if (d.currentStage !== 3 || !d.productMixSubmittedAt || d.stageDone[3]) return false;
  return now.getTime() > new Date(addWorkingDays(d.productMixSubmittedAt, 1)).getTime();
}

/** BR-12 — on-hold deal reappears in the owner's tasks on the follow-up date. */
export function holdDue(d: Deal, now: Date): boolean {
  const g = gate(d, 4);
  return d.status === "On hold" && !!g.followUpDate && new Date(g.followUpDate).getTime() <= now.getTime();
}

export function hypercareDay(d: Deal, now: Date): number {
  if (!d.hypercareStart) return 0;
  return Math.max(1, daysBetween(d.hypercareStart, now) + 1);
}

export const siteDeployed = (s: Deal["sites"][number]) => Object.values(s.deployment).every(Boolean);
export const allSitesDeployed = (d: Deal) => d.sites.length > 0 && d.sites.every(siteDeployed);

/** BR-13 — Live only with all three handover signatures. */
export const isLive = (d: Deal) => !!(d.handover.Mobilisation && d.handover.Operations && d.handover.Finance);

export const waitingGates = (d: Deal) => d.gates.filter((g) => g.state === "waiting" && !(g.no === 4 && d.status === "On hold"));

/** Can this role act on this gate right now? */
export function canDecideGate(d: Deal, n: GateNo, role: Role): boolean {
  if (d.status === "Lost" || d.status === "Live") return false;
  return gate(d, n).state === "waiting" && GATES[n].owner === role;
}

export interface Task {
  dealId: string;
  client: string;
  text: string;
  overdue?: boolean;
}

/** "My tasks" — what this role must do now. */
export function tasksFor(role: Role, deals: Deal[], now: Date): Task[] {
  const out: Task[] = [];
  for (const d of deals) {
    if (d.status === "Lost" || d.status === "Live") continue;
    const t = (text: string, overdue = false) => out.push({ dealId: d.id, client: d.client.name, text, overdue });
    const s = d.currentStage;
    for (const g of waitingGates(d)) if (GATES[g.no].owner === role) t(`Decide ${gateLabel(g.no)}${g.reopened ? " — re-opened after a change" : ""}`);
    switch (role) {
      case "BD":
        if (s === 1) t("Complete client profile");
        if (s === 2) t("Upload site survey");
        if (s === 3 && !d.productMixSubmittedAt) t("Propose product mix and submit to Procurement");
        if (s === 5) t("Build the certified offer");
        if (holdDue(d, now)) t("Follow up — deal on hold", true);
        if (s === 10) t("Close client comments with Legal");
        break;
      case "Procurement":
        if (s === 3 && d.productMixSubmittedAt && !d.stageDone[3]) t("Confirm product mix (1 working day)", procurementOverdue(d, now));
        break;
      case "Branding":
        if (s === 5 && brandingAllowed(d) && !d.brandingConfirmed) t("Confirm branding scope & value");
        break;
      case "Legal":
        if (d.legalLocked && s >= 9 && s <= 11) break;
        if (s === 9) t("Draft agreement from approved terms");
        if (s === 10) t("Share agreement & close client comments");
        if (s === 11) t("Upload signed agreement");
        break;
      case "Mobilisation":
        if (s === 12) t("Complete deployment checklist");
        if (s === 13) t(`Hypercare day ${Math.min(30, hypercareDay(d, now))} of 30 — log today`, hypercareDay(d, now) > 30);
        if (s === 14 && !d.handover.Mobilisation) t("Sign handover");
        break;
      case "Operations":
      case "Finance":
        if (s === 14 && !d.handover[role]) t("Sign handover");
        break;
    }
  }
  return out;
}
