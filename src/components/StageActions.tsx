"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileText, Hourglass, Lock, PartyPopper, Plus, Trash2 } from "lucide-react";
import { stageName, useStore } from "@/lib/store";
import { DEPLOY_ITEMS, GATES, MACHINE_TYPES, PERSONAS, PRODUCTS, STAGES } from "@/lib/masters";
import { allSitesDeployed, brandingAllowed, gate, gate1Block, holdDue, hypercareDay, procurementOverdue, siteDeployed, viabilityGap } from "@/lib/rules";
import { addWorkingDays, fmtDate, fmtDateTime, inr, toInputDate, uid } from "@/lib/format";
import type { Deal, GateNo, MachineType, ProductLine, Role } from "@/lib/types";
import { Field, FilePick, GateDiamond, showResult } from "./ui";

/** The "what happens now" panel for the current stage. Actions show only to the owning role. */
export default function StageActions({ d, openGate }: { d: Deal; openGate: (n: GateNo, mode: "decide" | "override") => void }) {
  const role = useStore((s) => s.role);
  const s = d.currentStage;
  const meta = STAGES[s - 1];

  if (d.status === "Live")
    return (
      <Panel tone="green" title="Live 🎉">
        <div className="flex items-center gap-3">
          <PartyPopper className="text-cleared" />
          <p className="text-sm">All three handover signatures are in. The account now belongs to Operations; this deal record is read-only.</p>
        </div>
        <Confetti />
      </Panel>
    );
  if (d.status === "Lost")
    return (
      <Panel tone="red" title="Lost — client rejected the offer">
        <p className="text-sm">
          Reason: <b>{gate(d, 4).reasonCode}</b> — {gate(d, 4).comment}. The deal is read-only; only a Zone Head can re-open it from Stage 3.
        </p>
      </Panel>
    );

  const title = s === 6 ? "Stages 6 & 7 · Ops and Tech readiness (in parallel)" : `Stage ${s} · ${meta.name}`;
  return (
    <Panel title={title} sub={s === 6 ? "Owners: Operations (Gate 2), Technology (Gate 3)" : `Owner: ${meta.owner} · Exit: ${meta.exit}`}>
      {s === 1 && <Stage1 d={d} role={role} />}
      {s === 2 && <Stage2 d={d} role={role} />}
      {s === 3 && <Stage3 d={d} role={role} />}
      {s === 4 && <GateStage d={d} n={1} role={role} openGate={openGate} />}
      {s === 5 && <Stage5 d={d} role={role} />}
      {s === 6 && (
        <div className="grid gap-3 md:grid-cols-2">
          <GateStage d={d} n={2} role={role} openGate={openGate} />
          <GateStage d={d} n={3} role={role} openGate={openGate} />
        </div>
      )}
      {s === 8 && <GateStage d={d} n={4} role={role} openGate={openGate} />}
      {s >= 9 && s <= 11 && <LegalStages d={d} role={role} />}
      {s === 12 && <Deployment d={d} role={role} />}
      {s === 13 && <Hypercare d={d} role={role} />}
      {s === 14 && <Handover d={d} role={role} />}
    </Panel>
  );
}

function Panel({ title, sub, children, tone }: { title: string; sub?: string; children: React.ReactNode; tone?: "green" | "red" }) {
  return (
    <section className={`card relative overflow-hidden p-4 md:p-5 ${tone === "green" ? "border-cleared/40 bg-green-50/40" : tone === "red" ? "border-rejected/30 bg-red-50/40" : "border-brand/30"}`} data-testid="stage-panel">
      <div className="mb-3">
        <div className="text-xs font-black uppercase tracking-wide text-brand-deep">Now</div>
        <h2 className="text-lg font-black">{title}</h2>
        {sub && <div className="text-xs text-charcoal/60">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

function Waiting({ who, children }: { who: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface p-3 text-sm">
      <Hourglass size={18} className="mt-0.5 shrink-0 text-brand" />
      <div>
        Waiting on <b>{who}</b>. {children}
        <div className="mt-1 text-xs text-charcoal/50">Switch role (top-right) to act as {who}.</div>
      </div>
    </div>
  );
}

/* ---------- Stage 1 ---------- */
function Stage1({ d, role }: { d: Deal; role: Role }) {
  const completeProfile = useStore((s) => s.completeProfile);
  if (role !== "BD") return <Waiting who="Business Development">The client profile is being completed.</Waiting>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-charcoal/70">
        Check the client, {d.client.contacts.length} contact(s) and {d.sites.length} site(s) in scope, then mark the profile complete.
      </p>
      <button className="btn-primary" onClick={() => showResult(completeProfile(d.id))}>
        <CheckCircle2 size={16} /> Profile complete → Stage 2
      </button>
    </div>
  );
}

/* ---------- Stage 2 ---------- */
function Stage2({ d, role }: { d: Deal; role: Role }) {
  const uploadSurvey = useStore((s) => s.uploadSurvey);
  const [sites, setSites] = useState(d.sites);
  const [file, setFile] = useState("");
  if (role !== "BD") return <Waiting who="Business Development">Site survey in progress.</Waiting>;
  const upd = (id: string, p: Partial<Deal["sites"][number]>) => setSites((ss) => ss.map((x) => (x.id === id ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-charcoal/70">Size every site: footfall, machine points and machine type. Then upload the site survey.</p>
      {sites.map((x) => (
        <div key={x.id} className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 self-center text-sm font-black md:col-span-1">{x.name}</div>
          <Field label="Footfall/day">
            <input type="number" className="input" value={x.footfall || ""} onChange={(e) => upd(x.id, { footfall: Number(e.target.value) })} />
          </Field>
          <Field label="Machine points">
            <input type="number" className="input" value={x.machinePoints || ""} onChange={(e) => upd(x.id, { machinePoints: Number(e.target.value) })} />
          </Field>
          <Field label="Type">
            <select className="input" value={x.machineType} onChange={(e) => upd(x.id, { machineType: e.target.value as MachineType })}>
              {MACHINE_TYPES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <FilePick onPick={setFile} label={file ? `📎 ${file}` : "Attach site survey"} />
        <button className="btn text-xs text-charcoal/50 underline" onClick={() => setFile(`${d.client.name.split(" ")[0]}_site_survey.pdf`)}>
          use sample file
        </button>
        <button className="btn-primary ml-auto" onClick={() => showResult(uploadSurvey(d.id, file, sites))} data-testid="upload-survey">
          Upload survey → Stage 3
        </button>
      </div>
    </div>
  );
}

/* ---------- Stage 3 ---------- */
function Stage3({ d, role }: { d: Deal; role: Role }) {
  const { submitProductMix, confirmLine, confirmProductMix, now: nowFn } = useStore();
  const now = nowFn();
  const overdue = procurementOverdue(d, now);
  const [lines, setLines] = useState<Record<string, ProductLine[]>>(() =>
    Object.fromEntries(d.sites.map((s) => [s.id, s.productLines.length ? s.productLines : PRODUCTS.slice(0, 3).map((p) => ({ id: uid("pl"), product: p, qty: 20 }))])),
  );
  const [proposed, setProposed] = useState(d.viability.proposed || 0);

  if (!d.productMixSubmittedAt) {
    if (role !== "BD") return <Waiting who="Business Development">BD is proposing the product mix for each site.</Waiting>;
    return (
      <div className="space-y-3">
        <p className="text-sm text-charcoal/70">Propose products for each site and the Service Charge. Procurement then has 1 working day to confirm availability and margin.</p>
        {d.sites.map((s) => (
          <div key={s.id} className="rounded-xl bg-surface p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-black">
              {s.name}
              <button className="text-xs font-bold text-brand-deep" onClick={() => setLines({ ...lines, [s.id]: [...lines[s.id], { id: uid("pl"), product: PRODUCTS[lines[s.id].length % PRODUCTS.length], qty: 20 }] })}>
                <Plus size={12} className="inline" /> Add product
              </button>
            </div>
            <div className="space-y-1.5">
              {lines[s.id].map((l) => (
                <div key={l.id} className="flex gap-2">
                  <select className="input" value={l.product} onChange={(e) => setLines({ ...lines, [s.id]: lines[s.id].map((x) => (x.id === l.id ? { ...x, product: e.target.value } : x)) })}>
                    {PRODUCTS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <input type="number" className="input w-24" value={l.qty} onChange={(e) => setLines({ ...lines, [s.id]: lines[s.id].map((x) => (x.id === l.id ? { ...x, qty: Number(e.target.value) } : x)) })} aria-label="Quantity" />
                  <button aria-label="Remove" className="px-1 text-charcoal/40 hover:text-rejected" onClick={() => setLines({ ...lines, [s.id]: lines[s.id].filter((x) => x.id !== l.id) })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Proposed Service Charge (₹/machine/month)">
            <input type="number" className="input w-56" value={proposed || ""} onChange={(e) => setProposed(Number(e.target.value))} data-testid="proposed" />
          </Field>
          <button className="btn-primary ml-auto" onClick={() => showResult(submitProductMix(d.id, lines, proposed))} data-testid="submit-mix">
            Submit to Procurement
          </button>
        </div>
      </div>
    );
  }

  const due = addWorkingDays(d.productMixSubmittedAt, 1);
  const banner = (
    <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${overdue ? "bg-red-50 text-rejected" : "bg-surface"}`}>
      {overdue ? <AlertTriangle size={16} /> : <Clock size={16} className="text-brand" />}
      Submitted {fmtDateTime(d.productMixSubmittedAt)} · due {fmtDateTime(due)}
      {overdue && <b className="ml-auto">OVERDUE — escalated to Procurement head</b>}
    </div>
  );
  if (role !== "Procurement")
    return (
      <div className="space-y-3">
        {banner}
        <Waiting who="Procurement">Confirm availability and margin for each product line.</Waiting>
      </div>
    );
  return (
    <div className="space-y-3">
      {banner}
      {d.sites.map((s) => (
        <div key={s.id} className="rounded-xl bg-surface p-3">
          <div className="mb-2 text-sm font-black">{s.name}</div>
          <div className="space-y-1.5">
            {s.productLines.map((l) => (
              <ProcLine key={l.id} l={l} onSave={(a, m) => confirmLine(d.id, s.id, l.id, a, m)} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => showResult(confirmProductMix(d.id))} data-testid="confirm-mix">
          Confirm product mix → Gate 1
        </button>
      </div>
    </div>
  );
}

function ProcLine({ l, onSave }: { l: ProductLine; onSave: (available: boolean, margin: number) => void }) {
  const [margin, setMargin] = useState(l.marginPct ?? 20);
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="proc-line">
      <span className="min-w-40 flex-1 font-bold">
        {l.product} <span className="font-normal text-charcoal/50">× {l.qty}</span>
      </span>
      <input type="number" className="input w-20 py-1" value={margin} onChange={(e) => setMargin(Number(e.target.value))} aria-label="Margin %" />
      <span className="text-xs text-charcoal/50">% margin</span>
      <button className={`chip px-3 py-1 ${l.available === true ? "bg-cleared text-white" : "bg-white ring-1 ring-line"}`} onClick={() => onSave(true, margin)}>
        Available
      </button>
      <button className={`chip px-3 py-1 ${l.available === false ? "bg-rejected text-white" : "bg-white ring-1 ring-line"}`} onClick={() => onSave(false, margin)}>
        Not available
      </button>
    </div>
  );
}

/* ---------- Gate stages (4, 6–7, 8) ---------- */
function GateStage({ d, n, role, openGate }: { d: Deal; n: GateNo; role: Role; openGate: (n: GateNo, m: "decide" | "override") => void }) {
  const g = gate(d, n);
  const meta = GATES[n];
  const now = useStore((s) => s.now)();
  const ownerLabel = meta.owner === "BD" ? "Business Development" : meta.owner;
  return (
    <div className="space-y-3 rounded-xl border border-line p-3">
      <div className="flex items-center gap-2">
        <GateDiamond g={g} showNo size={18} />
        <div className="font-black">
          Gate {n} · {meta.name}
        </div>
        <span className="ml-auto text-xs font-bold text-charcoal/50">{g.state === "cleared" ? "Cleared ✓" : g.outcome === "hold" ? "On hold" : g.state.replace("_", " ")}</span>
      </div>
      <p className="text-sm text-charcoal/70">{meta.question}</p>
      {n === 1 && d.viability.proposed > 0 && <p className="text-xs text-charcoal/60">BD proposed {inr(d.viability.proposed)}/machine/month.</p>}
      {n === 4 && d.status === "On hold" && (
        <div className={`rounded-lg p-2.5 text-sm ${holdDue(d, now) ? "bg-red-50 text-rejected" : "bg-amber-50 text-amber-900"}`}>
          On hold — {g.reasonCode}: “{g.comment}”. Follow up on <b>{fmtDate(g.followUpDate)}</b>
          {holdDue(d, now) && " — due now"}.
        </div>
      )}
      {g.state === "waiting" && role === meta.owner && (
        <button className="btn-primary w-full" onClick={() => openGate(n, "decide")} data-testid={`open-gate-${n}`}>
          {n === 4 ? (d.status === "On hold" ? "Record client decision again" : "Record client decision") : `Review & decide Gate ${n}`}
        </button>
      )}
      {g.state === "waiting" && role !== meta.owner && role !== "Leadership" && <Waiting who={ownerLabel} />}
      {g.state === "waiting" && role === "Leadership" && n !== 4 && (
        <button className="btn w-full border border-purple-300 bg-purple-50 text-purple-800 hover:bg-purple-100" onClick={() => openGate(n, "override")}>
          Leadership override…
        </button>
      )}
    </div>
  );
}

/* ---------- Stage 5 ---------- */
function Stage5({ d, role }: { d: Deal; role: Role }) {
  const { certifyOffer, confirmBranding } = useStore();
  const [note, setNote] = useState("Wrap on 2 machines + 1 standee");
  const gap = viabilityGap(d.viability);
  const block = gate1Block(d);
  const needBranding = brandingAllowed(d);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm md:grid-cols-3">
        <Stat label="Service Charge" value={`${inr(d.viability.proposed)}/machine/mo`} />
        <Stat label="Branding offset" value={d.viability.brandingOffset ? `${inr(d.viability.brandingOffset)}/mo` : "—"} />
        <Stat label="Viability gap" value={`${gap >= 0 ? "+" : ""}${inr(gap)}`} tone={gap >= 0 ? "green" : "red"} />
      </div>
      {needBranding && (
        <div className="rounded-xl border border-line p-3 text-sm">
          <div className="mb-2 font-black">Branding {d.brandingConfirmed ? <span className="chip bg-green-100 text-cleared">Confirmed</span> : <span className="chip bg-peach text-brand-deep">Needed</span>}</div>
          {!d.brandingConfirmed && role === "Branding" && (
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn-primary" onClick={() => showResult(confirmBranding(d.id, note))}>
                Confirm branding scope
              </button>
            </div>
          )}
          {!d.brandingConfirmed && role !== "Branding" && <Waiting who="Branding">Confirm branding scope and value for sites that allow branding.</Waiting>}
        </div>
      )}
      {role === "BD" ? (
        <div className="flex flex-wrap items-center gap-2">
          {block && <span className="text-sm font-bold text-rejected">⛔ Offer blocked: {block}</span>}
          <button className="btn-primary ml-auto" onClick={() => showResult(certifyOffer(d.id))} data-testid="certify">
            Certified offer ready → Gates 2 & 3
          </button>
        </div>
      ) : (
        role !== "Branding" && <Waiting who="Business Development">BD builds the offer within the certified floor.</Waiting>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="label">{label}</div>
      <div className={`text-lg font-black ${tone === "green" ? "text-cleared" : tone === "red" ? "text-rejected" : ""}`}>{value}</div>
    </div>
  );
}

/* ---------- Stages 9–11 ---------- */
function LegalStages({ d, role }: { d: Deal; role: Role }) {
  const { uploadDraft, closeComments, uploadSigned } = useStore();
  const [file, setFile] = useState("");
  const s = d.currentStage;
  const sample = `${d.client.name.split(" ")[0]}_Agreement_${s === 11 ? "signed" : `v${d.agreements.length + 1}`}.pdf`;
  const reopened = d.gates.filter((g) => g.reopened);
  return (
    <div className="space-y-3">
      {d.legalLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert" data-testid="legal-locked">
          <Lock size={18} className="mt-0.5 shrink-0" />
          <div>
            <b>Agreement locked.</b> Terms changed after Gate 4, so {reopened.map((g) => `Gate ${g.no} (${GATES[g.no].owner})`).join(", ")} re-opened. Legal can update the agreement once it is re-cleared.
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-sm">
        {d.agreements.map((a) => (
          <span key={a.version} className={`chip px-2.5 py-1 ${a.signed ? "bg-green-100 text-cleared" : "bg-surface ring-1 ring-line"}`}>
            <FileText size={12} /> v{a.version} {a.signed && "· signed"}
          </span>
        ))}
      </div>
      {!d.legalLocked && role === "Legal" && (
        <div className="flex flex-wrap items-center gap-2">
          <FilePick onPick={setFile} label={file ? `📎 ${file}` : s === 11 ? "Attach signed copy" : "Attach draft"} />
          <button className="btn text-xs text-charcoal/50 underline" onClick={() => setFile(sample)}>
            use sample file
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            {(s === 9 || s === 10) && (
              <button className={s === 9 ? "btn-primary" : "btn-ghost"} onClick={() => showResult(uploadDraft(d.id, file)) && setFile("")} data-testid="upload-draft">
                Upload draft {s === 9 ? "→ Stage 10" : `v${d.agreements.length + 1}`}
              </button>
            )}
            {s === 10 && (
              <button className="btn-primary" onClick={() => showResult(closeComments(d.id))} data-testid="close-comments">
                Client comments closed → Stage 11
              </button>
            )}
            {s === 11 && (
              <button className="btn-green" onClick={() => showResult(uploadSigned(d.id, file))} data-testid="upload-signed">
                Upload signed agreement
              </button>
            )}
          </div>
        </div>
      )}
      {!d.legalLocked && role === "BD" && s === 10 && (
        <button className="btn-ghost" onClick={() => showResult(closeComments(d.id))}>
          Client comments closed → Stage 11
        </button>
      )}
      {!d.legalLocked && role !== "Legal" && <Waiting who="Legal">Legal drafts only from the approved terms (stamped on every draft).</Waiting>}
      <ChangeTerms d={d} role={role} />
    </div>
  );
}

/** BR-10 — change after Gate 4 re-opens the affected gate. */
function ChangeTerms({ d, role }: { d: Deal; role: Role }) {
  const change = useStore((s) => s.changeAfterGate4);
  const [price, setPrice] = useState(d.viability.proposed);
  const [date, setDate] = useState(toInputDate(d.ops?.goLiveDate));
  const [site, setSite] = useState(d.sites[0]?.id);
  const [mt, setMt] = useState<MachineType>(d.sites[0]?.machineType ?? "TCN");
  if (!["BD", "Operations", "Technology"].includes(role)) return null;
  return (
    <details className="rounded-xl border border-dashed border-line p-3 text-sm">
      <summary className="cursor-pointer font-bold text-charcoal/70">Change terms after Gate 4 (re-opens a gate)</summary>
      <div className="mt-3 space-y-2">
        {role === "BD" && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="New Service Charge (₹)">
              <input type="number" className="input w-40" value={price} onChange={(e) => setPrice(Number(e.target.value))} data-testid="new-price" />
            </Field>
            <button className="btn-ghost" onClick={() => showResult(change(d.id, "price", price))} data-testid="change-price">
              Change price → re-opens Gate 1
            </button>
          </div>
        )}
        {(role === "BD" || role === "Operations") && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="New go-live date">
              <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <button className="btn-ghost" onClick={() => showResult(change(d.id, "goLiveDate", date))}>
              Change date → re-opens Gate 2
            </button>
          </div>
        )}
        {(role === "BD" || role === "Technology") && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Site">
              <select className="input w-44" value={site} onChange={(e) => setSite(e.target.value)}>
                {d.sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Machine type">
              <select className="input w-28" value={mt} onChange={(e) => setMt(e.target.value as MachineType)}>
                {MACHINE_TYPES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <button className="btn-ghost" onClick={() => showResult(change(d.id, "machines", mt, site))}>
              Change machine → re-opens Gate 3
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

/* ---------- Stage 12 ---------- */
function Deployment({ d, role }: { d: Deal; role: Role }) {
  const toggle = useStore((s) => s.toggleDeploy);
  const can = role === "Mobilisation";
  return (
    <div className="space-y-3">
      {d.sites.map((s) => (
        <div key={s.id} className="rounded-xl bg-surface p-3" data-testid="deploy-site">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black">{s.name}</span>
            {siteDeployed(s) ? <span className="chip bg-green-100 text-cleared">Site live</span> : <span className="text-xs text-charcoal/50">{Object.values(s.deployment).filter(Boolean).length}/4</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {DEPLOY_ITEMS.map((it) => (
              <label key={it.key} className={`flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-line ${can ? "cursor-pointer" : ""}`}>
                <input type="checkbox" className="h-4 w-4 accent-cleared" checked={s.deployment[it.key]} disabled={!can} onChange={() => showResult(toggle(d.id, s.id, it.key))} />
                {it.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      {!can && !allSitesDeployed(d) && <Waiting who="Mobilisation">Install, configure and stock machines as per planogram.</Waiting>}
    </div>
  );
}

/* ---------- Stage 13 ---------- */
function Hypercare({ d, role }: { d: Deal; role: Role }) {
  const { addHypercareLog, completeHypercare, now: nowFn } = useStore();
  const day = hypercareDay(d, nowFn());
  const [issue, setIssue] = useState("");
  const [fix, setFix] = useState("");
  const [ci, setCi] = useState(true);
  const pct = Math.min(100, (Math.min(day, 30) / 30) * 100);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0" data-testid="hypercare-ring">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ECE9E4" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={day > 30 ? "#2E7D32" : "#E97132"} strokeWidth="3" strokeDasharray={`${pct} 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black">{Math.min(day, 30)}</span>
            <span className="text-[10px] font-bold text-charcoal/50">of 30 days</span>
          </div>
        </div>
        <div className="text-sm text-charcoal/70">
          Started {fmtDate(d.hypercareStart)}. Daily monitoring, fixes and client check-ins.
          {day >= 25 && day <= 30 && <div className="mt-1 font-bold text-brand-deep">Day 25+ — prepare the handover with Operations.</div>}
          {day > 30 && <div className="mt-1 font-bold text-cleared">30 days complete.</div>}
        </div>
      </div>
      {role === "Mobilisation" ? (
        <>
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
            <input className="input" placeholder="Issue today (or leave blank)" value={issue} onChange={(e) => setIssue(e.target.value)} />
            <input className="input" placeholder="Fix" value={fix} onChange={(e) => setFix(e.target.value)} />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="accent-brand" checked={ci} onChange={(e) => setCi(e.target.checked)} /> Client check-in
            </label>
            <button
              className="btn-ghost"
              onClick={() => {
                if (showResult(addHypercareLog(d.id, issue, fix, ci))) {
                  setIssue("");
                  setFix("");
                }
              }}
            >
              Log day {Math.min(day, 30)}
            </button>
          </div>
          <button className="btn-primary" onClick={() => showResult(completeHypercare(d.id))} data-testid="complete-hypercare">
            Hypercare complete → Handover
          </button>
          {day <= 30 && <p className="text-xs text-charcoal/50">Use Demo → +7 / +30 days to fast-forward the clock.</p>}
        </>
      ) : (
        <Waiting who="Mobilisation" />
      )}
    </div>
  );
}

/* ---------- Stage 14 ---------- */
function Handover({ d, role }: { d: Deal; role: Role }) {
  const sign = useStore((s) => s.signHandover);
  const who = ["Mobilisation", "Operations", "Finance"] as const;
  return (
    <div className="space-y-3">
      <p className="text-sm text-charcoal/70">Relationship, account and billing move to Operations and Finance. The deal goes Live only when all three sign.</p>
      <div className="grid gap-2 md:grid-cols-3" data-testid="handover">
        {who.map((r) => {
          const sig = d.handover[r];
          return (
            <div key={r} className={`rounded-xl p-3 ring-1 ${sig ? "bg-green-50 ring-cleared/40" : "bg-surface ring-line"}`}>
              <div className="label">{r}</div>
              {sig ? (
                <div className="text-sm">
                  <CheckCircle2 size={16} className="mr-1 inline text-cleared" />
                  <b>{sig.by}</b>
                  <div className="text-xs text-charcoal/50">{fmtDateTime(sig.at)}</div>
                </div>
              ) : role === r ? (
                <button className="btn-green w-full" onClick={() => showResult(sign(d.id))} data-testid={`sign-${r}`}>
                  Sign as {PERSONAS[r].name}
                </button>
              ) : (
                <div className="text-sm text-charcoal/50">Pending</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ["#E97132", "#C85A17", "#FDE7D6", "#2E7D32", "#2E2F31"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animation: `confetti ${2 + (i % 5) * 0.4}s ease-in ${(i % 7) * 0.15}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

export { stageName };
