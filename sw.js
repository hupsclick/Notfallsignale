const CACHE_NAME = "notfall-signale-v3";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icon.ico",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/wahlscheibe.png"
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  // Neue Version darf sofort aktiviert werden
  self.skipWaiting();
});

// Aktivierung – alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  // Neuer Service Worker übernimmt sofort
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const request = event.request;

  // Die index.html immer zuerst aus dem Netzwerk laden.
  // Dadurch werden neue App-Versionen schneller erkannt.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Neue index.html im aktuellen Cache speichern
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Kein Internet → gespeicherte index.html verwenden
          return caches.match("./index.html");
        })
    );

    return;
  }

  // Alle anderen Dateien: Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            request.url.startsWith(self.location.origin)
          ) {
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return networkResponse;
        })
        .catch(() => {
          return undefined;
        });
    })
  );
});
