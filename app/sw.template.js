// Plates service worker: the app works offline once it has loaded.
// Same-origin GET requests only; API calls (Anthropic, Google, Open Food
// Facts) always go straight to the network.
const VERSION = '__VERSION__';
const SHELL = __SHELL__;
const CACHE = `plates-${VERSION}`;
const MEDIA = 'plates-media';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k !== MEDIA) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network first so updates arrive, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE); c.put('index.html', res.clone());
        return res;
      } catch {
        return (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }
  // Exercise photos and on-demand code (the PDF reader): cache on first use.
  if (url.pathname.includes('/media/') || url.pathname.includes('/assets/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(MEDIA)).put(req, res.clone());
      return res;
    })());
    return;
  }
  // App files (content-hashed) and data: cache first.
  e.respondWith((async () => (await caches.match(req)) || fetch(req))());
});
