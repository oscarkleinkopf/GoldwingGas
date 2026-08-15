/* GoldwingGas — service worker (shell + CDN cache for offline PWA) */
const CACHE_VERSION = 'goldwinggas-v3';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './assets/goldwing-art.jpg',
  './assets/goldwing-art-card.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-16.png',
  './assets/icons/favicon.ico'
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

const CDN_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'tessdata.projectnaptha.com'
];

function cachePutSafe(request, response) {
  if (!response || !response.ok) return;
  caches.open(CACHE_VERSION).then((cache) => cache.put(request, response)).catch(() => {});
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(SHELL_ASSETS);
    await Promise.all(
      CDN_ASSETS.map((url) => cache.add(url).catch((err) => {
        console.warn('SW skip CDN', url, err);
      }))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          cachePutSafe(req, res.clone());
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  if (!CDN_HOSTS.includes(url.hostname)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          cachePutSafe(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
