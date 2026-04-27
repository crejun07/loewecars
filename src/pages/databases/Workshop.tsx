import { useState } from "react";
import { Plus, LayoutGrid, List, Trash2 } from "lucide-react";
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
import { useStock, useWorkshop } from "@/hooks/data/useDealership";
import { formatCurrency, formatDate, workshopStatusLabels, workshopStatusOrder, workshopStatusTone } from "@/lib/labels";
import { toast } from "sonner";

const empty = { vehicle_id: "", task: "", task_date: new Date().toISOString().slice(0, 10), status: "pending", cost: "" as any, description: "" };

export default function WorkshopPage() {
  const { data: tasks = [] } = useWorkshop();
  const { data: stock = [] } = useStock();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(t: any) {
    setEditing(t);
    setForm({
      vehicle_id: t.vehicle_id ?? "", task: t.task, task_date: t.task_date, status: t.status,
      cost: t.cost ?? "", description: t.description ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      vehicle_id: form.vehicle_id || null,
      cost: form.cost === "" ? 0 : Number(form.cost),
    };
    const { error } = editing
      ? await supabase.from("workshop").update(payload).eq("id", editing.id)
      : await supabase.from("workshop").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["workshop"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("workshop").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["workshop"] });
  }

  // Timeline: group by date
  const timeline = [...tasks].sort((a: any, b: any) => b.task_date.localeCompare(a.task_date));

  return (
    <div>
      <PageHeader
        title="Taller"
        description="Reparaciones y preparación de vehículos"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={view === "timeline" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("timeline")}><List className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva tarea</Button>
          </>
        }
      />
      <div className="p-6">
        {view === "kanban" ? (
          <KanbanBoard
            columns={workshopStatusOrder.map((s) => ({ id: s, title: workshopStatusLabels[s], count: tasks.filter((t: any) => t.status === s).length }))}
            renderCards={(col) =>
              tasks.filter((t: any) => t.status === col).map((t: any) => (
                <button key={t.id} onClick={() => openEdit(t)} className="rounded-md border border-border bg-card p-3 text-left hover:border-foreground/20">
                  <div className="text-sm font-medium">{t.task}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.vehicle
                      ? `${t.vehicle.brand} ${t.vehicle.model}${t.vehicle.license_plate ? ` — ${t.vehicle.license_plate}` : ""}`
                      : "Sin asignar"}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(t.task_date)}</span>
                    <span className="font-medium">{formatCurrency(t.cost)}</span>
                  </div>
                </button>
              ))
            }
          />
        ) : (
          <div className="rounded-lg border border-border bg-card">
            {timeline.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">Aún no hay tareas</div>
            ) : (
              <div className="divide-y divide-border">
                {timeline.map((t: any) => (
                  <button key={t.id} onClick={() => openEdit(t)} className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
                    <div className="col-span-2 text-xs text-muted-foreground">{formatDate(t.task_date)}</div>
                    <div className="col-span-4 text-sm font-medium">{t.task}</div>
                    <div className="col-span-3 truncate text-xs text-muted-foreground">
                      {t.vehicle
                        ? `${t.vehicle.brand} ${t.vehicle.model}${t.vehicle.license_plate ? ` — ${t.vehicle.license_plate}` : ""}`
                        : "Sin asignar"}
                    </div>
                    <div className="col-span-2"><StatusBadge label={workshopStatusLabels[t.status]} tone={workshopStatusTone[t.status]} /></div>
                    <div className="col-span-1 text-right text-xs font-medium">{formatCurrency(t.cost)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RecordDialog open={open} onOpenChange={setOpen} trigger={null as any} title={editing ? "Editar tarea" : "Nueva tarea"} onSubmit={save}>
        <Field label="Vehículo" full>
          <Select value={form.vehicle_id || "none"} onValueChange={(v) => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Selecciona vehículo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {stock.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.brand} {v.model}{v.license_plate ? ` — ${v.license_plate}` : v.year ? ` (${v.year})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tarea" full><Input required value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder="Cambio de aceite, pintura, revisión…" /></Field>
        <Field label="Fecha"><Input type="date" value={form.task_date} onChange={(e) => setForm({ ...form, task_date: e.target.value })} /></Field>
        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(workshopStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Coste (€)" full><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
        <Field label="Descripción" full><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        {editing && (
          <div className="col-span-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(editing.id)} className="text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
          </div>
        )}
      </RecordDialog>
    </div>
  );
}