// 无明 · 离线缓存（网络优先，离线回退到缓存）
const CACHE = 'wuming-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon192.png',
  './icon512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 页面导航：网络优先，失败回退缓存（保证始终最新，离线也能开）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
          return r;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：缓存优先，缺失则网络并写入缓存
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((r) => {
        if (r.ok && (req.url.endsWith('.png') || req.url.endsWith('.webmanifest'))) {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
        }
        return r;
      }).catch(() => m)
    )
  );
});
