"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { CHANNELS, CITIES, CUSTOMER_TYPES, LEAD_SOURCES, MACHINE_TYPES } from "@/lib/masters";
import { uid } from "@/lib/format";
import { toThumb } from "@/lib/image";
import { blankSite } from "@/lib/seed";
import type { Contact, MachineType, Site } from "@/lib/types";
import { dealHref } from "@/components/Shell";
import { Empty, Field, showResult, toast } from "@/components/ui";

const blankContact = (): Contact => ({ id: uid("c"), name: "", role: "", phone: "", email: "" });

export default function NewLeadPage() {
  const { role, deals, createLead } = useStore();
  const router = useRouter();
  const [c, setC] = useState({ clientName: "", gst: "", customerType: "Enterprise", channel: "Work", subChannel: "Corporate office", city: "Mumbai", leadSource: "Referral" });
  const [contacts, setContacts] = useState<Contact[]>([blankContact()]);
  const [sites, setSites] = useState<Site[]>([blankSite({ name: "Site 1" })]);
  const [ackDup, setAckDup] = useState(false);
  const zone = CITIES[c.city];

  const dup = useMemo(() => {
    const n = c.clientName.trim().toLowerCase();
    const g = c.gst.trim().toUpperCase();
    if (!n || !g) return undefined;
    return deals.find((d) => d.client.name.toLowerCase() === n && d.city === c.city && d.client.gst.toUpperCase() === g);
  }, [deals, c.clientName, c.gst, c.city]);

  if (role !== "BD")
    return <Empty>Only Business Development can create leads. Switch role to Business Development (top-right).</Empty>;

  const upd = (k: keyof typeof c, v: string) => {
    setC((o) => ({ ...o, [k]: v, ...(k === "channel" ? { subChannel: CHANNELS[v][0] } : {}) }));
    setAckDup(false);
  };
  const updSite = (id: string, patch: Partial<Site>) => setSites((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updContact = (id: string, patch: Partial<Contact>) => setContacts((cs) => cs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const save = () => {
    if (!c.clientName.trim()) return toast.err("Client name is required.");
    if (!/^[0-9A-Z]{15}$/i.test(c.gst.trim())) return toast.err("GST number must be 15 characters.");
    if (!contacts[0].name.trim()) return toast.err("Add at least one contact.");
    if (sites.some((s) => !s.name.trim() || !s.address.trim())) return toast.err("Every site needs a name and address.");
    if (dup && !ackDup) return toast.err(`Possible duplicate: ${dup.client.name} (${dup.id}) already exists. Tick “Save anyway” to continue.`);
    const id = createLead({ ...c, zone, contacts: contacts.filter((x) => x.name.trim()), sites });
    showResult({ ok: true, msg: `Lead created — ${id} · Stage 1 · Cold` });
    router.push(dealHref(id));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-black">New lead</h1>
        <p className="text-sm text-charcoal/60">Stage 1 · Client profile. A Deal ID is created when you save.</p>
      </div>

      <section className="card space-y-4 p-4 md:p-5">
        <h2 className="font-black">Client</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Client name *">
            <input className="input" value={c.clientName} onChange={(e) => upd("clientName", e.target.value)} placeholder="e.g. Demo Co." />
          </Field>
          <Field label="GST number *">
            <input className="input uppercase" maxLength={15} value={c.gst} onChange={(e) => upd("gst", e.target.value)} placeholder="27AABCD1234E1Z5" />
          </Field>
          <Field label="Customer type">
            <select className="input" value={c.customerType} onChange={(e) => upd("customerType", e.target.value)}>
              {CUSTOMER_TYPES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Channel">
            <select className="input" value={c.channel} onChange={(e) => upd("channel", e.target.value)}>
              {Object.keys(CHANNELS).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Sub-channel">
            <select className="input" value={c.subChannel} onChange={(e) => upd("subChannel", e.target.value)}>
              {CHANNELS[c.channel].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Lead source">
            <select className="input" value={c.leadSource} onChange={(e) => upd("leadSource", e.target.value)}>
              {LEAD_SOURCES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="City">
            <select className="input" value={c.city} onChange={(e) => upd("city", e.target.value)}>
              {Object.keys(CITIES).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Zone" hint="Set from city">
            <input className="input bg-surface" value={zone} readOnly />
          </Field>
        </div>
        {dup && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm md:flex-row md:items-center">
            <AlertTriangle size={18} className="shrink-0 text-amber-700" />
            <div className="flex-1">
              <b>Possible duplicate client.</b> {dup.client.name} in {dup.city} with the same GST already exists as{" "}
              <a className="font-bold text-brand-deep underline" href={dealHref(dup.id)}>
                {dup.id}
              </a>
              .
            </div>
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" className="accent-brand" checked={ackDup} onChange={(e) => setAckDup(e.target.checked)} /> Save anyway
            </label>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black">Contacts</h2>
          <button className="btn-ghost" onClick={() => setContacts((cs) => [...cs, blankContact()])}>
            <Plus size={16} /> Add contact
          </button>
        </div>
        {contacts.map((x, i) => (
          <div key={x.id} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <input className="input" placeholder={`Name${i === 0 ? " *" : ""}`} value={x.name} onChange={(e) => updContact(x.id, { name: e.target.value })} />
            <input className="input" placeholder="Role" value={x.role} onChange={(e) => updContact(x.id, { role: e.target.value })} />
            <input className="input" placeholder="Phone" value={x.phone} onChange={(e) => updContact(x.id, { phone: e.target.value })} />
            <input className="input" placeholder="Email" value={x.email} onChange={(e) => updContact(x.id, { email: e.target.value })} />
            {contacts.length > 1 && (
              <button aria-label="Remove contact" className="btn-ghost" onClick={() => setContacts((cs) => cs.filter((y) => y.id !== x.id))}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black">Sites in scope</h2>
          <button className="btn-ghost" onClick={() => setSites((ss) => [...ss, blankSite({ name: `Site ${ss.length + 1}` })])}>
            <Plus size={16} /> Add site
          </button>
        </div>
        {sites.map((s) => (
          <div key={s.id} className="space-y-3 rounded-xl bg-surface p-3" data-testid="site-form">
            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <Field label="Site name *">
                <input className="input" value={s.name} onChange={(e) => updSite(s.id, { name: e.target.value })} />
              </Field>
              <Field label="Address *">
                <input className="input" value={s.address} onChange={(e) => updSite(s.id, { address: e.target.value })} placeholder="Building, area, city" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Footfall / day">
                <input type="number" min={0} className="input" value={s.footfall || ""} onChange={(e) => updSite(s.id, { footfall: Number(e.target.value) })} />
              </Field>
              <Field label="Machine points">
                <input type="number" min={1} className="input" value={s.machinePoints || ""} onChange={(e) => updSite(s.id, { machinePoints: Number(e.target.value) })} />
              </Field>
              <Field label="Machine type">
                <select className="input" value={s.machineType} onChange={(e) => updSite(s.id, { machineType: e.target.value as MachineType })}>
                  {MACHINE_TYPES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Branding allowed?">
                <select className="input" value={s.brandingAllowed ? "yes" : "no"} onChange={(e) => updSite(s.id, { brandingAllowed: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-line" />
              ))}
              <label className="btn-ghost cursor-pointer">
                <ImagePlus size={16} /> Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = [...(e.target.files ?? [])].slice(0, 4);
                    const thumbs = await Promise.all(files.map((f) => toThumb(f).catch(() => "")));
                    updSite(s.id, { photos: [...s.photos, ...thumbs.filter(Boolean)].slice(0, 6) });
                  }}
                />
              </label>
              {sites.length > 1 && (
                <button className="btn-ghost ml-auto text-rejected" onClick={() => setSites((ss) => ss.filter((x) => x.id !== s.id))}>
                  <Trash2 size={16} /> Remove site
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="sticky bottom-20 flex justify-end gap-2 md:bottom-4">
        <button className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button className="btn-primary px-6 shadow-lg" onClick={save} data-testid="save-lead">
          Save lead
        </button>
      </div>
    </div>
  );
}
