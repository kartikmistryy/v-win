"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, Building2, MapPin, ShieldAlert, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { GATES } from "@/lib/masters";
import { canReopenGate, canReviewGate, deriveTemperature, totalMachines } from "@/lib/rules";
import { answerLabel, SIZING } from "@/lib/sizing";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { GateNo } from "@/lib/types";
import StageRail from "@/components/StageRail";
import StageActions from "@/components/StageActions";
import GatePanel from "@/components/GatePanel";
import DealTabs from "@/components/DealTabs";
import { Empty, GateDiamond, showResult, StatusPill, TempChip } from "@/components/ui";
import type { Deal, Gate } from "@/lib/types";

export default function DealPage() {
  return (
    <Suspense fallback={null}>
      <DealRoom />
    </Suspense>
  );
}

function DealRoom() {
  const id = useSearchParams().get("id") ?? "";
  const d = useStore((s) => s.deals.find((x) => x.id === id));
  const role = useStore((s) => s.role);
  const [panel, setPanel] = useState<{ n: GateNo; mode: "decide" | "override" } | null>(null);

  if (!d)
    return (
      <Empty>
        Deal “{id}” not found.{" "}
        <Link href="/pipeline/" className="font-bold text-brand-deep underline">
          Back to pipeline
        </Link>
      </Empty>
    );

  const temp = deriveTemperature(d);
  return (
    <div className="space-y-4" key={d.id}>
      <Link href="/pipeline/" className="inline-flex items-center gap-1 text-sm font-bold text-charcoal/60 hover:text-brand-deep">
        <ArrowLeft size={16} /> Pipeline
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black md:text-3xl" data-testid="deal-title">
              {d.client.name}
            </h1>
            <TempChip t={temp} />
            <StatusPill s={d.status} />
            {d.intake?.status === "pending" && <span className="chip bg-blue-50 text-blue-700">Client lead · pending review</span>}
            {d.gates.some((g) => g.override) && (
              <span className="chip bg-purple-100 text-purple-700">
                <ShieldAlert size={11} /> Override
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal/60">
            <span className="font-bold text-charcoal" data-testid="deal-id">
              {d.id}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {d.city} · {d.zone}
            </span>
            <span className="flex items-center gap-1">
              <Building2 size={14} /> {d.channel} › {d.subChannel} · {d.client.customerType}
            </span>
            <span className="flex items-center gap-1">
              <User size={14} /> {d.ownerName}
            </span>
            <span>{totalMachines(d)} machines</span>
            <span>Created {fmtDate(d.createdAt)}</span>
          </div>
        </div>
      </header>

      <StageRail d={d} />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <StageActions d={d} openGate={(n, mode) => setPanel({ n, mode })} />
          <DealTabs d={d} />
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-charcoal/50">Decision gates</h2>
          {d.gates.map((g) => {
            const meta = GATES[g.no];
            const canAct = g.state === "waiting" && d.status !== "Lost" && (role === meta.owner || (role === "Leadership" && g.no !== 4));
            return (
              <div key={g.no} className={`card p-3.5 ${g.state === "waiting" ? "border-brand/50" : ""}`} data-testid={`gate-card-${g.no}`}>
                <div className="flex items-center gap-2">
                  <GateDiamond g={g} showNo size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black">
                      Gate {g.no} · {meta.name}
                    </div>
                    <div className="text-xs text-charcoal/50">Owner: {meta.owner === "BD" ? "Business Development" : meta.owner}</div>
                  </div>
                  <span
                    className={`chip ${
                      g.state === "cleared" ? "bg-green-100 text-cleared" : g.state === "rejected" ? "bg-red-100 text-rejected" : g.state === "waiting" ? "bg-peach text-brand-deep" : "bg-surface text-charcoal/50"
                    }`}
                  >
                    {g.outcome === "hold" ? "On hold" : g.outcome === "accept" ? "Accepted" : g.state === "not_reached" ? "Not reached" : g.state[0].toUpperCase() + g.state.slice(1)}
                  </span>
                </div>
                {g.decidedAt && (
                  <div className="mt-2 rounded-lg bg-surface px-2.5 py-2 text-xs">
                    <div>
                      <b>{g.decidedBy}</b>
                      {g.decidedLevel === "Junior" && <span className="text-charcoal/50"> (Junior)</span>} · {fmtDateTime(g.decidedAt)}
                    </div>
                    {g.reasonCode && <div className="text-charcoal/70">Reason: {g.reasonCode}</div>}
                    {g.comment && <div className="text-charcoal/70">“{g.comment}”</div>}
                    {g.override && <div className="mt-1 font-bold text-purple-700">⚑ Leadership override</div>}
                    {g.reopened && <div className="mt-1 font-bold text-amber-700">Re-opened after a change post Gate 4</div>}
                    {g.reviewedBy && (
                      <div className="mt-1 font-bold text-cleared">
                        ✓ Reviewed by {g.reviewedBy} · {fmtDateTime(g.reviewedAt)}
                      </div>
                    )}
                  </div>
                )}
                {g.reopened && !g.decidedAt && (
                  <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-800">Re-opened{g.comment ? ` — “${g.comment}”` : ""}</div>
                )}
                <GateReview d={d} g={g} />
                {canAct && (
                  <button
                    className={`mt-2 w-full ${role === "Leadership" ? "btn border border-purple-300 bg-purple-50 text-purple-800" : "btn-primary"}`}
                    onClick={() => setPanel({ n: g.no, mode: role === "Leadership" ? "override" : "decide" })}
                    data-testid={`gate-btn-${g.no}`}
                  >
                    {role === "Leadership" ? "Override…" : g.no === 4 ? "Record decision" : "Clear / Reject"}
                  </button>
                )}
              </div>
            );
          })}
          {d.sizing && <SizingCard d={d} />}
          <div className="card p-3.5 text-sm">
            <div className="mb-1 text-xs font-black uppercase tracking-wide text-charcoal/50">Client contacts</div>
            {d.client.contacts.map((c) => (
              <div key={c.id} className="py-1">
                {c.tier && <div className="text-[11px] font-bold uppercase tracking-wide text-brand-deep">{c.tier}{c.city ? ` · ${c.city}` : ""}</div>}
                <b>{c.name}</b> <span className="text-charcoal/50">· {c.role}</span>
                <div className="text-xs text-charcoal/60">
                  {c.phone} · {c.email}
                </div>
              </div>
            ))}
            <div className="mt-1 text-xs text-charcoal/50">GST {d.client.gst}</div>
            {d.locations && <div className="text-xs text-charcoal/50">Locations: {d.locations.join(", ")}</div>}
          </div>
        </aside>
      </div>

      {panel && <GatePanel d={d} n={panel.n} mode={panel.mode} onClose={() => setPanel(null)} />}
    </div>
  );
}

/** Senior of the gate's function can endorse or re-open a Junior's decision. */
function GateReview({ d, g }: { d: Deal; g: Gate }) {
  const { role, level, reviewGate } = useStore();
  const [reopening, setReopening] = useState(false);
  const [note, setNote] = useState("");
  if (level !== "Senior" || role !== GATES[g.no].owner || !canReviewGate(d, g.no)) return null;
  const canReopen = canReopenGate(d, g.no);
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-dashed border-brand/40 p-2.5" data-testid={`review-${g.no}`}>
      <div className="text-xs font-bold text-brand-deep">Senior review · decided by a Junior</div>
      {reopening ? (
        <>
          <textarea className="input min-h-14 text-xs" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why are you re-opening it? (required)" />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 py-1.5" onClick={() => setReopening(false)}>
              Cancel
            </button>
            <button className="btn flex-1 bg-amber-500 py-1.5 text-white" onClick={() => showResult(reviewGate(d.id, g.no, "reopen", note)) && setReopening(false)}>
              Re-open gate
            </button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <button className="btn-green flex-1 py-1.5" onClick={() => showResult(reviewGate(d.id, g.no, "endorse", ""))}>
            Endorse
          </button>
          {canReopen && (
            <button className="btn-ghost flex-1 py-1.5" onClick={() => setReopening(true)}>
              Re-open…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SizingCard({ d }: { d: Deal }) {
  const z = d.sizing!;
  return (
    <div className="card p-3.5 text-sm">
      <div className="mb-2 text-xs font-black uppercase tracking-wide text-charcoal/50">Client footfall estimate</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-peach-soft p-2">
          <div className="text-xs text-charcoal/60">Daily</div>
          <div className="text-lg font-black">{z.daily.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-lg bg-peach-soft p-2">
          <div className="text-xs text-charcoal/60">Monthly</div>
          <div className="text-lg font-black">{z.monthly.toLocaleString("en-IN")}</div>
        </div>
      </div>
      {z.edited && (
        <div className="mt-1.5 text-xs font-bold text-amber-700">
          Edited by client · our estimate was {z.dailyCalc.toLocaleString("en-IN")}/day, {z.monthlyCalc.toLocaleString("en-IN")}/month
        </div>
      )}
      <dl className="mt-2 space-y-0.5 text-xs">
        {(SIZING[d.subChannel]?.fields ?? []).map((f) => (
          <div key={f.key} className="flex justify-between gap-2">
            <dt className="text-charcoal/60">{f.label}</dt>
            <dd className="font-bold">{f.key in z.values ? answerLabel(d.subChannel, f.key, z.values[f.key]) : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
