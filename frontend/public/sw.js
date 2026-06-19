// 最小限のサービスワーカー：アプリシェルをキャッシュし、オフライン時の起動を補助する。
// API 応答（/api 配下）はキャッシュせず常にネットワークへ（データの鮮度を優先）。
const CACHE = 'asset-dashboard-v1';
const APP_SHELL = ['/', '/index.html', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // API・非GET はネットワーク直行（キャッシュしない）
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api')) return;

  // ナビゲーションは network-first（最新の index.html を優先、失敗時キャッシュ）
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html').then((r) => r || fetch(event.request))),
    );
    return;
  }

  // 静的アセットは cache-first
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        return res;
      }),
    ),
  );
});
