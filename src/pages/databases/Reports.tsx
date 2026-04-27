import { useMemo, useState } from "react";
import { Search, Car, Wrench, Package, Calendar, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStock, useWorkshop, useSpareParts } from "@/hooks/data/useDealership";
import {
  formatCurrency,
  formatDate,
  workshopStatusLabels,
  workshopStatusTone,
  sparePartStatusLabels,
  sparePartStatusTone,
  fuelTypeLabels,
  transmissionLabels,
  stockStatusLabels,
  stockStatusTone,
  listingStatusLabels,
  listingStatusTone,
} from "@/lib/labels";

function normalizePlate(s: string) {
  return (s || "").replace(/\s|-/g, "").toUpperCase();
}

export default function ReportsPage() {
  const { data: stock = [] } = useStock();
  const { data: workshop = [] } = useWorkshop();
  const { data: spareParts = [] } = useSpareParts();

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");

  const matches = useMemo(() => {
    const q = normalizePlate(searched);
    if (!q) return [];
    return (stock as any[]).filter((v) => normalizePlate(v.license_plate || "").includes(q));
  }, [stock, searched]);

  const vehicle = matches[0];

  const vehicleWorkshop = useMemo(
    () => (vehicle ? (workshop as any[]).filter((w) => w.vehicle_id === vehicle.id) : []),
    [workshop, vehicle],
  );
  const vehicleSpareParts = useMemo(
    () => (vehicle ? (spareParts as any[]).filter((p) => p.vehicle_id === vehicle.id) : []),
    [spareParts, vehicle],
  );

  const totalWorkshopCost = vehicleWorkshop.reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const totalPartsCost = vehicleSpareParts.reduce((sum, p) => sum + Number(p.cost || 0), 0);
  const totalCost = totalWorkshopCost + totalPartsCost;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSearched(query);
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Informes"
        description="Consulta el historial completo de un vehículo por su matrícula."
        actions={
          vehicle ? (
            <Button variant="outline" size="sm" onClick={printReport}>
              <FileText className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
          ) : null
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={submit} className="mb-6 flex max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Introduce la matrícula (ej. 2354LHB)"
              className="pl-9 uppercase"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>

        {!searched && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Introduce una matrícula para generar el informe del vehículo.
          </div>
        )}

        {searched && !vehicle && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No se ha encontrado ningún vehículo con la matrícula <span className="font-mono font-medium">{searched}</span>.
          </div>
        )}

        {vehicle && (
          <div className="space-y-6">
            {/* Vehicle summary */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Car className="h-5 w-5 text-primary" />
                    {vehicle.brand} {vehicle.model}
                    {vehicle.year ? <span className="text-muted-foreground">· {vehicle.year}</span> : null}
                  </CardTitle>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {vehicle.license_plate || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={stockStatusLabels[vehicle.status] ?? vehicle.status} tone={stockStatusTone[vehicle.status]} />
                  <StatusBadge label={listingStatusLabels[vehicle.listing_status] ?? vehicle.listing_status} tone={listingStatusTone[vehicle.listing_status]} />
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Combustible</dt>
                    <dd className="font-medium">{vehicle.fuel_type ? (fuelTypeLabels[vehicle.fuel_type] ?? vehicle.fuel_type) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Transmisión</dt>
                    <dd className="font-medium">{vehicle.transmission ? (transmissionLabels[vehicle.transmission] ?? vehicle.transmission) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Kilómetros</dt>
                    <dd className="font-medium">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString("es-ES")} km` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ubicación</dt>
                    <dd className="font-medium">{vehicle.location || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fecha de entrada</dt>
                    <dd className="font-medium">{formatDate(vehicle.entry_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Próxima ITV</dt>
                    <dd className="font-medium">{formatDate(vehicle.next_itv_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Precio de compra</dt>
                    <dd className="font-medium">{formatCurrency(vehicle.purchase_price)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Precio de venta</dt>
                    <dd className="font-medium">{formatCurrency(vehicle.selling_price)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Cost summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste taller</p>
                  <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalWorkshopCost)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{vehicleWorkshop.length} tareas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste recambios</p>
                  <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalPartsCost)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{vehicleSpareParts.length} piezas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Coste total invertido</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{formatCurrency(totalCost)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Taller + recambios</p>
                </CardContent>
              </Card>
            </div>

            {/* Workshop history */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-primary" /> Historial de taller
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {vehicleWorkshop.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Sin tareas registradas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tarea</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Coste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...vehicleWorkshop]
                        .sort((a, b) => (a.task_date < b.task_date ? 1 : -1))
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(t.task_date)}</TableCell>
                            <TableCell className="font-medium">{t.task}</TableCell>
                            <TableCell className="max-w-md text-muted-foreground">{t.description || "—"}</TableCell>
                            <TableCell>
                              <StatusBadge label={workshopStatusLabels[t.status] ?? t.status} tone={workshopStatusTone[t.status]} />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(t.cost)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Spare parts history */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-primary" /> Recambios
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {vehicleSpareParts.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted-foreground">Sin recambios registrados.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pieza</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Entrega</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Coste</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...vehicleSpareParts]
                        .sort((a, b) => ((a.order_date || "") < (b.order_date || "") ? 1 : -1))
                        .map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.part_name}</TableCell>
                            <TableCell className="font-mono text-xs">{p.part_reference || "—"}</TableCell>
                            <TableCell>{p.supplier || "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(p.order_date)}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(p.delivery_date)}</TableCell>
                            <TableCell>
                              <StatusBadge label={sparePartStatusLabels[p.status] ?? p.status} tone={sparePartStatusTone[p.status]} />
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(p.cost)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Key dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-primary" /> Fechas clave
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Entrada en stock</dt>
                    <dd className="font-medium">{formatDate(vehicle.entry_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Próxima ITV</dt>
                    <dd className="font-medium">{formatDate(vehicle.next_itv_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Última intervención taller</dt>
                    <dd className="font-medium">
                      {vehicleWorkshop.length
                        ? formatDate(
                            [...vehicleWorkshop].sort((a, b) => (a.task_date < b.task_date ? 1 : -1))[0].task_date,
                          )
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}