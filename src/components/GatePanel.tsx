"use client";
import { useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { BRANDING_MIN_OFFSET, GATE_CHECKLIST, GATES, minServiceCharge, REASONS } from "@/lib/masters";
import { brandingAllowed, gate1Block, totalMachines, viabilityGap } from "@/lib/rules";
import { addDays, inr, toInputDate } from "@/lib/format";
import type { Deal, GateNo } from "@/lib/types";
import { Field, Modal, showResult } from "./ui";

type Decision = "clear" | "reject" | "accept" | "hold" | "override";

export default function GatePanel({ d, n, mode, onClose }: { d: Deal; n: GateNo; mode: "decide" | "override"; onClose: () => void }) {
  const decideGate = useStore((s) => s.decideGate);
  const now = useStore((s) => s.now)();
  const meta = GATES[n];
  const [decision, setDecision] = useState<Decision>(mode === "override" ? "override" : n === 4 ? "accept" : "clear");
  const [reasonCode, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [followUpDate, setFollowUp] = useState(toInputDate(addDays(now.toISOString(), 7)));
  const [checks, setChecks] = useState<boolean[]>(GATE_CHECKLIST[n].map(() => false));

  const [v, setV] = useState({
    minimum: d.viability.minimum || minServiceCharge(d.channel, d.client.customerType),
    proposed: d.viability.proposed,
    brandingOffset: d.viability.brandingOffset,
  });
  const [ops, setOps] = useState(d.ops ?? { route: "", manpower: 0, machines: totalMachines(d), goLiveDate: addDays(now.toISOString(), 21) });
  const [tech, setTech] = useState(d.tech ?? { configuration: d.sites.map((s) => `${s.machinePoints}× ${s.machineType}`).join(", "), telemetryOk: false, cashlessOk: false });

  const gap = viabilityGap(v);
  const block = n === 1 ? gate1Block(d, v) : null;

  const reasons =
    decision === "clear" ? REASONS.clear : decision === "reject" ? (n === 4 ? REASONS.reject4 : REASONS.reject) : decision === "accept" ? REASONS.accept : decision === "hold" ? REASONS.hold : REASONS.override;

  const submit = () => {
    const ok = showResult(
      decideGate(d.id, n, {
        decision,
        reasonCode,
        comment,
        followUpDate: decision === "hold" ? followUpDate : undefined,
        viability: n === 1 ? v : undefined,
        ops: n === 2 ? ops : undefined,
        tech: n === 3 ? tech : undefined,
      }),
    );
    if (ok) onClose();
  };

  const opts: { k: Decision; label: string; cls: string }[] =
    mode === "override"
      ? [{ k: "override", label: "Force clear", cls: "bg-purple-600 text-white" }]
      : n === 4
        ? [
            { k: "accept", label: "Accept", cls: "bg-cleared text-white" },
            { k: "hold", label: "Hold", cls: "bg-amber-500 text-white" },
            { k: "reject", label: "Reject", cls: "bg-rejected text-white" },
          ]
        : [
            { k: "clear", label: "Clear", cls: "bg-cleared text-white" },
            { k: "reject", label: "Reject", cls: "bg-rejected text-white" },
          ];

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={
        <span className="flex items-center gap-2">
          {mode === "override" && <ShieldAlert className="text-purple-600" size={20} />}
          Gate {n} · {meta.name}
        </span>
      }
    >
      <div className="space-y-5" data-testid="gate-panel">
        <div className="rounded-xl bg-peach-soft p-3 text-sm">
          <div className="font-black">{meta.question}</div>
          <div className="text-charcoal/60">
            {d.client.name} · {d.id} · owner: {meta.owner === "BD" ? "Business Development" : meta.owner}
          </div>
        </div>

        {mode === "override" && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
            Leadership override skips the gate owner. It is logged with your written reason, shown with an Override badge, and reported weekly.
          </div>
        )}

        {mode === "decide" && (
          <div>
            <div className="label">Checklist</div>
            <div className="space-y-1.5">
              {GATE_CHECKLIST[n].map((c, i) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-cleared" checked={checks[i]} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? e.target.checked : x)))} />
                  {c}
                </label>
              ))}
            </div>
          </div>
        )}

        {n === 1 && mode === "decide" && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Minimum Service Charge" hint={`${d.channel} × ${d.client.customerType}, ₹/machine/month`}>
                <input type="number" className="input" value={v.minimum} onChange={(e) => setV({ ...v, minimum: Number(e.target.value) })} data-testid="min-sc" />
              </Field>
              <Field label="Proposed (by BD)" hint="₹/machine/month">
                <input type="number" className="input bg-surface" value={v.proposed} readOnly />
              </Field>
              <Field label="Branding offset" hint={brandingAllowed(d) ? `Min ${inr(BRANDING_MIN_OFFSET)}/month` : "No site allows branding"}>
                <input
                  type="number"
                  className="input disabled:bg-surface"
                  disabled={!brandingAllowed(d)}
                  value={v.brandingOffset || ""}
                  placeholder="0"
                  onChange={(e) => setV({ ...v, brandingOffset: Number(e.target.value) })}
                  data-testid="offset"
                />
              </Field>
            </div>
            <div className={`flex items-center justify-between rounded-xl p-3 ${gap >= 0 ? "bg-green-50 text-cleared" : "bg-red-50 text-rejected"}`} data-testid="gap">
              <span className="text-sm font-bold">
                Viability gap = {inr(v.proposed)} + {inr(v.brandingOffset)} − {inr(v.minimum)}
              </span>
              <span className="text-xl font-black">{gap >= 0 ? "+" : ""}{inr(gap)}</span>
            </div>
            {block && decision === "clear" && <p className="text-sm font-bold text-rejected">⛔ {block}</p>}
          </div>
        )}

        {n === 2 && mode === "decide" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Refill route">
              <input className="input" value={ops.route} onChange={(e) => setOps({ ...ops, route: e.target.value })} placeholder="e.g. Route W-14" />
            </Field>
            <Field label="Manpower">
              <input type="number" className="input" value={ops.manpower || ""} onChange={(e) => setOps({ ...ops, manpower: Number(e.target.value) })} />
            </Field>
            <Field label="Machines reserved">
              <input type="number" className="input" value={ops.machines} onChange={(e) => setOps({ ...ops, machines: Number(e.target.value) })} />
            </Field>
            <Field label="Go-live date">
              <input type="date" className="input" value={toInputDate(ops.goLiveDate)} onChange={(e) => setOps({ ...ops, goLiveDate: new Date(e.target.value + "T09:00:00+05:30").toISOString() })} />
            </Field>
          </div>
        )}

        {n === 3 && mode === "decide" && (
          <div className="space-y-3">
            <Field label="Machine configuration">
              <input className="input" value={tech.configuration} onChange={(e) => setTech({ ...tech, configuration: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="h-4 w-4 accent-cleared" checked={tech.telemetryOk} onChange={(e) => setTech({ ...tech, telemetryOk: e.target.checked })} /> Telemetry ready
              </label>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" className="h-4 w-4 accent-cleared" checked={tech.cashlessOk} onChange={(e) => setTech({ ...tech, cashlessOk: e.target.checked })} /> Cashless ready
              </label>
            </div>
          </div>
        )}

        {n === 4 && (
          <div className="rounded-xl bg-surface p-3 text-sm">
            <div className="label">Certified offer</div>
            {inr(d.viability.proposed)}/machine/month{d.viability.brandingOffset ? ` + branding ${inr(d.viability.brandingOffset)}/month` : ""} · {totalMachines(d)} machines across {d.sites.length} site(s) · go-live {d.ops ? new Date(d.ops.goLiveDate).toDateString().slice(4) : "—"}
          </div>
        )}

        <div>
          <div className="label">Decision</div>
          <div className="flex gap-2">
            {opts.map((o) => (
              <button
                key={o.k}
                onClick={() => {
                  setDecision(o.k);
                  setReason("");
                }}
                className={`btn flex-1 border ${decision === o.k ? o.cls + " border-transparent" : "border-line bg-white text-charcoal"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Reason code *">
            <select className="input" value={reasonCode} onChange={(e) => setReason(e.target.value)} data-testid="reason">
              <option value="">Select…</option>
              {reasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          {decision === "hold" && (
            <Field label="Follow-up date *">
              <input type="date" className="input" value={followUpDate} onChange={(e) => setFollowUp(e.target.value)} />
            </Field>
          )}
        </div>
        <Field label={`Comment${decision === "reject" || decision === "hold" || decision === "override" ? " *" : ""}`}>
          <textarea className="input min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={decision === "override" ? "Written reason for overriding the gate owner" : "Visible to every function on the deal"} data-testid="comment" />
        </Field>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className={decision === "reject" ? "btn-red" : decision === "hold" ? "btn bg-amber-500 text-white" : decision === "override" ? "btn bg-purple-600 text-white" : "btn-green"}
            onClick={submit}
            data-testid="submit-decision"
          >
            {decision === "reject" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {decision === "clear" ? `Clear Gate ${n}` : decision === "reject" ? `Reject${n === 4 ? " (client said no)" : ` Gate ${n}`}` : decision === "accept" ? "Record Accept" : decision === "hold" ? "Put on hold" : "Force clear"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
