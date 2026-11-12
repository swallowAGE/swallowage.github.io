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
const OMBRES_PIXELS_MAX = 900;         // côté maximal de la grille de hauteurs
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

/* h : hauteurs (m) en grille L x H (ligne 0 = nord, valeurs non numériques = pas de donnée).
   pixM : taille d'un pixel au sol (m). Renvoie un masque : 1 = à l'ombre, 0 = au soleil. */
function calculerOmbres(h, L, H, pixM, azimut, hauteurSoleil) {
    const masque = new Uint8Array(L * H);
    if (hauteurSoleil <= 0.0087) { masque.fill(1); return masque; } // soleil sous l'horizon (ou à moins d'un demi-degré)
    const pente = Math.tan(hauteurSoleil);
    const ux = Math.sin(azimut), uy = -Math.cos(azimut);   // direction du soleil dans l'image (y vers le bas)
    const HAUT = -1e4;
    const M = new Float32Array(L * H);                     // max(hauteur du sol, hauteur de la droite de visée)
    const sol = new Float32Array(L * H);
    for (let i = 0; i < sol.length; i++) { const v = h[i]; sol[i] = (v > -500 && v < 3000) ? v : HAUT; }
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
                if (s > HAUT && ombre > s + 0.05) masque[i] = 1;
            }
        }
    }
    return masque;
}

/* ---------- Données, affichage et commandes ---------- */

const ombres = { grille: null, requete: 0, recouvrement: null, controle: null, date: null, heure: 12, enAttente: null };

function ombresFormaterDate(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function ombresChargerGrille(map) {
    const b = map.getBounds().pad(0.25);
    const proj = L.CRS.EPSG3857;
    const sw = proj.project(b.getSouthWest()), ne = proj.project(b.getNorthEast());
    const latCentre = b.getCenter().lat, cosLat = Math.cos(latCentre * Math.PI / 180);
    const largeurSol = (ne.x - sw.x) * cosLat, hauteurSol = (ne.y - sw.y) * cosLat;
    const pixM = Math.max(0.5, Math.max(largeurSol, hauteurSol) / OMBRES_PIXELS_MAX);
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
    const masque = calculerOmbres(g.h, g.L, g.H, g.pixM, s.azimut, s.hauteur);
    const canvas = document.createElement("canvas");
    canvas.width = g.L; canvas.height = g.H;
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(g.L, g.H);
    const nuit = s.hauteur <= 0.0087;
    for (let i = 0; i < masque.length; i++) {
        if (masque[i]) {
            const o = i * 4;
            img.data[o] = OMBRES_COULEUR[0]; img.data[o + 1] = OMBRES_COULEUR[1]; img.data[o + 2] = OMBRES_COULEUR[2];
            img.data[o + 3] = nuit ? 150 : OMBRES_OPACITE;
        }
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
    ombres.controle = el;
    return el;
}

function ombresEtat(texte) {
    const el = document.getElementById("ombres-etat");
    if (el) el.textContent = texte || "";
}

/* Appelée par layers.js à l'activation de la couche puis à chaque déplacement de la carte. */
function dessinerOmbres(map, groupe, onEtat) {
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
}
