import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { useClients } from "@/hooks/data/useDealership";
import { clientStatusLabels, clientStatusTone, clientTypeLabels, formatDate } from "@/lib/labels";
import { toast } from "sonner";

type FormState = {
  full_name: string;
  dni: string;
  phone: string;
  email: string;
  client_type: "seller" | "buyer" | "both";
  status: "new" | "in_followup" | "closed";
  last_contact_date: string;
  notes: string;
};

const empty: FormState = { full_name: "", dni: "", phone: "", email: "", client_type: "buyer", status: "new", last_contact_date: "", notes: "" };

export default function ClientsPage() {
  const { data: clients = [] } = useClients();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return clients.filter((c: any) =>
      [c.full_name, c.email, c.phone, c.dni].filter(Boolean).join(" ").toLowerCase().includes(s),
    );
  }, [clients, search]);

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c: any) {
    setEditing(c);
    setForm({
      full_name: c.full_name ?? "",
      dni: c.dni ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      client_type: c.client_type,
      status: c.status,
      last_contact_date: c.last_contact_date ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const payload = { ...form, dni: form.dni || null, last_contact_date: form.last_contact_date || null };
    const { error } = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Cliente actualizado" : "Cliente creado");
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente eliminado");
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clients.length} contactos`}
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="h-9 w-56 pl-8" />
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nuevo cliente</Button>
          </>
        }
      />

      <div className="p-6">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nombre</th>
                <th className="px-4 py-2.5 font-medium">DNI</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Teléfono</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Último contacto</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">Aún no hay clientes.</td></tr>
              )}
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{c.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.dni || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{clientTypeLabels[c.client_type]}</td>
                  <td className="px-4 py-2.5"><StatusBadge label={clientStatusLabels[c.status]} tone={clientStatusTone[c.status]} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.email || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(c.last_contact_date)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        trigger={null as any}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
        onSubmit={save}
      >
        <Field label="Nombre completo" full><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
        <Field label="DNI"><Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} placeholder="12345678A" /></Field>
        <Field label="Teléfono"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Tipo">
          <Select value={form.client_type} onValueChange={(v) => setForm({ ...form, client_type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(clientTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(clientStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Último contacto" full><Input type="date" value={form.last_contact_date} onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })} /></Field>
        <Field label="Notas" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </RecordDialog>
    </div>
  );
}