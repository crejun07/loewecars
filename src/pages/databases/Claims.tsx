import { useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, Search, Scale, FileText, Upload, ExternalLink, Car, Phone, Mail, MapPin, IdCard, CalendarClock, Eye, Gavel, Flag,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function daysLeft(d: string) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d + "T00:00:00");
  return Math.round((x.getTime() - t.getTime()) / 86400000);
}
function DeadlineBadge({ date, label }: { date: string; label: string }) {
  const n = daysLeft(date);
  const tone = n < 0 ? "border-destructive bg-destructive text-destructive-foreground"
    : n <= 3 ? "border-status-red-fg/40 bg-status-red text-status-red-fg"
    : n <= 7 ? "border-status-amber-fg/40 bg-status-amber text-status-amber-fg"
    : "border-border bg-muted text-foreground";
  const txt = n < 0 ? `vencido hace ${-n} día${n === -1 ? "" : "s"}` : n === 0 ? "vence HOY" : `quedan ${n} día${n === 1 ? "" : "s"}`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium", tone)}>
      <CalendarClock className="h-3 w-3" />{label}: <b>{txt}</b> ({formatDate(date)})
    </span>
  );
}
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClaims, useStock } from "@/hooks/data/useDealership";
import { formatCurrency, formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const claimStatusLabels: Record<string, string> = {
  open: "Abierta",
  burofax_sent: "Burofax enviado",
  with_lawyer: "Con el abogado",
  citation: "Citación",
  lawsuit: "Demanda",
  judgment: "Sentencia",
  resolved: "Resuelta",
  closed: "Cerrada",
};

const statusTone: Record<string, string> = {
  open: "bg-status-blue text-status-blue-fg border-status-blue-fg/40",
  burofax_sent: "bg-status-amber text-status-amber-fg border-status-amber-fg/40",
  with_lawyer: "bg-status-amber text-status-amber-fg border-status-amber-fg/40",
  citation: "bg-status-red text-status-red-fg border-status-red-fg/40",
  lawsuit: "bg-status-red text-status-red-fg border-status-red-fg/40",
  judgment: "bg-status-red text-status-red-fg border-status-red-fg/40",
  resolved: "bg-status-green text-status-green-fg border-status-green-fg/40",
  closed: "bg-muted text-muted-foreground border-border",
};

const milestones = [
  { key: "burofax_sent", date: "burofax_sent_date", label: "Burofax enviado" },
  { key: "burofax_received", date: "burofax_received_date", label: "Burofax recibido" },
  { key: "sent_to_lawyer", date: "lawyer_date", label: "Con el abogado" },
  { key: "has_citation", date: "citation_date", label: "Citación" },
  { key: "has_lawsuit", date: "lawsuit_date", label: "Demanda" },
  { key: "has_judgment", date: "judgment_date", label: "Sentencia" },
] as const;

const emptyForm: any = {
  title: "", person_name: "", person_phone: "", person_dni: "", person_address: "", person_email: "",
  vehicle_id: "", vehicle_model: "", vehicle_plate: "", subject: "", status: "open",
  burofax_sent: false, burofax_sent_date: "",
  burofax_received: false, burofax_received_date: "",
  sent_to_lawyer: false, lawyer_date: "", lawyer_name: "",
  has_citation: false, citation_date: "",
  has_lawsuit: false, lawsuit_date: "",
  has_judgment: false, judgment_date: "", judgment_result: "",
  response_deadline: "", amount_claimed: "", requested_solution: "", notes: "",
};

export default function ClaimsPage() {
  const { data: claims = [] } = useClaims();
  const { data: stock = [] } = useStock();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);
  const [docsFor, setDocsFor] = useState<any | null>(null);
  const [eventsFor, setEventsFor] = useState<any | null>(null);
  const [detailFor, setDetailFor] = useState<any | null>(null);
  const { data: pendingDeadlines = [] } = useQuery({
    queryKey: ["claim_event_deadlines"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("claim_events")
        .select("id, claim_id, title, deadline_date").not("deadline_date", "is", null).eq("deadline_done", false)
        .order("deadline_date", { ascending: true });
      return data ?? [];
    },
  });

  const vehicleOptions = useMemo(
    () => (stock as any[]).map((v) => ({
      value: v.id,
      label: `${v.brand} ${v.model}`,
      hint: [v.license_plate, v.year].filter(Boolean).join(" · "),
    })),
    [stock],
  );

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (claims as any[]).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.title, c.person_name, c.person_dni, c.person_phone, c.vehicle_plate, c.vehicle_model, c.subject]
        .some((f) => (f ?? "").toString().toLowerCase().includes(q));
    });
  }, [claims, search, statusFilter, ]);

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }

  function openEdit(c: any) {
    setEditing(c);
    const next: any = { ...emptyForm };
    Object.keys(emptyForm).forEach((k) => {
      const v = c[k];
      next[k] = v === null || v === undefined ? emptyForm[k] : v;
    });
    setOpen(true);
    setForm(next);
  }

  async function save() {
    const payload: any = {
      ...form,
      vehicle_id: form.vehicle_id || null,
      vehicle_plate: (form.vehicle_plate || "").trim().toUpperCase() || null,
      vehicle_model: form.vehicle_model || null,
      amount_claimed: form.amount_claimed === "" ? null : Number(form.amount_claimed),
    };
    ["burofax_sent_date", "burofax_received_date", "lawyer_date", "citation_date", "lawsuit_date", "judgment_date", "response_deadline"]
      .forEach((k) => { payload[k] = payload[k] || null; });
    ["person_phone", "person_dni", "person_address", "person_email", "subject", "lawyer_name", "judgment_result", "requested_solution", "notes"]
      .forEach((k) => { payload[k] = payload[k] || null; });

    const { error } = editing
      ? await supabase.from("claims").update(payload).eq("id", editing.id)
      : await supabase.from("claims").insert(payload);
    if (error) { toast.error(error.message); throw error; }
    toast.success(editing ? "Reclamación actualizada" : "Reclamación creada");
    qc.invalidateQueries({ queryKey: ["claims"] });
  }

  async function toggleMilestone(c: any, m: (typeof milestones)[number]) {
    const value = !c[m.key];
    const patch: any = { [m.key]: value };
    patch[m.date] = value ? (c[m.date] ?? new Date().toISOString().slice(0, 10)) : null;
    const { error } = await supabase.from("claims").update(patch).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["claims"] });
  }

  async function changeStatus(c: any, status: string) {
    const { error } = await supabase.from("claims").update({ status } as any).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["claims"] });
  }

  async function remove(c: any) {
    if (!confirm("¿Eliminar esta reclamación y sus documentos?")) return;
    const { error } = await supabase.from("claims").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Reclamación eliminada");
    qc.invalidateQueries({ queryKey: ["claims"] });
  }

  return (
    <div>
      <PageHeader
        title="Reclamaciones"
        description={`${claims.length} reclamaciones registradas`}
        actions={<Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva reclamación</Button>}
      />

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, DNI, matrícula o asunto…" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(claimStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Sin reclamaciones registradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {items.map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <button type="button" onClick={() => setDetailFor(c)} className="truncate text-left hover:underline">{c.title}</button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.person_name}</span>
                      {c.person_dni && <span className="inline-flex items-center gap-1"><IdCard className="h-3 w-3" />{c.person_dni}</span>}
                      {c.person_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.person_phone}</span>}
                      {c.person_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.person_email}</span>}
                      {c.person_address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{c.person_address}</span>}
                    </div>
                    {(c.vehicle_model || c.vehicle_plate) && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />{c.vehicle_model}
                        {c.vehicle_plate && <span className="font-mono"> · {c.vehicle_plate}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailFor(c)} title="Ver detalles"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEventsFor(c)} title="Eventos"><CalendarClock className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDocsFor(c)} title="Documentos"><FileText className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  </div>
                </div>

                {c.subject && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.subject}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select value={c.status} onValueChange={(v) => changeStatus(c, v)}>
                    <SelectTrigger className={cn("h-7 w-[180px] border text-xs font-medium", statusTone[c.status])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(claimStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {c.amount_claimed != null && (
                    <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">Reclama {formatCurrency(c.amount_claimed, 2)}</span>
                  )}
                  {c.response_deadline && <DeadlineBadge date={c.response_deadline} label="Contestar" />}
                  {(pendingDeadlines as any[]).filter((d) => d.claim_id === c.id).map((d) => (
                    <DeadlineBadge key={d.id} date={d.deadline_date} label={d.title} />
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {milestones.map((m) => {
                    const active = !!c[m.key];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => toggleMilestone(c, m)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-colors",
                          active ? "border-status-green-fg/50 bg-status-green text-status-green-fg" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <div>{m.label}</div>
                        <div className="text-[10px] opacity-80">{active ? (c[m.date] ? formatDate(c[m.date]) : "sin fecha") : "—"}</div>
                      </button>
                    );
                  })}
                </div>

                {c.requested_solution && (
                  <div className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Solución pedida:</span> {c.requested_solution}</div>
                )}
                {c.has_judgment && c.judgment_result && (
                  <div className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-foreground">Sentencia:</span> {c.judgment_result}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <RecordDialog
        trigger={null}
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar reclamación" : "Nueva reclamación"}
        onSubmit={save}
      >
        <Field label="Nombre de la reclamación" full>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Ej.: Reclamación garantía motor" />
        </Field>

        <Field label="Nombre completo / empresa" full>
          <Input value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} required />
        </Field>
        <Field label="Teléfono"><Input value={form.person_phone} onChange={(e) => setForm({ ...form, person_phone: e.target.value })} /></Field>
        <Field label="DNI / CIF"><Input value={form.person_dni} onChange={(e) => setForm({ ...form, person_dni: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.person_email} onChange={(e) => setForm({ ...form, person_email: e.target.value })} /></Field>
        <Field label="Dirección"><Input value={form.person_address} onChange={(e) => setForm({ ...form, person_address: e.target.value })} /></Field>

        <Field label="Vehículo del stock" full>
          <SearchableSelect
            value={form.vehicle_id}
            onChange={(v) => {
              const veh = (stock as any[]).find((s) => s.id === v);
              setForm({
                ...form,
                vehicle_id: v,
                vehicle_model: veh ? `${veh.brand} ${veh.model}` : form.vehicle_model,
                vehicle_plate: veh?.license_plate ?? form.vehicle_plate,
              });
            }}
            options={vehicleOptions}
            placeholder="Buscar vehículo…"
            emptyLabel="— Vehículo externo —"
          />
        </Field>
        <Field label="Modelo del vehículo"><Input value={form.vehicle_model} onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })} /></Field>
        <Field label="Matrícula"><Input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} /></Field>

        <Field label="Asunto de la reclamación" full>
          <Textarea rows={3} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </Field>

        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(claimStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Plazo de contestación"><Input type="date" value={form.response_deadline} onChange={(e) => setForm({ ...form, response_deadline: e.target.value })} /></Field>

        <Field label="Cantidad reclamada (€)"><Input type="number" step="0.01" value={form.amount_claimed} onChange={(e) => setForm({ ...form, amount_claimed: e.target.value })} /></Field>
        <Field label="Abogado"><Input value={form.lawyer_name} onChange={(e) => setForm({ ...form, lawyer_name: e.target.value })} /></Field>

        <Field label="Solución que pide el cliente" full>
          <Textarea rows={2} value={form.requested_solution} onChange={(e) => setForm({ ...form, requested_solution: e.target.value })} />
        </Field>

        <Field label="Hitos del procedimiento" full>
          <div className="grid grid-cols-2 gap-2">
            {milestones.map((m) => (
              <div key={m.key} className="rounded-md border border-border p-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, [m.key]: !form[m.key], [m.date]: !form[m.key] ? (form[m.date] || new Date().toISOString().slice(0, 10)) : "" })}
                  className={cn(
                    "w-full rounded-md border px-2 py-1 text-xs font-medium",
                    form[m.key] ? "border-status-green-fg/40 bg-status-green text-status-green-fg" : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {m.label}
                </button>
                <Input
                  type="date"
                  className="mt-2 h-8 text-xs"
                  value={form[m.date] || ""}
                  onChange={(e) => setForm({ ...form, [m.date]: e.target.value })}
                  disabled={!form[m.key]}
                />
              </div>
            ))}
          </div>
        </Field>

        <Field label="Resultado de la sentencia" full>
          <Textarea rows={2} value={form.judgment_result} onChange={(e) => setForm({ ...form, judgment_result: e.target.value })} />
        </Field>
        <Field label="Notas" full>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </RecordDialog>

      <ClaimDocumentsDialog claim={docsFor} onClose={() => setDocsFor(null)} />
      <ClaimEventsDialog claim={eventsFor} onClose={() => setEventsFor(null)} />
      <ClaimDetailDialog claim={detailFor} onClose={() => setDetailFor(null)} />
    </div>
  );
}

function ClaimDocumentsDialog({ claim, onClose }: { claim: any | null; onClose: () => void }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [docDate, setDocDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load(claimId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("claim_documents")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (claim?.id) load(claim.id);
    else setDocs([]);
    setName(""); setDocDate(""); setFile(null);
  }, [claim?.id]);

  async function upload() {
    if (!file || !claim) return;
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${claim.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("claim-documents").upload(path, file, {
        contentType: file.type || "application/pdf",
      });
      if (upErr) throw upErr;
      const { error } = await supabase.from("claim_documents").insert({
        claim_id: claim.id,
        name: name.trim() || file.name,
        file_path: path,
        doc_date: docDate || null,
      });
      if (error) throw error;
      toast.success("Documento adjuntado");
      setName(""); setDocDate(""); setFile(null);
      load(claim.id);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo subir el documento");
    } finally {
      setUploading(false);
    }
  }

  async function openDoc(d: any) {
    const { data, error } = await supabase.storage.from("claim-documents").createSignedUrl(d.file_path, 600);
    if (error || !data) { toast.error("No se pudo abrir el documento"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeDoc(d: any) {
    if (!confirm("¿Eliminar este documento?")) return;
    await supabase.storage.from("claim-documents").remove([d.file_path]);
    const { error } = await supabase.from("claim_documents").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    load(d.claim_id);
  }

  return (
    <Dialog open={!!claim} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos · {claim?.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3">
          <Field label="Nombre del documento"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Burofax recibido" /></Field>
          <Field label="Fecha del documento"><Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} /></Field>
          <Field label="Archivo PDF" full>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <div className="col-span-2 flex justify-end">
            <Button size="sm" onClick={upload} disabled={!file || uploading}>
              <Upload className="mr-1 h-4 w-4" />{uploading ? "Subiendo…" : "Adjuntar documento"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay documentos adjuntos.</p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.doc_date ? formatDate(d.doc_date) : "Sin fecha"} · subido {formatDate(d.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDoc(d)} title="Abrir"><ExternalLink className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDoc(d)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const eventPresets = [
  "Burofax enviado",
  "Burofax recibido",
  "Documentación enviada al abogado",
  "Citación",
  "Demanda",
  "Sentencia",
  "Llamada al cliente",
];

function ClaimEventsDialog({ claim, onClose }: { claim: any | null; onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  async function load(id: string) {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("claim_events").select("*").eq("claim_id", id)
      .order("event_date", { ascending: false }).order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (claim?.id) load(claim.id); else setEvents([]);
    setTitle(""); setNotes(""); setDate(new Date().toISOString().slice(0, 10));
  }, [claim?.id]);

  async function add() {
    if (!claim || !title.trim() || !date) return;
    setSaving(true);
    const { error } = await (supabase as any).from("claim_events").insert({
      claim_id: claim.id, title: title.trim(), event_date: date, notes: notes.trim() || null, deadline_date: deadline || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Evento registrado");
    setTitle(""); setNotes(""); setDeadline("");
    load(claim.id); qc.invalidateQueries({ queryKey: ["claim_event_deadlines"] });
  }

  async function removeEvent(ev: any) {
    if (!confirm("¿Eliminar este evento?")) return;
    const { error } = await (supabase as any).from("claim_events").delete().eq("id", ev.id);
    if (error) { toast.error(error.message); return; }
    load(ev.claim_id); qc.invalidateQueries({ queryKey: ["claim_event_deadlines"] });
  }

  async function toggleDone(ev: any) {
    const { error } = await (supabase as any).from("claim_events").update({ deadline_done: !ev.deadline_done }).eq("id", ev.id);
    if (error) { toast.error(error.message); return; }
    load(ev.claim_id); qc.invalidateQueries({ queryKey: ["claim_event_deadlines"] });
  }

  return (
    <Dialog open={!!claim} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Eventos · {claim?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {eventPresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTitle(p)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  title === p ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >{p}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Evento"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Elige uno o escribe el tuyo" /></Field>
            <Field label="Fecha"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Fecha límite de contestación (opcional)"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
            <Field label="Notas" full><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={add} disabled={!title.trim() || !date || saving}>
              <Plus className="mr-1 h-4 w-4" />{saving ? "Guardando…" : "Añadir evento"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay eventos registrados.</p>
          ) : (
            <ol className="relative ml-2 border-l border-border">
              {events.map((ev) => (
                <li key={ev.id} className="mb-3 ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{formatDate(ev.event_date)}</div>
                      <div className="text-sm font-medium">{ev.title}</div>
                      {ev.notes && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{ev.notes}</p>}
                      {ev.deadline_date && (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {ev.deadline_done
                            ? <span className="rounded-md border border-status-green-fg/40 bg-status-green px-2 py-1 text-xs text-status-green-fg">Contestado · límite {formatDate(ev.deadline_date)}</span>
                            : <DeadlineBadge date={ev.deadline_date} label="Límite" />}
                          <button type="button" onClick={() => toggleDone(ev)} className="text-xs underline text-muted-foreground hover:text-foreground">
                            {ev.deadline_done ? "Marcar pendiente" : "Marcar contestado"}
                          </button>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeEvent(ev)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ClaimDetailDialog({ claim, onClose }: { claim: any | null; onClose: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!claim) return;
    setLoading(true);
    Promise.all([
      (supabase as any).from("claim_events").select("*").eq("claim_id", claim.id),
      supabase.from("claim_documents").select("*").eq("claim_id", claim.id),
    ]).then(([e, d]: any[]) => {
      setEvents(e.data ?? []);
      setDocs(d.data ?? []);
      setLoading(false);
    });
  }, [claim?.id]);

  const timeline = useMemo(() => {
    if (!claim) return [];
    const items: { date: string; title: string; notes?: string; kind: "event" | "doc" | "milestone" | "created"; doc?: any }[] = [];
    items.push({ date: claim.created_at, title: "Reclamación registrada", kind: "created" });
    milestones.forEach((m) => {
      if (claim[m.key] && claim[m.date]) items.push({ date: claim[m.date], title: m.label, kind: "milestone" });
    });
    events.forEach((ev) => items.push({ date: ev.event_date ?? ev.date ?? ev.created_at, title: ev.title, notes: ev.notes, kind: "event" }));
    docs.forEach((d) => items.push({ date: d.document_date ?? d.doc_date ?? d.created_at, title: `Documento: ${d.name ?? d.file_name ?? "PDF"}`, kind: "doc", doc: d }));
    if (claim.response_deadline) items.push({ date: claim.response_deadline, title: "Plazo de contestación", kind: "milestone" });
    return items.filter((i) => i.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [claim, events, docs]);

  async function openDoc(d: any) {
    const { data, error } = await supabase.storage.from("claim-documents").createSignedUrl(d.file_path, 600);
    if (error || !data) { toast.error("No se pudo abrir el documento"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const icon = (k: string) =>
    k === "doc" ? <FileText className="h-3.5 w-3.5" /> : k === "milestone" ? <Gavel className="h-3.5 w-3.5" /> : k === "created" ? <Flag className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />;
  const tone = (k: string) =>
    k === "doc" ? "bg-status-blue text-status-blue-fg border-status-blue-fg/40" : k === "milestone" ? "bg-status-amber text-status-amber-fg border-status-amber-fg/40" : k === "created" ? "bg-muted text-muted-foreground border-border" : "bg-status-green text-status-green-fg border-status-green-fg/40";

  return (
    <Dialog open={!!claim} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="h-4 w-4" />{claim?.title}</DialogTitle>
        </DialogHeader>
        {claim && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", statusTone[claim.status])}>{claimStatusLabels[claim.status] ?? claim.status}</span>
              {claim.amount_claimed != null && <span className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">Reclama {formatCurrency(claim.amount_claimed, 2)}</span>}
            </div>

            <section className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Persona / empresa</h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Nombre" value={claim.person_name} />
                <DetailRow label="DNI / CIF" value={claim.person_dni} />
                <DetailRow label="Teléfono" value={claim.person_phone} />
                <DetailRow label="Email" value={claim.person_email} />
                <DetailRow label="Dirección" value={claim.person_address} />
                <DetailRow label="Vehículo" value={[claim.vehicle_model, claim.vehicle_plate].filter(Boolean).join(" · ")} />
              </div>
            </section>

            <section className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Reclamación</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><DetailRow label="Asunto" value={claim.subject} /></div>
                <div className="col-span-2"><DetailRow label="Solución pedida" value={claim.requested_solution} /></div>
                <DetailRow label="Plazo de contestación" value={claim.response_deadline ? formatDate(claim.response_deadline) : ""} />
                <DetailRow label="Abogado" value={claim.lawyer_name} />
                <div className="col-span-2"><DetailRow label="Sentencia" value={claim.judgment_result} /></div>
                <div className="col-span-2"><DetailRow label="Notas" value={claim.notes} /></div>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Historial cronológico</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (
                <ol className="relative ml-3 border-l border-border">
                  {timeline.map((it, i) => (
                    <li key={i} className="mb-4 ml-5">
                      <span className={cn("absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border", tone(it.kind))}>{icon(it.kind)}</span>
                      <div className="text-[11px] text-muted-foreground">{formatDate(it.date)}</div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {it.title}
                        {it.doc && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDoc(it.doc)} title="Abrir"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                      {it.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{it.notes}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
