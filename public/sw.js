'use strict';
// Service worker de Recreatic: permite instalar la app y abrirla sin conexión.
// Los archivos de /assets/ llevan hash en el nombre, así que se guardan para siempre; la portada se pide primero a la red.
const VERSION = 'recreatic-v1';
const BASE = ['./', 'manifest.webmanifest', 'iconos/icono-192.png', 'iconos/icono-512.png', 'favicon.svg'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // Supabase, Wikimedia, etc.: directo a la red
  if (r.mode === 'navigate') { // portada: red primero, copia guardada si no hay conexión
    e.respondWith(fetch(r).then((res) => { const c = res.clone(); caches.open(VERSION).then((x) => x.put('./', c)); return res; }).catch(() => caches.match('./')));
    return;
  }
  if (u.pathname.includes('/assets/')) { // con hash: cache primero
    e.respondWith(caches.match(r).then((c) => c || fetch(r).then((res) => { const k = res.clone(); caches.open(VERSION).then((x) => x.put(r, k)); return res; })));
    return;
  }
  e.respondWith(caches.match(r).then((c) => { const red = fetch(r).then((res) => { const k = res.clone(); caches.open(VERSION).then((x) => x.put(r, k)); return res; }).catch(() => c); return c || red; }));
});
