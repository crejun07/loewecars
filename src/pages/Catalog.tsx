import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, Car, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStock } from "@/hooks/data/useDealership";
import {
  formatCurrency, formatDate, fuelTypeLabels, transmissionLabels,
} from "@/lib/labels";

function vatLabel(v: string | null | undefined) {
  if (v === "rebu") return "REBU (sin IVA)";
  return "RG (IVA incluido)";
}

function VehicleSheet({ v }: { v: any }) {
  return (
    <div className="mx-auto max-w-[820px] bg-white p-8 text-black print:p-6">
      <div className="mb-4 flex items-center justify-between border-b border-black/20 pb-3">
        <div>
          <div className="text-2xl font-bold tracking-tight">Orlando Cars</div>
          <div className="text-xs text-black/60">www.orlandocars.es · 961 475 660</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">Ficha del vehículo</div>
          <div className="text-black/60">{formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div className="mb-5 overflow-hidden rounded-lg border border-black/10 bg-neutral-100">
        {v.image_url ? (
          <img src={v.image_url} alt={`${v.brand} ${v.model}`} className="h-[380px] w-full object-cover" />
        ) : (
          <div className="flex h-[380px] items-center justify-center text-black/30">
            <Car className="h-16 w-16" />
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold leading-tight">{v.brand} {v.model}</div>
          <div className="text-sm text-black/60">{v.year ?? "—"} · {v.mileage ? `${Number(v.mileage).toLocaleString("es-ES")} km` : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-black">{formatCurrency(v.selling_price)}</div>
          <div className="text-xs text-black/60">{vatLabel(v.vat_type)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Info label="Combustible" value={v.fuel_type ? fuelTypeLabels[v.fuel_type] : "—"} />
        <Info label="Cambio" value={v.transmission ? transmissionLabels[v.transmission] : "—"} />
        <Info label="Año" value={v.year ?? "—"} />
        <Info label="Kilómetros" value={v.mileage ? `${Number(v.mileage).toLocaleString("es-ES")} km` : "—"} />
        <Info label="Régimen IVA" value={vatLabel(v.vat_type)} />
        <Info label="Próxima ITV" value={formatDate(v.next_itv_date)} />
      </div>

      <div className="mt-8 border-t border-black/20 pt-4 text-center text-sm">
        <div className="font-semibold">Para más información</div>
        <div className="mt-1 text-black/70">Orlando Cars · www.orlandocars.es · 961 475 660</div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-md border border-black/10 bg-neutral-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-black/50">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

export default function CatalogPage() {
  const { data: stock = [] } = useStock();
  const [search, setSearch] = useState("");
  const [printing, setPrinting] = useState<any | null>(null);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stock.filter((s: any) => {
      if (s.status !== "available") return false;
      if (!q) return true;
      return (
        (s.brand ?? "").toLowerCase().includes(q) ||
        (s.model ?? "").toLowerCase().includes(q) ||
        String(s.year ?? "").includes(q)
      );
    });
  }, [stock, search]);

  function handlePrint(v: any) {
    setPrinting(v);
  }

  useEffect(() => {
    if (!printing) return;
    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      root.style.display = "none";
      document.body.appendChild(root);
    }
    return () => {
      const el = document.getElementById("print-root");
      if (el) el.remove();
    };
  }, [printing]);

  const printRoot = typeof document !== "undefined" ? document.getElementById("print-root") : null;

  return (
    <div>
      <PageHeader
        title="Catálogo"
        description={`${items.length} vehículos disponibles`}
      />
      <div className="p-6 catalog-screen">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar marca, modelo o año…"
              className="pl-9"
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No hay vehículos disponibles.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((v: any) => (
              <div key={v.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
                <div className="flex h-56 items-center justify-center bg-muted">
                  {v.image_url ? (
                    <img src={v.image_url} alt={`${v.brand} ${v.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{v.brand} {v.model}</div>
                      <div className="text-xs text-muted-foreground">
                        {v.year ?? "—"} · {v.mileage ? `${Number(v.mileage).toLocaleString("es-ES")} km` : "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatCurrency(v.selling_price)}</div>
                      <div className="text-[10px] text-muted-foreground">{vatLabel(v.vat_type)}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-muted px-2 py-1">
                      <span className="text-muted-foreground">Combustible: </span>
                      <span className="font-medium">{v.fuel_type ? fuelTypeLabels[v.fuel_type] : "—"}</span>
                    </div>
                    <div className="rounded bg-muted px-2 py-1">
                      <span className="text-muted-foreground">Cambio: </span>
                      <span className="font-medium">{v.transmission ? transmissionLabels[v.transmission] : "—"}</span>
                    </div>
                    <div className="rounded bg-muted px-2 py-1 col-span-2">
                      <span className="text-muted-foreground">Próxima ITV: </span>
                      <span className="font-medium">{formatDate(v.next_itv_date)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => handlePrint(v)}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" />Imprimir ficha
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!printing} onOpenChange={(o) => !o && setPrinting(null)}>
        <DialogContent className="max-w-4xl p-0 print:max-w-none print:border-0 print:shadow-none">
          <div className="max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible">
            {printing && <VehicleSheet v={printing} />}
          </div>
          <div className="flex justify-end gap-2 border-t border-border p-3 print:hidden">
            <Button variant="outline" onClick={() => setPrinting(null)}>Cerrar</Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {printing && printRoot && createPortal(<VehicleSheet v={printing} />, printRoot)}
    </div>
  );
}