# V-Win Prototype — PRD for Claude Code

> **V-Win = Vendiman Win.** A gated Business Development app for **Vendiman Private Limited** (vendiman.com).
> Tagline: **"Lead to live by Vendiman"**
> This PRD describes a **clickable, front-end-only demo prototype** — not the production app.

---

## 1. Context (read first)

**Vendiman** is a Mumbai-based smart vending company (≈2,000 machines, 550 clients, 20 cities). Company tagline: *"Transforming Convenience"* — *"India's Leader in Smart Vending & Instant Retail Experiences."* Service models: Company Paid, Consumer Paid, Pantry Supply.

**The problem:** Today Business Development (BD) closes deals alone. Price, product mix and go-live dates get promised before Finance, Operations and Technology check them → renegotiation, delays, bad first month for the client.

**The fix (V-Win):** One shared deal record visible to all 8 functions. A deal moves through **14 stages** in **5 phases**, and **cannot pass 4 gates** until the owning function approves.

**Prototype goal:** Prove in a ~3-minute demo that *a deal can't skip a step, and every function gets its say before the client is promised anything.*

---

## 2. Prototype scope

### Build
- Single-page web app, **front-end only**, mock data, state persisted in `localStorage` (with a "Reset demo" button).
- **Role switcher** in the top bar (no real login).
- 5 core screens (section 7) + a light Home screen.
- All business rules in section 6 enforced in the UI.
- Responsive down to **360 px** width.

### Do NOT build
- Real auth, backend, database, APIs
- Email notifications (show in-app toasts / a notification bell instead)
- Excel export, reports/dashboards (beyond Home summary tiles)
- Admin masters screen (hard-code masters in a `masters.ts` file)
- E-signature, billing, telemetry integration

### Suggested stack
- **Vite + React + TypeScript + Tailwind CSS**
- State: Zustand (or React Context) + `localStorage` persistence
- Icons: lucide-react
- Routing: react-router
- No UI kit required; keep components hand-built and clean

---

## 3. Brand & visual design

### Colours (from the BRD)
| Token | Hex | Use |
|---|---|---|
| `brand-orange` | `#E97132` | Primary buttons, active states, links, "Waiting" gate outline |
| `brand-deep` | `#C85A17` | Hover/pressed, headings accents |
| `brand-peach` | `#FDE7D6` | Soft backgrounds, highlighted cards, active stage pill bg |
| `charcoal` | `#2E2F31` | Body text, top bar background |
| `cleared-green` | `#2E7D32` | Cleared gates, success, "Live" |
| `rejected-red` | `#C62828` *(suggested)* | Rejected gates, blocking errors |
| `not-reached-grey` | `#BDBDBD` *(suggested)* | Not-reached gates, future stages |
| `surface` | `#FFFFFF` / `#FAFAF8` | Cards / page background |

Temperature chip colours (suggested): **Cold** `#5B8DEF` · **Warm** `#E97132` · **Hot** `#C85A17` · **Won** `#2E7D32`.

### Typography
- **Lato** (Google Fonts), fallback Calibri, system-ui. Headings 700, body 400.
- Amounts in ₹ with **Indian digit grouping** (`₹1,25,000`) → use `Intl.NumberFormat('en-IN')`.
- Dates in **DD-MMM-YYYY** (e.g. `20-Nov-2026`), IST.

### Logo
- The BRD mentions dedicated V-Win logo files — **not available yet**. For the prototype:
  - Build a **text wordmark**: `V-Win` in Lato 800, with the "V" in `#E97132` and "-Win" in charcoal (white on dark top bar), and a small subtitle `Lead to live by Vendiman`.
  - Optionally show the Vendiman logo in the top bar / login screen, from:
    - Colour: `https://vendiman.com/wp-content/uploads/2022/05/Group-Copy@1x.png`
    - White (for dark backgrounds): `https://vendiman.com/wp-content/uploads/2022/05/Group-white@1x.png`
  - Put logos in `/public/brand/` so they can be swapped later.

### UI rules (must follow)
- **Gate diamonds** — one colour code everywhere:
  - Green filled = Cleared · Orange outline = Waiting · Grey = Not reached · Red filled = Rejected
- **Buttons a user cannot use are HIDDEN, not greyed out.**
- Clean, airy, card-based layout; rounded corners (8–12 px); subtle shadows; generous whitespace.

---

## 4. The process (domain model)

### 14 stages · 5 phases · 4 gates

| # | Stage | Owner | Phase | Temp | Exit criterion |
|---|---|---|---|---|---|
| 1 | Client profile | BD | A · Qualify | Cold | Profile complete |
| 2 | Site & demand sizing | BD | A · Qualify | Cold | Site survey uploaded |
| 3 | Product mix | Procurement (with BD) | B · Proposal | Warm | Product mix confirmed |
| 4 | Viability & min Service Charge — **Gate 1** | Finance | B · Proposal | Warm | Gate 1 cleared |
| 5 | Commercial alignment | BD, Finance, Branding | B · Proposal | Warm | Certified offer ready |
| 6 | Ops readiness — **Gate 2** | Operations | C · Readiness | Warm | Gate 2 cleared |
| 7 | Tech readiness — **Gate 3** | Technology | C · Readiness | Warm | Gate 3 cleared |
| 8 | Client decision — **Gate 4** | BD | D · Close | Hot | Gate 4 recorded |
| 9 | Draft agreement | Legal | D · Close | Hot | Draft ready |
| 10 | Submit agreement | Legal + BD | D · Close | Hot | Client comments closed |
| 11 | Agreement signed | Legal | D · Close | Hot | Signed copy uploaded |
| 12 | Deployment | Mobilisation (+Ops, Tech) | E · Mobilise | Won | Machines live |
| 13 | 30-day hypercare | Mobilisation | E · Mobilise | Won | 30 days stable |
| 14 | Handover to Operations | Mobilisation → Ops, Finance | E · Mobilise | Won | Handover signed |

**Stages 6 and 7 run in parallel.** Both gates must clear before Stage 8.

### The 4 gates
| Gate | Owner | Question | Outcomes |
|---|---|---|---|
| 1 · Viability | Finance | Does the deal pay at this Service Charge? | Cleared / Rejected |
| 2 · Ops readiness | Operations | Can we service every site, on time? | Cleared / Rejected |
| 3 · Tech readiness | Technology | Will every machine run from day one? | Cleared / Rejected |
| 4 · Client decision | BD | Does the client accept the certified offer? | **Accept / Hold / Reject** |

Gate states: `not_reached | waiting | cleared | rejected` (Gate 4 also stores outcome `accept | hold | reject`).
**Model gates as a state machine**, not free text.

### Deal status
| Status | When |
|---|---|
| Open | Stage 1 → 11 |
| On hold | Gate 4 = Hold (back to Open on follow-up date) |
| Lost | Gate 4 = Reject (read-only) |
| In mobilisation | Agreement signed → until handover |
| Live | All 3 handover signatures present |

---

## 5. Roles (role switcher)

Everyone can **view** every deal. Only the owning role sees **action buttons**.

| Role | Acts on |
|---|---|
| Business Development | Create lead, Stages 1, 2, 5, 8 (Gate 4 outcome), 10 |
| Procurement | Stage 3: mark product lines available / not + margin % |
| Finance | Gate 1 (min Service Charge, clear/reject); handover signature |
| Branding | Stage 5: confirm branding scope & value |
| Operations | Gate 2 (route, manpower, machines, go-live date); handover signature |
| Technology | Gate 3 (machine config, telemetry, cashless) |
| Legal | Stages 9–11: upload draft versions, signed copy |
| Mobilisation | Stages 12–14: deployment checklist, hypercare log, handover signature |
| Leadership (CEO/CXO) | View all; **Override** a gate with a written reason (distinct badge) |

Show the current role as a coloured pill in the top bar, plus a fake user name per role (e.g. "Priya — Finance").

---

## 6. Business rules (enforce in UI, show clear error messages)

- **BR-01** Stages move strictly in order 1 → 14; no skipping. (6 & 7 parallel.)
- **BR-02** Can't enter Stage 5 until Gate 1 = Cleared.
- **BR-03** Can't enter Stage 8 until Gates 1, 2 **and** 3 = Cleared.
- **BR-04** Legal can't start Stage 9 until Gate 4 = Accept.
- **BR-05** If proposed Service Charge < minimum (after branding offset) → Gate 1 **Clear button disabled/blocked** with message.
- **BR-06** Branding offset only if site `branding_allowed = yes`, and only **≥ ₹2,500/month**.
- **Viability gap** = proposed Service Charge + branding offset − minimum. Gap ≥ 0 → can clear.
- **BR-07** Every gate decision needs a **reason code**; Reject and Hold also need a **comment**.
- **BR-08** Rejected gate → deal returns to the stage before that gate, data kept, owner notified.
- **BR-09** Temperature is **derived**, never stored: Stages 1–2 Cold · 3–7 Warm · 8–11 (Gates 1–3 cleared) Hot · 12–14 Won.
- **BR-10** Changing price / product mix / sites / go-live date **after Gate 4** re-opens the matching gate (price → Gate 1, sites/date → Gate 2, machines → Gate 3) and **locks Legal** until re-cleared.
- **BR-11** Procurement must confirm within 1 working day → else show **"Overdue"** badge. (Add a "Simulate +1 day" dev button.)
- **BR-12** Hold requires a follow-up date; deal appears in owner's task list on that date.
- **BR-13** Deal becomes **Live** only when Mobilisation, Operations **and** Finance have all signed handover.
- **BR-14** Gate decisions and activity log entries are **immutable** — no edit/delete buttons anywhere.
- **BR-15** Lost deal is read-only.

Blocked-move message example: *"Can't move to Stage 6 — Gate 1 (Finance · Viability) is not cleared yet."*

---

## 7. Screens

### Global layout
- **Top bar (charcoal):** V-Win wordmark · search box (client / Deal ID / city) · notification bell (in-app notifications list) · **Role switcher** · "Reset demo" (small, in a menu).
- **Left nav (desktop) / bottom nav (mobile):** Home · Pipeline · New lead.

### S2 · Home
- Greeting: "Good morning, Priya" (based on role persona).
- 4 summary tiles: **In pipeline · Waiting at a gate · Hot · Going live**.
- **My tasks** list: deals where the current role must act now (e.g. Finance sees "VW-2026-0003 waiting at Gate 1"), overdue items flagged red.

### S3 · Pipeline board
- 4 Kanban columns: **Cold · Warm · Hot · Won** with counts + total machines.
- Deal card: client name, city, channel, # machines, current stage ("Stage 4 · Viability"), owner avatar, **4 gate diamonds**, badges (Overdue, On hold, Override).
- Filters: zone (West, South 1, South 2, North, East), channel, owner, stage.
- Click card → Deal room. (No drag-and-drop — movement only via stage actions, to respect gates.)

### S4 · New lead form (BD only)
- Client name, GST number, customer type, contacts (name, role, phone, email — add multiple).
- Channel + sub-channel dropdowns, zone, city, lead source.
- **Sites** (add multiple): address, footfall, machine points, machine type (Seaga / TCN / XY / ICM), branding allowed (yes/no), photo upload (preview only, store as data URL or filename).
- **Duplicate warning** if name + city + GST matches an existing client.
- On save → Deal ID `VW-2026-NNNN`, Stage 1, Cold → redirect to Deal room.

### S5 · Deal room (the hero screen)
- **Header:** client name, Deal ID, status pill, temperature chip, owner, city, channel.
- **14-stage rail:** horizontal stepper (scrollable on mobile), grouped by phase A–E, with gate diamonds placed between stages 4|5, 7|8, 8|9. Current stage highlighted in orange; completed = green check; future = grey.
- **Current stage panel:** what to do now, who owns it, the action form for that stage (shown only to the owner role; others see "Waiting on Finance").
- **4 gate cards:** state, owner role, decided by, timestamp, reason code, comment. Override badge if forced by Leadership.
- **Tabs:** Sites & product mix · Commercials · Readiness · Documents · Activity · Comments.
- **Activity feed:** immutable log — who, what, when, old → new value.
- **Comments** with `@mentions` (simple: typing @ shows a role/person list; creates a notification).

### S6 · Gate approval panel (drawer/modal from Deal room)
- Gate checklist (static list of what the owner confirms).
- Inputs per gate:
  - **Gate 1 (Finance):** minimum Service Charge (pre-filled from table by channel × customer type), proposed Service Charge (from BD), branding offset (if allowed) → **live viability gap** with green/red indicator.
  - **Gate 2 (Ops):** refill route, manpower, machines count, go-live date.
  - **Gate 3 (Tech):** machine configuration, telemetry OK (toggle), cashless OK (toggle).
  - **Gate 4 (BD):** Accept / Hold / Reject; follow-up date if Hold.
- Reason code dropdown (required) · comment (required for Reject/Hold) · **Clear / Reject** buttons.

### S7 · Mobilisation tracker (tab inside Deal room, stages 12–14)
- **Per-site deployment checklist:** Installed · Configured · Stocked to planogram · Cashless tested. All ticked → site live.
- **Hypercare:** 30-day countdown ring ("Day 6 of 30"), daily log (issue, fix, client check-in). Add a "Simulate +7 days" dev button.
- **Handover form:** 3 signature buttons (Mobilisation, Operations, Finance), each visible only to that role. All 3 → status **Live** 🎉 (subtle confetti OK).

---

## 8. Data model (TypeScript)

```ts
type Role = 'BD'|'Procurement'|'Finance'|'Branding'|'Operations'|'Technology'|'Legal'|'Mobilisation'|'Leadership';
type GateState = 'not_reached'|'waiting'|'cleared'|'rejected';
type Temperature = 'Cold'|'Warm'|'Hot'|'Won';
type DealStatus = 'Open'|'On hold'|'Lost'|'In mobilisation'|'Live';
type MachineType = 'Seaga'|'TCN'|'XY'|'ICM';

interface Client { id: string; name: string; gst: string; customerType: string; billingAddress?: string; contacts: Contact[]; }
interface Contact { id: string; name: string; role: string; phone: string; email: string; }

interface Deal {
  id: string;                // VW-2026-0001
  clientId: string;
  ownerName: string;
  channel: string; subChannel: string; zone: string; city: string; leadSource: string;
  currentStage: number;      // 1–14 (stage 6 & 7 tracked via gates)
  status: DealStatus;
  sites: Site[];
  viability?: ViabilityCheck;
  readiness: { ops?: OpsReadiness; tech?: TechReadiness };
  gates: Gate[];             // always 4
  agreements: AgreementVersion[];
  hypercare?: { startDate: string; logs: HypercareLog[] };
  handover: { mobilisation?: Sig; operations?: Sig; finance?: Sig };
  procurementSubmittedAt?: string;
  createdAt: string;
}
interface Site { id: string; address: string; footfall: number; machinePoints: number; machineType: MachineType; brandingAllowed: boolean; photos: string[]; productLines: ProductLine[]; deployment: Record<'installed'|'configured'|'stocked'|'cashlessTested', boolean>; }
interface ProductLine { id: string; product: string; qty: number; available?: boolean; marginPct?: number; confirmedBy?: string; confirmedAt?: string; }
interface ViabilityCheck { minimum: number; proposed: number; brandingOffset: number; } // gap derived
interface Gate { no: 1|2|3|4; state: GateState; ownerRole: Role; outcome?: 'accept'|'hold'|'reject'; decidedBy?: string; decidedAt?: string; reasonCode?: string; comment?: string; followUpDate?: string; override?: boolean; }
interface AgreementVersion { version: number; fileName: string; approvedTermsStamp: string; signed: boolean; uploadedAt: string; }
interface HypercareLog { day: number; issue: string; fix: string; clientCheckIn: boolean; }
interface Sig { by: string; at: string; }
interface ActivityEntry { id: string; dealId: string; user: string; role: Role; action: string; field?: string; oldValue?: string; newValue?: string; at: string; } // append-only
interface Notification { id: string; toRole: Role; text: string; dealId: string; at: string; read: boolean; }
```

Put rules in pure functions in `src/lib/rules.ts` (`deriveTemperature`, `canMoveTo`, `viabilityGap`, `canClearGate`, `reopenGatesOnChange`, `isLive`) with unit tests (Vitest).

---

## 9. Masters (hard-coded `src/data/masters.ts`)

- **Channels:** Work, Travel, Education, Healthcare, Entertainment & Leisure, Places of Worship, Residential, Others
  - Example sub-channels: Work → Corporate office, Manufacturing, IT park · Travel → Airport, Railway, Metro · Healthcare → Hospital, Clinic · Education → College, School
- **Zones:** West, South 1, South 2, North, East
- **Cities:** Mumbai, Pune, Bengaluru, Chennai, Hyderabad, Delhi NCR, Kolkata, Ahmedabad
- **Machine types:** Seaga, TCN, XY, ICM
- **Customer types (assumed):** Enterprise, Mid-market, SME, Government
- **Products (sample):** Haldiram's namkeen, Coca-Cola 300ml, Nestlé KitKat, Cadbury Dairy Milk, Bisleri 500ml, Protein bar, Cold coffee
- **Min Service Charge table (₹/machine/month, placeholder):**

| Channel | Enterprise | Mid-market | SME | Government |
|---|---|---|---|---|
| Work | 6,000 | 7,000 | 8,000 | 6,500 |
| Travel | 9,000 | 9,500 | 10,000 | 9,000 |
| Healthcare | 7,000 | 7,500 | 8,000 | 7,000 |
| Education | 5,000 | 5,500 | 6,000 | 5,000 |
| Others | 7,000 | 7,500 | 8,000 | 7,500 |

- **Reason codes (placeholder):**
  - Gate reject: Below viability floor · Route not serviceable · Manpower unavailable · Machine stock unavailable · Telemetry/cashless not supported · Other
  - Gate clear: Meets criteria · Meets with conditions
  - Gate 4: Accept — Price agreed / Terms agreed · Hold — Budget approval pending / Decision-maker unavailable · Reject — Price too high / Chose competitor / Project cancelled

> All masters are placeholders — the BRD lists them as open items to be confirmed by Vendiman.

---

## 10. Seed data (so the board looks alive)

Seed ~10 deals spread across all temperatures, e.g.:

| Deal ID | Client | City | Channel | Stage | Notes |
|---|---|---|---|---|---|
| VW-2026-0001 | Northwind Tech Park | Bengaluru | Work | 1 | Fresh lead |
| VW-2026-0002 | Skyline Hospital | Pune | Healthcare | 2 | Site survey in progress |
| VW-2026-0003 | Metro Line 3 Stations | Mumbai | Travel | 3 | Procurement **overdue** |
| VW-2026-0004 | Greenfield University | Chennai | Education | 4 | Waiting at Gate 1 |
| VW-2026-0005 | Apex Manufacturing | Ahmedabad | Work | 6/7 | Gate 2 cleared, Gate 3 waiting |
| VW-2026-0006 | Harbour Airport T2 | Mumbai | Travel | 8 | On hold, follow-up date set |
| VW-2026-0007 | Lotus Corporate Tower | Delhi NCR | Work | 10 | Agreement v2 shared |
| VW-2026-0008 | City Care Clinics | Hyderabad | Healthcare | 12 | Deployment 2/4 done |
| VW-2026-0009 | Sunrise IT Campus | Bengaluru | Work | 13 | Hypercare day 18/30 |
| VW-2026-0010 | **Demo Co. (blank)** | Mumbai | Work | — | Created live during demo |

Use fictional client names only. Each seeded deal should have a few activity log entries.

---

## 11. Demo script (the prototype must support this exact flow)

1. **BD** creates a new lead "Demo Co." with 2 sites (one branding allowed) → Deal ID generated, **Cold**. Re-enter same name+city+GST → **duplicate warning**.
2. BD completes Stage 2 → submits product mix → deal **Warm**.
3. Switch to **Procurement** → mark lines available + margin % → confirm.
4. Switch to **Finance** → proposed ₹5,000 vs minimum ₹6,000 → **Clear blocked** (gap −₹1,000). Add branding offset ₹2,500 → gap +₹1,500 → **Gate 1 green**.
5. BD tries to jump to Stage 8 → **blocked: "Gates 2 and 3 not cleared."**
6. **Operations** clears Gate 2. Deal still **Warm** (Gate 3 waiting). **Technology** tries to reject without comment → blocked; then clears Gate 3 → deal **Hot**.
7. **BD** records Gate 4 = Accept (reason code) → Legal notified.
8. BD edits the price → **Gate 1 re-opens**, Legal locked, Finance notified.
9. Finance re-clears → **Legal** uploads draft v1 → signed copy → status **In mobilisation**, **Won**.
10. **Mobilisation** ticks all checklist items → hypercare starts; "Simulate +30 days".
11. Handover: Mobilisation + Ops sign → still not Live; **Finance** signs → **Live** ✅
12. Switch to **Leadership** → show override button with reason on another deal (badge appears).

---

## 12. Acceptance checklist

- [ ] New lead creates `VW-2026-NNNN`, Stage 1, Cold (AC-01)
- [ ] Duplicate warning on name + city + GST (AC-02)
- [ ] Procurement overdue flag after 1 day (simulated) (AC-03)
- [ ] Gate 1 blocked when below minimum without branding (AC-04)
- [ ] Branding offset ₹2,500 closes gap → Gate 1 clearable (AC-05)
- [ ] Stage 4 → 6 blocked with message naming missing gate (AC-06)
- [ ] Gate 2 cleared + Gate 3 waiting → stays Warm, can't enter Stage 8 (AC-07)
- [ ] Reject without reason + comment refused (AC-08)
- [ ] Hold with follow-up date → appears in owner's tasks (AC-09)
- [ ] Price change after Gate 4 re-opens Gate 1, Legal locked (AC-10)
- [ ] Finance can view all, act only on Gate 1 (AC-11)
- [ ] No edit/delete on gate decisions or activity log (AC-12)
- [ ] All deployment items ticked → hypercare day 1 of 30 (AC-13)
- [ ] Not Live until Finance signs handover (AC-14)
- [ ] Pipeline filters work (zone South 2 + channel Travel) (AC-15)
- [ ] Works at 360 px width; unusable buttons hidden, not greyed

---

## 13. Notes for Claude Code

- Start with `rules.ts` + tests, then store, then screens.
- Keep all copy in plain English, Indian formats (₹, en-IN, DD-MMM-YYYY).
- The Deal room is the hero screen — spend the most polish there.
- Add a small floating **"Demo controls"** panel (dev only): Reset demo · Simulate +1 day · Simulate +7 days · Simulate +30 days.
- Source documents: *V-Win Business Requirements Document* and *Gated BD Process SOP v1.0* (Vendiman, Nov 2026).
