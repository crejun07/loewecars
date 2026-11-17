// Tests an IMAP login with the given app password and, on success, stores the
// password in email_account_secrets (service-role only) and marks the account
// connected. Only the 'informatica' role may call it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, openImap, type EmailAccount } from "../_shared/imap.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "informatica").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: requiere rol informatica" }, 403);

    const { accountId, appPassword } = (await req.json()) ?? {};
    if (!accountId || !appPassword) return json({ error: "Faltan accountId o appPassword" }, 400);

    const { data: acc, error: accErr } = await admin
      .from("email_accounts")
      .select("id, provider, email, imap_host, imap_port")
      .eq("id", accountId).maybeSingle();
    if (accErr || !acc) return json({ error: "Cuenta no encontrada" }, 404);

    // Try to connect. On failure, record the error and report it.
    try {
      const client = await openImap(acc as EmailAccount, appPassword);
      await client.getMailboxLock("INBOX").then((l) => l.release());
      await client.logout();
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      await admin.from("email_accounts")
        .update({ status: "error", last_error: msg, updated_at: new Date().toISOString() })
        .eq("id", accountId);
      return json({ ok: false, error: "No se pudo conectar: " + msg }, 200);
    }

    // Success: store the secret and mark connected.
    const { error: secErr } = await admin.from("email_account_secrets")
      .upsert({ account_id: accountId, app_password: appPassword, updated_at: new Date().toISOString() });
    if (secErr) return json({ ok: false, error: "Conexión OK pero no se pudo guardar la clave: " + secErr.message }, 200);

    await admin.from("email_accounts")
      .update({ status: "connected", last_error: null, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
