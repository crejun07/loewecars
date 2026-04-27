import { Link } from "react-router-dom";
import { Users, ClipboardList, ShoppingCart, Car, Wrench, AlertTriangle, Clock, TrendingUp, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAppraisals, useClients, useSales, useStock, useWorkshop } from "@/hooks/data/useDealership";
import {
  appraisalStatusLabels,
  appraisalStatusTone,
  daysUntil,
  formatCurrency,
  formatDate,
  saleStatusLabels,
  saleStatusTone,
  stockStatusLabels,
  stockStatusTone,
  workshopStatusLabels,
  workshopStatusTone,
} from "@/lib/labels";

const dbCards = [
  { title: "Clientes", url: "/clients", icon: Users, desc: "Compradores, vendedores, contactos" },
  { title: "Tasaciones", url: "/appraisals", icon: ClipboardList, desc: "Vehículos ofrecidos para compra" },
  { title: "Ventas", url: "/sales", icon: ShoppingCart, desc: "Operaciones con clientes" },
  { title: "Stock", url: "/stock", icon: Car, desc: "Inventario disponible" },
  { title: "Taller", url: "/workshop", icon: Wrench, desc: "Reparaciones y preparación" },
];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: clients = [] } = useClients();
  const { data: stock = [] } = useStock();
  const { data: appraisals = [] } = useAppraisals();
  const { data: sales = [] } = useSales();
  const { data: workshop = [] } = useWorkshop();

  const available = stock.filter((s: any) => s.status === "available");
  const totalMargin = stock
    .filter((s: any) => s.status === "sold")
    .reduce((sum: number, s: any) => sum + Number(s.profit_margin || 0), 0);

  const itvAlerts = stock
    .map((s: any) => ({ ...s, days: daysUntil(s.next_itv_date) }))
    .filter((s: any) => s.days !== null && s.days <= 30)
    .sort((a: any, b: any) => a.days - b.days);

  const followups = clients.filter((c: any) => {
    const days = daysUntil(c.last_contact_date);
    return c.status === "in_followup" || (days !== null && days < -7);
  });

  const pendingTasks = workshop.filter((w: any) => w.status !== "completed");

  const activeDeals = [
    ...appraisals
      .filter((a: any) => !["purchased", "rejected"].includes(a.deal_status))
      .map((a: any) => ({
        kind: "Compra",
        id: a.id,
        title: `${a.brand} ${a.model}`,
        sub: a.client?.full_name ?? "—",
        statusLabel: appraisalStatusLabels[a.deal_status],
        tone: appraisalStatusTone[a.deal_status],
        amount: a.offered_price ?? a.estimated_price,
        url: "/appraisals",
      })),
    ...sales
      .filter((s: any) => !["sold", "lost"].includes(s.sale_status))
      .map((s: any) => ({
        kind: "Venta",
        id: s.id,
        title: s.vehicle ? `${s.vehicle.brand} ${s.vehicle.model}` : "Vehículo sin asignar",
        sub: s.client?.full_name ?? "—",
        statusLabel: saleStatusLabels[s.sale_status],
        tone: saleStatusTone[s.sale_status],
        amount: s.customer_budget,
        url: "/sales",
      })),
  ].slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Panel"
        description="Visión general operativa del concesionario."
      />

      <div className="space-y-6 p-6">
        {/* Quick access */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {dbCards.map((c) => (
            <Link
              key={c.title}
              to={c.url}
              className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                  <c.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3 text-sm font-medium text-foreground">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Stock disponible" value={available.length} sub={`${stock.length} vehículos en total`} />
          <Kpi label="Ventas activas" value={sales.filter((s: any) => !["sold", "lost"].includes(s.sale_status)).length} sub={`${sales.filter((s: any) => s.sale_status === "sold").length} cerradas`} />
          <Kpi label="Taller pendiente" value={pendingTasks.length} sub={`${workshop.length} tareas totales`} />
          <Kpi label="Beneficio (vendidos)" value={formatCurrency(totalMargin)} sub="Margen acumulado" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Alerts */}
          <div className="rounded-lg border border-border bg-card lg:col-span-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h2 className="text-sm font-semibold">Alertas ITV</h2>
              </div>
              <span className="text-xs text-muted-foreground">≤ 30 días</span>
            </div>
            <div className="divide-y divide-border">
              {itvAlerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Todas las ITV al día</div>
              ) : (
                itvAlerts.slice(0, 6).map((s: any) => (
                  <Link key={s.id} to="/stock" className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{s.brand} {s.model}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(s.next_itv_date)}</div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.days < 0 ? "bg-status-red text-status-red-fg" : s.days <= 7 ? "bg-status-amber text-status-amber-fg" : "bg-status-blue text-status-blue-fg"}`}>
                      {s.days < 0 ? `${Math.abs(s.days)}d vencida` : `${s.days}d restantes`}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="rounded-lg border border-border bg-card lg:col-span-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-info" />
                <h2 className="text-sm font-semibold">Seguimientos pendientes</h2>
              </div>
              <span className="text-xs text-muted-foreground">{followups.length}</span>
            </div>
            <div className="divide-y divide-border">
              {followups.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Sin contactos atrasados</div>
              ) : (
                followups.slice(0, 6).map((c: any) => (
                  <Link key={c.id} to="/clients" className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone || c.email || "Sin datos de contacto"}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(c.last_contact_date)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pending workshop tasks */}
          <div className="rounded-lg border border-border bg-card lg:col-span-1">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-foreground" />
                <h2 className="text-sm font-semibold">Taller pendiente</h2>
              </div>
              <span className="text-xs text-muted-foreground">{pendingTasks.length}</span>
            </div>
            <div className="divide-y divide-border">
              {pendingTasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Nada pendiente</div>
              ) : (
                pendingTasks.slice(0, 6).map((w: any) => (
                  <Link key={w.id} to="/workshop" className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{w.task}</div>
                      <div className="truncate text-xs text-muted-foreground">{w.vehicle ? `${w.vehicle.brand} ${w.vehicle.model}` : "Sin asignar"}</div>
                    </div>
                    <StatusBadge label={workshopStatusLabels[w.status]} tone={workshopStatusTone[w.status]} />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active deals */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold">Operaciones activas</h2>
            </div>
            <span className="text-xs text-muted-foreground">{activeDeals.length}</span>
          </div>
          {activeDeals.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">Sin operaciones activas</div>
          ) : (
            <div className="divide-y divide-border">
              {activeDeals.map((d) => (
                <Link key={`${d.kind}-${d.id}`} to={d.url} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 hover:bg-muted/40">
                  <div className="col-span-2 text-xs font-medium text-muted-foreground">{d.kind}</div>
                  <div className="col-span-4 truncate text-sm font-medium">{d.title}</div>
                  <div className="col-span-3 truncate text-xs text-muted-foreground">{d.sub}</div>
                  <div className="col-span-2"><StatusBadge label={d.statusLabel} tone={d.tone} /></div>
                  <div className="col-span-1 text-right text-xs font-medium">{formatCurrency(d.amount as any)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Available stock preview */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold">Stock disponible</h2>
            </div>
            <Link to="/stock" className="text-xs text-muted-foreground hover:text-foreground">Ver todo →</Link>
          </div>
          {available.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">No hay vehículos disponibles</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {available.slice(0, 8).map((s: any) => (
                <Link key={s.id} to="/stock" className="group rounded-md border border-border bg-background p-3 hover:border-foreground/20">
                  <div className="flex h-24 items-center justify-center rounded bg-muted text-muted-foreground">
                    {s.image_url ? (
                      <img src={s.image_url} alt={`${s.brand} ${s.model}`} className="h-full w-full rounded object-cover" />
                    ) : (
                      <Car className="h-8 w-8 opacity-50" />
                    )}
                  </div>
                  <div className="mt-2.5 text-sm font-medium">{s.brand} {s.model}</div>
                  <div className="text-xs text-muted-foreground">{s.year ?? "—"} · {s.mileage ? `${s.mileage.toLocaleString()} km` : "—"}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusBadge label={stockStatusLabels[s.status]} tone={stockStatusTone[s.status]} />
                    <span className="text-xs font-semibold">{formatCurrency(s.selling_price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}