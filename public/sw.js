// Service worker sederhana: jaringan dulu, cadangan dari cache bila offline
const V = 'ksp-v6'
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['./', './logo.png', './icon-192.png'])).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res }).catch(() => caches.match(r).then(m => m || caches.match('./'))))
})
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l[0] ? l[0].focus() : clients.openWindow('./'))) })
