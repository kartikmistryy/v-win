"use client";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Flame, Hourglass, Layers, Rocket } from "lucide-react";
import { useStore } from "@/lib/store";
import { PERSONAS } from "@/lib/masters";
import { deriveTemperature, tasksFor, totalMachines, waitingGates } from "@/lib/rules";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { dealHref } from "@/components/Shell";
import { Avatar, Empty, GateDiamond } from "@/components/ui";

export default function HomePage() {
  const { role, deals, activity, now: nowFn } = useStore();
  const now = nowFn();
  const p = PERSONAS[role];
  const active = deals.filter((d) => d.status !== "Lost" && d.status !== "Live");
  const tasks = tasksFor(role, deals, now);
  const hour = Number(now.toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const atGate = active.filter((d) => waitingGates(d).length > 0);

  const tiles = [
    { label: "In pipeline", value: active.length, sub: `${active.reduce((a, d) => a + totalMachines(d), 0)} machines`, icon: Layers, color: "#E97132" },
    { label: "Waiting at a gate", value: atGate.length, sub: "need a decision", icon: Hourglass, color: "#C85A17" },
    { label: "Hot", value: active.filter((d) => deriveTemperature(d) === "Hot").length, sub: "Gates 1–3 cleared", icon: Flame, color: "#C62828" },
    { label: "Going live", value: active.filter((d) => d.currentStage >= 12).length, sub: `${deals.filter((d) => d.status === "Live").length} already live`, icon: Rocket, color: "#2E7D32" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-charcoal/50">{fmtDate(now.toISOString())}</div>
          <h1 className="text-2xl font-black md:text-3xl">
            {greet}, {p.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-charcoal/60">You&apos;re acting as {p.title}.</p>
        </div>
        {role === "BD" && (
          <Link href="/new/" className="btn-primary">
            + New lead
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-charcoal/50">{t.label}</span>
              <t.icon size={18} style={{ color: t.color }} />
            </div>
            <div className="mt-2 text-3xl font-black">{t.value}</div>
            <div className="text-xs text-charcoal/50">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
            My tasks <span className="chip bg-peach text-brand-deep">{tasks.length}</span>
          </h2>
          {tasks.length === 0 ? (
            <Empty>Nothing waiting on {p.title} right now. 🎉</Empty>
          ) : (
            <ul className="divide-y divide-line" data-testid="tasks">
              {tasks.map((t, i) => (
                <li key={i}>
                  <Link href={dealHref(t.dealId)} className="flex items-center gap-3 py-3 hover:text-brand-deep">
                    {t.overdue ? <AlertTriangle size={18} className="shrink-0 text-rejected" /> : <CheckCircle2 size={18} className="shrink-0 text-charcoal/30" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{t.text}</span>
                      <span className="text-xs text-charcoal/50">
                        {t.client} · {t.dealId}
                      </span>
                    </span>
                    {t.overdue && <span className="chip bg-red-100 text-rejected">Overdue</span>}
                    <ArrowRight size={16} className="text-charcoal/30" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          <div className="card p-4 md:p-5">
            <h2 className="mb-3 text-lg font-black">Deals waiting at a gate</h2>
            {atGate.length === 0 ? (
              <Empty>No deals waiting.</Empty>
            ) : (
              <ul className="space-y-2">
                {atGate.slice(0, 6).map((d) => (
                  <li key={d.id}>
                    <Link href={dealHref(d.id)} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-peach-soft">
                      <span className="flex gap-0.5">
                        {waitingGates(d).map((g) => (
                          <GateDiamond key={g.no} g={g} showNo size={14} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{d.client.name}</span>
                      <span className="text-xs text-charcoal/50">{d.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-4 md:p-5">
            <h2 className="mb-3 text-lg font-black">Recent activity</h2>
            <ul className="space-y-3">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <Avatar name={a.user} role={a.role} size={26} />
                  <div className="min-w-0">
                    <div>
                      <b>{a.user}</b> · {a.action}
                    </div>
                    <div className="text-xs text-charcoal/50">
                      {a.dealId} · {fmtDateTime(a.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
