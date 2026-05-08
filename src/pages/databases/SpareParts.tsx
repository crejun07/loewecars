import { useState } from "react";
import { Plus, LayoutGrid, List, Trash2, Search } from "lucide-react";
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
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { QuickStatusToggle } from "@/components/shared/QuickStatusToggle";
import { useSpareParts, useStock, useEmployees } from "@/hooks/data/useDealership";
import {
  formatCurrency,
  formatDate,
  paymentMethodLabels,
  paymentStatusLabels,
  paymentStatusTone,
  sparePartStatusLabels,
  sparePartStatusOrder,
  sparePartStatusTone,
} from "@/lib/labels";
import { toast } from "sonner";

const empty = {
  vehicle_id: "",
  part_name: "",
  part_reference: "",
  supplier: "",
  order_date: new Date().toISOString().slice(0, 10),
  delivery_date: "",
  managed_by: "",
  ordered_by: "",
  status: "pending",
  cost: "" as any,
  notes: "",
  payment_method: "",
  payment_status: "pending",
};

export default function SparePartsPage() {
  const { data: parts = [] } = useSpareParts();
  const { data: employees = [] } = useEmployees();
  const statusRank: Record<string, number> = Object.fromEntries(
    sparePartStatusOrder.map((s, i) => [s, i]),
  );
  const { data: stock = [] } = useStock();
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "table">("table");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>(empty);

  const q = search.trim().toLowerCase();
  const filteredParts = parts.filter((p: any) => {
    if (!q) return true;
    return (
      (p.part_name ?? "").toLowerCase().includes(q) ||
      (p.part_reference ?? "").toLowerCase().includes(q) ||
      (p.vehicle?.license_plate ?? "").toLowerCase().includes(q) ||
      (p.vehicle?.brand ?? "").toLowerCase().includes(q) ||
      (p.vehicle?.model ?? "").toLowerCase().includes(q)
    );
  });
  const sortedParts = [...filteredParts].sort(
    (a: any, b: any) =>
      (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99),
  );

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    setForm({
      vehicle_id: p.vehicle_id ?? "",
      part_name: p.part_name ?? "",
      part_reference: p.part_reference ?? "",
      supplier: p.supplier ?? "",
      order_date: p.order_date ?? "",
      delivery_date: p.delivery_date ?? "",
      managed_by: p.managed_by ?? "",
      ordered_by: p.ordered_by ?? "",
      status: p.status,
      cost: p.cost ?? "",
      notes: p.notes ?? "",
      payment_method: p.payment_method ?? "",
      payment_status: p.payment_status ?? "pending",
    });
    setOpen(true);
  }
  async function save() {
    const payload = {
      ...form,
      vehicle_id: form.vehicle_id || null,
      order_date: form.order_date || null,
      delivery_date: form.delivery_date || null,
      managed_by: form.managed_by || null,
      ordered_by: form.ordered_by || null,
      part_reference: form.part_reference || null,
      supplier: form.supplier || null,
      notes: form.notes || null,
      cost: form.cost === "" ? 0 : Number(form.cost),
      payment_method: form.payment_method || null,
      payment_status: form.payment_status || "pending",
    };
    const { error } = editing
      ? await supabase.from("spare_parts").update(payload).eq("id", editing.id)
      : await supabase.from("spare_parts").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["spare_parts"] });
  }
  async function remove(id: string) {
    if (!confirm("¿Eliminar?")) return;
    await supabase.from("spare_parts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["spare_parts"] });
  }
  async function quickUpdateStatus(id: string, status: string) {
    const { error } = await supabase.from("spare_parts").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["spare_parts"] });
  }

  const vehicleOptions = stock.map((v: any) => ({
    value: v.id,
    label: `${v.brand} ${v.model}${v.license_plate ? ` — ${v.license_plate}` : v.year ? ` (${v.year})` : ""}`,
  }));

  function vehicleLabel(p: any) {
    if (!p.vehicle) return "Sin asignar";
    return `${p.vehicle.brand} ${p.vehicle.model}${p.vehicle.license_plate ? ` — ${p.vehicle.license_plate}` : ""}`;
  }

  return (
    <div>
      <PageHeader
        title="Recambios"
        description="Gestión de piezas y pedidos a proveedores"
        actions={
          <>
            <div className="flex rounded-md border border-border">
              <Button size="sm" variant={view === "table" ? "secondary" : "ghost"} className="rounded-r-none" onClick={() => setView("table")}>
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="rounded-l-none" onClick={() => setView("kanban")}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" />Nuevo recambio
            </Button>
          </>
        }
      />
      <div className="p-6">
        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por recambio, referencia o matrícula…"
            className="pl-9"
          />
        </div>
        {view === "kanban" ? (
          <KanbanBoard
            columns={sparePartStatusOrder.map((s) => ({
              id: s,
              title: sparePartStatusLabels[s],
              count: filteredParts.filter((p: any) => p.status === s).length,
            }))}
            renderCards={(col) =>
              filteredParts
                .filter((p: any) => p.status === col)
                .map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => openEdit(p)}
                    className="rounded-md border border-border bg-card p-3 text-left hover:border-foreground/20"
                  >
                    <div className="text-sm font-medium">{p.part_name}</div>
                    {p.part_reference && (
                      <div className="text-[11px] text-muted-foreground">Ref. {p.part_reference}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">{vehicleLabel(p)}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{p.supplier || "Sin proveedor"}</span>
                      <span className="font-medium">{formatCurrency(p.cost, 2)}</span>
                    </div>
                    <div className="mt-2">
                      <QuickStatusToggle
                        status={p.status}
                        order={sparePartStatusOrder}
                        labels={sparePartStatusLabels}
                        tones={sparePartStatusTone}
                        onChange={(next) => quickUpdateStatus(p.id, next)}
                      />
                    </div>
                    {(p.managed_by || p.ordered_by) && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {p.managed_by && <>Recambio: {p.managed_by}</>}
                        {p.managed_by && p.ordered_by && " · "}
                        {p.ordered_by && <>Pedido: {p.ordered_by}</>}
                      </div>
                    )}
                  </button>
                ))
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {parts.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">Aún no hay recambios</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pieza</th>
                      <th className="px-3 py-2 font-medium">Referencia</th>
                      <th className="px-3 py-2 font-medium">Vehículo</th>
                      <th className="px-3 py-2 font-medium">Proveedor</th>
                      <th className="px-3 py-2 font-medium">Pedido</th>
                      <th className="px-3 py-2 font-medium">Entrega</th>
                      <th className="px-3 py-2 font-medium">Recambio</th>
                      <th className="px-3 py-2 font-medium">Pedido por</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Pago</th>
                      <th className="px-3 py-2 text-right font-medium">Coste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedParts.map((p: any) => (
                      <tr key={p.id} onClick={() => openEdit(p)} className="cursor-pointer hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{p.part_name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.part_reference || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{vehicleLabel(p)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.supplier || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(p.order_date)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(p.delivery_date)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.managed_by || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.ordered_by || "—"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge label={sparePartStatusLabels[p.status]} tone={sparePartStatusTone[p.status]} />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <StatusBadge
                              label={paymentStatusLabels[p.payment_status ?? "pending"]}
                              tone={paymentStatusTone[p.payment_status ?? "pending"]}
                            />
                            {p.payment_method && (
                              <span className="text-[11px] text-muted-foreground">
                                {paymentMethodLabels[p.payment_method] ?? p.payment_method}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium">{formatCurrency(p.cost, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <RecordDialog
        open={open}
        onOpenChange={setOpen}
        trigger={null as any}
        title={editing ? "Editar recambio" : "Nuevo recambio"}
        onSubmit={save}
      >
        <Field label="Vehículo" full>
          <SearchableSelect
            value={form.vehicle_id}
            onChange={(v) => setForm({ ...form, vehicle_id: v })}
            options={vehicleOptions}
            placeholder="Selecciona vehículo"
            searchPlaceholder="Buscar por marca, modelo o matrícula…"
            emptyText="Sin vehículos"
          />
        </Field>
        <Field label="Nombre de la pieza" full>
          <Input
            required
            value={form.part_name}
            onChange={(e) => setForm({ ...form, part_name: e.target.value })}
            placeholder="Ej. Pastillas de freno delanteras"
          />
        </Field>
        <Field label="Referencia">
          <Input
            value={form.part_reference}
            onChange={(e) => setForm({ ...form, part_reference: e.target.value })}
            placeholder="Ref. proveedor / OEM"
          />
        </Field>
        <Field label="Proveedor">
          <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        </Field>
        <Field label="Fecha de pedido">
          <Input type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} />
        </Field>
        <Field label="Fecha de entrega">
          <Input
            type="date"
            value={form.delivery_date}
            onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
          />
        </Field>
        <Field label="Encargado del recambio">
          <Select
            value={form.managed_by || "none"}
            onValueChange={(v) => setForm({ ...form, managed_by: v === "none" ? "" : v })}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {employees.map((e: any) => {
                const name = e.full_name || e.username || "Sin nombre";
                return <SelectItem key={e.id} value={name}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Encargado del pedido">
          <Select
            value={form.ordered_by || "none"}
            onValueChange={(v) => setForm({ ...form, ordered_by: v === "none" ? "" : v })}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {employees.map((e: any) => {
                const name = e.full_name || e.username || "Sin nombre";
                return <SelectItem key={e.id} value={name}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(sparePartStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Coste (€)">
          <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Field>
        <Field label="Método de pago">
          <Select
            value={form.payment_method || "none"}
            onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? "" : v })}
          >
            <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Ninguno —</SelectItem>
              {Object.entries(paymentMethodLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado de pago">
          <Select
            value={form.payment_status || "pending"}
            onValueChange={(v) => setForm({ ...form, payment_status: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(paymentStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Notas" full>
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {editing && (
          <div className="col-span-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(editing.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar
            </Button>
          </div>
        )}
      </RecordDialog>
    </div>
  );
}