const CACHE = 'shimifit-noa-v3';
const ASSETS = ['./', './index.html', './style.css', './app.js', './data.js', './poses.js', './fig.js', './morph.js', './manifest.json'];
const NET_FIRST = /\.(js|css|html)$|\/$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.pathname.startsWith('/ios/report.php') || u.pathname.includes('/api/')) return;
  if (e.request.method !== 'GET') return;
  const netFirst = NET_FIRST.test(u.pathname) || e.request.mode === 'navigate';
  if (netFirst) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow('./')); });
