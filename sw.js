const C = 'clientes-v9';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(FILES.map(u => new Request(u, {cache: 'reload'})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
// Rede primeiro (pega a versão nova quando tem internet), cache se estiver offline ou lento
function net(req) {
  return new Promise((res, rej) => {
    const t = setTimeout(rej, 3000);
    fetch(req, {cache: 'no-cache'}).then(r => { clearTimeout(t); res(r); }, e => { clearTimeout(t); rej(e); });
  });
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    net(e.request).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
