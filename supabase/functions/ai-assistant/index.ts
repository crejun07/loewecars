import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5-5";

type Msg = { role: "user" | "assistant"; content: string };

/** Compact, permission-aware snapshot of the business for the model's context. */
async function buildSnapshot(db: ReturnType<typeof createClient>): Promise<string> {
  const parts: string[] = [];
  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  // Stock
  const stock = await safe(async () => {
    const { data } = await db
      .from("vehicle_stock")
      .select(
        "brand, model, year, first_registration_date, mileage, fuel_type, transmission, purchase_price, selling_price, status, next_itv_date",
      )
      .limit(400);
    return data ?? [];
  }, [] as any[]);

  if (stock.length) {
    const byStatus: Record<string, number> = {};
    let available = 0;
    for (const v of stock) {
      byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
      if (v.status === "available") available++;
    }
    parts.push(
      `STOCK (${stock.length} vehículos; por estado: ${Object.entries(byStatus)
        .map(([k, n]) => `${k}=${n}`)
        .join(", ")}).`,
    );
    // Trimmed list of available vehicles for Q&A and price comparisons.
    const list = stock
      .filter((v: any) => v.status === "available")
      .slice(0, 80)
      .map((v: any) => {
        const year = v.first_registration_date
          ? new Date(v.first_registration_date).getFullYear()
          : v.year;
        const margin =
          v.selling_price != null && v.purchase_price != null
            ? v.selling_price - v.purchase_price
            : null;
        return `${v.brand} ${v.model}${year ? ` (${year})` : ""} · ${
          v.mileage ? `${v.mileage} km` : "km n/d"
        } · ${v.fuel_type ?? ""} ${v.transmission ?? ""} · compra ${
          v.purchase_price ?? "n/d"
        } / venta ${v.selling_price ?? "n/d"}${margin != null ? ` (margen ${margin})` : ""}`;
      });
    if (list.length) parts.push(`VEHÍCULOS DISPONIBLES:\n${list.join("\n")}`);

    // Upcoming ITV (next 30 days) or expired.
    const today = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const itv = stock
      .filter((v: any) => v.next_itv_date)
      .map((v: any) => ({ ...v, d: new Date(v.next_itv_date) }))
      .filter((v: any) => v.d <= in30)
      .sort((a: any, b: any) => a.d.getTime() - b.d.getTime())
      .slice(0, 30)
      .map(
        (v: any) =>
          `${v.brand} ${v.model} — ITV ${v.next_itv_date}${v.d < today ? " (CADUCADA)" : ""}`,
      );
    if (itv.length) parts.push(`ITV PRÓXIMAS/CADUCADAS:\n${itv.join("\n")}`);
  }

  // Counts for other modules.
  const counts: string[] = [];
  const count = async (table: string, label: string) => {
    const n = await safe(async () => {
      const { count } = await db.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    }, 0);
    counts.push(`${label}=${n}`);
  };
  await count("clients", "clientes");
  await count("vehicle_appraisals", "tasaciones");
  await count("sales", "ventas");
  if (counts.length) parts.push(`TOTALES: ${counts.join(", ")}.`);

  // Sales pipeline by status.
  const sales = await safe(async () => {
    const { data } = await db.from("sales").select("sale_status").limit(500);
    return data ?? [];
  }, [] as any[]);
  if (sales.length) {
    const byS: Record<string, number> = {};
    for (const s of sales) byS[s.sale_status] = (byS[s.sale_status] ?? 0) + 1;
    parts.push(
      `PIPELINE VENTAS: ${Object.entries(byS)
        .map(([k, n]) => `${k}=${n}`)
        .join(", ")}.`,
    );
  }

  return parts.join("\n\n");
}

const SYSTEM_BASE = `Eres el asistente interno de "Loewe Cars", un sistema de gestión para un concesionario de coches (compra-venta).
Ayudas al equipo con cuatro cosas:
1. CONSULTAR DATOS: responde preguntas sobre el stock, clientes, tasaciones, ventas, ITV y márgenes usando el CONTEXTO DE NEGOCIO que se te proporciona.
2. REDACTAR MENSAJES: escribe mensajes de WhatsApp o email para clientes y leads (seguimiento, oferta, cita), con tono cercano y profesional en español de España.
3. SUGERIR PRECIO DE TASACIÓN: da un precio ORIENTATIVO de compra/venta a partir de los datos del vehículo y de coches comparables del stock. Deja claro que es una estimación y que conviene verificarla.
4. AYUDA DE LA APP: explica cómo usar los módulos del sistema (Stock, Clientes, Tasaciones, Ventas, Taller, etc.).

Reglas:
- Responde SIEMPRE en español, de forma breve y clara.
- Usa solo el CONTEXTO DE NEGOCIO para datos concretos; si no está, dilo y no inventes cifras.
- Importes en euros. No inventes matrículas, teléfonos ni datos personales.
- Para precios, da un rango e indica que es orientativo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Caller identity + RLS-scoped data access (the assistant only sees what the
    // signed-in user is allowed to see).
    const db = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await db.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawMessages: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
    const context: string = typeof body?.context === "string" ? body.context : "";
    const messages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-20);
    if (messages.length === 0) return json({ error: "No messages" }, 400);

    const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!API_KEY) {
      // Not activated yet — respond gracefully so the UI works end to end.
      return json({
        configured: false,
        reply:
          "El asistente de IA todavía no está activado. Para encenderlo, añade la clave `ANTHROPIC_API_KEY` en los secretos de Supabase (Edge Functions). Una vez añadida, podré consultar tu stock, redactar mensajes y sugerir precios.",
      });
    }
    const MODEL = Deno.env.get("ANTHROPIC_MODEL") || DEFAULT_MODEL;

    const snapshot = await buildSnapshot(db);
    const system = [
      SYSTEM_BASE,
      context ? `CONTEXTO ADICIONAL DE LA PANTALLA:\n${context}` : "",
      snapshot ? `CONTEXTO DE NEGOCIO (datos actuales):\n${snapshot}` : "CONTEXTO DE NEGOCIO: (sin datos disponibles)",
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json(
        { error: `Proveedor de IA (${aiRes.status}): ${errText.slice(0, 300)}` },
        502,
      );
    }

    const data = await aiRes.json();
    const reply =
      Array.isArray(data?.content)
        ? data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim()
        : "";

    return json({ configured: true, reply: reply || "(sin respuesta)" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
