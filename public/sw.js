self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open("orange-hotel-shell-v1").then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      if (response.ok && request.destination !== "document") {
        cache.put(request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
