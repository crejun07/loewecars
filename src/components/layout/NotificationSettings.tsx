import { useEffect, useState } from "react";
import { Bell, BellOff, SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  getNotifPrefs,
  setNotifPrefs,
  onNotifPrefsChange,
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  playChime,
  type NotifPrefs,
  type NotifPermission,
} from "@/lib/notify";

const DURATION_OPTIONS = [4, 8, 12, 20, 30];

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

  const toggleSound = () => {
    const next = setNotifPrefs({ sound: !prefs.sound });
    setPrefs(next);
    if (next.sound) playChime();
  };

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
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Ajustar volumen y duración del globo"
              aria-label="Ajustar volumen y duración del globo"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="w-64 space-y-4 p-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Volumen del tono</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(prefs.volume * 100)}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[Math.round(prefs.volume * 100)]}
                onValueChange={([v]) =>
                  setPrefs(setNotifPrefs({ volume: v / 100, sound: v > 0 }))
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => {
                  if (!prefs.sound && prefs.volume > 0) {
                    setPrefs(setNotifPrefs({ sound: true }));
                  }
                  playChime();
                }}
              >
                Probar tono Teams
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Duración del globo</span>
                <span className="tabular-nums text-muted-foreground">{prefs.durationSec}s</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {DURATION_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setPrefs(setNotifPrefs({ durationSec: sec }))}
                    className={
                      "rounded-md border py-1 text-[11px] font-medium transition " +
                      (prefs.durationSec === sec
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted")
                    }
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
