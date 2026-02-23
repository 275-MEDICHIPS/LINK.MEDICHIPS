/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  StaleWhileRevalidate,
  NetworkFirst,
  CacheFirst,
} from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

// Precache app shell (injected at build time)
precacheAndRoute(self.__WB_MANIFEST);

// ==================== 5 Caching Strategies ====================

// 1. App Shell (HTML, JS, CSS) — StaleWhileRevalidate
registerRoute(
  ({ request }) =>
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style",
  new StaleWhileRevalidate({
    cacheName: "app-shell-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// 2. API Data — NetworkFirst (3s timeout)
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-data-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// 3. Lesson Content — CacheFirst (explicit download)
registerRoute(
  ({ url }) =>
    url.pathname.includes("/lessons/") && url.searchParams.has("offline"),
  new CacheFirst({
    cacheName: "lesson-content-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// 4. Media (Video/Audio) — CacheFirst (explicit download)
registerRoute(
  ({ url }) =>
    url.hostname === "stream.mux.com" ||
    url.pathname.match(/\.(mp4|m3u8|ts|mp3|aac)$/),
  new CacheFirst({
    cacheName: "media-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// 5. Images — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ==================== Background Sync ====================

self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag === "sync-progress") {
    syncEvent.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  // Trigger sync from client
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "SYNC_TRIGGERED" });
  }
}

// ==================== Offline Fallback ====================

self.addEventListener("fetch", (event) => {
  if (
    event.request.mode === "navigate" &&
    !navigator.onLine
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (response) =>
          response ||
          caches.match("/offline.html").then(
            (offlineResponse) =>
              offlineResponse ||
              new Response("Offline", {
                status: 503,
                headers: { "Content-Type": "text/html" },
              })
          )
      )
    );
  }
});

// ==================== Push Notifications ====================

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "MEDICHIPS-LINK", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: data.data,
      tag: data.tag || "default",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(self.clients.openWindow(url));
});
