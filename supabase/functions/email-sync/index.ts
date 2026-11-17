// Pulls the most recent messages (envelope headers) from one or all connected
// accounts into email_messages. Any authenticated user can trigger a refresh.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, openImap, type EmailAccount } from "../_shared/imap.ts";

const FETCH_COUNT = 30; // most recent N messages per account

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
    const { accountId } = (await req.json().catch(() => ({}))) ?? {};

    let q = admin.from("email_accounts").select("id, provider, email, imap_host, imap_port").eq("status", "connected");
    if (accountId) q = q.eq("id", accountId);
    const { data: accounts, error: accErr } = await q;
    if (accErr) return json({ error: accErr.message }, 500);
    if (!accounts?.length) return json({ ok: true, synced: 0, accounts: 0 });

    let totalNew = 0;
    const results: { account: string; new: number; error?: string }[] = [];

    for (const acc of accounts as EmailAccount[]) {
      try {
        const { data: sec } = await admin.from("email_account_secrets")
          .select("app_password").eq("account_id", acc.id).maybeSingle();
        if (!sec?.app_password) { results.push({ account: acc.email, new: 0, error: "sin clave" }); continue; }

        const client = await openImap(acc, sec.app_password);
        let added = 0;
        try {
          const box = await client.mailboxOpen("INBOX");
          const total = box.exists;
          if (total > 0) {
            const start = Math.max(1, total - (FETCH_COUNT - 1));
            const rows: any[] = [];
            for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true, internalDate: true })) {
              const env = msg.envelope ?? {};
              const from = env.from?.[0] ?? {};
              rows.push({
                account_id: acc.id,
                uid: String(msg.uid),
                message_id: env.messageId ?? null,
                from_name: from.name ?? null,
                from_address: from.address ?? null,
                subject: env.subject ?? null,
                received_at: (msg.internalDate ?? env.date ?? null)
                  ? new Date(msg.internalDate ?? env.date).toISOString() : null,
              });
            }
            if (rows.length) {
              // Upsert on (account_id, uid): new messages inserted, known ones left intact.
              const { error: upErr, count } = await admin
                .from("email_messages")
                .upsert(rows, { onConflict: "account_id,uid", ignoreDuplicates: true, count: "exact" });
              if (upErr) throw new Error(upErr.message);
              added = count ?? 0;
            }
          }
        } finally {
          await client.logout().catch(() => {});
        }

        await admin.from("email_accounts")
          .update({ last_sync_at: new Date().toISOString(), last_error: null })
          .eq("id", acc.id);
        totalNew += added;
        results.push({ account: acc.email, new: added });
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        await admin.from("email_accounts").update({ last_error: msg }).eq("id", acc.id);
        results.push({ account: acc.email, new: 0, error: msg });
      }
    }

    return json({ ok: true, synced: totalNew, accounts: accounts.length, results });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
