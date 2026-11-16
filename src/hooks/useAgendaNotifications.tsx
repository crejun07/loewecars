import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playChime, showSystemNotification } from "@/lib/notify";

/**
 * On app open (per session), shows a summary of today's pending events for the
 * user and plays a small chime. Also plays a chime + toast whenever a new
 * agenda event addressed to the current user is inserted in real time.
 */
export function useAgendaNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const digestShown = useRef(false);

  // Digest on app open: upcoming events from now to +7 days
  useEffect(() => {
    if (!user || digestShown.current) return;
    digestShown.current = true;
    (async () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("agenda_events")
        .select("id,title,event_date,status,is_broadcast,user_id")
        .gte("event_date", start.toISOString())
        .lte("event_date", end.toISOString())
        .order("event_date", { ascending: true });
      const events = (data ?? []).filter(
        (e: any) => e.status !== "done" && (e.is_broadcast || e.user_id === user.id),
      );
      if (events.length === 0) return;
      const list = events
        .slice(0, 4)
        .map(
          (e: any) =>
            `• ${format(new Date(e.event_date), "d MMM · HH:mm", { locale: es })} — ${e.title}`,
        )
        .join("\n");
      const more = events.length > 4 ? `\n… y ${events.length - 4} más` : "";
      toast(`Tienes ${events.length} evento(s) próximo(s)`, {
        description: list + more,
        duration: 10000,
        action: { label: "Ver agenda", onClick: () => navigate("/agenda") },
      });
      playChime();
    })();
  }, [user, navigate]);

  // Realtime: new events assigned to me or broadcast
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("agenda_events_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agenda_events" },
        (payload) => {
          const e: any = payload.new;
          if (e.created_by === user.id) return; // I created it — no notification
          const forMe = e.is_broadcast || e.user_id === user.id;
          if (!forMe) return;
          const when = format(new Date(e.event_date), "d MMM · HH:mm", { locale: es });
          toast(`Nuevo evento: ${e.title}`, {
            description: when,
            action: { label: "Ver", onClick: () => navigate("/agenda") },
          });
          showSystemNotification({
            title: `Nuevo evento: ${e.title}`,
            body: when,
            tag: `agenda-${e.id}`,
            onClick: () => navigate("/agenda"),
          });
          playChime();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
}