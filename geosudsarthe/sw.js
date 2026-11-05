/* =========================================================
   GÉOBERCÉ — SERVICE WORKER MINIMAL
   Seul rôle : rendre le site installable ("Installer l'application",
   voir js/installation.js) - Chrome exige un service worker enregistré
   avec un gestionnaire fetch pour considérer un site comme une PWA
   installable, indépendamment de tout usage hors ligne. Aucune mise en
   cache volontairement : le site est mis à jour souvent, un cache raté
   resterait planté un moment sur les téléphones qui l'auraient
   installé - simple passe-plat réseau pour l'instant.
   ========================================================= */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
    // Volontairement vide (pas de event.respondWith) : laisse le
    // navigateur traiter la requête normalement, comme s'il n'y avait
    // pas de service worker du tout.
});
