const CACHE_NAME = 'kokudo-tracker-v1';
const STATIC_CACHE = 'kokudo-static-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './js/app.js',
  './js/roads-data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// インストール時: 静的アセットをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      caches.open(CACHE_NAME).then(cache => cache.addAll(CDN_ASSETS))
    ]).then(() => self.skipWaiting())
  );
});

// アクティベート時: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// フェッチ: キャッシュファーストで対応
self.addEventListener('fetch', event => {
  const { request } = event;

  // CDNリソースはキャッシュファースト
  if (request.url.includes('unpkg.com') || request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // ローカルアセットはキャッシュファースト→ネットワーク
  if (request.method === 'GET' && request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});
