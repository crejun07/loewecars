import { ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, LayoutGrid, Table as TableIcon, Pencil, Trash2, Search, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { QuickStatusToggle } from "@/components/shared/QuickStatusToggle";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { AppraisalPhotos } from "@/components/shared/AppraisalPhotos";
import { OnlineAppraisals } from "@/components/appraisals/OnlineAppraisals";
import { useAppraisals, useClients } from "@/hooks/data/useDealership";
import { appraisalStatusLabels, appraisalStatusOrder, appraisalStatusTone, employees, formatCurrency, formatDate, fuelTypeLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const empty: any = {
  client_id: "",
  contact_name: "", contact_phone: "", contact_email: "",
  operation_type: "venta",
  brand: "", model: "", year: "", mileage: "",
  fuel_type: "gasoline", fuel_other: "",
  transmission: "manual",
  color: "", metallic: null, doors: "",
  license_plate: "", first_registration_date: "",
  displacement: "", horsepower: "",
  climate_control: "",
  service_manual: null, service_history: null, service_seal: null, has_invoices: null,
  timing_belt_done: null, timing_belt_invoice: null,
  clutch_done: null, clutch_invoice: null,
  upholstery: "",
  keys_count: null,
  anti_theft: null, parcel_shelf: null, spare_wheel: null,
  heated_seats: null, multifunction_steering: null,
  navigator: null, bluetooth: null, sunroof: null,
  led_xenon: "",
  rear_camera: null, front_camera: null, camera_360: null,
  electric_seats: null, alloy_wheels: null,
  drive_type: "",
  industrial_type: "", body_type: "",
  tires_front: "", tires_rear: "",
  interior_steering: "", interior_knob: "", interior_seats: "",
  vehicle_condition: "",
  appraisal_value: "", workshop_value: "",
  estimated_price: "", offered_price: "",
  assigned_to: "",
  deal_status: "pending",
  follow_up_date: "",
  notes: "",
};

const operationOptions = [
  { value: "venta", label: "Venta" },
  { value: "cambio", label: "Cambio" },
  { value: "deposito", label: "Depósito" },
];
const bodyOptions = [
  { value: "berlina", label: "Berlina" },
  { value: "coupe", label: "Coupé" },
  { value: "familiar", label: "Familiar" },
  { value: "suv", label: "SUV" },
  { value: "monovolumen", label: "Monovolumen" },
  { value: "cabrio", label: "Cabrio" },
];
const industrialOptions = [
  { value: "furgon_l2h2", label: "Furgón L2H2" },
  { value: "furgon_l3h3", label: "Furgón L3H3" },
  { value: "mixto_6", label: "Mixto 6" },
  { value: "mixto_9", label: "Mixto 9" },
  { value: "combi_6", label: "Combi 6" },
  { value: "combi_9", label: "Combi 9" },
];
const climateOptions = [
  { value: "aire", label: "Aire acondicionado" },
  { value: "clima", label: "Climatizador" },
  { value: "ninguno", label: "Ninguno" },
];
const upholsteryOptions = [
  { value: "tela", label: "Tela" },
  { value: "piel", label: "Piel" },
  { value: "mix", label: "Mixta" },
];
const ledXenonOptions = [
  { value: "led", label: "LED" },
  { value: "xenon", label: "Xenón" },
  { value: "halogeno", label: "Halógeno" },
];
const driveOptions = [
  { value: "4x2", label: "4x2" },
  { value: "4x4", label: "4x4" },
];
const interiorOptions = [
  { value: "B", label: "Bueno" },
  { value: "M", label: "Malo" },
];
const keysOptions = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

// ---- Click-friendly inputs ----
function PillGroup<T extends string | number | null>({
  value, onChange, options, allowClear = true,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; allowClear?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={String(o.value)}
            onClick={() => onChange(allowClear && active ? (null as any) : o.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <PillGroup
      value={value as any}
      onChange={onChange as any}
      options={[{ value: true as any, label: "Sí" }, { value: false as any, label: "No" }]}
    />
  );
}

function Row({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "col-span-full")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function AppraisalsPage() {
  const { data: appraisals = [] } = useAppraisals();
  const { data: clients = [] } = useClients();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [tab, setTab] = useState<"store" | "online">("store");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [printing, setPrinting] = useState<any | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);

  const clientById = useMemo(() => {
    const m = new Map<string, any>();
    (clients as any[]).forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const filteredAppraisals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appraisals as any[];
    return (appraisals as any[]).filter((a) => {
      const c = a.client_id ? clientById.get(a.client_id) : null;
      const hay = [
        a.contact_name, a.contact_phone, a.contact_email,
        c?.full_name, c?.dni, c?.phone, c?.email,
        a.brand, a.model, a.license_plate,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [appraisals, query, clientById]);

  function openNew() { setEditing(null); setForm(empty); setPhotos([]); setOpen(true); }
  function openEdit(a: any) {
    setEditing(a);
    const merged: any = { ...empty };
    for (const [k, v] of Object.entries(a)) {
      if (v === null || v === undefined) continue;
      merged[k] = v;
    }
    setForm(merged);
    setPhotos(Array.isArray(a.photos) ? a.photos : []);
    setOpen(true);
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const num = (v: any) => (v === "" || v === null || v === undefined ? null : Number(v));
      const text = (v: any) => (v === "" || v === null || v === undefined ? null : v);
      const offered = num(form.offered_price);
      // Auto-status: si hay precio ofrecido y sigue pendiente -> oferta enviada
      let deal_status = form.deal_status || "pending";
      if (offered != null && deal_status === "pending") deal_status = "offer_sent";
      if (offered == null && deal_status === "offer_sent") deal_status = "pending";

      const payload: any = {
        client_id: text(form.client_id),
        contact_name: text(form.contact_name),
        contact_phone: text(form.contact_phone),
        contact_email: text(form.contact_email),
        operation_type: text(form.operation_type),
        brand: form.brand, model: form.model,
        year: num(form.year), mileage: num(form.mileage),
        fuel_type: form.fuel_type, fuel_other: text(form.fuel_other),
        transmission: form.transmission,
        color: text(form.color), metallic: form.metallic, doors: num(form.doors),
        license_plate: text(form.license_plate),
        first_registration_date: text(form.first_registration_date),
        displacement: num(form.displacement),
        horsepower: num(form.horsepower),
        climate_control: text(form.climate_control),
        service_manual: form.service_manual, service_history: form.service_history,
        service_seal: form.service_seal, has_invoices: form.has_invoices,
        timing_belt_done: form.timing_belt_done, timing_belt_invoice: form.timing_belt_invoice,
        clutch_done: form.clutch_done, clutch_invoice: form.clutch_invoice,
        upholstery: text(form.upholstery),
        keys_count: form.keys_count ?? null,
        anti_theft: form.anti_theft, parcel_shelf: form.parcel_shelf, spare_wheel: form.spare_wheel,
        heated_seats: form.heated_seats, multifunction_steering: form.multifunction_steering,
        navigator: form.navigator, bluetooth: form.bluetooth, sunroof: form.sunroof,
        led_xenon: text(form.led_xenon),
        rear_camera: form.rear_camera, front_camera: form.front_camera, camera_360: form.camera_360,
        electric_seats: form.electric_seats, alloy_wheels: form.alloy_wheels,
        drive_type: text(form.drive_type),
        industrial_type: text(form.industrial_type), body_type: text(form.body_type),
        tires_front: text(form.tires_front), tires_rear: text(form.tires_rear),
        interior_steering: text(form.interior_steering),
        interior_knob: text(form.interior_knob),
        interior_seats: text(form.interior_seats),
        vehicle_condition: text(form.vehicle_condition),
        appraisal_value: num(form.appraisal_value),
        workshop_value: num(form.workshop_value),
        estimated_price: num(form.estimated_price),
        offered_price: offered,
        assigned_to: text(form.assigned_to),
        deal_status,
        follow_up_date: text(form.follow_up_date),
        notes: text(form.notes),
      };
      const { error } = editing
        ? await supabase.from("vehicle_appraisals").update(payload).eq("id", editing.id)
        : await supabase.from("vehicle_appraisals").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Tasación guardada");
      qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("vehicle_appraisals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }
  async function removeCurrent() {
    if (!editing) return;
    if (!confirm("¿Eliminar esta tasación? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("vehicle_appraisals").delete().eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tasación eliminada");
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
    setOpen(false);
  }
  async function quickUpdateStatus(id: string, status: string) {
    const { error } = await supabase.from("vehicle_appraisals").update({ deal_status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }
  const set = (k: string, v: any) => setForm((f: any) => {
    const next = { ...f, [k]: v };
    // Auto-fill year from 1ª matriculación
    if (k === "first_registration_date" && typeof v === "string" && v.length >= 4) {
      const y = Number(v.slice(0, 4));
      if (!Number.isNaN(y) && y > 1900 && y < 2100) next.year = y;
    }
    return next;
  });

  // Print root portal
  useEffect(() => {
    if (!printing) return;
    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      root.style.display = "none";
      document.body.appendChild(root);
    }
    return () => {
      const el = document.getElementById("print-root");
      if (el) el.remove();
    };
  }, [printing]);
  const printRoot = typeof document !== "undefined" ? document.getElementById("print-root") : null;

  function printCurrent() {
    setPrinting({ ...form, id: editing?.id, appraisal_number: editing?.appraisal_number, appraisal_date: editing?.appraisal_date });
    setTimeout(() => window.print(), 100);
  }

  return (
    <div>
      <PageHeader
        title="Tasaciones de vehículos"
        description="Vehículos que los clientes quieren vendernos"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={tab === "store" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setTab("store")}>Tienda</Button>
              <Button size="sm" variant={tab === "online" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setTab("online")}>Online</Button>
            </div>
            {tab === "store" && (
            <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("table")}><TableIcon className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva tasación</Button>
            </>
            )}
          </>
        }
      />
      <div className="p-6">
        {tab === "online" ? <OnlineAppraisals /> : (
        <>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, DNI, teléfono, matrícula…"
              className="pl-9"
            />
          </div>
          {query && <span className="text-xs text-muted-foreground">{filteredAppraisals.length} resultados</span>}
        </div>
        {view === "kanban" ? (
          <KanbanBoard
            columns={appraisalStatusOrder.map((s) => ({ id: s, title: appraisalStatusLabels[s], count: filteredAppraisals.filter((a: any) => a.deal_status === s).length }))}
            renderCards={(col) =>
              filteredAppraisals.filter((a: any) => a.deal_status === col).map((a: any) => (
                <div key={a.id} className="group relative">
                <button onClick={() => openEdit(a)} className="w-full rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20">
                  <div className="text-sm font-medium">{a.brand} {a.model}</div>
                  <div className="text-xs text-muted-foreground">{a.client?.full_name ?? "Cliente desconocido"}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{a.year ?? "—"}</span>
                    <span className="font-medium">{formatCurrency(a.offered_price ?? a.estimated_price)}</span>
                  </div>
                  {(a.transmission || a.assigned_to) && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{a.transmission ? transmissionLabels[a.transmission] : ""}</span>
                      {a.assigned_to && <span>· {a.assigned_to}</span>}
                    </div>
                  )}
                  {a.follow_up_date && <div className="mt-1 text-[11px] text-muted-foreground">Seguimiento {formatDate(a.follow_up_date)}</div>}
                  <div className="mt-2">
                    <QuickStatusToggle
                      status={a.deal_status}
                      order={appraisalStatusOrder}
                      labels={appraisalStatusLabels}
                      tones={appraisalStatusTone}
                      onChange={(next) => quickUpdateStatus(a.id, next)}
                    />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(a.id); }}
                  className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Eliminar tasación"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                </div>
              ))
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Vehículo</th><th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Estimado</th><th className="px-4 py-2.5 font-medium">Ofrecido</th>
                <th className="px-4 py-2.5 font-medium">Estado</th><th className="px-4 py-2.5 font-medium">Responsable</th><th className="px-4 py-2.5 font-medium">Seguimiento</th><th></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {filteredAppraisals.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{a.brand} {a.model} <span className="text-muted-foreground">{a.year ?? ""}</span></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.client?.full_name ?? "—"}</td>
                    <td className="px-4 py-2.5">{formatCurrency(a.estimated_price)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(a.offered_price)}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={appraisalStatusLabels[a.deal_status]} tone={appraisalStatusTone[a.deal_status]} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.assigned_to ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(a.follow_up_date)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{editing ? `Tasación nº ${editing.appraisal_number ?? "—"}` : "Nueva tasación"}</DialogTitle>
              <div className="text-xs text-muted-foreground">
                {editing
                  ? `Fecha: ${formatDate(editing.appraisal_date)}`
                  : `Nº y fecha asignados al guardar (${new Date().toLocaleDateString("es-ES")})`}
              </div>
            </div>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); save(); }}
          >
            <Section title="Datos personales">
              <Row label="Cliente existente (opcional)" full>
                <SearchableSelect
                  value={form.client_id}
                  onChange={(v) => {
                    const c = clients.find((x: any) => x.id === v);
                    setForm((f: any) => ({
                      ...f,
                      client_id: v,
                      contact_name: c?.full_name || f.contact_name,
                      contact_phone: c?.phone || f.contact_phone,
                      contact_email: c?.email || f.contact_email,
                    }));
                  }}
                  options={clients.map((c: any) => ({
                    value: c.id, label: c.full_name,
                    hint: [c.dni, c.phone].filter(Boolean).join(" · "),
                  }))}
                  placeholder="Buscar cliente…"
                  searchPlaceholder="Nombre, DNI o teléfono"
                  emptyText="Sin clientes"
                />
              </Row>
              <Row label="Nombre"><Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Nombre completo" /></Row>
              <Row label="Teléfono"><Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="600 000 000" /></Row>
              <Row label="Correo" full><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="email@ejemplo.com" /></Row>
              <Row label="Tipo de operación" full>
                <PillGroup value={form.operation_type} onChange={(v) => set("operation_type", v)} options={operationOptions} />
              </Row>
            </Section>

            <Section title="Vehículo">
              <Row label="Marca"><Input required value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Row>
              <Row label="Modelo exacto"><Input required value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Ej. Golf 1.6 TDI Advance" /></Row>
              <Row label="Matrícula"><Input value={form.license_plate} onChange={(e) => set("license_plate", e.target.value.toUpperCase())} /></Row>
              <Row label="Fecha 1ª matriculación"><Input type="date" value={form.first_registration_date} onChange={(e) => set("first_registration_date", e.target.value)} /></Row>
              <Row label="Año"><Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} /></Row>
              <Row label="Kilómetros"><Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} /></Row>
              <Row label="Cilindrada (cc)"><Input type="number" value={form.displacement} onChange={(e) => set("displacement", e.target.value)} /></Row>
              <Row label="CV"><Input type="number" value={form.horsepower} onChange={(e) => set("horsepower", e.target.value)} /></Row>
              <Row label="Color"><Input value={form.color} onChange={(e) => set("color", e.target.value)} /></Row>
              <Row label="¿Metalizado?"><YesNo value={form.metallic} onChange={(v) => set("metallic", v)} /></Row>
              <Row label="Puertas">
                <PillGroup value={form.doors === "" ? null : Number(form.doors)} onChange={(v) => set("doors", v ?? "")} options={[3,4,5].map(n => ({ value: n, label: String(n) }))} />
              </Row>
              <Row label="Combustible" full>
                <PillGroup
                  value={form.fuel_type}
                  onChange={(v) => set("fuel_type", v ?? "gasoline")}
                  allowClear={false}
                  options={Object.entries(fuelTypeLabels).map(([k, v]) => ({ value: k, label: v }))}
                />
              </Row>
              {form.fuel_type === "other" && (
                <Row label="Combustible (especifica)" full><Input value={form.fuel_other} onChange={(e) => set("fuel_other", e.target.value)} /></Row>
              )}
              <Row label="Cambio">
                <PillGroup
                  value={form.transmission}
                  onChange={(v) => set("transmission", v ?? "manual")}
                  allowClear={false}
                  options={Object.entries(transmissionLabels).map(([k, v]) => ({ value: k, label: v }))}
                />
              </Row>
              <Row label="Tracción">
                <PillGroup value={form.drive_type} onChange={(v) => set("drive_type", v ?? "")} options={driveOptions} />
              </Row>
              <Row label="Carrocería" full>
                <PillGroup value={form.body_type} onChange={(v) => set("body_type", v ?? "")} options={bodyOptions} />
              </Row>
              <Row label="Industrial (si aplica)" full>
                <PillGroup value={form.industrial_type} onChange={(v) => set("industrial_type", v ?? "")} options={industrialOptions} />
              </Row>
            </Section>

            <Section title="Mantenimiento y mecánica">
              <Row label="Climatización" full>
                <PillGroup value={form.climate_control} onChange={(v) => set("climate_control", v ?? "")} options={climateOptions} />
              </Row>
              <Row label="Libro manual"><YesNo value={form.service_manual} onChange={(v) => set("service_manual", v)} /></Row>
              <Row label="Libro revisiones"><YesNo value={form.service_history} onChange={(v) => set("service_history", v)} /></Row>
              <Row label="Sello taller"><YesNo value={form.service_seal} onChange={(v) => set("service_seal", v)} /></Row>
              <Row label="Facturas"><YesNo value={form.has_invoices} onChange={(v) => set("has_invoices", v)} /></Row>
              <Row label="Distribución hecha"><YesNo value={form.timing_belt_done} onChange={(v) => set("timing_belt_done", v)} /></Row>
              <Row label="Factura distribución"><YesNo value={form.timing_belt_invoice} onChange={(v) => set("timing_belt_invoice", v)} /></Row>
              <Row label="Embrague hecho"><YesNo value={form.clutch_done} onChange={(v) => set("clutch_done", v)} /></Row>
              <Row label="Factura embrague"><YesNo value={form.clutch_invoice} onChange={(v) => set("clutch_invoice", v)} /></Row>
            </Section>

            <Section title="Equipamiento">
              <Row label="Tapicería" full>
                <PillGroup value={form.upholstery} onChange={(v) => set("upholstery", v ?? "")} options={upholsteryOptions} />
              </Row>
              <Row label="Llaves">
                <PillGroup value={form.keys_count} onChange={(v) => set("keys_count", v)} options={keysOptions} />
              </Row>
              <Row label="Antirrobo"><YesNo value={form.anti_theft} onChange={(v) => set("anti_theft", v)} /></Row>
              <Row label="Bandeja"><YesNo value={form.parcel_shelf} onChange={(v) => set("parcel_shelf", v)} /></Row>
              <Row label="Rueda de repuesto"><YesNo value={form.spare_wheel} onChange={(v) => set("spare_wheel", v)} /></Row>
              <Row label="Asientos calefactables"><YesNo value={form.heated_seats} onChange={(v) => set("heated_seats", v)} /></Row>
              <Row label="Volante multifunción"><YesNo value={form.multifunction_steering} onChange={(v) => set("multifunction_steering", v)} /></Row>
            </Section>

            <Section title="Extras">
              <Row label="Navegador"><YesNo value={form.navigator} onChange={(v) => set("navigator", v)} /></Row>
              <Row label="Bluetooth"><YesNo value={form.bluetooth} onChange={(v) => set("bluetooth", v)} /></Row>
              <Row label="Techo solar"><YesNo value={form.sunroof} onChange={(v) => set("sunroof", v)} /></Row>
              <Row label="Iluminación">
                <PillGroup value={form.led_xenon} onChange={(v) => set("led_xenon", v ?? "")} options={ledXenonOptions} />
              </Row>
              <Row label="Cámara trasera"><YesNo value={form.rear_camera} onChange={(v) => set("rear_camera", v)} /></Row>
              <Row label="Cámara delantera"><YesNo value={form.front_camera} onChange={(v) => set("front_camera", v)} /></Row>
              <Row label="Cámara 360"><YesNo value={form.camera_360} onChange={(v) => set("camera_360", v)} /></Row>
              <Row label="Asientos eléctricos"><YesNo value={form.electric_seats} onChange={(v) => set("electric_seats", v)} /></Row>
              <Row label="Llantas de aluminio"><YesNo value={form.alloy_wheels} onChange={(v) => set("alloy_wheels", v)} /></Row>
            </Section>

            <Section title="Estado interior y neumáticos">
              <Row label="Volante">
                <PillGroup value={form.interior_steering} onChange={(v) => set("interior_steering", v ?? "")} options={interiorOptions} />
              </Row>
              <Row label="Pomo">
                <PillGroup value={form.interior_knob} onChange={(v) => set("interior_knob", v ?? "")} options={interiorOptions} />
              </Row>
              <Row label="Asientos">
                <PillGroup value={form.interior_seats} onChange={(v) => set("interior_seats", v ?? "")} options={interiorOptions} />
              </Row>
              <Row label="Neumáticos delanteros"><Input value={form.tires_front} onChange={(e) => set("tires_front", e.target.value)} placeholder="Marca / % vida" /></Row>
              <Row label="Neumáticos traseros"><Input value={form.tires_rear} onChange={(e) => set("tires_rear", e.target.value)} placeholder="Marca / % vida" /></Row>
              <Row label="Estado general del vehículo" full>
                <Input value={form.vehicle_condition} onChange={(e) => set("vehicle_condition", e.target.value)} placeholder="Excelente / Bueno / Regular…" />
              </Row>
            </Section>

            <Section title="Valoración">
              <Row label="Valor tasación (€)"><Input type="number" value={form.appraisal_value} onChange={(e) => set("appraisal_value", e.target.value)} /></Row>
              <Row label="Valor taller (€)"><Input type="number" value={form.workshop_value} onChange={(e) => set("workshop_value", e.target.value)} /></Row>
              <Row label="Precio estimado (€)"><Input type="number" value={form.estimated_price} onChange={(e) => set("estimated_price", e.target.value)} /></Row>
              <Row label="Precio ofrecido (€)">
                <Input type="number" value={form.offered_price} onChange={(e) => set("offered_price", e.target.value)} placeholder="Vacío = Pendiente" />
              </Row>
              <Row label="Estado de la operación">
                <Select value={form.deal_status} onValueChange={(v) => set("deal_status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(appraisalStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Row>
              <Row label="Responsable">
                <Select value={form.assigned_to || "none"} onValueChange={(v) => set("assigned_to", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sin asignar —</SelectItem>
                    {employees.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Fecha de seguimiento"><Input type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} /></Row>
              <Row label="Notas" full><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Row>
            </Section>

            <Section title="Fotos de la tasación">
              <div className="col-span-full">
                <AppraisalPhotos
                  appraisalId={editing?.id ?? null}
                  photos={photos}
                  onChange={setPhotos}
                />
              </div>
            </Section>

            <DialogFooter className="pt-2">
              {editing && (
                <>
                  <Button type="button" variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={removeCurrent}>
                    <Trash2 className="mr-1 h-4 w-4" />Eliminar
                  </Button>
                  <Button type="button" variant="outline" onClick={printCurrent}>
                    <Printer className="mr-1 h-4 w-4" />Imprimir
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar tasación"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {printing && printRoot && createPortal(<AppraisalSheet a={printing} client={printing.client_id ? clientById.get(printing.client_id) : null} />, printRoot)}
    </div>
  );
}

function Line({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-2 border-b border-neutral-300 py-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

function yn(v: any) { return v === true ? "Sí" : v === false ? "No" : "—"; }

function AppraisalSheet({ a, client }: { a: any; client: any }) {
  const name = a.contact_name || client?.full_name || "—";
  const phone = a.contact_phone || client?.phone || "—";
  const email = a.contact_email || client?.email || "—";
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", color: "#111", padding: "8mm", fontSize: 10, lineHeight: 1.25 }}>
      <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-2">
        <div>
          <div className="text-lg font-bold">Ficha de tasación</div>
          <div className="text-xs text-neutral-600">Orlando Cars · www.orlandocars.es · 961 475 660</div>
        </div>
        <div className="text-right text-xs">
          <div><b>Nº:</b> {a.appraisal_number ?? "—"}</div>
          <div><b>Fecha:</b> {formatDate(a.appraisal_date) || new Date().toLocaleDateString("es-ES")}</div>
          <div><b>Operación:</b> {operationOptions.find(o => o.value === a.operation_type)?.label ?? "—"}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Cliente</h4>
          <Line label="Nombre" value={name} />
          <Line label="Teléfono" value={phone} />
          <Line label="Correo" value={email} />
          {client?.dni && <Line label="DNI" value={client.dni} />}
        </section>
        <section className="col-span-2">
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Vehículo</h4>
          <div className="grid grid-cols-2 gap-x-4">
            <Line label="Marca" value={a.brand} />
            <Line label="Modelo" value={a.model} />
            <Line label="Matrícula" value={a.license_plate} />
            <Line label="1ª matriculación" value={formatDate(a.first_registration_date)} />
            <Line label="Año" value={a.year} />
            <Line label="Kilómetros" value={a.mileage ? `${Number(a.mileage).toLocaleString("es-ES")} km` : "—"} />
            <Line label="Combustible" value={a.fuel_type ? (fuelTypeLabels[a.fuel_type] ?? a.fuel_type) : "—"} />
            <Line label="Cambio" value={a.transmission ? transmissionLabels[a.transmission] : "—"} />
            <Line label="Cilindrada" value={a.displacement ? `${a.displacement} cc` : "—"} />
            <Line label="Potencia" value={a.horsepower ? `${a.horsepower} CV` : "—"} />
            <Line label="Color" value={a.color} />
            <Line label="Puertas" value={a.doors} />
          </div>
        </section>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Mantenimiento</h4>
          <Line label="Libro manual" value={yn(a.service_manual)} />
          <Line label="Libro revisiones" value={yn(a.service_history)} />
          <Line label="Sello taller" value={yn(a.service_seal)} />
          <Line label="Facturas" value={yn(a.has_invoices)} />
          <Line label="Distribución" value={yn(a.timing_belt_done)} />
          <Line label="Fact. distribución" value={yn(a.timing_belt_invoice)} />
          <Line label="Embrague" value={yn(a.clutch_done)} />
          <Line label="Fact. embrague" value={yn(a.clutch_invoice)} />
        </section>
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Equipamiento</h4>
          <Line label="Tapicería" value={a.upholstery} />
          <Line label="Llaves" value={a.keys_count} />
          <Line label="Antirrobo" value={yn(a.anti_theft)} />
          <Line label="Bandeja" value={yn(a.parcel_shelf)} />
          <Line label="Rueda repuesto" value={yn(a.spare_wheel)} />
          <Line label="Calefactables" value={yn(a.heated_seats)} />
          <Line label="Volante multif." value={yn(a.multifunction_steering)} />
          <Line label="Climatización" value={a.climate_control} />
        </section>
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Extras</h4>
          <Line label="Navegador" value={yn(a.navigator)} />
          <Line label="Bluetooth" value={yn(a.bluetooth)} />
          <Line label="Techo solar" value={yn(a.sunroof)} />
          <Line label="Iluminación" value={a.led_xenon} />
          <Line label="Cámara tras." value={yn(a.rear_camera)} />
          <Line label="Cámara del." value={yn(a.front_camera)} />
          <Line label="Cámara 360" value={yn(a.camera_360)} />
          <Line label="As. eléctricos" value={yn(a.electric_seats)} />
          <Line label="Llantas alu." value={yn(a.alloy_wheels)} />
        </section>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Estado</h4>
          <div className="grid grid-cols-2 gap-x-4">
            <Line label="Volante" value={a.interior_steering} />
            <Line label="Pomo" value={a.interior_knob} />
            <Line label="Asientos" value={a.interior_seats} />
            <Line label="Neum. delanteros" value={a.tires_front} />
            <Line label="Neum. traseros" value={a.tires_rear} />
            <Line label="Estado general" value={a.vehicle_condition} />
          </div>
        </section>
        <section>
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Valoración</h4>
          <Line label="Valor tasación" value={formatCurrency(a.appraisal_value)} />
          <Line label="Valor taller" value={formatCurrency(a.workshop_value)} />
          <Line label="Precio estimado" value={formatCurrency(a.estimated_price)} />
          <Line label="Precio ofrecido" value={formatCurrency(a.offered_price)} />
          <Line label="Responsable" value={a.assigned_to} />
          <Line label="Seguimiento" value={formatDate(a.follow_up_date)} />
        </section>
      </div>

      {a.notes && (
        <section className="mt-3">
          <h4 className="mb-1 text-[11px] font-bold uppercase text-neutral-700">Notas</h4>
          <p className="whitespace-pre-wrap text-[10px]">{a.notes}</p>
        </section>
      )}

      <div className="mt-4 grid grid-cols-2 gap-6 pt-3 text-[10px] text-neutral-600">
        <div>
          <div className="mb-8">Firma del cliente:</div>
          <div className="border-t border-neutral-800 pt-1">{name}</div>
        </div>
        <div>
          <div className="mb-8">Firma del tasador:</div>
          <div className="border-t border-neutral-800 pt-1">{a.assigned_to || "Orlando Cars"}</div>
        </div>
      </div>
    </div>
  );
}