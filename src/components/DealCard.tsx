"use client";
import Link from "next/link";
import { AlertTriangle, Clock, MapPin, ShieldAlert } from "lucide-react";
import type { Deal } from "@/lib/types";
import { stageName, useStore } from "@/lib/store";
import { holdDue, procurementOverdue, totalMachines } from "@/lib/rules";
import { fmtDate } from "@/lib/format";
import { Avatar, GateRow, StatusPill } from "./ui";
import { dealHref } from "./Shell";

export default function DealCard({ d }: { d: Deal }) {
  const now = useStore((s) => s.now)();
  const overdue = procurementOverdue(d, now);
  const override = d.gates.some((g) => g.override);
  return (
    <Link href={dealHref(d.id)} className="card block p-3.5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md" data-testid={`card-${d.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-black">{d.client.name}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-charcoal/60">
            <MapPin size={12} /> {d.city} · {d.channel}
          </div>
        </div>
        <Avatar name={d.ownerName} role="BD" size={24} />
      </div>
      <div className="mt-3 text-xs font-bold text-charcoal/70">
        Stage {d.currentStage === 6 ? "6–7" : d.currentStage} · {d.currentStage === 6 ? "Readiness" : stageName(d.currentStage)}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <GateRow gates={d.gates} />
        <span className="text-xs text-charcoal/60">
          <b className="text-charcoal">{totalMachines(d)}</b> machines
        </span>
      </div>
      {(overdue || d.status !== "Open" || override || d.legalLocked) && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {d.status !== "Open" && <StatusPill s={d.status} />}
          {d.status === "On hold" && d.gates[3].followUpDate && (
            <span className={`chip ${holdDue(d, now) ? "bg-red-100 text-rejected" : "bg-surface text-charcoal/70"}`}>
              <Clock size={10} /> {fmtDate(d.gates[3].followUpDate)}
            </span>
          )}
          {overdue && (
            <span className="chip bg-red-100 text-rejected">
              <AlertTriangle size={10} /> Procurement overdue
            </span>
          )}
          {d.legalLocked && <span className="chip bg-amber-100 text-amber-800">Gate re-opened</span>}
          {override && (
            <span className="chip bg-purple-100 text-purple-700">
              <ShieldAlert size={10} /> Override
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
