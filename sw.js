// Loop Forge service worker: offline app shell + cached drum samples.
// Bump CACHE when shipping changes to the app files.
const CACHE = 'loopforge-quiet-pixel-v3';
const SAMPLES = 'loopforge-samples-v1';
const SHELL = [
  './', 'index.html', 'css/style.css', 'css/studio.css', 'css/carbon.css', 'js/guide.js', 'js/app.js', 'js/voice.js', 'vendor/strudel-web.js', 'icon.svg', 'manifest.webmanifest',
  'fonts/AlphaLyrae-Medium.woff2', 'fonts/space-mono-400-latin.woff2', 'fonts/space-mono-700-latin.woff2',
  'fonts/pixelify-sans-latin.woff2', 'fonts/silkscreen-400-latin.woff2', 'fonts/vt323-latin.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SAMPLES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Samples from GitHub: cache-first, they never change.
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'github.com') {
    e.respondWith(caches.open(SAMPLES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // App files: network-first so updates land immediately, cache as fallback.
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
