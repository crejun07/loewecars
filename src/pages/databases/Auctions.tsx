import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Car, Search, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { useAuctions } from "@/hooks/data/useDealership";
import { formatCurrency, formatDate, fuelTypeLabels, transmissionLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const emptyForm = {
  brand: "", model: "", license_plate: "", year: "" as any, mileage: "" as any,
  fuel_type: "gasoline", transmission: "manual",
  purchase_price: "" as any, selling_price: "" as any,
  auction_house: "", auction_date: "", lot_reference: "",
  payment_done: false, payment_date: "",
  withdrawal_authorized: false, ready_for_pickup: false,
  picked_up: false, picked_up_date: "", picked_up_by: "",
  notes: "",
};

const steps = [
  { key: "payment_done", label: "Pago hecho" },
  { key: "withdrawal_authorized", label: "Autorización retirada" },
  { key: "ready_for_pickup", label: "Listo para retirar" },
  { key: "picked_up", label: "Retirado" },
] as const;

export default function AuctionsPage() {
  const { data: auctions = [] } = useAuctions();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("pending");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (auctions as any[]).filter((a) => {
      if (filter === "pending" && a.picked_up) return false;
      if (filter === "done" && !a.picked_up) return false;
      if (!q) return true;
      return (
        (a.brand ?? "").toLowerCase().includes(q) ||
        (a.model ?? "").toLowerCase().includes(q) ||
        (a.license_plate ?? "").toLowerCase().includes(q) ||
        (a.auction_house ?? "").toLowerCase().includes(q)
      );
    });
  }, [auctions, search, filter]);

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(a: any) {
    setEditing(a);
    setForm({
      brand: a.brand, model: a.model, license_plate: a.license_plate ?? "",
      year: a.year ?? "", mileage: a.mileage ?? "",
      fuel_type: a.fuel_type ?? "gasoline", transmission: a.transmission ?? "manual",
      purchase_price: a.purchase_price ?? 0, selling_price: a.selling_price ?? 0,
      auction_house: a.auction_house ?? "", auction_date: a.auction_date ?? "", lot_reference: a.lot_reference ?? "",
      payment_done: !!a.payment_done, payment_date: a.payment_date ?? "",
      withdrawal_authorized: !!a.withdrawal_authorized, ready_for_pickup: !!a.ready_for_pickup,
      picked_up: !!a.picked_up, picked_up_date: a.picked_up_date ?? "", picked_up_by: a.picked_up_by ?? "",
      notes: a.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const payload: any = {
      ...form,
      license_plate: (form.license_plate || "").trim().toUpperCase() || null,
      year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      auction_date: form.auction_date || null,
      payment_date: form.payment_date || null,
      picked_up_date: form.picked_up_date || null,
      picked_up_by: form.picked_up_by || null,
      auction_house: form.auction_house || null,
      lot_reference: form.lot_reference || null,
    };
    const { error } = editing
      ? await supabase.from("auctions").update(payload).eq("id", editing.id)
      : await supabase.from("auctions").insert(payload);
    if (error) { toast.error(error.message); throw error; }
    toast.success(editing ? "Vehículo actualizado" : "Vehículo añadido a subastas");
    qc.invalidateQueries({ queryKey: ["auctions"] });
    qc.invalidateQueries({ queryKey: ["auction_stock_requests"] });
  }

  async function toggleStep(a: any, key: string) {
    const value = !a[key];
    const patch: any = { [key]: value };
    if (key === "picked_up") patch.picked_up_date = value ? new Date().toISOString().slice(0, 10) : null;
    if (key === "payment_done") patch.payment_date = value ? new Date().toISOString().slice(0, 10) : null;
    const { error } = await supabase.from("auctions").update(patch).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    if (key === "picked_up" && value) toast.success("Marcado como retirado: se ha enviado la solicitud de alta a Stock");
    qc.invalidateQueries({ queryKey: ["auctions"] });
    qc.invalidateQueries({ queryKey: ["auction_stock_requests"] });
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este vehículo de subastas?")) return;
    const { error } = await supabase.from("auctions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["auctions"] });
    qc.invalidateQueries({ queryKey: ["auction_stock_requests"] });
  }

  return (
    <div>
      <PageHeader
        title="Subastas"
        description={`${auctions.length} vehículos en subastas`}
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={filter === "pending" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setFilter("pending")}>Pendientes</Button>
              <Button size="sm" variant={filter === "done" ? "secondary" : "ghost"} className="rounded-none border-x border-border" onClick={() => setFilter("done")}>Retirados</Button>
              <Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setFilter("all")}>Todos</Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Añadir vehículo</Button>
          </>
        }
      />

      <div className="p-6">
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por marca, modelo, matrícula o casa de subastas…" className="pl-9" />
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">Sin vehículos en subastas.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((a: any) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{a.brand} {a.model}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.license_plate && <span className="font-mono">{a.license_plate} · </span>}
                      {a.year ?? "—"} · {a.mileage ? `${a.mileage.toLocaleString("es-ES")} km` : "— km"}
                      {a.fuel_type && ` · ${fuelTypeLabels[a.fuel_type] ?? a.fuel_type}`}
                      {a.transmission && ` · ${transmissionLabels[a.transmission] ?? a.transmission}`}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.auction_house || "Sin casa de subastas"}
                      {a.lot_reference && ` · Lote ${a.lot_reference}`}
                      {a.auction_date && ` · ${formatDate(a.auction_date)}`}
                      {" · "}Compra {formatCurrency(a.purchase_price, 2)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {steps.map((s) => {
                    const active = !!a[s.key];
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleStep(a, s.key)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-status-green/50 bg-status-green/15 text-status-green"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full border", active ? "border-status-green bg-status-green/30" : "border-muted-foreground/40")}>
                          {active && <Check className="h-2.5 w-2.5" />}
                        </span>
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {a.picked_up && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Retirado {a.picked_up_date ? `el ${formatDate(a.picked_up_date)}` : ""} {a.picked_up_by ? `· lo trajo ${a.picked_up_by}` : "· sin indicar quién lo trajo"}
                    {a.stock_request_status === "pending" && <span className="ml-1 text-status-amber">· solicitud enviada a stock</span>}
                    {a.stock_request_status === "accepted" && <span className="ml-1 text-status-green">· dado de alta en stock</span>}
                  </div>
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
        title={editing ? "Editar vehículo de subasta" : "Nuevo vehículo de subasta"}
        onSubmit={save}
      >
        <Field label="Marca"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></Field>
        <Field label="Modelo"><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></Field>
        <Field label="Matrícula"><Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value })} /></Field>
        <Field label="Año"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
        <Field label="Kilómetros"><Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field>
        <Field label="Combustible">
          <Select value={form.fuel_type} onValueChange={(v) => setForm({ ...form, fuel_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Cambio">
          <Select value={form.transmission} onValueChange={(v) => setForm({ ...form, transmission: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(transmissionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Precio compra (€)"><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></Field>
        <Field label="Precio venta previsto (€)"><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Field>
        <Field label="Casa de subastas"><Input value={form.auction_house} onChange={(e) => setForm({ ...form, auction_house: e.target.value })} /></Field>
        <Field label="Lote / referencia"><Input value={form.lot_reference} onChange={(e) => setForm({ ...form, lot_reference: e.target.value })} /></Field>
        <Field label="Fecha subasta"><Input type="date" value={form.auction_date} onChange={(e) => setForm({ ...form, auction_date: e.target.value })} /></Field>

        <Field label="Estado del proceso" full>
          <div className="grid grid-cols-2 gap-2">
            {steps.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setForm({ ...form, [s.key]: !form[s.key] })}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-xs font-medium",
                  form[s.key] ? "border-status-green/50 bg-status-green/15 text-status-green" : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Fecha de pago"><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></Field>
        <Field label="Fecha de retirada"><Input type="date" value={form.picked_up_date} onChange={(e) => setForm({ ...form, picked_up_date: e.target.value })} /></Field>
        <Field label="¿Quién trajo el coche?" full><Input value={form.picked_up_by} onChange={(e) => setForm({ ...form, picked_up_by: e.target.value })} placeholder="Nombre de la persona / transportista" /></Field>
        <Field label="Notas" full><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></Field>
      </RecordDialog>
    </div>
  );
}
