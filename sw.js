// GBX-16 service worker: caches the app shell so it opens with no connection.
// Bump VERSION whenever index.html or the icons change.
// This file also replaces the old Loop Forge worker at the same address, so devices
// that installed Loop Forge switch over to GBX-16. The archived Loop Forge in
// archive/loop-forge/ registers its own worker for that folder and is left alone here.
const VERSION = '20261118-v3';
const CACHE = 'gbx16-' + VERSION;
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(p => new Request(p, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('gbx16-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/archive/')) return; // archived Loop Forge handles itself

  // Network first so updates land right away; cache when offline.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) await cache.put(req, res.clone());
      return res.ok ? res : ((await cache.match(req, { ignoreSearch: true })) || res);
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
