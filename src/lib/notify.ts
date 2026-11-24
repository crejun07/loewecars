// Notification helpers: in-app sound (WebAudio chime) + native/desktop
// notifications (Notification API) + per-device preferences.
//
// Browsers block audio until a user gesture, so we lazily create ONE
// AudioContext and resume it on the first pointer/keyboard event so later
// chimes actually play.

let audioCtx: AudioContext | null = null;
let unlocked = false;

// ---------------------------------------------------------------------------
// Preferences (per device, persisted in localStorage)
// ---------------------------------------------------------------------------
export type NotifPrefs = { sound: boolean; desktop: boolean };

const PREFS_KEY = "loewe:notif-prefs";
const PREFS_EVENT = "loewe:notif-prefs";
const defaultPrefs: NotifPrefs = { sound: true, desktop: true };

export function getNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...defaultPrefs };
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return { ...defaultPrefs };
  }
}

export function setNotifPrefs(patch: Partial<NotifPrefs>): NotifPrefs {
  const next = { ...getNotifPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent<NotifPrefs>(PREFS_EVENT, { detail: next }));
  } catch {
    /* ignore */
  }
  return next;
}

/** Subscribe to preference changes (same tab). Returns an unsubscribe fn. */
export function onNotifPrefsChange(cb: (prefs: NotifPrefs) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<NotifPrefs>).detail ?? getNotifPrefs());
  window.addEventListener(PREFS_EVENT, handler);
  return () => window.removeEventListener(PREFS_EVENT, handler);
}

// ---------------------------------------------------------------------------
// Sound (WebAudio chime)
// ---------------------------------------------------------------------------
function getCtx(): AudioContext | null {
  try {
    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

function unlock() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  // Play a silent buffer to fully unlock on iOS/Safari.
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
  unlocked = true;
}

export function initNotificationSound() {
  if (typeof window === "undefined") return;
  const handler = () => {
    unlock();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("touchstart", handler);
  };
  window.addEventListener("pointerdown", handler, { once: false });
  window.addEventListener("keydown", handler, { once: false });
  window.addEventListener("touchstart", handler, { once: false });
}

export function playChime() {
  try {
    if (!getNotifPrefs().sound) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!unlocked && ctx.state !== "running") return; // will play on next chime after gesture
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, now);
    o.frequency.setValueAtTime(1320, now + 0.08);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.32);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Native / desktop notifications (Notification API)
// ---------------------------------------------------------------------------
export type NotifPermission = NotificationPermission | "unsupported";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotifPermission {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Ask the browser for permission to show desktop notifications. Must be called
 * in response to a user gesture in most browsers. Safe to call repeatedly: if
 * the user already granted or denied, it resolves to the current state without
 * prompting again.
 */
export async function requestNotificationPermission(): Promise<NotifPermission> {
  if (!notificationsSupported()) return "unsupported";
  try {
    if (Notification.permission !== "default") return Notification.permission;
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Request permission once (per browser) on the first user gesture. */
export function autoRequestNotificationPermission() {
  if (typeof window === "undefined") return;
  if (!notificationsSupported()) return;
  if (Notification.permission !== "default") return;
  const handler = () => {
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    if (getNotifPrefs().desktop) requestNotificationPermission();
  };
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
}

export interface SystemNotificationOptions {
  title: string;
  body?: string;
  tag?: string;
  /** Show even when the app window is focused. Default: false (only when hidden). */
  whenFocused?: boolean;
  onClick?: () => void;
  /** In-app path opened when the notification is clicked (service worker). */
  path?: string;
}

/**
 * Show a native OS notification. By default it only fires when the app is not
 * the focused/visible window, so it never duplicates an in-app toast the user
 * is already looking at. Respects the per-device "desktop" preference and the
 * browser permission. Falls back silently when unavailable.
 */
export function showSystemNotification(opts: SystemNotificationOptions): Notification | null {
  try {
    if (!notificationsSupported()) return null;
    if (!getNotifPrefs().desktop) return null;
    if (Notification.permission !== "granted") return null;
    const focused =
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      (typeof document.hasFocus !== "function" || document.hasFocus());
    if (focused && !opts.whenFocused) return null;

    const base =
      (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) || "/";
    const options: NotificationOptions & { renotify?: boolean; requireInteraction?: boolean } = {
      body: opts.body,
      tag: opts.tag,
      icon: `${base}icon-192.png`,
      badge: `${base}icon-192.png`,
      silent: false,
      renotify: !!opts.tag,
      requireInteraction: true,
      data: { path: opts.path ?? null },
    };
    // Prefer the service worker: its notifications go to the OS notification
    // center and still show with the window minimized or in the background.
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(opts.title, options))
        .catch(() => fallback());
      return null;
    }
    return fallback();

    function fallback(): Notification | null {
      try {
        const n = new Notification(opts.title, options);
        n.onclick = () => {
          try { window.focus(); } catch { /* ignore */ }
          opts.onClick?.();
          n.close();
        };
        return n;
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}
