import { useMemo, useState } from "react";
import { Plus, LayoutGrid, Table as TableIcon, Pencil, Trash2, Car, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { useStock } from "@/hooks/data/useDealership";
import { daysUntil, formatCurrency, formatDate, fuelTypeLabels, stockStatusLabels, stockStatusTone } from "@/lib/labels";
import { toast } from "sonner";

const emptyForm = {
  brand: "", model: "", year: "" as any, mileage: "" as any, fuel_type: "gasoline",
  purchase_price: "" as any, selling_price: "" as any, status: "preparing",
  entry_date: new Date().toISOString().slice(0, 10), next_itv_date: "", location: "", image_url: "", notes: "",
};

export default function StockPage() {
  const { data: stock = [] } = useStock();
  const qc = useQueryClient();
  const [view, setView] = useState<"gallery" | "table">("gallery");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => (onlyAvailable ? stock.filter((s: any) => s.status === "available") : stock),
    [stock, onlyAvailable],
  );

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      brand: s.brand, model: s.model, year: s.year ?? "", mileage: s.mileage ?? "",
      fuel_type: s.fuel_type ?? "gasoline", purchase_price: s.purchase_price ?? 0, selling_price: s.selling_price ?? 0,
      status: s.status, entry_date: s.entry_date, next_itv_date: s.next_itv_date ?? "",
      location: s.location ?? "", image_url: s.image_url ?? "", notes: s.notes ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      next_itv_date: form.next_itv_date || null,
    };
    const { error } = editing
      ? await supabase.from("vehicle_stock").update(payload).eq("id", editing.id)
      : await supabase.from("vehicle_stock").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Vehicle updated" : "Vehicle added");
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    const { error } = await supabase.from("vehicle_stock").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
  }

  return (
    <div>
      <PageHeader
        title="Vehicle stock"
        description={`${stock.length} vehicles`}
        actions={
          <>
            <Button size="sm" variant={onlyAvailable ? "secondary" : "ghost"} onClick={() => setOnlyAvailable((v) => !v)}>
              <Filter className="mr-1 h-3.5 w-3.5" />Available only
            </Button>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "gallery" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("gallery")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("table")}>
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Add vehicle</Button>
          </>
        }
      />
      <div className="p-6">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">No vehicles.</div>
        ) : view === "gallery" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((s: any) => {
              const itvDays = daysUntil(s.next_itv_date);
              return (
                <div key={s.id} className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/20">
                  <div className="flex h-36 items-center justify-center bg-muted">
                    {s.image_url ? <img src={s.image_url} alt={`${s.brand} ${s.model}`} className="h-full w-full object-cover" /> : <Car className="h-10 w-10 text-muted-foreground" />}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{s.brand} {s.model}</div>
                        <div className="text-xs text-muted-foreground">{s.year ?? "—"} · {s.mileage ? `${Number(s.mileage).toLocaleString()} km` : "—"}</div>
                      </div>
                      <StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Selling</div><div className="font-medium">{formatCurrency(s.selling_price)}</div></div>
                      <div><div className="text-muted-foreground">Margin</div><div className="font-medium text-success">{formatCurrency(s.profit_margin)}</div></div>
                    </div>
                    {itvDays !== null && itvDays <= 30 && (
                      <div className={`mt-2 rounded px-2 py-1 text-[11px] font-medium ${itvDays < 0 ? "bg-status-red text-status-red-fg" : itvDays <= 7 ? "bg-status-amber text-status-amber-fg" : "bg-status-blue text-status-blue-fg"}`}>
                        ITV {itvDays < 0 ? `${Math.abs(itvDays)}d overdue` : `in ${itvDays}d`}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Vehicle</th><th className="px-4 py-2.5 font-medium">Year</th><th className="px-4 py-2.5 font-medium">Km</th>
                <th className="px-4 py-2.5 font-medium">Purchase</th><th className="px-4 py-2.5 font-medium">Selling</th><th className="px-4 py-2.5 font-medium">Margin</th>
                <th className="px-4 py-2.5 font-medium">ITV</th><th className="px-4 py-2.5 font-medium">Status</th><th></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{s.brand} {s.model}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.year ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.mileage ? Number(s.mileage).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2.5">{formatCurrency(s.purchase_price)}</td>
                    <td className="px-4 py-2.5">{formatCurrency(s.selling_price)}</td>
                    <td className="px-4 py-2.5 text-success">{formatCurrency(s.profit_margin)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.next_itv_date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordDialog open={open} onOpenChange={setOpen} trigger={null as any} title={editing ? "Edit vehicle" : "Add vehicle"} onSubmit={save}>
        <Field label="Brand"><Input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Model"><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
        <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
        <Field label="Mileage (km)"><Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field>
        <Field label="Fuel">
          <Select value={form.fuel_type} onValueChange={(v) => setForm({ ...form, fuel_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(stockStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Purchase price (€)"><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></Field>
        <Field label="Selling price (€)"><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Field>
        <Field label="Entry date"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
        <Field label="Next ITV"><Input type="date" value={form.next_itv_date} onChange={(e) => setForm({ ...form, next_itv_date: e.target.value })} /></Field>
        <Field label="Location" full><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Image URL" full><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Notes" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </RecordDialog>
    </div>
  );
}