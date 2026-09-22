/* =========================================================
   GÉOBERCÉ — CHARGEUR GÉNÉRIQUE DE COUCHES
   Une seule fonction sait charger n'importe laquelle des
   couches décrites dans config.js, selon son "type".
   ========================================================= */

/* Options communes à toutes les popups du site (points, adresses de
   recherche...). `maxWidth` généreux (nos fiches vont jusqu'à 390px de
   large, popup-carburant) plutôt que le défaut Leaflet (300px) : sans
   ça, la largeur affichée dépendait d'un forçage CSS ("!important" sur
   .leaflet-popup-content) appliqué APRÈS le calcul interne de Leaflet
   (_adjustPan, basé sur la largeur qu'IL pense avoir), d'où un
   décalage - signalé en conditions réelles : une popup ouverte près du
   bord de la carte pouvait se fermer/mal se positionner au lieu de
   glisser proprement dans le champ visible. `autoPanPadding` élargi
   (24px, contre 5px par défaut) pour garder une marge nette avec le
   bord plutôt qu'un pixel-perfect qui laisse la popup coller au bord. */
const OPTIONS_POPUP = { maxWidth: 420, autoPanPadding: [24, 24] };

const groupesLeaflet = {};      // id de couche -> L.LayerGroup / L.MarkerClusterGroup
const souscouchesLeaflet = {};  // id de couche -> { idCategorie: L.LayerGroup } (couches catégorisables, ex : commerces)
const coucheChargee = {};       // id de couche -> bool (déjà fetchée ?)
const donneesBrutes = {};       // id de couche -> tableau de Features GeoJSON brutes (croisements/recherches, ex : recherche foncière)
window.indexRecherche = [];  // alimenté au fur et à mesure du chargement des couches

/* Boîte englobante [minLon, minLat, maxLon, maxLat] du territoire (EPCI),
   calculée une fois couches/epci.geojson chargé (voir le fetch dans
   js/map.js). Sert à limiter les couches "flux" nationales (ex. Vigieau,
   voir clipperAuTerritoire dans config.js) au territoire plutôt que de
   construire des centaines de polygones inutiles pour le reste de la
   France - null tant que epci.geojson n'est pas encore résolu, à tester
   par l'appelant (ne rien filtrer plutôt que de risquer de tout
   masquer). */
let bboxTerritoire = null;

function couleurPrix(prix) {
    if (prix === null || prix === undefined || isNaN(prix)) return "#b8c0bd";
    if (prix < 1000) return "#2e8b57";
    if (prix < 1300) return "#76a942";
    if (prix < 1600) return "#b7c94a";
    if (prix < 1900) return "#e0c83c";
    if (prix < 2200) return "#eda832";
    if (prix < 2600) return "#e47732";
    return "#c94338";
}

/* Échelle séquentielle (une seule teinte, du clair au foncé) plutôt que
   la palette rouge/vert de couleurPrix : une population plus ou moins
   nombreuse n'est pas "bonne" ou "mauvaise" comme peut l'être un prix au
   m², une échelle à jugement de valeur serait trompeuse ici. Seuils
   pensés pour des communes rurales de la taille de celles du territoire
   (quelques centaines à quelques milliers d'habitants), pas pour une
   grande ville. */
function couleurPopulation(pop) {
    if (pop === null || pop === undefined || isNaN(pop)) return "#b8c0bd";
    if (pop < 300) return "#DCEDEA";
    if (pop < 600) return "#B8DBD3";
    if (pop < 1000) return "#8AC4B7";
    if (pop < 1500) return "#5AA898";
    if (pop < 2500) return "#2E8B7A";
    return "#0F6E56";
}

/* `layer` (le marqueur/polygone/ligne Leaflet réel, déjà lié à sa vraie
   popup stylée) est gardé dans l'entrée d'index : la recherche et "près
   de chez moi" peuvent ainsi rouvrir CETTE popup (voir ouvrirPopupIndex
   plus bas) au lieu d'en construire une autre, plus pauvre, à la volée. */
function ajouterAuIndex(feature, latlng, layerConf, layer) {
    if (!layerConf.searchable || !latlng) return;
    const props = feature.properties || {};
    const titre = premierChampValide(props, layerConf.titleFields || []);
    if (!titre) return;

    const { icon, color } = resoudreIconeCouleur(feature, layerConf);

    /* layerConf.sousTitrePourFeature (optionnel, même principe que
       iconePourFeature) prend le dessus sur subtitleFields quand présent :
       certains champs bruts (type OSM "bakery", horaires au format OSM
       "Mo-Fr 08:00-19:00"...) ne sont pas présentables tels quels dans la
       recherche/"près de chez moi" - retour direct de l'utilisatrice. */
    const sousTitre = layerConf.sousTitrePourFeature
        ? layerConf.sousTitrePourFeature(feature)
        : (layerConf.subtitleFields || []).map(c => props[c]).filter(Boolean).join(" · ");

    window.indexRecherche.push({
        titre: String(titre),
        sousTitre,
        icon: icon,
        color: color,
        latlng: latlng,
        layerId: layerConf.id,
        groupLabel: (GROUPS[layerConf.group] || {}).label || "",
        layer: layer
    });
}

/* Retrouve, pour un marqueur donné, le L.MarkerClusterGroup qui le
   contient réellement (souscouchesLeaflet[layerId] pour les couches
   catégorisées comme les commerces, groupesLeaflet[layerId] sinon) :
   nécessaire pour rouvrir la popup d'un marqueur actuellement replié
   dans un cluster (group.zoomToShowLayer gère le zoom/déploiement,
   contrairement à un simple marker.openPopup() qui ne fait rien tant
   que le marqueur n'est pas individuellement sur la carte). Renvoie
   null si la couche n'est pas clusterisée : un simple openPopup() après
   recentrage suffit dans ce cas (voir les appelants). */
function trouverGroupeCluster(layerId, layer) {
    const essayer = groupe => (groupe && typeof groupe.zoomToShowLayer === "function" && groupe.hasLayer(layer)) ? groupe : null;

    const direct = essayer(groupesLeaflet[layerId]);
    if (direct) return direct;

    const sousCouches = souscouchesLeaflet[layerId];
    if (sousCouches) {
        for (const cle of Object.keys(sousCouches)) {
            const trouve = essayer(sousCouches[cle]);
            if (trouve) return trouve;
        }
    }
    return null;
}

/* Point d'entrée commun utilisé par la recherche et "près de chez moi"
   pour ouvrir la vraie popup (stylée) d'une entrée de l'index plutôt que
   d'en construire une ad hoc à la volée : centre/zoome la carte sur le
   point, en passant par zoomToShowLayer si la couche est clusterisée
   pour que le marqueur soit effectivement visible avant d'ouvrir sa
   popup. Les cases à cocher du panneau ne sont PAS cochées par défaut
   (voir panel.js) : la donnée est déjà chargée pour alimenter l'index
   de recherche dès le démarrage, mais sa couche Leaflet peut très bien
   ne jamais avoir été ajoutée à la carte — sans quoi openPopup() ne
   ferait rien (le marqueur n'a pas de carte). On s'assure donc ici que
   la couche est bien affichée (et sa case cochée, pour rester cohérent
   avec l'état du panneau) avant de tenter d'ouvrir quoi que ce soit. */
function ouvrirPopupIndex(map, item) {
    if (!item.layer) { map.setView(item.latlng, 17); return; }

    const groupePrincipal = groupesLeaflet[item.layerId];
    if (groupePrincipal && !map.hasLayer(groupePrincipal)) {
        map.addLayer(groupePrincipal);
        const checkbox = document.getElementById("layer-" + item.layerId);
        if (checkbox) checkbox.checked = true;
    }

    const groupeCluster = trouverGroupeCluster(item.layerId, item.layer);
    if (groupeCluster) {
        groupeCluster.zoomToShowLayer(item.layer, () => item.layer.openPopup());
    } else {
        map.setView(item.latlng, 17);
        item.layer.openPopup();
    }
}

function construireCoucheDonnees(data, layerConf) {

    function calculerStyle(feature) {
        if (layerConf.styleFn) {
            return layerConf.styleFn(feature);
        }
        if (layerConf.type === "line") {
            return { color: layerConf.color, weight: 3, opacity: 0.8 };
        }
        if (layerConf.type === "polygon") {
            return { color: layerConf.color, weight: 1, fillColor: layerConf.color, fillOpacity: 0.25 };
        }
        if (layerConf.type === "choropleth") {
            const v = feature.properties[layerConf.valueField];
            return { color: "#fff", weight: 1, fillColor: couleurPrix(v), fillOpacity: 0.6 };
        }
        return {};
    }

    /* Surbrillance de la ligne sélectionnée (randonnées, itinéraires
       cyclables...) : une seule à la fois PAR COUCHE (une ligne mise en
       avant côté rando n'éteint pas une sélection côté vélo) - état
       fermé sur cet appel de construireCoucheDonnees, pas une variable
       globale au module. */
    let ligneSurbrillance = null;
    function retirerSurbrillanceLigne() {
        if (ligneSurbrillance) {
            ligneSurbrillance.layer.setStyle(ligneSurbrillance.styleOriginal);
            ligneSurbrillance = null;
        }
    }
    function surbrillerLigne(layer, styleOriginal) {
        retirerSurbrillanceLigne();
        layer.setStyle({ weight: styleOriginal.weight + 4, opacity: 1 });
        layer.bringToFront();
        ligneSurbrillance = { layer, styleOriginal };
    }

    let cible = L.geoJSON(null, {

        pointToLayer: function (feature, latlng) {
            const marker = L.marker(latlng, { icon: iconePourCouche(feature, layerConf) });
            ajouterAuIndex(feature, latlng, layerConf, marker);
            return marker;
        },

        style: calculerStyle,

        onEachFeature: function (feature, layer) {
            if (layerConf.type === "line" && typeof layer.getLatLngs === "function") {
                /* Zone de clic élargie : une ligne fine (3px visible) est
                   difficile à cliquer précisément, et sans marge un clic
                   à côté retombe sur ce qu'il y a en dessous (ex. le
                   contour de commune, lui-même cliquable) plutôt que sur
                   l'itinéraire - retour direct de l'utilisatrice. Une
                   polyligne invisible bien plus large (weight 16),
                   superposée, sert de vraie cible de clic sans changer
                   l'apparence ; la ligne visible d'origine devient
                   purement décorative (interactive: false), toute
                   l'interaction passe par cette zone de clic, y compris
                   la surbrillance au clic (deuxième retour) et le
                   retour à l'état d'origine à la fermeture de la popup. */
                const styleOriginal = calculerStyle(feature);
                layer.options.interactive = false;

                const zoneClic = L.polyline(layer.getLatLngs(), { weight: 16, opacity: 0, interactive: true });
                if (!layerConf.sansPopup) {
                    zoneClic.bindPopup(construirePopup(feature, layerConf), OPTIONS_POPUP);
                }
                zoneClic.on("click", () => surbrillerLigne(layer, styleOriginal));
                zoneClic.on("popupclose", retirerSurbrillanceLigne);
                cible.addLayer(zoneClic);

                ajouterAuIndex(feature, layer.getBounds ? layer.getBounds().getCenter() : null, layerConf, zoneClic);
                return;
            }

            /* sansPopup : quelques couches dont les données OSM sont
               presque toujours trop pauvres pour justifier une fiche
               (juste un point d'intérêt à repérer sur la carte, sans
               rien à raconter dessus la plupart du temps) - décidé avec
               l'utilisatrice plutôt que de garder une popup qui
               n'affiche quasi jamais que son titre générique. Le
               marqueur reste cliquable normalement pour tout le reste
               (recherche, "près de chez moi", clusters) : seul le
               popup.bindPopup est sauté, pas l'indexation. */
            if (!layerConf.sansPopup) {
                layer.bindPopup(construirePopup(feature, layerConf), OPTIONS_POPUP);
            }
            /* La fiche parcelle a besoin de couches encore en différé
               (mutations/DPE/PLUi/RGA) : plutôt que de les charger à la
               construction de CHAQUE parcelle visible (donc à chaque
               déplacement de carte), on ne le fait qu'à l'ouverture
               réelle d'une popup précise (voir ouvrirPopupParcelle). */
            if (layerConf.id === "cadastre") {
                layer.on("popupopen", () => ouvrirPopupParcelle(feature, layer));
            }
            if (layerConf.type !== "point") {
                ajouterAuIndex(feature, layer.getBounds ? layer.getBounds().getCenter() : null, layerConf, layer);
            }
        }

    });

    cible.addData(data);

    if (layerConf.type === "point" && layerConf.cluster && typeof L.markerClusterGroup === "function") {
        const cluster = L.markerClusterGroup({ maxClusterRadius: 45, disableClusteringAtZoom: 17 });
        cluster.addLayer(cible);
        return cluster;
    }

    return cible;
}

/* Couches "catégorisables" (ex : commerces) : au lieu d'une seule couche
   Leaflet pour toute la donnée, on construit une sous-couche indépendante
   par catégorie (layerConf.categoriser renvoie l'id de catégorie pour
   chaque feature), pour que chacune soit affichable/masquable séparément
   depuis la légende (js/panel.js). groupesLeaflet[id] reste malgré tout
   un layerGroup regroupant tout, pour que la case à cocher principale
   continue de fonctionner comme les autres couches. */
function construireSousCouches(data, layerConf) {
    const categories = (layerConf.legend || [])
        .concat(layerConf.legendDefaut ? [layerConf.legendDefaut] : []);

    const featuresParCategorie = {};
    categories.forEach(cat => { featuresParCategorie[cat.id] = []; });

    (data.features || []).forEach(feature => {
        const catId = layerConf.categoriser(feature);
        if (!featuresParCategorie[catId]) featuresParCategorie[catId] = [];
        featuresParCategorie[catId].push(feature);
    });

    const sousCouches = {};
    Object.keys(featuresParCategorie).forEach(catId => {
        const features = featuresParCategorie[catId];
        if (!features.length) return;
        sousCouches[catId] = construireCoucheDonnees({ type: "FeatureCollection", features }, layerConf);
    });
    return sousCouches;
}

/* Couche image (tuiles WMS) : pas de fetch/GeoJSON, juste un flux de tuiles
   du serveur distant. Utilisé pour les couches réglementaires diffusées
   uniquement en flux OGC (ex : obligations de débroussaillement). */
function construireCoucheWMS(layerConf) {
    return L.tileLayer.wms(layerConf.wmsUrl, {
        layers: layerConf.wmsLayer,
        format: layerConf.wmsFormat || "image/png",
        version: layerConf.wmsVersion || "1.3.0",
        transparent: true,
        opacity: layerConf.opacity || 0.65,
        attribution: layerConf.attribution || ""
    });
}

function chargerCouche(layerConf, onReady, onError) {

    if (coucheChargee[layerConf.id]) {
        if (onReady) onReady();
        return;
    }

    if (layerConf.type === "wms") {
        groupesLeaflet[layerConf.id] = construireCoucheWMS(layerConf);
        coucheChargee[layerConf.id] = true;
        if (onReady) onReady();
        return;
    }

    /* layerConf.file peut être une seule URL, ou un tableau (ex : cadastre,
       un fichier par commune) : dans ce cas on récupère tout en parallèle
       et on passe le tableau de réponses à transform() pour fusion.
       layerConf.fetchPersonnalise (optionnel) remplace complètement cette
       récupération standard par une Promise fournie par la couche elle-même
       - utilisé par les consignes/casiers colis pour réessayer plusieurs
       miroirs Overpass l'un après l'autre (voir fetchOverpassLockers dans
       config.js), l'instance publique principale étant connue pour renvoyer
       des 504 sous charge. */
    const recuperer = layerConf.fetchPersonnalise
        ? layerConf.fetchPersonnalise()
        : (() => {
            const urls = Array.isArray(layerConf.file) ? layerConf.file : [layerConf.file];
            return Promise.all(urls.map(url => fetch(url).then(r => {
                if (!r.ok) throw new Error("Erreur HTTP " + r.status + " sur " + url);
                return r.json();
            }))).then(reponses => urls.length > 1 ? reponses : reponses[0]);
        })();

    recuperer
        .then(data => {
            const geo = layerConf.transform ? layerConf.transform(data) : data;
            donneesBrutes[layerConf.id] = geo.features || [];
            if (layerConf.viewportOnly) {
                /* Rien construit tout de suite : trop de features pour tout
                   garder en objets Leaflet en mémoire (ex : cadastre, des
                   dizaines de milliers de parcelles). Un layerGroup vide en
                   attendant qu'actualiserCoucheViewport le remplisse par le
                   sous-ensemble réellement visible. */
                groupesLeaflet[layerConf.id] = L.layerGroup();
            } else if (layerConf.categoriser) {
                const sousCouches = construireSousCouches(geo, layerConf);
                souscouchesLeaflet[layerConf.id] = sousCouches;
                groupesLeaflet[layerConf.id] = L.layerGroup(Object.values(sousCouches));
            } else {
                groupesLeaflet[layerConf.id] = construireCoucheDonnees(geo, layerConf);
            }
            coucheChargee[layerConf.id] = true;
            if (onReady) onReady();
        })
        .catch(err => {
            console.error("Chargement", layerConf.id, ":", err);
            if (onError) onError(err);
        });
}

/* =========================================================
   INITIALISATION : couches non différées chargées tout de
   suite (pour qu'elles alimentent la recherche dès l'ouverture
   du site) ; les couches lourdes attendent d'être cochées.
   ========================================================= */
function initialiserCouches(map) {
    LAYERS.forEach(conf => {
        if (!conf.lazy) {
            chargerCouche(conf, () => {
                if (document.getElementById("layer-" + conf.id)?.checked) {
                    groupesLeaflet[conf.id].addTo(map);
                }
            });
        }
    });
}

/* Certaines couches volumineuses (ex : cadastre) ne s'affichent qu'à
   partir d'un certain niveau de zoom (layerConf.zoomMin), comme les
   visualisateurs de cadastre habituels : dézoomé sur tout le territoire,
   des dizaines de milliers de parcelles ne seraient ni lisibles, ni
   tenables en performance. */
function coucheDoitEtreVisible(conf, map) {
    return !conf.zoomMin || map.getZoom() >= conf.zoomMin;
}

/* ---------- Rendu limité à l'écran (layerConf.viewportOnly) ---------- */

/* Boîte englobante [minLon, minLat, maxLon, maxLat] d'une feature,
   suffisante pour un test d'intersection avec la vue (pas besoin d'être
   exacte au pixel près). */
function bboxFeature(feature) {
    const geom = feature.geometry;
    let coords;
    if (!geom) return null;
    if (geom.type === "Polygon") coords = geom.coordinates.flat(1);
    else if (geom.type === "MultiPolygon") coords = geom.coordinates.flat(2);
    else if (geom.type === "Point") coords = [geom.coordinates];
    else return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coords.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    return [minX, minY, maxX, maxY];
}

function bboxIntersecteVue(bbox, bounds) {
    if (!bbox) return false;
    return bbox[0] <= bounds.getEast() && bbox[2] >= bounds.getWest() &&
        bbox[1] <= bounds.getNorth() && bbox[3] >= bounds.getSouth();
}

/* Sous-ensemble des features d'une couche dont la boîte englobante
   touche la vue actuelle de la carte. Utilisé à la fois pour le rendu
   (actualiserCoucheViewport) et par la recherche foncière, pour que les
   deux travaillent sur le même "ce qui est affiché à l'écran". */
function featuresDansVue(layerId, map) {
    const bounds = map.getBounds();
    return (donneesBrutes[layerId] || []).filter(f => bboxIntersecteVue(bboxFeature(f), bounds));
}

/* Reconstruit la couche Leaflet d'une couche "viewportOnly" à partir du
   seul sous-ensemble actuellement visible, et remplace l'ancienne sur la
   carte. Bien plus léger que de garder des dizaines de milliers d'objets
   Leaflet en mémoire pour une couche comme le cadastre. */
function actualiserCoucheViewport(conf, map) {
    if (!coucheDoitEtreVisible(conf, map)) {
        if (groupesLeaflet[conf.id] && map.hasLayer(groupesLeaflet[conf.id])) {
            map.removeLayer(groupesLeaflet[conf.id]);
        }
        return;
    }

    const visibles = featuresDansVue(conf.id, map);
    const nouvelle = construireCoucheDonnees({ type: "FeatureCollection", features: visibles }, conf);

    if (groupesLeaflet[conf.id] && map.hasLayer(groupesLeaflet[conf.id])) {
        map.removeLayer(groupesLeaflet[conf.id]);
    }
    groupesLeaflet[conf.id] = nouvelle;
    nouvelle.addTo(map);
}

/* Surveille zoom ET déplacement (moveend couvre les deux) pour : masquer/
   afficher les couches à seuil de zoom (zoomMin), et reconstruire les
   couches "viewportOnly" sur la zone actuellement visible. Un léger
   anti-rebond évite de reconstruire à chaque pixel pendant un survol
   rapide (zoom + déplacement enchaînés). */
function surveillerAffichageCouches(map) {
    let enAttente = null;

    map.on("moveend", () => {
        clearTimeout(enAttente);
        enAttente = setTimeout(() => {
            LAYERS.forEach(conf => {
                if (!coucheChargee[conf.id]) return;
                const checkbox = document.getElementById("layer-" + conf.id);
                if (!checkbox || !checkbox.checked) return;

                if (conf.viewportOnly) {
                    actualiserCoucheViewport(conf, map);
                    return;
                }
                if (!conf.zoomMin) return;

                const doitEtreVisible = coucheDoitEtreVisible(conf, map);
                const estSurCarte = map.hasLayer(groupesLeaflet[conf.id]);
                if (doitEtreVisible && !estSurCarte) groupesLeaflet[conf.id].addTo(map);
                if (!doitEtreVisible && estSurCarte) map.removeLayer(groupesLeaflet[conf.id]);
            });
        }, 150);
    });
}
