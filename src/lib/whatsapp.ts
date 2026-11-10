import { formatCurrency, fuelTypeLabels, transmissionLabels } from "@/lib/labels";

export const vehicleHighlights = [
  "Vehículo en perfecto estado, listo para conducirlo desde el primer día",
  "Revisado en nuestro taller y puesto a punto para su uso desde el primer día",
  "Garantía incluida",
  "ITV en vigor",
  "Amplio maletero",
  "Bajo consumo",
  "Libro de mantenimiento al día",
  "Un solo propietario",
] as const;

/** Normaliza un teléfono para wa.me: solo dígitos, añade 34 a móviles españoles de 9 cifras. */
export function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "34" + d;
  return d;
}

export function itvValid(next_itv_date?: string | null, today = new Date()): boolean {
  if (!next_itv_date) return false;
  return new Date(next_itv_date) >= new Date(today.toISOString().slice(0, 10));
}

export function defaultHighlights(v: any): string[] {
  const h = [vehicleHighlights[0], vehicleHighlights[1], vehicleHighlights[2]] as string[];
  if (itvValid(v?.next_itv_date)) h.push(vehicleHighlights[3]);
  return h;
}

export function buildVehicleMessage(v: any, highlights: string[]): string {
  const year = v.first_registration_date ? new Date(v.first_registration_date).getFullYear() : v.year;
  const lines = [`🚗 *${v.brand} ${v.model}*${year ? ` (${year})` : ""}`, ""];
  if (v.mileage) lines.push(`📍 Kilómetros: ${Number(v.mileage).toLocaleString("es-ES")} km`);
  if (v.fuel_type) lines.push(`⛽ Combustible: ${fuelTypeLabels[v.fuel_type] ?? v.fuel_type}`);
  if (v.transmission) lines.push(`⚙️ Cambio: ${transmissionLabels[v.transmission] ?? v.transmission}`);
  if (v.horsepower) lines.push(`🐎 Potencia: ${v.horsepower} CV`);
  if (v.selling_price) lines.push(`💶 Precio: ${formatCurrency(v.selling_price)}`);
  if (highlights.length) {
    lines.push("");
    highlights.forEach((h) => lines.push(`✅ ${h}`));
  }
  lines.push("", "Para más información o para verlo, responde a este mensaje. — Orlando Cars");
  return lines.join("\n");
}

export function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

/** En ordenador abre WhatsApp Web directamente (evita la página api.whatsapp.com, que algunos bloqueadores impiden); en móvil abre la app. */
export function whatsappOpenUrl(phone: string, text: string): string {
  return `https://api.whatsapp.com/send?phone=${normalizePhone(phone)}&text=${encodeURIComponent(text)}`;
}
