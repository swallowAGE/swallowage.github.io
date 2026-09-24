/* =========================================================
   GÉOBERCÉ — CARTE PRINCIPALE
   ========================================================= */

/* ---------- 1. Carte + fond de carte ---------- */
/* closePopupOnClick: false - retour direct de l'utilisatrice, une popup
   se refermait "aussitôt" à l'ouverture sur mobile. Comportement par
   défaut de Leaflet (closePopupOnClick, true par défaut) : un clic
   n'importe où ailleurs sur la carte referme la popup ouverte - sur
   certains navigateurs mobiles, un simple tap sur un marqueur peut
   déclencher à la fois le clic du marqueur (ouvre la popup) ET,
   quasi simultanément, un clic synthétique sur la carte en dessous
   (Leaflet le referme aussitôt), sans qu'aucun code de ce site n'y
   soit pour quelque chose - déjà pressenti dans une correction
   précédente ("un gestionnaire de clic global qui fermerait la popup
   par erreur", voir README, "Popups qui se fermaient près des bords de
   carte") sans avoir pu être confirmé faute d'un vrai navigateur mobile
   pendant le développement. Contrepartie acceptée : un tap en dehors
   d'une popup ne la referme plus tout seul, il faut son propre bouton
   × ou ouvrir un autre marqueur (qui referme l'ancienne popup via
   autoClose, resté activé, un mécanisme différent de celui-ci) - léger
   changement d'habitude, largement préférable à des popups qui se
   ferment sans prévenir. */
const map = L.map("map", { zoomControl: false, closePopupOnClick: false }).setView([47.791528, 0.412223], 12);

L.control.zoom({ position: "topright" }).addTo(map);

L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_33ph_1_a60cba5d2b6752f8d0e80255", {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 20
}).addTo(map);

L.control.locate({ position: "topright", flyTo: true, keepCurrentZoomLevel: false }).addTo(map);

/* ---------- 2. Couches de référence (limites communes / EPCI) ---------- */
fetch("couches/epci.geojson")
    .then(r => r.json())
    .then(data => {
        L.geoJSON(data, { style: { color: PALETTE.riviere, weight: 2, fill: false, dashArray: "4 3" } }).addTo(map);
    })
    .catch(err => console.error("epci.geojson :", err));

/* couchesCommunesParInsee : une entrée par commune (code_insee -> layer
   Leaflet), remplie une fois le fetch résolu - sert à zoomer sur la bonne
   commune depuis le dashboard (js/communes.js), sélecteur d'accueil ou
   clic sur la carte, sans reparser le fichier à chaque fois. */
const couchesCommunesParInsee = {};

fetch("couches/communes.geojson")
    .then(r => r.json())
    .then(data => {
        L.geoJSON(data, {
            /* fillOpacity quasi nulle plutôt que fill:false : un contour
               sans remplissage ne capte les clics que tout près du trait
               chez Leaflet, pas au milieu de la commune - au clic, comme
               partout ailleurs sur le site, un marqueur/élément par-dessus
               (mairie, commerce...) qui a déjà son propre gestionnaire de
               clic (bindPopup) intercepte l'événement avant qu'il
               n'atteigne ce contour, donc pas de conflit à gérer nous-
               mêmes : ce clic ne se déclenche que sur une zone vide. */
            style: { color: PALETTE.ardoise, weight: 1, fillOpacity: 0.02, fillColor: "#ffffff", opacity: 0.5 },
            onEachFeature: (feature, layer) => {
                const code = feature.properties && feature.properties.code_insee;
                if (!code || !COMMUNES_TERRITOIRE[code]) return;
                couchesCommunesParInsee[code] = layer;
                layer.on("click", () => ouvrirDashboardCommune(map, code));
                layer.on("mouseover", () => layer.setStyle({ weight: 2 }));
                layer.on("mouseout", () => layer.setStyle({ weight: 1 }));
            }
        }).addTo(map);
    })
    .catch(err => console.error("communes.geojson :", err));

function zoomerSurCommune(map, codeInsee) {
    const layer = couchesCommunesParInsee[codeInsee];
    if (layer) map.fitBounds(layer.getBounds(), { maxZoom: 14 });
}


/* ---------- 3. Couches de données, panneau, recherche, accueil ---------- */
initialiserCouches(map);
surveillerAffichageCouches(map);
construirePanneauCouches(map);
initFiltrePanneau();
construireEcranAccueil(map);
construireRaccourcis(map);
construireSelecteurCommunes(map);
initHeroParcelle(map);
demarrerVisiteSiPremiereFois();

/* Lien direct vers une couche activée depuis l'URL (ex.
   ?couche=vigieau), pour partager un lien qui ouvre directement une
   couche précise (communication sur un arrêté sécheresse, une alerte
   OLD...) sans que la personne ait à la chercher elle-même dans le
   panneau. Générique sur n'importe quel id de LAYERS, pas câblé en dur
   sur vigieau. */
function activerCoucheDepuisUrl() {
    const params = new URLSearchParams(window.location.search);
    const idCouche = params.get("couche");
    if (!idCouche) return;
    const conf = LAYERS.find(l => l.id === idCouche);
    if (!conf) return;

    fermerAccueil();

    const checkbox = document.getElementById("layer-" + idCouche);
    if (!checkbox) return;

    const groupe = checkbox.closest(".layer-group");
    if (groupe) groupe.open = true;

    if (!checkbox.checked) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change"));
    }
}
activerCoucheDepuisUrl();

initRecherche(map, {
    onResultat: () => {
        const hero = document.getElementById("hero");
        if (hero && !hero.classList.contains("hero-hidden")) fermerAccueil();
    }
});


/* ---------- 4. Interactions d'interface ---------- */
/* Deux classes pour un seul état, chacune lue par un mécanisme d'affichage
   différent selon la largeur d'écran : "layers-panel-open" pilote le
   glissement hors-champ sur mobile (transform, voir la media query dans
   style.css), "layers-panel-hidden" pilote la disparition/réapparition
   sur PC (display:none, où le panneau prenait toute la place en
   permanence avant - retour direct de l'utilisatrice). Basculées
   ensemble, toujours en opposition l'une de l'autre, plutôt que de
   deviner la largeur d'écran actuelle en JS : chaque règle CSS ignore
   simplement la classe qui ne la concerne pas. */
function panneauEstOuvert() {
    /* "Ouvert" n'a pas le même signal selon la largeur d'écran : sur mobile,
       le panneau est fermé par défaut (absence de "layers-panel-open", hors
       champ via transform) ; sur PC, il est ouvert par défaut (absence de
       "layers-panel-hidden", display normal). Comme aucune des deux classes
       n'est posée au chargement de la page, se fier uniquement à
       "layers-panel-open" fait rater le tout premier clic sur PC (le
       panneau semblait déjà "ouvert" faute de classe, donc rien ne se
       repliait) - d'où la vérification adaptée à la largeur d'écran ici. */
    const panel = document.getElementById("layers-panel");
    if (window.matchMedia("(max-width: 780px)").matches) {
        return panel.classList.contains("layers-panel-open");
    }
    return !panel.classList.contains("layers-panel-hidden");
}

function togglerPanneauCouches(forcerOuvert) {
    const panel = document.getElementById("layers-panel");
    const seraOuvert = forcerOuvert !== undefined ? forcerOuvert : !panneauEstOuvert();
    panel.classList.toggle("layers-panel-open", seraOuvert);
    panel.classList.toggle("layers-panel-hidden", !seraOuvert);
    /* Sur PC, la carte reprend immédiatement l'espace libéré (#map est
       flex:1 juste à côté) : Leaflet ne redétecte pas seul un
       changement de taille de son conteneur, invalidateSize() le force
       à recalculer/redessiner les tuiles sur la nouvelle largeur. Sans
       effet notable sur mobile (le panneau y est en position absolute,
       la carte ne change pas réellement de taille), mais un appel de
       plus ne coûte rien. */
    map.invalidateSize();
}

/* Redimensionnement du panneau des couches (retour direct de
   l'utilisatrice) : glisser la poignée sur le bord droit (#layers-resize-
   handle, position:absolute, voir style.css) plutôt qu'une largeur figée
   à 340px - utile depuis que le panneau affiche des listes plus riches
   (légendes, décomptes par commune...). Largeur mémorisée dans
   localStorage pour rester d'une visite à l'autre. Desktop seulement :
   la poignée est masquée en dessous de 780px (voir style.css), le
   panneau y est un panneau plein écran qui glisse, pas une colonne
   redimensionnable. */
function initRedimensionnementPanneau() {
    const panel = document.getElementById("layers-panel");
    const poignee = document.getElementById("layers-resize-handle");
    if (!panel || !poignee) return;

    const LARGEUR_MIN = 280, LARGEUR_MAX = 640;
    try {
        const sauvegardee = Number(localStorage.getItem("geoberce_largeur_panneau"));
        if (sauvegardee) panel.style.width = Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, sauvegardee)) + "px";
    } catch (_) { /* navigation privée : tant pis, largeur par défaut (340px) */ }

    let enCours = false;
    poignee.addEventListener("mousedown", event => {
        enCours = true;
        poignee.classList.add("en-cours");
        document.body.style.userSelect = "none";
        event.preventDefault();
    });
    window.addEventListener("mousemove", event => {
        if (!enCours) return;
        const largeur = Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, event.clientX - panel.getBoundingClientRect().left));
        panel.style.width = largeur + "px";
        map.invalidateSize();
    });
    window.addEventListener("mouseup", () => {
        if (!enCours) return;
        enCours = false;
        poignee.classList.remove("en-cours");
        document.body.style.userSelect = "";
        try { localStorage.setItem("geoberce_largeur_panneau", parseInt(panel.style.width, 10)); } catch (_) { /* tant pis, pas bloquant */ }
    });
}
initRedimensionnementPanneau();

/* Retour direct de l'utilisatrice : "Couches" et "Recherche foncière"
   se disputaient le même panneau sans jamais se le disputer PROPREMENT -
   togglerPanneauCouches() ne faisait que replier/déplier le panneau sans
   jamais se soucier de la vue interne actuellement affichée
   (VUES_PANNEAU, js/panel.js). Résultat concret : recherche foncière
   ouverte, puis clic sur "Couches" → le panneau se refermait au lieu de
   basculer sur la liste des couches (panneauEstOuvert() le trouvait déjà
   ouvert, donc togglerPanneauCouches() le repliait plutôt que de
   changer de vue). Désormais : bascule sur SA propre vue si une autre
   vue est affichée (ferme l'autre, ouvre la sienne) ; simple
   replier/déplier seulement si c'est déjà sa propre vue qui est
   affichée - jamais les deux en même temps, jamais un simple clic qui
   referme tout par accident. */
document.getElementById("menu-button").addEventListener("click", () => {
    const surCouches = panneauEstOuvert() && !document.getElementById("layers-normal-view").hidden;
    if (surCouches) {
        togglerPanneauCouches(false);
        return;
    }
    if (!document.getElementById("recherche-view").hidden) viderSelectionCarte(map);
    fermerVuesPanneau();
    togglerPanneauCouches(true);
});
document.getElementById("layers-close").addEventListener("click", () => {
    /* Fermer le panneau entier (×) pendant que la recherche foncière est
       affichée revient à quitter cette vue : même vidage automatique de
       la sélection que le bouton retour (fermerRechercheFonciere). */
    if (!document.getElementById("recherche-view").hidden) viderSelectionCarte(map);
    togglerPanneauCouches(false);
});

document.getElementById("actu-button").addEventListener("click", () => toggleActuDropdown());
document.getElementById("actu-dropdown-close").addEventListener("click", () => toggleActuDropdown(false));
document.addEventListener("click", event => {
    const wrap = document.querySelector(".actu-wrap");
    if (wrap && !wrap.contains(event.target) && !document.getElementById("actu-dropdown").hidden) {
        toggleActuDropdown(false);
    }
});

document.getElementById("commune-back").addEventListener("click", fermerVueCommune);

document.getElementById("about-button").addEventListener("click", () => {
    document.getElementById("about-modal").classList.add("modal-open");
});

document.getElementById("about-close").addEventListener("click", () => {
    document.getElementById("about-modal").classList.remove("modal-open");
});

document.getElementById("tour-relancer").addEventListener("click", () => {
    document.getElementById("about-modal").classList.remove("modal-open");
    demarrerVisiteGuidee();
});

/* Formulaire de contact (bugs/idées) : pas de backend sur un site 100%
   statique GitHub Pages, donc pas de serveur mail à nous - Web3Forms
   reçoit la requête et fait l'envoi réel à notre place (clé liée à
   swallowage@proton.me, pas de compte/mot de passe à gérer côté site).
   Remplace l'ancien lien mailto, qui ouvrait le client mail du visiteur
   au lieu d'envoyer directement - retour direct de l'utilisatrice. */
const EMAIL_CONTACT = "swallowage@proton.me";
const WEB3FORMS_ACCESS_KEY = "f8e3cf6f-6ad8-42dd-b403-1ad9728373f6";
document.getElementById("contact-envoyer").addEventListener("click", () => {
    const bouton = document.getElementById("contact-envoyer");
    const statut = document.getElementById("contact-statut");
    const type = document.getElementById("contact-type").value;
    const message = document.getElementById("contact-message").value.trim();

    if (!message) {
        statut.textContent = "Merci de décrire votre message avant l'envoi.";
        statut.className = "contact-statut contact-statut-erreur";
        return;
    }

    const sujet = type === "bug" ? "[GéoBercé] Signalement de bug" : "[GéoBercé] Proposition d'idée";
    bouton.disabled = true;
    statut.textContent = "Envoi en cours...";
    statut.className = "contact-statut";

    fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            subject: sujet,
            type: type === "bug" ? "Bug" : "Idée",
            message
        })
    })
        .then(r => r.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Échec de l'envoi");
            statut.textContent = "Message envoyé, merci !";
            statut.className = "contact-statut contact-statut-succes";
            document.getElementById("contact-message").value = "";
        })
        .catch(() => {
            statut.textContent = `L'envoi a échoué. Réessayez, ou écrivez-nous directement à ${EMAIL_CONTACT}.`;
            statut.className = "contact-statut contact-statut-erreur";
        })
        .finally(() => { bouton.disabled = false; });
});

document.getElementById("home-button").addEventListener("click", () => {
    fermerResultatsProximite();
    /* La page commune (#commune-page) est au-dessus de l'accueil en
       z-index (voir style.css) : sans la refermer ici, "Accueil"
       resterait invisible derrière elle plutôt que de ramener
       effectivement à l'écran d'accueil. */
    fermerVueCommune();
    ouvrirAccueil();
});

document.getElementById("results-back").addEventListener("click", fermerResultatsProximite);

/* Même logique de bascule symétrique que "menu-button" ci-dessus : si
   la recherche foncière est déjà la vue affichée, un nouveau clic la
   replie (comme le × / recherche-back) plutôt que de reconstruire le
   formulaire pour rien ; sinon elle prend la place de la vue couches
   actuellement affichée. */
document.getElementById("recherche-button").addEventListener("click", () => {
    const surRecherche = panneauEstOuvert() && !document.getElementById("recherche-view").hidden;
    if (surRecherche) {
        fermerRechercheFonciere(map);
        togglerPanneauCouches(false);
        return;
    }
    ouvrirRecherche(map);
});
document.getElementById("recherche-back").addEventListener("click", () => fermerRechercheFonciere(map));
