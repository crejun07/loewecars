import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import { useEmployees } from "@/hooks/data/useDealership";
import { playChime, showSystemNotification, autoRequestNotificationPermission, getNotifPrefs } from "@/lib/notify";

interface CornerBubble {
  id: string;
  convKey: string;
  senderName: string;
  initials: string;
  channelLabel: string;
  body: string;
  durationMs: number;
}

interface Ctx {
  unreadTotal: number;
  unreadByConv: Record<string, number>;
  markRead: (conversationKey: string) => Promise<void>;
  refresh: () => Promise<void>;
  setActiveConv: (conversationKey: string | null) => void;
  triggerTestNotification: () => void;
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
  const [bubbles, setBubbles] = useState<CornerBubble[]>([]);
  const activeConvRef = useRef<string | null>(null);
  const setActiveConv = useCallback((conversationKey: string | null) => {
    activeConvRef.current = conversationKey;
  }, []);

  const dismissBubble = useCallback((id: string) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const pushBubble = useCallback((bubble: Omit<CornerBubble, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBubbles((prev) => [...prev.slice(-3), { ...bubble, id }]);
  }, []);

  const triggerTestNotification = useCallback(() => {
    const durationMs = Math.max(2, getNotifPrefs().durationSec) * 1000;
    pushBubble({
      convKey: "group",
      senderName: "LoeweCars",
      initials: "LC",
      channelLabel: "Chat del equipo",
      body: "Mensaje de prueba: así verán los comerciales los avisos en esquina.",
      durationMs,
    });
  }, [pushBubble]);

  // Auto-dismiss bubbles only while the tab is visible so messages received
  // while the user is in another tab stay on screen until they switch back.
  useEffect(() => {
    if (bubbles.length === 0) return;
    let timers: number[] = [];
    const schedule = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers = [];
      if (document.visibilityState !== "visible") return;
      timers = bubbles.map((b) =>
        window.setTimeout(() => dismissBubble(b.id), b.durationMs),
      );
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [bubbles, dismissBubble]);

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
          const initials = senderName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p: string) => p[0]?.toUpperCase() ?? "")
            .join("") || "?";
          const channelLabel = isGroup ? "Chat del equipo" : "Mensaje directo";
          const rawPreview = typeof m.content === "string" ? m.content.trim() : "";
          const attachmentLabel = m.attachment_name ? `📎 ${m.attachment_name}` : "";
          const messageBody = rawPreview || attachmentLabel || "Nuevo mensaje";

          const onChatPage = location.pathname.startsWith("/chat");
          const appHidden = typeof document !== "undefined" && document.visibilityState !== "visible";
          const isViewingThisConv = onChatPage && !appHidden && activeConvRef.current === key;

          // Native OS notification — fires only when the app window is not
          // focused (handled inside showSystemNotification), so it reaches the
          // user even with the app minimized or in another tab/space.
          showSystemNotification({
            title: isGroup ? `${senderName} · Chat del equipo` : `Nuevo mensaje de ${senderName}`,
            body: messageBody,
            tag: `chat-${key}`,
            onClick: () => navigate(`/chat?conv=${encodeURIComponent(key)}`),
            path: `/chat?conv=${encodeURIComponent(key)}`,
          });

          // Corner floating bubble (Teams-style) whenever the user is not
          // actively reading that exact conversation.
          if (!isViewingThisConv) {
            pushBubble({
              convKey: key,
              senderName,
              initials,
              channelLabel,
              body: messageBody,
              durationMs: Math.max(2, getNotifPrefs().durationSec) * 1000,
            });
          }

          // Teams-style chime whenever a new message arrives and the user is not
          // actively reading that conversation (or the app is in the background).
          if (!isViewingThisConv || appHidden) {
            playChime();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname, navigate, employees, pushBubble]);

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
    <ChatNotifCtx.Provider value={{ unreadTotal, unreadByConv, markRead, refresh, setActiveConv, triggerTestNotification }}>
      {children}
      {typeof document !== "undefined" &&
        bubbles.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5">
            {bubbles.map((b) => (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  dismissBubble(b.id);
                  navigate(`/chat?conv=${encodeURIComponent(b.convKey)}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    dismissBubble(b.id);
                    navigate(`/chat?conv=${encodeURIComponent(b.convKey)}`);
                  }
                }}
                className="pointer-events-auto flex w-[340px] max-w-[calc(100vw-2rem)] cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/95 p-3.5 text-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur transition hover:border-primary/50 animate-in fade-in slide-in-from-bottom-4 duration-200"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {b.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{b.senderName}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {b.channelLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {b.body}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Cerrar notificación"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBubble(b.id);
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-muted hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ChatNotifCtx.Provider>
  );
}

export function useChatNotifications() {
  const ctx = useContext(ChatNotifCtx);
  if (!ctx) throw new Error("useChatNotifications must be used within ChatNotificationsProvider");
  return ctx;
}