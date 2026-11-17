// Stock bulk-import helpers: CSV parsing, field normalization and duplicate
// detection. Pure functions (no React / no network) so they can be reasoned
// about and reused. The UI lives in pages/databases/StockImport.tsx.

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Detects the most likely delimiter by sampling the header line.
 *  Spanish Excel exports usually use ";", international ones ",". */
export function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  let best = ",";
  let bestN = -1;
  for (const d of [",", ";", "\t"]) {
    if (counts[d] > bestN) { best = d; bestN = counts[d]; }
  }
  return best;
}

/** RFC-4180-ish CSV parser: handles quoted fields, escaped quotes (""),
 *  embedded newlines and a configurable delimiter. Returns a matrix of
 *  strings. Empty trailing line is dropped. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const delim = delimiter ?? detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = "";
    } else if (ch === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (ch === "\r") {
      // swallow; handled by the following \n (or acts as line end alone)
      if (clean[i + 1] !== "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    } else {
      field += ch;
    }
  }
  // flush last field/row if the file didn't end with a newline
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  // drop fully-empty rows (e.g. a trailing blank line)
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------------------------------------------------------------------------
// Normalization (the heart of duplicate control)
// ---------------------------------------------------------------------------

/** Normalizes a license plate for comparison: keep only letters+digits,
 *  uppercase. "1234 ABC" == "1234-abc" == "1234ABC". */
export function normalizePlate(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Normalizes a VIN / chassis number the same way. */
export function normalizeVin(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Builds the dedup key for a record. Plate wins; VIN is the fallback when
 *  there is no plate. Returns "" when neither is present (can't dedup). */
export function dedupKey(plate: unknown, vin: unknown): string {
  const p = normalizePlate(plate);
  if (p) return "P:" + p;
  const v = normalizeVin(vin);
  if (v) return "V:" + v;
  return "";
}

// ---------------------------------------------------------------------------
// Field mapping & value coercion
// ---------------------------------------------------------------------------

export type StockField =
  | "brand" | "model" | "license_plate" | "vin" | "year"
  | "first_registration_date" | "mileage" | "fuel_type" | "transmission"
  | "horsepower" | "holder" | "purchase_price" | "selling_price"
  | "status" | "location" | "next_itv_date" | "vat_type" | "notes" | "image_url";

export const STOCK_FIELDS: { key: StockField; label: string; required?: boolean }[] = [
  { key: "brand", label: "Marca", required: true },
  { key: "model", label: "Modelo", required: true },
  { key: "license_plate", label: "Matrícula" },
  { key: "vin", label: "Bastidor (VIN)" },
  { key: "year", label: "Año" },
  { key: "first_registration_date", label: "Fecha matriculación" },
  { key: "mileage", label: "Kilómetros" },
  { key: "fuel_type", label: "Combustible" },
  { key: "transmission", label: "Cambio" },
  { key: "horsepower", label: "Potencia (CV)" },
  { key: "holder", label: "Titular" },
  { key: "purchase_price", label: "Precio compra" },
  { key: "selling_price", label: "Precio venta" },
  { key: "status", label: "Estado" },
  { key: "location", label: "Ubicación" },
  { key: "next_itv_date", label: "Próxima ITV" },
  { key: "vat_type", label: "IVA" },
  { key: "notes", label: "Notas" },
  { key: "image_url", label: "Foto (URL)" },
];

/** Heuristic header → field guesser. Accepts Spanish and English headers. */
export function guessField(header: string): StockField | "" {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const has = (...keys: string[]) => keys.some((k) => h.includes(k));
  if (has("matricul", "license", "plate", "placa")) return "license_plate";
  if (has("bastidor", "vin", "chasis", "chassis")) return "vin";
  if (has("marca", "brand", "make", "fabricante")) return "brand";
  if (has("modelo", "model", "version", "variante")) return "model";
  if (has("kilomet", "kms", "km", "mileage", "mileage")) return "mileage";
  if (has("combustib", "fuel", "carburante")) return "fuel_type";
  if (has("cambio", "transmis", "gearbox", "caja")) return "transmission";
  if (has("potencia", "cv", "hp", "horsepower", "kw")) return "horsepower";
  if (has("titular", "holder", "propietario")) return "holder";
  if (has("precio compra", "compra", "cost", "purchase")) return "purchase_price";
  if (has("precio venta", "pvp", "venta", "selling", "price", "precio")) return "selling_price";
  if (has("fecha matric", "matriculacion", "first_registration", "registration", "fecha_matricula")) return "first_registration_date";
  if (has("itv", "inspeccion")) return "next_itv_date";
  if (has("ubicacion", "location", "localizacion", "sede")) return "location";
  if (has("iva", "vat", "regimen")) return "vat_type";
  if (has("foto", "imagen", "image", "photo", "picture")) return "image_url";
  if (has("ano", "año", "year", "anio")) return "year"; // after "matriculacion" so dates win
  if (has("estado", "status", "situacion")) return "status";
  if (has("nota", "observ", "notes", "comment", "descripcion")) return "notes";
  return "";
}

// Value dictionaries: map loose human text to the DB enum keys.
const FUEL_MAP: Record<string, string> = {
  gasolina: "gasoline", gas: "gasoline", petrol: "gasoline", bencina: "gasoline",
  diesel: "diesel", gasoil: "diesel", gasoleo: "diesel", "gas-oil": "diesel",
  hibrido: "hybrid", hybrid: "hybrid",
  "hibrido enchufable": "plug_in_hybrid", phev: "plug_in_hybrid", "plug-in": "plug_in_hybrid", enchufable: "plug_in_hybrid",
  electrico: "electric", electric: "electric", ev: "electric", bev: "electric",
  glp: "lpg", lpg: "lpg", gnc: "lpg", autogas: "lpg",
};
const TRANS_MAP: Record<string, string> = {
  manual: "manual", man: "manual", mt: "manual",
  automatico: "automatic", automatic: "automatic", auto: "automatic", at: "automatic",
  dsg: "automatic", tiptronic: "automatic", cvt: "automatic",
};
const STATUS_MAP: Record<string, string> = {
  "en preparacion": "preparing", preparacion: "preparing", preparing: "preparing", taller: "preparing",
  disponible: "available", available: "available", stock: "available", venta: "available",
  reservado: "reserved", reserved: "reserved",
  vendido: "sold", sold: "sold",
  "parque propio": "own_lot", propio: "own_lot",
  cliente: "client", client: "client",
};
const HOLDER_MAP: Record<string, string> = {
  deposito: "deposito", "orlando cars": "orlando_cars", orlando: "orlando_cars",
  bate: "bate", cedente: "cedente", comprador: "comprador",
};

function mapEnum(raw: string, dict: Record<string, string>, fallback: string | null): string | null {
  const k = raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (!k) return fallback;
  if (dict[k]) return dict[k];
  // partial contains match
  for (const key of Object.keys(dict)) if (k.includes(key)) return dict[key];
  return fallback;
}

/** Parses a number from messy text: "1.234,50 €", "12,000 km", "—". */
export function parseNumber(raw: unknown): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // the last separator is the decimal one
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    // comma as decimal if it looks like one (<=2 trailing digits), else thousands
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (hasDot) {
    // Dot-only: in Spanish exports the dot is usually a thousands separator
    // ("15.900" = 15900, "68.000" = 68000). Treat it as decimal only when a
    // single dot is followed by 1–2 digits (e.g. "12.5", "130.50").
    const dots = (s.match(/\./g) || []).length;
    const afterLast = s.length - s.lastIndexOf(".") - 1;
    if (dots > 1 || afterLast === 3) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Parses a date into YYYY-MM-DD. Accepts DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD. */
export function parseDate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    let y = m[3]; if (y.length === 2) y = (Number(y) > 50 ? "19" : "20") + y;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

export type MappedRow = {
  brand: string | null;
  model: string | null;
  license_plate: string | null;
  vin: string | null;
  year: number | null;
  first_registration_date: string | null;
  mileage: number | null;
  fuel_type: string | null;
  transmission: string | null;
  horsepower: number | null;
  holder: string | null;
  purchase_price: number | null;
  selling_price: number | null;
  status: string | null;
  location: string | null;
  next_itv_date: string | null;
  vat_type: string | null;
  notes: string | null;
  image_url: string | null;
};

/** Applies a column→field mapping to one raw CSV row and coerces values. */
export function mapRow(cells: string[], mapping: Record<number, StockField | "">): MappedRow {
  const get = (field: StockField): string => {
    for (const [idx, f] of Object.entries(mapping)) {
      if (f === field) return (cells[Number(idx)] ?? "").trim();
    }
    return "";
  };
  const year = parseNumber(get("year"));
  return {
    brand: get("brand") || null,
    model: get("model") || null,
    license_plate: get("license_plate") || null,
    vin: get("vin") || null,
    year: year != null ? Math.round(year) : null,
    first_registration_date: parseDate(get("first_registration_date")),
    mileage: parseNumber(get("mileage")),
    fuel_type: get("fuel_type") ? mapEnum(get("fuel_type"), FUEL_MAP, null) : null,
    transmission: get("transmission") ? mapEnum(get("transmission"), TRANS_MAP, null) : null,
    horsepower: parseNumber(get("horsepower")),
    holder: get("holder") ? mapEnum(get("holder"), HOLDER_MAP, null) : null,
    purchase_price: parseNumber(get("purchase_price")),
    selling_price: parseNumber(get("selling_price")),
    status: get("status") ? mapEnum(get("status"), STATUS_MAP, "preparing") : null,
    location: get("location") || null,
    next_itv_date: parseDate(get("next_itv_date")),
    vat_type: get("vat_type") || null,
    notes: get("notes") || null,
    image_url: get("image_url") || null,
  };
}

export type RowStatus = "new" | "duplicate_file" | "duplicate_db" | "invalid";

export type AnalyzedRow = {
  row: MappedRow;
  key: string;
  status: RowStatus;
  existingId: string | null;    // DB id when it duplicates an existing record
  existingLabel: string | null; // "Marca Modelo" of the existing record
  errors: string[];
};

export type ExistingVehicle = { id: string; brand: string; model: string; license_plate: string | null; vin: string | null };

/** Classifies each mapped row as new / duplicate (in file or DB) / invalid. */
export function analyzeRows(rows: MappedRow[], existing: ExistingVehicle[]): AnalyzedRow[] {
  const dbByKey = new Map<string, ExistingVehicle>();
  for (const e of existing) {
    const k = dedupKey(e.license_plate, e.vin);
    if (k) dbByKey.set(k, e);
  }
  const seenInFile = new Set<string>();
  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.brand) errors.push("Falta marca");
    if (!row.model) errors.push("Falta modelo");
    const key = dedupKey(row.license_plate, row.vin);
    if (!key) errors.push("Sin matrícula ni bastidor (no se puede comprobar duplicado)");

    let status: RowStatus;
    let existingId: string | null = null;
    let existingLabel: string | null = null;
    if (errors.length) {
      status = "invalid";
    } else if (dbByKey.has(key)) {
      const e = dbByKey.get(key)!;
      status = "duplicate_db";
      existingId = e.id;
      existingLabel = `${e.brand} ${e.model}`.trim();
    } else if (seenInFile.has(key)) {
      status = "duplicate_file";
    } else {
      status = "new";
    }
    if (key) seenInFile.add(key);
    return { row, key, status, existingId, existingLabel, errors };
  });
}
