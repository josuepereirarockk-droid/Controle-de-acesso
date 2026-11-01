const C = 'clientes-v10', L = 'clientes-libs';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const LIBS = ['./pdf.min.mjs', './pdf.worker.min.mjs'];
const isLib = u => /\/pdf(\.worker)?\.min\.mjs$/.test(new URL(u).pathname);
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(C).then(c => c.addAll(FILES.map(u => new Request(u, {cache: 'reload'})))),
    // bibliotecas do PDF ficam em cache próprio: baixam uma vez só, não a cada versão
    caches.open(L).then(c => Promise.all(LIBS.map(u => c.match(u).then(r => r || c.add(new Request(u, {cache: 'reload'})))))).catch(() => {})
  ]));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C && x !== L).map(x => caches.delete(x)))).then(() => self.clients.claim()));
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
  if (isLib(e.request.url)) {
    e.respondWith(caches.open(L).then(c => c.match(e.request).then(r => r || fetch(e.request).then(x => { if (x.ok) c.put(e.request, x.clone()); return x; }))));
    return;
  }
  e.respondWith(
    net(e.request).then(r => {
      if (r && r.ok) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
