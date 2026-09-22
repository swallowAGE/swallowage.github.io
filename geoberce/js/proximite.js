/* =========================================================
   GÉOBERCÉ — RACCOURCIS "PRÈS DE CHEZ MOI"
   Géolocalise l'utilisateur, charge la ou les couches visées
   (RACCOURCIS dans config.js), puis affiche dans le panneau
   les résultats les plus proches, triés par distance. Réutilise
   l'index de recherche déjà alimenté par layers.js.
   ========================================================= */

function formaterDistance(metres) {
    if (metres < 1000) return Math.round(metres) + " m";
    return (metres / 1000).toFixed(1).replace(".", ",") + " km";
}

function couleurRaccourci(raccourci) {
    const conf = LAYERS.find(l => l.id === raccourci.layerIds[0]);
    return (conf && conf.color) || PALETTE.ardoise;
}

function construireRaccourcis(map) {
    const conteneur = document.getElementById("hero-raccourcis");
    conteneur.innerHTML = "";

    RACCOURCIS.forEach(raccourci => {
        const couleur = couleurRaccourci(raccourci);
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.className = "hero-tile";
        bouton.innerHTML = `
            <span class="hero-tile-icon" style="background:${couleur}"><i class="${raccourci.icon}"></i></span>
            <span class="hero-tile-label">${raccourci.label}</span>
        `;
        bouton.addEventListener("click", () => lancerRechercheProximite(map, raccourci));
        conteneur.appendChild(bouton);
    });
}

/* Affiche la vue "résultats" du panneau de couches (masque l'arbre normal) */
function ouvrirVueResultats(titre) {
    basculerVuePanneau("results-view");
    togglerPanneauCouches(true);
    document.getElementById("results-title").textContent = titre;
}

function fermerResultatsProximite() {
    fermerVuesPanneau();
}

function afficherMessageResultats(titre, message) {
    ouvrirVueResultats(titre);
    document.getElementById("results-filtre").hidden = true;
    document.getElementById("results-list").innerHTML =
        `<div class="suggestion-vide">${message}</div>`;
}

/* Horaires d'un résultat "près de chez moi", selon la convention de sa
   couche d'origine - mairies et France Services ont leur propre format
   texte (voir parserHorairesMairie/parserHorairesFranceServices dans
   popup.js), toutes les autres couches suivent la syntaxe OSM standard
   (parserHorairesOsm). Une couche sans horaires du tout (boîtes aux
   lettres, défibrillateurs, écoles...) renvoie naturellement null ici -
   ce n'est pas une erreur, juste une donnée absente. */
function horairesPourItem(item) {
    const props = (item.layer.feature && item.layer.feature.properties) || {};
    if (item.layerId === "mairies") return parserHorairesMairie(props.opening_hours);
    if (item.layerId === "franceServices") {
        return /itin|mobile/i.test(props.format_fs || "") ? null : parserHorairesFranceServices(props);
    }
    return parserHorairesOsm(props.opening_hours);
}

/* true/false si on peut se prononcer, null si la couche ne porte
   simplement pas d'horaires - voir horairesPourItem. */
function estOuvertItem(item) {
    return estOuvertMaintenant(horairesPourItem(item));
}

let derniersResultatsProximite = [];
let dernierTitreProximite = "";
let filtreOuvertActif = false;
let filtreCarburantActif = LISTE_CARBURANTS[0].champ; // Gazole par défaut, le plus répandu
/* Retour direct de l'utilisatrice : pouvoir trier les stations par prix,
   pas seulement par distance - "distance" reste le tri par défaut
   (comme pour toutes les autres recherches "près de chez moi"), "prix"
   un choix explicite propre aux carburants (seule couche à porter un
   prix comparable d'un résultat à l'autre). */
let triCarburantActif = "distance";

function rendreResultatsProximite(map) {
    const estCarburant = derniersResultatsProximite.length > 0 && derniersResultatsProximite[0].layerId === "carburants";

    let resultats = derniersResultatsProximite;
    if (filtreOuvertActif) resultats = resultats.filter(item => item.ouvert === true);
    if (estCarburant) {
        resultats = resultats
            .map(item => {
                const props = (item.layer.feature && item.layer.feature.properties) || {};
                /* Comparaison sur `champ` (nom brut, "gplc_prix"), pas `nom` :
                   construirePrixCarburants renvoie des libellés déjà
                   transformés pour l'affichage ("GPL", "SP95-E10"...),
                   différents des noms bruts de LISTE_CARBURANTS. */
                const entree = construirePrixCarburants(props).find(c => c.champ === filtreCarburantActif);
                /* Seulement "Disponible" : un carburant en rupture garde un
                   prix dans la donnée source (dernier prix connu avant la
                   rupture), pas la peine d'orienter quelqu'un vers une
                   station où il ne pourra pas faire le plein. */
                return { ...item, carburantChoisi: (entree && entree.statut === "Disponible") ? entree : null };
            })
            .filter(item => item.carburantChoisi)
            .sort((a, b) => triCarburantActif === "prix"
                ? a.carburantChoisi.prix - b.carburantChoisi.prix
                : a.distance - b.distance)
            .slice(0, 15);
    }

    document.getElementById("results-title").textContent =
        dernierTitreProximite + (resultats.length ? ` · ${resultats.length} résultat(s)` : "");

    const liste = document.getElementById("results-list");
    liste.innerHTML = "";

    if (!resultats.length) {
        const message = estCarburant
            ? `Aucune station avec du ${nomCarburant(LISTE_CARBURANTS.find(c => c.champ === filtreCarburantActif).nom)} disponible à proximité.`
            : (filtreOuvertActif ? "Aucun résultat ouvert actuellement à proximité." : "Aucun résultat trouvé à proximité.");
        liste.innerHTML = `<div class="suggestion-vide">${message}</div>`;
        return;
    }

    resultats.forEach(item => {
        const sousTitre = item.carburantChoisi
            ? `<span class="result-item-prix">${formaterPrix(item.carburantChoisi.prix)}/L</span>${item.sousTitre ? ` · ${item.sousTitre}` : ""}`
            : item.sousTitre;
        const ligne = document.createElement("button");
        ligne.type = "button";
        ligne.className = "result-item";
        ligne.innerHTML = `
            <span class="result-item-icon" style="background:${item.color}"><i class="${item.icon}"></i></span>
            <span class="result-item-texte">
                <span class="result-item-titre">${item.titre}</span>
                ${sousTitre ? `<span class="result-item-sous">${sousTitre}</span>` : ""}
            </span>
            <span class="result-item-distance">${formaterDistance(item.distance)}</span>
        `;
        /* Rouvre la vraie popup (stylée) du marqueur plutôt que d'en
           construire une nouvelle, pauvre, à la volée : voir
           ouvrirPopupIndex (layers.js), qui gère aussi le cas d'un
           marqueur replié dans un cluster. */
        ligne.addEventListener("click", () => ouvrirPopupIndex(map, item));
        liste.appendChild(ligne);
    });
}

let ecouteursFiltreProximiteBranches = false;
let ecouteursTriCarburantBranches = false;

/* Le filtre "Ouvert maintenant" n'a de sens que si au moins un résultat
   porte une info d'horaires exploitable - sans ça (ex. "Où déposer mon
   courrier ?", boîtes aux lettres jamais fermées) le bouton resterait
   affiché pour ne jamais rien changer, plus déroutant qu'utile. Le
   filtre "type de carburant" n'apparaît, lui, que pour le raccourci
   "Stations essence" (seule couche qui porte des prix de carburant) :
   les deux filtres sont mutuellement exclusifs, jamais affichés en
   même temps. */
function afficherResultatsProximite(map, titre, resultats) {
    dernierTitreProximite = titre;
    derniersResultatsProximite = resultats.map(item => ({ ...item, ouvert: estOuvertItem(item) }));
    filtreOuvertActif = false;
    triCarburantActif = "distance";

    ouvrirVueResultats(titre);

    const estCarburant = resultats.length > 0 && resultats[0].layerId === "carburants";

    const filtreConteneur = document.getElementById("results-filtre");
    const aDesHoraires = !estCarburant && derniersResultatsProximite.some(item => item.ouvert !== null);
    filtreConteneur.hidden = !aDesHoraires;
    filtreConteneur.querySelectorAll(".results-filtre-btn").forEach(bouton => {
        bouton.classList.toggle("actif", bouton.dataset.filtre === "tous");
    });

    if (!ecouteursFiltreProximiteBranches) {
        ecouteursFiltreProximiteBranches = true;
        filtreConteneur.querySelectorAll(".results-filtre-btn").forEach(bouton => {
            bouton.addEventListener("click", () => {
                filtreOuvertActif = bouton.dataset.filtre === "ouverts";
                filtreConteneur.querySelectorAll(".results-filtre-btn").forEach(b => b.classList.toggle("actif", b === bouton));
                rendreResultatsProximite(map);
            });
        });
    }

    const filtreCarburantConteneur = document.getElementById("results-filtre-carburant");
    filtreCarburantConteneur.hidden = !estCarburant;
    if (estCarburant) {
        filtreCarburantConteneur.innerHTML = LISTE_CARBURANTS.map(c => `
            <button type="button" class="results-filtre-btn${c.champ === filtreCarburantActif ? " actif" : ""}" data-carburant="${c.champ}">${echapperHtml(nomCarburant(c.nom))}</button>
        `).join("");
        filtreCarburantConteneur.querySelectorAll(".results-filtre-btn").forEach(bouton => {
            bouton.addEventListener("click", () => {
                filtreCarburantActif = bouton.dataset.carburant;
                filtreCarburantConteneur.querySelectorAll(".results-filtre-btn").forEach(b => b.classList.toggle("actif", b === bouton));
                rendreResultatsProximite(map);
            });
        });
    }

    const triCarburantConteneur = document.getElementById("results-tri-carburant");
    triCarburantConteneur.hidden = !estCarburant;
    triCarburantConteneur.querySelectorAll(".results-filtre-btn").forEach(bouton => {
        bouton.classList.toggle("actif", bouton.dataset.tri === "distance");
    });
    if (!ecouteursTriCarburantBranches) {
        ecouteursTriCarburantBranches = true;
        triCarburantConteneur.querySelectorAll(".results-filtre-btn").forEach(bouton => {
            bouton.addEventListener("click", () => {
                triCarburantActif = bouton.dataset.tri;
                triCarburantConteneur.querySelectorAll(".results-filtre-btn").forEach(b => b.classList.toggle("actif", b === bouton));
                rendreResultatsProximite(map);
            });
        });
    }

    rendreResultatsProximite(map);
}

/* Charge une couche (si besoin) et coche sa case dans le panneau,
   pour que l'état du panneau reste cohérent avec ce qui est affiché.
   Un échec de chargement (couche en flux distant injoignable) résout
   immédiatement au lieu de laisser l'utilisateur attendre. Le timeout
   n'est qu'un filet de sécurité en dernier recours (il doit rester
   généreux : sur un réseau mobile lent, une requête peut légitimement
   prendre plusieurs secondes avant d'aboutir). */
function chargerEtAfficherCouche(map, layerId) {
    return new Promise(resolve => {
        const conf = LAYERS.find(l => l.id === layerId);
        if (!conf) { resolve(); return; }

        let reglee = false;
        const resoudre = () => { if (!reglee) { reglee = true; resolve(); } };

        chargerCouche(conf, () => {
            if (!map.hasLayer(groupesLeaflet[layerId])) {
                groupesLeaflet[layerId].addTo(map);
            }
            const checkbox = document.getElementById("layer-" + layerId);
            if (checkbox) checkbox.checked = true;
            resoudre();
        }, resoudre);

        setTimeout(resoudre, 20000);
    });
}

function lancerRechercheProximite(map, raccourci) {
    fermerAccueil();
    afficherMessageResultats(raccourci.label, "Localisation en cours...");

    if (!navigator.geolocation) {
        afficherMessageResultats(raccourci.label, "La géolocalisation n'est pas disponible sur cet appareil.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const origine = L.latLng(position.coords.latitude, position.coords.longitude);
            afficherMessageResultats(raccourci.label, "Recherche des résultats les plus proches...");

            Promise.all(raccourci.layerIds.map(id => chargerEtAfficherCouche(map, id))).then(() => {
                /* `filtre` (optionnel) : restreint une couche à une seule
                   sous-catégorie plutôt qu'à la couche entière - ex. "la
                   boulangerie la plus proche" ne doit chercher que parmi
                   les commerces de type "bakery", pas tous les commerces.
                   item.layer.feature : Leaflet attache automatiquement le
                   Feature GeoJSON d'origine à chaque layer d'un L.geoJSON,
                   donc ses propriétés brutes restent accessibles ici sans
                   rien stocker de plus dans l'index de recherche. */
                /* Stations essence : bassin de candidats plus large (60 au
                   lieu de 15) avant de géolocaliser - une fois le filtre
                   par carburant appliqué (rendreResultatsProximite), un
                   carburant moins courant (GPLc, E85) peut exclure la
                   plupart des stations les plus proches ; garder plus de
                   candidats en réserve évite de se retrouver avec trop peu
                   de résultats après filtrage sur ces carburants-là. */
                const limite = raccourci.layerIds.includes("carburants") ? 60 : 15;
                /* Un commerce repéré comme définitivement fermé
                   (COMMERCES_FERMES, js/config.js) reste sur la carte et
                   dans la recherche texte (voir iconeCommerce/
                   construirePopupCommerce) mais n'a rien à faire dans une
                   recommandation "le plus proche" - proposer une adresse
                   fermée irait à l'encontre du but de cette fonction. */
                const resultats = window.indexRecherche
                    .filter(item => raccourci.layerIds.includes(item.layerId))
                    .filter(item => !raccourci.filtre || raccourci.filtre(item))
                    .filter(item => {
                        const props = item.layer && item.layer.feature && item.layer.feature.properties;
                        return !(props && COMMERCES_FERMES[props.osm_id]);
                    })
                    .map(item => ({ ...item, distance: origine.distanceTo(item.latlng) }))
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, limite);

                map.setView(origine, 13);
                afficherResultatsProximite(map, raccourci.label, resultats);
            });
        },
        erreur => {
            const message = erreur.code === erreur.PERMISSION_DENIED
                ? "Localisation refusée : autorisez la géolocalisation dans les réglages de votre navigateur puis réessayez."
                : "Localisation indisponible pour le moment : réessayez dans un instant.";
            afficherMessageResultats(raccourci.label, message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
}
