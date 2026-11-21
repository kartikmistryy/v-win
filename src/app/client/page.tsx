"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHANNELS, CITIES, COMPANIES, CONTACT_TIERS, CUSTOMER_TYPES, type Office } from "@/lib/masters";
import { daysPerMonth, estimateFootfall, missingFields, SIZING } from "@/lib/sizing";
import { uid } from "@/lib/format";
import { blankSite } from "@/lib/seed";
import type { Contact } from "@/lib/types";
import { Field, toast } from "@/components/ui";

const OTHER = "__other";
const STEPS = ["Company", "Business", "Footfall"];
const blankContacts = (): Contact[] => CONTACT_TIERS.map(({ tier }) => ({ id: uid("c"), tier, name: "", role: "", phone: "", email: "", city: "" }));

export default function ClientPortal() {
  const submitClientLead = useStore((s) => s.submitClientLead);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  // Step 1 — company
  const [pick, setPick] = useState("");
  const [manual, setManual] = useState({ name: "", gstin: "", customerType: "Enterprise", cities: [] as string[] });
  const [locations, setLocations] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>(blankContacts);
  // Step 2 — business
  const [channel, setChannel] = useState("");
  const [sub, setSub] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  // Step 3 — footfall
  const [editing, setEditing] = useState(false);
  const [own, setOwn] = useState({ daily: 0, monthly: 0 });

  const company = COMPANIES.find((c) => c.name === pick);
  const offices: Office[] = company ? company.offices : manual.cities.map((city) => ({ city, gstin: manual.gstin.toUpperCase() }));
  const est = estimateFootfall(channel, sub, values);

  const chooseCompany = (v: string) => {
    setPick(v);
    const c = COMPANIES.find((x) => x.name === v);
    setLocations(c ? c.offices.map((o) => o.city) : []);
    setContacts((cs) => cs.map((x) => ({ ...x, city: "" })));
  };
  const toggleLocation = (city: string) => {
    const next = locations.includes(city) ? locations.filter((c) => c !== city) : [...locations, city];
    setLocations(next);
    setContacts((cs) => cs.map((x) => (next.includes(x.city ?? "") ? x : { ...x, city: "" })));
  };
  const updContact = (i: number, patch: Partial<Contact>) => setContacts((cs) => cs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const step1Error = (): string | null => {
    if (!pick) return "Choose your company.";
    if (pick === OTHER) {
      if (!manual.name.trim()) return "Enter your company name.";
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/i.test(manual.gstin.trim())) return "Enter a valid 15-character GSTIN.";
      if (!manual.cities.length) return "Pick the cities where you have offices.";
    }
    if (!locations.length) return "Select at least one location.";
    for (const c of contacts) {
      if (!c.name.trim() || !c.role.trim()) return `${c.tier}: enter a name and designation.`;
      if (c.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").length !== 10) return `${c.tier}: enter a 10-digit phone number.`;
      if (!/^\S+@\S+\.\S+$/.test(c.email)) return `${c.tier}: enter a valid email.`;
      if (!c.city) return `${c.tier}: choose their city.`;
    }
    return null;
  };
  const step2Error = (): string | null => {
    if (!channel || !sub) return "Choose your channel and sub-channel.";
    const miss = missingFields(sub, values);
    return miss.length ? `Please answer: ${miss.join(", ")}.` : null;
  };

  const next = () => {
    const err = step === 0 ? step1Error() : step2Error();
    if (err) return toast.err(err);
    if (step === 1) {
      setOwn(est);
      setEditing(false);
    }
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = () => {
    const daily = editing ? own.daily : est.daily;
    const monthly = editing ? own.monthly : est.monthly;
    if (!(daily > 0) || !(monthly > 0)) return toast.err("Daily and monthly footfall must be more than 0.");
    const primary = offices.find((o) => o.city === locations[0])!;
    const id = submitClientLead({
      clientName: company?.name ?? manual.name.trim(),
      gst: primary.gstin,
      customerType: company?.customerType ?? manual.customerType,
      contacts,
      channel,
      subChannel: sub,
      zone: CITIES[locations[0]],
      city: locations[0],
      leadSource: "Client portal",
      locations,
      sizing: { values, dailyCalc: est.daily, monthlyCalc: est.monthly, daily, monthly, edited: daily !== est.daily || monthly !== est.monthly },
      // one site per office in scope; BD replaces this with the real survey at Stage 2
      sites: locations.map((city) => blankSite({ name: `${city} office`, address: city, footfall: Math.round(daily / locations.length) })),
    });
    setDone(id);
  };

  if (done)
    return (
      <div className="card space-y-3 p-6 text-center md:p-10">
        <CheckCircle2 size={48} className="mx-auto text-cleared" />
        <h1 className="text-2xl font-black">Thank you, we&apos;ve got it</h1>
        <p className="text-charcoal/70">
          Your reference number is <b data-testid="client-ref">{done}</b>. Our Business Development team will contact {contacts[0].name} within 1 working day.
        </p>
        <button
          className="btn-ghost"
          onClick={() => {
            setDone(null);
            setStep(0);
            chooseCompany("");
            setContacts(blankContacts());
            setChannel("");
            setSub("");
            setValues({});
          }}
        >
          Submit another enquiry
        </button>
      </div>
    );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black md:text-3xl">Bring smart vending to your premises</h1>
        <p className="text-sm text-charcoal/60">Tell us about your company and premises. It takes about 3 minutes.</p>
      </div>

      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
            <div className={`mt-1.5 text-xs font-bold ${i === step ? "text-brand-deep" : "text-charcoal/50"}`}>
              {i + 1}. {label}
            </div>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <section className="card space-y-4 p-4 md:p-5">
            <h2 className="font-black">Your company</h2>
            <Field label="Company name *">
              <select className="input" value={pick} onChange={(e) => chooseCompany(e.target.value)} data-testid="company">
                <option value="">Select your company…</option>
                {COMPANIES.map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
                <option value={OTHER}>My company isn&apos;t listed</option>
              </select>
            </Field>

            {pick === OTHER && (
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Company name *">
                  <input className="input" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
                </Field>
                <Field label="GSTIN *">
                  <input className="input uppercase" maxLength={15} value={manual.gstin} onChange={(e) => setManual({ ...manual, gstin: e.target.value })} placeholder="27AABCD1234E1Z5" />
                </Field>
                <Field label="Company size">
                  <select className="input" value={manual.customerType} onChange={(e) => setManual({ ...manual, customerType: e.target.value })}>
                    {CUSTOMER_TYPES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <fieldset className="md:col-span-3">
                  <legend className="label">Cities where you have offices *</legend>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(CITIES).map((city) => {
                      const on = manual.cities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            const cities = on ? manual.cities.filter((c) => c !== city) : [...manual.cities, city];
                            setManual({ ...manual, cities });
                            setLocations(cities);
                          }}
                          className={`chip px-3 py-1.5 text-sm ${on ? "bg-brand text-white" : "bg-surface text-charcoal ring-1 ring-line"}`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            )}

            {company && (
              <div className="rounded-xl bg-surface p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-charcoal/60">
                  <Building2 size={14} /> Fetched from GST records · {company.offices.length} registered offices
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-charcoal/50">
                      <th className="pb-1 font-bold">City</th>
                      <th className="pb-1 font-bold">GSTIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.offices.map((o) => (
                      <tr key={o.city} className="border-t border-line">
                        <td className="py-1.5">{o.city}</td>
                        <td className="py-1.5 font-mono text-xs" data-testid="gstin">
                          {o.gstin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {offices.length > 0 && (
              <fieldset>
                <legend className="label">Locations interested in vending *</legend>
                <div className="flex flex-wrap gap-2">
                  {offices.map(({ city }) => {
                    const on = locations.includes(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleLocation(city)}
                        className={`chip px-3 py-1.5 text-sm ${on ? "bg-brand text-white" : "bg-surface text-charcoal ring-1 ring-line"}`}
                      >
                        {on && <Check size={14} />} {city}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </section>

          <section className="card space-y-3 p-4 md:p-5">
            <div>
              <h2 className="font-black">Points of contact</h2>
              <p className="text-xs text-charcoal/60">Three people, from senior to day-to-day, each tied to the city they work from.</p>
            </div>
            {contacts.map((c, i) => (
              <fieldset key={c.id} className="space-y-2 rounded-xl bg-surface p-3">
                <legend className="sr-only">{c.tier}</legend>
                <div className="text-sm font-black">
                  {i + 1}. {c.tier} <span className="font-normal text-charcoal/50">· {CONTACT_TIERS[i].hint}</span>
                </div>
                <div className="grid gap-2 md:grid-cols-5">
                  <input className="input" aria-label={`${c.tier} name`} placeholder="Full name *" value={c.name} onChange={(e) => updContact(i, { name: e.target.value })} />
                  <input className="input" aria-label={`${c.tier} designation`} placeholder="Designation *" value={c.role} onChange={(e) => updContact(i, { role: e.target.value })} />
                  <input className="input" aria-label={`${c.tier} phone`} type="tel" inputMode="tel" placeholder="Phone *" value={c.phone} onChange={(e) => updContact(i, { phone: e.target.value })} />
                  <input className="input" aria-label={`${c.tier} email`} type="email" placeholder="Email *" value={c.email} onChange={(e) => updContact(i, { email: e.target.value })} />
                  <select className="input" aria-label={`${c.tier} city`} value={c.city} onChange={(e) => updContact(i, { city: e.target.value })} disabled={!locations.length}>
                    <option value="">{locations.length ? "City *" : "Select locations first"}</option>
                    {locations.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </fieldset>
            ))}
          </section>
        </>
      )}

      {step === 1 && (
        <section className="card space-y-4 p-4 md:p-5">
          <h2 className="font-black">Your business</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Channel *">
              <select
                className="input"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value);
                  setSub("");
                  setValues({});
                }}
                data-testid="channel"
              >
                <option value="">Select…</option>
                {Object.keys(CHANNELS).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-channel *">
              <select
                className="input"
                value={sub}
                disabled={!channel}
                onChange={(e) => {
                  setSub(e.target.value);
                  setValues({});
                }}
                data-testid="subchannel"
              >
                <option value="">{channel ? "Select…" : "Choose a channel first"}</option>
                {(CHANNELS[channel] ?? []).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
          </div>

          {sub && (
            <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-2">
              {SIZING[sub].fields.map((f) => (
                <Field key={f.key} label={`${f.label} *`}>
                  {f.kind === "range" ? (
                    <select
                      className="input"
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues(setVal(values, f.key, e.target.value))}
                    >
                      <option value="">Select a range…</option>
                      {f.buckets.map((b, i) => (
                        <option key={b.label} value={i}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input"
                      min={f.min}
                      max={f.max}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues(setVal(values, f.key, e.target.value, f.min, f.max))}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="card space-y-4 p-4 md:p-5">
          <div>
            <h2 className="font-black">Estimated footfall</h2>
            <p className="text-sm text-charcoal/60">
              Based on your answers for {sub} ({channel}). This helps us size the right number of machines.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Average daily footfall" value={est.daily} />
            <Stat label="Average monthly footfall" value={est.monthly} />
          </div>
          <p className="rounded-lg bg-surface px-3 py-2 text-xs text-charcoal/60">
            How we worked it out: {SIZING[sub].formula}. Ranges use their midpoint. Monthly = daily × {daysPerMonth(channel)} days.
          </p>

          {!editing ? (
            <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-bold">Does this look right?</span>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditing(true)}>
                  <Pencil size={16} /> No, let me edit
                </button>
                <button className="btn-primary" onClick={submit} data-testid="submit-client">
                  <Check size={16} /> Yes, submit
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 border-t border-line pt-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Your daily footfall *">
                  <input type="number" min={1} className="input" value={own.daily || ""} onChange={(e) => setOwn({ ...own, daily: Math.max(0, Math.round(Number(e.target.value))) })} />
                </Field>
                <Field label="Your monthly footfall *">
                  <input type="number" min={1} className="input" value={own.monthly || ""} onChange={(e) => setOwn({ ...own, monthly: Math.max(0, Math.round(Number(e.target.value))) })} />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setOwn(est);
                    setEditing(false);
                  }}
                >
                  Use our estimate
                </button>
                <button className="btn-primary" onClick={submit} data-testid="submit-client">
                  <Check size={16} /> Submit
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex justify-between gap-2">
        {step > 0 ? (
          <button className="btn-ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}
        {step < 2 && (
          <button className="btn-primary px-6" onClick={next} data-testid="client-next">
            Continue <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function setVal(values: Record<string, number>, key: string, raw: string, min?: number, max?: number) {
  const out = { ...values };
  if (raw === "") delete out[key];
  else {
    let n = Math.round(Number(raw));
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    out[key] = n;
  }
  return out;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-peach-soft p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-charcoal/60">{label}</div>
      <div className="mt-1 text-3xl font-black text-brand-deep">{value.toLocaleString("en-IN")}</div>
      <div className="text-xs text-charcoal/50">people</div>
    </div>
  );
}
