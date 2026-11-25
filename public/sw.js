// LoeweCars service worker — enables installability (PWA) and a basic offline
// app shell. It never touches cross-origin requests (Supabase, APIs) or
// non-GET requests, so live data always goes straight to the network.
const CACHE = "loewe-shell-v4";
// Works both at Lovable's domain root and under GitHub Pages' /loewecars/.
const BASE = self.registration.scope;
const SHELL = [
  BASE,
  BASE + "manifest.webmanifest",
  BASE + "favicon.ico",
  BASE + "icon-192.png",
  BASE + "icon-512.png",
  BASE + "apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin; let Supabase/CDN/etc. pass through untouched.
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first, fall back to cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(BASE))),
    );
    return;
  }

  // Static assets (hashed JS/CSS, images, icons): cache-first, then network.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});

// Desktop notifications: clicking one focuses the CRM (or opens it) at the
// right section.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.path) || "";
  const target = new URL(path.replace(/^\//, ""), BASE).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(BASE)) {
          return c.focus().then((w) => (w && "navigate" in w ? w.navigate(target) : w));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
