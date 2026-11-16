import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  getNotifPrefs,
  setNotifPrefs,
  onNotifPrefsChange,
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  type NotifPrefs,
  type NotifPermission,
} from "@/lib/notify";

/**
 * Compact per-device notification controls shown in the sidebar footer so every
 * user (not only Informática) can mute the chime and grant/revoke desktop
 * notifications. Preferences live in localStorage; permission lives in the
 * browser.
 */
export function NotificationSettings({ collapsed }: { collapsed?: boolean }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => getNotifPrefs());
  const [perm, setPerm] = useState<NotifPermission>(() => notificationPermission());

  useEffect(() => onNotifPrefsChange(setPrefs), []);

  const toggleSound = () => setPrefs(setNotifPrefs({ sound: !prefs.sound }));

  const toggleDesktop = async () => {
    // Turning it ON: make sure we have browser permission first.
    if (!prefs.desktop) {
      if (notificationsSupported() && notificationPermission() !== "granted") {
        const result = await requestNotificationPermission();
        setPerm(result);
        if (result === "denied") {
          toast("Notificaciones bloqueadas", {
            description:
              "Actívalas para este sitio en los ajustes del navegador para recibir avisos en pantalla.",
          });
          return;
        }
        if (result === "unsupported") {
          toast("Este navegador no admite notificaciones de escritorio");
          return;
        }
      }
      setPrefs(setNotifPrefs({ desktop: true }));
    } else {
      setPrefs(setNotifPrefs({ desktop: false }));
    }
  };

  const desktopActive = prefs.desktop && perm === "granted";
  const desktopTitle = !notificationsSupported()
    ? "Notificaciones de escritorio no disponibles"
    : perm === "denied"
    ? "Notificaciones bloqueadas por el navegador"
    : desktopActive
    ? "Notificaciones en pantalla activadas"
    : "Activar notificaciones en pantalla";

  return (
    <div
      className={
        collapsed
          ? "flex flex-col items-center gap-1 py-1"
          : "flex items-center justify-between gap-1 px-2 py-1"
      }
    >
      {!collapsed && (
        <span className="text-[11px] text-muted-foreground">Notificaciones</span>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSound}
          title={prefs.sound ? "Silenciar sonido" : "Activar sonido"}
          aria-label={prefs.sound ? "Silenciar sonido" : "Activar sonido"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {prefs.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={toggleDesktop}
          title={desktopTitle}
          aria-label={desktopTitle}
          className={
            "flex h-7 w-7 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground " +
            (desktopActive ? "text-primary" : "text-muted-foreground")
          }
        >
          {desktopActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
