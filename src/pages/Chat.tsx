import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Users, Search, Trash2, Paperclip, Download, X, Loader2, File as FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEmployees } from "@/hooks/data/useDealership";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  created_at: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
};

const GROUP = "group";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatFileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { unreadByConv, markRead } = useChatNotifications();
  const [active, setActive] = useState<string>(GROUP);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contacts = useMemo(
    () => (employees as any[]).filter((e) => e.id !== user?.id),
    [employees, user],
  );
  const nameOf = (id: string | null) => {
    if (!id) return "Equipo";
    const e = (employees as any[]).find((x) => x.id === id);
    return e?.full_name || e?.username || "Usuario";
  };

  async function loadMessages() {
    if (!user) return;
    let q = supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500);
    if (active === GROUP) {
      q = q.is("recipient_id", null);
    } else {
      q = q.or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${active}),and(sender_id.eq.${active},recipient_id.eq.${user.id})`,
      );
    }
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    setMessages((data ?? []) as Msg[]);
    markRead(active);
  }

  useEffect(() => { loadMessages(); /* eslint-disable-next-line */ }, [active, user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat_view_${active}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m = payload.new as Msg;
          const isActive =
            active === GROUP
              ? m.recipient_id === null
              : (m.sender_id === user.id && m.recipient_id === active) ||
                (m.sender_id === active && m.recipient_id === user.id);
          if (!isActive) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          markRead(active);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, user, markRead]);

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if ((!content && files.length === 0) || !user || sending) return;
    const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`«${oversized.name}» supera el límite de 25 MB`);
      return;
    }

    setSending(true);
    const pendingFiles = [...files];
    let sent = 0;
    try {
      if (pendingFiles.length === 0) {
        const { error } = await supabase.from("chat_messages").insert({
          sender_id: user.id,
          recipient_id: active === GROUP ? null : active,
          content,
        });
        if (error) throw error;
        sent = 1;
      } else {
        for (let index = 0; index < pendingFiles.length; index += 1) {
          const file = pendingFiles[index];
          const extension = file.name.includes(".")
            ? `.${file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin"}`
            : "";
          const path = `${user.id}/${active}/${crypto.randomUUID()}${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(path, file, { contentType: file.type || "application/octet-stream" });
          if (uploadError) throw uploadError;

          const { error: messageError } = await supabase.from("chat_messages").insert({
            sender_id: user.id,
            recipient_id: active === GROUP ? null : active,
            content: index === 0 ? content : "",
            attachment_path: path,
            attachment_name: file.name,
            attachment_type: file.type || "application/octet-stream",
            attachment_size: file.size,
          });
          if (messageError) {
            await supabase.storage.from("chat-attachments").remove([path]);
            throw messageError;
          }
          sent += 1;
        }
      }
      setText("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (pendingFiles.length > 0) {
        toast.success(pendingFiles.length === 1 ? "Archivo enviado" : `${pendingFiles.length} archivos enviados`);
      }
      await loadMessages();
    } catch {
      if (sent > 0) {
        setText("");
        setFiles(pendingFiles.slice(sent));
        toast.error(`Se enviaron ${sent} de ${pendingFiles.length} archivos. Revisa los pendientes y vuelve a intentarlo.`);
      } else {
        toast.error("No se pudo enviar. Vuelve a intentarlo.");
      }
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  async function downloadAttachment(message: Msg) {
    if (!message.attachment_path) return;
    const { data, error } = await supabase.storage.from("chat-attachments").download(message.attachment_path);
    if (error || !data) {
      toast.error("No se pudo descargar el archivo");
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = message.attachment_name || "archivo";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function remove(message: Msg) {
    if (!confirm("¿Eliminar mensaje?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", message.id);
    if (error) { toast.error(error.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    if (message.attachment_path) {
      const { error: storageError } = await supabase.storage.from("chat-attachments").remove([message.attachment_path]);
      if (storageError) toast.error("Mensaje eliminado; no se pudo borrar el archivo almacenado");
    }
  }

  const q = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((c) => {
    if (!q) return true;
    return (c.full_name ?? "").toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Chat de trabajo" description="Comunicación interna del equipo" />
      <div className="grid grid-cols-1 grid-rows-[180px_minmax(0,1fr)] md:grid-cols-[280px_1fr] md:grid-rows-1 gap-0 flex-1 min-h-0 border-t border-border">
        {/* Sidebar */}
        <aside className="border-r border-border bg-card flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar contacto…"
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <button
              onClick={() => setActive(GROUP)}
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 ${active === GROUP ? "bg-muted" : ""}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">Chat del equipo</div>
                  <div className="text-[11px] text-muted-foreground">Todos los usuarios</div>
                </div>
              </div>
              {unreadByConv[GROUP] > 0 && (
                <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 min-w-[18px] text-center">
                  {unreadByConv[GROUP]}
                </span>
              )}
            </button>
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">Contactos</div>
            {filteredContacts.length === 0 && (
              <div className="px-3 py-4 text-xs text-muted-foreground">Sin contactos</div>
            )}
            {filteredContacts.map((c: any) => {
              const name = c.full_name || c.username || "Usuario";
              const unread = unreadByConv[c.id] ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 ${active === c.id ? "bg-muted" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                      {name.slice(0, 2)}
                    </div>
                    <div className="truncate">
                      <div className="font-medium truncate">{name}</div>
                      {c.username && <div className="text-[11px] text-muted-foreground truncate">@{c.username}</div>}
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 min-w-[18px] text-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </ScrollArea>
        </aside>

        {/* Chat panel */}
        <section className="flex flex-col min-w-0 min-h-0 bg-background">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-medium">
              {active === GROUP ? "Chat del equipo" : nameOf(active)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {active === GROUP ? "Mensajes visibles para todos los usuarios" : "Mensaje directo"}
            </div>
          </div>
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="flex flex-col gap-2 p-4">
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-10">
                  Aún no hay mensajes. Escribe el primero 👋
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`group max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {!mine && active === GROUP && (
                        <div className="text-[10px] font-medium opacity-70 mb-0.5">{nameOf(m.sender_id)}</div>
                      )}
                      {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                      {m.attachment_path && (
                        <button
                          type="button"
                          onClick={() => downloadAttachment(m)}
                          className={`mt-1 flex w-full min-w-0 items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors ${mine ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20" : "border-border bg-background hover:bg-background/70"}`}
                          title={`Descargar ${m.attachment_name || "archivo"}`}
                        >
                          <FileIcon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{m.attachment_name || "Archivo adjunto"}</span>
                            {m.attachment_size && <span className="block text-[10px] opacity-70">{formatFileSize(m.attachment_size)}</span>}
                          </span>
                          <Download className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60">
                        <span>{new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && (
                          <button
                            onClick={() => remove(m)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t border-border p-3"
          >
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${file.lastModified}-${index}`} className="flex max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="max-w-52 truncate" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      aria-label={`Quitar ${file.name}`}
                      disabled={sending}
                      onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                aria-label="Seleccionar archivos del ordenador"
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []);
                  setFiles((current) => [...current, ...selected]);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={sending}
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivos desde el ordenador"
                aria-label="Adjuntar archivos desde el ordenador"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={files.length > 0 ? "Añade un mensaje (opcional)…" : "Escribe un mensaje…"}
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" size="sm" disabled={sending || (!text.trim() && files.length === 0)}>
                {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                {sending ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}