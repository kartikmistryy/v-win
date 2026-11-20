"use client";
import { useEffect, useRef } from "react";
import { Check, Lock } from "lucide-react";
import { PHASES, STAGES } from "@/lib/masters";
import { canMoveTo, gate } from "@/lib/rules";
import type { Deal, GateNo } from "@/lib/types";
import { GateDiamond, toast } from "./ui";

/** 14-stage rail grouped by phase, with gate diamonds after stages 4, 6–7 and 8. */
export default function StageRail({ d }: { d: Deal }) {
  const cur = d.currentStage;
  const phases = ["A", "B", "C", "D", "E"] as const;
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>("[data-current=true]");
    if (rail && el) rail.scrollLeft = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2;
  }, [cur]);

  const stageState = (n: number) => {
    if (d.status === "Live") return "done";
    if (cur === 6 && (n === 6 || n === 7)) {
      return gate(d, (n - 4) as GateNo).state === "cleared" ? "done" : "current";
    }
    if (n < cur) return "done";
    if (n === cur) return "current";
    return "future";
  };

  const onClick = (n: number) => {
    const st = stageState(n);
    if (st === "future") {
      const r = canMoveTo(d, n);
      toast.err(r.reason);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div ref={railRef} className="no-scrollbar relative flex overflow-x-auto scroll-smooth" data-testid="stage-rail">
        {phases.map((ph) => {
          const stages = STAGES.filter((s) => s.phase === ph);
          return (
            <div key={ph} className="flex min-w-fit flex-col border-r border-line last:border-r-0">
              <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-charcoal/50">
                {ph} · {PHASES[ph].name}
                <span className="font-bold normal-case tracking-normal">· {PHASES[ph].temp}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-3">
                {stages.map((s) => {
                  const st = stageState(s.no);
                  const gateAfter = s.gate === 1 || s.gate === 4 ? (s.gate as GateNo) : null;
                  return (
                    <div key={s.no} className="flex items-center gap-1">
                      <button
                        onClick={() => onClick(s.no)}
                        data-current={st === "current"}
                        title={`Stage ${s.no}: ${s.name} — ${s.owner}. Exit: ${s.exit}`}
                        className={`flex w-[92px] flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center transition ${
                          st === "current" ? "bg-peach ring-2 ring-brand" : st === "future" ? "hover:bg-surface" : ""
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            st === "done" ? "bg-cleared text-white" : st === "current" ? "bg-brand text-white" : "bg-line text-charcoal/40"
                          }`}
                        >
                          {st === "done" ? <Check size={15} strokeWidth={3} /> : st === "future" && s.no > cur + 1 ? <Lock size={12} /> : s.no}
                        </span>
                        <span className={`text-[11px] font-bold leading-tight ${st === "future" ? "text-charcoal/40" : "text-charcoal"}`}>{s.name}</span>
                      </button>
                      {gateAfter && (
                        <span className="flex flex-col items-center px-0.5">
                          <GateDiamond g={gate(d, gateAfter)} showNo size={16} />
                        </span>
                      )}
                      {ph === "C" && s.no === 7 && (
                        <span className="flex flex-col items-center gap-1 px-0.5">
                          <GateDiamond g={gate(d, 2)} showNo size={16} />
                          <GateDiamond g={gate(d, 3)} showNo size={16} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line bg-surface px-3 py-1.5 text-[11px] text-charcoal/50">Stages 6 &amp; 7 run in parallel. Tip: click a locked stage to try moving the deal there.</div>
    </div>
  );
}
