import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, CalendarCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOnlineAppraisals } from "@/hooks/data/useDealership";
import {
  formatCurrency, formatDate, fuelTypeLabels,
  onlineAppraisalStatusLabels, onlineAppraisalStatusTone,
} from "@/lib/labels";
import { toast } from "sonner";

const empty: any = {
  reference: "", brand: "", model: "", version: "", vehicle_age: "", mileage: "",
  horsepower: "", fuel_type: "gasoline", market_value: "", offered_value: "",
  status: "pending", contact_name: "", contact_email: "", contact_phone: "",
  wants_appointment: false, appointment_date: "", notes: "",
};

export function OnlineAppraisals() {
  const { data: rows = [] } = useOnlineAppraisals();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows as any[]).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.reference, r.brand, r.model, r.version, r.contact_name, r.contact_phone, r.contact_email]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(r: any) {
    setEditing(r);
    const merged: any = { ...empty };
    for (const [k, v] of Object.entries(r)) if (v !== null && v !== undefined) merged[k] = v;
    merged.appointment_date = r.appointment_date ? String(r.appointment_date).slice(0, 16) : "";
    setForm(merged);
    setOpen(true);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const num = (v: any) => (v === "" || v === null || v === undefined ? null : Number(v));
      const text = (v: any) => (v === "" || v === null || v === undefined ? null : v);
      const payload: any = {
        reference: text(form.reference),
        brand: form.brand, model: form.model,
        version: text(form.version), vehicle_age: text(form.vehicle_age),
        mileage: num(form.mileage), horsepower: num(form.horsepower),
        fuel_type: form.fuel_type || null,
        market_value: num(form.market_value), offered_value: num(form.offered_value),
        status: form.status,
        contact_name: text(form.contact_name), contact_email: text(form.contact_email),
        contact_phone: text(form.contact_phone),
        wants_appointment: !!form.wants_appointment,
        appointment_date: form.appointment_date ? new Date(form.appointment_date).toISOString() : null,
        notes: text(form.notes),
      };
      const { error } = editing
        ? await supabase.from("online_appraisals").update(payload).eq("id", editing.id)
        : await supabase.from("online_appraisals").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Tasación online guardada");
      qc.invalidateQueries({ queryKey: ["online_appraisals"] });
      setOpen(false);
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta tasación online?")) return;
    const { error } = await supabase.from("online_appraisals").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["online_appraisals"] });
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("online_appraisals").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["online_appraisals"] });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ID, marca, modelo o contacto…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[190px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(onlineAppraisalStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva tasación online</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5 font-medium">ID</th>
            <th className="px-3 py-2.5 font-medium">Vehículo</th>
            <th className="px-3 py-2.5 font-medium">Antigüedad</th>
            <th className="px-3 py-2.5 font-medium">Km</th>
            <th className="px-3 py-2.5 font-medium">CV</th>
            <th className="px-3 py-2.5 font-medium">Combustible</th>
            <th className="px-3 py-2.5 font-medium">V. mercado</th>
            <th className="px-3 py-2.5 font-medium">V. ofrecido</th>
            <th className="px-3 py-2.5 font-medium">Contacto</th>
            <th className="px-3 py-2.5 font-medium">Cita</th>
            <th className="px-3 py-2.5 font-medium">Fecha</th>
            <th className="px-3 py-2.5 font-medium">Estado</th>
            <th></th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-10 text-center text-xs text-muted-foreground">Sin tasaciones online</td></tr>
            ) : filtered.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.reference ?? "—"}</td>
                <td className="px-3 py-2.5 font-medium">
                  {r.brand} {r.model}
                  {r.version && <span className="ml-1 text-xs text-muted-foreground">{r.version}</span>}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.vehicle_age ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.mileage ? Number(r.mileage).toLocaleString("es-ES") : "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.horsepower ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{r.fuel_type ? fuelTypeLabels[r.fuel_type] : "—"}</td>
                <td className="px-3 py-2.5">{formatCurrency(r.market_value)}</td>
                <td className="px-3 py-2.5">{formatCurrency(r.offered_value)}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{r.contact_name ?? "—"}</div>
                  <div>{r.contact_phone ?? ""}</div>
                  <div>{r.contact_email ?? ""}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {r.wants_appointment ? (
                    <span className="inline-flex items-center gap-1 text-status-blue-fg">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {r.appointment_date ? new Date(r.appointment_date).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "Sí"}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                <td className="px-3 py-2.5">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger className="h-7 w-[150px] border-none bg-transparent p-0 text-xs [&>svg]:ml-1">
                      <StatusBadge label={onlineAppraisalStatusLabels[r.status]} tone={onlineAppraisalStatusTone[r.status]} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(onlineAppraisalStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tasación online" : "Nueva tasación online"}</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <F label="ID / Referencia"><Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Ref. web" /></F>
            <F label="Estado">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(onlineAppraisalStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Marca"><Input required value={form.brand} onChange={(e) => set("brand", e.target.value)} /></F>
            <F label="Modelo"><Input required value={form.model} onChange={(e) => set("model", e.target.value)} /></F>
            <F label="Versión"><Input value={form.version} onChange={(e) => set("version", e.target.value)} /></F>
            <F label="Antigüedad"><Input value={form.vehicle_age} onChange={(e) => set("vehicle_age", e.target.value)} placeholder="Ej. 2018 · 6 años" /></F>
            <F label="Kilómetros"><Input type="number" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} /></F>
            <F label="Potencia (CV)"><Input type="number" value={form.horsepower} onChange={(e) => set("horsepower", e.target.value)} /></F>
            <F label="Combustible">
              <Select value={form.fuel_type} onValueChange={(v) => set("fuel_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Valor de mercado (€)"><Input type="number" value={form.market_value} onChange={(e) => set("market_value", e.target.value)} /></F>
            <F label="Valor ofrecido (€)"><Input type="number" value={form.offered_value} onChange={(e) => set("offered_value", e.target.value)} /></F>
            <F label="Nombre de contacto"><Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></F>
            <F label="Teléfono"><Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></F>
            <F label="Email"><Input type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></F>
            <F label="¿Solicita cita?">
              <div className="flex gap-1.5">
                {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map((o) => (
                  <button key={o.l} type="button" onClick={() => set("wants_appointment", o.v)}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${form.wants_appointment === o.v ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </F>
            {form.wants_appointment && (
              <F label="Fecha y hora de la cita">
                <Input type="datetime-local" value={form.appointment_date} onChange={(e) => set("appointment_date", e.target.value)} />
              </F>
            )}
            <div className="md:col-span-2">
              <F label="Notas"><Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></F>
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
