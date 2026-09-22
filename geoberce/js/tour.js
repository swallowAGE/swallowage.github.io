/* =========================================================
   GÉOBERCÉ — VISITE GUIDÉE (première visite)
   Quelques bulles qui mettent en avant les éléments clés du site
   (recherche, raccourcis, dashboard commune, couches, actualités),
   affichées une fois à la première visite (mémorisé en local),
   rejouables depuis "À propos". Fait maison en JS/CSS pur plutôt
   qu'avec une librairie de tour guidé tierce, pour rester dans le
   même style visuel que le reste du site et ne pas ajouter de
   dépendance externe de plus.
   ========================================================= */
const ETAPES_VISITE = [
    { cible: "#search-container", texte: "Recherchez une adresse, un lieu ou un service (mairie, commerce, école...) directement ici." },
    { cible: "#hero-communes", texte: "Consultez le dashboard de votre commune : mairie, chiffres clés, actualités locales." },
    { cible: "#hero-raccourcis", texte: "Ou faites défiler les raccourcis pour trouver ce qui est le plus proche de chez vous." },
    { cible: "#hero-parcelle", texte: "Recherchez une parcelle par surface, constructibilité ou DPE - pour affiner davantage, le panneau complet s'ouvre avec ces critères déjà remplis." },
    { cible: "#menu-button", texte: "Affichez ou masquez les couches de données sur la carte (cadastre, commerces, risques...)." },
    { cible: "#actu-button", texte: "Les actualités Illiwap du territoire, en un clic." }
];

let etapeVisiteActuelle = 0;

function positionnerBulleVisite(cible) {
    const rect = cible.getBoundingClientRect();
    const marge = 6;

    const spot = document.getElementById("tour-spot");
    spot.style.top = (rect.top - marge) + "px";
    spot.style.left = (rect.left - marge) + "px";
    spot.style.width = (rect.width + marge * 2) + "px";
    spot.style.height = (rect.height + marge * 2) + "px";

    /* Au-dessus ou en dessous de la cible selon la place disponible,
       plutôt qu'une position fixe qui sortirait de l'écran pour les
       éléments du bas (bouton Couches, Actualités). */
    const bulle = document.getElementById("tour-bulle");
    const largeurBulle = Math.min(300, window.innerWidth - 32);
    bulle.style.width = largeurBulle + "px";

    const placerEnDessous = rect.top < window.innerHeight / 2;
    bulle.style.top = placerEnDessous ? (rect.bottom + 16) + "px" : "auto";
    bulle.style.bottom = placerEnDessous ? "auto" : (window.innerHeight - rect.top + 16) + "px";

    let gauche = rect.left + rect.width / 2 - largeurBulle / 2;
    gauche = Math.max(16, Math.min(gauche, window.innerWidth - largeurBulle - 16));
    bulle.style.left = gauche + "px";
}

function afficherEtapeVisite(index) {
    const etape = ETAPES_VISITE[index];
    const cible = document.querySelector(etape.cible);
    if (!cible) {
        /* Élément absent (ex. masqué à cette largeur d'écran) : on
           saute directement à l'étape suivante plutôt que de mettre en
           avant un élément invisible. */
        if (index + 1 < ETAPES_VISITE.length) afficherEtapeVisite(index + 1);
        else terminerVisiteGuidee();
        return;
    }

    etapeVisiteActuelle = index;
    document.getElementById("tour-texte").textContent = etape.texte;
    document.getElementById("tour-compteur").textContent = `${index + 1}/${ETAPES_VISITE.length}`;
    document.getElementById("tour-suivant").textContent = index === ETAPES_VISITE.length - 1 ? "Terminer" : "Suivant";
    positionnerBulleVisite(cible);
}

function demarrerVisiteGuidee() {
    /* Rouvre l'accueil (au cas où une visite relancée depuis "À propos"
       le trouve déjà fermé) : les raccourcis et le sélecteur de commune
       n'existent visuellement que quand l'accueil est affiché. */
    ouvrirAccueil();
    document.getElementById("tour").hidden = false;
    afficherEtapeVisite(0);
}

function terminerVisiteGuidee() {
    document.getElementById("tour").hidden = true;
    try { localStorage.setItem("geoberce_visite_vue", "1"); } catch (_) { /* navigation privée : tant pis, pas bloquant */ }
}

function demarrerVisiteSiPremiereFois() {
    let dejaVue = true;
    try { dejaVue = localStorage.getItem("geoberce_visite_vue") === "1"; } catch (_) { dejaVue = false; }
    if (!dejaVue) setTimeout(demarrerVisiteGuidee, 800);
}

document.getElementById("tour-suivant").addEventListener("click", () => {
    if (etapeVisiteActuelle + 1 < ETAPES_VISITE.length) afficherEtapeVisite(etapeVisiteActuelle + 1);
    else terminerVisiteGuidee();
});
document.getElementById("tour-passer").addEventListener("click", terminerVisiteGuidee);

window.addEventListener("resize", () => {
    if (!document.getElementById("tour").hidden) {
        const cible = document.querySelector(ETAPES_VISITE[etapeVisiteActuelle].cible);
        if (cible) positionnerBulleVisite(cible);
    }
});
