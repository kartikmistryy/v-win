"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bell, ChevronDown, ExternalLink, FlaskConical, Home, KanbanSquare, PlusCircle, RotateCcw, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { JUNIORS, PERSONAS, personName, ROLES } from "@/lib/masters";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { Level, Role } from "@/lib/types";
import { Avatar, Logo, Toasts, toast } from "./ui";

export const dealHref = (id: string) => `/deal/?id=${encodeURIComponent(id)}`;

const noop = () => () => {};
/** false during static prerender, true in the browser (localStorage is available). */
function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const path = usePathname();
  if (!hydrated)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Logo />
      </div>
    );
  // Client portal: no internal nav, roles or demo controls
  if (path.startsWith("/client"))
    return (
      <div className="min-h-screen">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
            <Logo />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">{children}</main>
        <Toasts />
      </div>
    );
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <TopBar />
      <div className="mx-auto flex max-w-[1400px]">
        <SideNav />
        <main className="min-w-0 flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
      </div>
      <BottomNav />
      <Toasts />
    </div>
  );
}

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/pipeline/", label: "Pipeline", icon: KanbanSquare },
  { href: "/new/", label: "New lead", icon: PlusCircle, role: "BD" as Role },
  { href: "/client/", label: "Client form", icon: ExternalLink, role: "BD" as Role },
];

function useNav() {
  const role = useStore((s) => s.role);
  return NAV.filter((n) => !n.role || n.role === role);
}

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path.startsWith(href.replace(/\/$/, ""));
}

function SideNav() {
  const path = usePathname();
  const nav = useNav();
  return (
    <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 flex-col gap-1 border-r border-line px-3 py-6 md:flex">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          target={href === "/client/" ? "_blank" : undefined}
          href={href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
            isActive(path, href) ? "bg-peach text-brand-deep" : "text-charcoal/70 hover:bg-white hover:text-charcoal"
          }`}
        >
          <Icon size={18} /> {label}
        </Link>
      ))}
      <div className="mt-auto rounded-xl bg-white p-3 text-xs text-charcoal/60 ring-1 ring-line">
        <div className="mb-1 font-black text-charcoal">Prototype</div>
        Mock data, saved in this browser. Use the role switcher to act as each function.
      </div>
    </nav>
  );
}

function BottomNav() {
  const path = usePathname();
  const nav = useNav();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white md:hidden">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} target={href === "/client/" ? "_blank" : undefined} className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${isActive(path, href) ? "text-brand" : "text-charcoal/60"}`}>
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, close]);
  return ref;
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-charcoal text-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 md:gap-4 md:px-6">
        <Link href="/" className="shrink-0">
          <span className="hidden sm:block">
            <Logo dark />
          </span>
          <span className="sm:hidden">
            <Logo dark compact />
          </span>
        </Link>
        <SearchBox />
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <DemoMenu />
          <Notifications />
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}

function SearchBox() {
  const deals = useStore((s) => s.deals);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useClickOutside(open, () => setOpen(false));
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return deals
      .filter((d) => [d.client.name, d.id, d.city, d.ownerName, `stage ${d.currentStage}`].some((x) => x.toLowerCase().includes(t)))
      .slice(0, 6);
  }, [q, deals]);
  return (
    <div ref={ref} className="relative hidden max-w-md flex-1 sm:block">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search client, Deal ID, city, owner…"
        className="w-full rounded-lg bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 outline-none focus:bg-white/15 focus:ring-2 focus:ring-brand"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-xl bg-white text-charcoal shadow-xl ring-1 ring-line">
          {results.length === 0 && <div className="px-4 py-3 text-sm text-charcoal/50">No deals match “{q}”</div>}
          {results.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                setOpen(false);
                setQ("");
                router.push(dealHref(d.id));
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-peach-soft"
            >
              <span>
                <span className="font-bold">{d.client.name}</span>
                <span className="ml-2 text-charcoal/50">{d.city}</span>
              </span>
              <span className="text-xs text-charcoal/50">{d.id} · Stage {d.currentStage}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleSwitcher() {
  const role = useStore((s) => s.role);
  const level = useStore((s) => s.level);
  const setRole = useStore((s) => s.setRole);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Level>(level);
  const ref = useClickOutside(open, () => setOpen(false));
  const p = PERSONAS[role];
  const name = personName(role, level);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="role-switcher"
        className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-2.5 text-sm font-bold hover:bg-white/15"
      >
        <Avatar name={name} role={role} size={28} />
        <span className="hidden flex-col items-start leading-tight md:flex">
          <span className="text-xs text-white/60">Acting as · {role === "Leadership" ? "Leadership" : level}</span>
          <span>{p.title}</span>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-xl bg-white text-charcoal shadow-xl ring-1 ring-line">
          <div className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-charcoal/50">Switch role (demo)</div>
          <div className="grid grid-cols-2 gap-1 border-b border-line p-2" role="radiogroup" aria-label="Seniority">
            {(["Senior", "Junior"] as Level[]).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={pick === l}
                onClick={() => setPick(l)}
                className={`rounded-lg px-2 py-1.5 text-left text-xs font-bold ${pick === l ? "bg-charcoal text-white" : "text-charcoal/70 hover:bg-surface"}`}
              >
                {l}
                <span className={`block font-normal ${pick === l ? "text-white/70" : "text-charcoal/50"}`}>{l === "Senior" ? "Approve + review" : "Approve only"}</span>
              </button>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {ROLES.filter((r) => pick === "Senior" || JUNIORS[r]).map((r) => {
              const n = personName(r, pick);
              const current = r === role && (pick === level || !JUNIORS[r]);
              return (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r, pick);
                    setOpen(false);
                    toast.info(`Now acting as ${n} — ${PERSONAS[r].title}${JUNIORS[r] ? ` (${pick})` : ""}`);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-peach-soft ${current ? "bg-peach" : ""}`}
                >
                  <Avatar name={n} role={r} size={26} />
                  <span className="flex-1">
                    <span className="block font-bold">{PERSONAS[r].title}</span>
                    <span className="text-xs text-charcoal/50">{n}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const role = useStore((s) => s.role);
  const all = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markRead);
  const mine = all.filter((n) => n.toRole === role);
  const unread = mine.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const router = useRouter();
  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(markRead, 1500);
        }}
        className="relative rounded-lg p-2 hover:bg-white/10"
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-black">{unread}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-16 max-h-[70vh] overflow-y-auto rounded-xl bg-white text-charcoal shadow-xl ring-1 ring-line md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-96">
          <div className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-charcoal/50">Notifications · {PERSONAS[role].title}</div>
          {mine.length === 0 && <div className="px-4 py-6 text-center text-sm text-charcoal/50">Nothing yet. Hand-offs to your role show up here.</div>}
          {mine.slice(0, 30).map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setOpen(false);
                if (n.dealId) router.push(dealHref(n.dealId));
              }}
              className={`block w-full border-b border-line px-4 py-3 text-left text-sm last:border-0 hover:bg-peach-soft ${n.read ? "" : "bg-peach-soft"}`}
            >
              <div className="font-bold">{n.text}</div>
              <div className="mt-0.5 text-xs text-charcoal/50">{fmtDateTime(n.at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DemoMenu() {
  const { simulateDays, reset, dayOffset, now } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-white/80 hover:bg-white/10" aria-label="Demo controls">
        <FlaskConical size={18} />
        <span className="hidden lg:inline">Demo</span>
        {dayOffset > 0 && <span className="rounded bg-brand px-1.5 py-0.5 text-[10px]">+{dayOffset}d</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 rounded-xl bg-white p-3 text-charcoal shadow-xl ring-1 ring-line">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-charcoal/50">Demo controls</div>
          <div className="mb-3 rounded-lg bg-surface px-3 py-2 text-sm">
            Demo date: <b>{fmtDate(now().toISOString())}</b>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 7, 30].map((n) => (
              <button
                key={n}
                className="btn-ghost px-2"
                onClick={() => {
                  simulateDays(n);
                  toast.info(`Clock moved forward ${n} day${n > 1 ? "s" : ""}`);
                }}
              >
                +{n} day{n > 1 ? "s" : ""}
              </button>
            ))}
          </div>
          <button
            className="btn-ghost mt-2 w-full text-rejected"
            onClick={() => {
              if (confirm("Reset all demo data?")) {
                reset();
                setOpen(false);
                toast.info("Demo data reset");
              }
            }}
          >
            <RotateCcw size={14} /> Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}
