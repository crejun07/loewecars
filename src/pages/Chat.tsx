import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Users, Search, Trash2 } from "lucide-react";
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
};

const GROUP = "group";

export default function ChatPage() {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { unreadByConv, markRead } = useChatNotifications();
  const [active, setActive] = useState<string>(GROUP);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    const payload = {
      sender_id: user.id,
      recipient_id: active === GROUP ? null : active,
      content,
    };
    const { error } = await supabase.from("chat_messages").insert(payload);
    if (error) { toast.error(error.message); setText(content); }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar mensaje?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  const q = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((c) => {
    if (!q) return true;
    return (c.full_name ?? "").toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="Chat de trabajo" description="Comunicación interna del equipo" />
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-0 flex-1 min-h-0 border-t border-border">
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
        <section className="flex flex-col min-w-0 bg-background">
          <div className="border-b border-border px-4 py-3">
            <div className="text-sm font-medium">
              {active === GROUP ? "Chat del equipo" : nameOf(active)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {active === GROUP ? "Mensajes visibles para todos los usuarios" : "Mensaje directo"}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="flex flex-col gap-2 p-4">
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
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60">
                        <span>{new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                        {mine && (
                          <button
                            onClick={() => remove(m.id)}
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
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje…"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!text.trim()}>
              <Send className="h-3.5 w-3.5 mr-1" />Enviar
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}