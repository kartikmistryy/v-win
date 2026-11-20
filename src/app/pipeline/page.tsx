"use client";
import { useMemo, useState } from "react";
import { Download, Filter } from "lucide-react";
import { useStore, stageName } from "@/lib/store";
import { CHANNELS, PERSONAS, STAGES, TEMP_COLORS, ZONES } from "@/lib/masters";
import { deriveTemperature, totalMachines } from "@/lib/rules";
import type { Temperature } from "@/lib/types";
import DealCard from "@/components/DealCard";
import { Empty, toast } from "@/components/ui";

const COLS: Temperature[] = ["Cold", "Warm", "Hot", "Won"];

export default function PipelinePage() {
  const deals = useStore((s) => s.deals);
  const [f, setF] = useState({ zone: "", channel: "", owner: "", stage: "", lost: false });
  const [showFilters, setShowFilters] = useState(false);
  const owners = [...new Set(deals.map((d) => d.ownerName))];

  const filtered = useMemo(
    () =>
      deals.filter(
        (d) =>
          (!f.zone || d.zone === f.zone) &&
          (!f.channel || d.channel === f.channel) &&
          (!f.owner || d.ownerName === f.owner) &&
          (!f.stage || String(d.currentStage) === f.stage) &&
          (f.lost || d.status !== "Lost"),
      ),
    [deals, f],
  );

  const exportCsv = () => {
    const rows = [
      ["Deal ID", "Client", "City", "Zone", "Channel", "Sub-channel", "Owner", "Stage", "Temperature", "Status", "Machines", "Gate 1", "Gate 2", "Gate 3", "Gate 4"],
      ...filtered.map((d) => [d.id, d.client.name, d.city, d.zone, d.channel, d.subChannel, d.ownerName, `${d.currentStage} ${stageName(d.currentStage)}`, deriveTemperature(d), d.status, totalMachines(d), ...d.gates.map((g) => g.outcome ?? g.state)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "v-win-pipeline.csv";
    a.click();
    toast.ok(`Exported ${filtered.length} deals (opens in Excel)`);
  };

  const active = Object.values(f).some(Boolean);
  const sel = "input w-auto min-w-[9rem] py-1.5";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Pipeline</h1>
          <p className="text-sm text-charcoal/60">Temperature comes from the stage and gates — nobody sets it by hand.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost md:hidden" onClick={() => setShowFilters((s) => !s)}>
            <Filter size={16} /> Filters{active && " •"}
          </button>
          <button className="btn-ghost" onClick={exportCsv}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className={`${showFilters ? "flex" : "hidden"} card flex-wrap items-center gap-2 p-3 md:flex`}>
        <select aria-label="Zone" className={sel} value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })}>
          <option value="">All zones</option>
          {ZONES.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <select aria-label="Channel" className={sel} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>
          <option value="">All channels</option>
          {Object.keys(CHANNELS).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select aria-label="Owner" className={sel} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
          <option value="">All owners</option>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select aria-label="Stage" className={sel} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}>
          <option value="">All stages</option>
          {STAGES.filter((s) => s.no !== 7).map((s) => (
            <option key={s.no} value={s.no}>
              {s.no === 6 ? "6–7 Readiness" : `${s.no} ${s.name}`}
            </option>
          ))}
        </select>
        <label className="ml-1 flex items-center gap-2 text-sm font-bold text-charcoal/70">
          <input type="checkbox" checked={f.lost} onChange={(e) => setF({ ...f, lost: e.target.checked })} className="accent-brand" /> Show lost
        </label>
        {active && (
          <button className="ml-auto text-sm font-bold text-brand-deep hover:underline" onClick={() => setF({ zone: "", channel: "", owner: "", stage: "", lost: false })}>
            Clear filters
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {COLS.map((t) => {
          const list = filtered.filter((d) => deriveTemperature(d) === t);
          return (
            <section key={t} className="w-[82vw] shrink-0 snap-start md:w-auto" data-testid={`col-${t}`}>
              <header className="mb-3 flex items-center justify-between rounded-lg px-3 py-2 text-white" style={{ background: TEMP_COLORS[t] }}>
                <span className="font-black">{t}</span>
                <span className="text-xs font-bold opacity-90">
                  {list.length} deals · {list.reduce((a, d) => a + totalMachines(d), 0)} machines
                </span>
              </header>
              <div className="space-y-3">
                {list.length === 0 ? <Empty>No deals</Empty> : list.map((d) => <DealCard key={d.id} d={d} />)}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-charcoal/50">
        Gate diamonds: <b className="text-cleared">green</b> cleared · <b className="text-brand">orange outline</b> waiting · <b className="text-charcoal/50">grey</b> not reached · <b className="text-rejected">red</b> rejected. Owners: {PERSONAS.BD.name} (BD).
      </p>
    </div>
  );
}
