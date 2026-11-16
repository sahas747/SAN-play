// SAN Player service worker: app shell only. Audio/video and cross-origin (R2 media) requests are never cached.
const CACHE = 'sanplay-shell-v7';
const CORE = ['./', './index.html', './app.css', './app.js', './cloud.js', './sources.js', './firebase-config.js',
  './manifest.webmanifest', './assets/san-icon-192.png', './assets/san-icon-512.png', './assets/san-player-logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('sanplay-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (r.destination === 'audio' || r.destination === 'video') return;
  // network first so updates reach visitors; fall back to the cached copy when offline
  e.respondWith(fetch(r)
    .then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(r, res.clone())); return res; })
    .catch(() => caches.match(r).then(hit => hit || caches.match('./index.html'))));
});
