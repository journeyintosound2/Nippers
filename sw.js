/* Nipper Hub service worker — makes the app open offline.
   Strategy:
   - App files (same origin): network first, so you always get the latest
     version when you have reception; falls back to the cached copy offline.
   - Fonts and the Firebase SDK (gstatic / Google Fonts): cache first.
   - Firestore / Auth traffic is never touched (Firestore has its own
     offline cache and queues changes until you're back in range).
   No version bumping needed when you update the site. */
const CACHE = 'nipperhub-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/styles.css', './assets/icon.svg',
  './js/config.js', './js/standards.js', './js/games.js', './js/parent-notes.js', './js/store.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Network first, but don't wait more than 3 s on weak beach reception.
    const fromCache = () => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
    const network = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = r => { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(() => fromCache().then(finish), 3000);
      network.then(r => { clearTimeout(timer); finish(r); })
        .catch(() => { clearTimeout(timer); fromCache().then(r => r ? finish(r) : finish(Response.error())); });
    }));
    return;
  }

  if (CDN.test(req.url)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
