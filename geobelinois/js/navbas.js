/* =========================================================
   GÉOBERCÉ — BARRE DU BAS (mobile)
   Sur téléphone, les boutons de la barre du haut sont masqués (voir
   style.css) et remplacés par cette barre en bas de l'écran, à portée
   du pouce. Elle ne duplique aucune logique : chaque bouton déclenche
   le clic du bouton d'origine (data-cible), dont les écouteurs restent
   dans map.js / installation.js.
   ========================================================= */
(function () {
    const nav = document.getElementById("bottom-nav");
    const feuille = document.getElementById("plus-sheet");
    const boutonPlus = document.getElementById("bn-plus");
    if (!nav || !feuille || !boutonPlus) return;

    function fermerFeuille() {
        feuille.hidden = true;
        boutonPlus.setAttribute("aria-expanded", "false");
    }

    nav.querySelectorAll("button[data-cible]").forEach(bouton => {
        bouton.addEventListener("click", () => {
            fermerFeuille();
            const origine = document.getElementById(bouton.dataset.cible);
            if (origine) origine.click();
        });
    });

    feuille.querySelectorAll("button[data-cible]").forEach(bouton => {
        bouton.addEventListener("click", () => {
            fermerFeuille();
            const origine = document.getElementById(bouton.dataset.cible);
            if (origine) origine.click();
        });
    });

    boutonPlus.addEventListener("click", event => {
        event.stopPropagation();
        const ouvrir = feuille.hidden;
        /* "Installer" n'existe que si le navigateur propose l'installation
           (voir installation.js) : on lit l'état du bouton d'origine à
           l'ouverture plutôt que de le dupliquer. */
        document.getElementById("plus-install").hidden = document.getElementById("install-button").hidden;
        feuille.hidden = !ouvrir;
        boutonPlus.setAttribute("aria-expanded", String(ouvrir));
    });

    document.addEventListener("click", event => {
        if (!feuille.hidden && !feuille.contains(event.target)) fermerFeuille();
    });
})();
