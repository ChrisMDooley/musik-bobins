/* sw.js — Musik-Bobins offline cache. Network first (updates arrive), cache as fallback.
   Bump VERSION on every release. */
const VERSION = 'musik-v1.0.0';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'css/musik.css', 'icons/icon.svg',
  'js/speech.js', 'js/theory.js', 'js/rhythm.js', 'js/text.js', 'js/model.js', 'js/gens.js', 'js/gens2.js', 'js/progress.js', 'js/session.js',
  'js/audio.js', 'js/glyphs.js', 'js/platform.js', 'js/ui.js', 'js/staff.js', 'js/piano.js', 'js/vis.js',
  'js/widgets.js', 'js/practice.js', 'js/lessons.js', 'js/screens.js', 'js/app.js',
  'fonts/atkinson-hyperlegible-latin-400-normal.woff2', 'fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  'fonts/OpenDyslexic-Regular.woff', 'fonts/OpenDyslexic-Bold.woff'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
