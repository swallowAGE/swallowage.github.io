/* =========================================================
   APPLICATION DU TERRITOIRE À LA PAGE
   Commun à tous les territoires (contrairement à js/territoire.js, qui est
   remplacé par le fichier de chaque territoire). Chargé juste après lui.
   ========================================================= */

/* Applique le nom du territoire aux textes visibles de la page. Le HTML
   contient déjà ceux du territoire publié (la page reste correcte sans
   JavaScript) : cette fonction n'est qu'un filet pour la page de
   développement. */
document.addEventListener("DOMContentLoaded", () => {
    document.title = `${TERRITOIRE.nom} — Le SIG local du territoire ${TERRITOIRE.nomComplet}`;
    const titre = document.getElementById("brand-title");
    if (titre) titre.textContent = TERRITOIRE.nom;
    const apropos = document.querySelector("#about-modal h2");
    if (apropos) apropos.textContent = TERRITOIRE.nom;
    document.querySelectorAll(".brand-logo").forEach(img => { img.alt = `Logo ${TERRITOIRE.nom}`; });
    const intro = document.querySelector("#about-modal .about-info p");
    if (intro && !intro.textContent.includes(TERRITOIRE.nomComplet)) intro.textContent = intro.textContent.replace(/Loir-Lucé-Bercé/, TERRITOIRE.nomComplet);

    /* Pas d'actualités pour ce territoire : pas de bouton. */
    if (!TERRITOIRE.actualites) {
        document.querySelectorAll("#actu-button, #bottom-nav [data-cible=actu-button]").forEach(el => { el.hidden = true; });
    }
});
