// Centralized labels and color tokens for status enums.
// Keeps naming professional + consistent across views.

export const clientTypeLabels: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  both: "Both",
};

export const clientStatusLabels: Record<string, string> = {
  new: "New",
  in_followup: "In follow-up",
  closed: "Closed",
};

export const appraisalStatusLabels: Record<string, string> = {
  pending: "Pending",
  offer_sent: "Offer sent",
  negotiating: "Negotiating",
  purchased: "Purchased",
  rejected: "Rejected",
};

export const saleStatusLabels: Record<string, string> = {
  new_lead: "New lead",
  interested: "Interested",
  test_drive: "Test drive done",
  negotiating: "Negotiating",
  reserved: "Reserved",
  sold: "Sold",
  lost: "Lost",
};

export const stockStatusLabels: Record<string, string> = {
  preparing: "Preparing",
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

export const workshopStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  waiting_parts: "Waiting for parts",
};

export const fuelTypeLabels: Record<string, string> = {
  gasoline: "Gasoline",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  lpg: "LPG",
  other: "Other",
};

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
};

export const workshopStatusTone: Record<string, StatusTone> = {
  pending: "neutral",
  in_progress: "blue",
  completed: "green",
  waiting_parts: "amber",
};

// Pipeline column orderings
export const appraisalStatusOrder = ["pending", "offer_sent", "negotiating", "purchased", "rejected"] as const;
export const saleStatusOrder = ["new_lead", "interested", "test_drive", "negotiating", "reserved", "sold", "lost"] as const;
export const workshopStatusOrder = ["pending", "in_progress", "waiting_parts", "completed"] as const;
export const stockStatusOrder = ["preparing", "available", "reserved", "sold"] as const;

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
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