/* =========================================================
   GÉOBERCÉ — INSTALLATION SUR L'ÉCRAN D'ACCUEIL (PWA)
   Retour direct de l'utilisatrice : les gens doivent passer par les 3
   points de Chrome (ou équivalent) pour installer le site comme une
   application, pas pratique. manifest.json + sw.js (service worker
   minimal, sans mise en cache) rendent le site installable ; ce fichier
   capte l'invite native du navigateur (événement "beforeinstallprompt")
   pour la déclencher depuis un simple bouton dans la barre du haut
   plutôt que de laisser deviner où se trouve l'option dans les menus.

   Limite réelle, pas contournable : Safari iOS ne déclenche JAMAIS cet
   événement (aucune API pour ça, contrairement à Chrome/Edge/Firefox
   Android et Chrome/Edge desktop) - sur iPhone, l'utilisateur reste
   obligé de passer par Partager -> "Sur l'écran d'accueil", à la main.
   Rien côté site ne peut déclencher cette action à sa place ; le
   bouton reste donc simplement invisible sur iOS plutôt que d'exister
   pour ne rien faire.
   ========================================================= */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(err => console.error("Service worker :", err));
    });
}

let invitationInstallation = null;

window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    invitationInstallation = event;
    document.getElementById("install-button").hidden = false;
});

/* Le bouton doit redisparaître si le site est installé par un autre
   chemin que ce bouton (icône native dans la barre d'adresse
   desktop...) - sans ça, il resterait affiché indéfiniment à proposer
   d'installer une application déjà installée. */
window.addEventListener("appinstalled", () => {
    invitationInstallation = null;
    document.getElementById("install-button").hidden = true;
});

document.getElementById("install-button").addEventListener("click", async () => {
    if (!invitationInstallation) return;
    invitationInstallation.prompt();
    await invitationInstallation.userChoice;
    /* Que l'utilisateur accepte ou refuse, l'invite ne peut de toute
       façon plus resservir une 2e fois (usage unique côté navigateur) -
       masqué dans les deux cas plutôt que de laisser un bouton mort. */
    invitationInstallation = null;
    document.getElementById("install-button").hidden = true;
});
