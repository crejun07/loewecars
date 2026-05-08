import { useState } from "react";
import { Plus, LayoutGrid, Calendar as CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { QuickStatusToggle } from "@/components/shared/QuickStatusToggle";
import { useClients, useSales, useStock, useEmployees } from "@/hooks/data/useDealership";
import { formatCurrency, formatDate, saleStatusLabels, saleStatusOrder, saleStatusTone } from "@/lib/labels";
import { toast } from "sonner";

const empty = { client_id: "", vehicle_id: "", customer_budget: "" as any, sale_status: "new_lead", next_contact_date: "", payment_method: "", notes: "", assigned_to: "" };

export default function SalesPage() {
  const { data: sales = [] } = useSales();
  const { data: clients = [] } = useClients();
  const { data: stock = [] } = useStock();
  const { data: employees = [] } = useEmployees();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      client_id: s.client_id ?? "", vehicle_id: s.vehicle_id ?? "",
      customer_budget: s.customer_budget ?? "", sale_status: s.sale_status,
      next_contact_date: s.next_contact_date ?? "", payment_method: s.payment_method ?? "", notes: s.notes ?? "",
      assigned_to: s.assigned_to ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      client_id: form.client_id || null,
      vehicle_id: form.vehicle_id || null,
      customer_budget: form.customer_budget === "" ? null : Number(form.customer_budget),
      next_contact_date: form.next_contact_date || null,
      assigned_to: form.assigned_to || null,
    };
    const { error } = editing
      ? await supabase.from("sales").update(payload).eq("id", editing.id)
      : await supabase.from("sales").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["sales"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("sales").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["sales"] });
  }
  async function quickUpdateStatus(id: string, status: string) {
    const { error } = await supabase.from("sales").update({ sale_status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["sales"] });
  }

  // Group sales with next_contact_date by month
  const upcoming = sales
    .filter((s: any) => s.next_contact_date)
    .sort((a: any, b: any) => a.next_contact_date.localeCompare(b.next_contact_date));

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Pipeline de compradores"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("calendar")}><CalendarIcon className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva venta</Button>
          </>
        }
      />
      <div className="p-6">
        {view === "kanban" ? (
          <KanbanBoard
            columns={saleStatusOrder.map((s) => ({ id: s, title: saleStatusLabels[s], count: sales.filter((x: any) => x.sale_status === s).length }))}
            renderCards={(col) =>
              sales.filter((s: any) => s.sale_status === col).map((s: any) => (
                <button key={s.id} onClick={() => openEdit(s)} className="rounded-md border border-border bg-card p-3 text-left hover:border-foreground/20">
                  <div className="text-sm font-medium">{s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : "Vehículo sin asignar"}</div>
                  <div className="text-xs text-muted-foreground">{s.client?.full_name ?? "—"}</div>
                  {s.assigned_to && <div className="mt-1 text-[11px] text-muted-foreground">Asignado: {s.assigned_to}</div>}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.payment_method || "—"}</span>
                    <span className="font-medium">{formatCurrency(s.customer_budget)}</span>
                  </div>
                  {s.next_contact_date && <div className="mt-1 text-[11px] text-muted-foreground">Próximo: {formatDate(s.next_contact_date)}</div>}
                  <div className="mt-2">
                    <QuickStatusToggle
                      status={s.sale_status}
                      order={saleStatusOrder}
                      labels={saleStatusLabels}
                      tones={saleStatusTone}
                      onChange={(next) => quickUpdateStatus(s.id, next)}
                    />
                  </div>
                </button>
              ))
            }
          />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">Próximos seguimientos</div>
            {upcoming.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">Sin seguimientos programados</div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map((s: any) => (
                  <button key={s.id} onClick={() => openEdit(s)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-muted text-center">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">{new Date(s.next_contact_date).toLocaleDateString("es-ES", { month: "short" })}</span>
                        <span className="text-sm font-bold leading-none">{new Date(s.next_contact_date).getDate()}</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.client?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : "Sin asignar"}</div>
                      </div>
                    </div>
                    <StatusBadge label={saleStatusLabels[s.sale_status]} tone={saleStatusTone[s.sale_status]} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RecordDialog open={open} onOpenChange={setOpen} trigger={null as any} title={editing ? "Editar venta" : "Nueva venta"} onSubmit={save}>
        <Field label="Cliente" full>
          <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vehículo de interés" full>
          <Select value={form.vehicle_id || "none"} onValueChange={(v) => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona vehículo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {stock.map((v: any) => {
                const meta = [v.year, v.license_plate].filter(Boolean).join(" - ");
                return <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}{meta ? ` (${meta})` : ""}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Presupuesto (€)"><Input type="number" value={form.customer_budget} onChange={(e) => setForm({ ...form, customer_budget: e.target.value })} /></Field>
        <Field label="Estado">
          <Select value={form.sale_status} onValueChange={(v) => setForm({ ...form, sale_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(saleStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Próximo contacto"><Input type="date" value={form.next_contact_date} onChange={(e) => setForm({ ...form, next_contact_date: e.target.value })} /></Field>
        <Field label="Forma de pago"><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Contado, financiación…" /></Field>
        <Field label="Asignado a" full>
          <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {employees.map((e: any) => {
                const name = e.full_name || e.username || "Sin nombre";
                return <SelectItem key={e.id} value={name}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Notas" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {editing && (
          <div className="col-span-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(editing.id)} className="text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
          </div>
        )}
      </RecordDialog>
    </div>
  );
}