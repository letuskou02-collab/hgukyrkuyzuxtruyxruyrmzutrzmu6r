const CACHE_NAME = 'sticker-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    'https://unpkg.com/vue@3/dist/vue.global.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://tile.openstreetmap.org/0/0/0.png'
];

// Service Worker インストール
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache).catch(err => {
                    console.log('Cache addAll error:', err);
                    // 一部のリソースでエラーが発生しても続行
                });
            })
    );
    self.skipWaiting();
});

// Service Worker アクティベーション
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// フェッチイベント - キャッシュファースト戦略
self.addEventListener('fetch', event => {
    const { request } = event;

    // GETリクエストのみ処理
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request).then(response => {
                    // 外部リソースをキャッシュに追加
                    if (response.status === 200 && request.url.includes('tile.openstreetmap.org')) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // ネットワークエラー時のフォールバック
                return caches.match('/index.html');
            })
    );
});
