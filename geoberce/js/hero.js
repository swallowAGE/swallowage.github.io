/* =========================================================
   GÉOBERCÉ — ÉCRAN D'ACCUEIL PAR THÉMATIQUES
   Une couche d'accueil au-dessus de la carte : recherche déjà
   visible dans l'en-tête, et ici des raccourcis par thématique
   pour les usagers qui ne savent pas précisément quoi chercher.
   ========================================================= */

function construireEcranAccueil(map) {
    const conteneur = document.getElementById("hero-tiles");
    conteneur.innerHTML = "";

    THEMES.forEach(theme => {
        const couleur = (GROUPS[theme.groups[0]] || {}).color || PALETTE.ardoise;
        const carte = document.createElement("button");
        carte.type = "button";
        carte.className = "hero-tile";
        carte.innerHTML = `
            <span class="hero-tile-icon" style="background:${couleur}"><i class="${theme.icon}"></i></span>
            <span class="hero-tile-label">${theme.label}</span>
        `;

        carte.addEventListener("click", () => {
            theme.groups.forEach(groupId => {
                LAYERS.filter(l => l.group === groupId && !l.lazy).forEach(conf => {
                    const checkbox = document.getElementById("layer-" + conf.id);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event("change"));
                    }
                });
            });
            fermerAccueil();
        });

        conteneur.appendChild(carte);
    });

    document.getElementById("hero-explore").addEventListener("click", fermerAccueil);
}

function fermerAccueil() {
    const hero = document.getElementById("hero");
    hero.classList.add("hero-hidden");
    setTimeout(() => { hero.style.display = "none"; }, 350);
}

/* Rouvre l'écran d'accueil (bouton "Accueil" de l'en-tête) */
function ouvrirAccueil() {
    const hero = document.getElementById("hero");
    hero.style.display = "";
    requestAnimationFrame(() => hero.classList.remove("hero-hidden"));
}
