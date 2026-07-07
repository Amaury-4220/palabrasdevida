// Palabra que Transforma — Service Worker v9
const CACHE_NAME = 'pqt-v21-agentes';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './biblia_completa.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Never intercept external/API calls
  if (
    url.includes('api.anthropic.com') ||
    url.includes('firebase') ||
    url.includes('firestore') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('netlify/functions') ||
    url.includes('unpkg.com') ||
    url.includes('cdnjs') ||
    url.includes('arcgisonline') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // index.html — always network first, safe clone
  if (url.endsWith('/') || url.includes('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.ok && res.status < 400) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other assets — cache first, safe clone on miss
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.ok && res.status < 400) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
