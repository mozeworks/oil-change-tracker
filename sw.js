const CACHE = "oil-tracker-v6";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "carsdata.js",
  "manifest.json",
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the browser's HTTP cache so we store the newest files.
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" })))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first: always try for the latest version, and fall back to the
// saved copy only when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || (e.request.mode === "navigate" ? caches.match("index.html") : undefined)
        )
      )
  );
});
