import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

interface Ctx {
  unreadTotal: number;
  unreadByConv: Record<string, number>;
  markRead: (conversationKey: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ChatNotifCtx = createContext<Ctx | undefined>(undefined);

function convKey(msg: { sender_id: string; recipient_id: string | null }, me: string) {
  if (!msg.recipient_id) return "group";
  return msg.sender_id === me ? msg.recipient_id : msg.sender_id;
}

export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
          // Notify when not viewing chat
          if (!location.pathname.startsWith("/chat")) {
            toast("Nuevo mensaje", {
              description: isGroup ? "Chat de equipo" : "Mensaje directo",
              action: { label: "Ver", onClick: () => navigate("/chat") },
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname, navigate]);

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