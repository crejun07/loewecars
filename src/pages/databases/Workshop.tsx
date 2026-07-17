import { useEffect, useMemo, useState } from "react";
import { Plus, LayoutGrid, List, Trash2, Package, X, Check, ChevronDown, ChevronRight, Car, History, Wrench } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { useStock, useWorkshop, useSpareParts } from "@/hooks/data/useDealership";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { formatCurrency, formatDate, workshopStatusLabels, workshopStatusTone, workshopPriorityLabels, workshopPriorityTone, sparePartStatusLabels, sparePartStatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_TASKS = [
  "Cambio filtro de aceite",
  "Cambio filtro de aire",
  "Cambio filtro de habitáculo",
  "Cambio filtro de combustible",
  "Diagnosis",
  "Cambio de aceite",
  "Cambio de frenos",
  "Revisión general",
  "Cambio de bujías",
  "Cambio de correa",
  "Alineación",
  "ITV",
];

const empty = { vehicle_id: "", task: "", task_date: new Date().toISOString().slice(0, 10), status: "pending", priority: 3, cost: "" as any, description: "" };

export default function WorkshopPage() {
  const { data: tasks = [] } = useWorkshop();
  const { data: stock = [] } = useStock();
  const { data: allParts = [] } = useSpareParts();
  const qc = useQueryClient();
  const [view, setView] = useState<"vehicles" | "timeline">("vehicles");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [taskParts, setTaskParts] = useState<any[]>([]);
  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTaskParts(editing?.spare_parts ?? []);
    setShowPartForm(false);
    setSelectedPartId("");
  }, [editing, open]);

  function openNew(vehicleId?: string) {
    setEditing(null);
    setForm({ ...empty, vehicle_id: vehicleId ?? "" });
    setOpen(true);
  }
  function openEdit(t: any) {
    setEditing(t);
    setForm({
      vehicle_id: t.vehicle_id ?? "", task: t.task, task_date: t.task_date, status: t.status,
      priority: t.priority ?? 3, cost: t.cost ?? "", description: t.description ?? "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.task?.trim()) { toast.error("Escribe o selecciona una tarea"); return; }
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
  async function toggleDone(t: any) {
    const next = t.status === "completed" ? "pending" : "completed";
    const { error } = await supabase.from("workshop").update({ status: next as any }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "completed" ? "Tarea completada" : "Tarea reabierta");
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

  const sortByPriority = (list: any[]) =>
    [...list].sort((a, b) => {
      const pa = a.priority ?? 3;
      const pb = b.priority ?? 3;
      if (pb !== pa) return pb - pa;
      return (b.task_date ?? "").localeCompare(a.task_date ?? "");
    });

  const grouped = useMemo(() => {
    const map = new Map<string, { vehicle: any; active: any[]; done: any[] }>();
    for (const t of tasks as any[]) {
      const key = t.vehicle_id ?? "__none__";
      if (!map.has(key)) {
        map.set(key, { vehicle: t.vehicle ?? null, active: [], done: [] });
      }
      const bucket = map.get(key)!;
      if (t.status === "completed") bucket.done.push(t);
      else bucket.active.push(t);
    }
    const arr = Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
    arr.sort((a, b) => {
      if (a.id === "__none__") return 1;
      if (b.id === "__none__") return -1;
      if (b.active.length !== a.active.length) return b.active.length - a.active.length;
      return 0;
    });
    return arr;
  }, [tasks]);

  const timeline = sortByPriority(tasks);

  return (
    <div>
      <PageHeader
        title="Taller"
        description="Gestión por vehículo: tareas pendientes e historial"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "vehicles" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("vehicles")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={view === "timeline" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("timeline")}><List className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={() => openNew()}><Plus className="mr-1 h-4 w-4" />Nueva tarea</Button>
          </>
        }
      />
      <div className="p-6">
        {view === "vehicles" ? (
          grouped.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-16 text-center text-sm text-muted-foreground">
              Aún no hay tareas de taller. Pulsa «Nueva tarea» para empezar.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {grouped.map((g) => {
                const historyOpen = !!expandedHistory[g.id];
                const title = g.vehicle
                  ? `${g.vehicle.brand} ${g.vehicle.model}`
                  : "Sin vehículo asignado";
                const subtitle = g.vehicle?.license_plate
                  ? g.vehicle.license_plate
                  : g.vehicle?.year
                    ? String(g.vehicle.year)
                    : "";
                return (
                  <div key={g.id} className="flex flex-col rounded-lg border border-border bg-card">
                    <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="rounded-md bg-muted p-2"><Car className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{title}</div>
                          {subtitle && (
                            <div className="mt-0.5 inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                              {subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openNew(g.id === "__none__" ? undefined : g.id)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />Tarea
                      </Button>
                    </div>

                    <div className="p-3">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Pendientes ({g.active.length})
                        </div>
                      </div>
                      {g.active.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                          Sin tareas pendientes
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {sortByPriority(g.active).map((t: any) => (
                            <li key={t.id} className="group flex items-start gap-2 rounded-md border border-border bg-background p-2">
                              <button
                                type="button"
                                onClick={() => toggleDone(t)}
                                aria-label="Marcar como realizada"
                                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border hover:border-foreground/40 hover:bg-muted"
                              >
                                <Check className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(t)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-sm font-medium">{t.task}</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>{formatDate(t.task_date)}</span>
                                  <StatusBadge label={workshopStatusLabels[t.status]} tone={workshopStatusTone[t.status]} />
                                  <StatusBadge label={`P${t.priority ?? 3}`} tone={workshopPriorityTone[t.priority ?? 3]} />
                                </div>
                              </button>
                              {t.cost ? <span className="shrink-0 text-xs font-medium tabular-nums">{formatCurrency(t.cost)}</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}

                      {g.done.length > 0 && (
                        <div className="mt-3 border-t border-border pt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedHistory((s) => ({ ...s, [g.id]: !s[g.id] }))}
                            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          >
                            <span className="flex items-center gap-1.5">
                              <History className="h-3 w-3" />
                              Historial ({g.done.length})
                            </span>
                            {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                          {historyOpen && (
                            <ul className="mt-2 space-y-1">
                              {[...g.done]
                                .sort((a, b) => (b.task_date ?? "").localeCompare(a.task_date ?? ""))
                                .map((t: any) => (
                                  <li key={t.id} className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                                    <button type="button" onClick={() => openEdit(t)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                      <span className="tabular-nums text-muted-foreground">{formatDate(t.task_date)}</span>
                                      <span className="text-muted-foreground">—</span>
                                      <span className="truncate">{t.task}</span>
                                    </button>
                                    {t.cost ? <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatCurrency(t.cost)}</span> : null}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="rounded-lg border border-border bg-card">
            {timeline.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">Aún no hay tareas</div>
            ) : (
              <div className="divide-y divide-border">
                {timeline.map((t: any) => (
                  <div key={t.id} className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
                    <button
                      type="button"
                      onClick={() => toggleDone(t)}
                      aria-label="Marcar como realizada"
                      className={cn(
                        "col-span-1 flex h-6 w-6 items-center justify-center rounded border",
                        t.status === "completed" ? "border-green-500 bg-green-500/10 text-green-600" : "border-border hover:border-foreground/40"
                      )}
                    >
                      {t.status === "completed" && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => openEdit(t)} className="col-span-2 text-left text-xs text-muted-foreground">{formatDate(t.task_date)}</button>
                    <button onClick={() => openEdit(t)} className={cn("col-span-3 text-left text-sm font-medium", t.status === "completed" && "line-through text-muted-foreground")}>{t.task}</button>
                    <div className="col-span-1"><StatusBadge label={`P${t.priority ?? 3}`} tone={workshopPriorityTone[t.priority ?? 3]} /></div>
                    <button onClick={() => openEdit(t)} className="col-span-3 truncate text-left text-xs text-muted-foreground">
                      {t.vehicle
                        ? `${t.vehicle.brand} ${t.vehicle.model}${t.vehicle.license_plate ? ` — ${t.vehicle.license_plate}` : ""}`
                        : "Sin asignar"}
                    </button>
                    <div className="col-span-1"><StatusBadge label={workshopStatusLabels[t.status]} tone={workshopStatusTone[t.status]} /></div>
                    <div className="col-span-1 text-right text-xs font-medium">{formatCurrency(t.cost)}</div>
                  </div>
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

        <div className="col-span-2 space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Tareas frecuentes</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TASKS.map((q) => {
              const active = form.task === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setForm({ ...form, task: q })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:border-foreground/40 hover:bg-muted"
                  )}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Tarea" full>
          <Input required value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder="Escribe una tarea o elige una de arriba…" />
        </Field>
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