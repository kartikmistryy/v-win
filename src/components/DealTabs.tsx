"use client";
import { useMemo, useState } from "react";
import { FileText, Lock, Send, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { DEPLOY_ITEMS, PERSONAS, ROLES } from "@/lib/masters";
import { totalMachines, viabilityGap } from "@/lib/rules";
import { fmtDate, fmtDateTime, inr } from "@/lib/format";
import type { Deal } from "@/lib/types";
import { Avatar, Empty, FilePick, toast } from "./ui";

const TABS = ["Sites & products", "Commercials & readiness", "Agreement", "Mobilisation", "Documents", "Activity", "Comments"] as const;
type Tab = (typeof TABS)[number];

export default function DealTabs({ d }: { d: Deal }) {
  const [tab, setTab] = useState<Tab>("Activity");
  return (
    <section className="card overflow-hidden">
      <div className="no-scrollbar flex overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === t ? "border-brand text-brand-deep" : "border-transparent text-charcoal/60 hover:text-charcoal"}`}
          >
            {t}
            {t === "Comments" && d.comments.length > 0 && <span className="ml-1.5 chip bg-peach text-brand-deep">{d.comments.length}</span>}
          </button>
        ))}
      </div>
      <div className="p-4 md:p-5">
        {tab === "Sites & products" && <Sites d={d} />}
        {tab === "Commercials & readiness" && <Commercials d={d} />}
        {tab === "Agreement" && <Agreement d={d} />}
        {tab === "Mobilisation" && <Mobilisation d={d} />}
        {tab === "Documents" && <Documents d={d} />}
        {tab === "Activity" && <Activity d={d} />}
        {tab === "Comments" && <Comments d={d} />}
      </div>
    </section>
  );
}

function Sites({ d }: { d: Deal }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-charcoal/60">
        {d.sites.length} site(s) · {totalMachines(d)} machines
      </div>
      {d.sites.map((s) => (
        <div key={s.id} className="rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-black">{s.name}</div>
              <div className="text-xs text-charcoal/60">{s.address}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="chip bg-surface ring-1 ring-line">{s.machinePoints}× {s.machineType}</span>
              <span className="chip bg-surface ring-1 ring-line">{s.footfall.toLocaleString("en-IN")} footfall/day</span>
              {s.brandingAllowed && <span className="chip bg-peach text-brand-deep">Branding allowed</span>}
            </div>
          </div>
          {s.photos.length > 0 && (
            <div className="mt-2 flex gap-2">
              {s.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}
          {s.productLines.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-charcoal/50">
                  <th className="py-1 font-bold">Product</th>
                  <th className="font-bold">Qty</th>
                  <th className="font-bold">Available</th>
                  <th className="font-bold">Margin</th>
                </tr>
              </thead>
              <tbody>
                {s.productLines.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="py-1.5">{l.product}</td>
                    <td>{l.qty}</td>
                    <td>{l.available === undefined ? <span className="text-charcoal/40">pending</span> : l.available ? <span className="text-cleared">Yes</span> : <span className="text-rejected">No</span>}</td>
                    <td>{l.marginPct !== undefined ? `${l.marginPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-2 text-sm last:border-0">
      <span className="text-charcoal/60">{k}</span>
      <span className="text-right font-bold">{v}</span>
    </div>
  );
}

function Commercials({ d }: { d: Deal }) {
  const v = d.viability;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-line p-3">
        <div className="mb-1 font-black">Viability (Gate 1)</div>
        <Row k="Minimum Service Charge" v={v.minimum ? inr(v.minimum) : "—"} />
        <Row k="Proposed" v={v.proposed ? inr(v.proposed) : "—"} />
        <Row k="Branding offset" v={v.brandingOffset ? inr(v.brandingOffset) : "—"} />
        <Row k="Viability gap" v={v.minimum ? <span className={viabilityGap(v) >= 0 ? "text-cleared" : "text-rejected"}>{inr(viabilityGap(v))}</span> : "—"} />
      </div>
      <div className="rounded-xl border border-line p-3">
        <div className="mb-1 font-black">Ops readiness (Gate 2)</div>
        <Row k="Refill route" v={d.ops?.route ?? "—"} />
        <Row k="Manpower" v={d.ops?.manpower ?? "—"} />
        <Row k="Machines" v={d.ops?.machines ?? "—"} />
        <Row k="Go-live date" v={fmtDate(d.ops?.goLiveDate)} />
      </div>
      <div className="rounded-xl border border-line p-3">
        <div className="mb-1 font-black">Tech readiness (Gate 3)</div>
        <Row k="Configuration" v={d.tech?.configuration ?? "—"} />
        <Row k="Telemetry" v={d.tech ? (d.tech.telemetryOk ? "Ready" : "Not ready") : "—"} />
        <Row k="Cashless" v={d.tech ? (d.tech.cashlessOk ? "Ready" : "Not ready") : "—"} />
      </div>
    </div>
  );
}

function Agreement({ d }: { d: Deal }) {
  if (!d.agreements.length) return <Empty>No drafts yet. Legal can start only after Gate 4 = Accept.</Empty>;
  return (
    <div className="space-y-2">
      {d.legalLocked && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-900">
          <Lock size={14} /> Locked — a gate was re-opened after Gate 4.
        </div>
      )}
      {[...d.agreements].reverse().map((a) => (
        <div key={a.version} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
          <FileText className={a.signed ? "text-cleared" : "text-brand"} />
          <div className="min-w-0 flex-1">
            <div className="font-bold">
              v{a.version} · {a.fileName} {a.signed && <span className="chip bg-green-100 text-cleared">Signed</span>}
            </div>
            <div className="text-xs text-charcoal/60">
              {a.uploadedBy} · {fmtDateTime(a.uploadedAt)}
            </div>
          </div>
          <div className="w-full rounded-lg bg-peach-soft px-3 py-2 text-xs md:w-auto">
            <b>Approved terms stamp:</b> {a.approvedTermsStamp}
          </div>
        </div>
      ))}
    </div>
  );
}

function Mobilisation({ d }: { d: Deal }) {
  if (d.currentStage < 12) return <Empty>Mobilisation starts after the agreement is signed (Stage 12).</Empty>;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        {d.sites.map((s) => (
          <div key={s.id} className="rounded-xl border border-line p-3 text-sm">
            <div className="mb-1 font-black">{s.name}</div>
            {DEPLOY_ITEMS.map((it) => (
              <div key={it.key} className={s.deployment[it.key] ? "text-cleared" : "text-charcoal/40"}>
                {s.deployment[it.key] ? "✓" : "○"} {it.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 font-black">Hypercare log</div>
        {d.hypercare.length === 0 ? (
          <Empty>No entries yet.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-charcoal/50">
                <th className="py-1">Day</th>
                <th>Issue</th>
                <th>Fix</th>
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {d.hypercare.map((h) => (
                <tr key={h.id} className="border-t border-line">
                  <td className="py-1.5 font-bold">{h.day}</td>
                  <td>{h.issue}</td>
                  <td>{h.fix || "—"}</td>
                  <td>{h.clientCheckIn ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Documents({ d }: { d: Deal }) {
  const add = useStore((s) => s.addDocument);
  const docs = [...d.documents, ...d.agreements.map((a) => ({ id: `ag${a.version}`, name: a.fileName, kind: a.signed ? "Signed agreement" : `Agreement draft v${a.version}`, by: a.uploadedBy, at: a.uploadedAt }))].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <FilePick
          label="Upload document"
          onPick={(n) => {
            add(d.id, n, "Document");
            toast.ok(`Uploaded ${n}`);
          }}
        />
      </div>
      {docs.length === 0 ? (
        <Empty>No documents yet.</Empty>
      ) : (
        <ul className="divide-y divide-line">
          {docs.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-2.5 text-sm">
              <Upload size={16} className="text-charcoal/40" />
              <span className="min-w-0 flex-1 truncate font-bold">{x.name}</span>
              <span className="chip bg-surface ring-1 ring-line">{x.kind}</span>
              <span className="hidden text-xs text-charcoal/50 md:inline">
                {x.by} · {fmtDate(x.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Activity({ d }: { d: Deal }) {
  const all = useStore((s) => s.activity);
  const list = useMemo(() => all.filter((a) => a.dealId === d.id), [all, d.id]);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-charcoal/50">
        <Lock size={12} /> Append-only. Entries can&apos;t be edited or deleted — not even by Admin.
      </div>
      <ol className="relative space-y-4 border-l-2 border-line pl-5" data-testid="activity">
        {list.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white" style={{ background: PERSONAS[a.role].color }} />
            <div className="text-sm">
              <b>{a.user}</b> <span className="text-charcoal/50">({PERSONAS[a.role].title})</span> · {a.action}
            </div>
            {(a.oldValue || a.newValue) && (
              <div className="mt-0.5 text-xs text-charcoal/60">
                {a.field && <b>{a.field}: </b>}
                {a.oldValue && <span className="line-through">{a.oldValue}</span>} {a.oldValue && "→"} {a.newValue}
              </div>
            )}
            <div className="text-xs text-charcoal/40">{fmtDateTime(a.at)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Comments({ d }: { d: Deal }) {
  const { addComment } = useStore();
  const [text, setText] = useState("");
  const at = text.match(/@(\w*)$/);
  const suggestions = at ? ROLES.filter((r) => r.toLowerCase().startsWith(at[1].toLowerCase()) || PERSONAS[r].name.toLowerCase().startsWith(at[1].toLowerCase())) : [];
  const send = () => {
    if (!text.trim()) return;
    addComment(d.id, text.trim());
    setText("");
    toast.ok("Comment posted");
  };
  return (
    <div className="space-y-4">
      {d.comments.length === 0 && <Empty>No comments yet. Use @ to mention a function — e.g. @Finance.</Empty>}
      {d.comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar name={c.by} role={c.role} />
          <div className="min-w-0 rounded-xl bg-surface px-3 py-2">
            <div className="text-xs">
              <b>{c.by}</b> <span className="text-charcoal/50">· {fmtDateTime(c.at)}</span>
            </div>
            <div className="text-sm">{c.text.split(/(@\w+)/g).map((p, i) => (p.startsWith("@") ? <b key={i} className="text-brand-deep">{p}</b> : p))}</div>
          </div>
        </div>
      ))}
      <div className="relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 w-64 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-line">
            {suggestions.map((r) => (
              <button key={r} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-peach-soft" onClick={() => setText(text.replace(/@\w*$/, `@${r} `))}>
                <Avatar name={PERSONAS[r].name} role={r} size={22} /> {PERSONAS[r].title} <span className="text-xs text-charcoal/50">{PERSONAS[r].name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input className="input" placeholder="Write a comment… type @ to mention" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !suggestions.length && send()} />
          <button className="btn-primary" onClick={send} aria-label="Send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
