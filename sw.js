 importScripts('./version.js');

const CACHE_NAME = "therapiedoku-v" + APP_VERSION;
const APP_FILES = [
  "./",
  "./index.html",
  "./version.js",
  "./styles.css?v=" + APP_VERSION,
  "./app.js?v=" + APP_VERSION,
  "./bausteine.json?v=" + APP_VERSION,
  "./manifest.webmanifest?v=" + APP_VERSION,
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./fonts/DM-Sans-300.woff2",
  "./fonts/DM-Sans-400.woff2",
  "./fonts/DM-Sans-500.woff2",
  "./fonts/DM-Sans-600.woff2",
  "./fonts/DM-Serif-Display-400.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
  );
});
