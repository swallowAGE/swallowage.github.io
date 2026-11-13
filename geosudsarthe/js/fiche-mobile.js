/* =========================================================
   GÉOBERCÉ — FICHES EN PANNEAU BAS (mobile)
   Retour direct de l'utilisatrice : sur téléphone, les popups Leaflet
   cachent le point cliqué, débordent et obligent à faire défiler une
   petite bulle. Sur petit écran (même seuil que la barre du bas,
   780px), le contenu de la popup est donc affiché dans un panneau qui
   monte du bas de la carte, à mi-hauteur, que l'on tire vers le haut
   pour tout lire ou vers le bas pour fermer.

   Aucune fiche n'est refaite : la popup Leaflet s'ouvre normalement
   (bindPopup, openPopup, autoClose, fermeture au clic sur la carte -
   voir map.js - tout reste inchangé), elle est seulement masquée et son
   nœud de contenu (.leaflet-popup-content) est déplacé dans le panneau
   le temps de l'ouverture, puis remis à sa place à la fermeture. Un
   setContent ultérieur (fiche parcelle chargée en différé, voir
   ouvrirPopupParcelle) écrit dans ce même nœud et apparaît donc
   directement dans le panneau. Sur ordinateur, rien ne change.
   ========================================================= */
(function () {
    const requeteMobile = window.matchMedia("(max-width: 780px)");
    const estMobile = () => requeteMobile.matches;

    /* Popup masquée sur mobile : pas de déplacement automatique de la
       carte pour la faire tenir à l'écran (autoPan), c'est le panneau
       qui recentre la carte sur le point (voir recentrer). */
    const ajusterOrigine = L.Popup.prototype._adjustPan;
    L.Popup.prototype._adjustPan = function () {
        if (estMobile()) return;
        return ajusterOrigine.apply(this, arguments);
    };

    const conteneurCarte = map.getContainer();
    const panneau = document.createElement("div");
    panneau.id = "fiche-mobile";
    panneau.setAttribute("role", "dialog");
    panneau.setAttribute("aria-label", "Fiche");
    panneau.hidden = true;
    panneau.innerHTML = `
        <div class="fiche-mobile-poignee" aria-hidden="true"><span></span></div>
        <button type="button" class="fiche-mobile-fermer" aria-label="Fermer la fiche"><i class="fa-solid fa-xmark"></i></button>
        <div class="fiche-mobile-corps"></div>`;
    /* Dans le conteneur de la carte pour garder les styles des popups
       (.leaflet-container a, etc.) - mais un tap ou un glissement dans le
       panneau ne doit ni déplacer la carte ni déclencher son clic (qui
       refermerait la fiche, voir map.js). */
    conteneurCarte.appendChild(panneau);
    L.DomEvent.disableClickPropagation(panneau);
    L.DomEvent.disableScrollPropagation(panneau);

    const corps = panneau.querySelector(".fiche-mobile-corps");
    const poignee = panneau.querySelector(".fiche-mobile-poignee");

    let popupAffichee = null;
    let etat = "mi"; // "mi" (moitié de la carte) ou "plein"

    function hauteurPour(etatVoulu) {
        const h = conteneurCarte.clientHeight;
        return etatVoulu === "plein" ? h - 12 : Math.round(h * 0.5);
    }

    function appliquerHauteur(hauteur) {
        panneau.style.height = `${hauteur}px`;
    }

    /* Le point cliqué doit rester visible au-dessus du panneau : la carte
       ne bouge que s'il est caché derrière (ou trop près des bords), et le
       place alors au milieu de la partie visible. */
    function recentrer(popup) {
        const latlng = popup.getLatLng();
        if (!latlng) return;
        const point = map.latLngToContainerPoint(latlng);
        const largeur = conteneurCarte.clientWidth;
        const visible = conteneurCarte.clientHeight - hauteurPour("mi");
        const marge = 30;
        if (point.y > marge && point.y < visible - marge && point.x > marge && point.x < largeur - marge) return;
        map.panBy([point.x - largeur / 2, point.y - visible / 2]);
    }

    function afficher(popup) {
        const noeud = popup._contentNode;
        if (!noeud) return;
        if (popupAffichee && popupAffichee !== popup) remettre(popupAffichee);
        popupAffichee = popup;
        corps.replaceChildren(noeud);
        corps.scrollTop = 0;
        etat = "mi";
        panneau.classList.remove("fiche-mobile-glisse");
        appliquerHauteur(hauteurPour(etat));
        panneau.hidden = false;
        conteneurCarte.classList.add("fiche-mobile-ouverte");
        recentrer(popup);
    }

    /* Remet le nœud de contenu dans la popup Leaflet, pour qu'elle
       puisse être rouverte (sur mobile comme sur ordinateur). */
    function remettre(popup) {
        const noeud = popup._contentNode;
        if (noeud && popup._wrapper && noeud.parentNode !== popup._wrapper) {
            popup._wrapper.appendChild(noeud);
        }
    }

    function masquer() {
        if (popupAffichee) remettre(popupAffichee);
        popupAffichee = null;
        panneau.hidden = true;
        conteneurCarte.classList.remove("fiche-mobile-ouverte");
    }

    map.on("popupopen", event => {
        if (estMobile()) afficher(event.popup);
    });
    /* Ouvrir un autre point referme d'abord l'ancienne popup (autoClose)
       puis ouvre la nouvelle : seule la fermeture de la popup affichée
       compte, la nouvelle a déjà pris sa place sinon. */
    map.on("popupclose", event => {
        if (event.popup === popupAffichee) masquer();
    });

    panneau.querySelector(".fiche-mobile-fermer").addEventListener("click", () => map.closePopup());

    /* Passage en grand écran (rotation de tablette, fenêtre agrandie) :
       la fiche est refermée plutôt que laissée dans un panneau masqué. */
    requeteMobile.addEventListener("change", () => {
        if (popupAffichee) map.closePopup(popupAffichee);
    });
    window.addEventListener("resize", () => {
        if (popupAffichee) appliquerHauteur(hauteurPour(etat));
    });

    /* Glisser la poignée : vers le haut pour la fiche en grand, vers le
       bas pour revenir à mi-hauteur puis fermer. Un simple tap sur la
       poignée bascule entre les deux hauteurs. */
    let departY = null;
    let hauteurDepart = 0;
    let deplacement = 0;

    poignee.addEventListener("touchstart", event => {
        departY = event.touches[0].clientY;
        hauteurDepart = panneau.getBoundingClientRect().height;
        deplacement = 0;
        panneau.classList.add("fiche-mobile-glisse");
    }, { passive: true });

    poignee.addEventListener("touchmove", event => {
        if (departY === null) return;
        deplacement = event.touches[0].clientY - departY;
        const hauteur = Math.max(60, Math.min(hauteurPour("plein"), hauteurDepart - deplacement));
        appliquerHauteur(hauteur);
        event.preventDefault();
    }, { passive: false });

    function finGlisse() {
        if (departY === null) return;
        departY = null;
        panneau.classList.remove("fiche-mobile-glisse");
        if (Math.abs(deplacement) < 8) {
            etat = etat === "mi" ? "plein" : "mi";
        } else if (deplacement < 0) {
            etat = "plein";
        } else if (etat === "plein" && hauteurDepart - deplacement > hauteurPour("mi") * 0.6) {
            etat = "mi";
        } else {
            map.closePopup();
            return;
        }
        appliquerHauteur(hauteurPour(etat));
    }
    poignee.addEventListener("touchend", finGlisse);
    poignee.addEventListener("touchcancel", finGlisse);

    /* Souris (petite fenêtre sur ordinateur) : un clic sur la poignée
       bascule simplement entre les deux hauteurs. */
    poignee.addEventListener("click", event => {
        if (event.pointerType === "touch" || event.sourceCapabilities?.firesTouchEvents) return;
        etat = etat === "mi" ? "plein" : "mi";
        appliquerHauteur(hauteurPour(etat));
    });
})();
