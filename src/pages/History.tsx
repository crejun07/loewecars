import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const tableLabels: Record<string, string> = {
  clients: "Clientes",
  vehicle_stock: "Stock",
  vehicle_appraisals: "Tasaciones (tienda)",
  online_appraisals: "Tasaciones online",
  sales: "Ventas",
  workshop: "Taller",
  spare_parts: "Recambios",
};

function actionIcon(action: string) {
  if (action === "INSERT") return <Plus className="h-3.5 w-3.5" />;
  if (action === "DELETE") return <Trash2 className="h-3.5 w-3.5" />;
  return <Pencil className="h-3.5 w-3.5" />;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "INSERT") return "default";
  if (action === "DELETE") return "destructive";
  return "secondary";
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [dayPage, setDayPage] = useState(1);
  const DAYS_PER_PAGE = 7;

  const { data, isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = (data ?? []).filter((row) => {
    if (tableFilter !== "all" && row.table_name !== tableFilter) return false;
    if (search && !row.summary?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of filtered) {
      const d = new Date(row.created_at);
      const key = d.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / DAYS_PER_PAGE));
  const currentPage = Math.min(dayPage, totalPages);
  const pageDays = grouped.slice((currentPage - 1) * DAYS_PER_PAGE, currentPage * DAYS_PER_PAGE);

  function formatDayHeader(key: string) {
    const d = new Date(key + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yest = new Date(today); yest.setDate(today.getDate() - 1);
    if (d.getTime() === today.getTime()) return "Hoy";
    if (d.getTime() === yest.getTime()) return "Ayer";
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Historial de cambios" description="Registro completo de altas, modificaciones y borrados realizados en el sistema." />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar en el historial…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setDayPage(1); }}
          className="max-w-xs"
        />
        <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setDayPage(1); }}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las secciones</SelectItem>
            {Object.entries(tableLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} entradas</span>
      </div>

      {isLoading && <Card className="p-6 text-sm text-muted-foreground">Cargando…</Card>}
      {!isLoading && filtered.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <HistoryIcon className="h-8 w-8" />
          <p className="text-sm">No hay registros que coincidan.</p>
        </Card>
      )}

      <div className="space-y-4">
        {pageDays.map(([dayKey, rows]) => (
          <div key={dayKey}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {formatDayHeader(dayKey)} <span className="ml-2 font-normal normal-case">· {rows.length} cambios</span>
            </h3>
            <Card className="divide-y">
              {rows.map((row) => {
                const date = new Date(row.created_at);
                return (
                  <div key={row.id} className="flex items-start gap-3 p-3 hover:bg-muted/40">
                    <Badge variant={actionVariant(row.action)} className="mt-0.5 gap-1">
                      {actionIcon(row.action)}
                      {row.action === "INSERT" ? "Alta" : row.action === "DELETE" ? "Baja" : "Cambio"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{row.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {tableLabels[row.table_name] ?? row.table_name} · {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}
      </div>

      {grouped.length > DAYS_PER_PAGE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{grouped.length} días con cambios</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setDayPage(currentPage - 1)}>
              Anterior
            </Button>
            <span>Página {currentPage} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setDayPage(currentPage + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}