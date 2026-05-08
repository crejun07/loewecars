import { useMemo, useRef, useState } from "react";
import { Plus, LayoutGrid, Table as TableIcon, Pencil, Trash2, Car, Filter, Globe, Upload, X, Loader2, Eye, Search } from "lucide-react";
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
import { usePermissions } from "@/hooks/usePermissions";
import {
  daysUntil, formatCurrency, formatDate, fuelTypeLabels,
  listingStatusLabels, listingStatusOrder, listingStatusTone,
  stockStatusLabels, stockStatusTone, transmissionLabels, vehicleHolderLabels,
} from "@/lib/labels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const emptyForm = {
  brand: "", model: "", license_plate: "", year: "" as any, mileage: "" as any, fuel_type: "gasoline", transmission: "manual",
  purchase_price: "" as any, selling_price: "" as any, status: "preparing",
  listing_status: "pending_listing", holder: "",
  entry_date: new Date().toISOString().slice(0, 10), next_itv_date: "", location: "", image_url: "", notes: "",
};

export default function StockPage() {
  const { data: stock = [] } = useStock();
  const { canViewSensitive } = usePermissions();
  const showSensitive = canViewSensitive("stock");
  const qc = useQueryClient();
  const [view, setView] = useState<"gallery" | "table" | "listings">("gallery");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [colFilters, setColFilters] = useState<{
    yearMin: string; yearMax: string;
    kmMax: string;
    fuel: string; transmission: string;
    status: string; listing: string;
  }>({ yearMin: "", yearMax: "", kmMax: "", fuel: "all", transmission: "all", status: "all", listing: "all" });

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vehicle-images").upload(path, file, { upsert: false });
      if (upErr) { toast.error(upErr.message); return; }
      const { data } = supabase.storage.from("vehicle-images").getPublicUrl(path);
      setForm((f: any) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Imagen subida");
    } finally {
      setUploading(false);
    }
  }

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stock.filter((s: any) => {
      if (onlyAvailable && s.status !== "available") return false;
      if (q && !(
        (s.brand ?? "").toLowerCase().includes(q) ||
        (s.model ?? "").toLowerCase().includes(q) ||
        (s.license_plate ?? "").toLowerCase().includes(q)
      )) return false;
      if (colFilters.yearMin && (!s.year || s.year < Number(colFilters.yearMin))) return false;
      if (colFilters.yearMax && (!s.year || s.year > Number(colFilters.yearMax))) return false;
      if (colFilters.kmMax && (!s.mileage || s.mileage > Number(colFilters.kmMax))) return false;
      if (colFilters.fuel !== "all" && s.fuel_type !== colFilters.fuel) return false;
      if (colFilters.transmission !== "all" && s.transmission !== colFilters.transmission) return false;
      if (colFilters.status !== "all" && s.status !== colFilters.status) return false;
      if (colFilters.listing !== "all" && (s.listing_status ?? "pending_listing") !== colFilters.listing) return false;
      return true;
    });
  }, [stock, onlyAvailable, search, colFilters]);

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      brand: s.brand, model: s.model, license_plate: s.license_plate ?? "", year: s.year ?? "", mileage: s.mileage ?? "",
      fuel_type: s.fuel_type ?? "gasoline", transmission: s.transmission ?? "manual",
      purchase_price: s.purchase_price ?? 0, selling_price: s.selling_price ?? 0,
      status: s.status, listing_status: s.listing_status ?? "pending_listing", holder: s.holder ?? "",
      entry_date: s.entry_date, next_itv_date: s.next_itv_date ?? "",
      location: s.location ?? "", image_url: s.image_url ?? "", notes: s.notes ?? "",
    });
    setOpen(true);
  }
  async function save() {
    const plate = (form.license_plate || "").trim().toUpperCase();
    if (plate) {
      const { data: dup } = await supabase
        .from("vehicle_stock")
        .select("id, brand, model")
        .ilike("license_plate", plate)
        .maybeSingle();
      if (dup && (!editing || dup.id !== editing.id)) {
        toast.error(`Ya existe un vehículo con esa matrícula: ${dup.brand} ${dup.model}`);
        throw new Error("duplicate_plate");
      }
    }
    const payload = {
      ...form,
      license_plate: plate || null,
      holder: form.holder || null,
      year: form.year ? Number(form.year) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      next_itv_date: form.next_itv_date || null,
    };
    const { error } = editing
      ? await supabase.from("vehicle_stock").update(payload).eq("id", editing.id)
      : await supabase.from("vehicle_stock").insert(payload);
    if (error) { toast.error(error.message); throw error; }
    toast.success(editing ? "Vehículo actualizado" : "Vehículo añadido");
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar este vehículo?")) return;
    const { error } = await supabase.from("vehicle_stock").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
  }

  return (
    <div>
      <PageHeader
        title="Stock de vehículos"
        description={`${stock.length} vehículos`}
        actions={
          <>
            <Button size="sm" variant={onlyAvailable ? "secondary" : "ghost"} onClick={() => setOnlyAvailable((v) => !v)}>
              <Filter className="mr-1 h-3.5 w-3.5" />Solo disponibles
            </Button>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "gallery" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("gallery")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="rounded-none border-x border-border" onClick={() => setView("table")}>
                <TableIcon className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={view === "listings" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("listings")} title="Anuncios web">
                <Globe className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Añadir vehículo</Button>
          </>
        }
      />
      <div className="p-6">
        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, modelo o matrícula…"
            className="pl-9"
          />
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">Sin vehículos.</div>
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
                        <div className="truncate text-sm font-semibold">
                          {s.brand} {s.model}
                          {s.license_plate && <span className="ml-1 font-mono text-xs text-muted-foreground">· {s.license_plate}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.year ?? "—"} · {s.mileage ? `${Number(s.mileage).toLocaleString()} km` : "—"}
                          {s.transmission ? ` · ${transmissionLabels[s.transmission]}` : ""}
                          {s.fuel_type ? ` · ${fuelTypeLabels[s.fuel_type]}` : ""}
                        </div>
                      </div>
                      <StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Venta</div><div className="font-medium">{formatCurrency(s.selling_price)}</div></div>
                      <div><div className="text-muted-foreground">Margen</div><div className="font-medium text-success">{showSensitive ? formatCurrency(s.profit_margin) : "—"}</div></div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Globe className="h-3 w-3" />Web
                      </span>
                      <StatusBadge label={listingStatusLabels[s.listing_status ?? "pending_listing"]} tone={listingStatusTone[s.listing_status ?? "pending_listing"]} />
                    </div>
                    {itvDays !== null && itvDays <= 30 && (
                      <div className={`mt-2 rounded px-2 py-1 text-[11px] font-medium ${itvDays < 0 ? "bg-status-red text-status-red-fg" : itvDays <= 7 ? "bg-status-amber text-status-amber-fg" : "bg-status-blue text-status-blue-fg"}`}>
                        ITV {itvDays < 0 ? `vencida ${Math.abs(itvDays)}d` : `en ${itvDays}d`}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewing(s)} title="Ver detalles"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === "table" ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Vehículo</th><th className="px-4 py-2.5 font-medium">Año</th><th className="px-4 py-2.5 font-medium">Km</th>
                <th className="px-4 py-2.5 font-medium">Combustible</th><th className="px-4 py-2.5 font-medium">Cambio</th>
                <th className="px-4 py-2.5 font-medium">Compra</th><th className="px-4 py-2.5 font-medium">Venta</th><th className="px-4 py-2.5 font-medium">Margen</th>
                <th className="px-4 py-2.5 font-medium">ITV</th><th className="px-4 py-2.5 font-medium">Estado</th><th className="px-4 py-2.5 font-medium">Web</th><th></th>
              </tr></thead>
              <thead><tr className="border-b border-border bg-card text-left text-xs">
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Desde" value={colFilters.yearMin} onChange={(e) => setColFilters({ ...colFilters, yearMin: e.target.value })} className="h-7 w-20 text-xs" />
                    <Input type="number" placeholder="Hasta" value={colFilters.yearMax} onChange={(e) => setColFilters({ ...colFilters, yearMax: e.target.value })} className="h-7 w-20 text-xs" />
                  </div>
                </th>
                <th className="px-2 py-2">
                  <Input type="number" placeholder="Máx" value={colFilters.kmMax} onChange={(e) => setColFilters({ ...colFilters, kmMax: e.target.value })} className="h-7 w-24 text-xs" />
                </th>
                <th className="px-2 py-2">
                  <Select value={colFilters.fuel} onValueChange={(v) => setColFilters({ ...colFilters, fuel: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-2 py-2">
                  <Select value={colFilters.transmission} onValueChange={(v) => setColFilters({ ...colFilters, transmission: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(transmissionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <Select value={colFilters.status} onValueChange={(v) => setColFilters({ ...colFilters, status: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(stockStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-2 py-2">
                  <Select value={colFilters.listing} onValueChange={(v) => setColFilters({ ...colFilters, listing: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(listingStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-2 py-2"></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">
                      {s.brand} {s.model}
                      {s.license_plate && <span className="ml-1 font-mono text-xs text-muted-foreground">· {s.license_plate}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.year ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.mileage ? Number(s.mileage).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.fuel_type ? fuelTypeLabels[s.fuel_type] : "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.transmission ? transmissionLabels[s.transmission] : "—"}</td>
                    <td className="px-4 py-2.5">{showSensitive ? formatCurrency(s.purchase_price) : "—"}</td>
                    <td className="px-4 py-2.5">{formatCurrency(s.selling_price)}</td>
                    <td className="px-4 py-2.5 text-success">{showSensitive ? formatCurrency(s.profit_margin) : "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.next_itv_date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} /></td>
                    <td className="px-4 py-2.5"><StatusBadge label={listingStatusLabels[s.listing_status ?? "pending_listing"]} tone={listingStatusTone[s.listing_status ?? "pending_listing"]} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewing(s)} title="Ver detalles"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {listingStatusOrder.map((ls) => {
              const group = items.filter((s: any) => (s.listing_status ?? "pending_listing") === ls);
              return (
                <div key={ls} className="flex flex-col rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge label={listingStatusLabels[ls]} tone={listingStatusTone[ls]} />
                    </div>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{group.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {group.length === 0 ? (
                      <div className="px-2 py-6 text-center text-xs text-muted-foreground">Sin vehículos</div>
                    ) : group.map((s: any) => (
                      <button key={s.id} onClick={() => openEdit(s)} className="rounded-md border border-border bg-card p-3 text-left hover:border-foreground/20">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {s.brand} {s.model}
                              {s.license_plate && <span className="ml-1 font-mono text-[11px] text-muted-foreground">· {s.license_plate}</span>}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {s.year ?? "—"}{s.mileage ? ` · ${Number(s.mileage).toLocaleString()} km` : ""}
                            </div>
                          </div>
                          <StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{s.fuel_type ? fuelTypeLabels[s.fuel_type] : "—"}{s.transmission ? ` · ${transmissionLabels[s.transmission]}` : ""}</span>
                          <span className="font-medium">{formatCurrency(s.selling_price)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecordDialog open={open} onOpenChange={setOpen} trigger={null as any} title={editing ? "Editar vehículo" : "Añadir vehículo"} onSubmit={save}>
        <Field label="Marca"><Input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Modelo"><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
        <Field label="Matrícula" full><Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })} placeholder="2354LHB" maxLength={10} /></Field>
        <Field label="Año"><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
        <Field label="Kilómetros"><Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} /></Field>
        <Field label="Combustible">
          <Select value={form.fuel_type} onValueChange={(v) => setForm({ ...form, fuel_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(fuelTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Transmisión">
          <Select value={form.transmission} onValueChange={(v) => setForm({ ...form, transmission: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(transmissionLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(stockStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Titularidad">
          <Select value={form.holder || "__none__"} onValueChange={(v) => setForm({ ...form, holder: v === "__none__" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Sin asignar —</SelectItem>
              {Object.entries(vehicleHolderLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Anuncio web">
          <Select value={form.listing_status} onValueChange={(v) => setForm({ ...form, listing_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(listingStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {showSensitive && (
          <Field label="Precio de compra (€)"><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></Field>
        )}
        <Field label="Precio de venta (€)"><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Field>
        <Field label="Fecha de entrada"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
        <Field label="Próxima ITV"><Input type="date" value={form.next_itv_date} onChange={(e) => setForm({ ...form, next_itv_date: e.target.value })} /></Field>
        <Field label="Ubicación" full><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Imagen del vehículo" full>
          <div className="space-y-2">
            {form.image_url ? (
              <div className="relative inline-block">
                <img src={form.image_url} alt="Vehículo" className="h-32 w-auto rounded-md border border-border object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  onClick={() => setForm({ ...form, image_url: "" })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span>{uploading ? "Subiendo…" : "Haz clic para subir una imagen"}</span>
                <span className="text-[10px]">JPG, PNG · máx. 5 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        </Field>
        <Field label="Notas" full><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </RecordDialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.brand} {viewing?.model}{viewing?.license_plate ? ` · ${viewing.license_plate}` : ""}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              {viewing.image_url && <img src={viewing.image_url} alt="" className="w-full rounded-md border border-border object-cover" />}
              <div className="grid grid-cols-2 gap-2">
                <Detail label="Año" value={viewing.year ?? "—"} />
                <Detail label="Kilómetros" value={viewing.mileage ? Number(viewing.mileage).toLocaleString() : "—"} />
                <Detail label="Combustible" value={viewing.fuel_type ? fuelTypeLabels[viewing.fuel_type] : "—"} />
                <Detail label="Transmisión" value={viewing.transmission ? transmissionLabels[viewing.transmission] : "—"} />
                <Detail label="Estado" value={stockStatusLabels[viewing.status] ?? viewing.status} />
                <Detail label="Anuncio web" value={listingStatusLabels[viewing.listing_status ?? "pending_listing"]} />
                <Detail label="Titularidad" value={viewing.holder ? vehicleHolderLabels[viewing.holder] ?? viewing.holder : "—"} />
                <Detail label="Ubicación" value={viewing.location || "—"} />
                <Detail label="Precio compra" value={showSensitive ? formatCurrency(viewing.purchase_price) : "—"} />
                <Detail label="Precio venta" value={formatCurrency(viewing.selling_price)} />
                <Detail label="Margen" value={showSensitive ? formatCurrency(viewing.profit_margin) : "—"} />
                <Detail label="Fecha entrada" value={formatDate(viewing.entry_date)} />
                <Detail label="Próxima ITV" value={formatDate(viewing.next_itv_date)} />
              </div>
              {viewing.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Notas</div>
                  <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-sm">{viewing.notes}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}