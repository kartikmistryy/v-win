const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Demo clock: real time shifted by the "simulate days" offset. */
export function demoNow(dayOffset: number): Date {
  return new Date(Date.now() + dayOffset * DAY);
}

/** DD-MMM-YYYY in IST */
export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3_600_000);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${dd}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3_600_000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${fmtDate(iso)}, ${hh}:${mm}`;
}

export function inr(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}₹${new Intl.NumberFormat("en-IN").format(Math.abs(Math.round(n)))}`;
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY).toISOString();
}

/** Add working days (Mon–Fri). */
export function addWorkingDays(iso: string, days: number): string {
  const d = new Date(iso);
  let left = days;
  while (left > 0) {
    d.setTime(d.getTime() + DAY);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d.toISOString();
}

export function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / DAY);
}

export function toInputDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : "";
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
