const CACHE_NAME = "classsync-v2";
const OFFLINE_URL = "/offline";

const APP_SHELL = ["/offline", "/manifest.json"];

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico")
  );
}

function isDynamicRequest(url, request) {
  return (
    request.mode === "navigate" ||
    url.pathname.startsWith("/api/") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-State-Tree") != null ||
    request.headers.get("Next-Router-Prefetch") != null
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (isDynamicRequest(url, event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
    return;
  }

  event.respondWith(fetch(event.request));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  const cache = await caches.open("attendance-queue");
  const requests = await cache.keys();
  for (const req of requests) {
    try {
      const body = await (await cache.match(req))?.json();
      if (body) {
        await fetch("/api/attendance/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await cache.delete(req);
      }
    } catch {
      // Will retry on next sync
    }
  }
}
