// Solo armazón estático de esta compilación; jamás telemetría, llaves o API.
const PREFIJO = 'porton-armazon-';
let permitidos = [];
let nombre = '';
async function preparar() {
  if (!nombre) {
    const manifiesto = await fetch('/armazon.json', {cache: 'no-store'}).then(r => r.json());
    permitidos = manifiesto.archivos; nombre = PREFIJO + manifiesto.version;
  }
}
self.addEventListener('install', e => {
  e.waitUntil(preparar().then(async () => {
    await (await caches.open(nombre)).addAll(permitidos); await self.skipWaiting();
  }));
});
self.addEventListener('activate', e => {
  e.waitUntil(preparar().then(async () => {
    await Promise.all((await caches.keys()).filter(k => k.startsWith(PREFIJO) && k !== nombre).map(k => caches.delete(k)));
    await self.clients.claim();
  }));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin || u.search ||
    !permitidos.includes(u.pathname)) return;
  // Red primero (2026-10-21): antes servía siempre la copia guardada y las actualizaciones no llegaban
  // a la app instalada. Ahora pide la versión nueva y usa la copia solo sin internet.
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); void caches.open(nombre).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.open(nombre).then(c => c.match(e.request))));
});
