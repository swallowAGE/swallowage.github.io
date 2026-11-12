/* =========================================================
   OMBRES PORTÉES (couche « Ensoleillement »)
   Simulation de l'ombre des bâtiments, des arbres et du relief sur la zone affichée, à la date et à l'heure
   choisies. Les hauteurs viennent du modèle numérique de surface du LiDAR HD de l'IGN (sol + bâti + végétation),
   servi par la Géoplateforme (data.geopf.fr) en grille de nombres : aucun serveur à nous, tout est calculé
   dans la page.

   Principe : pour un soleil de hauteur h et d'azimut a, un point est à l'ombre si, en partant de lui vers le
   soleil, un obstacle dépasse la droite qui monte de tan(h) par mètre. On balaie la grille dans le sens du
   soleil en gardant, pour chaque point, la hauteur de cette droite (un seul passage, coût proportionnel au
   nombre de points).

   Limites : un arbre est traité comme un obstacle plein (même sans feuilles), les obstacles hors de la zone
   chargée ne comptent pas, et le relevé a une date de passage (constructions ou coupes récentes absentes).
   ========================================================= */

const OMBRES_ZOOM_MIN = 17;
const OMBRES_COULEUR = [28, 34, 78];   // bleu nuit
const OMBRES_OPACITE = 120;            // 0-255, ombre d'une journée claire
const OMBRES_PIXELS_MAX = 1000;        // côté maximal de la grille de hauteurs
const OMBRES_PIXEL_MIN_M = 0.35;       // taille minimale d'un pixel au sol (le relevé est à 0,5 m)
const OMBRES_URL = "https://data.geopf.fr/wms-r/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&STYLES=&LAYERS=" +
    "IGNF_LIDAR-HD_MNS_ELEVATION.ELEVATIONGRIDCOVERAGE.LAMB93&CRS=EPSG:3857&FORMAT=" + encodeURIComponent("image/x-bil;bits=32");

/* ---------- Soleil (formules de SunCalc, domaine public) ---------- */

function positionSoleil(dateUtc, latDeg, lonDeg) {
    const rad = Math.PI / 180, e = rad * 23.4397;
    const d = dateUtc.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(L) * Math.sin(e));
    const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
    const phi = rad * latDeg;
    const H = rad * (280.16 + 360.9856235 * d) - rad * -lonDeg - ra;
    const hauteur = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    // azimut mesuré depuis le sud vers l'ouest par SunCalc -> depuis le nord, dans le sens des aiguilles d'une montre
    const azimut = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI;
    return { hauteur, azimut: (azimut + 2 * Math.PI) % (2 * Math.PI) };
}

/* Décalage de Paris par rapport à UTC (en minutes) à un instant donné, heure d'été comprise. */
function decalageParisMinutes(utcMs) {
    const p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "numeric",
        day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(new Date(utcMs))
        .forEach(x => { if (x.type !== "literal") p[x.type] = Number(x.value); });
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(utcMs / 60000) * 60000) / 60000;
}

/* Heure de Paris (date « AAAA-MM-JJ » + heures décimales) -> instant UTC. */
function parisVersUtc(dateTexte, heures) {
    const [a, m, j] = dateTexte.split("-").map(Number);
    const h = Math.floor(heures), mn = Math.round((heures - h) * 60);
    const local = Date.UTC(a, m - 1, j, h, mn);
    let utc = local - decalageParisMinutes(local) * 60000;
    utc = local - decalageParisMinutes(utc) * 60000;
    return new Date(utc);
}

/* ---------- Calcul des ombres ---------- */

const ombresSol = new WeakMap();
let ombresTampon = null;

/* h : hauteurs (m) en grille L x H (ligne 0 = nord, valeurs non numériques = pas de donnée).
   pixM : taille d'un pixel au sol (m). Renvoie un masque : 1 = à l'ombre, 0 = au soleil.
   profondeur (facultatif) : tableau rempli avec « hauteur de la droite de visée - hauteur du sol » en mètres, qui permet
   d'adoucir les bords de l'ombre au dessin (valeur positive = à l'ombre). */
function calculerOmbres(h, L, H, pixM, azimut, hauteurSoleil, profondeur) {
    const masque = new Uint8Array(L * H);
    if (hauteurSoleil <= 0.0087) { masque.fill(1); return masque; } // soleil sous l'horizon (ou à moins d'un demi-degré)
    const pente = Math.tan(hauteurSoleil);
    const ux = Math.sin(azimut), uy = -Math.cos(azimut);   // direction du soleil dans l'image (y vers le bas)
    const HAUT = -1e4;
    /* Hauteurs nettoyées calculées une seule fois par grille (le calcul est répété pour chaque heure de la
       journée), tampon de travail réutilisé d'un appel à l'autre. */
    let sol = ombresSol.get(h);
    if (!sol) {
        sol = new Float32Array(L * H);
        for (let i = 0; i < sol.length; i++) { const v = h[i]; sol[i] = (v > -500 && v < 3000) ? v : HAUT; }
        ombresSol.set(h, sol);
    }
    if (!ombresTampon || ombresTampon.length !== L * H) ombresTampon = new Float32Array(L * H);
    const M = ombresTampon;                                // max(hauteur du sol, hauteur de la droite de visée)
    const lisser = (pos, n, depart, pas) => {       // valeur de M interpolée à la position pos le long d'une ligne
        let p = pos; if (p < 0) p = 0; else if (p > n - 1) p = n - 1;
        const i0 = Math.floor(p), t = p - i0, i1 = Math.min(n - 1, i0 + 1);
        const a = M[depart + i0 * pas], b = M[depart + i1 * pas];
        return a * (1 - t) + b * t;
    };
    if (Math.abs(uy) >= Math.abs(ux)) {
        const sy = uy > 0 ? 1 : -1, fx = ux / Math.abs(uy), chute = Math.hypot(fx, 1) * pixM * pente;
        for (let k = 0; k < H; k++) {
            const y = sy < 0 ? k : H - 1 - k, ny = y + sy;
            for (let x = 0; x < L; x++) {
                const i = y * L + x;
                let ombre = HAUT;
                if (ny >= 0 && ny < H) ombre = lisser(x + fx, L, ny * L, 1) - chute;
                const s = sol[i];
                M[i] = s > ombre ? s : ombre;
                if (profondeur) profondeur[i] = s > HAUT ? ombre - s : -9;
                if (s > HAUT && ombre > s + 0.05) masque[i] = 1;
            }
        }
    } else {
        const sx = ux > 0 ? 1 : -1, fy = uy / Math.abs(ux), chute = Math.hypot(fy, 1) * pixM * pente;
        for (let k = 0; k < L; k++) {
            const x = sx < 0 ? k : L - 1 - k, nx = x + sx;
            for (let y = 0; y < H; y++) {
                const i = y * L + x;
                let ombre = HAUT;
                if (nx >= 0 && nx < L) ombre = lisser(y + fy, H, nx, L) - chute;
                const s = sol[i];
                M[i] = s > ombre ? s : ombre;
                if (profondeur) profondeur[i] = s > HAUT ? ombre - s : -9;
                if (s > HAUT && ombre > s + 0.05) masque[i] = 1;
            }
        }
    }
    return masque;
}

/* ---------- Données, affichage et commandes ---------- */

const ombres = { carte: null, groupe: null, modeParcelle: false, surligne: null, grille: null, requete: 0, recouvrement: null, controle: null, date: null, heure: 12, enAttente: null };

function ombresFormaterDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function ombresChargerGrille(map) {
    const b = map.getBounds().pad(0.15);
    const proj = L.CRS.EPSG3857;
    const sw = proj.project(b.getSouthWest()), ne = proj.project(b.getNorthEast());
    const latCentre = b.getCenter().lat, cosLat = Math.cos(latCentre * Math.PI / 180);
    const largeurSol = (ne.x - sw.x) * cosLat, hauteurSol = (ne.y - sw.y) * cosLat;
    const pixM = Math.max(OMBRES_PIXEL_MIN_M, Math.max(largeurSol, hauteurSol) / OMBRES_PIXELS_MAX);
    const L_ = Math.max(8, Math.round(largeurSol / pixM)), H_ = Math.max(8, Math.round(hauteurSol / pixM));
    const url = `${OMBRES_URL}&BBOX=${sw.x},${sw.y},${ne.x},${ne.y}&WIDTH=${L_}&HEIGHT=${H_}`;
    return fetch(url).then(r => { if (!r.ok) throw new Error("IGN " + r.status); return r.arrayBuffer(); }).then(buf => {
        if (buf.byteLength !== L_ * H_ * 4) throw new Error("Réponse inattendue de l'IGN");
        const h = new Float32Array(buf);
        let valides = 0;
        for (let i = 0; i < h.length; i += 7) if (h[i] > -500 && h[i] < 3000) valides++;
        if (valides < h.length / 7 * 0.2) throw new Error("pas de relevé LiDAR ici");
        return { h, L: L_, H: H_, pixM, bounds: b, zoom: map.getZoom(), centre: b.getCenter(),
            limites: L.latLngBounds(proj.unproject(sw), proj.unproject(ne)) };
    });
}

function ombresInstant() {
    return parisVersUtc(ombres.date, ombres.heure);
}

function ombresDessiner(groupe) {
    const g = ombres.grille;
    if (!g) return;
    const instant = ombresInstant();
    const s = positionSoleil(instant, g.centre.lat, g.centre.lng);
    if (!g.profondeur) g.profondeur = new Float32Array(g.L * g.H);
    calculerOmbres(g.h, g.L, g.H, g.pixM, s.azimut, s.hauteur, g.profondeur);
    const canvas = document.createElement("canvas");
    canvas.width = g.L; canvas.height = g.H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(g.L, g.H);
    const nuit = s.hauteur <= 0.0087;
    const opacite = nuit ? 150 : OMBRES_OPACITE;
    const n = g.L * g.H;
    if (!g.alpha) { g.alpha = new Float32Array(n); g.alpha2 = new Float32Array(n); }
    for (let i = 0; i < n; i++) {
        /* Bords adoucis : l'opacité monte progressivement quand l'obstacle dépasse la droite de visée de 0 à 0,5 m,
           ce qui évite l'effet « escalier » d'un masque tout ou rien. */
        const a = nuit ? 1 : (g.profondeur[i] + 0.2) / 0.5;
        g.alpha[i] = a <= 0 ? 0 : (a > 1 ? 1 : a);
    }
    if (!nuit) ombresFlouter(g.alpha, g.alpha2, g.L, g.H);
    for (let i = 0; i < n; i++) {
        const a = g.alpha[i];
        if (a <= 0.004) continue;
        const o = i * 4;
        img.data[o] = OMBRES_COULEUR[0]; img.data[o + 1] = OMBRES_COULEUR[1]; img.data[o + 2] = OMBRES_COULEUR[2];
        img.data[o + 3] = Math.round(opacite * a);
    }
    ctx.putImageData(img, 0, 0);
    const url = canvas.toDataURL("image/png");
    if (ombres.recouvrement) {
        ombres.recouvrement.setUrl(url);
        ombres.recouvrement.setBounds(g.limites);
    } else {
        ombres.recouvrement = L.imageOverlay(url, g.limites, { interactive: false, zIndex: 450, opacity: 1 });
    }
    if (!groupe.hasLayer(ombres.recouvrement)) groupe.addLayer(ombres.recouvrement);
    ombresMajTexte(s, nuit);
}

const OMBRES_POINTS = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"];

function ombresMajTexte(s, nuit) {
    const el = document.getElementById("ombres-soleil");
    if (!el) return;
    const deg = Math.round(s.hauteur * 180 / Math.PI), az = Math.round(s.azimut * 180 / Math.PI);
    el.textContent = nuit ? "Le soleil est couché à cette heure." :
        `Soleil à ${deg}° de hauteur, direction ${OMBRES_POINTS[Math.round(az / 45) % 8]}.`;
    const h = document.getElementById("ombres-heure-texte");
    if (h) {
        const hh = Math.floor(ombres.heure), mm = Math.round((ombres.heure - hh) * 60);
        h.textContent = String(hh).padStart(2, "0") + " h " + String(mm).padStart(2, "0");
    }
}

function ombresConstruireControle(map, groupe) {
    if (ombres.controle) return ombres.controle;
    const maintenant = new Date();
    ombres.date = ombresFormaterDate(maintenant);
    ombres.heure = Math.min(18, Math.max(8, maintenant.getHours() + Math.round(maintenant.getMinutes() / 15) / 4));
    const el = document.createElement("div");
    el.id = "ombres-controle";
    el.innerHTML = `
        <div class="ombres-titre"><i class="fa-solid fa-sun"></i> Ombres portées</div>
        <div class="ombres-ligne">
            <input type="date" id="ombres-date" value="${ombres.date}" aria-label="Date">
            <span id="ombres-heure-texte" class="ombres-heure"></span>
        </div>
        <input type="range" id="ombres-heure" min="0" max="24" step="0.25" value="${ombres.heure}" aria-label="Heure (heure de Paris)">
        <div class="ombres-raccourcis">
            <button type="button" data-jour="auj">Aujourd'hui</button>
            <button type="button" data-jour="12-21">Hiver</button>
            <button type="button" data-jour="03-20">Équinoxe</button>
            <button type="button" data-jour="06-21">Été</button>
        </div>
        <button type="button" id="ombres-parcelle-bouton" class="ombres-bouton"><i class="fa-solid fa-hand-pointer"></i> Heures de soleil d'une parcelle</button>
        <div id="ombres-parcelle" class="ombres-parcelle" hidden></div>
        <div id="ombres-soleil" class="ombres-note"></div>
        <div id="ombres-etat" class="ombres-note"></div>
        <div class="ombres-note">Bâtiments, arbres et relief d'après le relevé LiDAR HD de l'IGN. Les arbres sont comptés avec ou sans feuilles.</div>`;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    map.getContainer().appendChild(el);
    let rafId = null;
    const replanifier = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => { rafId = null; ombresDessiner(groupe); });
    };
    el.querySelector("#ombres-date").addEventListener("change", e => { if (e.target.value) { ombres.date = e.target.value; replanifier(); } });
    el.querySelector("#ombres-heure").addEventListener("input", e => { ombres.heure = Number(e.target.value); replanifier(); });
    el.querySelectorAll("button[data-jour]").forEach(b => b.addEventListener("click", () => {
        const annee = new Date().getFullYear();
        ombres.date = b.dataset.jour === "auj" ? ombresFormaterDate(new Date()) : `${annee}-${b.dataset.jour}`;
        if (b.dataset.jour !== "auj") ombres.heure = 12.5;
        el.querySelector("#ombres-date").value = ombres.date;
        el.querySelector("#ombres-heure").value = ombres.heure;
        replanifier();
    }));
    el.querySelector("#ombres-parcelle-bouton").addEventListener("click", () => ombresBasculerModeParcelle(map));
    ombres.controle = el;
    return el;
}

function ombresEtat(texte) {
    const el = document.getElementById("ombres-etat");
    if (el) el.textContent = texte || "";
}

/* Appelée par layers.js à l'activation de la couche puis à chaque déplacement de la carte. */
function dessinerOmbres(map, groupe, onEtat) {
    ombres.carte = map; ombres.groupe = groupe;
    if (!map.hasLayer(groupe)) groupe.addTo(map);
    const controle = ombresConstruireControle(map, groupe);
    controle.hidden = false;
    if (map.getZoom() < OMBRES_ZOOM_MIN) {
        if (ombres.recouvrement) groupe.removeLayer(ombres.recouvrement);
        ombresEtat(`Zoomez (niveau ${OMBRES_ZOOM_MIN} ou plus) pour calculer les ombres.`);
        ombresMajTexte(positionSoleil(ombresInstant(), map.getCenter().lat, map.getCenter().lng), false);
        if (onEtat) onEtat("zoom");
        return;
    }
    const g = ombres.grille;
    const couvre = g && g.zoom === map.getZoom() && g.limites.contains(map.getBounds());
    if (couvre) { ombresDessiner(groupe); ombresEtat(""); if (onEtat) onEtat("ok"); return; }
    const numero = ++ombres.requete;
    ombresEtat("Chargement du relevé de hauteurs...");
    if (onEtat) onEtat("chargement");
    ombresChargerGrille(map).then(grille => {
        if (numero !== ombres.requete) return;
        ombres.grille = grille;
        ombresDessiner(groupe);
        ombresEtat("");
        if (onEtat) onEtat("ok");
    }).catch(err => {
        if (numero !== ombres.requete) return;
        console.error("Ombres :", err);
        ombresEtat(String(err.message || err).includes("LiDAR") ? "Pas de relevé de hauteurs sur cette zone." : "Le service de l'IGN ne répond pas, déplacez la carte pour réessayer.");
        if (onEtat) onEtat("erreur");
    });
}

function masquerOmbres() {
    if (ombres.controle) ombres.controle.hidden = true;
    ombresQuitterModeParcelle();
    ombresEffacerParcelle();
}


/* ---------- Heures de soleil d'une parcelle ---------- */

/* Flou de 3 x 3 pixels (deux passes de 3 points) : atténue le bruit de la grille de hauteurs, surtout quand le soleil
   est bas et que l'ombre traverse de nombreux arbres. Le résultat revient dans a. */
function ombresFlouter(a, tmp, L, H) {
    for (let y = 0; y < H; y++) {
        const o = y * L;
        for (let x = 0; x < L; x++) {
            const g = x > 0 ? a[o + x - 1] : a[o + x], d = x < L - 1 ? a[o + x + 1] : a[o + x];
            tmp[o + x] = (g + a[o + x] + d) / 3;
        }
    }
    for (let y = 0; y < H; y++) {
        const o = y * L, h = y > 0 ? o - L : o, b = y < H - 1 ? o + L : o;
        for (let x = 0; x < L; x++) a[o + x] = (tmp[h + x] + tmp[o + x] + tmp[b + x]) / 3;
    }
}

const OMBRES_JOURS = [
    { label: "21 décembre", mois: "12-21", court: "hiver" },
    { label: "20 mars", mois: "03-20", court: "équinoxe" },
    { label: "21 juin", mois: "06-21", court: "été" }
];
const OMBRES_PAS_HEURES = 0.5;       // pas de calcul : une demi-heure
const OMBRES_MARGE_M = 150;          // obstacles pris en compte autour de la parcelle

function ombresQuitterModeParcelle() {
    if (!ombres.modeParcelle) return;
    ombres.modeParcelle = false;
    if (ombres.carte) {
        ombres.carte.off("click", ombresClicParcelle);
        ombres.carte.getContainer().style.cursor = "";
    }
    const b = document.getElementById("ombres-parcelle-bouton");
    if (b) b.classList.remove("actif");
}

function ombresEffacerParcelle() {
    if (ombres.surligne && ombres.groupe) ombres.groupe.removeLayer(ombres.surligne);
    ombres.surligne = null;
    const z = document.getElementById("ombres-parcelle");
    if (z) { z.hidden = true; z.innerHTML = ""; }
}

function ombresBasculerModeParcelle(map) {
    if (ombres.modeParcelle) { ombresQuitterModeParcelle(); ombresEtat(""); return; }
    if (map.getZoom() < OMBRES_ZOOM_MIN || !ombres.grille) { ombresEtat(`Zoomez (niveau ${OMBRES_ZOOM_MIN} ou plus) sur la parcelle d'abord.`); return; }
    ombres.modeParcelle = true;
    map.on("click", ombresClicParcelle);
    map.getContainer().style.cursor = "crosshair";
    document.getElementById("ombres-parcelle-bouton").classList.add("actif");
    ombresEtat("Cliquez sur la parcelle à étudier.");
}

/* Parcelle contenant le point cliqué (couche cadastre chargée à la demande), ou null. */
function ombresTrouverParcelle(latlng) {
    const conf = LAYERS.find(l => l.id === "cadastre");
    if (!conf) return Promise.resolve(null);
    const chercher = () => (donneesBrutes.cadastre || []).find(f => {
        const g = f.geometry; if (!g) return false;
        const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
        return polys.some(rings => {
            let dedans = false;
            rings.forEach((anneau, k) => {
                let ici = false;
                for (let i = 0, j = anneau.length - 1; i < anneau.length; j = i++) {
                    const [xi, yi] = anneau[i], [xj, yj] = anneau[j];
                    if ((yi > latlng.lat) !== (yj > latlng.lat) && latlng.lng < (xj - xi) * (latlng.lat - yi) / (yj - yi) + xi) ici = !ici;
                }
                if (ici) dedans = k === 0 ? true : false;   // premier anneau = contour, les suivants = trous
            });
            return dedans;
        });
    }) || null;
    if (coucheChargee.cadastre) return Promise.resolve(chercher());
    return new Promise(resolve => chargerCouche(conf, () => resolve(chercher()), () => resolve(null)));
}

function ombresClicParcelle(e) {
    ombresQuitterModeParcelle();
    ombresEtat("Recherche de la parcelle...");
    ombresTrouverParcelle(e.latlng).then(parcelle => ombresCalculerParcelle(e.latlng, parcelle));
}

function ombresCalculerParcelle(clic, parcelle) {
    const g = ombres.grille;
    if (!g) return;
    const proj = L.CRS.EPSG3857;
    const sw = proj.project(g.limites.getSouthWest()), ne = proj.project(g.limites.getNorthEast());
    const versPixel = ll => { const m = proj.project(L.latLng(ll[1], ll[0])); return [(m.x - sw.x) / (ne.x - sw.x) * g.L, (ne.y - m.y) / (ne.y - sw.y) * g.H]; };
    // Contours de la parcelle en pixels de la grille (ou disque de 6 m autour du point si pas de parcelle)
    let anneaux = [];
    let latlngs = null;
    if (parcelle) {
        const polys = parcelle.geometry.type === "Polygon" ? [parcelle.geometry.coordinates] : parcelle.geometry.coordinates;
        anneaux = polys.map(rings => rings.map(r => r.map(versPixel)));
        latlngs = polys.map(rings => rings.map(r => r.map(c => [c[1], c[0]])));
    } else {
        const c = versPixel([clic.lng, clic.lat]), r = 6 / g.pixM, pts = [];
        for (let k = 0; k < 24; k++) pts.push([c[0] + r * Math.cos(k * Math.PI / 12), c[1] + r * Math.sin(k * Math.PI / 12)]);
        anneaux = [[pts]];
    }
    const tousPts = anneaux.flat(2);
    let x0 = Math.min(...tousPts.map(p => p[0])), x1 = Math.max(...tousPts.map(p => p[0]));
    let y0 = Math.min(...tousPts.map(p => p[1])), y1 = Math.max(...tousPts.map(p => p[1]));
    const partielle = x0 < 0 || y0 < 0 || x1 > g.L || y1 > g.H;   // parcelle plus grande que la zone calculée : on étudie sa partie visible
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(g.L, x1); y1 = Math.min(g.H, y1);
    if (x1 - x0 < 2 || y1 - y0 < 2) { ombresEtat("Parcelle hors de la zone calculée : recentrez la carte dessus."); return; }
    // Zone de calcul réduite : parcelle + marge (les obstacles plus loin sont ignorés)
    const marge = Math.ceil(OMBRES_MARGE_M / g.pixM);
    const cx0 = Math.max(0, Math.floor(x0) - marge), cy0 = Math.max(0, Math.floor(y0) - marge);
    const cx1 = Math.min(g.L, Math.ceil(x1) + marge), cy1 = Math.min(g.H, Math.ceil(y1) + marge);
    const w = cx1 - cx0, h = cy1 - cy0;
    const sousH = new Float32Array(w * h);
    for (let y = 0; y < h; y++) sousH.set(g.h.subarray((cy0 + y) * g.L + cx0, (cy0 + y) * g.L + cx0 + w), y * w);
    // Masque de la parcelle (rasterisation par un canvas)
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cc = cv.getContext("2d"); cc.fillStyle = "#000";
    anneaux.forEach(rings => {
        cc.beginPath();
        rings.forEach(r => r.forEach((p, i) => i ? cc.lineTo(p[0] - cx0, p[1] - cy0) : cc.moveTo(p[0] - cx0, p[1] - cy0)));
        cc.fill("evenodd");
    });
    const alpha = cc.getImageData(0, 0, w, h).data;
    const dansParcelle = [];
    for (let i = 0; i < w * h; i++) if (alpha[i * 4 + 3] > 127 && sousH[i] > -500 && sousH[i] < 3000) dansParcelle.push(i);
    if (dansParcelle.length < 3) { ombresEtat("Parcelle trop petite ou sans relevé pour ce calcul."); return; }
    // Surbrillance de la parcelle
    ombresEffacerParcelle();
    if (latlngs) {
        ombres.surligne = L.polygon(latlngs, { color: "#8A6D2B", weight: 3, fill: false, interactive: false });
        ombres.groupe.addLayer(ombres.surligne);
    }
    const zone = document.getElementById("ombres-parcelle");
    const surface = Math.round(dansParcelle.length * g.pixM * g.pixM);
    const partielleTexte = partielle ? " (partie visible seulement)" : "";
    const titre = parcelle ? `Parcelle ${echapperHtml((parcelle.properties || {}).reference || "")}` : "Autour du point cliqué (6 m)";
    zone.hidden = false;
    zone.innerHTML = `<div class="ombres-parcelle-titre">${titre}</div><div class="ombres-note" id="ombres-parcelle-progres">Calcul en cours...</div>`;
    ombresEtat("");
    // Calcul jour par jour, par tranches pour garder la page réactive
    const annee = new Date().getFullYear();
    const resultats = [];
    let iJour = 0, t = 0;
    const centre = g.centre;
    const tranche = () => {
        const debut = performance.now();
        while (iJour < OMBRES_JOURS.length && performance.now() - debut < 40) {
            const jour = OMBRES_JOURS[iJour];
            if (!resultats[iJour]) resultats[iJour] = { jour, parts: [], heuresJour: 0, heuresSoleil: 0 };
            const r = resultats[iJour];
            if (t > 24) { iJour++; t = 0; continue; }
            const sol = positionSoleil(parisVersUtc(`${annee}-${jour.mois}`, t), centre.lat, centre.lng);
            if (sol.hauteur > 0.0087) {
                const masque = calculerOmbres(sousH, w, h, g.pixM, sol.azimut, sol.hauteur);
                let ensoleille = 0;
                for (const i of dansParcelle) if (!masque[i]) ensoleille++;
                const f = ensoleille / dansParcelle.length;
                r.parts.push({ t, f });
                r.heuresJour += OMBRES_PAS_HEURES; r.heuresSoleil += f * OMBRES_PAS_HEURES;
            }
            t += OMBRES_PAS_HEURES;
        }
        if (iJour < OMBRES_JOURS.length) {
            const pct = Math.round(((iJour + t / 24) / OMBRES_JOURS.length) * 100);
            const prog = document.getElementById("ombres-parcelle-progres"); if (prog) prog.textContent = `Calcul en cours... ${pct} %`;
            setTimeout(tranche, 0);
        } else {
            ombresAfficherResultats(zone, titre + partielleTexte, surface, resultats);
        }
    };
    setTimeout(tranche, 0);
}

function ombresDureeTexte(heures) {
    const mn = Math.round(heures * 60 / 5) * 5;
    return `${Math.floor(mn / 60)} h ${String(mn % 60).padStart(2, "0")}`;
}

function ombresAfficherResultats(zone, titre, surface, resultats) {
    const ligne = r => {
        // frise : une case par demi-heure de jour, jaune = soleil direct, bleu nuit = ombre (dégradé selon la part ensoleillée)
        const cases = r.parts.map(p => {
            const a = Math.round(p.f * 100) / 100;
            return `<i style="background:rgba(213,163,93,${(0.15 + 0.85 * a).toFixed(2)})" title="${Math.floor(p.t)} h ${String(Math.round((p.t % 1) * 60)).padStart(2, "0")} : ${Math.round(p.f * 100)} % de la parcelle au soleil"></i>`;
        }).join("");
        const debut = r.parts.length ? r.parts[0].t : 0, fin = r.parts.length ? r.parts[r.parts.length - 1].t + OMBRES_PAS_HEURES : 0;
        return `<div class="ombres-jour">
            <div class="ombres-jour-ligne"><span>${r.jour.label} <em>(${r.jour.court})</em></span><strong>${ombresDureeTexte(r.heuresSoleil)}</strong></div>
            <div class="ombres-frise">${cases}</div>
            <div class="ombres-frise-axe"><span>${Math.floor(debut)} h</span><span>${ombresDureeTexte(r.heuresJour)} de jour</span><span>${Math.ceil(fin)} h</span></div>
        </div>`;
    };
    zone.innerHTML = `<div class="ombres-parcelle-titre">${titre} <span class="ombres-note">· ${surface.toLocaleString("fr-FR")} m²</span></div>
        <div class="ombres-note">Soleil direct reçu en moyenne sur la parcelle :</div>
        ${resultats.map(ligne).join("")}
        <div class="ombres-note">Estimation d'après le relevé LiDAR de l'IGN (arbres comptés avec feuilles), obstacles jusqu'à ${OMBRES_MARGE_M} m, pas d'une demi-heure. Ciel supposé dégagé : les nuages ne sont pas pris en compte.</div>`;
}
