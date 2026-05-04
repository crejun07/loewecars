import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const tableLabels: Record<string, string> = {
  clients: "Clientes",
  vehicle_stock: "Stock",
  vehicle_appraisals: "Tasaciones",
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

  return (
    <div className="space-y-4">
      <PageHeader title="Historial de cambios" description="Registro completo de altas, modificaciones y borrados realizados en el sistema." />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar en el historial…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={tableFilter} onValueChange={setTableFilter}>
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

      <Card className="divide-y">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Cargando…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <HistoryIcon className="h-8 w-8" />
            <p className="text-sm">No hay registros que coincidan.</p>
          </div>
        )}
        {filtered.map((row) => {
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
                  {tableLabels[row.table_name] ?? row.table_name} · {date.toLocaleDateString("es-ES")} {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}