// On-demand AI triage of a single message: downloads its body over IMAP, asks
// Claude to classify it, summarize, extract contact + vehicle interest and
// draft a reply, then stores the result on the message. Never sends anything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, openImap, type EmailAccount } from "../_shared/imap.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5-5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    if (!API_KEY) return json({ configured: false, error: "Falta ANTHROPIC_API_KEY" }, 200);

    const { messageId } = (await req.json()) ?? {};
    if (!messageId) return json({ error: "Falta messageId" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: msg, error: msgErr } = await admin
      .from("email_messages")
      .select("id, account_id, uid, subject, from_name, from_address")
      .eq("id", messageId).maybeSingle();
    if (msgErr || !msg) return json({ error: "Mensaje no encontrado" }, 404);

    const { data: acc } = await admin
      .from("email_accounts").select("id, provider, email, imap_host, imap_port")
      .eq("id", msg.account_id).maybeSingle();
    const { data: sec } = await admin
      .from("email_account_secrets").select("app_password").eq("account_id", msg.account_id).maybeSingle();
    if (!acc || !sec?.app_password) return json({ error: "Cuenta sin conexión" }, 400);

    // Download the raw message and extract a rough text body.
    let body = "";
    const client = await openImap(acc as EmailAccount, sec.app_password);
    try {
      await client.mailboxOpen("INBOX");
      const one = await client.fetchOne(msg.uid, { uid: true, source: true }, { uid: true });
      const raw = one?.source ? new TextDecoder().decode(one.source) : "";
      body = raw
        .split(/\r?\n\r?\n/).slice(1).join("\n")   // drop headers
        .replace(/<[^>]+>/g, " ")                    // strip HTML tags
        .replace(/=\r?\n/g, "").replace(/=[0-9A-F]{2}/g, " ") // light quoted-printable
        .replace(/\s+/g, " ").trim().slice(0, 4000);
    } finally {
      await client.logout().catch(() => {});
    }

    const prompt = `Eres el asistente de un concesionario de coches (Loewe Cars). Analiza este correo y responde SOLO con un JSON válido, sin texto adicional, con esta forma exacta:
{"category":"lead|proveedor|reclamacion|interno|spam|otro","summary":"resumen en 1-2 frases","contact_name":"nombre o null","contact_phone":"teléfono o null","vehicle_interest":"coche/modelo de interés o null","suggested_reply":"respuesta profesional y cordial en español lista para enviar"}

CORREO
De: ${msg.from_name ?? ""} <${msg.from_address ?? ""}>
Asunto: ${msg.subject ?? ""}
Cuerpo: ${body || "(sin texto)"}`;

    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
    });
    if (!resp.ok) return json({ error: "Error de IA: " + (await resp.text()).slice(0, 300) }, 200);
    const data = await resp.json();
    const text: string = data?.content?.[0]?.text ?? "";

    let parsed: any = {};
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    } catch { parsed = {}; }

    const patch = {
      ai_category: parsed.category ?? null,
      ai_summary: parsed.summary ?? null,
      ai_suggested_reply: parsed.suggested_reply ?? null,
      ai_contact_name: parsed.contact_name ?? null,
      ai_contact_phone: parsed.contact_phone ?? null,
      ai_vehicle_interest: parsed.vehicle_interest ?? null,
    };
    await admin.from("email_messages").update(patch).eq("id", messageId);

    return json({ ok: true, triage: patch });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
