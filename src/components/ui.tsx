"use client";
import { create } from "zustand";
import { X } from "lucide-react";
import { useEffect } from "react";
import { PERSONAS, TEMP_COLORS } from "@/lib/masters";
import { initials, uid } from "@/lib/format";
import type { DealStatus, Gate, Role, Temperature } from "@/lib/types";

/* ---------- Toasts ---------- */
type Toast = { id: string; kind: "ok" | "err" | "info"; text: string };
export const useToasts = create<{ list: Toast[]; push: (k: Toast["kind"], t: string) => void; drop: (id: string) => void }>((set) => ({
  list: [],
  push: (kind, text) => {
    const id = uid("t");
    set((s) => ({ list: [...s.list, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ list: s.list.filter((t) => t.id !== id) })), kind === "err" ? 6000 : 3500);
  },
  drop: (id) => set((s) => ({ list: s.list.filter((t) => t.id !== id) })),
}));
export const toast = {
  ok: (t: string) => useToasts.getState().push("ok", t),
  err: (t: string) => useToasts.getState().push("err", t),
  info: (t: string) => useToasts.getState().push("info", t),
};
/** Show a store Result as a toast; returns ok. */
export function showResult(r: { ok: boolean; msg?: string }): boolean {
  if (!r.ok) toast.err(r.msg ?? "Not allowed");
  else if (r.msg) toast.ok(r.msg);
  return r.ok;
}

export function Toasts() {
  const { list, drop } = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6">
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === "err" ? "alert" : "status"}
          className={`animate-pop pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg ${
            t.kind === "err" ? "bg-rejected" : t.kind === "ok" ? "bg-cleared" : "bg-charcoal"
          }`}
        >
          <span className="flex-1">{t.text}</span>
          <button onClick={() => drop(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Brand ---------- */
export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#E97132" />
        <path d="M15 19 L29 46 L49 14" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44.5" y="40.5" width="9" height="9" rx="1.5" transform="rotate(45 49 45)" fill="#FDE7D6" />
      </svg>
      <div className="leading-none">
        <div className="text-xl font-black tracking-tight">
          <span className="text-brand">V</span>
          <span className={dark ? "text-white" : "text-charcoal"}>-Win</span>
        </div>
        {!compact && <div className={`mt-0.5 text-[10px] font-bold tracking-wide ${dark ? "text-white/60" : "text-charcoal/50"}`}>Lead to live by Vendiman</div>}
      </div>
    </div>
  );
}

/* ---------- Gate diamond ---------- */
export function GateDiamond({ g, size = 12, showNo = false }: { g: Gate; size?: number; showNo?: boolean }) {
  const st = g.state;
  const hold = g.no === 4 && g.outcome === "hold";
  const style: React.CSSProperties =
    st === "cleared"
      ? { background: "#2E7D32", borderColor: "#2E7D32" }
      : st === "rejected"
        ? { background: "#C62828", borderColor: "#C62828" }
        : st === "waiting"
          ? { background: hold ? "#FDE7D6" : "white", borderColor: "#E97132" }
          : { background: "#E0E0E0", borderColor: "#BDBDBD" };
  const label = `Gate ${g.no}: ${hold ? "on hold" : st.replace("_", " ")}${g.override ? " (override)" : ""}`;
  return (
    <span title={label} aria-label={label} className="relative inline-flex items-center justify-center" style={{ width: size * 1.45, height: size * 1.45 }}>
      <span className="block rotate-45 rounded-[2px] border-2" style={{ width: size, height: size, ...style }} />
      {showNo && <span className={`absolute text-[9px] font-black ${st === "cleared" || st === "rejected" ? "text-white" : "text-charcoal"}`}>{g.no}</span>}
      {g.override && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-purple-600 ring-2 ring-white" />}
    </span>
  );
}

export function GateRow({ gates, size = 11 }: { gates: Gate[]; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {gates.map((g) => (
        <GateDiamond key={g.no} g={g} size={size} />
      ))}
    </span>
  );
}

export function TempChip({ t }: { t: Temperature }) {
  return (
    <span className="chip text-white" style={{ background: TEMP_COLORS[t] }}>
      {t}
    </span>
  );
}

export function StatusPill({ s }: { s: DealStatus }) {
  const cls: Record<DealStatus, string> = {
    Open: "bg-peach text-brand-deep",
    "On hold": "bg-amber-100 text-amber-800",
    Lost: "bg-red-100 text-rejected",
    "In mobilisation": "bg-blue-50 text-blue-700",
    Live: "bg-green-100 text-cleared",
  };
  return <span className={`chip ${cls[s]}`}>{s}</span>;
}

export function Avatar({ name, role, size = 28 }: { name: string; role?: Role; size?: number }) {
  const color = role ? PERSONAS[role].color : "#E97132";
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-black text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Modal / drawer ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/40 backdrop-blur-[2px] md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        className={`animate-pop max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:rounded-2xl ${wide ? "md:max-w-2xl" : "md:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div className="text-lg font-black">{title}</div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-surface" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-charcoal/60">{hint}</span>}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-charcoal/50">{children}</div>;
}

/** Fake file picker: keeps only the file name (prototype, no storage). */
export function FilePick({ onPick, label = "Choose file", accept }: { onPick: (name: string) => void; label?: string; accept?: string }) {
  return (
    <label className="btn-ghost cursor-pointer">
      {label}
      <input type="file" accept={accept} className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0].name)} />
    </label>
  );
}
