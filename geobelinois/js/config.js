/* =========================================================
   GÉOBERCÉ — CONFIGURATION DES COUCHES
   Un seul endroit pour décrire toutes les données : le reste
   du code (chargement, icônes, panneau, recherche, popups)
   est générique et lit cette configuration.
   ========================================================= */

/* Couleurs des données de la carte (icônes, aplats). Les noms viennent de
   l'ancienne charte et sont gardés pour ne pas réécrire toutes les couches ;
   les valeurs sont indépendantes du logo, choisies pour bien se distinguer
   sur la carte tout en restant dans les tons de la charte hirund·AGE :
     foret      -> prune doux
     feuille    -> vert
     terracotta -> rose
     riviere    -> bleu eau
     ardoise    -> gris chaud */
const PALETTE = {
    foret: "#7A5C8E",
    feuille: "#5E8C61",
    terracotta: "#C2677F",
    riviere: "#2F6F8F",
    ardoise: "#6B5F5A",
    or: "#D5A35D",
    orFonce: "#8A6D2B",
    roseFonce: "#8E4458"
};

/* =========================================================
   GROUPES (catégories du panneau de couches / thématiques
   de la page d'accueil)
   ========================================================= */
const GROUPS = {
    services: { label: "Services & mairie", icon: "fa-solid fa-landmark", color: PALETTE.foret },
    famille: { label: "Famille", icon: "fa-solid fa-child-reaching", color: PALETTE.terracotta },
    commerces: { label: "Commerces", icon: "fa-solid fa-basket-shopping", color: "#C98A2B" },
    associations: { label: "Associations", icon: "fa-solid fa-people-group", color: "#A0603A" },
    mobilite: { label: "Mobilité", icon: "fa-solid fa-bus", color: PALETTE.riviere },
    securite: { label: "Sécurité & santé", icon: "fa-solid fa-heart-pulse", color: "#B0413E" },
    tourisme: { label: "Nature & rando", icon: "fa-solid fa-person-hiking", color: PALETTE.feuille },
    patrimoine: { label: "Patrimoine", icon: "fa-solid fa-monument", color: "#8A7F78" },
    urbanisme: { label: "Habitat & urbanisme", icon: "fa-solid fa-house-chimney", color: PALETTE.ardoise },
    risques: { label: "Risques & prévention", icon: "fa-solid fa-triangle-exclamation", color: "#C2663A" }
};

/* Retrait-gonflement des argiles : une teinte par niveau d'aléa (jaune
   -> orange -> rouge brique, du plus faible au plus fort), plus
   l'aplat est opaque plus l'aléa est élevé. Les mêmes couleurs sont
   reprises par la légende (cases à cocher par niveau) et la popup.
   Ordre du tableau = ordre de dessin : "fort" est tracé en dernier,
   donc au-dessus. */
const TYPES_RGA = [
    { id: "1", label: "Aléa faible", icon: "fa-solid fa-house-crack", color: "#F2D14B", opacite: 0.40 },
    { id: "2", label: "Aléa moyen", icon: "fa-solid fa-house-crack", color: "#EE8A2E", opacite: 0.55 },
    { id: "3", label: "Aléa fort", icon: "fa-solid fa-house-crack", color: "#B5321C", opacite: 0.70 }
];
function categorieRga(feature) {
    return String(Math.round(Number((feature.properties || {}).niveau)) || 1);
}
function styleRga(feature) {
    const cat = TYPES_RGA.find(t => t.id === categorieRga(feature)) || TYPES_RGA[0];
    return { color: cat.color, weight: 1, opacity: 0.9, fillColor: cat.color, fillOpacity: cat.opacite };
}

/* Zonage PLUi : une couleur par grande famille de zones (champ typezone du Géoportail
   de l'urbanisme), reprise par la légende comme pour les argiles. U et AU en tons chauds
   (là où l'on construit), A et N en tons verts (agricole, naturel). */
const TYPES_PLUI = [
    { id: "N", label: "N — Zone naturelle", icon: "fa-solid fa-tree", color: "#5E8C61", opacite: 0.40 },
    { id: "A", label: "A — Zone agricole", icon: "fa-solid fa-wheat-awn", color: "#D9B94A", opacite: 0.40 },
    { id: "AUs", label: "AUs — À urbaniser (stricte)", icon: "fa-solid fa-person-digging", color: "#E8A06A", opacite: 0.50 },
    { id: "AUc", label: "AUc — À urbaniser (constructible)", icon: "fa-solid fa-person-digging", color: "#D9632B", opacite: 0.55 },
    { id: "U", label: "U — Zone urbaine", icon: "fa-solid fa-city", color: "#B8405E", opacite: 0.55 }
];
function categoriePlui(feature) {
    const t = String((feature.properties || {}).typezone || "").trim();
    return TYPES_PLUI.some(x => x.id === t) ? t : "N";
}
function stylePlui(feature) {
    const cat = TYPES_PLUI.find(t => t.id === categoriePlui(feature)) || TYPES_PLUI[0];
    return { color: cat.color, weight: 1, opacity: 0.9, fillColor: cat.color, fillOpacity: cat.opacite };
}

/* Couleurs des 5 lots de chasse de Bercé, reprises de l'affiche ONF. */
const COULEURS_LOTS_CHASSE = { 1: "#E8836B", 2: "#E3CF3F", 3: "#4FA3E0", 4: "#3A9A3A", 5: "#B88FCB" };
function styleLotChasse(feature) {
    const c = COULEURS_LOTS_CHASSE[(feature.properties || {}).lot] || PALETTE.ardoise;
    return { color: c, weight: 2, opacity: 0.9, fillColor: c, fillOpacity: 0.35 };
}

/* =========================================================
   STYLES DYNAMIQUES POUR COUCHES "FLUX"
   (données dont on ne maîtrise pas totalement le nom exact
   des attributs distants : on cherche des mots-clés plutôt
   qu'un nom de champ figé, pour rester robuste aux évolutions
   du fournisseur de données)
   ========================================================= */
/* Historique : ce fichier a longtemps téléchargé le flux GeoJSON
   national brut de Vigieau (un seul objet S3 statique de toutes les
   zones sous arrêté sécheresse de France). Abandonné après retour
   direct de l'utilisatrice ("la couche vigieau ne fonctionne pas") :
   ce fichier avait grossi jusqu'à ~400 Mo (Content-Length observé :
   420 046 159 octets dans les devtools), bien au-delà de ce qu'un
   onglet mobile peut télécharger/parser sans geler - un premier
   correctif (lecture en flux avec abandon à 30 Mo) rendait l'échec
   propre, mais laissait la couche définitivement indisponible tant que
   ce fichier restait aussi gros : pas une vraie solution ("ça ne peut
   pas marcher que de temps en temps", retour direct de l'utilisatrice).

   Remplacé par la vraie API officielle Vigieau
   (https://api.vigieau.gouv.fr/api/zones, https://github.com/MTES-MCT/vigieau-api),
   interrogée UNE FOIS PAR COMMUNE du territoire (24 communes, quelques
   dizaines de Ko au total contre 400 Mo) plutôt qu'un unique fichier
   national. Schéma de réponse vérifié en conditions réelles via
   l'utilisatrice (pas une supposition) sur
   `?lon=...&lat=...&profil=particulier` pour un point réellement sous
   restriction : un tableau d'objets zone, un par type d'eau concerné à
   ce point (`type` "SUP"/"AEP"/"SOU", `niveauGravite`, `departement`
   en chaîne, `arrete` {cheminFichier, dateDebutValidite,
   dateFinValidite, cheminFichierArreteCadre}, `usages` [{nom,
   thematique, description, concerneParticulier/Entreprise/
   Collectivite/Exploitation}]) - même vocabulaire que l'ancien fichier
   (niveauGravite, usages~restrictions) mais noms de champs différents
   par endroits (arrete.cheminFichier au lieu d'arreteRestriction.fichier,
   departement en chaîne au lieu d'un objet {code,nom}, pas de champ
   "numero" d'arrêté) - voir construirePopupVigieau (js/popup.js) pour
   le détail de l'adaptation. Tableau vide [] : aucune restriction
   active pour ce point actuellement (pas une erreur). Un code 409
   ("plusieurs zones de même type") reste possible par point exact dans
   de rares cas limites - traité comme une commune sans donnée
   exploitable plutôt que de faire échouer toute la couche.

   Interrogée au centre de la boîte englobante de chaque commune
   (`couchesCommunesParInsee`, déjà peuplé par js/map.js au chargement
   de la page - même approximation déjà utilisée par
   alerteVigieauPourCommune dans js/communes.js avant cette refonte) :
   avec des communes rurales de forme simple, un centre de boîte
   englobante tombe pratiquement toujours dans la bonne zone. Une
   commune sans restriction active (tableau vide) n'apparaît simplement
   pas sur la carte, comme avant avec le fichier national. */
const URL_API_VIGIEAU = "https://api.vigieau.gouv.fr/api/zones";

function zonesVigieauPourPoint(lon, lat) {
    return fetch(`${URL_API_VIGIEAU}?lon=${lon}&lat=${lat}&profil=particulier`)
        .then(r => r.ok ? r.json() : [])
        .then(data => Array.isArray(data) ? data : [])
        .catch(() => []);
}

/* Parmi les zones renvoyées pour une commune (une par type d'eau), la
   plus sévère détermine la couleur/le badge de la commune sur la carte
   (couleurVigieau/niveauVigieau, inchangés - operent sur
   properties.niveauGravite, même nom de champ que l'API) ; les autres
   restent consultables dans properties.zones pour le détail complet
   par type d'eau dans la popup. */
function zonePireNiveau(zones) {
    let pire = null, pireIndex = Infinity;
    zones.forEach(z => {
        const index = NIVEAUX_VIGIEAU.findIndex(n => String(z.niveauGravite || "").toLowerCase().includes(n.motCle));
        if (index !== -1 && index < pireIndex) { pireIndex = index; pire = z; }
    });
    return pire || zones[0] || null;
}

/* Séparée de fetchPersonnaliseVigieau (pure : aucune dépendance à
   Leaflet/couchesCommunesParInsee) pour rester testable isolément -
   prend directement une feature commune "brute" (geometry + properties
   telles que dans couches/communes.geojson) plutôt qu'un layer
   Leaflet. */
function construireFeatureVigieauCommune(codeInsee, communeFeature, zones) {
    const pire = zonePireNiveau(zones);
    if (!pire) return null;
    return {
        type: "Feature",
        geometry: communeFeature.geometry,
        properties: {
            nom: communeFeature.properties.nom_offici || communeFeature.properties.nom || "Commune",
            comInsee: codeInsee,
            departement: pire.departement || null,
            niveauGravite: pire.niveauGravite,
            lienArretePire: (pire.arrete && pire.arrete.cheminFichier) || null,
            zones: zones
        }
    };
}

function fetchPersonnaliseVigieau() {
    const communes = (typeof couchesCommunesParInsee !== "undefined") ? couchesCommunesParInsee : {};
    const appels = Object.keys(communes).map(codeInsee => {
        const layer = communes[codeInsee];
        const centre = layer.getBounds().getCenter();
        return zonesVigieauPourPoint(centre.lng, centre.lat).then(zones =>
            zones.length ? construireFeatureVigieauCommune(codeInsee, layer.feature, zones) : null
        );
    });
    return Promise.all(appels).then(features => ({
        type: "FeatureCollection",
        features: features.filter(Boolean)
    }));
}

/* Niveau de gravité Vigieau : le vrai nom de champ est "niveauGravite"
   (vérifié en conditions réelles sur l'API officielle, valeurs
   observées "alerte"/"vigilance" - voir construirePopupVigieau dans
   js/popup.js pour le détail complet du schéma réel), mais reste
   comparé par mot-clé sur l'ensemble des propriétés textuelles plutôt
   qu'une égalité stricte sur ce seul champ - tolère une valeur composée
   ("alerte renforcée" contient aussi "alerte", d'où l'ordre de
   vérification du plus sévère au moins sévère) sans dépendre d'un
   format exact non garanti dans le temps. Couleur ET libellé partagent
   cette même fonction (polygone ET popup) pour qu'ils ne puissent
   jamais diverger l'un de l'autre. */
const NIVEAUX_VIGIEAU = [
    { motCle: "crise", label: "Crise", color: "#7A1F1F" },
    { motCle: "renforc", label: "Alerte renforcée", color: "#EB5757" },
    { motCle: "alerte", label: "Alerte", color: "#F2994A" },
    { motCle: "vigilance", label: "Vigilance", color: "#F2C94C" }
];
const NIVEAU_VIGIEAU_DEFAUT = { label: "Niveau non identifié", color: "#9AA5A0" };
function niveauVigieau(feature) {
    const texte = Object.values(feature.properties || {})
        .filter(v => typeof v === "string")
        .join(" ")
        .toLowerCase();
    return NIVEAUX_VIGIEAU.find(n => texte.includes(n.motCle)) || NIVEAU_VIGIEAU_DEFAUT;
}
/* fillOpacity abaissée (0.5 -> 0.28) : retour direct de l'utilisatrice,
   l'aplat plein masquait trop le fond de carte en dessous (routes,
   cours d'eau, limites communales) pour une couche qui se superpose à
   presque tout le reste du territoire en cas d'alerte large. */
function couleurVigieau(feature) {
    return { color: "#fff", weight: 1, fillColor: niveauVigieau(feature).color, fillOpacity: 0.28 };
}

/* Une couleur par itinéraire (randonnées, itinéraires cyclables) plutôt
   qu'une seule couleur fixe pour toute la couche - retour direct de
   l'utilisatrice ("ils se mélangent tous entre eux"). Attribution dans
   l'ordre d'apparition (par couche, pas mélangé entre rando et vélo)
   plutôt qu'un hash du "id" : un hash peut faire retomber deux
   itinéraires sur la même couleur même avec très peu d'entrées
   (constaté en testant : 8 tracés vélo ne donnaient que 5 couleurs
   distinctes) - ici, tant que le nombre d'itinéraires d'une couche ne
   dépasse pas la taille de la palette, chacun est garanti unique.
   Rouge volontairement absent de cette palette : déjà réservé aux
   couleurs d'alerte/risque ailleurs sur le site (Vigieau), inutile de
   prêter à confusion sur un simple tracé de randonnée. */
const PALETTE_ITINERAIRES = ["#5E8C61", "#2F6F8F", "#B5677A", "#8E44AD", "#E1B12C", "#16A085", "#D63384", "#2C3E50"];
const compteurCouleurItineraires = {}; // id de couche -> nombre déjà attribués
const couleurParItineraire = {}; // "idCouche|idTrace" -> couleur déjà attribuée
function couleurItineraire(feature, idCouche) {
    const props = feature.properties || {};
    const idTrace = String(props.id ?? props.ref ?? props.name ?? "");
    const cle = idCouche + "|" + idTrace;
    if (!(cle in couleurParItineraire)) {
        const position = compteurCouleurItineraires[idCouche] || 0;
        couleurParItineraire[cle] = PALETTE_ITINERAIRES[position % PALETTE_ITINERAIRES.length];
        compteurCouleurItineraires[idCouche] = position + 1;
    }
    return couleurParItineraire[cle];
}

/* =========================================================
   CATÉGORIES DE COMMERCES
   Le champ "type" du fichier commerces.geojson porte des valeurs
   OSM brutes (restaurant, bakery, hairdresser...) : on les regroupe
   en quelques catégories visuelles (icône + couleur) pour que la
   carte reste lisible, avec un repli générique pour tout type non
   prévu. Sert à la fois aux marqueurs et à la légende du panneau.
   ========================================================= */
const TYPES_COMMERCES = [
    {
        id: "boulangerie", label: "Boulangerie & pâtisserie", icon: "fa-solid fa-bread-slice", color: PALETTE.feuille,
        types: ["bakery", "chocolate"]
    },
    {
        id: "alimentation", label: "Alimentation", icon: "fa-solid fa-basket-shopping", color: PALETTE.feuille,
        /* "caterer" (traiteur) : préparation/vente de nourriture comme
           les autres entrées de cette catégorie, plutôt que "restauration"
           (repas sur place) où il ne correspond pas vraiment. */
        types: ["supermarket", "convenience", "butcher", "deli", "seafood", "greengrocer", "winery", "variety_store", "newsagent", "caterer"]
    },
    {
        id: "restauration", label: "Restaurants & bars", icon: "fa-solid fa-utensils", color: PALETTE.terracotta,
        types: ["restaurant", "bar", "pub", "fast_food"]
    },
    {
        id: "coiffure", label: "Coiffure", icon: "fa-solid fa-scissors", color: "#8E4458",
        types: ["hairdresser"]
    },
    {
        id: "beaute", label: "Beauté & bien-être", icon: "fa-solid fa-spa", color: PALETTE.terracotta,
        types: ["beauty", "perfumery", "tattoo"]
    },
    {
        id: "sante", label: "Santé", icon: "fa-solid fa-briefcase-medical", color: PALETTE.riviere,
        types: ["pharmacy", "optician", "hearing_aids"]
    },
    {
        id: "automobile", label: "Automobile", icon: "fa-solid fa-car", color: PALETTE.ardoise,
        types: ["car_repair", "car_wash", "fuel", "vehicle_inspection", "driving_school", "bicycle"]
    },
    {
        id: "bricolage", label: "Bricolage & jardin", icon: "fa-solid fa-screwdriver-wrench", color: PALETTE.feuille,
        types: ["doityourself", "garden_centre", "interior_decoration"]
    },
    {
        id: "mode", label: "Mode & accessoires", icon: "fa-solid fa-shirt", color: PALETTE.terracotta,
        types: ["clothes", "shoes", "leather", "jewelry"]
    },
    {
        id: "poste", label: "Bureau de poste", icon: "fa-solid fa-envelope", color: PALETTE.ardoise,
        types: ["post_office"]
    },
    {
        id: "servicesPro", label: "Services professionnels", icon: "fa-solid fa-briefcase", color: PALETTE.ardoise,
        types: ["insurance", "estate_agent", "funeral_directors", "laundry", "cleaning", "photographer", "association"]
    },
    {
        id: "hightech", label: "High-tech & électronique", icon: "fa-solid fa-laptop", color: PALETTE.riviere,
        types: ["computer", "electronics", "e-cigarette", "informatique"]
    },
    {
        id: "culture", label: "Culture & loisirs", icon: "fa-solid fa-palette", color: PALETTE.feuille,
        types: ["books", "art", "cinema", "sports", "photo", "gift", "handicraft", "sewing", "museum"]
    },
    {
        id: "brocante", label: "Brocante & antiquités", icon: "fa-solid fa-shop", color: "#8A7F78",
        types: ["antiques", "second_hand", "wholesale"]
    },
    /* Les artisans (plombier, menuisier...) ont leur propre couche
       "artisans" (registre SIRENE + saisies à la main, voir plus bas
       TYPES_ARTISANS) : ceux d'abord saisis ici y ont été déplacés. */
    {
        id: "producteurLocal", label: "Producteurs locaux", icon: "fa-solid fa-carrot", color: PALETTE.foret,
        types: ["producteur local"]
    },
    /* Ajouté par l'utilisatrice à la main, même logique que "producteur
       local" ci-dessus : un casier en libre-service (légumes, viande...)
       mis à disposition dans un village, sans vendeur sur place - assez
       différent dans l'usage d'un vrai commerce de producteur pour
       mériter sa propre icône plutôt que d'être noyé dans
       "Producteurs locaux" (une étagère en libre-service 24h/24 n'a pas
       les mêmes horaires/contact qu'une ferme). Icône "casiers empilés"
       (la plupart de ces distributeurs sont littéralement un meuble à
       casiers) et couleur ambrée distincte du reste de la palette
       plutôt qu'une des 5 couleurs déjà très utilisées. */
    {
        id: "distributeur", label: "Distributeurs de producteurs locaux", icon: "fa-solid fa-boxes-stacked", color: "#B8793A",
        types: ["distributeur"]
    }
];
const TYPE_COMMERCE_DEFAUT = { id: "autre", label: "Autres commerces", icon: "fa-solid fa-store", color: PALETTE.ardoise };

/* Retour direct de l'utilisatrice : un commerce définitivement fermé ne
   doit pas disparaître de la carte (un repreneur peut toujours arriver un
   jour) - juste être signalé comme tel plutôt que supprimé. Liste tenue à
   la main, par osm_id (déjà présent dans chaque fiche de
   couches/commerces/commerces.geojson, stable d'un export à l'autre)
   plutôt qu'un fichier séparé à fetcher : même convention que les autres
   petites listes manuelles de ce fichier (COMMUNES_TERRITOIRE,
   TYPES_COMMERCES...), pas de latence réseau/course avec le rendu des
   marqueurs à gérer pour une poignée d'entrées. Pour signaler une
   fermeture : ajouter une entrée ici avec l'osm_id du commerce (visible
   dans les propriétés de sa fiche popup) ; pour un rétablissement,
   retirer l'entrée. */
const COMMERCES_FERMES = {
    "way/166282513": { note: "" },   // Le Bistrot Chouette (Jupilles)
    "node/13129240499": { note: "" } // Le Fournil de Jupilles (Jupilles)
};

function categorieCommerce(typeBrut) {
    if (!typeBrut) return TYPE_COMMERCE_DEFAUT;
    const valeurs = String(typeBrut).split(/[;,/]/).map(v => v.trim().toLowerCase());
    return TYPES_COMMERCES.find(cat => cat.types.some(t => valeurs.includes(t))) || TYPE_COMMERCE_DEFAUT;
}

/* Point d'extension utilisé par icons.js/layers.js : renvoie l'icône et
   la couleur à utiliser pour CE commerce précis plutôt que celles, fixes,
   de la couche "commerces". Gris neutre (ni la couleur de la catégorie, ni
   un rouge d'alerte) pour un commerce fermé : reste identifiable par son
   icône (toujours une boulangerie sur la carte) mais visuellement en
   retrait, sans donner l'impression d'un problème/danger. */
function iconeCommerce(feature) {
    const cat = categorieCommerce((feature.properties || {}).type);
    if (COMMERCES_FERMES[(feature.properties || {}).osm_id]) {
        return { icon: cat.icon, color: "#B8C0BD" };
    }
    return { icon: cat.icon, color: cat.color };
}

/* Point d'extension utilisé par layers.js pour répartir les commerces en
   sous-couches indépendantes (une par catégorie), afin que chacune soit
   affichable/masquable séparément depuis la légende du panneau. */
function categoriePourFeature(feature) {
    return categorieCommerce((feature.properties || {}).type).id;
}

/* =========================================================
   ARTISANS (registre SIRENE)
   couches/commerces/artisans.geojson est reconstruit chaque mois par
   outils/build_artisans.py (workflow donnees-mensuelles.yml) : champ
   "categorie" déjà calculé depuis le code APE de l'établissement. Les
   "motsCles" servent à la recherche ("plombier" doit trouver la
   catégorie "Plomberie & chauffage", pas seulement les noms).
   Saisies à la main (téléphone, site, horaires au format OSM, fiche
   "verifie", artisan ajouté avec source "manuel", "masquer") : gardées
   d'un mois sur l'autre par le script, voir son en-tête et le README.
   ========================================================= */
const TYPES_ARTISANS = [
    { id: "plomberie", label: "Plomberie & chauffage", icon: "fa-solid fa-faucet-drip", color: "#2F6FA8",
      motsCles: "plombier plomberie chauffagiste chauffage climatisation pompe à chaleur sanitaire" },
    { id: "electricite", label: "Électricité", icon: "fa-solid fa-bolt", color: PALETTE.ardoise,
      motsCles: "électricien électricité électrique éclairage" },
    { id: "maconnerie", label: "Maçonnerie & gros œuvre", icon: "fa-solid fa-trowel-bricks", color: PALETTE.ardoise,
      motsCles: "maçon maçonnerie gros oeuvre construction terrassement terrassier démolition" },
    { id: "couverture", label: "Couverture & charpente", icon: "fa-solid fa-house-chimney", color: PALETTE.ardoise,
      motsCles: "couvreur couverture toiture toit charpentier charpente zinguerie étanchéité" },
    { id: "menuiserie", label: "Menuiserie", icon: "fa-solid fa-door-open", color: PALETTE.ardoise,
      motsCles: "menuisier menuiserie fenêtre fenêtres porte portes serrurier serrurerie ébéniste" },
    { id: "peinture", label: "Peinture & sols", icon: "fa-solid fa-paint-roller", color: PALETTE.ardoise,
      motsCles: "peintre peinture plaquiste plâtrier plâtrerie carreleur carrelage sols isolation" },
    { id: "jardin", label: "Parcs & jardins", icon: "fa-solid fa-seedling", color: PALETTE.foret,
      motsCles: "paysagiste jardinier jardin jardins espaces verts élagage entretien" }
];
const TYPE_ARTISAN_DEFAUT = { id: "autre", label: "Autres artisans", icon: "fa-solid fa-hammer", color: PALETTE.ardoise,
    motsCles: "artisan réparation métallerie forage" };

function categorieArtisan(feature) {
    const id = (feature.properties || {}).categorie;
    return TYPES_ARTISANS.find(cat => cat.id === id) || TYPE_ARTISAN_DEFAUT;
}
function iconeArtisan(feature) {
    const cat = categorieArtisan(feature);
    return { icon: cat.icon, color: cat.color };
}
function sousTitreArtisan(feature) {
    const props = feature.properties || {};
    return [categorieArtisan(feature).label, props.com_nom].filter(Boolean).join(" · ");
}
function motsClesArtisan(feature) {
    const props = feature.properties || {};
    return [categorieArtisan(feature).motsCles, props.activite].filter(Boolean).join(" ");
}

/* =========================================================
   ASSOCIATIONS (Répertoire national des associations)
   couches/associations/associations.geojson, reconstruit chaque mois
   par outils/build_associations.py : UN point par commune (son centre),
   qui porte la liste de ses associations. Volontairement pas l'adresse
   du siège : pour une petite association, c'est souvent le domicile
   d'un ou d'une bénévole.
   ========================================================= */
const CATEGORIES_ASSOCIATIONS = {
    sport: "Sport",
    culture: "Culture",
    loisirs: "Loisirs & fêtes",
    entraide: "Entraide & santé",
    education: "Enfance & école",
    patrimoine: "Patrimoine & mémoire",
    environnement: "Nature, chasse & pêche",
    autres: "Autres"
};
const COULEUR_ASSOCIATIONS = "#8A6D2B";

/* Pastille avec le nombre d'associations plutôt qu'une icône (voir
   iconeHtml dans js/icons.js). */
function iconeAssociations(feature) {
    const nb = (feature.properties || {}).nb || 0;
    return {
        icon: "fa-solid fa-people-group", color: COULEUR_ASSOCIATIONS,
        html: `<div class="geo-marker-nombre" style="background:${COULEUR_ASSOCIATIONS}">${nb}</div>`
    };
}
function sousTitreAssociations(feature) {
    const nb = (feature.properties || {}).nb || 0;
    return nb + (nb > 1 ? " associations" : " association");
}
/* Recherche : le nom de chaque association renvoie vers la fiche de sa
   commune ("football" trouve "Associations de Montval-sur-Loir"). */
function motsClesAssociations(feature) {
    return ((feature.properties || {}).associations || []).map(a => a.titre).join(" ");
}

/* Point d'extension utilisé par layers.js (ajouterAuIndex) : sous-titre
   affiché dans la recherche et "près de chez moi", à la place de
   subtitleFields (["type", "opening_hours", "phone"]) qui affichait tel
   quel le type OSM brut ("bakery") et les horaires au format OSM
   ("Mo-Fr 08:00-19:00...") - illisible pour le grand public, retour
   direct de l'utilisatrice. Catégorie déjà traduite
   (categorieCommerce) + statut ouvert/fermé résumé en un mot plutôt que
   la plage horaire complète (trop long pour une ligne de résultat, le
   détail complet reste dans la popup au clic). */
function sousTitreCommerce(feature) {
    const props = feature.properties || {};
    if (COMMERCES_FERMES[props.osm_id]) return "Fermé définitivement";
    const cat = categorieCommerce(props.type);
    const horaires = (typeof parserHorairesOsm === "function") ? parserHorairesOsm(props.opening_hours) : null;
    const statut = horaires ? ((typeof estOuvertMaintenant === "function" && estOuvertMaintenant(horaires)) ? "Ouvert maintenant" : "Fermé actuellement") : null;
    return [cat.label, statut].filter(Boolean).join(" · ");
}

/* Même souci que sousTitreCommerce, sur "banques" (subtitleFields
   ["com_nom","has_atm"] affichait le mot "true" en toutes lettres pour
   un distributeur, et rien du tout pour une agence - has_atm valant
   false, un booléen filtré comme une valeur vide). */
function sousTitreBanque(feature) {
    const props = feature.properties || {};
    const estDab = props.type === "atm";
    return [props.com_nom, estDab ? "Distributeur" : "Agence bancaire"].filter(Boolean).join(" · ");
}

/* =========================================================
   DPE ET MUTATIONS (DVF) — code couleur
   Mêmes couleurs que les puces DPE du formulaire de recherche foncière
   (.rf-dpe-* dans style.css) et que le prix/m² du popup parcelle
   (construirePopupCadastre), pour rester cohérent partout où une classe
   DPE ou un prix/m² apparaît sur le site.
   ========================================================= */
function couleurDpe(classe) {
    const couleurs = { A: "#2e8b57", B: "#76a942", C: "#b7c94a", D: "#e0c83c", E: "#eda832", F: "#e47732", G: "#c94338" };
    return couleurs[classe] || PALETTE.ardoise;
}

/* Point d'extension utilisé par icons.js/layers.js : un marqueur DPE par
   classe énergétique plutôt qu'une seule couleur fixe pour toute la
   couche, pour repérer les logements les moins performants d'un coup
   d'œil sur la carte. */
function iconeDpe(feature) {
    return { icon: "fa-solid fa-bolt", color: couleurDpe((feature.properties || {}).etiquette_dpe) };
}

/* Ventes connues d'une mutation DVF, restreintes aux lots qui concernent
   VRAIMENT la parcelle de cette mutation (une mutation/un acte notarié
   peut en regrouper plusieurs) : réutilisé par la fiche parcelle
   (infosParcelle dans recherche.js) ET par le popup/style de la couche
   "mutations" elle-même (chaque feature y est déjà une mutation DVF). */
function ventesDepuisMutation(dvfFeature) {
    if (!dvfFeature) return [];
    const refParcelle = dvfFeature.properties.reference_parcelle;
    return (dvfFeature.properties.historique_mutations || []).map(m => {
        const locaux = (m.elements_locaux || []).filter(e => e.parcelle === refParcelle && e.surface_batie > 0);
        const surfaceBatie = locaux.reduce((s, e) => s + e.surface_batie, 0) || null;
        const valeur = typeof m.valeur === "number" ? m.valeur : null;
        return {
            annee: m.annee || null, valeur,
            nbBatiments: locaux.length || null, surfaceBatie,
            prixM2: (surfaceBatie && valeur) ? Math.round(valeur / surfaceBatie) : null
        };
    });
}

/* Point d'extension (styleFn) de la couche "mutations" : colore chaque
   parcelle vendue selon le prix/m² de sa vente la plus récente (même
   échelle couleurPrix que la choroplethe "Prix immobilier par commune"),
   plutôt qu'une seule couleur terracotta uniforme qui ne disait rien du
   marché local. Grise (couleurPrix(null)) quand le prix/m² ne peut pas
   être calculé (vente de terrain nu sans bâti, par exemple). */
function stylePrixMutation(feature) {
    const ventes = ventesDepuisMutation(feature);
    const prixM2 = ventes[0] ? ventes[0].prixM2 : null;
    return { color: "#fff", weight: 1, fillColor: couleurPrix(prixM2), fillOpacity: 0.6 };
}

/* =========================================================
   COURS D'EAU (OpenStreetMap, extrait statique)
   Demande directe de l'utilisatrice, envisagé un temps via Hub'Eau -
   mais Hub'Eau ne fournit pas le tracé du réseau hydrographique
   (uniquement des stations de mesure ponctuelles), le tracé vient donc
   d'OSM. Même méthode que les autres couches OSM du site (voir la
   section "Couches converties en fichiers statiques" du README) :
   export overpass-turbo.eu (`way["waterway"~"^(river|stream|canal|
   drain|ditch)$"]`) sur le rectangle englobant le territoire, filtré
   ensuite par un vrai test point-dans-polygone contre couches/epci.geojson
   (1431 tronçons dans l'export brut, 401 réellement dans le territoire).
   Une ligne est gardée dès qu'AU MOINS UN de ses points tombe dans le
   polygone plutôt que de découper le tronçon pile à la frontière : un
   cours d'eau qui sort du territoire sur quelques mètres reste lisible
   d'un seul tenant plutôt que tronqué net. */
const LABELS_COURS_EAU = {
    river: "Rivière", stream: "Ruisseau", canal: "Canal",
    drain: "Fossé de drainage", ditch: "Fossé"
};
/* Épaisseur dégressive par importance (rivière > canal > ruisseau >
   fossé), plutôt qu'un trait uniforme qui noierait les vraies rivières
   (Le Loir...) au milieu des centaines de petits fossés agricoles.
   Tronçons intermittents (à sec une partie de l'année, tag OSM
   "intermittent=yes") en trait plus clair et pointillé, même code
   visuel que la ligne pointillée de l'EPCI (js/map.js) - distingue d'un
   coup d'œil un vrai ruisseau permanent d'un fossé qui ne coule qu'en
   hiver. */
/* route_color (et route_text_color, utilisé dans construirePopupLigneBus)
   viennent directement du flux GTFS/OSM ALÉOP (couches/mobilite/
   reseauALEOP.geojson), déjà au format CSS "rgb(r,g,b)" - vérifié réel
   sur le fichier (216 : rgb(243,151,93), orange), pas une valeur
   inventée. Repli sur le bleu générique du site seulement si jamais
   absent (donnée manquante pour une ligne). */
function styleLigneALEOP(feature) {
    const couleur = (typeof couleurDepuisRgb === "function" && couleurDepuisRgb((feature.properties || {}).route_color)) || PALETTE.riviere;
    return { color: couleur, weight: 3, opacity: 0.8 };
}

function styleCoursEau(feature) {
    const type = feature.properties.waterway;
    const weight = type === "river" ? 3 : type === "canal" ? 2.5 : type === "stream" ? 1.5 : 1;
    const intermittent = feature.properties.intermittent === "yes";
    return { color: PALETTE.riviere, weight, opacity: intermittent ? 0.55 : 0.85, dashArray: intermittent ? "4 3" : null };
}

/* =========================================================
   DÉCHÈTERIES / TRI
   Une seule couche mélange trois choses bien différentes (champ
   "type") : déchèterie ("centre"), composteur partagé ("compost"), et
   point d'apport volontaire / colonnes de tri ("container"). Ces
   derniers portent, en plus, jusqu'à 4 indicateurs de flux triés
   séparés (verre/papier/plastique/ordures ménagères) : mêmes couleurs
   que les bacs de tri en France (vert/bleu/jaune/noir), affichées en
   marqueur "camembert" (une part égale par flux présent, pas de
   pondération par volume - donnée absente) plutôt qu'une seule couleur
   qui ne dirait rien du contenu réel du point.
   ========================================================= */
const FLUX_TRI = [
    { id: "glass", label: "Verre", color: PALETTE.feuille },
    { id: "paper", label: "Papier", color: PALETTE.riviere },
    { id: "plastic_packaging", label: "Emballages plastique", color: "#F2C94C" },
    { id: "waste", label: "Ordures ménagères", color: "#2A2A28" }
];

/* Champs "yes"/null dans ce flux, avec au moins une coquille observée
   dans la donnée réelle ("ye" au lieu de "yes") : on reste tolérant
   plutôt que de comparer une égalité stricte à "yes". */
function fluxActif(valeur) {
    return typeof valeur === "string" && /^y/i.test(valeur.trim());
}

function fluxPresents(props) {
    return FLUX_TRI.filter(f => fluxActif(props[f.id]));
}

/* "Syndicat Mxte du Val de Loir" : coquille observée sur une des 47
   entrées de la donnée réelle (pour "Syndicat Mixte du Val de Loir") —
   corrigée à l'affichage plutôt que de la laisser telle quelle dans la
   popup. */
function operateurDechet(operator) {
    return operator ? operator.replace(/\bMxte\b/i, "Mixte") : null;
}

/* Point d'extension utilisé par icons.js : déchèterie et composteur
   gardent une icône/couleur fixe (ce ne sont pas des points de tri
   sélectif comme tels), un point d'apport volontaire devient un
   marqueur "camembert" coloré selon les flux qu'il accepte réellement. */
function iconeDechet(feature) {
    const props = feature.properties || {};
    if (props.type === "centre") return { icon: "fa-solid fa-warehouse", color: PALETTE.foret };
    if (props.type === "compost") return { icon: "fa-solid fa-seedling", color: PALETTE.feuille };

    const flux = fluxPresents(props);
    if (!flux.length) return { icon: "fa-solid fa-recycle", color: PALETTE.ardoise };
    return { icon: "fa-solid fa-recycle", color: flux[0].color, segments: flux.map(f => f.color) };
}

/* =========================================================
   CADASTRE (parcellaire complet)
   Un seul flux pour toute la comcom Loir-Lucé-Bercé (bundler Etalab,
   par EPCI via son n° SIREN plutôt que commune par commune). Base pour
   une future "fiche parcelle" (croisement avec les mutations DVF, le
   DPE, le PLUi...).
   ========================================================= */
/* Défini dans js/territoire.js (propre à chaque territoire). */
const COMMUNES_TERRITOIRE = TERRITOIRE.communes;

/* SIREN de la comcom (TERRITOIRE.siren, voir js/territoire.js). */
const URL_CADASTRE_EPCI = `https://cadastre.data.gouv.fr/bundler/cadastre-etalab/epcis/${TERRITOIRE.siren}/geojson/parcelles`;

/* =========================================================
   ILLIWAP — actualités/alertes des mairies et de la CC
   Chaque commune du territoire a sa propre "station" publique
   Illiwap, sous la forme station.illiwap.com/fr/public/<code_insee>
   (confirmé par l'utilisatrice avec le 72248 = Pruillé-l'Éguillé) -
   dérivable directement des codes INSEE déjà dans
   COMMUNES_TERRITOIRE, pas besoin de collecter 24 liens à la main.
   La CC elle-même a un identifiant à part (pas de code INSEE pour
   une intercommunalité), fourni par l'utilisatrice.
   ========================================================= */
const ILLIWAP_TERRITOIRE = (TERRITOIRE.actualites && TERRITOIRE.actualites.type === "illiwap") ? TERRITOIRE.actualites.id : null;

function urlIllwapEmbed(identifiant) {
    return `https://station.illiwap.com/fr/public/${identifiant}/actu/embed`;
}

/* Recale les variantes d'écriture d'un nom de commune (accents, tirets
   vs espaces, apostrophes, casse, "œ" qui ne se décompose pas comme les
   autres accents) pour comparer de façon fiable le champ "commune" de
   couches/services/mairies.geojson (ex. "Beaumont-Pied-De-Boeuf") aux
   noms officiels de COMMUNES_TERRITOIRE (ex. "Beaumont-Pied-de-Bœuf") -
   vérifié sur les 24 communes du territoire, aucun nom orphelin des
   deux côtés une fois normalisé. */
function normaliserNomCommune(nom) {
    return String(nom || "")
        .replace(/œ/gi, "oe")
        .replace(/[-']/g, " ")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

/* Extrait récursivement toutes les Features d'une réponse, quelle que
   soit sa forme exacte (une seule FeatureCollection, un tableau de
   FeatureCollection, un objet {insee: FeatureCollection, ...}...) :
   je n'ai pas pu vérifier la structure exacte du bundler EPCI en
   conditions réelles (accès réseau restreint pendant le développement),
   donc on reste tolérant plutôt que de supposer une forme précise. */
function extraireFeatures(valeur) {
    if (!valeur) return [];
    if (Array.isArray(valeur)) return valeur.flatMap(extraireFeatures);
    if (valeur.type === "FeatureCollection" && Array.isArray(valeur.features)) return valeur.features;
    if (valeur.type === "Feature") return [valeur];
    if (typeof valeur === "object") return Object.values(valeur).flatMap(extraireFeatures);
    return [];
}

/* Complète chaque parcelle avec une référence lisible et le nom de la
   commune (le fichier source ne porte que le code INSEE). */
function fusionnerCadastre(data) {
    const features = extraireFeatures(data).map(feature => {
        const p = feature.properties || {};
        feature.properties = {
            ...p,
            reference: [p.section, p.numero].filter(Boolean).join(" ") || p.id,
            commune_nom: COMMUNES_TERRITOIRE[p.commune] || p.commune,
            surface_m2: p.contenance
        };
        return feature;
    });
    return { type: "FeatureCollection", features };
}

/* Transforme la réponse de l'API historique Opendatasoft (records/1.0/search)
   en GeoJSON standard, pour réutiliser le même pipeline de chargement que
   les couches fichier. Utilisé par les couches "flux" (ex : carburants). */
function geojsonDepuisFluxODS(data) {
    return {
        type: "FeatureCollection",
        features: (data.records || [])
            .filter(rec => rec.geometry)
            .map(rec => ({
                type: "Feature",
                geometry: rec.geometry,
                properties: rec.fields || {}
            }))
    };
}

/* =========================================================
   OPEN DATA DU DÉPARTEMENT DE LA SARTHE (data.sarthe.fr)
   Portail Opendatasoft du Conseil départemental, repris sur
   data.gouv.fr : chantiers sur les routes départementales,
   accès au numérique, consultations PMI, espaces naturels
   sensibles. Interrogé en direct (CORS ouvert, vérifié le
   12/11/2026) : l'export GeoJSON de chaque jeu couvre toute la
   Sarthe, on ne garde que ce qui tombe dans le territoire
   (contour de couches/epci.geojson), avec une marge facultative
   en degrés (les chantiers juste à côté comptent aussi pour qui
   prend la route).
   ========================================================= */
const URL_DATA_SARTHE = "https://data.sarthe.fr/api/explore/v2.1/catalog/datasets";
let promesseContourTerritoire = null;
function contourTerritoire() {
    if (!promesseContourTerritoire) {
        promesseContourTerritoire = fetch("couches/epci.geojson")
            .then(r => r.json())
            .then(d => (d.features || [])[0] || null)
            .catch(() => null);
    }
    return promesseContourTerritoire;
}
function pointRepresentatif(feature) {
    const g = feature.geometry;
    if (!g) return null;
    if (g.type === "Point") return g.coordinates;
    return typeof centroideFeature === "function" ? centroideFeature(feature) : null;
}
function featureDansTerritoire(feature, contour, marge) {
    const pt = pointRepresentatif(feature);
    if (!pt) return false;
    if (!contour) return true; /* contour indisponible : ne rien masquer */
    if (!marge) return pointDansFeature(pt, contour);
    const b = bboxFeature(contour);
    return b && pt[0] >= b[0] - marge && pt[0] <= b[2] + marge && pt[1] >= b[1] - marge && pt[1] <= b[3] + marge;
}
function fetchDataSarthe(dataset, marge = 0) {
    /* Un second essai après 2 s : le serveur coupe parfois une première connexion. */
    const lire = () => fetch(`${URL_DATA_SARTHE}/${dataset}/exports/geojson`).then(r => {
        if (!r.ok) throw new Error("Erreur HTTP " + r.status + " sur data.sarthe.fr (" + dataset + ")");
        return r.json();
    });
    return Promise.all([
        lire().catch(() => new Promise(ok => setTimeout(ok, 2000)).then(lire)),
        contourTerritoire()
    ]).then(([geo, contour]) => ({
        type: "FeatureCollection",
        features: (geo.features || []).filter(f => featureDansTerritoire(f, contour, marge))
    }));
}

/* Chantiers : couleur selon la gêne (route barrée > circulation alternée
   ou restreinte), mot-clé dans mode_exp plutôt qu'une valeur figée. */
function chantierBarre(props) {
    return /barr|ferm/i.test(props.mode_exp || "");
}
function iconeChantier(props) {
    return chantierBarre(props)
        ? { icon: "fa-solid fa-road-barrier", color: "#B5321C" }
        : { icon: "fa-solid fa-person-digging", color: "#E0A030" };
}

/* Tronçon en travaux : le Département ne publie qu'un point (milieu du
   chantier) et une longueur. On retrouve la route dans la BD TOPO de l'IGN
   (même numéro, autour du point) et on la suit de longueur/2 de chaque
   côté du point. C'est une reconstitution, pas le tracé officiel : si la
   route n'est pas trouvée, seul le point est affiché. */
const URL_WFS_GEOPF = "https://data.geopf.fr/wfs/ows";
function metresEntre(a, b) {
    const k = Math.cos((a[1] + b[1]) / 2 * Math.PI / 180);
    return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]) * 111320;
}
function suivreRoute(lignes, depart, budget) {
    /* lignes : tableaux de [lon, lat] ; depart : { i, j, q } = point q sur le
       segment j de la ligne i. Renvoie deux demi-tracés (vers la fin de la
       ligne, vers son début), chacun limité à "budget" mètres. */
    const cle = c => c[0].toFixed(6) + "," + c[1].toFixed(6);
    const noeuds = {};
    lignes.forEach((l, i) => [0, l.length - 1].forEach(k => (noeuds[cle(l[k])] = noeuds[cle(l[k])] || []).push(i)));
    function marcher(i, coords, vus) {
        const trace = [coords[0]];
        let reste = budget, prec = null;
        for (;;) {
            for (let k = 1; k < coords.length; k++) {
                const a = coords[k - 1], b = coords[k], d = metresEntre(a, b);
                if (d >= reste) {
                    const t = d ? reste / d : 0;
                    trace.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
                    return trace;
                }
                trace.push(b); reste -= d; prec = a;
            }
            /* Bout de ligne : on continue sur le tronçon voisin qui prolonge le mieux la direction. */
            const fin = coords[coords.length - 1];
            const cap = Math.atan2(fin[1] - prec[1], fin[0] - prec[0]);
            let mieux = null, ecart = Infinity;
            (noeuds[cle(fin)] || []).forEach(n => {
                if (vus.has(n)) return;
                const l = cle(lignes[n][0]) === cle(fin) ? lignes[n] : lignes[n].slice().reverse();
                let e = Math.abs(Math.atan2(l[1][1] - fin[1], l[1][0] - fin[0]) - cap);
                if (e > Math.PI) e = 2 * Math.PI - e;
                if (e < ecart) { ecart = e; mieux = { n, l }; }
            });
            if (!mieux || ecart > Math.PI / 2) return trace;
            vus.add(mieux.n); i = mieux.n; coords = mieux.l;
        }
    }
    const l = lignes[depart.i];
    const avant = marcher(depart.i, [depart.q].concat(l.slice(depart.j + 1)), new Set([depart.i]));
    const arriere = marcher(depart.i, [depart.q].concat(l.slice(0, depart.j + 1).reverse()), new Set([depart.i]));
    return arriere.reverse().concat(avant.slice(1));
}
function tronconChantier(feature) {
    const p = feature.properties || {}, g = feature.geometry;
    const m = String(p.loc_txt || "").match(/^72_D0*(\d+\w*)/);
    if (!m || !p.longueur || !g || g.type !== "Point") return Promise.resolve(null);
    const [lon, lat] = g.coordinates, r = p.longueur / 2 + 300;
    const dLat = r / 111320, dLon = r / (111320 * Math.cos(lat * Math.PI / 180));
    const filtre = `cpx_numero='D${m[1]}' AND BBOX(geometrie,${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat},'EPSG:4326')`;
    const url = `${URL_WFS_GEOPF}?service=WFS&version=2.0.0&request=GetFeature&typeNames=BDTOPO_V3:troncon_de_route` +
        `&outputFormat=application/json&srsName=EPSG:4326&count=500&propertyName=geometrie,cpx_numero&cql_filter=${encodeURIComponent(filtre)}`;
    return fetch(url).then(r => r.ok ? r.json() : null).then(j => {
        const lignes = [];
        ((j && j.features) || []).forEach(f => {
            const gg = f.geometry || {};
            (gg.type === "MultiLineString" ? gg.coordinates : gg.type === "LineString" ? [gg.coordinates] : [])
                .forEach(l => lignes.push(l.map(c => [c[0], c[1]])));
        });
        if (!lignes.length) return null;
        /* Point le plus proche du chantier sur la route. */
        const k = Math.cos(lat * Math.PI / 180);
        let best = null;
        lignes.forEach((l, i) => {
            for (let jj = 1; jj < l.length; jj++) {
                const a = l[jj - 1], b = l[jj];
                const ax = (b[0] - a[0]) * k, ay = b[1] - a[1], px = (lon - a[0]) * k, py = lat - a[1];
                const t = Math.max(0, Math.min(1, (px * ax + py * ay) / ((ax * ax + ay * ay) || 1)));
                const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
                const d = metresEntre(q, [lon, lat]);
                if (!best || d < best.d) best = { i, j: jj - 1, q, d };
            }
        });
        if (!best || best.d > 150) return null;
        const trace = suivreRoute(lignes, best, p.longueur / 2);
        if (trace.length < 2) return null;
        return { type: "Feature", properties: Object.assign({}, p, { _troncon: true }), geometry: { type: "LineString", coordinates: trace } };
    }).catch(() => null);
}
function fetchChantiers() {
    return fetchDataSarthe("227200029_chantiers_routiers_points", 0.05).then(geo =>
        Promise.all(geo.features.map(tronconChantier)).then(lignes => ({
            type: "FeatureCollection",
            /* Les tracés d'abord, pour que les icônes restent par-dessus. */
            features: lignes.filter(Boolean).concat(geo.features)
        })));
}
function styleChantier(feature) {
    const c = chantierBarre(feature.properties || {}) ? "#B5321C" : "#E0A030";
    return { color: c, weight: 6, opacity: 0.85, lineCap: "round" };
}

/* Collectes de sang de l'EFS (API ouverte « oudonner », CORS ouvert), en
   direct : un point par lieu qui a au moins une collecte à venir, plus les
   maisons du don ouvertes toute l'année. Zone interrogée : le rectangle du
   territoire élargi de 0,1° (une collecte juste à côté compte aussi). */
const URL_EFS = "https://oudonner.api.efs.sante.fr/carto-api/v3/samplingcollection/searchnearpoint";
function fetchDonDuSang() {
    return contourTerritoire().then(contour => {
        const b = (contour && bboxFeature(contour)) || [0.2, 47.6, 0.7, 47.95];
        const m = 0.1, cLat = (b[1] + b[3]) / 2, cLon = (b[0] + b[2]) / 2;
        const url = `${URL_EFS}?CenterLatitude=${cLat}&CenterLongitude=${cLon}` +
            `&DiameterLatitude=${(b[3] - b[1] + 2 * m).toFixed(3)}&DiameterLongitude=${(b[2] - b[0] + 2 * m).toFixed(3)}` +
            `&UserLatitude=${cLat}&UserLongitude=${cLon}`;
        return fetch(url).then(r => {
            if (!r.ok) throw new Error("Erreur HTTP " + r.status + " sur l'API de l'EFS");
            return r.json();
        });
    }).then(j => {
        const auj = new Date(new Date().toDateString());
        const features = [];
        (j.samplingLocationCollections || []).forEach(l => {
            const collectes = (l.collections || []).filter(c => new Date(c.date) >= auj)
                .sort((a, c) => new Date(a.date) - new Date(c.date))
                .map(c => ({ date: c.date.slice(0, 10), matin: [c.morningStartTime, c.morningEndTime], aprem: [c.afternoonStartTime, c.afternoonEndTime],
                    places: c.nbPlacesRestantesST, rdv: c.urlBlood || "" }));
            if (!collectes.length || !l.longitude) return;
            features.push({ type: "Feature", geometry: { type: "Point", coordinates: [l.longitude, l.latitude] },
                properties: { nom: l.convocationLabel || l.name || "Collecte de sang", commune: l.city, adresse: l.fullAddress, collectes, maison: false } });
        });
        (j.samplingLocationEntities_SF || []).forEach(l => {
            if (!l.longitude) return;
            features.push({ type: "Feature", geometry: { type: "Point", coordinates: [l.longitude, l.latitude] },
                properties: { nom: l.convocationLabel || l.name || "Maison du don", commune: l.ville || l.city, adresse: l.fullAddress,
                    horaires: l.horaires, telephone: l.phone, rdv: l.urlBlood || "", collectes: [], maison: true } });
        });
        return { type: "FeatureCollection", features };
    });
}

/* Zones réglementées des PPR (outils/build_ppr.py) : rouge pour les
   zones inconstructibles, bleu pour les zones constructibles sous
   conditions, comme sur les plans officiels. */
const COULEURS_PPR = { "01": "#7FA7D6", "02": "#3E7CB1", "03": "#D9534F", "04": "#9E1F1F", "05": "#5A1A1A" };
function stylePpr(feature) {
    const c = COULEURS_PPR[(feature.properties || {}).type_reglement] || PALETTE.ardoise;
    return { color: c, weight: 1, opacity: 0.9, fillColor: c, fillOpacity: 0.35 };
}
/* Légende du panneau : mêmes couleurs que la carte (COULEURS_PPR), mêmes libellés que outils/build_ppr.py. */
function legendePpr() {
    return { titre: "Règlement de la zone", classes: [
        { color: COULEURS_PPR["01"], label: "Prescriptions (hors zone d'aléa)" },
        { color: COULEURS_PPR["02"], label: "Zone bleue : constructible sous conditions" },
        { color: COULEURS_PPR["03"], label: "Zone rouge : inconstructible, sauf exceptions" },
        { color: COULEURS_PPR["04"], label: "Zone rouge stricte : inconstructible" },
        { color: COULEURS_PPR["05"], label: "Zone de délocalisation" }] };
}

/* Parcelles forestières ONF : simple contour, le numéro s'affiche au
   centre à partir du zoom 14 (étiquette, voir layers.js). */
function styleParcelleForestiere() {
    return { color: "#4F7A3A", weight: 1, opacity: 0.8, fillColor: "#4F7A3A", fillOpacity: 0.05 };
}

/* =========================================================
   POINTS RELAIS & CASIERS COLIS (Mondial Relay, Amazon Locker, Vinted
   Go...)
   Pas de jeu de données dédié publié par un seul opérateur : ces points
   sont en revanche cartographiés dans OpenStreetMap, interrogeable en
   direct via Overpass — même principe de couche "flux" que Vigieau/OLD/
   carburants (voir plus haut), pas de fichier dans le dépôt.

   DEUX tags OSM différents selon le type de point, pas un seul : au
   départ seul amenity=parcel_locker était interrogé, ce qui ne
   remontait quasiment aucun Mondial Relay (2 sur tout le territoire) -
   parce que la grande majorité des points Mondial Relay ne sont PAS des
   casiers automatiques, ce sont des "Points Relais" hébergés dans des
   commerces existants (tabac, presse, épicerie...), tagués sur le
   commerce lui-même via post_office=post_partner (+ post_office:brand/
   post_office:service_provider pour l'enseigne), un schéma OSM distinct
   et bien documenté pour ce cas précis. Amazon Locker et Vinted Go sont
   en revanche presque toujours de vrais casiers automatiques
   (amenity=parcel_locker). La requête interroge donc les deux à la
   fois : couverture qui dépend entièrement de ce que les contributeurs
   OSM ont déjà cartographié localement, les réseaux très récents ou en
   forte expansion (Vinted Go) pouvant rester sous-représentés par
   rapport à la réalité du terrain. Pas de solution miracle à ça : c'est
   la limite du crowdsourcing, à signaler plutôt qu'à cacher (voir le
   bandeau "Ce qui reste à faire" du README).
   ========================================================= */

/* Anciennement : plusieurs couches (casiers colis, médecins, parkings,
   sentiers de randonnée...) interrogeaient OpenStreetMap EN DIRECT via
   Overpass à chaque chargement. Signalé en conditions réelles : requêtes
   lentes, fréquemment en erreur (service public gratuit, souvent
   surchargé), et surtout un filtre par simple rectangle englobant (le
   vrai polygone du territoire fait plus de 4000 sommets, trop pour un
   filtre Overpass "poly:") qui faisait déborder les résultats sur les
   communes limitrophes. Remplacé par des extractions ponctuelles,
   filtrées avec précision sur le vrai polygone de couches/epci.geojson
   puis figées en fichiers statiques (voir le README, section "Couches
   converties en fichiers statiques" pour la méthode et les couches
   abandonnées faute de données suffisantes sur ce territoire). Les
   couches à compléter manuellement (casiers colis, sentiers de
   randonnée, points remarquables de la forêt de Bercé) gardent leur
   fichier local de complément (ex. lockers_manuels.geojson) : voir
   fusionnerFeatureCollections ci-dessous, appelé via `file` en tableau
   dans LAYERS plutôt que par une requête réseau dédiée. */
function fusionnerFeatureCollections(reponses) {
    return { type: "FeatureCollection", features: reponses.flatMap(r => (r && r.features) || []) };
}

/* Couleur = couleur d'enseigne réelle de chaque opérateur (logo), pas une
   couleur de palette générique du site - retour direct de l'utilisatrice
   ("une couleur correspondant au logo"), pour repérer une enseigne au
   coup d'œil sur la carte sans avoir à ouvrir chaque point. Mondial
   Relay et Colissimo/La Poste corrigées (rouge/jaune d'enseigne
   réels, remplaçant à tort le bleu/vert générique du site) ; les
   autres avaient déjà leur vraie couleur de marque. `icon` (nouveau
   champ) sert uniquement à la légende du panneau (construireLegende,
   js/panel.js) - le marqueur sur la carte garde sa propre logique
   d'icône (casier automatique vs point relais en commerce, voir
   iconeLocker plus bas), indépendante de l'enseigne. */
const TYPES_LOCKERS = [
    { id: "mondialrelay", label: "Mondial Relay", color: "#E2001A", icon: "fa-solid fa-box", motifs: ["mondial relay", "mondialrelay", "point relais"] },
    { id: "amazon", label: "Amazon Locker", color: "#FF9900", icon: "fa-solid fa-box", motifs: ["amazon"] },
    { id: "vintedgo", label: "Vinted Go", color: "#09B1BA", icon: "fa-solid fa-box", motifs: ["vinted"] },
    { id: "inpost", label: "InPost", color: "#FFC700", icon: "fa-solid fa-box", motifs: ["inpost"] },
    { id: "chronopost", label: "Chronopost", color: "#001E62", icon: "fa-solid fa-box", motifs: ["chronopost"] },
    { id: "colissimo", label: "Colissimo / La Poste", color: "#FFCD00", icon: "fa-solid fa-box", motifs: ["colissimo", "la poste", "laposte"] },
    { id: "relaiscolis", label: "Relais Colis / Pickup", color: PALETTE.terracotta, icon: "fa-solid fa-box", motifs: ["relais colis", "pickup"] },
    { id: "dpd", label: "DPD Pickup", color: "#DC0032", icon: "fa-solid fa-box", motifs: ["dpd"] },
    { id: "ups", label: "UPS Access Point", color: "#351C15", icon: "fa-solid fa-box", motifs: ["ups"] },
    { id: "hermes", label: "Hermes / Evri", color: "#6E2585", icon: "fa-solid fa-box", motifs: ["hermes", "evri"] }
];
const TYPE_LOCKER_DEFAUT = { id: "autre", label: "Autre opérateur", color: PALETTE.ardoise, icon: "fa-solid fa-box" };

/* Enseigne reconnue par mots-clés plutôt que par une liste de valeurs
   exactes : OSM ne normalise pas parfaitement ces champs (variantes de
   casse/orthographe selon le contributeur), un simple "contient" reste
   robuste à ça. Cherche à la fois dans les champs d'un vrai casier
   (brand/operator/network/name, amenity=parcel_locker) et dans ceux
   d'un point relais hébergé en commerce (post_office:brand/
   post_office:service_provider, post_office=post_partner). */
function categorieLocker(props) {
    const texte = [
        props.brand, props.operator, props.network, props.name,
        props["post_office:brand"], props["post_office:service_provider"]
    ].filter(Boolean).join(" ").toLowerCase();
    return TYPES_LOCKERS.find(cat => cat.motifs.some(m => texte.includes(m))) || TYPE_LOCKER_DEFAUT;
}

/* Icône différente selon le type de point : un vrai casier automatique
   (amenity=parcel_locker) vs un point relais hébergé dans un commerce
   existant (post_office=post_partner) — deux services assez différents
   pour l'usager (une machine en libre-service vs. un dépôt/retrait
   auprès d'un commerçant), au-delà de la seule couleur d'enseigne. */
function estPointRelaisCommerce(props) {
    return props.post_office === "post_partner";
}
function iconeLocker(feature) {
    const props = feature.properties || {};
    return {
        icon: estPointRelaisCommerce(props) ? "fa-solid fa-store" : "fa-solid fa-box",
        color: categorieLocker(props).color
    };
}
/* Point d'extension utilisé par layers.js pour répartir les lockers en
   sous-couches indépendantes par enseigne (légende à cases à cocher,
   même mécanisme que les commerces/categoriePourFeature) - retour
   direct de l'utilisatrice ("les différencier dans la légende"). */
function categorieLockerPourFeature(feature) {
    return categorieLocker(feature.properties || {}).id;
}

/* =========================================================
   ÉQUIPEMENTS SPORTIFS - icône/légende par type de sport
   Retour direct de l'utilisatrice : "équipementSportif" différenciait
   déjà ses tuiles par type de sport dans le décompte du dashboard
   commune (js/communes.js), mais affichait un seul icône générique pour
   toute la couche sur la CARTE, sans légende. Source unique ici
   (réutilisée par communes.js pour le décompte, voir COUCHES_DECOMPTE_COMMUNE)
   plutôt que deux listes d'icônes à maintenir en double.
   Clé = valeur brute OSM du champ "sport" (vérifiée réelle sur les 102
   équipements du territoire : 17 valeurs distinctes, toutes listées
   ci-dessous). "sport1;sport2" (un seul cas réel sur ce territoire)
   n'utilise que la première valeur pour le classement/l'icône - popup
   et libellé de tuile continuent d'afficher la liste complète via
   labelSport (js/popup.js). Couleur uniforme (comme le décompte
   existant) : seule l'icône distingue les catégories, aucune nouvelle
   couleur inventée. Icône générique (fa-medal) partagée par les sports
   sans pictogramme Font Awesome adapté trouvé (tennis, handball,
   billard, skateboard) plutôt qu'un icône approximatif/trompeur -
   restent malgré tout des entrées de légende distinctes, avec leur
   propre libellé et case à cocher. */
const TYPES_SPORT = [
    { id: "soccer", label: "Football", icon: "fa-solid fa-futbol" },
    { id: "boules", label: "Boules / pétanque", icon: "fa-solid fa-bowling-ball" },
    { id: "tennis", label: "Tennis", icon: "fa-solid fa-medal" },
    { id: "multi", label: "Multisports", icon: "fa-solid fa-vector-square" },
    { id: "swimming", label: "Natation", icon: "fa-solid fa-person-swimming" },
    { id: "basketball", label: "Basketball", icon: "fa-solid fa-basketball" },
    { id: "athletics", label: "Athlétisme", icon: "fa-solid fa-stopwatch" },
    { id: "equestrian", label: "Équitation", icon: "fa-solid fa-horse" },
    { id: "table_tennis", label: "Tennis de table", icon: "fa-solid fa-table-tennis-paddle-ball" },
    { id: "running", label: "Course à pied", icon: "fa-solid fa-person-running" },
    { id: "handball", label: "Handball", icon: "fa-solid fa-medal" },
    { id: "billiards", label: "Billard", icon: "fa-solid fa-medal" },
    { id: "skateboard", label: "Skateboard", icon: "fa-solid fa-medal" },
    { id: "volleyball", label: "Volleyball", icon: "fa-solid fa-volleyball" },
    { id: "cycling", label: "Cyclisme", icon: "fa-solid fa-person-biking" },
    { id: "motocross", label: "Motocross", icon: "fa-solid fa-motorcycle" },
    { id: "ultralight_aviation", label: "Aviation légère (ULM)", icon: "fa-solid fa-plane" }
].map(t => ({ ...t, color: PALETTE.riviere }));
const TYPE_SPORT_DEFAUT = { id: "autre", label: "Équipement sportif", icon: "fa-solid fa-medal", color: PALETTE.riviere };

function categorieSport(props) {
    const brut = props.sport ? String(props.sport).split(";")[0].trim() : null;
    if (!brut) return TYPE_SPORT_DEFAUT;
    return TYPES_SPORT.find(t => t.id === brut) || TYPE_SPORT_DEFAUT;
}
function iconeEquipementSportif(feature) {
    const cat = categorieSport(feature.properties || {});
    return { icon: cat.icon, color: cat.color };
}
function categorieEquipementSportifPourFeature(feature) {
    return categorieSport(feature.properties || {}).id;
}
/* Même souci que sousTitreCommerce/sousTitreBanque (js/config.js, plus
   haut) : subtitleFields affichait le champ "sport" brut ("soccer")
   plutôt que traduit - corrigé au passage puisque déjà en train de
   toucher cette couche. labelSport (js/popup.js) gère aussi les
   combinaisons "sport1;sport2" pour l'affichage complet, contrairement
   à categorieSport qui ne garde que la première valeur pour le
   classement/l'icône. */
function sousTitreEquipementSportif(feature) {
    const props = feature.properties || {};
    const sport = (typeof labelSport === "function") ? labelSport(props.sport) : null;
    return [sport, props.com_nom].filter(Boolean).join(" · ");
}

function categoriePatrimoineRural(props) {
    if (props.historic === "wayside_cross") return { id: "croix", label: "Calvaire", icon: "fa-solid fa-cross", color: PALETTE.ardoise };
    if (props.man_made === "wash_house") return { id: "lavoir", label: "Lavoir", icon: "fa-solid fa-water", color: PALETTE.riviere };
    if (props.man_made === "watermill" || props.historic === "mill") return { id: "moulin", label: "Moulin", icon: "fa-solid fa-industry", color: PALETTE.terracotta };
    if (props.amenity === "fountain") return { id: "fontaine", label: "Fontaine", icon: "fa-solid fa-droplet", color: PALETTE.riviere };
    return { id: "autre", label: "Petit patrimoine", icon: "fa-solid fa-landmark", color: "#8A7F78" };
}
function iconePatrimoineRural(feature) {
    const cat = categoriePatrimoineRural(feature.properties || {});
    return { icon: cat.icon, color: cat.color };
}

function categoriePointRemarquableBerce(props) {
    if (props.natural === "tree") return { id: "arbre", label: "Arbre remarquable", icon: "fa-solid fa-tree", color: PALETTE.foret };
    if (props.natural === "spring") return { id: "source", label: "Source", icon: "fa-solid fa-water", color: PALETTE.riviere };
    return { id: "attraction", label: "Point remarquable", icon: "fa-solid fa-star", color: PALETTE.terracotta };
}
function iconePointRemarquableBerce(feature) {
    const cat = categoriePointRemarquableBerce(feature.properties || {});
    return { icon: cat.icon, color: cat.color };
}

/* =========================================================
   HISTORIQUE DES CATASTROPHES NATURELLES (CATNAT/GASPAR)
   API Géorisques v1 (georisques.gouv.fr), endpoint CATNAT, en accès
   libre sans jeton - confirmé joignable (ex. .../api/v1/gaspar/catnat
   ?code_insee=30007&page_size=20), MAIS forme exacte de la réponse (nom
   du champ contenant la liste, noms des champs par événement) non
   vérifiable en conditions réelles (accès réseau restreint pendant le
   développement, comme pour la couche OLD/WMS - voir README). Interrogé
   commune par commune (code_insee), contrairement à Overpass qui
   accepte un rectangle englobant pour tout le territoire d'un coup :
   forme de requête différente d'une API à l'autre, pas de mutualisation
   possible avec un simple fichier statique. Géométrie des communes reprise de
   couches/communes.geojson (déjà dans le dépôt) plutôt que demandée à
   Géorisques : seuls les événements viennent du flux distant. */
const CACHE_CATNAT_CLE = TERRITOIRE.id + "-cache-catnat";
const CACHE_CATNAT_DUREE_MS = 24 * 60 * 60 * 1000; // historique d'arrêtés, change rarement : cache plus long que les flux Overpass

function lireCacheCatnat() {
    try {
        const brut = localStorage.getItem(CACHE_CATNAT_CLE);
        if (!brut) return null;
        const { horodatage, donnees } = JSON.parse(brut);
        if (!horodatage || Date.now() - horodatage > CACHE_CATNAT_DUREE_MS) return null;
        return donnees;
    } catch (_) {
        return null;
    }
}
function ecrireCacheCatnat(donnees) {
    try {
        localStorage.setItem(CACHE_CATNAT_CLE, JSON.stringify({ horodatage: Date.now(), donnees }));
    } catch (_) {
        // silencieux : le cache est un confort, pas un besoin
    }
}
/* Plusieurs enveloppes de réponse possibles selon la version/le format
   exact de l'API (tableau brut, {data:[...]}, {results:[...]}...) :
   lecture tolérante plutôt que de supposer une forme précise. */
function elementsReponseCatnat(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.items)) return data.items;
    return [];
}
function recupererCatnat() {
    const enCache = lireCacheCatnat();
    if (enCache) return Promise.resolve(enCache);

    const parCommune = Object.keys(COMMUNES_TERRITOIRE).map(code =>
        fetch(`https://georisques.gouv.fr/api/v1/gaspar/catnat?code_insee=${code}&page_size=50`)
            .then(r => r.ok ? r.json() : null)
            .then(data => ({ insee: code, evenements: elementsReponseCatnat(data) }))
            .catch(() => ({ insee: code, evenements: [] }))
    );
    return Promise.all(parCommune).then(resultats => { ecrireCacheCatnat(resultats); return resultats; });
}
function fetchCatnat() {
    return Promise.all([
        fetch("couches/communes.geojson").then(r => r.json()),
        recupererCatnat()
    ]).then(([communes, resultats]) => ({ communes, resultats }));
}
/* Une Feature par commune (le polygone existant), pas une par événement :
   plusieurs arrêtés concernent en général la même commune (inondations à
   répétition, sécheresse...), les regrouper sous un seul polygone évite
   d'empiler des dizaines de marqueurs identiques. */
function geojsonDepuisCatnat(data) {
    const parInsee = {};
    (data.resultats || []).forEach(r => { parInsee[r.insee] = r.evenements; });
    const features = ((data.communes && data.communes.features) || []).map(f => ({
        ...f,
        properties: { ...f.properties, catnat_evenements: parInsee[f.properties.code_insee] || [] }
    }));
    return { type: "FeatureCollection", features };
}
/* Dégradé par nombre d'événements recensés, pas par montant (couleurPrix
   ne convient pas à un compte d'événements) : gris si aucun arrêté
   connu, puis 3 paliers du jaune au rouge - seuils choisis pour rester
   lisibles avec les petits nombres typiques d'un historique communal. */
function couleurCatnat(nb) {
    if (!nb) return "#D8D6D0";
    if (nb <= 3) return "#F2C94C";
    if (nb <= 7) return "#F2994A";
    return "#8E4458";
}
function styleCatnat(feature) {
    const nb = (feature.properties.catnat_evenements || []).length;
    return { color: "#fff", weight: 1, fillColor: couleurCatnat(nb), fillOpacity: 0.55 };
}

/* =========================================================
   QUALITÉ DE L'EAU POTABLE (Hub'Eau)
   Retour direct de l'utilisatrice : au départ une carte du dashboard
   commune uniquement (chargerQualiteEauCommune, js/communes.js - une
   seule commune à la fois, appelée à la demande à l'ouverture du
   dashboard). Demande ensuite d'une vraie couche sur la carte - mais
   Hub'Eau ne renvoie pas de coordonnées précises (un résultat est
   rattaché à une commune/UDI, pas à un point), un marqueur ponctuel
   inventerait donc une localisation qui n'existe pas dans la donnée.
   Même solution que pour CATNAT juste au-dessus (même souci : une
   valeur par commune, pas de géométrie propre) : choroplèthe sur les
   polygones de couches/communes.geojson (déjà dans le dépôt), un appel
   Hub'Eau par commune du territoire (24 appels, code_commune par
   code_commune - l'API ne filtre pas sur plusieurs communes à la fois).
   Cache localStorage 24h comme CATNAT : un contrôle sanitaire ne change
   pas d'un chargement de page à l'autre, inutile de refaire les 24
   appels à chaque fois. */
const CACHE_QUALITE_EAU_CLE = TERRITOIRE.id + "-cache-qualite-eau";
const CACHE_QUALITE_EAU_DUREE_MS = 24 * 60 * 60 * 1000;
const URL_HUBEAU_EAU_POTABLE = "https://hubeau.eaufrance.fr/api/v1/qualite_eau_potable/resultats_dis";

function lireCacheQualiteEau() {
    try {
        const brut = localStorage.getItem(CACHE_QUALITE_EAU_CLE);
        if (!brut) return null;
        const { horodatage, donnees } = JSON.parse(brut);
        if (!horodatage || Date.now() - horodatage > CACHE_QUALITE_EAU_DUREE_MS) return null;
        return donnees;
    } catch (_) {
        return null;
    }
}
function ecrireCacheQualiteEau(donnees) {
    try {
        localStorage.setItem(CACHE_QUALITE_EAU_CLE, JSON.stringify({ horodatage: Date.now(), donnees }));
    } catch (_) {
        // silencieux : le cache est un confort, pas un besoin
    }
}
function recupererQualiteEauTerritoire() {
    const enCache = lireCacheQualiteEau();
    if (enCache) return Promise.resolve(enCache);

    const parCommune = Object.keys(COMMUNES_TERRITOIRE).map(code =>
        fetch(`${URL_HUBEAU_EAU_POTABLE}?code_commune=${code}&size=1&sort=desc`)
            .then(r => r.ok ? r.json() : null)
            .then(d => ({ insee: code, resultat: (d && d.data && d.data[0]) || null }))
            .catch(() => ({ insee: code, resultat: null }))
    );
    return Promise.all(parCommune).then(resultats => { ecrireCacheQualiteEau(resultats); return resultats; });
}
function fetchQualiteEauTerritoire() {
    return Promise.all([
        fetch("couches/communes.geojson").then(r => r.json()),
        recupererQualiteEauTerritoire()
    ]).then(([communes, resultats]) => ({ communes, resultats }));
}
function geojsonDepuisQualiteEau(data) {
    const parInsee = {};
    (data.resultats || []).forEach(r => { parInsee[r.insee] = r.resultat; });
    const features = ((data.communes && data.communes.features) || []).map(f => ({
        ...f,
        properties: { ...f.properties, qualite_eau_resultat: parInsee[f.properties.code_insee] || null }
    }));
    return { type: "FeatureCollection", features };
}
/* Trois niveaux, comme l'outil « Qu'y a-t-il dans l'eau de mon robinet ? »
   (hirund·AGE/eau) : une eau peut respecter toutes les LIMITES de qualité
   (sanitaires) tout en dépassant une RÉFÉRENCE de qualité (confort, bon
   fonctionnement : fer, turbidité, etc.) - c'est « conforme, avec une
   réserve », pas « non conforme ». Un simple test sur la phrase de
   conclusion qui contiendrait « non conforme » classait à tort ce cas en
   « non conforme » (retour de l'utilisatrice, Montval-sur-Loir).
   On lit d'abord les indicateurs du prélèvement (conformite_limites_* /
   conformite_references_*, "N" = non conforme, comme dans l'outil eau),
   et à défaut la phrase de conclusion. En cas de doute, on reste
   prudent : une phrase « non conforme » dont on ne reconnaît pas la
   nature est classée « non conforme », jamais « conforme ». */
const NIVEAUX_EAU = {
    conforme: { label: "Conforme", color: PALETTE.feuille, icon: "fa-circle-check",
        texte: "Toutes les limites de qualité sont respectées au dernier prélèvement." },
    reserve: { label: "Conforme, avec une réserve", color: "#E0A030", icon: "fa-circle-exclamation",
        texte: "Les limites de qualité sont respectées, mais une référence de confort ou de bon fonctionnement est dépassée." },
    non_conforme: { label: "Non conforme", color: "#8E4458", icon: "fa-triangle-exclamation",
        texte: "Au dernier prélèvement, au moins une limite de qualité est dépassée. Suivez les consignes de votre mairie ou de l'ARS." }
};
function niveauConformiteEau(resultat) {
    if (!resultat) return null;
    const drapeau = champ => String(resultat[champ] || "").toUpperCase();
    const limitesN = drapeau("conformite_limites_bact_prelevement") === "N" || drapeau("conformite_limites_pc_prelevement") === "N";
    const referencesN = drapeau("conformite_references_bact_prelevement") === "N" || drapeau("conformite_references_pc_prelevement") === "N";
    const aDesIndicateurs = ["conformite_limites_bact_prelevement", "conformite_limites_pc_prelevement",
        "conformite_references_bact_prelevement", "conformite_references_pc_prelevement"].some(c => drapeau(c));
    if (aDesIndicateurs) return limitesN ? "non_conforme" : referencesN ? "reserve" : "conforme";

    const phrase = String(resultat.conclusion_conformite_prelevement || "");
    if (!phrase) return null;
    if (/non\s+conforme\s+aux\s+limites/i.test(phrase)) return "non_conforme";
    if (/non\s+conforme\s+aux\s+r[ée]f[ée]rences/i.test(phrase)) return "reserve";
    return /non\s+conforme/i.test(phrase) ? "non_conforme" : "conforme";
}
/* Conservé pour les appelants existants : « non conforme » au sens strict
   (limite dépassée), pas la simple réserve. */
function qualiteEauNonConforme(resultat) {
    return niveauConformiteEau(resultat) === "non_conforme";
}
function styleQualiteEau(feature) {
    const resultat = feature.properties.qualite_eau_resultat;
    const niveau = niveauConformiteEau(resultat);
    if (!resultat || !resultat.conclusion_conformite_prelevement || !niveau) {
        return { color: "#fff", weight: 1, fillColor: "#D8D6D0", fillOpacity: 0.5 };
    }
    return { color: "#fff", weight: 1, fillColor: NIVEAUX_EAU[niveau].color, fillOpacity: 0.55 };
}

/* Légendes des couches en dégradé (choroplèthes) : fonctions appelées à l'affichage du panneau,
   les couleurs sont lues sur les mêmes fonctions que les cartes (couleurPrix, couleurPopulation,
   NIVEAUX_EAU) pour que légende et carte ne divergent jamais. */
function legendePrix() {
    return { titre: "Prix au m²", classes: [
        { color: couleurPrix(900), label: "moins de 1 000 €" }, { color: couleurPrix(1100), label: "1 000 à 1 300 €" },
        { color: couleurPrix(1400), label: "1 300 à 1 600 €" }, { color: couleurPrix(1700), label: "1 600 à 1 900 €" },
        { color: couleurPrix(2000), label: "1 900 à 2 200 €" }, { color: couleurPrix(2400), label: "2 200 à 2 600 €" },
        { color: couleurPrix(3000), label: "plus de 2 600 €" }, { color: couleurPrix(null), label: "pas assez de ventes / non calculable" }] };
}
function legendePopulation() {
    return { titre: "Habitants", classes: [
        { color: couleurPopulation(100), label: "moins de 300" }, { color: couleurPopulation(400), label: "300 à 600" },
        { color: couleurPopulation(800), label: "600 à 1 000" }, { color: couleurPopulation(1200), label: "1 000 à 1 500" },
        { color: couleurPopulation(2000), label: "1 500 à 2 500" }, { color: couleurPopulation(3000), label: "plus de 2 500" },
        { color: couleurPopulation(null), label: "donnée absente" }] };
}
function legendeQualiteEau() {
    return { titre: "Dernier contrôle sanitaire", classes: [
        { color: NIVEAUX_EAU.conforme.color, label: NIVEAUX_EAU.conforme.label },
        { color: NIVEAUX_EAU.reserve.color, label: NIVEAUX_EAU.reserve.label },
        { color: NIVEAUX_EAU.non_conforme.color, label: NIVEAUX_EAU.non_conforme.label },
        { color: "#D8D6D0", label: "pas de résultat" }] };
}
function legendeMutations() {
    const l = legendePrix();
    return { titre: "Prix au m² de la dernière vente", classes: l.classes.slice(0, 7).concat([{ color: couleurPrix(null), label: "prix non calculable (terrain nu...)" }]) };
}

/* =========================================================
   OBSERVATIONS NATURE (GBIF, interrogé en direct sur la zone affichée)
   Comme un portail naturaliste : un point par observation de faune ou de flore, coloré par grand groupe.
   Source : observations ouvertes de GBIF (INPN, iNaturalist, eBird...), avec leur licence et leur origine
   indiquées dans la fiche. Seules les observations bien localisées (précision <= 1 km) sont gardées, et
   au plus OBS_NATURE_MAX par écran : zoomer pour voir le détail. Les noms français viennent de
   couches/nature/noms_especes.json (outils/build_noms_especes.py), à défaut le nom latin.
   ========================================================= */
const OBS_NATURE_MAX = 250;
const TYPES_OBS_NATURE = [
    { id: "oiseaux", label: "Oiseaux", icon: "fa-solid fa-dove", color: "#3E7CB1" },
    { id: "mammiferes", label: "Mammifères", icon: "fa-solid fa-paw", color: "#A0603A" },
    { id: "reptiles", label: "Reptiles", icon: "fa-solid fa-staff-snake", color: "#6B8E4E" },
    { id: "amphibiens", label: "Amphibiens", icon: "fa-solid fa-frog", color: "#2E8B7A" },
    { id: "insectes", label: "Insectes", icon: "fa-solid fa-bug", color: "#C98A2B" },
    { id: "plantes", label: "Plantes", icon: "fa-solid fa-leaf", color: "#5E8C61" }
];
const TYPE_OBS_NATURE_DEFAUT = { id: "autres", label: "Autres (champignons, araignées...)", icon: "fa-solid fa-feather", color: "#8A7F78" };
const CLASSES_OBS_NATURE = { 212: "oiseaux", 359: "mammiferes", 358: "reptiles", 131: "amphibiens", 216: "insectes" };
function categorieObservationNature(feature) {
    return (feature.properties || {}).groupe || "autres";
}
let nomsEspecesEnCache = null;
function chargerNomsEspeces() {
    if (!nomsEspecesEnCache) {
        nomsEspecesEnCache = fetch("couches/nature/noms_especes.json").then(r => r.ok ? r.json() : {}).catch(() => ({}));
    }
    return nomsEspecesEnCache;
}
/* WKT (sens trigonométrique, comme l'exige GBIF) du rectangle affiché. */
function wktRectangle(b) {
    const w = b.getWest().toFixed(5), e = b.getEast().toFixed(5), s = b.getSouth().toFixed(5), n = b.getNorth().toFixed(5);
    return `POLYGON((${w} ${s}, ${e} ${s}, ${e} ${n}, ${w} ${n}, ${w} ${s}))`;
}
/* Périodes proposées dans le panneau (mois = durée remontée depuis aujourd'hui, null = toutes les années). */
const PERIODES_OBS_NATURE = [
    { id: "12m", label: "12 derniers mois", mois: 12 },
    { id: "3a", label: "3 dernières années", mois: 36 },
    { id: "toutes", label: "Toutes les années", mois: null }
];
function plageDatesObservations(periodeId) {
    const p = PERIODES_OBS_NATURE.find(x => x.id === periodeId) || PERIODES_OBS_NATURE[0];
    if (!p.mois) return null;
    const fin = new Date(), debut = new Date();
    debut.setMonth(debut.getMonth() - p.mois);
    const iso = d => d.toISOString().slice(0, 10);
    return `${iso(debut)},${iso(fin)}`;
}
function fetchObservationsNature(bounds) {
    const params = new URLSearchParams({ geometry: wktRectangle(bounds), limit: String(OBS_NATURE_MAX), hasCoordinate: "true",
        hasGeospatialIssue: "false", occurrenceStatus: "PRESENT", coordinateUncertaintyInMeters: "0,1000" });
    const plage = plageDatesObservations((LAYERS.find(l => l.id === "observationsNature") || {}).periodeActive);
    if (plage) params.set("eventDate", plage);
    ["HUMAN_OBSERVATION", "OBSERVATION", "MACHINE_OBSERVATION"].forEach(b => params.append("basisOfRecord", b));
    return Promise.all([
        fetch("https://api.gbif.org/v1/occurrence/search?" + params).then(r => { if (!r.ok) throw new Error("GBIF " + r.status); return r.json(); }),
        chargerNomsEspeces()
    ]).then(([rep, noms]) => ({
        type: "FeatureCollection",
        total: rep.count,
        features: (rep.results || []).filter(o => typeof o.decimalLatitude === "number" && typeof o.decimalLongitude === "number").map(o => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [o.decimalLongitude, o.decimalLatitude] },
            properties: {
                cle: o.key, espece_cle: o.speciesKey || null,
                nom: noms[o.speciesKey] || null, latin: o.species || o.scientificName || null,
                nom_anglais: o.vernacularName || null,
                groupe: CLASSES_OBS_NATURE[o.classKey] || (o.kingdom === "Plantae" ? "plantes" : "autres"),
                date: o.eventDate || null, statut_uicn: o.iucnRedListCategory || null,
                jeu: o.datasetName || o.institutionCode || null, licence: o.license || null,
                precision_m: o.coordinateUncertaintyInMeters || null
            }
        }))
    }));
}

/* Couleur par opérateur pour les antennes-relais (couches/services/antennes.geojson) :
   comparaison par mot-clé plutôt que valeur exacte du champ "operator",
   dont les variantes réelles observées dans ce fichier sont multiples
   pour un même opérateur (ex. "Orange" et "Orange Services Fixes",
   "Free Mobile" et "IFW-Free") - vérifié sur les 33 features du fichier
   avant d'écrire cette liste, pas une supposition. Les opérateurs
   d'infrastructure (TDF, ATC France, Itas Tim - propriétaires du
   pylône, pas forcément l'opérateur qui l'exploite) et les antennes
   sans "operator" renseigné (1/3 du fichier) tombent dans "autres". */
const OPERATEURS_ANTENNES = [
    { id: "orange", label: "Orange", icon: "fa-solid fa-tower-cell", motCle: "orange", color: "#FF7900" },
    { id: "bouygues", label: "Bouygues Telecom", icon: "fa-solid fa-tower-cell", motCle: "bouygues", color: PALETTE.riviere },
    { id: "sfr", label: "SFR", icon: "fa-solid fa-tower-cell", motCle: "sfr", color: "#D6193C" },
    { id: "free", label: "Free", icon: "fa-solid fa-tower-cell", motCle: "free", color: PALETTE.ardoise }
];
const OPERATEUR_ANTENNE_DEFAUT = { id: "autre", label: "Autre / non renseigné", icon: "fa-solid fa-tower-cell", color: "#B8C0BD" };

function operateurAntenne(feature) {
    const operateur = (feature.properties.operator || "").toLowerCase();
    return OPERATEURS_ANTENNES.find(o => operateur.includes(o.motCle)) || OPERATEUR_ANTENNE_DEFAUT;
}
/* Point d'extension utilisé par icons.js/layers.js : couleur du marqueur. */
function iconeAntenne(feature) {
    const op = operateurAntenne(feature);
    return { icon: op.icon, color: op.color };
}
/* Point d'extension utilisé par layers.js pour la légende du panneau
   (voir TYPES_COMMERCES/categoriePourFeature, même mécanisme). */
function categorieAntenne(feature) {
    return operateurAntenne(feature).id;
}

/* =========================================================
   COUCHES
   type: "point" | "line" | "polygon" | "choropleth"
   lazy: true  -> chargée seulement quand l'utilisateur coche la couche
         false -> chargée au démarrage (fichiers légers, utiles à la recherche)
   searchable: la couche alimente la recherche unifiée
   titleFields: liste de clés de propriétés à essayer, dans l'ordre,
                pour trouver le nom à afficher (titre popup + recherche)
   ========================================================= */
const LAYERS = [

    /* ---------- SERVICES ---------- */
    {
        id: "mairies", group: "services", label: "Mairies",
        file: "couches/services/mairies.geojson", type: "point",
        icon: "fa-solid fa-landmark", color: PALETTE.riviere,
        lazy: false, searchable: true, cluster: false,
        titleFields: ["name", "commune"],
        subtitleFields: ["opening_hours", "contact_phone"]
    },
    {
        id: "bal", group: "services", label: "Boîtes aux lettres",
        file: "couches/services/bal.geojson", type: "point",
        icon: "fa-solid fa-envelope", color: PALETTE.ardoise,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["LB_VOIE_EXT", "LB_COM"],
        subtitleFields: ["LB_COM", "CO_POSTAL"]
    },
    {
        id: "dechets", group: "services", label: "Déchèteries / tri",
        file: "couches/services/dechets.geojson", type: "point",
        icon: "fa-solid fa-recycle", color: PALETTE.feuille,
        iconePourFeature: iconeDechet,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "type", "com_nom"],
        subtitleFields: ["com_nom", "opening_hours"]
    },
    {
        id: "lockers", group: "services", label: "Points relais & casiers colis",
        /* Extrait statique d'OpenStreetMap (casiers automatiques + points
           relais en commerce), filtré sur le vrai polygone du territoire -
           voir le README, section "Couches converties en fichiers
           statiques". Fusionné avec lockers_manuels.geojson, où
           l'utilisatrice ajoute elle-même les casiers (ex. Mondial Relay)
           pas encore cartographiés sur OSM - fusionnerFeatureCollections
           combine les deux fichiers, `file` accepte un tableau d'URL. */
        file: ["couches/services/lockers_osm.geojson", "couches/services/lockers_manuels.geojson"],
        transform: fusionnerFeatureCollections,
        type: "point", icon: "fa-solid fa-box", color: PALETTE.ardoise,
        iconePourFeature: iconeLocker,
        legend: TYPES_LOCKERS, legendDefaut: TYPE_LOCKER_DEFAUT, categoriser: categorieLockerPourFeature,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "brand", "ref"],
        subtitleFields: ["brand", "operator"]
    },
    {
        id: "irve", group: "services", label: "Bornes de recharge",
        file: "couches/services/irve.geojson", type: "point",
        icon: "fa-solid fa-charging-station", color: PALETTE.terracotta,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["nom_station", "nom_enseigne"],
        subtitleFields: ["adresse_station", "nbre_pdc"]
    },
    {
        id: "marches", group: "services", label: "Marchés",
        file: "couches/services/marches.geojson", type: "point",
        icon: "fa-solid fa-store", color: PALETTE.feuille,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "amenity"],
        subtitleFields: []
    },
    {
        id: "airesJeu", group: "services", label: "Aires de jeux",
        /* sansPopup : voir fontaines/parkings/antennes plus haut, même
           raison - vérifié sur les 14 features du fichier, aucune n'a de
           "name" renseigné et min_age/max_age/access ne le sont chacun
           que sur 1 seule. */
        file: "couches/services/airesJeu.geojson", type: "point",
        icon: "fa-solid fa-child-reaching", color: PALETTE.terracotta,
        sansPopup: true,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["min_age", "max_age"]
    },
    {
        id: "equipementSportif", group: "services", label: "Équipements sportifs",
        file: "couches/services/equipementSportif.geojson", type: "point",
        icon: "fa-solid fa-futbol", color: PALETTE.riviere,
        iconePourFeature: iconeEquipementSportif, sousTitrePourFeature: sousTitreEquipementSportif,
        legend: TYPES_SPORT, legendDefaut: TYPE_SPORT_DEFAUT, categoriser: categorieEquipementSportifPourFeature,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "sport", "com_nom"]
    },
    {
        id: "bibliotheques", group: "services", label: "Bibliothèques & médiathèques",
        /* Extrait statique d'OpenStreetMap, filtré sur le vrai polygone du
           territoire - voir le README, section "Couches converties en
           fichiers statiques". */
        file: "couches/services/bibliotheques.geojson",
        type: "point", icon: "fa-solid fa-book", color: PALETTE.foret,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["opening_hours"]
    },
    {
        id: "franceServices", group: "services", label: "France Services",
        /* Extrait filtré sur le territoire (3 points) du fichier national
           "Liste des structures labellisées France services" (ANCT,
           data.gouv.fr), fourni par l'utilisatrice le 10/09/2026 - voir le
           README pour la procédure de mise à jour (pas de flux public
           filtrable par territoire côté ANCT, contrairement à Overpass). */
        file: "couches/services/franceServices.geojson", type: "point",
        icon: "fa-solid fa-people-roof", color: PALETTE.riviere,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["lib_fs"],
        subtitleFields: ["lib_com", "format_fs"]
    },
    {
        id: "toilettes", group: "services", label: "Toilettes publiques",
        /* Extrait statique d'OpenStreetMap, filtré sur le vrai polygone du
           territoire - voir le README. */
        file: "couches/services/toilettes.geojson",
        type: "point", icon: "fa-solid fa-restroom", color: PALETTE.ardoise,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["opening_hours"]
    },
    {
        id: "fontaines", group: "services", label: "Points d'eau potable",
        /* sansPopup : données OSM presque toujours trop pauvres pour une
           fiche (souvent juste le tag "amenity=drinking_water", rien
           d'autre) - décidé avec l'utilisatrice, voir README. */
        file: "couches/services/fontaines.geojson",
        type: "point", icon: "fa-solid fa-droplet", color: PALETTE.riviere,
        sansPopup: true,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: []
    },
    {
        id: "parkings", group: "services", label: "Parkings publics",
        /* sansPopup : voir fontaines ci-dessus, même raison (capacité/
           accès rarement renseignés sur ce territoire). */
        file: "couches/services/parkings.geojson",
        type: "point", icon: "fa-solid fa-square-parking", color: PALETTE.ardoise,
        sansPopup: true,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["capacity", "fee"]
    },
    {
        id: "antennes", group: "services", label: "Antennes-relais mobiles",
        /* Pivot depuis l'idée initiale de couche WMS ARCEP (couverture
           mobile) - voir le README pour le détail.
           sansPopup : voir fontaines ci-dessus, l'opérateur est souvent
           absent des données OSM. */
        file: "couches/services/antennes.geojson",
        type: "point", icon: "fa-solid fa-tower-cell", color: PALETTE.ardoise,
        iconePourFeature: iconeAntenne,
        legend: OPERATEURS_ANTENNES, legendDefaut: OPERATEUR_ANTENNE_DEFAUT, categoriser: categorieAntenne,
        sansPopup: true,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["operator", "ref"],
        subtitleFields: ["operator"]
    },

    /* ---------- FAMILLE ---------- */
    {
        id: "petiteEnfance", group: "famille", label: "Petite enfance",
        file: "couches/famille/petiteEnfance.geojson", type: "point",
        icon: "fa-solid fa-baby", color: PALETTE.terracotta,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["nom"],
        subtitleFields: ["adresse", "telephone", "type"]
    },
    {
        id: "education", group: "famille", label: "Écoles",
        file: "couches/famille/education.geojson", type: "point",
        icon: "fa-solid fa-graduation-cap", color: PALETTE.terracotta,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "type_fr", "com_nom"],
        subtitleFields: ["type_fr", "com_nom"]
    },

    /* ---------- COMMERCES ---------- */
    {
        id: "commerces", group: "commerces", label: "Commerces & services",
        file: "couches/commerces/commerces.geojson", type: "point",
        icon: "fa-solid fa-basket-shopping", color: PALETTE.feuille,
        iconePourFeature: iconeCommerce, sousTitrePourFeature: sousTitreCommerce,
        legend: TYPES_COMMERCES, legendDefaut: TYPE_COMMERCE_DEFAUT, categoriser: categoriePourFeature,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "brand", "type"]
    },
    {
        id: "banques", group: "commerces", label: "Banques & DAB",
        file: "couches/commerces/banques.geojson", type: "point",
        icon: "fa-solid fa-money-bill-wave", color: PALETTE.ardoise,
        sousTitrePourFeature: sousTitreBanque,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "brand", "com_nom"]
    },
    {
        id: "artisans", group: "commerces", label: "Artisans",
        file: "couches/commerces/artisans.geojson", type: "point",
        icon: "fa-solid fa-hammer", color: PALETTE.ardoise,
        iconePourFeature: iconeArtisan, sousTitrePourFeature: sousTitreArtisan, motsClesPourFeature: motsClesArtisan,
        legend: TYPES_ARTISANS, legendDefaut: TYPE_ARTISAN_DEFAUT, categoriser: feature => categorieArtisan(feature).id,
        transform: data => ({ ...data, features: (data.features || []).filter(f => !(f.properties || {}).masquer) }),
        lazy: false, searchable: true, cluster: true,
        titleFields: ["nom"]
    },
    {
        id: "associations", group: "associations", label: "Associations par commune",
        file: "couches/associations/associations.geojson", type: "point",
        icon: "fa-solid fa-people-group", color: COULEUR_ASSOCIATIONS,
        iconePourFeature: iconeAssociations, sousTitrePourFeature: sousTitreAssociations, motsClesPourFeature: motsClesAssociations,
        lazy: false, searchable: true, cluster: false,
        titleFields: ["titre"]
    },
    /* venteFerme (vente directe à la ferme) supprimée : filtrage précis sur
       le vrai polygone du territoire (voir README) donne 0 résultat réel -
       les quelques points vus en flux Overpass n'existaient que dans la
       zone de débordement du rectangle englobant, hors du territoire. */

    /* ---------- MOBILITÉ ---------- */
    {
        id: "arretsALEOP", group: "mobilite", label: "Arrêts de bus (ALÉOP)",
        file: "couches/mobilite/arretsALEOP.geojson", type: "point",
        icon: "fa-solid fa-bus", color: PALETTE.riviere,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "description"],
        subtitleFields: ["route_short_name", "route_long_name"]
    },
    {
        id: "reseauALEOP", group: "mobilite", label: "Lignes ALÉOP",
        /* Couleur officielle par ligne (route_color, déjà dans le fichier
           GTFS/OSM - vérifié réel, pas une supposition) plutôt qu'une
           seule couleur bleue pour tout le réseau - retour direct de
           l'utilisatrice ("il y a un code couleur à respecter"). Une
           seule ligne dessert aujourd'hui le territoire (216, orange),
           mais le code s'applique déjà correctement ligne par ligne si
           la desserte s'étoffe un jour. */
        file: "couches/mobilite/reseauALEOP.geojson", type: "line",
        color: PALETTE.riviere, styleFn: styleLigneALEOP,
        lazy: false, searchable: false, cluster: false,
        titleFields: ["route_long_name", "route_short_name", "name"],
        subtitleFields: []
    },
    {
        id: "airecovoiturage", group: "mobilite", label: "Aires de covoiturage",
        file: "couches/mobilite/airecovoiturage.geojson", type: "point",
        icon: "fa-solid fa-car", color: PALETTE.riviere,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["nom_lieu", "com_lieu"],
        subtitleFields: ["ad_lieu", "nbre_pl"]
    },

    /* ---------- SÉCURITÉ / SANTÉ ---------- */
    {
        id: "dae", group: "securite", label: "Défibrillateurs",
        file: "couches/securite/dae.geojson", type: "point",
        icon: "fa-solid fa-heart-pulse", color: "#8E4458",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["c_nom", "c_com_nom"],
        subtitleFields: ["c_adr_num", "c_adr_voie", "c_com_nom"]
    },
    /* medecins, veterinaires, dentistes supprimées : filtrage précis sur le
       vrai polygone du territoire (voir README, section "Couches converties
       en fichiers statiques") donne respectivement 3, 1 et 0 résultats
       réels - beaucoup trop peu pour que la couche ait un intérêt sur ce
       territoire, confirmant l'impression de terrain remontée. */
    {
        id: "pompiers", group: "securite", label: "Casernes de pompiers",
        file: "couches/securite/pompiers.geojson",
        type: "point", icon: "fa-solid fa-fire", color: "#8E4458",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["operator"]
    },
    {
        id: "gendarmerie", group: "securite", label: "Gendarmerie & police",
        file: "couches/securite/gendarmerie.geojson",
        type: "point", icon: "fa-solid fa-shield-halved", color: "#8E4458",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["operator", "phone"]
    },
    {
        id: "ehpad", group: "securite", label: "EHPAD & maisons de retraite",
        file: "couches/securite/ehpad.geojson",
        type: "point", icon: "fa-solid fa-person-cane", color: "#8E4458",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "operator"],
        subtitleFields: ["operator", "phone"]
    },
    {
        id: "prsf", group: "securite", label: "Points de rencontre des secours en forêt",
        /* Points où les secours viennent chercher une personne en forêt
           (IGN/ONF). Code à donner au 18 ou au 112. Construit par
           outils/build_onf.py. */
        file: "couches/securite/prsf.geojson", type: "point",
        icon: "fa-solid fa-kit-medical", color: "#B0413E",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["code", "description"],
        subtitleFields: ["description", "commune"]
    },
    {
        id: "donSang", group: "securite", label: "Collectes de don du sang",
        /* Prochaines collectes de l'EFS, en direct (fetchDonDuSang), avec le
           lien de prise de rendez-vous. */
        fetchPersonnalise: fetchDonDuSang, type: "point",
        icon: "fa-solid fa-droplet", color: "#C62D42",
        lazy: true, searchable: true, cluster: false,
        titleFields: ["nom"],
        subtitleFields: ["commune"]
    },
    {
        id: "pmi", group: "famille", label: "Consultations PMI (puéricultrices)",
        /* Consultations de puéricultrices du Département (data.sarthe.fr), en direct. */
        fetchPersonnalise: () => fetchDataSarthe("227200029_solidarite-consultations-puericultrices-pmi"),
        type: "point", icon: "fa-solid fa-baby", color: PALETTE.terracotta,
        lazy: true, searchable: true, cluster: true,
        titleFields: ["centres"],
        subtitleFields: ["adresses", "ville"]
    },
    {
        id: "numerique", group: "services", label: "Aide au numérique",
        /* Conseillers numériques, espaces publics numériques, ordinateurs
           en libre-service, aide aux démarches en ligne (data.sarthe.fr). */
        fetchPersonnalise: () => fetchDataSarthe("227200029_offres-acces-numerique-sarthe"),
        type: "point", icon: "fa-solid fa-laptop", color: PALETTE.riviere,
        lazy: true, searchable: true, cluster: true,
        titleFields: ["nom"],
        subtitleFields: ["service", "commune"]
    },

    /* ---------- PATRIMOINE ---------- */
    {
        id: "immeublesProteges", group: "patrimoine", label: "Monuments protégés",
        file: "couches/patrimoine/immeublesProteges.geojson", type: "point",
        icon: "fa-solid fa-monument", color: "#8A7F78",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["titre_editorial_de_la_notice", "denomination_de_l_edifice", "autre_appellation_de_l_edifice"],
        subtitleFields: ["commune_forme_index", "typologie_de_la_protection"]
    },
    {
        id: "patrimoineRural", group: "patrimoine", label: "Petit patrimoine rural",
        /* Calvaires, lavoirs, moulins, fontaines anciennes - sur
           tout le territoire, contrairement à pointsRemarquablesBerce
           qui reste spécifique à la forêt (sites ONF nommés). Extrait
           statique d'OpenStreetMap, filtré sur le vrai polygone du
           territoire - voir le README. */
        file: "couches/patrimoine/patrimoineRural.geojson",
        type: "point", icon: "fa-solid fa-landmark", color: "#8A7F78",
        iconePourFeature: iconePatrimoineRural,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: []
    },

    /* ---------- TOURISME ---------- */
    {
        id: "randonnees", group: "tourisme", label: "Randonnées",
        /* Extrait statique d'OpenStreetMap (relations route=hiking),
           filtré sur le vrai polygone du territoire et complété avec
           distance/durée estimée (voir le README, section "Couches
           converties en fichiers statiques"), fusionné avec le tracé
           existant du dépôt (couches/tourisme/randonnees.geojson, "J1")
           - fusionnerFeatureCollections combine les deux fichiers,
           gardé systématiquement même si son tracé recoupe en partie
           un circuit OSM voisin ("Circuit de Carnuta à Bercé") : pas de
           certitude qu'il s'agisse du même itinéraire sous un autre id. */
        file: ["couches/tourisme/randonnees_osm.geojson", "couches/tourisme/randonnees.geojson"],
        transform: fusionnerFeatureCollections,
        type: "line", color: PALETTE.feuille,
        styleFn: feature => ({ color: couleurItineraire(feature, "randonnees"), weight: 3, opacity: 0.8 }),
        lazy: false, searchable: false, cluster: false,
        titleFields: ["name", "id"],
        subtitleFields: ["distance", "dureeEstim"]
    },
    {
        id: "velo", group: "tourisme", label: "Itinéraires cyclables",
        /* Extrait statique d'OpenStreetMap (relations route=bicycle, ex.
           "Le Loir à Vélo"), filtré sur le vrai polygone du territoire -
           voir le README. */
        file: "couches/tourisme/velo.geojson",
        type: "line", color: PALETTE.terracotta,
        styleFn: feature => ({ color: couleurItineraire(feature, "velo"), weight: 3, opacity: 0.8 }),
        lazy: false, searchable: false, cluster: false,
        titleFields: ["name", "ref"],
        subtitleFields: ["network"]
    },
    {
        id: "officesTourisme", group: "tourisme", label: "Offices de tourisme",
        /* Extrait statique d'OpenStreetMap, filtré sur le vrai polygone du
           territoire - voir le README. */
        file: "couches/tourisme/officesTourisme.geojson",
        type: "point", icon: "fa-solid fa-map-location-dot", color: PALETTE.riviere,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["opening_hours", "phone"]
    },
    {
        id: "campingcar", group: "tourisme", label: "Aires de camping-car",
        /* Un seul résultat réel sur le territoire (voir le README) : gardée
           malgré tout, une aire de camping-car par comcom rurale de cette
           taille est plausible et ne traduit pas un trou de couverture OSM
           comme pour médecins/vétérinaires/dentistes. */
        file: "couches/tourisme/campingcar.geojson",
        type: "point", icon: "fa-solid fa-caravan", color: PALETTE.terracotta,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["capacity", "fee"]
    },
    {
        id: "pointsRemarquablesBerce", group: "tourisme", territoires: ["geoberce"], label: "Points remarquables (forêt de Bercé)",
        /* Extrait statique d'OpenStreetMap (arbres nommés, sources,
           attractions), filtré sur le vrai polygone du territoire,
           complété par un fichier local pour les sites emblématiques
           (Chêne Boppe, Fontaine de la Coudre, Source de l'Hermitière...)
           documentés par l'ONF mais pas forcément cartographiés sur OSM
           - voir le README, même principe que lockers_manuels.geojson. */
        file: ["couches/tourisme/pointsRemarquablesBerce_osm.geojson", "couches/tourisme/pointsRemarquablesBerce_manuels.geojson"],
        transform: fusionnerFeatureCollections,
        type: "point", icon: "fa-solid fa-tree", color: PALETTE.foret,
        iconePourFeature: iconePointRemarquableBerce,
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: []
    },
    {
        id: "coursEau", group: "tourisme", label: "Cours d'eau (rivières, ruisseaux)",
        /* Voir plus haut dans ce fichier (LABELS_COURS_EAU/styleCoursEau)
           pour le détail de l'extraction et le choix du style. */
        file: "couches/tourisme/cours_eau.geojson", type: "line",
        color: PALETTE.riviere, styleFn: styleCoursEau,
        lazy: true, searchable: true, cluster: false,
        titleFields: ["name"],
        subtitleFields: []
    },
    {
        id: "lotsChasse", group: "tourisme", territoires: ["geoberce"], label: "Lots de chasse 2026-2027 (forêt de Bercé)",
        /* Les numéros de l'affiche sont des parcelles forestières ONF,
           pas des parcelles cadastrales : la couche cadastre ne
           convient donc pas. Les 5 contours sont les périmètres
           officiels des lots (service ArcGIS ONF "artemis_ref_chasse",
           couche "Périmètres des lots de chasse", codes 8320_BE_1 à
           8320_BE_5), les dates viennent du calendrier publié sur
           onf.fr (forêt F09431S), relevés le 05/11/2026 - voir
           couches/chasse/lots_chasse_berce_2026_2027.geojson.
           Lots 1 et 5 : "dates": null, l'ONF n'avait encore rien publié
           pour eux (calendrier "encore partiel") - à compléter en
           rejouant la même extraction. Pas de zones de non-tir : l'ONF
           ne les publie pas en données, elles ne figurent que sur
           l'affiche (couches/chasse/calendrier_chasse_2026-2027.webp). */
        file: "couches/chasse/lots_chasse_berce_2026_2027.geojson", type: "polygon",
        color: "#C2562E", styleFn: styleLotChasse,
        lazy: false, searchable: false, cluster: false,
        titleFields: ["nom"],
        subtitleFields: []
    },
    {
        id: "parcellesForestieres", group: "tourisme", label: "Parcelles forestières (ONF)",
        /* Parcelles des forêts publiques qui touchent le territoire (ONF,
           data.gouv.fr), avec leur numéro : ce sont les numéros des
           affiches de chasse. Construit par outils/build_onf.py. */
        file: "couches/chasse/parcelles_forestieres.geojson", type: "polygon",
        color: "#4F7A3A", styleFn: styleParcelleForestiere,
        etiquette: p => p.parcelle,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["parcelle"],
        subtitleFields: ["foret"]
    },
    {
        id: "ens", group: "tourisme", label: "Espaces naturels sensibles",
        /* Périmètres des ENS du Département (data.sarthe.fr), en direct. */
        fetchPersonnalise: () => fetchDataSarthe("227200029_perimetre-des-espaces-naturels-sensibles-ens"),
        type: "polygon", color: "#5E8C61",
        lazy: true, searchable: false, cluster: false,
        titleFields: ["nom_site"],
        subtitleFields: ["classification"]
    },

    /* ---------- URBANISME (fichiers lourds => chargement différé) ---------- */
    {
        id: "prixImmobilier", group: "urbanisme", label: "Prix immobilier par commune",
        file: "couches/urbanisme/prix_immobilier_communes.geojson", type: "choropleth",
        color: PALETTE.ardoise,
        legendeEchelle: legendePrix,
        lazy: false, searchable: false, cluster: false,
        valueField: "prix_m2_median",
        titleFields: ["commune"],
        subtitleFields: ["prix_m2_median", "nb_ventes"]
    },
    {
        id: "demographie", group: "urbanisme", label: "Mon territoire en chiffres",
        /* ⚠️ Fichier attendu mais pas encore fourni. Contrairement aux
           autres flux "à vérifier" du site (OLD, catnat, SUP...), il ne
           s'agit pas ici d'un nom de couche incertain mais d'une vraie
           absence de source exploitable depuis cet environnement :
           l'API INSEE (recensement, revenus fiscaux Filosofi, logements)
           n'est pas joignable ici (accès réseau restreint) et n'a de
           toute façon pas d'endpoint public filtrable par commune sans
           clé personnelle - contrairement à Géorisques/data.geopf.fr.
           Même solution que pour France Services : un extrait CSV/GeoJSON
           déjà filtré sur les 24 communes du territoire, à fournir par
           l'utilisatrice. Tant que ce fichier n'existe pas, la couche se
           charge sans erreur (chargerCouche gère un 404 proprement) mais
           reste vide - voir le README, "Ce qui reste à faire", pour le
           détail des champs attendus par construirePopupDemographie. */
        file: "couches/urbanisme/demographie_communes.geojson", type: "choropleth",
        color: PALETTE.terracotta,
        styleFn: feature => ({ color: "#fff", weight: 1, fillColor: couleurPopulation(feature.properties.population), fillOpacity: 0.65 }),
        legendeEchelle: legendePopulation,
        lazy: false, searchable: true, cluster: false,
        valueField: "population",
        titleFields: ["commune_nom", "commune"],
        subtitleFields: ["population", "revenu_median"]
    },
    {
        id: "qualiteEau", group: "urbanisme", label: "Qualité de l'eau potable",
        /* Hub'Eau (API publique sans clé), un contrôle sanitaire par
           commune - voir plus haut dans ce fichier pour le détail du
           chargement/cache (fetchQualiteEauTerritoire) et pourquoi un
           choroplèthe plutôt qu'un marqueur ponctuel. */
        fetchPersonnalise: fetchQualiteEauTerritoire, transform: geojsonDepuisQualiteEau,
        type: "polygon", color: PALETTE.feuille, styleFn: styleQualiteEau,
        legendeEchelle: legendeQualiteEau,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["nom_offici"],
        subtitleFields: []
    },
    {
        id: "ombres", group: "urbanisme", label: "Ensoleillement : ombres portées",
        /* Simulation d'ombres (bâtiments, arbres, relief) à la date et l'heure choisies, d'après le LiDAR HD de
           l'IGN - voir js/ombres.js. Calculé dans la page, à partir du zoom 17. */
        dessinDynamique: (map, groupe, onEtat) => dessinerOmbres(map, groupe, onEtat),
        surDesactivation: () => masquerOmbres(),
        type: "point", icon: "fa-solid fa-sun", color: "#D5A35D",
        zoomMin: 17, lazy: true, searchable: false, cluster: false
    },
    {
        id: "cadastreSolaire", group: "urbanisme", label: "Cadastre solaire : ensoleillement des parcelles",
        /* Chaque parcelle colorée selon la part du jour au soleil (21 décembre, 20 mars ou 21 juin), d'après le
           LiDAR HD de l'IGN - voir js/ombres.js. Calculé dans la page, à partir du zoom 17. */
        dessinDynamique: (map, groupe, onEtat) => dessinerCadastreSolaire(map, groupe, onEtat),
        surDesactivation: () => masquerCadastreSolaire(),
        type: "point", icon: "fa-solid fa-solar-panel", color: "#E8901C",
        zoomMin: 17, lazy: true, searchable: false, cluster: false
    },
    {
        id: "dpe", group: "urbanisme", label: "Diagnostics énergétiques (DPE)",
        file: "couches/urbanisme/dpe_loir_luce_berce.geojson", type: "point",
        icon: "fa-solid fa-bolt", color: PALETTE.ardoise,
        iconePourFeature: iconeDpe,
        lazy: true, searchable: false, cluster: true,
        titleFields: ["numero_dpe"],
        subtitleFields: ["etiquette_dpe", "annee_construction"]
    },
    {
        id: "zonagePLUi", group: "urbanisme", label: "Zonage PLUi",
        file: "couches/urbanisme/zonage_plui_loir_luce_berce_filtre.geojson", type: "polygon",
        color: PALETTE.ardoise, styleFn: stylePlui,
        legend: TYPES_PLUI, categoriser: categoriePlui,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["libelong", "libelle"],
        subtitleFields: ["typezone"]
    },
    {
        id: "rga", group: "risques", label: "Retrait-gonflement des argiles",
        file: "couches/urbanisme/rga_2025_loir_luce_berce.geojson", type: "polygon",
        color: "#B5321C", styleFn: styleRga,
        legend: TYPES_RGA, categoriser: categorieRga,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["niveau"],
        subtitleFields: ["surf_m2"]
    },
    {
        id: "mutations", group: "urbanisme", label: "Mutations immobilières (DVF)",
        file: "couches/urbanisme/parcelles_dvf_2021_2025_loir_luce_berce.geojson", type: "polygon",
        color: PALETTE.terracotta,
        styleFn: stylePrixMutation,
        legendeEchelle: legendeMutations,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["adresse", "reference_parcelle"],
        subtitleFields: ["commune", "nb_mutations"]
    },
    {
        id: "cadastre", group: "urbanisme", label: "Parcelles cadastrales",
        /* Flux unique du cadastre pour toute la comcom (bundler Etalab par
           EPCI), fusionné/complété par fusionnerCadastre. Volumineux
           (parcellaire complet des 24 communes, des dizaines de milliers de
           parcelles) : chargée à la demande, affichée seulement à partir
           d'un certain niveau de zoom (zoomMin), et seulement les parcelles
           dans la vue actuelle plutôt que tout le territoire d'un coup
           (viewportOnly, se met à jour au déplacement - voir layers.js). */
        file: URL_CADASTRE_EPCI, transform: fusionnerCadastre,
        type: "polygon", color: PALETTE.ardoise,
        styleFn: () => ({ color: PALETTE.ardoise, weight: 1, opacity: 0.6, fillOpacity: 0 }),
        zoomMin: 15, viewportOnly: true,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["reference"],
        subtitleFields: ["commune_nom", "surface_m2"]
    },

    {
        id: "observationsNature", group: "tourisme", label: "Observations nature (faune et flore)",
        /* Observations ouvertes de GBIF, interrogées en direct sur la zone affichée (voir plus haut). */
        fetchViewport: fetchObservationsNature,
        type: "point", icon: "fa-solid fa-feather", color: PALETTE.feuille,
        iconePourFeature: feature => {
            const t = TYPES_OBS_NATURE.find(x => x.id === categorieObservationNature(feature)) || TYPE_OBS_NATURE_DEFAUT;
            return { icon: t.icon, color: t.color };
        },
        legend: TYPES_OBS_NATURE, legendDefaut: TYPE_OBS_NATURE_DEFAUT, categoriser: categorieObservationNature,
        periodes: PERIODES_OBS_NATURE, periodeActive: "12m",
        zoomMin: 13, lazy: true, searchable: false, cluster: false,
        titleFields: ["nom", "latin"],
        subtitleFields: ["latin"]
    },

    /* ---------- RISQUES & PRÉVENTION (couches en flux, données distantes
       tenues à jour par les fournisseurs et non copiées dans le dépôt) ---------- */
    {
        id: "vigieau", group: "risques", label: "Restrictions sécheresse (Vigieau)",
        /* API officielle Vigieau (api.vigieau.gouv.fr), interrogée par
           commune plutôt qu'un fichier national unique - voir le long
           commentaire au-dessus de fetchPersonnaliseVigieau (plus haut
           dans ce fichier) pour l'historique complet de ce choix. */
        fetchPersonnalise: fetchPersonnaliseVigieau,
        type: "polygon", color: "#F2994A",
        styleFn: couleurVigieau,
        lazy: true, searchable: false, cluster: false
    },
    {
        id: "chantiers", group: "mobilite", label: "Chantiers sur les routes départementales",
        /* Chantiers en cours du Département (data.sarthe.fr), en direct :
           route barrée, déviation, dates. Marge de 0,05° (~4-5 km) autour
           du territoire : une route barrée juste à côté gêne aussi.
           Le tronçon est reconstitué sur la BD TOPO (tronconChantier). */
        fetchPersonnalise: fetchChantiers, styleFn: styleChantier,
        type: "point", icon: "fa-solid fa-road-barrier", color: "#E0A030",
        iconePourFeature: f => iconeChantier(f.properties || {}),
        lazy: true, searchable: false, cluster: false,
        titleFields: ["nature_trvx"],
        subtitleFields: ["loc_txt"]
    },
    {
        id: "ppr", group: "risques", label: "Plans de prévention des risques (inondation, mouvements de terrain)",
        /* Zones réglementées des PPR naturels de la DDT 72, converties
           depuis le flux WFS par outils/build_ppr.py. */
        file: "couches/risques/ppr_zones.geojson", type: "polygon",
        color: "#3E7CB1", styleFn: stylePpr, legendeEchelle: legendePpr,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["code_zone"],
        subtitleFields: ["plan"]
    },
    {
        id: "old", group: "risques", label: "Obligations légales de débroussaillement",
        /* Flux WMS de l'IGN (Géoplateforme) - zonage informatif OLD.
           Nom de couche à vérifier/ajuster si besoin via le GetCapabilities :
           https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities */
        type: "wms",
        wmsUrl: "https://data.geopf.fr/wms-r/wms",
        wmsLayer: "DEBROUSSAILLEMENT",
        opacity: 0.6,
        attribution: "IGN",
        color: "#8E4458",
        lazy: true, searchable: false, cluster: false
    },
    {
        id: "catnat", group: "risques", label: "Historique des catastrophes naturelles",
        /* API Géorisques (CATNAT/GASPAR), interrogée commune par commune
           - voir plus haut dans ce fichier pour le détail et la limite
           principale : forme exacte de la réponse non vérifiable en
           conditions réelles (comme la couche OLD/WMS juste au-dessus),
           lecture volontairement tolérante côté code. Géométrie reprise
           de couches/communes.geojson (déjà dans le dépôt). */
        fetchPersonnalise: fetchCatnat, transform: geojsonDepuisCatnat,
        type: "polygon", color: PALETTE.ardoise, styleFn: styleCatnat,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["nom_offici"],
        subtitleFields: []
    },
    {
        id: "carburants", group: "mobilite", label: "Prix des carburants",
        /* Flux instantané officiel (mis à jour ~10 min), filtré sur un rayon
           de 25 km autour du territoire pour ne récupérer que les stations utiles. */
        file: `https://data.economie.gouv.fr/api/records/1.0/search/?dataset=prix-des-carburants-en-france-flux-instantane-v2&geofilter.distance=${TERRITOIRE.centre[0]},${TERRITOIRE.centre[1]},${TERRITOIRE.rayonCarburantsM}&rows=300`,
        transform: geojsonDepuisFluxODS,
        type: "point",
        icon: "fa-solid fa-gas-pump", color: "#D9822B",
        lazy: true, searchable: true, cluster: true,
        titleFields: ["adresse", "nom", "enseigne", "id"],
        subtitleFields: ["ville", "cp", "gazole_prix", "sp95_prix", "e10_prix"]
    }
];

/* Retire les couches exclues pour ce territoire (TERRITOIRE.couchesExclues),
   réservées à d'autres (`territoires: [...]` sur la couche), ou dont un
   fichier local (couches/...) n'existe pas encore : si le territoire
   déclare `fichiersDisponibles`, une couche n'est gardée que si tous ses
   fichiers locaux y figurent (les couches en flux, sans fichier local,
   restent toujours). GéoBercé ne déclare pas cette liste : tout est gardé. */
function fichiersLocauxDeLaCouche(conf) {
    return [].concat(conf.file || []).filter(f => typeof f === "string" && f.startsWith("couches/"));
}
for (let i = LAYERS.length - 1; i >= 0; i--) {
    const l = LAYERS[i];
    const manqueUnFichier = Array.isArray(TERRITOIRE.fichiersDisponibles)
        && fichiersLocauxDeLaCouche(l).some(f => !TERRITOIRE.fichiersDisponibles.includes(f));
    if ((TERRITOIRE.couchesExclues || []).includes(l.id) || (l.territoires && !l.territoires.includes(TERRITOIRE.id)) || manqueUnFichier) LAYERS.splice(i, 1);
}

/* =========================================================
   THÉMATIQUES DE LA PAGE D'ACCUEIL
   (peuvent regrouper plusieurs groupes de couches)
   ========================================================= */
const THEMES = [
    { label: "Services & mairie", icon: "fa-solid fa-landmark", groups: ["services"] },
    { label: "Famille", icon: "fa-solid fa-child-reaching", groups: ["famille"] },
    { label: "Commerces", icon: "fa-solid fa-basket-shopping", groups: ["commerces"] },
    { label: "Associations", icon: "fa-solid fa-people-group", groups: ["associations"] },
    { label: "Mobilité", icon: "fa-solid fa-bus", groups: ["mobilite"] },
    { label: "Nature & rando", icon: "fa-solid fa-person-hiking", groups: ["tourisme", "patrimoine"] },
    { label: "Sécurité & santé", icon: "fa-solid fa-heart-pulse", groups: ["securite"] },
    { label: "Risques & prévention", icon: "fa-solid fa-triangle-exclamation", groups: ["risques"] }
];

/* =========================================================
   RACCOURCIS "PRÈS DE CHEZ MOI"
   Affichés en premier sur l'écran d'accueil : ils déclenchent
   une géolocalisation puis affichent la liste des résultats
   les plus proches pour une ou plusieurs couches (js/proximite.js).
   Pas de couleur ici : elle est reprise de la couche visée
   (LAYERS[...].color) pour rester cohérente avec le reste du site.
   ========================================================= */
/* Choisis pour coller à des besoins concrets du quotidien plutôt qu'à
   ce qui se trouvait être disponible techniquement - "où déposer mon
   courrier"/"la boulangerie la plus proche" parlent à tout le monde,
   contrairement par exemple à "Assistante maternelle" (utile, mais à un
   public bien plus restreint) qui n'a donc plus sa place ici. */
/* Écran d'accueil allégé : seuls les raccourcis marqués `accueil: true`
   sont affichés en grandes tuiles (choisis avec l'utilisatrice : colis,
   courrier, assistante maternelle, artisan, carburant le plus proche /
   le moins cher). Les autres restent disponibles sous "Plus d'options".
   `triInitial: "prix"` : ouvre la liste des stations déjà triée par prix. */
const RACCOURCIS = [
    {
        label: "Où déposer mon colis ?",
        icon: "fa-solid fa-box",
        layerIds: ["lockers"],
        accueil: true
    },
    {
        label: "Où déposer mon courrier ?",
        icon: "fa-solid fa-envelope",
        layerIds: ["bal"],
        accueil: true
    },
    {
        label: "Trouver une assistante maternelle",
        icon: "fa-solid fa-baby",
        layerIds: ["petiteEnfance"],
        filtre: item => item.layer.feature && item.layer.feature.properties.type === "Assistant maternel",
        accueil: true
    },
    {
        label: "Trouver un artisan",
        icon: "fa-solid fa-hammer",
        layerIds: ["artisans"],
        accueil: true
    },
    {
        label: "Carburant le plus proche",
        icon: "fa-solid fa-gas-pump",
        layerIds: ["carburants"],
        accueil: true
    },
    {
        label: "Carburant le moins cher",
        icon: "fa-solid fa-euro-sign",
        layerIds: ["carburants"],
        triInitial: "prix",
        accueil: true
    },
    {
        label: "La boulangerie la plus proche",
        icon: "fa-solid fa-bread-slice",
        layerIds: ["commerces"],
        filtre: item => item.layer.feature && item.layer.feature.properties.type === "bakery"
    },
    {
        label: "La pharmacie la plus proche",
        icon: "fa-solid fa-prescription-bottle-medical",
        layerIds: ["commerces"],
        filtre: item => item.layer.feature && item.layer.feature.properties.type === "pharmacy"
    },
    {
        label: "Commerces près de chez moi",
        icon: "fa-solid fa-basket-shopping",
        layerIds: ["commerces"]
    },
    {
        label: "Écoles près de chez moi",
        icon: "fa-solid fa-graduation-cap",
        layerIds: ["education"]
    },
    {
        label: "Défibrillateurs près de chez moi",
        icon: "fa-solid fa-heart-pulse",
        layerIds: ["dae"]
    }
];
