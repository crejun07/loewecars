import { useMemo, useState } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Check, Trash2, Car, Wrench, Truck, Shield, Package, FileText, Bell, Loader2, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useStock, useEmployees } from "@/hooks/data/useDealership";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EventType =
  | "itv"
  | "delivery"
  | "external_workshop"
  | "safety_campaign"
  | "spare_pickup"
  | "send_document"
  | "reminder"
  | "custom";

const PRESETS: { type: EventType; label: string; icon: any; title: string; needsVehicle?: boolean }[] = [
  { type: "itv", label: "Programar ITV", icon: Shield, title: "Pasar ITV", needsVehicle: true },
  { type: "delivery", label: "Entrega de vehículo", icon: Car, title: "Entrega de vehículo", needsVehicle: true },
  { type: "external_workshop", label: "Taller externo", icon: Wrench, title: "Cita taller externo", needsVehicle: true },
  { type: "safety_campaign", label: "Campaña de seguridad", icon: Shield, title: "Campaña de seguridad", needsVehicle: true },
  { type: "spare_pickup", label: "Recoger recambio", icon: Package, title: "Recogida de recambio" },
  { type: "send_document", label: "Enviar documento", icon: FileText, title: "Enviar documento" },
  { type: "reminder", label: "Recordatorio", icon: Bell, title: "Recordatorio" },
  { type: "custom", label: "Tarea personalizada", icon: Plus, title: "" },
];

const TYPE_META: Record<EventType, { label: string; className: string }> = {
  itv: { label: "ITV", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  delivery: { label: "Entrega", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  external_workshop: { label: "Taller externo", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  safety_campaign: { label: "Campaña seg.", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" },
  spare_pickup: { label: "Recambio", className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
  send_document: { label: "Documento", className: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
  reminder: { label: "Recordatorio", className: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
  custom: { label: "Tarea", className: "bg-primary/15 text-primary border-primary/30" },
};

interface EventRow {
  id: string;
  user_id: string | null;
  created_by: string | null;
  is_broadcast: boolean;
  event_type: EventType;
  title: string;
  description: string | null;
  event_date: string;
  vehicle_id: string | null;
  status: string;
  completed_at: string | null;
  extra_data?: {
    phone?: string;
    location?: string;
    contact_person?: string;
    other?: string;
  } | null;
}

function useAgendaEvents() {
  return useQuery({
    queryKey: ["agenda_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { roles } = usePermissions();
  const isAdmin = roles.includes("admin");
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useAgendaEvents();
  const { data: stock = [] } = useStock();
  const { data: employees = [] } = useEmployees();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({
    event_type: "custom" as EventType,
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    vehicle_id: "",
    assignee_id: user?.id ?? "",
    is_broadcast: false,
    phone: "",
    location: "",
    contact_person: "",
    other: "",
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const key = format(new Date(e.event_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const daysWithEvents = useMemo(
    () => Array.from(eventsByDay.keys()).map((k) => new Date(k + "T00:00:00")),
    [eventsByDay],
  );

  const selectedDayEvents = useMemo(() => {
    return events.filter((e) => isSameDay(new Date(e.event_date), selectedDate));
  }, [events, selectedDate]);

  const upcoming = useMemo(() => {
    const now = startOfDay(new Date());
    return events
      .filter((e) => new Date(e.event_date) >= now && e.status !== "done")
      .slice(0, 8);
  }, [events]);

  function openPreset(preset: typeof PRESETS[number]) {
    setEditing(null);
    const base = new Date(selectedDate);
    base.setHours(9, 0, 0, 0);
    setForm({
      event_type: preset.type,
      title: preset.title,
      description: "",
      event_date: format(base, "yyyy-MM-dd'T'HH:mm"),
      vehicle_id: "",
      assignee_id: user?.id ?? "",
      is_broadcast: false,
      phone: "",
      location: "",
      contact_person: "",
      other: "",
    });
    setDialogOpen(true);
  }

  function openEdit(e: EventRow) {
    setEditing(e);
    const ex = (e.extra_data ?? {}) as any;
    setForm({
      event_type: e.event_type,
      title: e.title,
      description: e.description ?? "",
      event_date: format(new Date(e.event_date), "yyyy-MM-dd'T'HH:mm"),
      vehicle_id: e.vehicle_id ?? "",
      assignee_id: e.user_id ?? user?.id ?? "",
      is_broadcast: e.is_broadcast,
      phone: ex.phone ?? "",
      location: ex.location ?? "",
      contact_person: ex.contact_person ?? "",
      other: ex.other ?? "",
    });
    setDialogOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      if (!form.title.trim()) throw new Error("Añade un título");
      const isCustom = form.event_type === "custom";
      const extra = isCustom
        ? {
            phone: form.phone.trim() || undefined,
            location: form.location.trim() || undefined,
            contact_person: form.contact_person.trim() || undefined,
            other: form.other.trim() || undefined,
          }
        : null;
      const cleanExtra = extra && Object.values(extra).some((v) => v) ? extra : null;
      const payload = {
        event_type: form.event_type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date: new Date(form.event_date).toISOString(),
        vehicle_id: form.vehicle_id || null,
        is_broadcast: isAdmin ? form.is_broadcast : false,
        user_id: form.is_broadcast && isAdmin ? null : (isAdmin ? (form.assignee_id || user.id) : user.id),
        extra_data: cleanExtra,
      };
      if (editing) {
        const { error } = await supabase.from("agenda_events").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agenda_events").insert({ ...payload, created_by: user.id } as any);
        if (error) throw error;
        // If admin created this for someone else or broadcast, drop a summary in chat
        if (isAdmin && (payload.is_broadcast || (payload.user_id && payload.user_id !== user.id))) {
          const veh = stock.find((v: any) => v.id === payload.vehicle_id);
          const when = format(new Date(payload.event_date), "d/MM/yyyy 'a las' HH:mm", { locale: es });
          const me = employees.find((e: any) => e.id === user.id) as any;
          const meName = me?.full_name || me?.username || "Administración";
          const vehText = veh ? ` con el vehículo ${veh.brand ?? ""} ${veh.model ?? ""}`.trim() : "";
          const summary = `📅 ${meName} ha añadido el evento "${payload.title}" el ${when}${vehText}.`;
          await supabase.from("chat_messages").insert({
            sender_id: user.id,
            recipient_id: payload.is_broadcast ? null : payload.user_id,
            content: summary,
          } as any);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda_events"] });
      setDialogOpen(false);
      toast.success(editing ? "Evento actualizado" : "Evento creado");
    },
    onError: (err: any) => toast.error(err.message ?? "Error al guardar"),
  });

  const completeMutation = useMutation({
    mutationFn: async (event: EventRow) => {
      const doneDate = new Date().toISOString();
      const { error } = await supabase
        .from("agenda_events")
        .update({ status: "done", completed_at: doneDate })
        .eq("id", event.id);
      if (error) throw error;
      // ITV side-effect: update vehicle next_itv_date to today (marks it as freshly passed)
      if (event.event_type === "itv" && event.vehicle_id) {
        const today = format(new Date(), "yyyy-MM-dd");
        await supabase.from("vehicle_stock").update({ next_itv_date: today }).eq("id", event.vehicle_id);
      }
    },
    onSuccess: (_data, event) => {
      qc.invalidateQueries({ queryKey: ["agenda_events"] });
      if (event.event_type === "itv" && event.vehicle_id) {
        qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
        toast.success("ITV marcada como pasada y actualizada en el vehículo");
      } else {
        toast.success("Evento completado");
      }
    },
    onError: (err: any) => toast.error(err.message ?? "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agenda_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda_events"] });
      toast.success("Evento eliminado");
    },
  });

  const stockOptions = stock.map((v: any) => ({
    value: v.id,
    label: `${v.brand ?? ""} ${v.model ?? ""}`.trim() || "Vehículo",
    hint: [v.license_plate, v.year].filter(Boolean).join(" · "),
  }));

  const employeeOptions = employees.map((e: any) => ({
    value: e.id,
    label: e.full_name || e.username || "Usuario",
  }));

  const currentPreset = PRESETS.find((p) => p.type === form.event_type);
  const needsVehicle = currentPreset?.needsVehicle;
  const isCustom = form.event_type === "custom";

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Programa tareas, ITVs, entregas y recordatorios. Los administradores pueden enviar eventos a todo el equipo."
      />

      <div className="p-6 space-y-6">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.type} variant="outline" size="sm" onClick={() => openPreset(p)}>
              <p.icon className="mr-2 h-4 w-4" />
              {p.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Calendar */}
          <Card className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={es}
              modifiers={{ hasEvent: daysWithEvents }}
              modifiersClassNames={{
                hasEvent: "relative font-semibold text-primary after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Próximos eventos
              </div>
              {upcoming.length === 0 ? (
                <div className="text-sm text-muted-foreground py-3 text-center">Sin eventos próximos</div>
              ) : (
                upcoming.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedDate(new Date(e.event_date))}
                    className="w-full text-left rounded-md border border-border p-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{e.title}</span>
                      {e.is_broadcast && <Users className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.event_date), "d MMM · HH:mm", { locale: es })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Day events */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedDayEvents.length === 0
                    ? "Ningún evento programado"
                    : `${selectedDayEvents.length} evento(s)`}
                </p>
              </div>
              <Button size="sm" onClick={() => openPreset(PRESETS[PRESETS.length - 1])}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No hay eventos este día. Usa los botones de arriba para añadir uno.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents
                  .sort((a, b) => a.event_date.localeCompare(b.event_date))
                  .map((e) => {
                    const veh = stock.find((v: any) => v.id === e.vehicle_id);
                    const meta = TYPE_META[e.event_type] ?? TYPE_META.custom;
                    const isDone = e.status === "done";
                    const canEdit = isAdmin || e.created_by === user?.id || e.user_id === user?.id;
                    return (
                      <div
                        key={e.id}
                        className={cn(
                          "rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors",
                          isDone && "opacity-60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button className="flex-1 text-left min-w-0" onClick={() => canEdit && openEdit(e)}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-[10px] font-medium", meta.className)}>
                                {meta.label}
                              </Badge>
                              {e.is_broadcast && (
                                <Badge variant="outline" className="text-[10px] gap-1">
                                  <Users className="h-3 w-3" /> Todos
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(e.event_date), "HH:mm")}
                              </span>
                              {isDone && <Badge variant="secondary" className="text-[10px]">Completado</Badge>}
                            </div>
                            <div className={cn("font-medium mt-1", isDone && "line-through")}>{e.title}</div>
                            {veh && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                🚗 {veh.brand} {veh.model} {veh.license_plate ? `· ${veh.license_plate}` : ""}
                              </div>
                            )}
                            {e.description && (
                              <div className="text-sm text-muted-foreground mt-1">{e.description}</div>
                            )}
                            {e.extra_data && (
                              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                {e.extra_data.phone && <span>📞 {e.extra_data.phone}</span>}
                                {e.extra_data.contact_person && <span>👤 {e.extra_data.contact_person}</span>}
                                {e.extra_data.location && <span>📍 {e.extra_data.location}</span>}
                                {e.extra_data.other && <span>· {e.extra_data.other}</span>}
                              </div>
                            )}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isDone && canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => completeMutation.mutate(e)}
                                title={e.event_type === "itv" ? "Marcar ITV como pasada" : "Completar"}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteMutation.mutate(e.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.type}
                  type="button"
                  variant={form.event_type === p.type ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      event_type: p.type,
                      title: f.title || p.title,
                    }))
                  }
                >
                  <p.icon className="mr-1.5 h-3.5 w-3.5" />
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Pasar ITV Volkswagen Golf"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha y hora</Label>
              <Input
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
              />
            </div>

            {(needsVehicle || form.vehicle_id) && (
              <div className="space-y-2">
                <Label>Vehículo{needsVehicle ? "" : " (opcional)"}</Label>
                <SearchableSelect
                  value={form.vehicle_id}
                  onChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))}
                  options={stockOptions}
                  placeholder="Vincular vehículo del stock…"
                  emptyLabel="— Sin vehículo —"
                />
              </div>
            )}

            {isCustom && (
              <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Datos adicionales (opcional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+34 600 000 000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Persona de contacto</Label>
                    <Input
                      value={form.contact_person}
                      onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Ubicación / Dirección</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="Dirección, ciudad, taller…"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Otros datos de interés</Label>
                    <Textarea
                      rows={2}
                      value={form.other}
                      onChange={(e) => setForm((f) => ({ ...f, other: e.target.value }))}
                      placeholder="Cualquier información adicional…"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {isAdmin && (
              <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Enviar a todo el equipo</Label>
                    <p className="text-xs text-muted-foreground">Aparecerá en la agenda de todos los usuarios</p>
                  </div>
                  <Switch
                    checked={form.is_broadcast}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_broadcast: v }))}
                  />
                </div>
                {!form.is_broadcast && (
                  <div className="space-y-2">
                    <Label className="text-sm">Asignar a</Label>
                    <SearchableSelect
                      value={form.assignee_id}
                      onChange={(v) => setForm((f) => ({ ...f, assignee_id: v }))}
                      options={employeeOptions}
                      placeholder="Seleccionar usuario…"
                      allowEmpty={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}