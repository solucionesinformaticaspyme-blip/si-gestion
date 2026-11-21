// Si-Gestión – Service Worker. Al publicar cambios, subir el número de versión.
const CACHE = "si-gestion-v5";
const ARCHIVOS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // las llamadas al servidor (POST) nunca se cachean
  const propio = new URL(req.url).origin === self.location.origin;
  const fuente = req.url.includes("fonts.googleapis.com") || req.url.includes("fonts.gstatic.com");
  if (!propio && !fuente) return;
  if (propio) {
    // Archivos de la app: primero la red (para tomar actualizaciones) y, sin conexión, la copia guardada
    e.respondWith(fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); return r; }).catch(() => caches.match(req)));
  } else {
    e.respondWith(caches.match(req).then((c) => c || fetch(req).then((r) => { const copia = r.clone(); caches.open(CACHE).then((k) => k.put(req, copia)); return r; })));
  }
});
