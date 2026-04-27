import { useState } from "react";
import { Plus, LayoutGrid, Table as TableIcon, Pencil, Trash2 } from "lucide-react";
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
import { useAppraisals, useClients } from "@/hooks/data/useDealership";
import { appraisalStatusLabels, appraisalStatusOrder, appraisalStatusTone, formatCurrency, formatDate, fuelTypeLabels } from "@/lib/labels";
import { toast } from "sonner";

const empty = {
  client_id: "", brand: "", model: "", year: "" as any, mileage: "" as any, fuel_type: "gasoline",
  vehicle_condition: "", estimated_price: "" as any, offered_price: "" as any,
  deal_status: "pending", follow_up_date: "", notes: "",
};

export default function AppraisalsPage() {
  const { data: appraisals = [] } = useAppraisals();
  const { data: clients = [] } = useClients();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  function openNew() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(a: any) {
    setEditing(a);
    setForm({
      client_id: a.client_id ?? "", brand: a.brand, model: a.model, year: a.year ?? "",
      mileage: a.mileage ?? "", fuel_type: a.fuel_type ?? "gasoline", vehicle_condition: a.vehicle_condition ?? "",
      estimated_price: a.estimated_price ?? "", offered_price: a.offered_price ?? "",
      deal_status: a.deal_status, follow_up_date: a.follow_up_date ?? "", notes: a.notes ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      client_id: form.client_id || null,
      year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      estimated_price: form.estimated_price === "" ? null : Number(form.estimated_price),
      offered_price: form.offered_price === "" ? null : Number(form.offered_price),
      follow_up_date: form.follow_up_date || null,
    };
    const { error } = editing
      ? await supabase.from("vehicle_appraisals").update(payload).eq("id", editing.id)
      : await supabase.from("vehicle_appraisals").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("vehicle_appraisals").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }

  return (
    <div>
      <PageHeader
        title="Vehicle appraisals"
        description="Cars clients want to sell us"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("kanban")}><LayoutGrid className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("table")}><TableIcon className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />New appraisal</Button>
          </>
        }
      />
      <div className="p-6">
        {view === "kanban" ? (
          <KanbanBoard
            columns={appraisalStatusOrder.map((s) => ({ id: s, title: appraisalStatusLabels[s], count: appraisals.filter((a: any) => a.deal_status === s).length }))}
            renderCards={(col) =>
              appraisals.filter((a: any) => a.deal_status === col).map((a: any) => (
                <button key={a.id} onClick={() => openEdit(a)} className="rounded-md border border-border bg-card p-3 text-left transition-colors hover:border-foreground/20">
                  <div className="text-sm font-medium">{a.brand} {a.model}</div>
                  <div className="text-xs text-muted-foreground">{a.client?.full_name ?? "Unknown client"}</div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{a.year ?? "—"}</span>
                    <span className="font-medium">{formatCurrency(a.offered_price ?? a.estimated_price)}</span>
                  </div>
                  {a.follow_up_date && <div className="mt-1 text-[11px] text-muted-foreground">Follow-up {formatDate(a.follow_up_date)}</div>}
                </button>
              ))
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Vehicle</th><th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Estimated</th><th className="px-4 py-2.5 font-medium">Offered</th>
                <th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Follow-up</th><th></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {appraisals.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{a.brand} {a.model} <span className="text-muted-foreground">{a.year ?? ""}</span></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{a.client?.full_name ?? "—"}</td>
                    <td className="px-4 py-2.5">{formatCurrency(a.estimated_price)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(a.offered_price)}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={appraisalStatusLabels[a.deal_status]} tone={appraisalStatusTone[a.deal_status]} /></td>
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
      </div>

      <RecordDialog open={open} onOpenChange={setOpen} trigger={null as any} title={editing ? "Edit appraisal" : "New appraisal"} onSubmit={save}>
        <Field label="Client" full>
          <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Brand"><Input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Model"><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
        <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
        <Field label="Mileage"><Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field>
        <Field label="Fuel">
          <Select value={form.fuel_type} onValueChange={(v) => setForm({ ...form, fuel_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Condition"><Input value={form.vehicle_condition} onChange={(e) => setForm({ ...form, vehicle_condition: e.target.value })} placeholder="Excellent / Good / Fair…" /></Field>
        <Field label="Estimated price (€)"><Input type="number" value={form.estimated_price} onChange={(e) => setForm({ ...form, estimated_price: e.target.value })} /></Field>
        <Field label="Offered price (€)"><Input type="number" value={form.offered_price} onChange={(e) => setForm({ ...form, offered_price: e.target.value })} /></Field>
        <Field label="Deal status">
          <Select value={form.deal_status} onValueChange={(v) => setForm({ ...form, deal_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(appraisalStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Follow-up date"><Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} /></Field>
        <Field label="Notes" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </RecordDialog>
    </div>
  );
}