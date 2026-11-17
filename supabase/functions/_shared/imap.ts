// Shared helpers for the email module edge functions.
import { ImapFlow } from "npm:imapflow@1.0.172";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export type EmailAccount = {
  id: string;
  provider: "gmail" | "outlook" | "hotmail" | "imap";
  email: string;
  imap_host: string | null;
  imap_port: number | null;
};

/** Resolves the IMAP endpoint for an account from its provider (or custom host). */
export function imapConfig(acc: EmailAccount): { host: string; port: number; secure: boolean } {
  switch (acc.provider) {
    case "gmail":
      return { host: "imap.gmail.com", port: 993, secure: true };
    case "outlook":
    case "hotmail":
      return { host: "outlook.office365.com", port: 993, secure: true };
    case "imap":
    default: {
      const port = acc.imap_port || 993;
      return { host: acc.imap_host || "", port, secure: port === 993 };
    }
  }
}

/** Opens an authenticated IMAP connection. Caller must `logout()`. */
export async function openImap(acc: EmailAccount, password: string): Promise<ImapFlow> {
  const cfg = imapConfig(acc);
  if (!cfg.host) throw new Error("Falta el servidor IMAP (host) para esta cuenta.");
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: acc.email, pass: password },
    logger: false,
    // Office365/Gmail present valid certs; keep verification on.
  });
  await client.connect();
  return client;
}
