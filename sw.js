const SHELL_CACHE = "aluk-shell-v2";
const RUNTIME_CACHE = "aluk-runtime-v2";
const OFFLINE_URL = "./index.html";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./style.css?v=1616",
  "./script.js",
  "./script.js?v=1648",
  "./manifest.json",
  "./favicon.png",
  "./AlukAlumitBEL.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (const asset of SHELL_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {}
      }
    }).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, RUNTIME_CACHE, "aluk-offline-files-v1", "aluk-offline-files-app-v1", "aluk-offline-files-browser-v1"].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
