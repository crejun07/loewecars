import { useEffect, useState } from "react";
import { Plus, LayoutGrid, List, Trash2, Package, X } from "lucide-react";
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
import { useStock, useWorkshop, useSpareParts } from "@/hooks/data/useDealership";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { QuickStatusToggle } from "@/components/shared/QuickStatusToggle";
import { formatCurrency, formatDate, workshopStatusLabels, workshopStatusOrder, workshopStatusTone, workshopPriorityLabels, workshopPriorityTone, sparePartStatusLabels, sparePartStatusTone } from "@/lib/labels";
import { toast } from "sonner";

const empty = { vehicle_id: "", task: "", task_date: new Date().toISOString().slice(0, 10), status: "pending", priority: 3, cost: "" as any, description: "" };

export default function WorkshopPage() {
  const { data: tasks = [] } = useWorkshop();
  const { data: stock = [] } = useStock();
  const { data: allParts = [] } = useSpareParts();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [taskParts, setTaskParts] = useState<any[]>([]);
  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState("");

  useEffect(() => {
    setTaskParts(editing?.spare_parts ?? []);
    setShowPartForm(false);
    setSelectedPartId("");
  }, [editing, open]);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(t: any) {
    setEditing(t);
    setForm({
      vehicle_id: t.vehicle_id ?? "", task: t.task, task_date: t.task_date, status: t.status,
      priority: t.priority ?? 3, cost: t.cost ?? "", description: t.description ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      vehicle_id: form.vehicle_id || null,
      priority: Number(form.priority) || 3,
      cost: form.cost === "" ? 0 : Number(form.cost),
    };
    const { error } = editing
      ? await supabase.from("workshop").update(payload).eq("id", editing.id)
      : await supabase.from("workshop").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["workshop"] });
  }
  async function quickUpdateStatus(id: string, status: string) {
    const { error } = await supabase.from("workshop").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["workshop"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("workshop").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["workshop"] });
  }

  async function linkSparePart() {
    if (!editing) { toast.error("Guarda la tarea antes de añadir recambios"); return; }
    if (!selectedPartId) { toast.error("Selecciona un recambio"); return; }
    const { data, error } = await supabase.from("spare_parts").update({ workshop_id: editing.id }).eq("id", selectedPartId).select().single();
    if (error) { toast.error(error.message); return; }
    setTaskParts((prev) => [...prev, data]);
    setSelectedPartId("");
    setShowPartForm(false);
    qc.invalidateQueries({ queryKey: ["workshop"] });
    qc.invalidateQueries({ queryKey: ["spare_parts"] });
    toast.success("Recambio asociado");
  }

  async function unlinkSparePart(id: string) {
    const { error } = await supabase.from("spare_parts").update({ workshop_id: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setTaskParts((prev) => prev.filter((p) => p.id !== id));
    qc.invalidateQueries({ queryKey: ["workshop"] });
    qc.invalidateQueries({ queryKey: ["spare_parts"] });
  }

  // Sort helper: priority desc, then date desc
  const sortByPriority = (list: any[]) =>
    [...list].sort((a, b) => {
      const pa = a.priority ?? 3;
      const pb = b.priority ?? 3;
      if (pb !== pa) return pb - pa;
      return (b.task_date ?? "").localeCompare(a.task_date ?? "");
    });

  // Timeline ordered by priority then date
  const timeline = sortByPriority(tasks);

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
              sortByPriority(tasks.filter((t: any) => t.status === col)).map((t: any) => (
                <button key={t.id} onClick={() => openEdit(t)} className="rounded-md border border-border bg-card p-3 text-left hover:border-foreground/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{t.task}</div>
                    <StatusBadge label={`P${t.priority ?? 3}`} tone={workshopPriorityTone[t.priority ?? 3]} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.vehicle
                      ? `${t.vehicle.brand} ${t.vehicle.model}${t.vehicle.license_plate ? ` — ${t.vehicle.license_plate}` : ""}`
                      : "Sin asignar"}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(t.task_date)}</span>
                    <span className="font-medium">{formatCurrency(t.cost)}</span>
                  </div>
                  <div className="mt-2">
                    <QuickStatusToggle
                      status={t.status}
                      order={workshopStatusOrder}
                      labels={workshopStatusLabels}
                      tones={workshopStatusTone}
                      onChange={(next) => quickUpdateStatus(t.id, next)}
                    />
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
                    <div className="col-span-3 text-sm font-medium">{t.task}</div>
                    <div className="col-span-1"><StatusBadge label={`P${t.priority ?? 3}`} tone={workshopPriorityTone[t.priority ?? 3]} /></div>
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
        <Field label="Prioridad" full>
          <Select value={String(form.priority)} onValueChange={(v) => setForm({ ...form, priority: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 4, 3, 2, 1].map((p) => (
                <SelectItem key={p} value={String(p)}>P{p} — {workshopPriorityLabels[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Coste (€)" full><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
        <Field label="Descripción" full><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        {editing && (
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />Recambios asociados ({taskParts.length})</div>
              {!showPartForm && (
                <Button type="button" size="sm" variant="outline" onClick={() => setShowPartForm(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Añadir recambio
                </Button>
              )}
            </div>
            {taskParts.length > 0 && (
              <div className="rounded-md border border-border divide-y divide-border">
                {taskParts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.part_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.part_reference ? `Ref. ${p.part_reference}` : ""}
                        {p.supplier ? `${p.part_reference ? " · " : ""}${p.supplier}` : ""}
                        {p.vehicle?.license_plate ? `${(p.part_reference || p.supplier) ? " · " : ""}🚗 ${p.vehicle.license_plate}` : ""}
                      </div>
                    </div>
                    <StatusBadge label={sparePartStatusLabels[p.status] ?? p.status} tone={sparePartStatusTone[p.status]} />
                    <span className="text-xs font-medium tabular-nums">{formatCurrency(p.cost, 2)}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => unlinkSparePart(p.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {showPartForm && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <SearchableSelect
                  value={selectedPartId}
                  onChange={setSelectedPartId}
                  options={allParts
                    .filter((p: any) => !p.workshop_id || p.workshop_id === editing?.id)
                    .filter((p: any) => !taskParts.some((tp) => tp.id === p.id))
                    .map((p: any) => ({
                      value: p.id,
                      label: `${p.part_name}${p.part_reference ? ` (${p.part_reference})` : ""}${p.vehicle ? ` — ${p.vehicle.brand} ${p.vehicle.model}` : ""}`,
                      hint: p.vehicle?.license_plate ? `🚗 ${p.vehicle.license_plate}` : undefined,
                    }))}
                  placeholder="Selecciona un recambio existente"
                  searchPlaceholder="Buscar recambio…"
                  emptyText="Sin recambios disponibles"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPartForm(false); setSelectedPartId(""); }}>Cancelar</Button>
                  <Button type="button" size="sm" onClick={linkSparePart}>Asociar recambio</Button>
                </div>
              </div>
            )}
          </div>
        )}
        {editing && (
          <div className="col-span-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(editing.id)} className="text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
          </div>
        )}
      </RecordDialog>
    </div>
  );
}