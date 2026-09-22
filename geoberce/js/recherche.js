/* =========================================================
   GÉOBERCÉ — RECHERCHE FONCIÈRE
   Panneau "Explorer le foncier" : recherche de parcelles par critères
   (surface, urbanisme, ventes DVF, DPE...) plutôt que clic par clic.

   Les critères disponibles sont volontairement limités à ce que les
   données déjà présentes dans le SIG permettent de calculer avec
   confiance :
   - surface de parcelle, commune : directement dans le cadastre.
   - zone PLUi, aléa RGA : rapprochement géométrique (le centre de la
     parcelle tombe-t-il dans telle zone ?).
   - ventes, bâti (nombre/surface) : dernière mutation DVF connue pour
     cette parcelle (elements_locaux) - donc seulement pour les
     parcelles ayant déjà été vendues, pas la totalité du bâti existant.
   - DPE : le DPE le plus proche géographiquement, à l'intérieur de la
     parcelle.
   Piscine et permis récents ne sont pas dans les données du site
   aujourd'hui : ces critères n'apparaissent pas plutôt que d'afficher
   un filtre qui ne filtrerait rien.

   La recherche porte sur les parcelles actuellement affichées à l'écran
   (même logique que le rendu de la couche cadastre, voir layers.js/
   featuresDansVue), pas sur les dizaines de milliers de parcelles du
   territoire entier : ça allège à la fois le calcul (jointures
   géométriques avec DPE/PLUi/RGA) et reste cohérent avec ce qu'on voit
   sur la carte. Il faut donc être zoomé sur une zone avant de chercher.

   Exception : la recherche rapide de l'écran d'accueil (#hero-parcelle,
   voir lancerRechercheRapide plus bas) demande une commune précise, pas
   "ce qui est affiché" - borner à une seule commune (quelques centaines
   à quelques milliers de parcelles, pas les dizaines de milliers du
   territoire entier) reste assez léger pour s'en passer, donc pas
   besoin d'être déjà zoomé dessus. chargerEtEnrichirCommune reprend
   directement donneesBrutes["cadastre"] (déjà chargé en entier pour
   toute la comcom, featuresDansVue n'en filtre qu'un sous-ensemble par
   la vue) plutôt que de zoomer la carte artificiellement pour retomber
   dans le cas général.
   ========================================================= */

const COUCHES_RECHERCHE = ["cadastre", "mutations", "dpe", "zonagePLUi", "rga"];

const LABELS_PLUI = {
    U: "U — Zone urbaine", AUc: "AUc — À urbaniser (constructible)",
    AUs: "AUs — À urbaniser (stricte)", A: "A — Zone agricole", N: "N — Zone naturelle"
};
/* Zones où construire est possible dès aujourd'hui (contrairement à AUs,
   qui attend l'ouverture à l'urbanisation) : sert à décider si "à
   proximité" a un sens sur la fiche parcelle (popup.js), pas seulement
   les zones agricoles/naturelles où ça n'intéresse personne. */
const ZONES_PLUI_CONSTRUCTIBLES = ["U", "AUc"];
const LABELS_RGA = { 1: "Faible", 2: "Moyen", 3: "Fort" };
const CLASSES_DPE = ["A", "B", "C", "D", "E", "F", "G"];
const LIMITE_RESULTATS = 3000;

let resultatsEnrichis = null;        // parcelles visibles à l'ouverture, enrichies une fois
let coucheRechercheActuelle = null;  // couche Leaflet des résultats affichés

function zoomMinCadastre() {
    const conf = LAYERS.find(l => l.id === "cadastre");
    return (conf && conf.zoomMin) || 0;
}

/* ---------- Géométrie (sans dépendance externe) ---------- */

function centroideFeature(feature) {
    const geom = feature.geometry;
    let anneau;
    if (geom && geom.type === "Polygon") anneau = geom.coordinates[0];
    else if (geom && geom.type === "MultiPolygon") anneau = geom.coordinates[0][0];
    else return null;
    let sx = 0, sy = 0;
    anneau.forEach(([x, y]) => { sx += x; sy += y; });
    return [sx / anneau.length, sy / anneau.length];
}

function pointDansAnneau(pt, anneau) {
    let dedans = false;
    for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
        const xi = anneau[i][0], yi = anneau[i][1];
        const xj = anneau[j][0], yj = anneau[j][1];
        const traverse = ((yi > pt[1]) !== (yj > pt[1])) &&
            (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
        if (traverse) dedans = !dedans;
    }
    return dedans;
}

function pointDansFeature(pt, feature) {
    const geom = feature && feature.geometry;
    if (!pt || !geom) return false;
    if (geom.type === "Polygon") return pointDansAnneau(pt, geom.coordinates[0]);
    if (geom.type === "MultiPolygon") return geom.coordinates.some(poly => pointDansAnneau(pt, poly[0]));
    return false;
}

function grouperParChamp(features, champ) {
    const groupes = {};
    features.forEach(f => {
        const cle = (f.properties || {})[champ];
        (groupes[cle] = groupes[cle] || []).push(f);
    });
    return groupes;
}

/* ---------- Chargement + enrichissement (une seule fois) ---------- */

/* Couche "bâtiments" du bundler cadastre-etalab (même service que
   URL_CADASTRE_EPCI, juste un autre nom de flux dans les 8 proposés :
   sections, feuilles, lieux-dits, parcelles, subdivisions fiscales,
   préfixes, communes, bâtiments) : contours réels des constructions,
   contrairement aux parcelles qui ne donnent qu'un contour de terrain.
   Sert uniquement au calcul ci-dessous ("cette parcelle est-elle bâtie ?"),
   pas une couche affichée sur la carte - pas de LAYERS/panel pour ça,
   juste une donnée de travail chargée à la demande, comme les indices
   DVF/DPE. Nom de flux et schéma de géométrie (polygone de contour la
   plupart du temps sur ce jeu de données, mais pas vérifiable en
   conditions réelles depuis cet environnement, accès réseau restreint
   pendant le développement - voir README) : dégrade silencieusement
   vers un tableau vide en cas d'échec, auquel cas "à proximité" retombe
   sur le seul critère de zone PLUi constructible (comportement
   précédent), pas de fiche cassée. */
const URL_BATIMENTS_EPCI = "https://cadastre.data.gouv.fr/bundler/cadastre-etalab/epcis/200070373/geojson/batiments";
let batimentsCharges = null;
function chargerBatiments() {
    if (batimentsCharges) return Promise.resolve(batimentsCharges);
    return fetch(URL_BATIMENTS_EPCI)
        .then(r => r.json())
        .then(data => { batimentsCharges = extraireFeatures(data); return batimentsCharges; })
        .catch(() => { batimentsCharges = []; return batimentsCharges; });
}
/* Point représentatif d'un bâtiment pour un test point-dans-parcelle :
   la plupart des jeux de données de bâtiments cadastraux sont des
   polygones de contour (centroïde), mais au cas où celui-ci serait
   fourni en simples points, les deux formes sont gérées plutôt que de
   supposer une seule géométrie. */
function pointBatiment(b) {
    const geom = b && b.geometry;
    if (!geom) return null;
    return geom.type === "Point" ? geom.coordinates : centroideFeature(b);
}

/* =========================================================
   SERVITUDES D'UTILITÉ PUBLIQUE (SUP)
   Géoportail de l'Urbanisme, via l'API Carto de l'IGN (couche au-dessus
   du GPU, plus simple à interroger qu'un flux WFS brut). ⚠️ Endpoint et
   noms de champs non vérifiables en conditions réelles depuis cet
   environnement (accès réseau restreint pendant le développement, comme
   pour URL_BATIMENTS_EPCI/OLD/catnat ci-dessus/ailleurs) : à confirmer
   une fois en ligne, voir le README pour la marche à suivre si rien ne
   remonte jamais. Interrogée PAR PARCELLE (géométrie en paramètre),
   jamais préchargée pour tout le territoire comme le cadastre : une
   servitude peut concerner n'importe quel point du territoire, un
   filtre par bbox de tout l'EPCI n'apporterait rien qu'un vrai filtre
   géométrique par parcelle ne fasse déjà, et ça reste un seul petit
   appel réseau par clic sur une parcelle plutôt qu'un flux volumineux à
   charger d'un coup. */
const URL_SUP_GPU = "https://apicarto.ign.fr/api/gpu/assiette-sup-s";

/* Nomenclature officielle des catégories de SUP (arrêté du 26/05/2020),
   les plus courantes sur un territoire rural. Champs réels confirmés en
   conditions réelles (retour de l'utilisatrice, une vraie parcelle du
   territoire, servitude AC1 "Hôtel Maillard") : `suptype` porte le code
   de catégorie en MINUSCULES ("ac1", pas "AC1"), `nomsuplitt` le nom
   littéral de la servitude/du monument concerné, `typeass` une
   description du type de périmètre ("Périmètre des abords") - utile en
   repli si le code n'est pas dans la liste ci-dessous. AC1 confirmé
   correct : "Monument historique (abords)" correspondait bien à la
   servitude réelle retournée. */
const LABELS_SUP = {
    AC1: "Monument historique (abords)", AC2: "Site inscrit ou classé",
    AC3: "Réserve naturelle", AC4: "Site patrimonial remarquable",
    A4: "Servitude de halage / marchepied (cours d'eau)", A5: "Aqueduc souterrain",
    A7: "Alignement des cours d'eau non domaniaux",
    I3: "Canalisation de transport de gaz", I4: "Ligne électrique / poste",
    I1: "Hydrocarbures liquides",
    PM1: "Plan de prévention des risques naturels", PM2: "Ancienne carrière",
    PM3: "Plan de prévention des risques technologiques",
    EL3: "Halage et marchepied", EL7: "Alignement des voies publiques",
    T1: "Voie ferrée", T5: "Aérodrome",
    INT1: "Cimetière"
};
function libelleSup(props) {
    const code = (premierChampValide(props, ["suptype", "categorie", "type_sup", "code", "code_sup"]) || "").toString().toUpperCase();
    const categorie = LABELS_SUP[code] || props.typeass || (code ? `Servitude ${code}` : null);
    const nom = premierChampValide(props, ["nomsuplitt", "nomsuf", "libelle", "nom_sup", "generateur", "nom_generateur", "titre", "name"]);
    if (categorie && nom) return `${categorie} : ${nom}`;
    if (categorie) return categorie;
    if (nom) return nom;
    console.warn("SUP : catégorie non reconnue, propriétés brutes reçues :", props);
    return "Servitude (type non identifié - voir la console)";
}

/* Récupère les SUP dont l'assiette recoupe la géométrie de cette
   parcelle - un seul appel réseau, déclenché seulement à l'ouverture
   d'une fiche parcelle (voir ouvrirPopupParcelle, popup.js), pas pour
   les centaines de parcelles d'une recherche par critères. Dégrade vers
   un tableau vide en cas d'échec (réseau, format de réponse inattendu) :
   une section "Servitudes" absente plutôt qu'une fiche cassée. */
function fetchSupPourParcelle(feature) {
    const geom = encodeURIComponent(JSON.stringify(feature.geometry));
    return fetch(`${URL_SUP_GPU}?geom=${geom}`)
        .then(r => r.ok ? r.json() : { features: [] })
        .then(data => {
            const features = extraireFeatures(data);
            /* Dédoublonné par libellé final (pas par un nom de champ brut
               deviné) : plusieurs assiettes de la même servitude peuvent
               recouper la parcelle (ex. plusieurs segments de
               canalisation), on ne veut qu'une seule ligne par servitude
               réellement distincte à l'affichage. */
            const libellesVus = new Set();
            const resultat = [];
            features.forEach(f => {
                const libelle = libelleSup(f.properties || {});
                if (libellesVus.has(libelle)) return;
                libellesVus.add(libelle);
                resultat.push({ libelle });
            });
            return resultat;
        })
        .catch(() => []);
}

function chargerDonneesFoncieres() {
    return Promise.all([
        ...COUCHES_RECHERCHE.map(id => new Promise(resolve => {
            const conf = LAYERS.find(l => l.id === id);
            chargerCouche(conf, resolve, resolve);
        })),
        chargerBatiments()
    ]);
}

/* Index pré-calculés une seule fois pour tout un lot de parcelles
   (recherche par critères) : dvfParReference permet un accès direct par
   référence de parcelle (O(1)) plutôt qu'un .find() sur ~11 000
   mutations à chaque parcelle, dpeParCommune réduit le nombre de DPE à
   tester au point-in-polygon en les groupant par code INSEE au préalable
   (fiable : contrairement au zonage PLUi ci-dessous, ce champ est
   toujours renseigné dans le flux DPE). Pour un usage ponctuel (une
   seule parcelle, ex. popup au clic), infosParcelle reconstruit ces
   index à la volée si on ne les lui fournit pas : le coût est le même
   qu'une seule itération du lot, donc négligeable pour un clic isolé. */
/* Réduit la couche "bâtiments" (potentiellement volumineuse à l'échelle
   de l'EPCI) à celle d'une boîte englobante avant le test point-dans-
   polygone par parcelle - même principe que featuresDansVue (layers.js)
   mais sur l'emprise du lot de parcelles concerné plutôt que sur la vue
   de la carte, pour rester utilisable aussi bien en lot (recherche par
   critères) qu'au clic sur une seule parcelle. */
function bboxUnion(features) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    features.forEach(f => {
        const b = bboxFeature(f);
        if (!b) return;
        if (b[0] < minX) minX = b[0];
        if (b[1] < minY) minY = b[1];
        if (b[2] > maxX) maxX = b[2];
        if (b[3] > maxY) maxY = b[3];
    });
    return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}
function batimentsDansBbox(bbox) {
    if (!bbox) return batimentsCharges || [];
    const [minX, minY, maxX, maxY] = bbox;
    return (batimentsCharges || []).filter(b => {
        const bb = bboxFeature(b);
        return bb && bb[0] <= maxX && bb[2] >= minX && bb[1] <= maxY && bb[3] >= minY;
    });
}

function construireIndicesFonciers(featuresPourBbox) {
    const mutations = donneesBrutes["mutations"] || [];
    const dpePoints = donneesBrutes["dpe"] || [];
    const dvfParReference = {};
    mutations.forEach(f => { dvfParReference[f.properties.reference_parcelle] = f; });
    const bbox = featuresPourBbox && featuresPourBbox.length ? bboxUnion(featuresPourBbox) : null;
    return { dvfParReference, dpeParCommune: grouperParChamp(dpePoints, "code_insee"), batiments: batimentsDansBbox(bbox) };
}

/* Couches déjà chargées au démarrage (lazy: false dans config.js), donc
   toujours disponibles dans donneesBrutes sans chargement supplémentaire
   : sert au "à proximité" de la fiche parcelle. */
const CATEGORIES_PROXIMITE = [
    { layerId: "education", titre: "École la plus proche" },
    { layerId: "commerces", titre: "Commerce le plus proche" },
    { layerId: "mairies", titre: "Mairie la plus proche" }
];

function plusProche(centre, layerId) {
    const features = donneesBrutes[layerId] || [];
    if (!centre || !features.length) return null;
    const origine = L.latLng(centre[1], centre[0]);
    let distanceMin = Infinity;
    features.forEach(f => {
        const pt = (f.geometry && f.geometry.type === "Point") ? f.geometry.coordinates : centroideFeature(f);
        if (!pt) return;
        const d = origine.distanceTo(L.latLng(pt[1], pt[0]));
        if (d < distanceMin) distanceMin = d;
    });
    return Number.isFinite(distanceMin) ? distanceMin : null;
}

/* Calcule toutes les infos foncières d'UNE parcelle : mutation DVF
   correspondante (référence exacte), zone PLUi et niveau RGA à cet
   endroit (le centre de la parcelle tombe dans quelle zone ?), DPE le
   plus proche s'il est à l'intérieur de la parcelle, et distance aux
   équipements les plus proches. Le zonage PLUi n'est PAS groupé par
   commune comme le sont DPE/mutations : son champ "insee" s'est avéré
   systématiquement vide dans le flux réel (contrairement à ce que
   laissait supposer le jeu de données de test utilisé au départ), le
   grouper aurait donc fait échouer la recherche de zone à tous les
   coups. Pas grave en pratique : quelques centaines de zones, un simple
   point-in-polygon sur l'ensemble reste rapide. Pour les ventes,
   "elements_locaux"/"elements_terrains" d'une mutation DVF peuvent
   porter sur plusieurs parcelles à la fois (un même acte notarié
   regroupant plusieurs références) : on ne garde que les lots dont le
   champ "parcelle" correspond exactement à celle affichée, sinon le
   nombre de bâtiments/surface bâtie compterait aussi ceux des parcelles
   voisines vendues dans le même acte. */
function infosParcelle(feature, indices) {
    const { dvfParReference, dpeParCommune, batiments } = indices || construireIndicesFonciers([feature]);
    const zonesPLUi = donneesBrutes["zonagePLUi"] || [];
    const zonesRGA = donneesBrutes["rga"] || [];
    const p = feature.properties;
    const centre = centroideFeature(feature);

    const dvf = dvfParReference[p.id] || null;
    const dpe = (dpeParCommune[p.commune] || [])
        .find(f => pointDansFeature(f.geometry.coordinates, feature)) || null;
    const plui = zonesPLUi.find(zone => pointDansFeature(centre, zone)) || null;
    const rga = zonesRGA.find(zone => pointDansFeature(centre, zone)) || null;

    /* ventesDepuisMutation (config.js) : partagée avec le style et le
       popup de la couche "mutations" elle-même, pour ne pas dupliquer
       ce calcul (filtrage des lots à la seule parcelle concernée). */
    const ventes = ventesDepuisMutation(dvf);

    const typezonePLUi = plui ? plui.properties.typezone : null;
    const nbBatiments = ventes[0] ? ventes[0].nbBatiments : null;

    /* Une parcelle est-elle bâtie ? Signalé en conditions réelles que le
       seul critère précédent (nbBatiments, issu de la dernière mutation
       DVF connue) ratait de vraies maisons sur des parcelles classées en
       zone agricole (typiquement un corps de ferme jamais revendu depuis
       la mise en place du DVF) : ce signal ne couvre que les parcelles
       déjà vendues, pas la totalité du bâti existant. Remplacé/complété
       ici par un vrai test géométrique contre la couche "bâtiments" du
       cadastre (voir chargerBatiments plus haut) : le centre d'AU MOINS
       UN bâtiment tombe-t-il dans cette parcelle, indépendamment de son
       zonage PLUi et de son historique de vente. */
    const aUnBatiment = (batiments || []).some(b => {
        const pt = pointBatiment(b);
        return pt && pointDansFeature(pt, feature);
    });

    /* "À proximité" n'a de sens que pour un terrain à bâtir ou une
       parcelle qui porte déjà une maison (voir ZONES_PLUI_CONSTRUCTIBLES
       plus haut) : sur une parcelle agricole/naturelle sans bâti, ni
       personne ne s'en sert, ni la recherche par critères qui n'affiche
       jamais ce champ — inutile de calculer la distance aux équipements
       les plus proches (le plus coûteux de ce qui précède) à chaque fois.
       nbBatiments gardé en plus de aUnBatiment (pas à la place) : filet
       de sécurité si jamais le chargement de la couche "bâtiments" a
       échoué (dégradation silencieuse vers un tableau vide, voir
       chargerBatiments), pas de perte par rapport au comportement
       précédent dans ce cas. */
    const proximite = (ZONES_PLUI_CONSTRUCTIBLES.includes(typezonePLUi) || aUnBatiment || nbBatiments)
        ? CATEGORIES_PROXIMITE
            .map(cat => {
                const distance = plusProche(centre, cat.layerId);
                return distance !== null ? { titre: cat.titre, distance } : null;
            })
            .filter(Boolean)
        : [];

    return {
        commune: p.commune, communeNom: p.commune_nom, surface: p.surface_m2,
        adresse: dvf ? dvf.properties.adresse : null,
        typezonePLUi,
        libellePLUi: plui ? (plui.properties.libelong || plui.properties.libelle) : null,
        niveauRGA: rga ? rga.properties.niveau : null,
        ventes, nbBatiments,
        surfaceBatie: ventes[0] ? ventes[0].surfaceBatie : null,
        dpe: dpe ? {
            classe: dpe.properties.etiquette_dpe, conso: dpe.properties.consommation,
            anneeConstruction: dpe.properties.annee_construction
        } : null,
        proximite
    };
}

/* Pour chaque parcelle cadastrale (déjà réduite aux seules parcelles
   visibles à l'écran, voir ouvrirRecherche) : ne garde que le sous-
   ensemble compact utile au filtrage (voir correspond()), calculé via
   infosParcelle ci-dessus. */
function enrichirParcelles(parcelles) {
    const indices = construireIndicesFonciers(parcelles);
    parcelles.forEach(parcelle => {
        const infos = infosParcelle(parcelle, indices);
        const derniereVente = infos.ventes[0] || null;
        parcelle._recherche = {
            commune: infos.commune, surface: infos.surface,
            typezonePLUi: infos.typezonePLUi, niveauRGA: infos.niveauRGA,
            dvf: infos.ventes.length > 0,
            prixVente: derniereVente ? derniereVente.valeur : null,
            anneeVente: derniereVente ? derniereVente.annee : null,
            nbBatiments: infos.nbBatiments, surfaceBatie: infos.surfaceBatie,
            etiquetteDpe: infos.dpe ? infos.dpe.classe : null
        };
    });

    resultatsEnrichis = parcelles;
    return parcelles;
}

/* ---------- Filtrage ---------- */

function lireCriteres() {
    const val = id => document.getElementById(id).value.trim();
    const num = id => { const v = val(id); return v === "" ? null : Number(v); };

    return {
        commune: val("rf-commune") || null,
        surfaceMin: num("rf-surface-min"), surfaceMax: num("rf-surface-max"),
        typezonePLUi: val("rf-plui") || null,
        niveauRGA: val("rf-rga") ? Number(val("rf-rga")) : null,
        aEuUneVente: document.getElementById("rf-vente").checked,
        prixMin: num("rf-prix-min"), prixMax: num("rf-prix-max"),
        anneeVenteMin: num("rf-annee-vente-min"), anneeVenteMax: num("rf-annee-vente-max"),
        nbBatimentsMin: num("rf-batiments-min"), surfaceBatieMin: num("rf-surface-batie-min"),
        dpe: CLASSES_DPE.filter(c => document.getElementById("rf-dpe-" + c).checked)
    };
}

function correspond(r, c) {
    if (c.commune && r.commune !== c.commune) return false;
    if (c.surfaceMin != null && (r.surface == null || r.surface < c.surfaceMin)) return false;
    if (c.surfaceMax != null && (r.surface == null || r.surface > c.surfaceMax)) return false;
    if (c.typezonePLUi === "constructible" && !ZONES_PLUI_CONSTRUCTIBLES.includes(r.typezonePLUi)) return false;
    if (c.typezonePLUi && c.typezonePLUi !== "constructible" && r.typezonePLUi !== c.typezonePLUi) return false;
    if (c.niveauRGA != null && r.niveauRGA !== c.niveauRGA) return false;
    if (c.aEuUneVente && !r.dvf) return false;
    if (c.prixMin != null && (r.prixVente == null || r.prixVente < c.prixMin)) return false;
    if (c.prixMax != null && (r.prixVente == null || r.prixVente > c.prixMax)) return false;
    if (c.anneeVenteMin != null && (r.anneeVente == null || r.anneeVente < c.anneeVenteMin)) return false;
    if (c.anneeVenteMax != null && (r.anneeVente == null || r.anneeVente > c.anneeVenteMax)) return false;
    if (c.nbBatimentsMin != null && (r.nbBatiments == null || r.nbBatiments < c.nbBatimentsMin)) return false;
    if (c.surfaceBatieMin != null && (r.surfaceBatie == null || r.surfaceBatie < c.surfaceBatieMin)) return false;
    if (c.dpe.length && (!r.etiquetteDpe || !c.dpe.includes(r.etiquetteDpe))) return false;
    return true;
}

function filtrerParcelles(criteres) {
    return (resultatsEnrichis || []).filter(feature => correspond(feature._recherche, criteres));
}

/* ---------- Affichage des résultats sur la carte ---------- */

function afficherResultatsRecherche(map, features) {
    if (coucheRechercheActuelle) {
        map.removeLayer(coucheRechercheActuelle);
        coucheRechercheActuelle = null;
    }
    if (groupesLeaflet["cadastre"] && map.hasLayer(groupesLeaflet["cadastre"])) {
        map.removeLayer(groupesLeaflet["cadastre"]);
        const checkbox = document.getElementById("layer-cadastre");
        if (checkbox) checkbox.checked = false;
    }
    const boutonVider = document.getElementById("rf-vider");
    if (!features.length) {
        if (boutonVider) boutonVider.disabled = true;
        return;
    }

    const conf = LAYERS.find(l => l.id === "cadastre");
    coucheRechercheActuelle = construireCoucheDonnees(
        { type: "FeatureCollection", features },
        { ...conf, styleFn: () => ({ color: PALETTE.terracotta, weight: 2, fillColor: PALETTE.terracotta, fillOpacity: 0.35 }) }
    );
    coucheRechercheActuelle.addTo(map);
    if (boutonVider) boutonVider.disabled = false;

    const bounds = L.geoJSON({ type: "FeatureCollection", features }).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 17, padding: [40, 40] });
}

/* Retire uniquement les parcelles surlignées par la dernière recherche
   affichée sur la carte, sans toucher aux critères du formulaire (voir
   reinitialiserFormulaire ci-dessus, qui fait l'inverse) : les deux
   actions sont volontairement séparées, l'une pour repartir sur des
   critères vierges, l'autre pour juste faire de la place sur la carte
   avant une nouvelle recherche. */
function viderSelectionCarte(map) {
    if (coucheRechercheActuelle) {
        map.removeLayer(coucheRechercheActuelle);
        coucheRechercheActuelle = null;
    }
    const boutonVider = document.getElementById("rf-vider");
    if (boutonVider) boutonVider.disabled = true;
}

/* Retour de l'utilisatrice : fermer le panneau recherche foncière (flèche
   retour) laissait les parcelles surlignées sur la carte, obligeant à
   cliquer "Vider la sélection" en plus - on vide donc automatiquement en
   quittant la vue, comme si elle avait cliqué ce bouton juste avant. */
function fermerRechercheFonciere(map) {
    viderSelectionCarte(map);
    fermerVuesPanneau();
}

/* ---------- Formulaire ---------- */

function optionsCommune() {
    return `<option value="">Toutes les communes</option>` +
        Object.keys(COMMUNES_TERRITOIRE).sort((a, b) => COMMUNES_TERRITOIRE[a].localeCompare(COMMUNES_TERRITOIRE[b]))
            .map(insee => `<option value="${insee}">${COMMUNES_TERRITOIRE[insee]}</option>`).join("");
}

function construireFormulaire() {
    const conteneur = document.getElementById("recherche-contenu");
    conteneur.innerHTML = `
        <form id="recherche-form">
            <label class="rf-champ">
                <span>Commune</span>
                <select id="rf-commune">${optionsCommune()}</select>
            </label>

            <div class="rf-groupe">
                <div class="rf-groupe-titre">Parcelle</div>
                <label class="rf-champ rf-champ-plage">
                    <span>Surface (m²)</span>
                    <span class="rf-plage"><input type="number" id="rf-surface-min" min="0" placeholder="min"> → <input type="number" id="rf-surface-max" min="0" placeholder="max"></span>
                </label>
                <label class="rf-champ">
                    <span>Zone PLUi</span>
                    <select id="rf-plui">
                        <option value="">Toutes les zones</option>
                        <option value="constructible">Constructible dès aujourd'hui (U + AUc)</option>
                        ${Object.keys(LABELS_PLUI).map(k => `<option value="${k}">${LABELS_PLUI[k]}</option>`).join("")}
                    </select>
                </label>
                <label class="rf-champ">
                    <span>Aléa retrait-gonflement des argiles</span>
                    <select id="rf-rga">
                        <option value="">Indifférent</option>
                        ${Object.keys(LABELS_RGA).map(k => `<option value="${k}">${LABELS_RGA[k]}</option>`).join("")}
                    </select>
                </label>
            </div>

            <div class="rf-groupe">
                <div class="rf-groupe-titre">Bâti <small>(estimé depuis la dernière vente connue)</small></div>
                <label class="rf-champ">
                    <span>Nombre de bâtiments (min)</span>
                    <input type="number" id="rf-batiments-min" min="0">
                </label>
                <label class="rf-champ">
                    <span>Surface bâtie (min, m²)</span>
                    <input type="number" id="rf-surface-batie-min" min="0">
                </label>
                <div class="rf-champ">
                    <span>Classe DPE</span>
                    <div class="rf-dpe-liste">
                        ${CLASSES_DPE.map(c => `
                            <label class="rf-dpe-chip rf-dpe-${c}">
                                <input type="checkbox" id="rf-dpe-${c}">${c}
                            </label>
                        `).join("")}
                    </div>
                </div>
            </div>

            <div class="rf-groupe">
                <div class="rf-groupe-titre">Ventes (DVF)</div>
                <label class="rf-champ rf-champ-inline">
                    <input type="checkbox" id="rf-vente">
                    <span>A eu une vente connue</span>
                </label>
                <label class="rf-champ rf-champ-plage">
                    <span>Prix (€)</span>
                    <span class="rf-plage"><input type="number" id="rf-prix-min" min="0" placeholder="min"> → <input type="number" id="rf-prix-max" min="0" placeholder="max"></span>
                </label>
                <label class="rf-champ rf-champ-plage">
                    <span>Année de vente</span>
                    <span class="rf-plage"><input type="number" id="rf-annee-vente-min" min="2014" max="2030" placeholder="min"> → <input type="number" id="rf-annee-vente-max" min="2014" max="2030" placeholder="max"></span>
                </label>
            </div>

            <button type="button" id="rf-ici" class="rf-bouton-secondaire" hidden>Rechercher ici</button>
            <div id="rf-statut" class="rf-statut rf-statut-chargement"><i class="fa-solid fa-circle-notch fa-spin"></i>Chargement des données foncières...</div>

            <div class="rf-actions">
                <button type="submit" id="rf-appliquer" class="rf-bouton-principal" disabled>Afficher les parcelles correspondantes</button>
                <button type="button" id="rf-vider" class="rf-bouton-secondaire" disabled>Vider la sélection sur la carte</button>
                <button type="button" id="rf-reset" class="rf-bouton-secondaire">Réinitialiser les critères</button>
            </div>
        </form>
    `;
}

function compterResultats() {
    return filtrerParcelles(lireCriteres()).length;
}

function mettreAJourStatut() {
    const statut = document.getElementById("rf-statut");
    const bouton = document.getElementById("rf-appliquer");
    if (!statut || !resultatsEnrichis) return;

    statut.classList.remove("rf-statut-chargement");
    const n = compterResultats();
    if (n === 0) {
        statut.textContent = "Aucune parcelle ne correspond à ces critères.";
    } else if (n > LIMITE_RESULTATS) {
        statut.textContent = `${n.toLocaleString("fr-FR")} parcelles correspondent : affinez la recherche pour en afficher moins de ${LIMITE_RESULTATS.toLocaleString("fr-FR")}.`;
    } else {
        statut.textContent = `${n.toLocaleString("fr-FR")} parcelle(s) correspondante(s).`;
    }
    bouton.disabled = n === 0 || n > LIMITE_RESULTATS;
}

function reinitialiserFormulaire() {
    document.getElementById("recherche-form").reset();
    mettreAJourStatut();
}

/* Un seul écouteur "moveend" enregistré une fois pour toutes (pas à
   chaque ouverture du panneau, sinon ça s'empilerait à chaque
   réouverture) : la recherche ne porte que sur les parcelles visibles au
   moment de l'enrichissement (voir plus haut) - si l'utilisatrice déplace
   la carte pendant que le panneau reste ouvert, ce résultat devient
   silencieusement obsolète sans ce bouton. N'agit que si le panneau
   recherche est actuellement affiché (vérifié à chaque déclenchement via
   `hidden`, pas seulement à l'enregistrement) : un déplacement de carte
   ailleurs dans le site n'a aucun rapport avec la recherche foncière. */
let ecouteurDeplacementRechercheBranche = false;

function ouvrirRecherche(map, codeInseeCible) {
    fermerAccueil();
    basculerVuePanneau("recherche-view");
    togglerPanneauCouches(true);
    construireFormulaire();

    const form = document.getElementById("recherche-form");
    form.addEventListener("input", mettreAJourStatut);
    form.addEventListener("submit", event => {
        event.preventDefault();
        /* Le panneau reste ouvert sur cette même vue (contrairement à
           l'ancien comportement qui repassait sur l'arbre de couches) :
           sinon on perd ses critères de recherche à chaque affichage,
           et il faut rouvrir le panneau pour en essayer d'autres. */
        afficherResultatsRecherche(map, filtrerParcelles(lireCriteres()));
    });
    document.getElementById("rf-vider").addEventListener("click", () => viderSelectionCarte(map));
    document.getElementById("rf-reset").addEventListener("click", reinitialiserFormulaire);
    document.getElementById("rf-ici").addEventListener("click", () => rechercherIci(map));

    if (!ecouteurDeplacementRechercheBranche) {
        ecouteurDeplacementRechercheBranche = true;
        map.on("moveend", () => {
            const vue = document.getElementById("recherche-view");
            const bouton = document.getElementById("rf-ici");
            if (vue && !vue.hidden && bouton) bouton.hidden = false;
        });
    }

    return codeInseeCible ? chargerEtEnrichirCommune(codeInseeCible) : chargerEtEnrichirVueActuelle(map);
}

/* Charge (si besoin, chargerDonneesFoncieres est idempotente) et
   enrichit les parcelles de la vue actuelle - factorisé entre l'ouverture
   du panneau et le bouton "Rechercher ici", même logique dans les deux
   cas. */
function chargerEtEnrichirVueActuelle(map) {
    const statut = document.getElementById("rf-statut");
    const bouton = document.getElementById("rf-ici");
    const zoomMin = zoomMinCadastre();
    if (bouton) bouton.hidden = true;

    if (map.getZoom() < zoomMin) {
        statut.classList.remove("rf-statut-chargement");
        statut.textContent = `Zoomez sur une zone du territoire (niveau ${zoomMin} ou plus) pour lancer une recherche : elle ne porte que sur les parcelles affichées à l'écran.`;
        document.getElementById("rf-appliquer").disabled = true;
        return Promise.resolve(false);
    }

    return chargerDonneesFoncieres().then(() => {
        const visibles = featuresDansVue("cadastre", map);
        enrichirParcelles(visibles);
        document.getElementById("rf-appliquer").disabled = false;
        mettreAJourStatut();
        return true;
    });
}

/* Voir la note en tête de fichier : contourne volontairement la limite
   "vue actuelle" pour une commune précise, en repartant de
   donneesBrutes["cadastre"] (déjà chargé en entier) plutôt que de
   featuresDansVue (limité à la vue carte). */
function chargerEtEnrichirCommune(codeInsee) {
    const bouton = document.getElementById("rf-ici");
    if (bouton) bouton.hidden = true;

    return chargerDonneesFoncieres().then(() => {
        const parcelles = (donneesBrutes["cadastre"] || []).filter(f => f.properties && f.properties.commune === codeInsee);
        enrichirParcelles(parcelles);
        document.getElementById("rf-appliquer").disabled = false;
        mettreAJourStatut();
        return true;
    });
}

function rechercherIci(map) {
    chargerEtEnrichirVueActuelle(map);
}

/* =========================================================
   RECHERCHE RAPIDE (écran d'accueil, #hero-parcelle)
   Quatre champs simplifiés (commune, surface min, constructible,
   DPE connu) qui préremplissent le panneau complet plutôt que de
   dupliquer sa logique de filtrage - "DPE connu" coche les 7 classes
   à la fois (peu importe laquelle, du moment qu'une étiquette existe),
   "constructible" réutilise l'option "constructible" du champ Zone
   PLUi ajoutée ci-dessus pour l'occasion (utilisable aussi directement
   depuis le panneau complet, pas seulement via ce raccourci).
   ========================================================= */
function initHeroParcelle(map) {
    const selectCommune = document.getElementById("hp-commune");
    if (!selectCommune) return;
    Object.keys(COMMUNES_TERRITOIRE)
        .sort((a, b) => COMMUNES_TERRITOIRE[a].localeCompare(COMMUNES_TERRITOIRE[b], "fr"))
        .forEach(code => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = COMMUNES_TERRITOIRE[code];
            selectCommune.appendChild(option);
        });

    document.getElementById("hero-parcelle-form").addEventListener("submit", event => {
        event.preventDefault();
        lancerRechercheRapide(map, {
            commune: document.getElementById("hp-commune").value || null,
            surfaceMin: document.getElementById("hp-surface-min").value || null,
            constructible: document.getElementById("hp-constructible").checked,
            dpeConnu: document.getElementById("hp-dpe-connu").checked
        });
    });
}

function lancerRechercheRapide(map, criteres) {
    ouvrirRecherche(map, criteres.commune).then(succes => {
        document.getElementById("rf-commune").value = criteres.commune || "";
        if (criteres.surfaceMin) document.getElementById("rf-surface-min").value = criteres.surfaceMin;
        if (criteres.constructible) document.getElementById("rf-plui").value = "constructible";
        if (criteres.dpeConnu) CLASSES_DPE.forEach(c => { document.getElementById("rf-dpe-" + c).checked = true; });
        mettreAJourStatut();
        /* succes=false : soit pas de commune choisie et carte pas assez
           zoomée (message déjà affiché par chargerEtEnrichirVueActuelle),
           soit un souci de chargement - dans les deux cas les critères
           restent préremplis, à l'utilisatrice de zoomer/cliquer
           "Afficher les parcelles correspondantes" elle-même. */
        if (succes) afficherResultatsRecherche(map, filtrerParcelles(lireCriteres()));
    });
}
