"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GATES, JUNIORS, PERSONAS, personName, ROLES, STAGES } from "./masters";
import { demoNow, fmtDate, inr, uid } from "./format";
import {
  allSitesDeployed,
  canDecideGate,
  canReopenGate,
  canReviewGate,
  gate,
  gate1Block,
  gateLabel,
  hypercareDay,
  isLive,
  REOPEN_MAP,
  validateDecision,
  type ChangeKind,
} from "./rules";
import { buildSeed, emptyGates } from "./seed";
import type {
  ActivityEntry,
  Deal,
  DeployKey,
  GateNo,
  Intake,
  Level,
  MachineType,
  Notification,
  OpsReadiness,
  ProductLine,
  Sizing,
  Role,
  Site,
  TechReadiness,
  Viability,
} from "./types";

export type Result = { ok: true; msg?: string } | { ok: false; msg: string };

export interface NewLeadInput {
  clientName: string;
  gst: string;
  customerType: string;
  contacts: Deal["client"]["contacts"];
  channel: string;
  subChannel: string;
  zone: string;
  city: string;
  leadSource: string;
  sites: Site[];
  locations?: string[];
  sizing?: Sizing;
}

export interface GateDecision {
  decision: "clear" | "reject" | "accept" | "hold" | "override";
  reasonCode?: string;
  comment?: string;
  followUpDate?: string;
  viability?: Viability;
  ops?: OpsReadiness;
  tech?: TechReadiness;
}

interface State {
  role: Role;
  level: Level;
  dayOffset: number;
  deals: Deal[];
  activity: ActivityEntry[];
  notifications: Notification[];
  setRole: (r: Role, level?: Level) => void;
  simulateDays: (n: number) => void;
  reset: () => void;
  now: () => Date;
  createLead: (x: NewLeadInput) => string;
  submitClientLead: (x: NewLeadInput) => string;
  reviewIntake: (id: string, accept: boolean, note: string) => Result;
  reviewGate: (id: string, n: GateNo, action: "endorse" | "reopen", comment: string) => Result;
  completeProfile: (id: string) => Result;
  uploadSurvey: (id: string, fileName: string, sites: Site[]) => Result;
  submitProductMix: (id: string, lines: Record<string, ProductLine[]>, proposed: number) => Result;
  confirmLine: (id: string, siteId: string, lineId: string, available: boolean, marginPct: number) => void;
  confirmProductMix: (id: string) => Result;
  decideGate: (id: string, n: GateNo, x: GateDecision) => Result;
  confirmBranding: (id: string, note: string) => Result;
  certifyOffer: (id: string) => Result;
  changeAfterGate4: (id: string, kind: ChangeKind, value: string | number, siteId?: string) => Result;
  uploadDraft: (id: string, fileName: string) => Result;
  closeComments: (id: string) => Result;
  uploadSigned: (id: string, fileName: string) => Result;
  toggleDeploy: (id: string, siteId: string, key: DeployKey) => Result;
  addHypercareLog: (id: string, issue: string, fix: string, clientCheckIn: boolean) => Result;
  completeHypercare: (id: string) => Result;
  signHandover: (id: string) => Result;
  addComment: (id: string, text: string) => void;
  addDocument: (id: string, name: string, kind: string) => void;
  markRead: () => void;
}

const fresh = () => {
  const { deals, activity } = buildSeed();
  return { deals, activity, notifications: [] as Notification[], dayOffset: 0 };
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const me = () => ({ role: get().role, level: get().level, name: personName(get().role, get().level) });
      const nowIso = () => get().now().toISOString();

      const log = (dealId: string, action: string, extra: Partial<ActivityEntry> = {}) => {
        const { role, name } = me();
        set((s) => ({ activity: [{ id: uid("a"), dealId, user: name, role, action, at: nowIso(), ...extra }, ...s.activity] }));
      };
      const notify = (toRoles: Role[], text: string, dealId?: string) => {
        const at = nowIso();
        set((s) => ({
          notifications: [
            ...toRoles.filter((r) => r !== get().role).map((r) => ({ id: uid("n"), toRole: r, text, dealId, at, read: false })),
            ...s.notifications,
          ],
        }));
      };
      const find = (id: string) => get().deals.find((d) => d.id === id);
      /** Clone-mutate-replace a deal. */
      const mutate = (id: string, fn: (d: Deal) => void) => {
        set((s) => ({
          deals: s.deals.map((d) => {
            if (d.id !== id) return d;
            const c = structuredClone(d);
            fn(c);
            return c;
          }),
        }));
      };
      const guard = (id: string, roles: Role[], stage?: number | number[]): Result | Deal => {
        const d = find(id);
        if (!d) return { ok: false, msg: "Deal not found." };
        if (d.status === "Lost" || d.status === "Live") return { ok: false, msg: `Deal is ${d.status} and read-only.` };
        if (!roles.includes(get().role)) return { ok: false, msg: `Only ${roles.join(" / ")} can do this.` };
        if (d.intake?.status === "pending") return { ok: false, msg: "This client lead is waiting for a Senior BD to accept it into the pipeline." };
        if (stage !== undefined) {
          const ok = Array.isArray(stage) ? stage.includes(d.currentStage) : d.currentStage === stage;
          if (!ok) return { ok: false, msg: `Deal is not at the right stage for this action.` };
        }
        return d;
      };
      const isRes = (x: Result | Deal): x is Result => "ok" in x;

      const newDeal = (x: NewLeadInput, extra: { ownerName?: string; intake?: Intake } = {}) => {
          const max = get().deals.reduce((m, d) => Math.max(m, Number(d.id.slice(-4))), 0);
          const id = `VW-${get().now().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
          const deal: Deal = {
            id,
            client: { id: uid("cl"), name: x.clientName.trim(), gst: x.gst.trim().toUpperCase(), customerType: x.customerType, contacts: x.contacts },
            ownerName: extra.ownerName ?? me().name,
            channel: x.channel,
            subChannel: x.subChannel,
            zone: x.zone,
            city: x.city,
            leadSource: x.leadSource,
            locations: x.locations,
            sizing: x.sizing,
            intake: extra.intake,
            currentStage: 1,
            status: "Open",
            sites: x.sites,
            stageDone: {},
            viability: { minimum: 0, proposed: 0, brandingOffset: 0 },
            gates: emptyGates(),
            legalLocked: false,
            agreements: [],
            hypercare: [],
            handover: {},
            documents: [],
            comments: [],
            createdAt: nowIso(),
          };
          set((s) => ({ deals: [deal, ...s.deals] }));
          if (!extra.intake) log(id, "Created lead", { field: "stage", newValue: "1" });
          return id;
      };

      /** Move forward after a gate (or override) clears. */
      const afterClear = (d: Deal, n: GateNo) => {
        if (n === 1 && d.currentStage === 4) d.currentStage = 5;
        if ((n === 2 || n === 3) && d.currentStage === 6 && gate(d, 2).state === "cleared" && gate(d, 3).state === "cleared") {
          d.currentStage = 8;
          d.gates[3].state = "waiting";
        }
        d.gates[n - 1].reopened = false;
        if (d.legalLocked && [1, 2, 3].every((k) => gate(d, k as GateNo).state === "cleared")) d.legalLocked = false;
      };

      return {
        role: "BD",
        level: "Senior",
        ...fresh(),
        now: () => demoNow(get().dayOffset),
        setRole: (r, level = "Senior") => set({ role: r, level: JUNIORS[r] ? level : "Senior" }),
        simulateDays: (n) => set((s) => ({ dayOffset: s.dayOffset + n })),
        reset: () => set({ ...fresh(), role: "BD", level: "Senior" }),

        createLead: (x) => newDeal(x),

        submitClientLead: (x) => {
          const intake: Intake = { status: "pending", submittedAt: nowIso() };
          const id = newDeal(x, { ownerName: "Unassigned", intake });
          const at = nowIso();
          // written directly: the client isn't a V-Win role, and every BD user must see it
          set((s) => ({
            activity: [{ id: uid("a"), dealId: id, user: `${x.contacts[0]?.name || "Client"} (client portal)`, role: "BD", action: "Submitted lead via client portal", field: "stage", newValue: "1", at }, ...s.activity],
            notifications: [{ id: uid("n"), toRole: "BD", text: `New client-portal lead: ${x.clientName} — waiting for Senior BD review`, dealId: id, at, read: false }, ...s.notifications],
          }));
          return id;
        },

        reviewIntake: (id, accept, note) => {
          const d0 = find(id);
          if (!d0 || d0.intake?.status !== "pending") return { ok: false, msg: "This lead is not waiting for review." };
          if (get().role !== "BD" || get().level !== "Senior") return { ok: false, msg: "Only a Senior BD can review client leads." };
          if (!accept && !note.trim()) return { ok: false, msg: "Add a comment saying why the lead is rejected." };
          mutate(id, (d) => {
            d.intake = { ...d.intake!, status: accept ? "accepted" : "rejected", reviewedBy: me().name, reviewedAt: nowIso(), note: note.trim() || undefined };
            if (accept) d.ownerName = me().name;
            else d.status = "Lost";
          });
          log(id, accept ? "Accepted client lead into the pipeline" : "Rejected client lead", { field: "intake", oldValue: "pending", newValue: accept ? "accepted" : "rejected" });
          return { ok: true, msg: accept ? "Lead accepted — you own it now · Stage 1 · Cold" : "Lead rejected and marked Lost" };
        },

        reviewGate: (id, n, action, comment) => {
          const d0 = find(id);
          if (!d0) return { ok: false, msg: "Deal not found." };
          if (get().role !== GATES[n].owner || get().level !== "Senior") return { ok: false, msg: `Only a Senior in ${GATES[n].owner} can review this decision.` };
          if (!canReviewGate(d0, n)) return { ok: false, msg: "There is no Junior decision to review on this gate." };
          if (action === "reopen" && !canReopenGate(d0, n)) return { ok: false, msg: "Too late to re-open — the deal has moved past this point." };
          if (action === "reopen" && !comment.trim()) return { ok: false, msg: "Add a comment saying why you are re-opening it." };
          const at = nowIso();
          mutate(id, (d) => {
            const g = d.gates[n - 1];
            if (action === "endorse") return void Object.assign(g, { reviewedBy: me().name, reviewedAt: at });
            // Re-open: the gate waits again and the deal steps back to it; data is kept (BR-08 style)
            d.gates[n - 1] = { no: n, state: "waiting", reopened: true, comment: comment.trim() };
            if (n === 1) {
              d.currentStage = 4;
              d.gates[1] = { no: 2, state: "not_reached" };
              d.gates[2] = { no: 3, state: "not_reached" };
            }
            if (n === 2 || n === 3) d.currentStage = 6;
            if (n === 4) d.currentStage = 8;
            else d.gates[3] = { no: 4, state: "not_reached" };
            for (let k = d.currentStage; k <= 8; k++) d.stageDone[k] = false;
            if (d.status === "On hold") d.status = "Open";
          });
          log(id, action === "endorse" ? `Senior review: endorsed ${gateLabel(n)}` : `Senior review: re-opened ${gateLabel(n)}`, {
            field: `Gate ${n}`,
            oldValue: d0.gates[n - 1].outcome ?? d0.gates[n - 1].state,
            newValue: action === "endorse" ? "endorsed" : "waiting",
          });
          if (action === "reopen") notify([GATES[n].owner, "BD"], `${d0.client.name}: Senior re-opened ${gateLabel(n)} — “${comment.trim()}”`, id);
          return { ok: true, msg: action === "endorse" ? "Decision endorsed" : `${gateLabel(n)} re-opened — deal is back at Stage ${find(id)!.currentStage === 6 ? "6–7" : find(id)!.currentStage}` };
        },


        completeProfile: (id) => {
          const g = guard(id, ["BD"], 1);
          if (isRes(g)) return g;
          if (!g.client.contacts.length || !g.sites.length) return { ok: false, msg: "Add at least one contact and one site." };
          mutate(id, (d) => { d.stageDone[1] = true; d.currentStage = 2; });
          log(id, "Completed client profile", { field: "stage", oldValue: "1", newValue: "2" });
          return { ok: true, msg: "Profile complete → Stage 2" };
        },

        uploadSurvey: (id, fileName, sites) => {
          const g = guard(id, ["BD"], 2);
          if (isRes(g)) return g;
          if (!fileName) return { ok: false, msg: "Attach the site survey file." };
          if (sites.some((s) => !s.footfall || !s.machinePoints)) return { ok: false, msg: "Enter footfall and machine points for every site." };
          mutate(id, (d) => {
            d.sites = sites;
            d.documents.push({ id: uid("doc"), name: fileName, kind: "Site survey", by: me().name, at: nowIso() });
            d.stageDone[2] = true;
            d.currentStage = 3;
          });
          log(id, "Uploaded site survey", { field: "stage", oldValue: "2", newValue: "3" });
          return { ok: true, msg: "Site survey uploaded → Stage 3 (deal is now Warm)" };
        },

        submitProductMix: (id, lines, proposed) => {
          const g = guard(id, ["BD"], 3);
          if (isRes(g)) return g;
          if (g.sites.some((s) => !(lines[s.id]?.length))) return { ok: false, msg: "Add at least one product for every site." };
          if (!proposed || proposed <= 0) return { ok: false, msg: "Enter the proposed Service Charge." };
          mutate(id, (d) => {
            d.sites.forEach((s) => (s.productLines = lines[s.id]));
            d.viability.proposed = proposed;
            d.productMixSubmittedAt = nowIso();
          });
          log(id, "Submitted product mix to Procurement", { field: "proposed Service Charge", newValue: inr(proposed) });
          notify(["Procurement"], `${g.client.name}: product mix waiting for confirmation (1 working day)`, id);
          return { ok: true, msg: "Sent to Procurement" };
        },

        confirmLine: (id, siteId, lineId, available, marginPct) => {
          if (get().role !== "Procurement") return;
          mutate(id, (d) => {
            const l = d.sites.find((s) => s.id === siteId)?.productLines.find((p) => p.id === lineId);
            if (l) Object.assign(l, { available, marginPct, confirmedBy: me().name, confirmedAt: nowIso() });
          });
        },

        confirmProductMix: (id) => {
          const g = guard(id, ["Procurement"], 3);
          if (isRes(g)) return g;
          if (!g.productMixSubmittedAt) return { ok: false, msg: "BD hasn't submitted the product mix yet." };
          const lines = g.sites.flatMap((s) => s.productLines);
          if (lines.some((l) => l.available === undefined || l.marginPct === undefined)) return { ok: false, msg: "Mark every line available / not available with a margin %." };
          mutate(id, (d) => { d.stageDone[3] = true; d.currentStage = 4; d.gates[0].state = "waiting"; });
          log(id, "Confirmed product mix", { field: "stage", oldValue: "3", newValue: "4" });
          notify(["Finance"], `${g.client.name}: waiting at Gate 1 · Viability`, id);
          notify(["BD"], `${g.client.name}: product mix confirmed by Procurement`, id);
          return { ok: true, msg: "Product mix confirmed → Gate 1 waiting on Finance" };
        },

        decideGate: (id, n, x) => {
          const d0 = find(id);
          if (!d0) return { ok: false, msg: "Deal not found." };
          const role = get().role;
          const isOverride = x.decision === "override";
          if (isOverride) {
            if (role !== "Leadership") return { ok: false, msg: "Only Leadership can override." };
            if (n === 4 || gate(d0, n).state !== "waiting") return { ok: false, msg: "Only a waiting Gate 1–3 can be overridden." };
          } else if (!canDecideGate(d0, n, role)) return { ok: false, msg: `Only ${GATES[n].owner} can decide ${gateLabel(n)} while it is waiting.` };
          const err = validateDecision(x);
          if (err) return { ok: false, msg: err };
          if (n === 1 && x.decision === "clear") {
            const block = gate1Block(d0, x.viability ?? d0.viability);
            if (block) return { ok: false, msg: block };
          }
          if (n === 2 && x.decision === "clear" && (!x.ops?.route || !x.ops.goLiveDate || !x.ops.manpower)) return { ok: false, msg: "Commit route, manpower and go-live date first." };
          if (n === 3 && x.decision === "clear" && (!x.tech?.telemetryOk || !x.tech.cashlessOk || !x.tech.configuration)) return { ok: false, msg: "Telemetry and cashless must be ready, with a configuration." };

          const at = nowIso();
          const prev = gate(d0, n).state;
          let msg = "";
          mutate(id, (d) => {
            if (x.viability) d.viability = x.viability;
            if (x.ops) d.ops = x.ops;
            if (x.tech) d.tech = x.tech;
            const g = d.gates[n - 1];
            Object.assign(g, { decidedBy: me().name, decidedRole: role, decidedLevel: me().level, decidedAt: at, reasonCode: x.reasonCode, comment: x.comment, override: isOverride || undefined, reviewedBy: undefined, reviewedAt: undefined });
            if (x.decision === "clear" || isOverride) {
              g.state = "cleared";
              afterClear(d, n);
              msg = `${gateLabel(n)} cleared${isOverride ? " by Leadership override" : ""}`;
            } else if (n === 4 && x.decision === "reject") {
              g.state = "rejected";
              g.outcome = "reject";
              d.status = "Lost";
              msg = "Client rejected — deal marked Lost";
            } else if (x.decision === "reject") {
              // BR-08: back to the stage before the gate, data kept
              g.state = "rejected";
              d.currentStage = n === 1 ? 3 : 5;
              if (n === 1) { d.stageDone[3] = false; d.productMixSubmittedAt = undefined; }
              d.stageDone[d.currentStage] = false;
              if (d.gates[3].state !== "not_reached") d.gates[3] = { no: 4, state: "not_reached" };
              if (d.status === "On hold") d.status = "Open";
              d.legalLocked = false;
              msg = `${gateLabel(n)} rejected — deal back to Stage ${d.currentStage}`;
            } else if (x.decision === "accept") {
              g.state = "cleared";
              g.outcome = "accept";
              g.followUpDate = undefined;
              d.status = "Open";
              d.currentStage = 9;
              msg = "Client accepted → Legal can draft the agreement";
            } else if (x.decision === "hold") {
              g.state = "waiting";
              g.outcome = "hold";
              g.followUpDate = x.followUpDate ? new Date(x.followUpDate + "T09:00:00+05:30").toISOString() : undefined;
              d.status = "On hold";
              msg = `Deal on hold until ${fmtDate(g.followUpDate)}`;
            }
          });
          const newState = gate(find(id)!, n).state;
          log(id, isOverride ? `Leadership override on ${gateLabel(n)}` : `${x.decision[0].toUpperCase() + x.decision.slice(1)} — ${gateLabel(n)}`, {
            field: `Gate ${n}`,
            oldValue: prev,
            newValue: n === 4 ? (find(id)!.gates[3].outcome ?? newState) : newState,
          });
          const d1 = find(id)!;
          const watchers: Role[] = ["BD", "Finance", "Operations", "Technology", "Legal"];
          notify(watchers, `${d1.client.name}: ${msg}`, id);
          if (d1.currentStage === 8 && d1.gates[3].state === "waiting" && prev !== "waiting" && n !== 4) notify(["BD"], `${d1.client.name}: Gates 1–3 cleared — present the certified offer`, id);
          return { ok: true, msg };
        },

        confirmBranding: (id, note) => {
          const g = guard(id, ["Branding"], 5);
          if (isRes(g)) return g;
          mutate(id, (d) => { d.brandingConfirmed = true; });
          log(id, "Confirmed branding scope", { newValue: note || "Confirmed" });
          notify(["BD"], `${g.client.name}: branding confirmed`, id);
          return { ok: true, msg: "Branding confirmed" };
        },

        certifyOffer: (id) => {
          const g = guard(id, ["BD"], 5);
          if (isRes(g)) return g;
          const block = gate1Block(g);
          if (block) return { ok: false, msg: block };
          if (g.sites.some((s) => s.brandingAllowed) && !g.brandingConfirmed) return { ok: false, msg: "Waiting for Branding to confirm scope & value." };
          mutate(id, (d) => {
            d.stageDone[5] = true;
            d.currentStage = 6;
            if (d.gates[1].state !== "cleared") d.gates[1].state = "waiting";
            if (d.gates[2].state !== "cleared") d.gates[2].state = "waiting";
          });
          log(id, "Certified offer ready", { field: "stage", oldValue: "5", newValue: "6–7" });
          notify(["Operations", "Technology"], `${g.client.name}: waiting at Gates 2 & 3 (run in parallel)`, id);
          return { ok: true, msg: "Offer certified → Gates 2 & 3 waiting (parallel)" };
        },

        changeAfterGate4: (id, kind, value, siteId) => {
          const d0 = find(id);
          if (!d0) return { ok: false, msg: "Deal not found." };
          const n = REOPEN_MAP[kind] as GateNo;
          const allowed: Role[] = kind === "goLiveDate" ? ["Operations", "BD"] : kind === "machines" ? ["Technology", "BD"] : ["BD"];
          const g = guard(id, allowed, [9, 10, 11]);
          if (isRes(g)) return g;
          let oldValue = "";
          mutate(id, (d) => {
            if (kind === "price") { oldValue = inr(d.viability.proposed); d.viability.proposed = Number(value); }
            if (kind === "goLiveDate" && d.ops) { oldValue = fmtDate(d.ops.goLiveDate); d.ops.goLiveDate = new Date(String(value) + "T09:00:00+05:30").toISOString(); }
            if (kind === "machines") {
              const s = d.sites.find((x) => x.id === siteId);
              if (s) { oldValue = s.machineType; s.machineType = value as MachineType; }
            }
            Object.assign(d.gates[n - 1], { state: "waiting", reopened: true, override: undefined });
            d.legalLocked = true;
          });
          const label = { price: "Service Charge", productMix: "Product mix", sites: "Sites", goLiveDate: "Go-live date", machines: "Machine type" }[kind];
          log(id, `Changed ${label} after Gate 4 → re-opened Gate ${n}`, { field: label, oldValue, newValue: kind === "price" ? inr(Number(value)) : kind === "goLiveDate" ? fmtDate(new Date(String(value)).toISOString()) : String(value) });
          notify([GATES[n].owner, "Legal"], `${g.client.name}: ${label} changed after Gate 4 — Gate ${n} re-opened, agreement locked`, id);
          return { ok: true, msg: `Gate ${n} re-opened — Legal is locked until ${GATES[n].owner} re-clears it` };
        },

        uploadDraft: (id, fileName) => {
          const g = guard(id, ["Legal"], [9, 10]);
          if (isRes(g)) return g;
          if (g.legalLocked) return { ok: false, msg: "Agreement is locked — a gate was re-opened after Gate 4." };
          if (!fileName) return { ok: false, msg: "Attach the draft file." };
          const v = g.agreements.length + 1;
          const stamp = `${inr(g.viability.proposed)}/machine/month${g.viability.brandingOffset ? ` · branding ${inr(g.viability.brandingOffset)}/month` : ""} · ${g.sites.reduce((a, s) => a + s.machinePoints, 0)} machines · go-live ${fmtDate(g.ops?.goLiveDate)}`;
          mutate(id, (d) => {
            d.agreements.push({ version: v, fileName, approvedTermsStamp: stamp, signed: false, uploadedAt: nowIso(), uploadedBy: me().name });
            if (d.currentStage === 9) { d.stageDone[9] = true; d.currentStage = 10; }
          });
          log(id, `Uploaded agreement draft v${v}`, { field: "agreement", newValue: fileName });
          notify(["BD"], `${g.client.name}: agreement draft v${v} ready to share with client`, id);
          return { ok: true, msg: `Draft v${v} uploaded and stamped with approved terms` };
        },

        closeComments: (id) => {
          const g = guard(id, ["Legal", "BD"], 10);
          if (isRes(g)) return g;
          if (g.legalLocked) return { ok: false, msg: "Agreement is locked — a gate was re-opened after Gate 4." };
          mutate(id, (d) => { d.stageDone[10] = true; d.currentStage = 11; });
          log(id, "Closed client comments", { field: "stage", oldValue: "10", newValue: "11" });
          return { ok: true, msg: "Client comments closed → Stage 11" };
        },

        uploadSigned: (id, fileName) => {
          const g = guard(id, ["Legal"], 11);
          if (isRes(g)) return g;
          if (g.legalLocked) return { ok: false, msg: "Agreement is locked — a gate was re-opened after Gate 4." };
          if (!fileName) return { ok: false, msg: "Attach the signed agreement." };
          mutate(id, (d) => {
            const last = d.agreements.at(-1);
            d.agreements.push({ version: (last?.version ?? 0) + 1, fileName, approvedTermsStamp: last?.approvedTermsStamp ?? "", signed: true, uploadedAt: nowIso(), uploadedBy: me().name });
            d.stageDone[11] = true;
            d.currentStage = 12;
            d.status = "In mobilisation";
          });
          log(id, "Uploaded signed agreement", { field: "status", oldValue: "Open", newValue: "In mobilisation" });
          notify(["Mobilisation", "Operations", "Finance"], `${g.client.name}: agreement signed — start deployment`, id);
          return { ok: true, msg: "Agreement signed → deal is Won, deployment begins" };
        },

        toggleDeploy: (id, siteId, key) => {
          const g = guard(id, ["Mobilisation"], 12);
          if (isRes(g)) return g;
          let started = false;
          mutate(id, (d) => {
            const s = d.sites.find((x) => x.id === siteId);
            if (s) s.deployment[key] = !s.deployment[key];
            if (allSitesDeployed(d)) {
              d.stageDone[12] = true;
              d.currentStage = 13;
              d.hypercareStart = nowIso();
              started = true;
            }
          });
          const s = find(id)!.sites.find((x) => x.id === siteId)!;
          log(id, `Deployment · ${s.name}: ${key} ${s.deployment[key] ? "done" : "un-ticked"}`);
          if (started) {
            log(id, "All sites live — 30-day hypercare started", { field: "stage", oldValue: "12", newValue: "13" });
            notify(["Operations", "BD"], `${g.client.name}: all machines live, hypercare day 1 of 30`, id);
            return { ok: true, msg: "All sites live → hypercare day 1 of 30" };
          }
          return { ok: true };
        },

        addHypercareLog: (id, issue, fix, clientCheckIn) => {
          const g = guard(id, ["Mobilisation"], 13);
          if (isRes(g)) return g;
          if (!issue.trim() && !clientCheckIn) return { ok: false, msg: "Log an issue or a client check-in." };
          const day = Math.min(30, hypercareDay(g, get().now()));
          mutate(id, (d) => d.hypercare.unshift({ id: uid("h"), day, issue: issue || "No issues", fix, clientCheckIn, by: me().name, at: nowIso() }));
          log(id, `Hypercare day ${day} logged`);
          return { ok: true, msg: `Day ${day} logged` };
        },

        completeHypercare: (id) => {
          const g = guard(id, ["Mobilisation"], 13);
          if (isRes(g)) return g;
          if (hypercareDay(g, get().now()) <= 30) return { ok: false, msg: "Hypercare runs for 30 days — not finished yet." };
          mutate(id, (d) => { d.stageDone[13] = true; d.currentStage = 14; });
          log(id, "Hypercare complete — 30 days stable", { field: "stage", oldValue: "13", newValue: "14" });
          notify(["Operations", "Finance"], `${g.client.name}: ready for handover — please sign`, id);
          return { ok: true, msg: "Hypercare complete → handover" };
        },

        signHandover: (id) => {
          const role = get().role;
          const g = guard(id, ["Mobilisation", "Operations", "Finance"], 14);
          if (isRes(g)) return g;
          const r = role as "Mobilisation" | "Operations" | "Finance";
          if (g.handover[r]) return { ok: false, msg: "Already signed." };
          mutate(id, (d) => {
            d.handover[r] = { by: me().name, at: nowIso() };
            if (isLive(d)) d.status = "Live";
          });
          const live = find(id)!.status === "Live";
          log(id, `${role} signed handover`, live ? { field: "status", oldValue: "In mobilisation", newValue: "Live" } : {});
          if (live) notify(["BD", "Operations", "Finance", "Mobilisation", "Leadership"], `${g.client.name} is LIVE 🎉`, id);
          return { ok: true, msg: live ? "All three signed — deal is LIVE" : `${role} signed — waiting for the others` };
        },

        addComment: (id, text) => {
          const { role, name } = me();
          mutate(id, (d) => d.comments.push({ id: uid("cm"), by: name, role, text, at: nowIso() }));
          const mentioned = ROLES.filter((r) => {
            const first = PERSONAS[r].name.split(" ")[0];
            return new RegExp(`@(${r}|${first})\\b`, "i").test(text);
          });
          const d = find(id)!;
          if (mentioned.length) notify(mentioned, `${name} mentioned you on ${d.client.name}: “${text.slice(0, 80)}”`, id);
          log(id, "Commented");
        },

        addDocument: (id, name, kind) => {
          mutate(id, (d) => d.documents.push({ id: uid("doc"), name, kind, by: me().name, at: nowIso() }));
          log(id, `Uploaded ${kind}`, { newValue: name });
        },

        markRead: () => set((s) => ({ notifications: s.notifications.map((n) => (n.toRole === s.role ? { ...n, read: true } : n)) })),
      };
    },
    {
      name: "vwin-demo-v2",
      partialize: (s) => ({ role: s.role, level: s.level, dayOffset: s.dayOffset, deals: s.deals, activity: s.activity, notifications: s.notifications }),
    },
  ),
);

export const stageName = (n: number) => STAGES[Math.min(Math.max(n, 1), 14) - 1].name;
