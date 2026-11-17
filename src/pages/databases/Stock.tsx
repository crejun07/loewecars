import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LayoutGrid, Table as TableIcon, Pencil, Trash2, Car, Filter, Globe, Upload, X, Loader2, Eye, Search, ArrowUpDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { QuickStatusToggle } from "@/components/shared/QuickStatusToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, RecordDialog } from "@/components/shared/RecordDialog";
import { WhatsAppShare } from "@/components/shared/WhatsAppShare";
import { useStock, useStockRequests, useAuctionStockRequests } from "@/hooks/data/useDealership";
import { usePermissions } from "@/hooks/usePermissions";
import {
  daysUntil, formatCurrency, formatDate, fuelTypeLabels,
  listingStatusLabels, listingStatusOrder, listingStatusTone,
  stockStatusLabels, stockStatusTone, transmissionLabels, vehicleHolderLabels,
} from "@/lib/labels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { VehicleDocuments } from "@/components/shared/VehicleDocuments";

const emptyForm = {
  brand: "", model: "", license_plate: "", vin: "", horsepower: "", first_registration_date: "", insured: false, mileage: "" as any, fuel_type: "gasoline", transmission: "manual",
  purchase_price: "" as any, selling_price: "" as any, status: "preparing",
  listing_status: "pending_listing", holder: "", vat_type: "rg",
  entry_date: new Date().toISOString().slice(0, 10), next_itv_date: "", bate_date: "", location: "", image_url: "", notes: "",
};

export default function StockPage() {
  const { data: stock = [] } = useStock();
  const { data: stockRequests = [] } = useStockRequests();
  const { data: auctionRequests = [] } = useAuctionStockRequests();
  const { canViewSensitive } = usePermissions();
  const navigate = useNavigate();
  const showSensitive = canViewSensitive("stock");
  const qc = useQueryClient();
  const [view, setView] = useState<"gallery" | "table" | "listings">("gallery");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [group, setGroup] = useState<"active" | "sold">("active");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("entry_date_desc");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function compressImage(file: File, maxBytes: number): Promise<Blob> {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("img"));
      i.src = dataUrl;
    });
    let { width, height } = img;
    const MAX_DIM = 2400;
    if (width > MAX_DIM || height > MAX_DIM) {
      const r = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * r);
      height = Math.round(height * r);
    }
    let quality = 0.85;
    for (let i = 0; i < 8; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
      if (blob.size <= maxBytes) return blob;
      if (quality > 0.5) quality -= 0.1;
      else { width = Math.round(width * 0.85); height = Math.round(height * 0.85); }
    }
    throw new Error("compress failed");
  }
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
    setUploading(true);
    try {
      let toUpload: Blob = file;
      let ext = file.name.split(".").pop() || "jpg";
      const MAX = 5 * 1024 * 1024;
      if (file.size > MAX) {
        try {
          toUpload = await compressImage(file, MAX);
          ext = "jpg";
          toast.info("Imagen comprimida para optimizar el tamaño");
        } catch {
          toast.error("No se pudo comprimir la imagen");
          return;
        }
      }
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("vehicle-images").upload(path, toUpload, { upsert: false, contentType: toUpload.type || file.type });
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
    let filtered = stock.filter((s: any) => {
      if (group === "sold" ? s.status !== "sold" : s.status === "sold") return false;
      const itvDays = daysUntil(s.next_itv_date);
      if (statusFilter === "available" && s.status !== "available") return false;
      if (statusFilter === "bate" && !s.bate_date) return false;
      if (statusFilter === "no_itv" && itvDays !== null) return false;
      if (statusFilter === "itv_expired" && !(itvDays !== null && itvDays < 0)) return false;
      if (q && !(
        (s.brand ?? "").toLowerCase().includes(q) ||
        (s.model ?? "").toLowerCase().includes(q) ||
        (s.license_plate ?? "").toLowerCase().includes(q)
      )) return false;
      if (colFilters.yearMin && (!s.first_registration_date || s.first_registration_date < colFilters.yearMin)) return false;
      if (colFilters.yearMax && (!s.first_registration_date || s.first_registration_date > colFilters.yearMax)) return false;
      if (colFilters.kmMax && (!s.mileage || s.mileage > Number(colFilters.kmMax))) return false;
      if (colFilters.fuel !== "all" && s.fuel_type !== colFilters.fuel) return false;
      if (colFilters.transmission !== "all" && s.transmission !== colFilters.transmission) return false;
      if (colFilters.status !== "all" && s.status !== colFilters.status) return false;
      if (colFilters.listing !== "all" && (s.listing_status ?? "pending_listing") !== colFilters.listing) return false;
      return true;
    });
    const [field, dir] = sortBy.endsWith("_desc") ? [sortBy.slice(0, -5), "desc"] : [sortBy.slice(0, -4), "asc"];
    const ascending = dir === "asc";
    const plateLetters = (plate: string) => {
      if (!plate) return "";
      const cleaned = plate.trim().toUpperCase();
      const parts = cleaned.split(/\s+/);
      const lastPart = parts[parts.length - 1];
      if (/^[A-Z]+$/.test(lastPart)) return lastPart;
      return cleaned.replace(/\d/g, "").replace(/\s/g, "");
    };
    filtered.sort((a: any, b: any) => {
      let cmp = 0;
      if (field === "entry_date") {
        cmp = (a.entry_date || "").localeCompare(b.entry_date || "");
      } else if (field === "created_at") {
        cmp = (a.created_at || "").localeCompare(b.created_at || "");
      } else if (field === "price") {
        cmp = (Number(a.selling_price) || 0) - (Number(b.selling_price) || 0);
      } else if (field === "plate") {
        cmp = plateLetters(a.license_plate).localeCompare(plateLetters(b.license_plate));
      }
      return ascending ? cmp : -cmp;
    });
    return filtered;
  }, [stock, statusFilter, search, colFilters, sortBy, group]);

  const filterCounts = useMemo(() => {
    const inGroup = stock.filter((s: any) => (group === "sold" ? s.status === "sold" : s.status !== "sold"));
    const itv = (s: any) => daysUntil(s.next_itv_date);
    return {
      all: inGroup.length,
      available: inGroup.filter((s: any) => s.status === "available").length,
      bate: inGroup.filter((s: any) => !!s.bate_date).length,
      no_itv: inGroup.filter((s: any) => itv(s) === null).length,
      itv_expired: inGroup.filter((s: any) => { const d = itv(s); return d !== null && d < 0; }).length,
    };
  }, [stock, group]);

  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(s: any) {
    setEditing(s);
    setForm({
      brand: s.brand, model: s.model, license_plate: s.license_plate ?? "", mileage: s.mileage ?? "",
      vin: s.vin ?? "", horsepower: s.horsepower ?? "", first_registration_date: s.first_registration_date ?? "", insured: s.insured ?? false,
      fuel_type: s.fuel_type ?? "gasoline", transmission: s.transmission ?? "manual",
      purchase_price: s.purchase_price ?? 0, selling_price: s.selling_price ?? 0,
      status: s.status, listing_status: s.listing_status ?? "pending_listing", holder: s.holder ?? "",
      vat_type: s.vat_type ?? "rg",
      entry_date: s.entry_date, next_itv_date: s.next_itv_date ?? "", bate_date: s.bate_date ?? "",
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
      vin: form.vin.trim().toUpperCase() || null,
      horsepower: form.horsepower !== "" ? Number(form.horsepower) : null,
      first_registration_date: form.first_registration_date || null,
      insured: form.insured,
      year: form.first_registration_date ? Number(form.first_registration_date.slice(0, 4)) : editing?.year ?? null,
      mileage: form.mileage ? Number(form.mileage) : null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price) || 0,
      next_itv_date: form.next_itv_date || null,
      bate_date: form.bate_date || null,
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

  async function quickUpdateListing(id: string, listing_status: string) {
    const { error } = await supabase.from("vehicle_stock").update({ listing_status: listing_status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
  }

  async function acceptRequest(a: any) {
    const plate = (a.license_plate || "").trim().toUpperCase();
    if (plate) {
      const { data: dup } = await supabase.from("vehicle_stock").select("id").ilike("license_plate", plate).maybeSingle();
      if (dup) { toast.error("Ya existe un vehículo en stock con esa matrícula"); return; }
    }
    const { data: created, error } = await supabase.from("vehicle_stock").insert({
      brand: a.brand, model: a.model,
      license_plate: plate || null,
      year: a.year ?? null, mileage: a.mileage ?? null,
      first_registration_date: a.first_registration_date ?? null,
      horsepower: a.horsepower ?? null,
      fuel_type: a.fuel_type ?? null, transmission: a.transmission ?? null,
      purchase_price: Number(a.offered_price ?? a.appraisal_value ?? 0) || 0,
      selling_price: Number(a.estimated_price ?? 0) || 0,
      status: "preparing" as any,
      listing_status: "pending_listing" as any,
      entry_date: new Date().toISOString().slice(0, 10),
      notes: a.notes ?? null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    const { error: upErr } = await supabase.from("vehicle_appraisals")
      .update({ stock_request_status: "accepted", stock_vehicle_id: created.id })
      .eq("id", a.id);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Vehículo añadido al stock");
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
    qc.invalidateQueries({ queryKey: ["stock_requests"] });
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }

  async function rejectRequest(a: any) {
    const { error } = await supabase.from("vehicle_appraisals")
      .update({ stock_request_status: "rejected" }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["stock_requests"] });
    qc.invalidateQueries({ queryKey: ["vehicle_appraisals"] });
  }

  async function acceptAuctionRequest(a: any) {
    const plate = (a.license_plate || "").trim().toUpperCase();
    if (plate) {
      const { data: dup } = await supabase.from("vehicle_stock").select("id").ilike("license_plate", plate).maybeSingle();
      if (dup) { toast.error("Ya existe un vehículo en stock con esa matrícula"); return; }
    }
    const { data: created, error } = await supabase.from("vehicle_stock").insert({
      brand: a.brand, model: a.model,
      license_plate: plate || null,
      year: a.year ?? null, mileage: a.mileage ?? null,
      fuel_type: a.fuel_type ?? null, transmission: a.transmission ?? null,
      purchase_price: Number(a.purchase_price ?? 0) || 0,
      selling_price: Number(a.selling_price ?? 0) || 0,
      status: "preparing" as any,
      listing_status: "pending_listing" as any,
      entry_date: a.picked_up_date ?? new Date().toISOString().slice(0, 10),
      image_url: a.image_url ?? null,
      notes: a.notes ?? null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    const { error: upErr } = await supabase.from("auctions")
      .update({ stock_request_status: "accepted", stock_vehicle_id: created.id })
      .eq("id", a.id);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Vehículo de subasta añadido al stock");
    qc.invalidateQueries({ queryKey: ["vehicle_stock"] });
    qc.invalidateQueries({ queryKey: ["auction_stock_requests"] });
    qc.invalidateQueries({ queryKey: ["auctions"] });
  }

  async function rejectAuctionRequest(a: any) {
    const { error } = await supabase.from("auctions")
      .update({ stock_request_status: "rejected" }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["auction_stock_requests"] });
    qc.invalidateQueries({ queryKey: ["auctions"] });
  }

  return (
    <div>
      <PageHeader
        title="Stock de vehículos"
        description={`${stock.length} vehículos`}
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={group === "active" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setGroup("active")}>En stock</Button>
              <Button size="sm" variant={group === "sold" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setGroup("sold")}>Vendidos</Button>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs" aria-label="Filtrar vehículos">
                <span className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <SelectValue placeholder="Filtrar" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({filterCounts.all})</SelectItem>
                <SelectItem value="available">Solo disponibles ({filterCounts.available})</SelectItem>
                <SelectItem value="bate">En BATE ({filterCounts.bate})</SelectItem>
                <SelectItem value="no_itv">Sin ITV ({filterCounts.no_itv})</SelectItem>
                <SelectItem value="itv_expired">ITV vencida ({filterCounts.itv_expired})</SelectItem>
              </SelectContent>
            </Select>
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
            <Button size="sm" variant="outline" onClick={() => navigate("/stock/import")}><Upload className="mr-1 h-4 w-4" />Importar</Button>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Añadir vehículo</Button>
          </>
        }
      />
      <div className="p-6">
        {stockRequests.length > 0 && (
          <div className="mb-4 rounded-lg border border-status-amber/50 bg-status-amber/10 p-3">
            <div className="mb-2 text-sm font-semibold">
              Solicitudes de alta en stock ({stockRequests.length})
            </div>
            <div className="space-y-2">
              {(stockRequests as any[]).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {a.brand} {a.model}
                      {a.license_plate && <span className="ml-1 font-mono text-xs text-muted-foreground">· {a.license_plate}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tasación nº {a.appraisal_number ?? "—"} · {a.client?.full_name ?? a.contact_name ?? "Sin cliente"} · Comprado por {formatCurrency(a.offered_price ?? a.appraisal_value)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptRequest(a)}>Aceptar</Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectRequest(a)}>Denegar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {auctionRequests.length > 0 && (
          <div className="mb-4 rounded-lg border border-status-amber/50 bg-status-amber/10 p-3">
            <div className="mb-2 text-sm font-semibold">
              Solicitudes de alta desde Subastas ({auctionRequests.length})
            </div>
            <div className="space-y-2">
              {(auctionRequests as any[]).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {a.brand} {a.model}
                      {a.license_plate && <span className="ml-1 font-mono text-xs text-muted-foreground">· {a.license_plate}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Subasta{a.auction_house ? ` ${a.auction_house}` : ""} · Retirado {a.picked_up_date ? formatDate(a.picked_up_date) : "—"}
                      {a.picked_up_by ? ` por ${a.picked_up_by}` : ""} · Compra {formatCurrency(a.purchase_price, 2)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => acceptAuctionRequest(a)}>Aceptar</Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectAuctionRequest(a)}>Denegar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por marca, modelo o matrícula…"
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">Añadido: más reciente</SelectItem>
              <SelectItem value="created_at_asc">Añadido: más antiguo</SelectItem>
              <SelectItem value="entry_date_desc">Fecha entrada: más reciente</SelectItem>
              <SelectItem value="entry_date_asc">Fecha entrada: más antigua</SelectItem>
              <SelectItem value="price_asc">Precio: más barato</SelectItem>
              <SelectItem value="price_desc">Precio: más caro</SelectItem>
              <SelectItem value="plate_asc">Matrícula: A-Z</SelectItem>
              <SelectItem value="plate_desc">Matrícula: Z-A</SelectItem>
            </SelectContent>
          </Select>
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
                          {formatDate(s.first_registration_date)} · {s.mileage ? `${Number(s.mileage).toLocaleString()} km` : "—"}
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
                    <div className="mt-2">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.vat_type === "rebu" ? "bg-status-amber text-status-amber-fg" : "bg-status-blue text-status-blue-fg"}`}>
                        {s.vat_type === "rebu" ? "REBU (Sin IVA)" : "RG (IVA)"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Globe className="h-3 w-3" />Web
                      </span>
                      <QuickStatusToggle
                        status={s.listing_status ?? "pending_listing"}
                        order={listingStatusOrder as any}
                        labels={listingStatusLabels}
                        tones={listingStatusTone}
                        onChange={(v) => quickUpdateListing(s.id, v)}
                      />
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
                <th className="px-4 py-2.5 font-medium">Vehículo</th><th className="px-4 py-2.5 font-medium">Matriculación</th><th className="px-4 py-2.5 font-medium">Km</th>
                <th className="px-4 py-2.5 font-medium">Combustible</th><th className="px-4 py-2.5 font-medium">Cambio</th>
                <th className="px-4 py-2.5 font-medium">Compra</th><th className="px-4 py-2.5 font-medium">Venta</th><th className="px-4 py-2.5 font-medium">Margen</th>
                <th className="px-4 py-2.5 font-medium">ITV</th><th className="px-4 py-2.5 font-medium">Estado</th><th className="px-4 py-2.5 font-medium">Web</th><th></th>
              </tr></thead>
              <thead><tr className="border-b border-border bg-card text-left text-xs">
                <th className="px-2 py-2"></th>
                <th className="px-2 py-2">
                  <div className="flex gap-1">
                    <Input type="date" aria-label="Matriculación desde" value={colFilters.yearMin} onChange={(e) => setColFilters({ ...colFilters, yearMin: e.target.value })} className="h-7 w-32 text-xs" />
                    <Input type="date" aria-label="Matriculación hasta" value={colFilters.yearMax} onChange={(e) => setColFilters({ ...colFilters, yearMax: e.target.value })} className="h-7 w-32 text-xs" />
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
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.first_registration_date)}</td>
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
                              {formatDate(s.first_registration_date)}{s.mileage ? ` · ${Number(s.mileage).toLocaleString()} km` : ""}
                            </div>
                          </div>
                          <StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{s.fuel_type ? fuelTypeLabels[s.fuel_type] : "—"}{s.transmission ? ` · ${transmissionLabels[s.transmission]}` : ""}</span>
                          <span className="font-medium">{formatCurrency(s.selling_price)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.vat_type === "rebu" ? "bg-status-amber text-status-amber-fg" : "bg-status-blue text-status-blue-fg"}`}>
                            {s.vat_type === "rebu" ? "REBU (Sin IVA)" : "RG (IVA)"}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <QuickStatusToggle
                              status={s.listing_status ?? "pending_listing"}
                              order={listingStatusOrder as any}
                              labels={listingStatusLabels}
                              tones={listingStatusTone}
                              onChange={(v) => quickUpdateListing(s.id, v)}
                            />
                          </div>
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
        <Field label="Bastidor" full><Input aria-label="Bastidor" value={form.vin} maxLength={17} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} /></Field>
        <Field label="Fecha de matriculación"><Input aria-label="Fecha de matriculación" type="date" value={form.first_registration_date} onChange={(e) => setForm({ ...form, first_registration_date: e.target.value })} /></Field>
        <Field label="Potencia (CV)"><Input aria-label="Potencia (CV)" type="number" min="0" step="1" value={form.horsepower} onChange={(e) => setForm({ ...form, horsepower: e.target.value })} /></Field>
        <Field label="Seguro"><Checkbox aria-label="Seguro" checked={form.insured} onCheckedChange={(checked) => setForm({ ...form, insured: checked === true })} /></Field>
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
        <Field label="Régimen IVA">
          <Select value={form.vat_type || "rg"} onValueChange={(v) => setForm({ ...form, vat_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rg">RG (IVA)</SelectItem>
              <SelectItem value="rebu">REBU (Sin IVA)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {showSensitive && (
          <Field label="Precio de compra (€)"><Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} /></Field>
        )}
        <Field label="Precio de venta (€)"><Input type="number" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} /></Field>
        <Field label="Fecha de entrada"><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></Field>
        <Field label="Próxima ITV"><Input type="date" value={form.next_itv_date} onChange={(e) => setForm({ ...form, next_itv_date: e.target.value })} /></Field>
        <Field label="Fecha BATE (baja temporal)"><Input type="date" value={form.bate_date} onChange={(e) => setForm({ ...form, bate_date: e.target.value })} /></Field>
        <Field label="Ubicación" full><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
        <Field label="Imagen del vehículo" full>
          <div
            className="space-y-2"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleImageUpload(file);
            }}
          >
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
                className={`flex h-32 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 ${dragOver ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <span>{uploading ? "Subiendo…" : dragOver ? "Suelta la imagen aquí" : "Haz clic o arrastra una imagen"}</span>
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
        <VehicleDocuments key={editing?.id ?? "new"} vehicleId={editing?.id ?? null} />
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
                <Detail label="Fecha de matriculación" value={formatDate(viewing.first_registration_date)} />
                <Detail label="Bastidor" value={viewing.vin || "—"} />
                <Detail label="Potencia (CV)" value={viewing.horsepower ?? "—"} />
                <Detail label="Seguro" value={viewing.insured ? "Sí" : "No"} />
                <Detail label="Kilómetros" value={viewing.mileage ? Number(viewing.mileage).toLocaleString() : "—"} />
                <Detail label="Combustible" value={viewing.fuel_type ? fuelTypeLabels[viewing.fuel_type] : "—"} />
                <Detail label="Transmisión" value={viewing.transmission ? transmissionLabels[viewing.transmission] : "—"} />
                <Detail label="Estado" value={stockStatusLabels[viewing.status] ?? viewing.status} />
                <Detail label="Anuncio web" value={listingStatusLabels[viewing.listing_status ?? "pending_listing"]} />
                <Detail label="Régimen IVA" value={viewing.vat_type === "rebu" ? "REBU (Sin IVA)" : "RG (IVA)"} />
                <Detail label="Titularidad" value={viewing.holder ? vehicleHolderLabels[viewing.holder] ?? viewing.holder : "—"} />
                <Detail label="Ubicación" value={viewing.location || "—"} />
                <Detail label="Precio compra" value={showSensitive ? formatCurrency(viewing.purchase_price) : "—"} />
                <Detail label="Precio venta" value={formatCurrency(viewing.selling_price)} />
                <Detail label="Margen" value={showSensitive ? formatCurrency(viewing.profit_margin) : "—"} />
                <Detail label="Fecha entrada" value={formatDate(viewing.entry_date)} />
                <Detail label="Próxima ITV" value={formatDate(viewing.next_itv_date)} />
                <Detail label="Fecha BATE" value={formatDate(viewing.bate_date)} />
              </div>
              {viewing.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Notas</div>
                  <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 text-sm">{viewing.notes}</div>
                </div>
              )}
              <WhatsAppShare vehicle={viewing} />
              <VehicleDocuments key={viewing.id} vehicleId={viewing.id} />
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