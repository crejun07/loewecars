// Centralized labels and color tokens for status enums.
// Keeps naming professional + consistent across views.

export const clientTypeLabels: Record<string, string> = {
  seller: "Vendedor",
  buyer: "Comprador",
  both: "Ambos",
};

export const clientStatusLabels: Record<string, string> = {
  new: "Nuevo",
  in_followup: "En seguimiento",
  closed: "Cerrado",
};

export const appraisalStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  offer_sent: "Oferta enviada",
  negotiating: "Negociando",
  purchased: "Comprado",
  rejected: "Rechazado",
};

export const saleStatusLabels: Record<string, string> = {
  new_lead: "Nuevo lead",
  interested: "Interesado",
  test_drive: "Prueba realizada",
  negotiating: "Negociando",
  reserved: "Reservado",
  sold: "Vendido",
  lost: "Perdido",
};

export const stockStatusLabels: Record<string, string> = {
  preparing: "En preparación",
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
  own_lot: "Parque propio",
  client: "Cliente",
};

export const workshopStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  completed: "Completado",
  waiting_parts: "Esperando piezas",
};

export const fuelTypeLabels: Record<string, string> = {
  gasoline: "Gasolina",
  diesel: "Diésel",
  hybrid: "Híbrido",
  plug_in_hybrid: "Híbrido enchufable",
  electric: "Eléctrico",
  lpg: "LPG",
  other: "Otro",
};

export const transmissionLabels: Record<string, string> = {
  manual: "Manual",
  automatic: "Automático",
};

export const employees = ["Vicente", "Rommer", "Orlando", "Isabel", "Jose", "Edu"] as const;

export const vehicleHolderLabels: Record<string, string> = {
  deposito: "Depósito",
  orlando_cars: "Orlando Cars",
  bate: "Bate",
  cedente: "Cedente",
  comprador: "Comprador",
};

export const listingStatusLabels: Record<string, string> = {
  listed: "Anunciado",
  pending_listing: "Pendiente de anunciar",
  not_listed: "No anunciado",
};

export const listingStatusTone: Record<string, StatusTone> = {
  listed: "green",
  pending_listing: "amber",
  not_listed: "neutral",
};

export const listingStatusOrder = ["listed", "pending_listing", "not_listed"] as const;

export const sparePartStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  ordered: "Pedido",
  shipped: "Enviado",
  received: "Recibido",
  return: "Devolver",
  refunded: "Reembolsado",
};

export const sparePartStatusOrder = [
  "pending",
  "ordered",
  "shipped",
  "received",
  "return",
  "refunded",
] as const;

// Tone mapping: returns Tailwind classes using semantic status tokens.
export type StatusTone = "neutral" | "blue" | "amber" | "violet" | "green" | "red";

export const toneClass: Record<StatusTone, string> = {
  neutral: "bg-status-neutral text-status-neutral-fg",
  blue: "bg-status-blue text-status-blue-fg",
  amber: "bg-status-amber text-status-amber-fg",
  violet: "bg-status-violet text-status-violet-fg",
  green: "bg-status-green text-status-green-fg",
  red: "bg-status-red text-status-red-fg",
};

export const dotClass: Record<StatusTone, string> = {
  neutral: "bg-status-neutral-fg",
  blue: "bg-status-blue-fg",
  amber: "bg-status-amber-fg",
  violet: "bg-status-violet-fg",
  green: "bg-status-green-fg",
  red: "bg-status-red-fg",
};

export const clientStatusTone: Record<string, StatusTone> = {
  new: "blue",
  in_followup: "amber",
  closed: "neutral",
};

export const appraisalStatusTone: Record<string, StatusTone> = {
  pending: "neutral",
  offer_sent: "blue",
  negotiating: "amber",
  purchased: "green",
  rejected: "red",
};

export const saleStatusTone: Record<string, StatusTone> = {
  new_lead: "neutral",
  interested: "blue",
  test_drive: "violet",
  negotiating: "amber",
  reserved: "violet",
  sold: "green",
  lost: "red",
};

export const stockStatusTone: Record<string, StatusTone> = {
  preparing: "amber",
  available: "green",
  reserved: "violet",
  sold: "neutral",
  own_lot: "blue",
  client: "violet",
};

export const workshopStatusTone: Record<string, StatusTone> = {
  pending: "neutral",
  in_progress: "blue",
  completed: "green",
  waiting_parts: "amber",
};

export const sparePartStatusTone: Record<string, StatusTone> = {
  pending: "neutral",
  ordered: "blue",
  shipped: "violet",
  received: "green",
  return: "amber",
  refunded: "red",
};

// Pipeline column orderings
export const appraisalStatusOrder = ["pending", "offer_sent", "negotiating", "purchased", "rejected"] as const;
export const saleStatusOrder = ["new_lead", "interested", "test_drive", "negotiating", "reserved", "sold", "lost"] as const;
export const workshopStatusOrder = ["pending", "in_progress", "waiting_parts", "completed"] as const;
export const stockStatusOrder = ["preparing", "available", "reserved", "sold", "own_lot", "client"] as const;

// Workshop priority (1 low - 5 max)
export const workshopPriorityLabels: Record<number, string> = {
  1: "Muy baja",
  2: "Baja",
  3: "Media",
  4: "Alta",
  5: "Máxima",
};

export const workshopPriorityTone: Record<number, StatusTone> = {
  1: "neutral",
  2: "blue",
  3: "violet",
  4: "amber",
  5: "red",
};

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}