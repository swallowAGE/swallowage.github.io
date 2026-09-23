/* =========================================================
   MON VILLAGE DES CALCULS — SERVICE WORKER
   Réseau d'abord (pour recevoir les mises à jour), puis cache
   en secours : le jeu reste jouable sans connexion, en voiture
   ou en vacances. La sauvegarde du village est dans localStorage,
   elle n'est jamais touchée ici.
   ========================================================= */
const CACHE = "village-calculs-v2";
const FILES = ["./", "index.html", "style.css", "app.js", "manifest.json", "icons/icon-192.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
