/* =========================================================
   GÉOBERCÉ — DASHBOARD PAR COMMUNE
   Page plein écran dédiée à une commune du territoire (#commune-page,
   index.html - retour direct de l'utilisatrice : trop à l'étroit dans
   la colonne du panneau des couches une fois enrichi) : mairie(s)
   (couches/services/mairies.geojson, déjà en local), chiffres clés
   (couche demographie déjà construite), décompte d'entités locales,
   qualité de l'eau potable (Hub'Eau) et actualités Illiwap de la
   commune (iframe chargée à la demande, jamais 24 d'avance).
   ========================================================= */

let mairiesEnCache = null;
function chargerMairies() {
    if (mairiesEnCache) return mairiesEnCache;
    mairiesEnCache = fetch("couches/services/mairies.geojson")
        .then(r => r.ok ? r.json() : { features: [] })
        .then(d => d.features)
        .catch(() => []);
    return mairiesEnCache;
}

let demographieEnCache = null;
function chargerDemographieCommunes() {
    if (demographieEnCache) return demographieEnCache;
    demographieEnCache = fetch("couches/urbanisme/demographie_communes.geojson")
        .then(r => r.ok ? r.json() : { features: [] })
        .then(d => d.features)
        .catch(() => []);
    return demographieEnCache;
}

/* =========================================================
   QUALITÉ DE L'EAU POTABLE (Hub'Eau)
   Retour direct de l'utilisatrice : compléter le dashboard commune
   avec une info du quotidien en plus des chiffres statiques. Hub'Eau
   ("Qualité de l'eau potable", api/v1/qualite_eau_potable/resultats_dis)
   est une API publique pensée pour la réutilisation externe (contrairement
   à Vigicrues, retiré plus haut pour blocage CORS) - schéma confirmé en
   conditions réelles par l'utilisatrice (résultat réel pour la commune
   72071/Montval-sur-Loir, collé depuis un onglet ouvert directement sur
   l'API).
   Une seule requête (size=1, sort=desc) suffit : chaque ligne porte déjà
   conclusion_conformite_prelevement, une phrase de synthèse pour TOUT le
   prélèvement (pas juste le paramètre de cette ligne - répétée sur
   chacune de ses lignes, vérifié dans l'exemple réel), donc la plus
   récente ligne toutes couches confondues donne directement le dernier
   verdict sans avoir à tout agréger côté client. */
/* URL_HUBEAU_EAU_POTABLE : déclarée dans js/config.js (avec la couche
   carte "qualiteEau", qui interroge la même API pour les 24 communes du
   territoire) - une seule constante partagée plutôt que deux URLs à
   maintenir en double. */
const qualiteEauEnCache = {}; // code_insee -> Promise
function chargerQualiteEauCommune(codeInsee) {
    if (qualiteEauEnCache[codeInsee]) return qualiteEauEnCache[codeInsee];
    const url = `${URL_HUBEAU_EAU_POTABLE}?code_commune=${codeInsee}&size=1&sort=desc`;
    qualiteEauEnCache[codeInsee] = fetch(url)
        .then(r => r.ok ? r.json() : null)
        .then(d => (d && d.data && d.data[0]) || null)
        .catch(() => null);
    return qualiteEauEnCache[codeInsee];
}

/* Classement conforme/non conforme par mot-clé sur la phrase de
   conclusion plutôt qu'une valeur d'énumération figée (comme pour
   Vigieau) : seule "C" (conforme) a été confirmée en conditions
   réelles pour conformite_limites_bact_prelevement/
   conformite_limites_pc_prelevement, la ou les valeurs de non-
   conformité ne le sont pas - la phrase reste lisible et fiable dans
   les deux cas. */
/* Rien (chaîne vide) si aucun résultat exploitable, plutôt qu'une carte
   vide ou un message d'erreur : échec réseau/CORS/commune sans donnée
   traités pareil, comme le reste du dashboard quand une source n'a
   rien à montrer (voir #commune-qualite-eau dans construireDashboardCommune,
   qui reste alors un simple espace vide dans la grille). */
function construireCarteQualiteEau(resultat) {
    if (!resultat || !resultat.conclusion_conformite_prelevement) return "";
    const nonConforme = /non\s+conforme/i.test(resultat.conclusion_conformite_prelevement);
    const couleur = nonConforme ? PALETTE.terracotta : PALETTE.feuille;
    const reseau = resultat.reseaux && resultat.reseaux[0] && resultat.reseaux[0].nom;
    const precisions = [
        reseau ? `Réseau ${reseau}` : null,
        resultat.date_prelevement ? `dernier contrôle le ${formaterDateSeule(resultat.date_prelevement)}` : null
    ].filter(Boolean).join(" · ");

    return `<div class="commune-carte">
        <div class="commune-carte-titre"><i class="fa-solid fa-droplet"></i>Qualité de l'eau potable</div>
        <div class="commune-eau-badge" style="color:${couleur}"><span></span>${nonConforme ? "Non conforme" : "Conforme"}</div>
        <div class="commune-ligne">${echapperHtml(resultat.conclusion_conformite_prelevement)}</div>
        ${precisions ? `<div class="popup-fiche-precision">${echapperHtml(precisions)}</div>` : ""}
    </div>`;
}

function mairiesPourCommune(nomCommune) {
    const cible = normaliserNomCommune(nomCommune);
    return chargerMairies().then(features => features.filter(f => normaliserNomCommune(f.properties.commune) === cible));
}

/* Carte(s) "Mairie" - une par mairie trouvée pour la commune (certaines
   communes nouvelles en ont plusieurs, une par ancienne commune
   déléguée). Classes commune-* dédiées (pas popup-fiche-section,
   pensée pour l'empilement dans une popup étroite) : cette carte vit
   dans la grille du dashboard plein écran, voir construireDashboardCommune. */
function construireCarteMairie(mairies) {
    if (!mairies.length) {
        return `<div class="commune-carte">
            <div class="commune-carte-titre"><i class="fa-solid fa-landmark"></i>Mairie</div>
            <div class="commune-carte-vide">Aucune donnée de mairie disponible pour cette commune.</div>
        </div>`;
    }
    return mairies.map(m => {
        const props = m.properties;
        const lignes = [
            props.opening_hours ? `<div class="commune-ligne"><i class="fa-solid fa-clock"></i>${echapperHtml(props.opening_hours).replace(/\n/g, "<br>")}</div>` : null,
            props.contact_phone ? `<div class="commune-ligne"><i class="fa-solid fa-phone"></i><a href="tel:${echapperHtml(props.contact_phone.replace(/\s+/g, ""))}">${echapperHtml(props.contact_phone)}</a></div>` : null,
            props.contact_email ? `<div class="commune-ligne"><i class="fa-solid fa-envelope"></i><a href="mailto:${echapperHtml(props.contact_email)}">${echapperHtml(props.contact_email)}</a></div>` : null,
            props.contact_website ? `<div class="commune-ligne"><i class="fa-solid fa-globe"></i><a href="${echapperHtml(props.contact_website)}" target="_blank" rel="noopener">Site internet</a></div>` : null
        ].filter(Boolean);

        return `<div class="commune-carte">
            <div class="commune-carte-titre"><i class="fa-solid fa-landmark"></i>Mairie</div>
            <div class="commune-carte-mairie-nom">${echapperHtml(props.name || "Mairie")}</div>
            ${lignes.length ? lignes.join("") : `<div class="commune-carte-vide">Aucune information disponible.</div>`}
        </div>`;
    }).join("");
}

/* =========================================================
   DÉCOMPTE D'ENTITÉS PAR COMMUNE
   Retour direct de l'utilisatrice : compléter le dashboard avec un
   décompte ("1 boulangerie, 1 banque, 2 assistantes maternelles, 2
   écoles...") plutôt que de laisser deviner ce qui existe sur la
   commune. Aucune donnée externe : tout est déjà chargé au démarrage du
   site (les six couches ci-dessous sont toutes lazy:false, voir
   config.js) - un simple comptage sur donneesBrutes, pas un nouvel
   appel réseau.
   La plupart des couches portent déjà com_insee (filtrage direct) ;
   petiteEnfance n'a pas ce champ dans la donnée source, d'où
   parGeometrie (test point-dans-polygone via pointDansFeature, déjà
   utilisé par la recherche foncière, sur le contour de la commune
   chargé dans couchesCommunesParInsee, js/map.js).
   grouper (optionnel) éclate le total en sous-catégories plutôt qu'un
   seul chiffre par couche - correspond au niveau de détail demandé
   ("1 boulangerie" et pas juste "5 commerces"). Sans grouper, une seule
   ligne pour toute la couche (ex. Aires de jeux).
   titreGroupe/color : regroupement visuel en sous-sections de la carte
   "Ce qu'on trouve ici" (retour direct de l'utilisatrice sur la version
   précédente, une longue liste à plat "illisible") - même couleur que
   celle déjà utilisée pour cette couche sur la carte (config.js), pour
   rester cohérent plutôt que d'inventer une palette à part.
   grouper renvoie désormais {label, icon} par sous-catégorie plutôt
   qu'un simple libellé (retour direct de l'utilisatrice : "les icones
   de chaque service en fonction de leur catégorie" - une boulangerie
   et un distributeur bancaire ne doivent pas porter la même icône que
   toute leur couche). categorieCommerce (config.js) porte déjà une
   icône par catégorie de commerce, réutilisée telle quelle ; les
   autres couches n'en avaient pas, complétées ci-dessous
   (ICONES_ECOLE/ICONES_PETITE_ENFANCE). Équipements sportifs : reprend
   categorieSport (js/config.js, TYPES_SPORT), écrite pour la même
   raison côté carte cette fois ("afficher les catégories dans la
   légende") - une seule source d'icônes par sport pour le décompte ET
   la couche carte plutôt que deux listes à maintenir en double.
   LABELS_TYPE_ECOLE : réutilise la constante déjà définie dans
   js/popup.js pour construirePopupEcole, pas de doublon. */
const ICONES_ECOLE = {
    "École maternelle": "fa-solid fa-child", "École primaire": "fa-solid fa-book",
    "École élémentaire": "fa-solid fa-book-open", "Collège": "fa-solid fa-graduation-cap",
    "Lycée": "fa-solid fa-graduation-cap", SEGPA: "fa-solid fa-graduation-cap"
};
const ICONES_PETITE_ENFANCE = {
    "Assistant maternel": "fa-solid fa-baby", "Crèche": "fa-solid fa-house-chimney-window",
    "Relais Petite Enfance": "fa-solid fa-people-roof"
};
const COUCHES_DECOMPTE_COMMUNE = [
    {
        id: "commerces", titreGroupe: "Commerces & services", color: PALETTE.feuille,
        grouper: f => { const cat = categorieCommerce(f.properties.type); return { label: cat.label, icon: cat.icon }; }
    },
    {
        id: "banques", titreGroupe: "Commerces & services", color: PALETTE.ardoise,
        grouper: f => f.properties.type === "atm"
            ? { label: "Distributeur (DAB)", icon: "fa-solid fa-credit-card" }
            : { label: "Agence bancaire", icon: "fa-solid fa-building-columns" }
    },
    {
        id: "education", titreGroupe: "Éducation & petite enfance", color: PALETTE.terracotta,
        grouper: f => { const label = LABELS_TYPE_ECOLE[f.properties.type_fr] || "École"; return { label, icon: ICONES_ECOLE[label] || "fa-solid fa-graduation-cap" }; }
    },
    {
        id: "petiteEnfance", titreGroupe: "Éducation & petite enfance", color: PALETTE.terracotta, parGeometrie: true,
        grouper: f => { const label = f.properties.type || "Petite enfance"; return { label, icon: ICONES_PETITE_ENFANCE[label] || "fa-solid fa-baby" }; }
    },
    {
        id: "equipementSportif", titreGroupe: "Sport & loisirs", color: PALETTE.riviere,
        grouper: f => categorieSport(f.properties)
    },
    { id: "airesJeu", titreGroupe: "Sport & loisirs", icon: "fa-solid fa-child-reaching", color: PALETTE.riviere, label: "Aires de jeux" }
];

function featuresCommune(conf, codeInsee) {
    const donnees = donneesBrutes[conf.id] || [];
    /* String(...) plutôt qu'une égalité stricte : com_insee est une chaîne
       dans certains fichiers (commerces, education...) mais un nombre JSON
       dans d'autres (banques, airesJeu) - vérifié en conditions réelles,
       pas une supposition. Une comparaison stricte aurait silencieusement
       filtré ces couches à zéro résultat partout. */
    if (!conf.parGeometrie) return donnees.filter(f => f.properties && String(f.properties.com_insee) === codeInsee);

    const communeFeature = (typeof couchesCommunesParInsee !== "undefined" && couchesCommunesParInsee[codeInsee]) ? couchesCommunesParInsee[codeInsee].feature : null;
    if (!communeFeature) return [];
    return donnees.filter(f => f.geometry && f.geometry.type === "Point" && pointDansFeature(f.geometry.coordinates, communeFeature));
}

/* Groupé par titreGroupe (pas une liste à plat) : un groupe = une
   sous-section de tuiles dans la carte "Ce qu'on trouve ici"
   (construireCarteDecompte). Ordre = première apparition d'un groupe
   dans COUCHES_DECOMPTE_COMMUNE ; au sein d'un groupe, sous-catégories
   triées par effectif décroissant. */
function decompteEntitesCommune(codeInsee) {
    const groupes = {};
    const ordreGroupes = [];
    COUCHES_DECOMPTE_COMMUNE.forEach(conf => {
        const features = featuresCommune(conf, codeInsee);
        if (!features.length) return;
        if (!groupes[conf.titreGroupe]) {
            groupes[conf.titreGroupe] = [];
            ordreGroupes.push(conf.titreGroupe);
        }
        const lignes = groupes[conf.titreGroupe];
        if (!conf.grouper) {
            lignes.push({ icon: conf.icon, color: conf.color, label: conf.label, n: features.length, layerId: conf.id });
            return;
        }
        /* grouper renvoie {label, icon} par feature : l'icône est la même
           pour toutes les features d'un même label (catégorie), gardée du
           premier passage plutôt que recalculée. */
        const compte = {};
        features.forEach(f => {
            const { label, icon } = conf.grouper(f);
            if (!compte[label]) compte[label] = { n: 0, icon };
            compte[label].n++;
        });
        Object.keys(compte).sort((a, b) => compte[b].n - compte[a].n)
            .forEach(label => lignes.push({ icon: compte[label].icon, color: conf.color, label, n: compte[label].n, layerId: conf.id }));
    });
    return ordreGroupes.map(titre => ({ titre, lignes: groupes[titre] }));
}

/* Chaque tuile porte data-couche (id de couche, config.js) : un clic
   ferme le dashboard et affiche cette couche sur la carte, recentrée
   sur la commune - retour direct de l'utilisatrice ("est-ce que quand
   on clique sur un service ça peut nous ouvrir la carte avec ces
   services ?"). Gestion du clic par délégation sur #commune-contenu
   (voir initClicTuilesDecompte, branché une seule fois par
   ouvrirDashboardCommune), pas un addEventListener par tuile : le
   contenu est entièrement régénéré (innerHTML) à chaque ouverture. */
function construireCarteDecompte(codeInsee) {
    const groupes = decompteEntitesCommune(codeInsee);
    if (!groupes.length) return "";
    return `<div class="commune-carte commune-carte-large">
        <div class="commune-carte-titre"><i class="fa-solid fa-list-check"></i>Ce qu'on trouve ici</div>
        ${groupes.map(g => `
            <div class="commune-decompte-groupe">
                <div class="commune-decompte-groupe-titre">${echapperHtml(g.titre)}</div>
                <div class="commune-tuiles">
                    ${g.lignes.map(l => `
                        <div class="commune-tuile" data-couche="${l.layerId}" data-label="${echapperHtml(l.label)}" title="Voir sur la carte">
                            <div class="commune-tuile-icone" style="background:${l.color}"><i class="${l.icon}"></i></div>
                            <div class="commune-tuile-nombre">${l.n}</div>
                            <div class="commune-tuile-label">${echapperHtml(l.label)}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("")}
    </div>`;
}

/* Carte "hero" du dashboard : gros chiffre population en avant, chiffres
   secondaires (logements/entreprises/revenu médian) en dessous - au
   contraire de construirePopupDemographie (js/popup.js, gardée telle
   quelle pour la popup de la couche démographie elle-même, format liste
   qui convient à un popup étroit), cette carte est pensée pour la
   grille large du dashboard plein écran. demographieFeature n'a que
   population de fiable pour l'instant (reprise de couches/communes.geojson,
   voir _lisezmoi du fichier) - les autres champs, quand présents,
   s'affichent en plus sans jamais être supposés systématiques. */
function construireCarteDemographie(props) {
    if (typeof props.population !== "number") return "";
    const evolution = typeof props.evolution_annuelle_2017_2023 === "number" ? props.evolution_annuelle_2017_2023 : null;
    const partsAge = [
        typeof props.part_moins_25 === "number" ? `${props.part_moins_25}% de moins de 25 ans` : null,
        typeof props.part_25_64 === "number" ? `${props.part_25_64}% de 25 à 64 ans` : null,
        typeof props.part_65_plus === "number" ? `${props.part_65_plus}% de 65 ans et +` : null
    ].filter(Boolean).join(" · ");
    const statsSecondaires = [
        typeof props.nb_logements === "number" ? { n: props.nb_logements.toLocaleString("fr-FR"), label: "Logements" } : null,
        typeof props.nb_entreprises === "number" ? { n: props.nb_entreprises.toLocaleString("fr-FR"), label: "Établissements" } : null,
        typeof props.revenu_median === "number" ? { n: `${Math.round(props.revenu_median).toLocaleString("fr-FR")} €`, label: "Revenu médian/an" } : null
    ].filter(Boolean);

    return `<div class="commune-carte commune-carte-hero">
        <div class="commune-carte-titre"><i class="fa-solid fa-chart-column"></i>Mon territoire en chiffres</div>
        <div class="commune-hero-nombre">${props.population.toLocaleString("fr-FR")}<span>habitants</span></div>
        ${evolution !== null ? `<div class="commune-hero-evolution">${evolution > 0 ? "+" : ""}${evolution}%/an en moyenne (2017-2023)</div>` : ""}
        ${partsAge ? `<div class="popup-fiche-precision" style="margin-top:8px;">${echapperHtml(partsAge)}</div>` : ""}
        ${statsSecondaires.length ? `<div class="commune-stats-secondaires">
            ${statsSecondaires.map(s => `<div class="commune-stat-mini"><strong>${s.n}</strong><span>${s.label}</span></div>`).join("")}
        </div>` : ""}
    </div>`;
}

/* Retour direct de l'utilisatrice : combler l'espace vide à côté de la
   carte "Qualité de l'eau" plutôt que de le laisser vide - reprend la
   couche "Prix immobilier par commune" (prixImmobilier, config.js),
   déjà chargée au démarrage du site (lazy:false, comme les couches du
   décompte), aucune donnée ni appel réseau supplémentaire. */
function construireCartePrixImmobilier(codeInsee) {
    const feature = (donneesBrutes["prixImmobilier"] || []).find(f => f.properties && String(f.properties.code_insee) === codeInsee);
    if (!feature) return "";
    const props = feature.properties;
    if (typeof props.prix_m2_median !== "number") return "";

    return `<div class="commune-carte">
        <div class="commune-carte-titre"><i class="fa-solid fa-house-chimney"></i>Prix immobilier</div>
        <div class="commune-hero-nombre" style="font-size:28px;">${props.prix_m2_median.toLocaleString("fr-FR")}<span>€/m² médian</span></div>
        ${typeof props.nb_ventes === "number" ? `<div class="popup-fiche-precision" style="margin-top:8px;">${props.nb_ventes.toLocaleString("fr-FR")} vente(s)${props.periode ? ` sur ${echapperHtml(props.periode)}` : ""}</div>` : ""}
    </div>`;
}

function construireCarteActualites(codeInsee) {
    return `<div class="commune-carte commune-carte-large">
        <div class="commune-carte-titre"><i class="fa-solid fa-bullhorn"></i>Actualités (Illiwap)</div>
        <div class="illiwap-embed">
            <iframe src="${urlIllwapEmbed(codeInsee)}" title="Actualités Illiwap" loading="lazy"></iframe>
        </div>
    </div>`;
}

/* Retour direct de l'utilisatrice : la première version (contenu de
   l'ancien panneau latéral simplement empilé dans la page plein écran)
   restait "tout en longueur", illisible - repensée en vraie grille de
   cartes (voir .commune-grille dans style.css) qui exploite la largeur
   disponible plutôt qu'une seule colonne étroite. commune-qualite-eau
   reste un simple <div> (pas encore une carte) : rempli après coup une
   fois Hub'Eau résolu, voir ouvrirDashboardCommune. */
function construireDashboardCommune(codeInsee, mairies, demographieFeature) {
    const carteDemographie = demographieFeature ? construireCarteDemographie(demographieFeature.properties) : "";
    const carteMairie = construireCarteMairie(mairies);
    const carteDecompte = construireCarteDecompte(codeInsee);

    return `<div class="commune-grille">
        ${carteDemographie}
        ${carteMairie}
        <div id="commune-qualite-eau"><!-- Rempli séparément une fois Hub'Eau résolu, voir ouvrirDashboardCommune --></div>
        ${construireCartePrixImmobilier(codeInsee)}
        ${carteDecompte}
        ${construireCarteActualites(codeInsee)}
    </div>`;
}

/* Clic sur une tuile du décompte ("Ce qu'on trouve ici") : ouvre la carte
   directement sur la couche concernée plutôt que de laisser deviner
   dans quel groupe du panneau la chercher (retour direct de
   l'utilisatrice). Délégation sur #commune-contenu, branchée une seule
   fois (ecouteurTuilesBranche) : le contenu de ce conteneur est
   entièrement réécrit via innerHTML à chaque ouverture de commune, donc
   un addEventListener direct sur chaque tuile serait reperdu à chaque
   fois pour rien - la délégation évite d'avoir à rebrancher quoi que ce
   soit après chaque construireDashboardCommune. */
let ecouteurTuilesBranche = false;
/* Couche Leaflet temporaire (pas groupesLeaflet[layerId], la vraie couche
   partagée avec sa case à cocher du panneau) affichée par un clic sur une
   tuile du décompte : retour direct de l'utilisatrice, "Restaurants"
   n'affichait pas que les restaurants DE LA COMMUNE mais toute la couche
   commerces du territoire. Un seul écran à la fois : la précédente est
   retirée avant d'en construire une nouvelle plutôt que de les empiler à
   chaque clic. */
let coucheFiltreeCommuneActuelle = null;

/* label (optionnel) : une tuile ne représente pas TOUTE la couche mais
   une sous-catégorie précise à l'intérieur (ex. "Restaurants & bars"
   parmi tous les commerces) - retour direct de l'utilisatrice, cliquer
   sur "Restaurants" à Jupilles affichait tous les commerces de la
   commune, pas seulement les restaurants. Refiltré avec exactement le
   même grouper() que celui qui a produit cette tuile (decompteEntitesCommune)
   pour garantir que "ce qui s'affiche au clic" corresponde pile à "ce
   que la tuile comptait" - pas de logique de comparaison dupliquée à
   maintenir en double. Sans grouper (ex. airesJeu, tuile = couche
   entière déjà) : label ignoré, tout le filtrage commune suffit. */
function afficherCoucheFiltreeCommune(map, layerId, codeInsee, label) {
    const layerConf = LAYERS.find(l => l.id === layerId);
    /* La configuration de filtrage (parGeometrie ou non) vient de
       COUCHES_DECOMPTE_COMMUNE, pas de LAYERS : c'est elle qui sait
       comment rattacher une feature à une commune (featuresCommune,
       plus haut dans ce fichier) - toujours trouvée en pratique, chaque
       tuile du décompte vient forcément d'une de ses entrées. */
    const decompteConf = COUCHES_DECOMPTE_COMMUNE.find(c => c.id === layerId);
    if (!layerConf || !decompteConf) return;

    chargerCouche(layerConf, () => {
        if (coucheFiltreeCommuneActuelle) {
            map.removeLayer(coucheFiltreeCommuneActuelle);
            coucheFiltreeCommuneActuelle = null;
        }
        let features = featuresCommune(decompteConf, codeInsee);
        if (label && decompteConf.grouper) {
            features = features.filter(f => decompteConf.grouper(f).label === label);
        }
        if (!features.length) {
            /* Filet de sécurité seulement (ne devrait pas arriver en
               pratique, une tuile n'existe que pour un décompte > 0) :
               recentre au moins sur la commune plutôt que de ne rien
               faire du tout. */
            if (typeof zoomerSurCommune === "function") zoomerSurCommune(map, codeInsee);
            return;
        }
        /* construireCoucheDonnees (js/layers.js) : même construction
           (style, popup, index de recherche) que la vraie couche, pour
           un rendu identique - juste un sous-ensemble de features en
           entrée plutôt que le fichier complet. cluster:false forcé sur
           une copie de la config (jamais sur layerConf lui-même, partagé
           avec la vraie couche territoriale) : retour direct de
           l'utilisatrice, "Restaurants" à Jupilles (2 résultats) se
           regroupait en un seul rond de cluster à ouvrir en plus -
           un clic sur une tuile a déjà réduit le résultat à une poignée
           d'entités précises, les grouper en cluster n'a plus lieu
           d'être (le clustering sert à absorber des centaines de
           marqueurs sur tout le territoire, pas 2 restaurants dans une
           seule commune). */
        coucheFiltreeCommuneActuelle = construireCoucheDonnees({ type: "FeatureCollection", features }, { ...layerConf, cluster: false });
        coucheFiltreeCommuneActuelle.addTo(map);
        /* Zoome sur l'étendue réelle du résultat filtré (pas juste la
           commune entière) : "ça zoome dessus", retour direct de
           l'utilisatrice - un seul restaurant à Jupilles doit recentrer
           serré dessus, pas laisser deviner où il est dans toute la
           commune. maxZoom : un résultat unique (bounds ponctuelles)
           irait sinon au zoom maximal de la carte. */
        map.fitBounds(coucheFiltreeCommuneActuelle.getBounds(), { maxZoom: 16 });
    });
}

function initClicTuilesDecompte(map) {
    if (ecouteurTuilesBranche) return;
    ecouteurTuilesBranche = true;
    document.getElementById("commune-contenu").addEventListener("click", event => {
        const tuile = event.target.closest(".commune-tuile");
        if (!tuile || !tuile.dataset.couche) return;
        const codeInsee = document.getElementById("commune-page").dataset.codeInsee;
        if (!codeInsee) return;
        fermerVueCommune();
        afficherCoucheFiltreeCommune(map, tuile.dataset.couche, codeInsee, tuile.dataset.label);
    });
}

/* Retour direct de l'utilisatrice : rattacher le niveau d'alerte Vigieau
   à un petit badge sur le dashboard, plutôt que de devoir aller cocher
   la couche carte et cliquer sur la bonne zone pour le savoir. Vigieau
   est chargée en différé (lazy:true, voir config.js) - chargerCouche()
   la charge ici indépendamment de sa case à cocher (même mécanisme que
   les couches différées rouvertes depuis la fiche parcelle, voir
   ouvrirPopupParcelle dans js/layers.js) : ne l'affiche jamais sur la
   carte ni ne coche sa case, se contente de remplir donneesBrutes pour
   qu'on puisse y chercher la zone concernée.
   Une commune n'a pas de zone Vigieau dédiée (les zones sont à l'échelle
   d'un bassin/département) : test point-dans-polygone du CENTRE DE LA
   BOÎTE ENGLOBANTE de la commune (pas un vrai centroïde - approximation
   suffisante ici, les zones Vigieau sont bien plus grandes qu'une seule
   commune, un centre de boîte englobante tombe pratiquement toujours
   dans la même zone qu'un vrai centroïde le ferait). */
function alerteVigieauPourCommune(codeInsee) {
    return new Promise(resolve => {
        const conf = (typeof LAYERS !== "undefined") ? LAYERS.find(l => l.id === "vigieau") : null;
        if (!conf) { resolve(null); return; }
        chargerCouche(conf, () => {
            const communeLayer = (typeof couchesCommunesParInsee !== "undefined") ? couchesCommunesParInsee[codeInsee] : null;
            if (!communeLayer) { resolve(null); return; }
            const centre = communeLayer.getBounds().getCenter();
            const zone = (donneesBrutes["vigieau"] || []).find(f => pointDansFeature([centre.lng, centre.lat], f));
            resolve(zone || null);
        }, () => resolve(null));
    });
}

function construireBadgeVigieau(zone) {
    if (!zone) return "";
    const niveau = niveauVigieau(zone);
    const props = zone.properties || {};
    const lien = props.arreteRestriction && props.arreteRestriction.fichier;
    const contenu = `<span></span>${echapperHtml(niveau.label)}`;
    const style = `style="color:${niveau.color};background:${niveau.color}20"`;
    if (lien) {
        return `<a href="${echapperHtml(lien)}" target="_blank" rel="noopener noreferrer" class="commune-badge-vigieau" ${style} title="Restrictions sécheresse en vigueur - voir l'arrêté">${contenu}</a>`;
    }
    return `<span class="commune-badge-vigieau" ${style} title="Restrictions sécheresse en vigueur">${contenu}</span>`;
}

function ouvrirDashboardCommune(map, codeInsee) {
    const nom = COMMUNES_TERRITOIRE[codeInsee];
    if (!nom) return;

    if (typeof zoomerSurCommune === "function") zoomerSurCommune(map, codeInsee);

    document.getElementById("commune-titre").innerHTML = `<i class="fa-solid fa-signs-post"></i> ${echapperHtml(nom)} <span id="commune-badge-vigieau"></span>`;
    alerteVigieauPourCommune(codeInsee).then(zone => {
        const cible = document.getElementById("commune-badge-vigieau");
        if (cible) cible.innerHTML = construireBadgeVigieau(zone);
    });
    document.getElementById("commune-contenu").innerHTML = `<div class="popup-fiche-vide" style="padding:16px 18px;">Chargement...</div>`;
    document.getElementById("commune-page").hidden = false;
    /* Mémorisé pour le clic délégué sur les tuiles du décompte
       (initClicTuilesDecompte, branché une seule fois plus bas) : lui
       permet de retrouver la commune actuellement affichée sans avoir à
       le passer en paramètre depuis un event listener posé une seule
       fois pour toute la durée de vie de la page. */
    document.getElementById("commune-page").dataset.codeInsee = codeInsee;
    initClicTuilesDecompte(map);

    /* Hub'Eau (qualité de l'eau) démarré tout de suite, en parallèle du
       Promise.all ci-dessous, pour ne pas perdre de temps - mais
       #commune-qualite-eau (créé par construireDashboardCommune) n'existe
       pas encore dans le DOM à cet instant : le remplissage est donc
       chaîné APRÈS l'affichage du contenu principal plutôt que sur cette
       promesse directement, sinon une réponse Hub'Eau plus rapide que la
       lecture des fichiers locaux (cas limite, improbable mais possible)
       chercherait un élément qui n'existe pas encore et perdrait
       silencieusement le résultat. Le reste du dashboard ne l'attend
       jamais pour s'afficher : c'est un appel réseau externe, latence/
       fiabilité imprévisibles, contrairement à mairies/démographie qui ne
       font que lire des fichiers locaux du dépôt. */
    const promesseQualiteEau = chargerQualiteEauCommune(codeInsee);

    Promise.all([mairiesPourCommune(nom), chargerDemographieCommunes()]).then(([mairies, demoFeatures]) => {
        const demoFeature = demoFeatures.find(f => f.properties && f.properties.commune === codeInsee);
        document.getElementById("commune-contenu").innerHTML = construireDashboardCommune(codeInsee, mairies, demoFeature);
        promesseQualiteEau.then(resultat => {
            const cible = document.getElementById("commune-qualite-eau");
            if (cible) cible.innerHTML = construireCarteQualiteEau(resultat);
        });
    });
}

/* Sélecteur de commune de l'écran d'accueil : une seule liste plutôt que
   24 tuiles (comme les raccourcis thématiques) qui auraient surchargé
   l'accueil pour un usage plus ponctuel. */
function construireSelecteurCommunes(map) {
    const select = document.getElementById("hero-commune-select");
    if (!select) return;

    Object.keys(COMMUNES_TERRITOIRE)
        .sort((a, b) => COMMUNES_TERRITOIRE[a].localeCompare(COMMUNES_TERRITOIRE[b], "fr"))
        .forEach(code => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = COMMUNES_TERRITOIRE[code];
            select.appendChild(option);
        });

    select.addEventListener("change", () => {
        if (!select.value) return;
        ouvrirDashboardCommune(map, select.value);
        fermerAccueil();
        select.value = "";
    });
}

/* "Actualités" (icône de la barre du haut) : le flux Illiwap de la CC
   elle-même, pour qui reste sur la carte thématique du territoire
   plutôt que de choisir une commune précise. En menu déroulant ancré
   sous l'icône plutôt que dans le panneau des couches (comme la vue
   par commune, restée telle quelle) - retour direct de l'utilisatrice,
   ça n'a pas besoin de prendre la place de tout le panneau pour un
   simple coup d'œil aux actus du territoire. */
function toggleActuDropdown(forcerOuvert) {
    const dropdown = document.getElementById("actu-dropdown");
    const seraOuvert = forcerOuvert !== undefined ? forcerOuvert : dropdown.hidden;
    dropdown.hidden = !seraOuvert;
    /* "about:blank", pas "" : un src vide se résout à l'URL de la page
       courante et ferait recharger index.html dans sa propre iframe.
       Vidée à la fermeture plutôt que laissée tourner en arrière-plan
       (masquée via [hidden], pas déchargée pour autant) - explicitement
       demandé par l'utilisatrice ("je ne veux pas que ça alourdisse
       notre carte"). */
    document.getElementById("actu-iframe").src = seraOuvert ? urlIllwapEmbed(ILLIWAP_TERRITOIRE) : "about:blank";
}

function fermerVueCommune() {
    document.getElementById("commune-page").hidden = true;
    document.getElementById("commune-contenu").innerHTML = "";
}
