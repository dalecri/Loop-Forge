// Loop Forge service worker: offline app shell + cached drum samples.
// Bump CACHE when shipping changes to the app files.
const VERSION = '20261029-nav-2';
const CACHE = 'loopforge-' + VERSION;
const SAMPLES = 'loopforge-samples-v1';
const SHELL = [
  './', 'index.html', 'icon.svg', 'manifest.webmanifest',
  ...['css/style.css', 'css/studio.css', 'css/carbon.css', 'js/guide.js', 'js/app.js', 'js/recorder.js', 'js/record-worklet.js', 'js/mp3-worker.js', 'vendor/lame.min.js', 'js/voice.js', 'vendor/strudel-web.js'].map(path => path + '?v=' + VERSION),
  'fonts/AlphaLyrae-Medium.woff2', 'fonts/space-mono-400-latin.woff2', 'fonts/space-mono-700-latin.woff2',
  'fonts/pixelify-sans-latin.woff2', 'fonts/silkscreen-400-latin.woff2', 'fonts/vt323-latin.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(path => new Request(path, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('loopforge-') && k !== CACHE && k !== SAMPLES).map(k => caches.delete(k))))
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

  // Versioned assets must never fall back to a different release's CSS/JS.
  // HTML is a navigation fallback only, never a stylesheet or script response.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) {
        await cache.put(req, res.clone());
        return res;
      }
      return (await cache.match(req)) || res;
    } catch (err) {
      const hit = await cache.match(req);
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
