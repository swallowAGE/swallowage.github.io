/* =========================================================
   GÉOBERCÉ — CONFIGURATION DES COUCHES
   Un seul endroit pour décrire toutes les données : le reste
   du code (chargement, icônes, panneau, recherche, popups)
   est générique et lit cette configuration.
   ========================================================= */

/* Couleurs de l'identité graphique (voir aussi css/style.css) */
const PALETTE = {
    foret: "#0F6E56",
    feuille: "#1D9E75",
    terracotta: "#D85A30",
    riviere: "#378ADD",
    ardoise: "#5F5E5A"
};

/* =========================================================
   GROUPES (catégories du panneau de couches / thématiques
   de la page d'accueil)
   ========================================================= */
const GROUPS = {
    services: { label: "Services & mairie", icon: "fa-solid fa-landmark", color: PALETTE.foret },
    famille: { label: "Famille", icon: "fa-solid fa-child-reaching", color: PALETTE.terracotta },
    commerces: { label: "Commerces", icon: "fa-solid fa-basket-shopping", color: PALETTE.feuille },
    mobilite: { label: "Mobilité", icon: "fa-solid fa-bus", color: PALETTE.riviere },
    securite: { label: "Sécurité & santé", icon: "fa-solid fa-heart-pulse", color: "#AD4826" },
    tourisme: { label: "Nature & rando", icon: "fa-solid fa-person-hiking", color: PALETTE.feuille },
    patrimoine: { label: "Patrimoine", icon: "fa-solid fa-monument", color: "#7F7E7B" },
    urbanisme: { label: "Habitat & urbanisme", icon: "fa-solid fa-house-chimney", color: PALETTE.ardoise },
    risques: { label: "Risques & prévention", icon: "fa-solid fa-triangle-exclamation", color: "#AD4826" }
};

/* =========================================================
   STYLES DYNAMIQUES POUR COUCHES "FLUX"
   (données dont on ne maîtrise pas totalement le nom exact
   des attributs distants : on cherche des mots-clés plutôt
   qu'un nom de champ figé, pour rester robuste aux évolutions
   du fournisseur de données)
   ========================================================= */
/* Retour direct de l'utilisatrice : le flux Vigieau (gros fichier
   national, un seul objet S3 statique, aucun filtre géographique
   possible côté serveur) peut ponctuellement dépasser le délai réseau
   avant même d'avoir fini de télécharger ("ERR_TIMED_OUT" constaté en
   conditions réelles) - un nouvel essai suffit généralement (aléa
   réseau ponctuel plutôt qu'une vraie panne du service). Jusqu'à 3
   tentatives avant d'abandonner pour de bon (affiche alors le badge
   d'erreur normal du panneau, voir js/panel.js). */
const URL_VIGIEAU = "https://regleau.s3.gra.perf.cloud.ovh.net/geojson/zones_arretes_en_vigueur.geojson";
function fetchAvecReessai(url, tentativesRestantes) {
    return fetch(url).then(r => {
        if (!r.ok) throw new Error("Erreur HTTP " + r.status + " sur " + url);
        return r.json();
    }).catch(err => {
        if (tentativesRestantes <= 1) throw err;
        return fetchAvecReessai(url, tentativesRestantes - 1);
    });
}
function fetchVigieau() {
    return fetchAvecReessai(URL_VIGIEAU, 3);
}

/* Retour direct de l'utilisatrice : le flux Vigieau couvre toute la
   France (des centaines de zones), très long à charger/construire en
   objets Leaflet pour un intérêt local seulement. Filtré à la boîte
   englobante du territoire (bboxTerritoire, calculée une fois dans
   js/map.js depuis couches/epci.geojson) avec une marge de 0,15° (environ
   15 à 17km à cette latitude) plutôt qu'un filtre exact sur le polygone
   précis de l'EPCI : les zones Vigieau sont souvent à l'échelle du
   bassin versant ou du département, largement plus grandes que notre
   territoire - un simple test d'intersection de boîtes englobantes
   suffit à ne garder que celles qui le touchent réellement, sans jamais
   risquer d'en exclure une par excès de précision. Si bboxTerritoire
   n'est pas encore prêt (epci.geojson pas encore résolu), ne filtre rien
   plutôt que de tout masquer. */
function clipperAuTerritoire(geo) {
    if (!bboxTerritoire) return geo;
    const marge = 0.15;
    const zone = [bboxTerritoire[0] - marge, bboxTerritoire[1] - marge, bboxTerritoire[2] + marge, bboxTerritoire[3] + marge];
    const features = (geo.features || []).filter(f => {
        const bbox = bboxFeature(f);
        return bbox && bbox[0] <= zone[2] && bbox[2] >= zone[0] && bbox[1] <= zone[3] && bbox[3] >= zone[1];
    });
    return { type: "FeatureCollection", features };
}

/* Niveau de gravité Vigieau : le vrai nom de champ est "niveauGravite"
   (vérifié en conditions réelles, valeur observée "vigilance" - voir
   construirePopupVigieau dans js/popup.js pour le détail complet du
   schéma réel), mais reste comparé par mot-clé sur l'ensemble des
   propriétés textuelles plutôt qu'une égalité stricte sur ce seul champ
   - tolère une valeur composée ("alerte renforcée" contient aussi
   "alerte", d'où l'ordre de vérification du plus sévère au moins
   sévère) sans dépendre d'un format exact non garanti dans le temps.
   Couleur ET libellé partagent cette même fonction (polygone ET popup)
   pour qu'ils ne puissent jamais diverger l'un de l'autre. */
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
const PALETTE_ITINERAIRES = ["#1D9E75", "#378ADD", "#D85A30", "#8E44AD", "#E1B12C", "#16A085", "#D63384", "#2C3E50"];
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
        types: ["supermarket", "convenience", "butcher", "deli", "seafood", "greengrocer", "winery", "variety_store", "newsagent"]
    },
    {
        id: "restauration", label: "Restaurants & bars", icon: "fa-solid fa-utensils", color: PALETTE.terracotta,
        types: ["restaurant", "bar", "pub", "fast_food"]
    },
    {
        id: "coiffure", label: "Coiffure", icon: "fa-solid fa-scissors", color: "#AD4826",
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
        types: ["computer", "electronics", "e-cigarette"]
    },
    {
        id: "culture", label: "Culture & loisirs", icon: "fa-solid fa-palette", color: PALETTE.feuille,
        types: ["books", "art", "cinema", "sports", "photo", "gift", "handicraft", "sewing"]
    },
    {
        id: "brocante", label: "Brocante & antiquités", icon: "fa-solid fa-shop", color: "#7F7E7B",
        types: ["antiques", "second_hand", "wholesale"]
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
const COMMUNES_TERRITOIRE = {
    "72027": "Beaumont-sur-Dême", "72028": "Beaumont-Pied-de-Bœuf", "72052": "Chahaignes",
    "72068": "La Chartre-sur-le-Loir", "72071": "Montval-sur-Loir", "72103": "Courdemanche",
    "72115": "Dissay-sous-Courcillon", "72134": "Flée", "72143": "Le Grand-Lucé",
    "72153": "Jupilles", "72160": "Lavernat", "72161": "Lhomme", "72173": "Luceau",
    "72183": "Marçon", "72210": "Montreuil-le-Henri", "72221": "Nogent-sur-Loir",
    "72248": "Pruillé-l'Éguillé", "72262": "Loir en Vallée", "72279": "Saint-Georges-de-la-Couée",
    "72311": "Saint-Pierre-de-Chevillé", "72314": "Saint-Pierre-du-Lorouër",
    "72325": "Saint-Vincent-du-Lorouër", "72356": "Thoiré-sur-Dinan", "72376": "Villaines-sous-Lucé"
};

/* SIREN de la comcom Loir-Lucé-Bercé (code_siren dans couches/communes.geojson). */
const URL_CADASTRE_EPCI = "https://cadastre.data.gouv.fr/bundler/cadastre-etalab/epcis/200070373/geojson/parcelles";

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
const ILLIWAP_TERRITOIRE = "cc-loir-luce-berce";

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

function categoriePatrimoineRural(props) {
    if (props.historic === "wayside_cross") return { id: "croix", label: "Calvaire", icon: "fa-solid fa-cross", color: PALETTE.ardoise };
    if (props.man_made === "wash_house") return { id: "lavoir", label: "Lavoir", icon: "fa-solid fa-water", color: PALETTE.riviere };
    if (props.man_made === "watermill" || props.historic === "mill") return { id: "moulin", label: "Moulin", icon: "fa-solid fa-industry", color: PALETTE.terracotta };
    if (props.amenity === "fountain") return { id: "fontaine", label: "Fontaine", icon: "fa-solid fa-droplet", color: PALETTE.riviere };
    return { id: "autre", label: "Petit patrimoine", icon: "fa-solid fa-landmark", color: "#7F7E7B" };
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
const CACHE_CATNAT_CLE = "geoberce-cache-catnat";
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
    return "#AD4826";
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
const CACHE_QUALITE_EAU_CLE = "geoberce-cache-qualite-eau";
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
/* Même test de mot-clé que construireCarteQualiteEau (js/communes.js,
   carte du dashboard) sur conclusion_conformite_prelevement - seul champ
   fiable confirmé en conditions réelles pour ce flux (voir ce fichier),
   partagé ici pour que la couleur de la couche et le texte de la popup
   ne puissent jamais se contredire. */
function qualiteEauNonConforme(resultat) {
    return !!(resultat && resultat.conclusion_conformite_prelevement && /non\s+conforme/i.test(resultat.conclusion_conformite_prelevement));
}
function styleQualiteEau(feature) {
    const resultat = feature.properties.qualite_eau_resultat;
    if (!resultat || !resultat.conclusion_conformite_prelevement) {
        return { color: "#fff", weight: 1, fillColor: "#D8D6D0", fillOpacity: 0.5 };
    }
    return { color: "#fff", weight: 1, fillColor: qualiteEauNonConforme(resultat) ? "#AD4826" : PALETTE.feuille, fillOpacity: 0.55 };
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
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "sport", "com_nom"],
        subtitleFields: ["sport", "com_nom"]
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
        id: "commerces", group: "commerces", label: "Commerces",
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
        icon: "fa-solid fa-heart-pulse", color: "#AD4826",
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
        type: "point", icon: "fa-solid fa-fire", color: "#AD4826",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["operator"]
    },
    {
        id: "gendarmerie", group: "securite", label: "Gendarmerie & police",
        file: "couches/securite/gendarmerie.geojson",
        type: "point", icon: "fa-solid fa-shield-halved", color: "#AD4826",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name"],
        subtitleFields: ["operator", "phone"]
    },
    {
        id: "ehpad", group: "securite", label: "EHPAD & maisons de retraite",
        file: "couches/securite/ehpad.geojson",
        type: "point", icon: "fa-solid fa-person-cane", color: "#AD4826",
        lazy: false, searchable: true, cluster: true,
        titleFields: ["name", "operator"],
        subtitleFields: ["operator", "phone"]
    },

    /* ---------- PATRIMOINE ---------- */
    {
        id: "immeublesProteges", group: "patrimoine", label: "Monuments protégés",
        file: "couches/patrimoine/immeublesProteges.geojson", type: "point",
        icon: "fa-solid fa-monument", color: "#7F7E7B",
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
        type: "point", icon: "fa-solid fa-landmark", color: "#7F7E7B",
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
        id: "pointsRemarquablesBerce", group: "tourisme", label: "Points remarquables (forêt de Bercé)",
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

    /* ---------- URBANISME (fichiers lourds => chargement différé) ---------- */
    {
        id: "prixImmobilier", group: "urbanisme", label: "Prix immobilier par commune",
        file: "couches/urbanisme/prix_immobilier_communes.geojson", type: "choropleth",
        color: PALETTE.ardoise,
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
        lazy: true, searchable: false, cluster: false,
        titleFields: ["nom_offici"],
        subtitleFields: []
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
        color: PALETTE.ardoise,
        lazy: true, searchable: false, cluster: false,
        titleFields: ["libelong", "libelle"],
        subtitleFields: ["typezone"]
    },
    {
        id: "rga", group: "urbanisme", label: "Retrait-gonflement des argiles",
        file: "couches/urbanisme/rga_2025_loir_luce_berce.geojson", type: "polygon",
        color: "#D85A30",
        lazy: true, searchable: false, cluster: false,
        titleFields: ["niveau"],
        subtitleFields: ["surf_m2"]
    },
    {
        id: "mutations", group: "urbanisme", label: "Mutations immobilières (DVF)",
        file: "couches/urbanisme/parcelles_dvf_2021_2025_loir_luce_berce.geojson", type: "polygon",
        color: PALETTE.terracotta,
        styleFn: stylePrixMutation,
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

    /* ---------- RISQUES & PRÉVENTION (couches en flux, données distantes
       tenues à jour par les fournisseurs et non copiées dans le dépôt) ---------- */
    {
        id: "vigieau", group: "risques", label: "Restrictions sécheresse (Vigieau)",
        /* Flux GeoJSON public des zones sous arrêté sécheresse en vigueur,
           publié par le Ministère (source du jeu de données data.gouv.fr
           "VigiEau : Arrêtés sécheresse en vigueur"), mis à jour quotidiennement.
           fetchPersonnalise (fetchVigieau, voir plus haut) plutôt que
           "file" : nouvel essai automatique en cas de timeout réseau, un
           gros fichier national sans filtre serveur possible y est plus
           exposé que les autres couches du site. */
        fetchPersonnalise: fetchVigieau,
        transform: clipperAuTerritoire,
        type: "polygon", color: "#F2994A",
        styleFn: couleurVigieau,
        lazy: true, searchable: false, cluster: false
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
        color: "#AD4826",
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
        file: "https://data.economie.gouv.fr/api/records/1.0/search/?dataset=prix-des-carburants-en-france-flux-instantane-v2&geofilter.distance=47.791528,0.412223,25000&rows=300",
        transform: geojsonDepuisFluxODS,
        type: "point",
        icon: "fa-solid fa-gas-pump", color: PALETTE.riviere,
        lazy: true, searchable: true, cluster: true,
        titleFields: ["adresse", "nom", "enseigne", "id"],
        subtitleFields: ["ville", "cp", "gazole_prix", "sp95_prix", "e10_prix"]
    }
];

/* =========================================================
   THÉMATIQUES DE LA PAGE D'ACCUEIL
   (peuvent regrouper plusieurs groupes de couches)
   ========================================================= */
const THEMES = [
    { label: "Services & mairie", icon: "fa-solid fa-landmark", groups: ["services"] },
    { label: "Famille", icon: "fa-solid fa-child-reaching", groups: ["famille"] },
    { label: "Commerces", icon: "fa-solid fa-basket-shopping", groups: ["commerces"] },
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
/* Ordre retour direct de l'utilisatrice : les 5 premiers sont les
   raccourcis jugés les plus utiles au quotidien, dans cet ordre précis -
   le reste suit sans ordre particulier demandé. */
const RACCOURCIS = [
    {
        label: "Carburant le plus proche de chez moi",
        icon: "fa-solid fa-gas-pump",
        layerIds: ["carburants"]
    },
    {
        label: "La boulangerie la plus proche",
        icon: "fa-solid fa-bread-slice",
        layerIds: ["commerces"],
        filtre: item => item.layer.feature && item.layer.feature.properties.type === "bakery"
    },
    {
        label: "Où déposer mon courrier ?",
        icon: "fa-solid fa-envelope",
        layerIds: ["bal"]
    },
    {
        label: "Point relais / casier colis le plus proche",
        icon: "fa-solid fa-box",
        layerIds: ["lockers"]
    },
    {
        label: "Assistante maternelle proche de chez moi",
        icon: "fa-solid fa-baby",
        layerIds: ["petiteEnfance"],
        filtre: item => item.layer.feature && item.layer.feature.properties.type === "Assistant maternel"
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
