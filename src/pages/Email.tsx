import { useEffect, useMemo, useState } from "react";
import {
  Mail, Plus, RefreshCw, Loader2, Plug, Trash2, CheckCircle2, AlertTriangle,
  Clock, Sparkles, Copy, MessageCircle, X, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { whatsappUrl } from "@/lib/whatsapp";

type Provider = "gmail" | "outlook" | "hotmail" | "imap";
type Status = "pending" | "connected" | "error";

type Account = {
  id: string; provider: Provider; email: string; display_name: string | null;
  imap_host: string | null; imap_port: number | null; smtp_host: string | null; smtp_port: number | null;
  status: Status; last_sync_at: string | null; last_error: string | null;
};
type Message = {
  id: string; account_id: string; from_name: string | null; from_address: string | null;
  subject: string | null; received_at: string | null; is_read: boolean;
  ai_category: string | null; ai_summary: string | null; ai_suggested_reply: string | null;
  ai_contact_name: string | null; ai_contact_phone: string | null; ai_vehicle_interest: string | null;
};

const PROVIDERS: { value: Provider; label: string; help: string }[] = [
  { value: "gmail", label: "Gmail / Google Workspace", help: "Necesitas una 'contraseña de aplicación' de Google." },
  { value: "outlook", label: "Outlook / Microsoft 365", help: "Necesitas una 'contraseña de aplicación' de Microsoft." },
  { value: "hotmail", label: "Hotmail / Live", help: "Necesitas una 'contraseña de aplicación' de Microsoft." },
  { value: "imap", label: "Hosting propio (IMAP)", help: "Introduce el servidor IMAP de tu proveedor de hosting." },
];

const catTone: Record<string, string> = {
  lead: "bg-green-600 hover:bg-green-600", proveedor: "bg-blue-600 hover:bg-blue-600",
  reclamacion: "bg-red-600 hover:bg-red-600", interno: "bg-slate-500 hover:bg-slate-500",
  spam: "bg-amber-500 hover:bg-amber-500", otro: "bg-muted-foreground",
};

export default function EmailPage() {
  const { isInformatica } = usePermissions();
  // email_* tables are added by a pending migration and not yet in the generated
  // Supabase types, so query them through an untyped handle until types regen.
  const db = supabase as any;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Add-account dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ provider: "gmail" as Provider, email: "", display_name: "", imap_host: "", imap_port: "993", smtp_host: "", smtp_port: "465" });
  const [saving, setSaving] = useState(false);

  // Connect dialog
  const [connectFor, setConnectFor] = useState<Account | null>(null);
  const [appPassword, setAppPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Message detail
  const [openMsg, setOpenMsg] = useState<Message | null>(null);
  const [triaging, setTriaging] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await db
      .from("email_accounts")
      .select("id, provider, email, display_name, imap_host, imap_port, smtp_host, smtp_port, status, last_sync_at, last_error")
      .order("created_at", { ascending: true });
    if (error) {
      // Table not created yet → show activation guidance instead of crashing.
      if (/relation .* does not exist|email_accounts/i.test(error.message)) setNeedsSetup(true);
      else toast.error(error.message);
      setLoading(false);
      return;
    }
    setAccounts((data ?? []) as Account[]);
    const { data: msgs } = await db
      .from("email_messages")
      .select("id, account_id, from_name, from_address, subject, received_at, is_read, ai_category, ai_summary, ai_suggested_reply, ai_contact_name, ai_contact_phone, ai_vehicle_interest")
      .order("received_at", { ascending: false })
      .limit(100);
    setMessages((msgs ?? []) as Message[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addAccount() {
    if (!form.email.trim()) { toast.error("Indica el correo."); return; }
    if (form.provider === "imap" && !form.imap_host.trim()) { toast.error("Indica el servidor IMAP."); return; }
    setSaving(true);
    const { error } = await db.from("email_accounts").insert({
      provider: form.provider,
      email: form.email.trim(),
      display_name: form.display_name.trim() || null,
      imap_host: form.provider === "imap" ? form.imap_host.trim() : null,
      imap_port: form.provider === "imap" ? Number(form.imap_port) || 993 : 993,
      smtp_host: form.provider === "imap" ? form.smtp_host.trim() || null : null,
      smtp_port: form.provider === "imap" ? Number(form.smtp_port) || 465 : 465,
      status: "pending",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta añadida. Conéctala cuando tengas la contraseña de aplicación.");
    setAddOpen(false);
    setForm({ provider: "gmail", email: "", display_name: "", imap_host: "", imap_port: "993", smtp_host: "", smtp_port: "465" });
    load();
  }

  async function connect() {
    if (!connectFor || !appPassword.trim()) { toast.error("Introduce la contraseña de aplicación."); return; }
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("email-connect", {
      body: { accountId: connectFor.id, appPassword: appPassword.trim() },
    });
    setConnecting(false);
    if (error) { toast.error("No se pudo llamar a la función (¿está desplegada?): " + error.message); return; }
    if (!data?.ok) { toast.error(data?.error || "No se pudo conectar."); load(); return; }
    toast.success("¡Cuenta conectada!");
    setConnectFor(null); setAppPassword("");
    load();
  }

  async function sync(accountId?: string) {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("email-sync", { body: accountId ? { accountId } : {} });
    setSyncing(false);
    if (error) { toast.error("No se pudo sincronizar (¿función desplegada?): " + error.message); return; }
    toast.success(`Sincronizado: ${data?.synced ?? 0} correos nuevos.`);
    load();
  }

  async function removeAccount(a: Account) {
    if (!confirm(`¿Eliminar la cuenta ${a.email}? Se borrarán sus correos sincronizados.`)) return;
    const { error } = await db.from("email_accounts").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta eliminada.");
    load();
  }

  async function triage(m: Message) {
    setTriaging(true);
    const { data, error } = await supabase.functions.invoke("email-triage", { body: { messageId: m.id } });
    setTriaging(false);
    if (error) { toast.error("No se pudo analizar: " + error.message); return; }
    if (data?.configured === false) { toast.error("Falta la clave de IA (ANTHROPIC_API_KEY) en Supabase."); return; }
    if (!data?.ok) { toast.error(data?.error || "No se pudo analizar."); return; }
    const updated = { ...m, ...data.triage };
    setOpenMsg(updated);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? updated : x)));
    toast.success("Analizado con IA.");
  }

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  if (!isInformatica) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title="Correo" description="Bandeja de empresa" />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
          Solo el rol Informática puede gestionar el correo.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Correo"
        description="Cuentas de empresa y bandeja con triaje de IA"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => sync()} disabled={syncing || accounts.every((a) => a.status !== "connected")}>
              {syncing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
              Sincronizar
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" />Añadir cuenta</Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…</div>
        ) : needsSetup ? (
          <SetupPending />
        ) : (
          <div className="space-y-6">
            {/* Accounts */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Cuentas ({accounts.length})</h2>
              {accounts.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  Aún no hay cuentas. Pulsa <strong>Añadir cuenta</strong> para empezar (Gmail, Outlook, Hotmail o hosting propio).
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {accounts.map((a) => (
                    <Card key={a.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.display_name || a.email}</p>
                          <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{PROVIDERS.find((p) => p.value === a.provider)?.label}</p>
                      {a.status === "error" && a.last_error && (
                        <p className="mt-1 line-clamp-2 text-xs text-red-600">{a.last_error}</p>
                      )}
                      {a.last_sync_at && <p className="mt-1 text-[11px] text-muted-foreground">Últ. sync: {new Date(a.last_sync_at).toLocaleString("es-ES")}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant={a.status === "connected" ? "outline" : "default"} onClick={() => { setConnectFor(a); setAppPassword(""); }}>
                          <Plug className="mr-1 h-3.5 w-3.5" />{a.status === "connected" ? "Reconectar" : "Conectar"}
                        </Button>
                        {a.status === "connected" && (
                          <Button size="sm" variant="outline" onClick={() => sync(a.id)} disabled={syncing}><RefreshCw className="mr-1 h-3.5 w-3.5" />Sync</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeAccount(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Inbox */}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Inbox className="h-4 w-4" /> Bandeja ({messages.length})</h2>
              {messages.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  No hay correos todavía. Conecta una cuenta y pulsa <strong>Sincronizar</strong>.
                </Card>
              ) : (
                <Card className="divide-y divide-border overflow-hidden">
                  {messages.map((m) => (
                    <button key={m.id} onClick={() => setOpenMsg(m)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{m.from_name || m.from_address || "—"}</span>
                          {m.ai_category && <Badge className={`${catTone[m.ai_category] ?? ""} text-[10px]`}>{m.ai_category}</Badge>}
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{m.received_at ? new Date(m.received_at).toLocaleDateString("es-ES") : ""}</span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{m.subject || "(sin asunto)"}</p>
                        <p className="truncate text-xs text-muted-foreground/70">{accountById[m.account_id]?.email}</p>
                      </div>
                    </button>
                  ))}
                </Card>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Add account dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Añadir cuenta de correo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v as Provider }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{PROVIDERS.find((p) => p.value === form.provider)?.help}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Correo</Label>
              <Input type="email" placeholder="ventas@loewecars.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre (opcional)</Label>
              <Input placeholder="Ventas Loewe" value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
            </div>
            {form.provider === "imap" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Servidor IMAP</Label><Input placeholder="imap.tudominio.com" value={form.imap_host} onChange={(e) => setForm((f) => ({ ...f, imap_host: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Puerto IMAP</Label><Input value={form.imap_port} onChange={(e) => setForm((f) => ({ ...f, imap_port: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Servidor SMTP</Label><Input placeholder="smtp.tudominio.com" value={form.smtp_host} onChange={(e) => setForm((f) => ({ ...f, smtp_host: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Puerto SMTP</Label><Input value={form.smtp_port} onChange={(e) => setForm((f) => ({ ...f, smtp_port: e.target.value }))} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={addAccount} disabled={saving}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect dialog */}
      <Dialog open={!!connectFor} onOpenChange={(o) => !o && setConnectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conectar {connectFor?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{PROVIDERS.find((p) => p.value === connectFor?.provider)?.help}</p>
            <div className="space-y-1.5">
              <Label>Contraseña de aplicación</Label>
              <Input type="password" autoComplete="off" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} placeholder="••••••••••••" />
              <p className="text-xs text-muted-foreground">Se prueba la conexión y se guarda cifrada en el servidor; nunca se muestra en la app.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConnectFor(null)}>Cancelar</Button>
            <Button onClick={connect} disabled={connecting}>{connecting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Probando…</> : "Conectar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message detail dialog */}
      <Dialog open={!!openMsg} onOpenChange={(o) => !o && setOpenMsg(null)}>
        <DialogContent className="max-w-lg">
          {openMsg && (
            <>
              <DialogHeader><DialogTitle className="pr-6">{openMsg.subject || "(sin asunto)"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">De:</span> {openMsg.from_name || ""} &lt;{openMsg.from_address}&gt;
                  <span className="ml-2 text-xs text-muted-foreground">{openMsg.received_at ? new Date(openMsg.received_at).toLocaleString("es-ES") : ""}</span>
                </div>

                {openMsg.ai_summary ? (
                  <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> Análisis de IA
                      {openMsg.ai_category && <Badge className={`${catTone[openMsg.ai_category] ?? ""}`}>{openMsg.ai_category}</Badge>}
                    </div>
                    <p className="text-sm">{openMsg.ai_summary}</p>
                    {(openMsg.ai_contact_name || openMsg.ai_contact_phone || openMsg.ai_vehicle_interest) && (
                      <div className="text-xs text-muted-foreground">
                        {openMsg.ai_contact_name && <div>Contacto: {openMsg.ai_contact_name}</div>}
                        {openMsg.ai_contact_phone && <div>Teléfono: {openMsg.ai_contact_phone}</div>}
                        {openMsg.ai_vehicle_interest && <div>Interés: {openMsg.ai_vehicle_interest}</div>}
                      </div>
                    )}
                    {openMsg.ai_suggested_reply && (
                      <div className="space-y-2">
                        <Label className="text-xs">Respuesta sugerida</Label>
                        <div className="whitespace-pre-wrap rounded border border-border bg-background p-2 text-sm">{openMsg.ai_suggested_reply}</div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(openMsg.ai_suggested_reply || ""); toast.success("Copiado"); }}>
                            <Copy className="mr-1 h-3.5 w-3.5" />Copiar
                          </Button>
                          {openMsg.ai_contact_phone && (
                            <a href={whatsappUrl(openMsg.ai_contact_phone, openMsg.ai_suggested_reply || "")} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline"><MessageCircle className="mr-1 h-3.5 w-3.5" />WhatsApp</Button>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button onClick={() => triage(openMsg)} disabled={triaging} className="w-full">
                    {triaging ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Analizando…</> : <><Sparkles className="mr-1.5 h-4 w-4" />Analizar con IA</>}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "connected") return <Badge className="shrink-0 bg-green-600 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Conectada</Badge>;
  if (status === "error") return <Badge variant="destructive" className="shrink-0"><AlertTriangle className="mr-1 h-3 w-3" />Error</Badge>;
  return <Badge variant="outline" className="shrink-0"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
}

function SetupPending() {
  return (
    <Card className="mx-auto max-w-2xl space-y-3 p-6">
      <div className="flex items-center gap-2 text-amber-600"><AlertTriangle className="h-5 w-5" /><h2 className="font-semibold">Módulo de correo pendiente de activar</h2></div>
      <p className="text-sm text-muted-foreground">La estructura del módulo está lista en el código, pero falta activarla en Supabase (una sola vez):</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Aplicar la migración <code className="rounded bg-muted px-1">20261117090000_email_module.sql</code> (SQL Editor de Supabase o <code className="rounded bg-muted px-1">supabase db push</code>).</li>
        <li>Desplegar las funciones: <code className="rounded bg-muted px-1">supabase functions deploy email-connect email-sync email-triage</code>.</li>
        <li>(Opcional, para el análisis con IA) añadir el secreto <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>.</li>
      </ol>
      <p className="text-sm text-muted-foreground">Cuando esté hecho, recarga esta página y podrás añadir cuentas.</p>
    </Card>
  );
}
