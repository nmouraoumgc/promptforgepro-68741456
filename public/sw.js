// PromptForge Pro service worker. __BUILD_ID__ is replaced at build time, so every deploy
// ships a byte-different sw.js -> browsers install it, it activates immediately and purges old caches.
const BUILD_ID = "__BUILD_ID__";
// "icons2" bumps the cache namespace for the new brand icons (old Lovable favicon purged on activate).
const CACHE_NAME = `promptforgepro-icons2-${BUILD_ID}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll([OFFLINE_URL, "/manifest.webmanifest", "/favicon.ico", "/favicon.svg"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations / HTML / version file: always network first, never serve a stale app shell.
  if (request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname === "/version.json" || url.pathname === "/sw.js") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => (request.mode === "navigate" ? (await caches.match(OFFLINE_URL)) : undefined) || Response.error())
    );
    return;
  }

  // Hashed build assets are immutable: cache first.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === "basic") { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); }
        return res;
      }))
    );
  }
  // Everything else: default browser handling (network).
});
