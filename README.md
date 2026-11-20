# V-Win — Lead to live by Vendiman

Clickable prototype of **V-Win (Vendiman Win)**, the gated Business Development app for [Vendiman](https://vendiman.com).
A deal moves from first contact to a live account through **14 stages** and **4 approval gates**, on one shared record.

> Front-end only. Mock data is saved in your browser (`localStorage`). Use **Demo → Reset demo data** to start over.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # business-rule unit tests (Vitest)
npm run build      # static export → ./out
```

Deploys to Vercel with no settings changed (Next.js static export).

## How to demo (≈3 min)

Use the **role switcher** (top-right) to act as each function. Buttons only show for the role that owns the step.

1. **Business Development** → *New lead*: "Demo Co.", 2 sites (one with branding allowed). Deal ID is created, deal is **Cold**. Re-type the same name + city + GST → duplicate warning.
2. Complete profile → upload site survey (fill footfall/machines) → deal is **Warm**. Propose product mix + Service Charge **₹5,000** → submit.
3. Click a locked stage on the rail → blocked with the missing gate named.
4. **Procurement** → mark lines available → confirm.
5. **Finance** → Gate 1: minimum ₹6,000 → **blocked**. Add branding offset ₹2,500 → gap +₹1,500 → clear.
6. **Branding** confirms scope → **BD** certifies offer → Gates 2 & 3 open in parallel.
7. **Operations** clears Gate 2 (still Warm). **Technology** tries Reject without comment → refused; then clears → deal **Hot**.
8. **BD** records Gate 4 = Accept → Legal notified. BD changes the price → **Gate 1 re-opens**, Legal locked → **Finance** re-clears.
9. **Legal** uploads draft → closes comments → uploads signed copy → deal **Won**.
10. **Mobilisation** ticks the deployment checklist → hypercare starts → **Demo → +30 days** → complete hypercare.
11. Handover: Mobilisation + Operations sign (not Live yet) → **Finance** signs → **Live** 🎉
12. **Leadership** → open VW-2026-0004 → override Gate 1 with a reason (Override badge).

## Structure

```
src/lib/rules.ts     pure business rules BR-01…BR-15 (+ rules.test.ts)
src/lib/store.ts     Zustand store: every action, activity log, notifications
src/lib/masters.ts   channels, zones, min Service Charge table, reason codes (placeholders)
src/lib/seed.ts      11 fictional seed deals across all stages
src/app/             Home, Pipeline, New lead, Deal room
src/components/      Stage rail, gate panel, stage actions, tabs
docs/PRD.md          prototype PRD
```

Masters (min Service Charge table, reason codes, customer types) are **placeholders** pending Vendiman confirmation.
