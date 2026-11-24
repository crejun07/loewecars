import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployees } from "@/hooks/data/useDealership";
import { playChime, showSystemNotification, autoRequestNotificationPermission } from "@/lib/notify";

interface Ctx {
  unreadTotal: number;
  unreadByConv: Record<string, number>;
  markRead: (conversationKey: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const gc = globalThis as unknown as { __chatNotifCtx?: ReturnType<typeof createContext<Ctx | undefined>> };
const ChatNotifCtx = gc.__chatNotifCtx ?? (gc.__chatNotifCtx = createContext<Ctx | undefined>(undefined));

function convKey(msg: { sender_id: string; recipient_id: string | null }, me: string) {
  if (!msg.recipient_id) return "group";
  return msg.sender_id === me ? msg.recipient_id : msg.sender_id;
}

export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: employees = [] } = useEmployees();
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
  const [reads, setReads] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!user) return;
    const [msgsRes, readsRes] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, sender_id, recipient_id, created_at")
        .or(`recipient_id.is.null,sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("chat_reads").select("conversation_key, last_read_at").eq("user_id", user.id),
    ]);
    const r: Record<string, string> = {};
    (readsRes.data ?? []).forEach((x: any) => { r[x.conversation_key] = x.last_read_at; });
    setReads(r);
    const counts: Record<string, number> = {};
    (msgsRes.data ?? []).forEach((m: any) => {
      if (m.sender_id === user.id) return;
      const key = convKey(m, user.id);
      const last = r[key];
      if (!last || new Date(m.created_at) > new Date(last)) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    });
    setUnreadByConv(counts);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Ask the browser for desktop-notification permission once, on first gesture.
  useEffect(() => {
    if (!user) return;
    autoRequestNotificationPermission();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const m: any = payload.new;
          if (m.sender_id === user.id) return;
          const isDM = m.recipient_id === user.id;
          const isGroup = m.recipient_id === null;
          if (!isDM && !isGroup) return;
          const key = convKey(m, user.id);
          setUnreadByConv((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));

          const sender = (employees as any[]).find((e) => e.id === m.sender_id);
          const senderName = sender?.full_name || sender?.username || "Alguien";
          const channelLabel = isGroup ? "Chat del equipo" : "Mensaje directo";
          const preview = typeof m.content === "string" ? m.content : "";

          const onChatPage = location.pathname.startsWith("/chat");
          const appHidden = typeof document !== "undefined" && document.visibilityState !== "visible";

          // Native OS notification — fires only when the app window is not
          // focused (handled inside showSystemNotification), so it reaches the
          // user even with the app minimized or in another tab/space.
          showSystemNotification({
            title: isGroup ? `${senderName} · Chat del equipo` : `Nuevo mensaje de ${senderName}`,
            body: preview || channelLabel,
            tag: `chat-${key}`,
            onClick: () => navigate("/chat"),
            path: "/chat",
          });

          // In-app toast when not already on the chat page.
          if (!onChatPage) {
            toast(`Has recibido un nuevo mensaje de ${senderName}`, {
              description: channelLabel,
              action: { label: "Ver", onClick: () => navigate("/chat") },
              position: "bottom-right",
            });
          }

          // Chime whenever a new message arrives and the user is not actively
          // reading the chat (another page, or the app in the background).
          if (!onChatPage || appHidden) {
            playChime();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname, navigate, employees]);

  const markRead = useCallback(async (conversationKey: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    setReads((prev) => ({ ...prev, [conversationKey]: now }));
    setUnreadByConv((prev) => { const n = { ...prev }; delete n[conversationKey]; return n; });
    await supabase.from("chat_reads").upsert({
      user_id: user.id,
      conversation_key: conversationKey,
      last_read_at: now,
    });
  }, [user]);

  const unreadTotal = Object.values(unreadByConv).reduce((a, b) => a + b, 0);

  return (
    <ChatNotifCtx.Provider value={{ unreadTotal, unreadByConv, markRead, refresh }}>
      {children}
    </ChatNotifCtx.Provider>
  );
}

export function useChatNotifications() {
  const ctx = useContext(ChatNotifCtx);
  if (!ctx) throw new Error("useChatNotifications must be used within ChatNotificationsProvider");
  return ctx;
}