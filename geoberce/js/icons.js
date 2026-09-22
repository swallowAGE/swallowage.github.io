/* =========================================================
   GÉOBERCÉ — ICÔNES DE MARQUEURS
   Icônes Font Awesome (police vectorielle) plutôt que des
   emoji : rendu identique sur tous les systèmes/navigateurs,
   contrairement aux emoji qui dépendent des polices installées.
   ========================================================= */

function creerIcone(faClass, couleur) {
    return L.divIcon({
        className: "geo-marker",
        html: `
            <div class="geo-marker-icon" style="background:${couleur};">
                <i class="${faClass}"></i>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
    });
}

/* Marqueur "camembert" : un disque divisé en parts égales, une couleur
   par élément de `couleurs` (ex : les colonnes de tri présentes à un
   point d'apport volontaire — voir iconeDechet dans config.js). Pas de
   pondération par volume, on n'a pas cette donnée : juste "présent ou
   pas", donc des parts égales. Un conic-gradient CSS suffit, pas besoin
   de canvas/SVG. */
function creerIconeCamembert(faClass, couleurs) {
    const pas = 360 / couleurs.length;
    const stops = couleurs.map((c, i) => `${c} ${i * pas}deg ${(i + 1) * pas}deg`).join(", ");
    return L.divIcon({
        className: "geo-marker",
        html: `
            <div class="geo-marker-icon geo-marker-camembert" style="background: conic-gradient(${stops});">
                <i class="${faClass}"></i>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
    });
}

/* Certaines couches (ex : commerces) veulent une icône/couleur différente
   par entité plutôt qu'une seule pour toute la couche : layerConf.iconePourFeature,
   quand il existe, prend le dessus sur icon/color fixes de la couche.
   Peut aussi renvoyer `segments` (plusieurs couleurs) pour un marqueur
   "camembert" plutôt qu'un disque uni — `color` reste renseigné dans ce
   cas comme couleur représentative (utilisée par l'index de recherche,
   qui n'affiche qu'un petit rond uni). */
function resoudreIconeCouleur(feature, layerConf) {
    if (layerConf.iconePourFeature) {
        const r = layerConf.iconePourFeature(feature);
        if (r) return r;
    }
    return { icon: layerConf.icon, color: layerConf.color };
}

/* Cache pour ne pas reconstruire la même icône plusieurs fois */
const iconeCache = {};

function iconePourCouche(feature, layerConf) {
    const r = resoudreIconeCouleur(feature, layerConf);
    if (r.segments && r.segments.length) {
        const cle = layerConf.id + "|camembert|" + r.icon + "|" + r.segments.join(",");
        if (!iconeCache[cle]) {
            iconeCache[cle] = creerIconeCamembert(r.icon, r.segments);
        }
        return iconeCache[cle];
    }
    const cle = layerConf.id + "|" + r.icon + "|" + r.color;
    if (!iconeCache[cle]) {
        iconeCache[cle] = creerIcone(r.icon, r.color);
    }
    return iconeCache[cle];
}
