/* Suivi de visites (GoatCounter) : uniquement sur la vraie prod
   (swallowage.github.io/geoberce) - retour direct de l'utilisatrice
   ("ça sert à rien sur la dev"). index.html et js/ sont synchronisés
   automatiquement depuis ce dépôt vers geoberce/ sur swallowage (voir
   sync-geoberce.yml côté swallowage), donc une seule version de ce
   fichier existe pour les deux : c'est à lui de décider où il s'active
   au chargement plutôt que d'exister en deux variantes selon le dépôt. */
function estProdGeoberce(hostname) {
    return hostname === "swallowage.github.io";
}

function injecterGoatCounter() {
    const script = document.createElement("script");
    script.async = true;
    script.src = "//gc.zgo.at/count.js";
    script.dataset.goatcounter = "https://geoberce.goatcounter.com/count";
    document.head.appendChild(script);
}

if (estProdGeoberce(location.hostname)) injecterGoatCounter();
