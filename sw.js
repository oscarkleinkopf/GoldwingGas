/* GoldwingGas — service worker (shell cache for offline / installable PWA) */
const CACHE_VERSION = 'goldwinggas-v8';
const SHARE_INBOX = 'goldwinggas-share-inbox';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './js/i18n.js',
  './js/ocr-enhance.js',
  './js/report.js',
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function handleShareTargetPost(request) {
  try {
    const formData = await request.formData();
    const files = [
      ...formData.getAll('gpxfiles'),
      ...formData.getAll('gpx'),
      ...formData.getAll('file')
    ].filter(Boolean);
    const inbox = await caches.open(SHARE_INBOX);
    let i = 0;
    for (const file of files) {
      if (typeof file === 'string') continue;
      const text = await file.text();
      if (!/<gpx[\s>]/i.test(text) && !/topografix\.com\/GPX/i.test(text)) continue;
      const name = encodeURIComponent(file.name || `beeline-${Date.now()}.gpx`);
      await inbox.put(
        `./share-inbox/${Date.now()}-${i++}.gpx`,
        new Response(text, {
          headers: {
            'Content-Type': 'application/gpx+xml',
            'X-Filename': name
          }
        })
      );
    }
  } catch (err) {
    console.warn('Share target error', err);
  }
  return Response.redirect('./?share=beeline', 303);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === 'POST' && (url.pathname.endsWith('/share-target') || url.pathname.endsWith('/share-target/'))) {
    event.respondWith(handleShareTargetPost(req));
    return;
  }

  if (req.method !== 'GET') return;

  // App shell: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // CDNs (Chart.js, Tesseract, fonts, FA): network-first, cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        if (res.ok) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
