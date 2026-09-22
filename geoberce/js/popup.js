/* =========================================================
   GÉOBERCÉ — POPUPS
   Popup générique + fiche détaillée pour les stations carburant.
   ========================================================= */

const CHAMPS_MASQUES = new Set([
    "osm_id", "osm_type", "full_id", "gid", "id", "wikidata",
    "marker-color", "X", "Y", "Xlong", "Ylat", "gpu_doc_id",
    "gpu_status", "gpu_timestamp", "partition", "idurba", "idzone",
    "c_gid", "c_etat_valid", "c_x_coor2", "c_y_coor2",
    "c_lat_coor1", "c_long_coor1", "c_xy_precis", "c_id_adr",
    "commune", "prefixe", "section", "numero", "contenance",
    "arpente", "created", "updated"
]);

function humaniser(cle) { return cle.replace(/_/g, " ").replace(/^c /, "").replace(/\b\w/g, l => l.toUpperCase()); }
function premierChampValide(props, champs) {
    for (const c of champs) if (props[c] !== undefined && props[c] !== null && props[c] !== "" && props[c] !== "NULL") return props[c];
    return null;
}
function echapperHtml(valeur) {
    return String(valeur ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function parserValeur(valeur) {
    if (valeur === undefined || valeur === null || valeur === "") return null;
    if (typeof valeur !== "string") return valeur;
    try { return JSON.parse(valeur); } catch (_) { return valeur; }
}
function listeValeurs(valeur) {
    if (Array.isArray(valeur)) return valeur.map(String).filter(Boolean);
    if (valeur === null || valeur === undefined || valeur === "") return [];
    return String(valeur).split(/\s*;\s*|\s*\/\/\s*/).map(v => v.trim()).filter(Boolean);
}
function nomCarburant(nom) { return { "Gazole": "Gazole", "SP95": "SP95", "SP98": "SP98", "E10": "SP95-E10", "E85": "E85", "GPLc": "GPL" }[nom] || nom; }

/* Liste des carburants suivis par le flux data.economie.gouv.fr, réutilisée
   telle quelle par construirePrixCarburants ci-dessous ET par le filtre
   "type de carburant" des résultats "près de chez moi" (proximite.js) -
   un seul endroit à maintenir si le flux ajoute/retire un carburant. */
const LISTE_CARBURANTS = [
    { nom: "Gazole", champ: "gazole_prix", maj: "gazole_maj" },
    { nom: "SP95", champ: "sp95_prix", maj: "sp95_maj" },
    { nom: "SP98", champ: "sp98_prix", maj: "sp98_maj" },
    { nom: "E10", champ: "e10_prix", maj: "e10_maj" },
    { nom: "E85", champ: "e85_prix", maj: "e85_maj" },
    { nom: "GPLc", champ: "gplc_prix", maj: "gplc_maj" }
];

function construirePrixCarburants(props) {
    const disponibles = new Set(listeValeurs(props.carburants_disponibles));
    const indisponibles = new Set(listeValeurs(props.carburants_indisponibles));
    const temporaires = new Set(listeValeurs(props.carburants_rupture_temporaire));
    const definitives = new Set(listeValeurs(props.carburants_rupture_definitive));

    return LISTE_CARBURANTS.filter(c => props[c.champ] !== undefined || disponibles.has(c.nom) || indisponibles.has(c.nom)).map(c => {
        const prix = Number(props[c.champ]);
        let statut = "Disponible", classe = "disponible";
        if (definitives.has(c.nom)) { statut = "Rupture définitive"; classe = "rupture"; }
        else if (temporaires.has(c.nom)) { statut = "Rupture temporaire"; classe = "rupture"; }
        else if (indisponibles.has(c.nom) || !disponibles.has(c.nom) || !Number.isFinite(prix)) { statut = "Indisponible"; classe = "indisponible"; }
        /* `champ` (nom brut du champ, ex. "gplc_prix") gardé en plus de
           `nom` (déjà transformé pour l'affichage, ex. "GPL") : nécessaire
           pour retrouver un carburant précis par son champ depuis
           l'extérieur (filtre "type de carburant" des résultats "près de
           chez moi", proximite.js) sans dépendre du libellé affiché. */
        return { nom: nomCarburant(c.nom), champ: c.champ, prix: Number.isFinite(prix) ? prix : null, maj: props[c.maj], statut, classe };
    });
}
function formaterPrix(prix) { return prix === null ? "—" : `${prix.toFixed(3).replace(".", ",")} €`; }
function formaterMaj(date) {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function construireServices(props) {
    const services = listeValeurs(props.services_service || props.services);
    if (!services.length) return "";
    const icones = {
        "Station de gonflage": "fa-solid fa-wind", "Lavage automatique": "fa-solid fa-spray-can-sparkles", "Lavage manuel": "fa-solid fa-soap",
        "Bornes électriques": "fa-solid fa-charging-station", "DAB (Distributeur automatique de billets)": "fa-solid fa-money-bill-wave",
        "Automate CB 24/24": "fa-solid fa-credit-card", "Piste poids lourds": "fa-solid fa-truck", "Location de véhicule": "fa-solid fa-car",
        "Vente de gaz domestique (Butane, Propane)": "fa-solid fa-fire-flame-simple", "Boutique alimentaire": "fa-solid fa-basket-shopping",
        "Toilettes publiques": "fa-solid fa-restroom", "Wifi": "fa-solid fa-wifi"
    };
    return `<div class="popup-carburant-services">${services.map(service => `<span class="popup-service"><i class="${icones[service] || "fa-solid fa-circle-check"}"></i>${echapperHtml(service)}</span>`).join("")}</div>`;
}

function construirePopupCarburant(props) {
    const nom = premierChampValide(props, ["enseigne", "nom", "brand"]) || "Station-service";
    const adresse = [props.adresse, props.cp, props.ville].filter(Boolean).join(" · ");
    const prix = construirePrixCarburants(props);

    const datesMaj = prix.map(c => c.maj).filter(Boolean).map(d => new Date(d)).filter(d => !Number.isNaN(d.getTime()));
    const derniereMaj = datesMaj.length ? new Date(Math.max(...datesMaj.map(d => d.getTime()))) : null;

    const lignesPrix = prix.map(c => `
        <div class="popup-carburant-prix ${c.classe}">
            <div class="popup-carburant-nom"><span class="popup-carburant-pastille"></span>${echapperHtml(c.nom)}</div>
            <div class="popup-carburant-valeur">${formaterPrix(c.prix)}</div>
            <div class="popup-carburant-statut">${echapperHtml(c.statut)}</div>
        </div>
    `).join("");

    const services = construireServices(props);

    return `<div class="popup-carburant">
        <div class="popup-carburant-entete">
            <div class="popup-carburant-icon"><i class="fa-solid fa-gas-pump"></i></div>
            <div class="popup-carburant-titre-wrap">
                <div class="popup-carburant-tag">Station-service</div>
                <div class="popup-carburant-titre">${echapperHtml(nom)}</div>
                <div class="popup-carburant-adresse">${echapperHtml(adresse)}</div>
            </div>
        </div>

        <div class="popup-carburant-section">
            <div class="popup-carburant-section-titre"><span>Prix des carburants</span><small>€/L</small></div>
            <div class="popup-carburant-prix-liste">${lignesPrix || `<div class="popup-carburant-vide">Aucun prix disponible.</div>`}</div>
            ${derniereMaj ? `<div style="margin-top:8px;text-align:right;font-size:8.5px;color:#8A8882;"><i class="fa-regular fa-clock"></i> Mis à jour le ${echapperHtml(formaterMaj(derniereMaj))}</div>` : ""}
        </div>

        ${services ? `<div class="popup-carburant-section"><div class="popup-carburant-section-titre"><span>Services</span></div>${services}</div>` : ""}
    </div>`;
}

/* =========================================================
   POPUPS "FICHE" — commerces, banques & DAB, mairies, boîtes aux
   lettres. Base commune (horaires, contact, badge ouvert/fermé)
   factorisée ci-dessous ; chaque couche ne fournit que ses propres
   champs et sa couleur/icône (voir construirePopup en bas de fichier).
   ========================================================= */
const JOURS_OSM = { Mo: "Lundi", Tu: "Mardi", We: "Mercredi", Th: "Jeudi", Fr: "Vendredi", Sa: "Samedi", Su: "Dimanche" };
const ORDRE_JOURS_OSM = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const JOUR_FR_VERS_OSM = {
    "lundi": "Mo", "mardi": "Tu", "mercredi": "We", "jeudi": "Th",
    "vendredi": "Fr", "samedi": "Sa", "dimanche": "Su"
};

function jourOsmAujourdhui() {
    return ORDRE_JOURS_OSM[(new Date().getDay() + 6) % 7]; // getDay() : 0 = dimanche
}

/* Horaires saisonniers ("Apr-Sep: Mo-Sa 09:00-19:00; Oct-Mar: Mo-Sa
   09:00-17:00", motif courant pour les déchèteries été/hiver) : à
   vérifier si la date actuelle tombe dans une plage "Mmm[ jj]-Mmm[ jj]:"
   en tête d'un bloc, gère aussi les plages à cheval sur l'année civile
   (Oct-Mar). Le jour du mois est optionnel ("Jun 15-Sep 15:" pour un
   changement en cours de mois, comme "Apr-Sep:" pour un mois entier) -
   représenté en un seul entier "mois*100+jour" pour comparer les deux
   d'un coup (ex. 15 juin = 5*100+15 = 515, mai = mois 4 → 4*100+1 à
   4*100+31 par défaut si aucun jour n'est précisé). */
const ORDRE_MOIS_OSM = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function dateOsmDansPlage(mois1, jour1, mois2, jour2, moisActuel, jourActuel) {
    /* .slice(0,3) : tolère les variantes à 4 lettres et + rencontrées dans
       les données saisies à la main ("Sept" pour septembre) plutôt que
       d'exiger la forme anglaise stricte à 3 lettres de la spec OSM. */
    const i = ORDRE_MOIS_OSM.indexOf(mois1.slice(0, 3).toUpperCase());
    const j = ORDRE_MOIS_OSM.indexOf(mois2.slice(0, 3).toUpperCase());
    if (i === -1 || j === -1) return true; // motif non reconnu : ne filtre pas plutôt que de tout masquer
    const debut = i * 100 + (jour1 ? Number(jour1) : 1);
    const fin = j * 100 + (jour2 ? Number(jour2) : 31);
    const actuel = moisActuel * 100 + jourActuel;
    if (debut <= fin) return actuel >= debut && actuel <= fin;
    return actuel >= debut || actuel <= fin; // plage à cheval sur l'année (ex. Oct-Mar)
}

/* Développe "Mo-Fr" ou "Mo,We,Fr" en liste de jours OSM. Ne couvre pas
   toute la spécification opening_hours (jours fériés "PH", horaires sur
   plusieurs semaines...), seulement les motifs les plus courants dans
   les données OSM locales : c'est suffisant pour rendre les horaires
   lisibles sans essayer de tout couvrir. */
function developperJoursOsm(plage) {
    const resultat = [];
    plage.split(",").forEach(morceau => {
        morceau = morceau.trim();
        if (morceau.includes("-")) {
            const [debut, fin] = morceau.split("-");
            let i = ORDRE_JOURS_OSM.indexOf(debut);
            const j = ORDRE_JOURS_OSM.indexOf(fin);
            if (i === -1 || j === -1) return;
            while (true) {
                resultat.push(ORDRE_JOURS_OSM[i]);
                if (i === j) break;
                i = (i + 1) % 7;
            }
        } else if (ORDRE_JOURS_OSM.includes(morceau)) {
            resultat.push(morceau);
        }
    });
    return resultat;
}

function parserHorairesOsm(valeur) {
    if (!valeur || typeof valeur !== "string") return null;
    if (/^24\/7$/i.test(valeur.trim())) {
        const tous = {};
        ORDRE_JOURS_OSM.forEach(j => { tous[j] = ["00:00-24:00"]; });
        return tous;
    }
    const maintenant = new Date();
    const moisActuel = maintenant.getMonth(); // 0-11, aligné sur l'index de ORDRE_MOIS_OSM
    const jourActuel = maintenant.getDate(); // 1-31
    const horaires = {};
    let auMoinsUn = false;
    valeur.split(";").forEach(bloc => {
        bloc = bloc.trim();
        /* Plage saisonnière optionnelle en tête du bloc ("Apr-Sep: ..."
           ou "Jun 15-Sep 15: ..." pour un changement en cours de mois,
           motif courant déchèteries été/hiver) : un bloc hors saison
           actuelle est simplement ignoré, pas affiché en dehors de sa
           période - le reste du bloc (jours + horaires) est traité
           normalement une fois la plage retirée. */
        const saison = bloc.match(/^([A-Za-z]{3,9})(?:\s+(\d{1,2}))?\s*-\s*([A-Za-z]{3,9})(?:\s+(\d{1,2}))?\s*:\s*(.+)$/);
        if (saison) {
            const [, mois1, jour1, mois2, jour2, reste] = saison;
            if (!dateOsmDansPlage(mois1, jour1, mois2, jour2, moisActuel, jourActuel)) return;
            bloc = reste.trim();
        }
        /* Le séparateur entre la liste des jours et les horaires est
           censé être un espace ("Mo-Sa 09:00-12:00"), mais les données
           saisies à la main utilisent parfois ":" ("Mo,Fr,Sa:9:30-
           12:30") : on capture d'abord la liste de jours par motif plutôt
           que par position, puis on retire l'espace et/ou le ":" qui suit,
           quel que soit celui utilisé. */
        const motifJours = bloc.match(/^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:[-,](?:Mo|Tu|We|Th|Fr|Sa|Su))*)/);
        if (!motifJours) return;
        const jours = developperJoursOsm(motifJours[1]);
        const horaireBrut = bloc.slice(motifJours[0].length).replace(/^[\s:]+/, "").trim();
        if (!jours.length) return;
        const ferme = /^off$|^closed$/i.test(horaireBrut);
        const segments = horaireBrut.split(",").map(s => s.trim());
        /* Un bloc mal formé (ex. deux plages saisonnières collées sans
           point-virgule entre elles) produit un horaireBrut qui ne
           ressemble à rien de connu : on préfère ne rien afficher plutôt
           que du texte corrompu dans la popup. */
        if (!ferme && !segments.every(s => /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(s))) return;
        auMoinsUn = true;
        jours.forEach(j => {
            horaires[j] = ferme ? [] : segments;
        });
    });
    return auMoinsUn ? horaires : null;
}

/* Horaires en texte libre français, tels qu'exportés pour les mairies
   ("Le Mardi : de 09h00 à 12h00\nLe Vendredi : de 14h00 à 18h00"), une
   ligne par jour. On les ramène à la même structure {Mo: [...], ...}
   que parserHorairesOsm pour pouvoir réutiliser estOuvertMaintenant et
   l'affichage jour par jour. Ne couvre que ce motif (jour + une ou
   plusieurs plages "de Xh à Y"), pas de spécification plus large à
   gérer ici : les données sont déjà rédigées à la main par les mairies. */
function parserHorairesMairie(texte) {
    if (!texte || typeof texte !== "string") return null;
    const horaires = {};
    let auMoinsUn = false;
    texte.split("\n").forEach(ligne => {
        const m = ligne.trim().match(/^(?:l['’]|le\s+|la\s+)?\s*(\p{L}+)\s*:?\s*(.*)$/iu);
        if (!m) return;
        const jour = JOUR_FR_VERS_OSM[m[1].toLowerCase()];
        if (!jour) return;
        const plages = [];
        const re = /(\d{1,2})h(\d{2})?\s*(?:à|a)\s*(\d{1,2})h(\d{2})?/gi;
        let plage;
        while ((plage = re.exec(m[2])) !== null) {
            const h1 = plage[1].padStart(2, "0"), m1 = (plage[2] || "00").padStart(2, "0");
            const h2 = plage[3].padStart(2, "0"), m2 = (plage[4] || "00").padStart(2, "0");
            plages.push(`${h1}:${m1}-${h2}:${m2}`);
        }
        if (plages.length) { horaires[jour] = plages; auMoinsUn = true; }
    });
    return auMoinsUn ? horaires : null;
}

function estOuvertMaintenant(horaires) {
    if (!horaires) return null;
    const plages = horaires[jourOsmAujourdhui()];
    if (!plages || !plages.length) return false;
    const maintenant = new Date();
    const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
    return plages.some(p => {
        const m = p.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
        if (!m) return false;
        const debut = Number(m[1]) * 60 + Number(m[2]);
        const fin = (Number(m[3]) * 60 + Number(m[4])) || 24 * 60; // "24:00" -> minuit le lendemain
        return minutes >= debut && minutes < fin;
    });
}

function formaterTelephone(tel) {
    if (!tel) return null;
    const local = tel.replace(/[^\d+]/g, "").replace(/^\+33/, "0");
    if (/^0\d{9}$/.test(local)) return local.match(/.{2}/g).join(" ");
    return tel;
}

function domaineSite(url) {
    try {
        return new URL(/^https?:\/\//i.test(url) ? url : "https://" + url).hostname.replace(/^www\./, "");
    } catch (_) {
        return url;
    }
}

/* Met en majuscule la première lettre de chaque mot, pour les champs
   fournis tout en capitales (adresses des boîtes aux lettres...). */
function capitaliserMots(texte) {
    if (!texte) return "";
    return String(texte).toLowerCase().replace(/(^|[\s'-])\p{L}/gu, l => l.toUpperCase());
}

/* Liens de contact génériques (téléphone/email/site), réutilisés par
   toutes les fiches. `champs` permet d'adapter les noms de propriétés
   d'une couche à l'autre (ex. contact_phone pour les mairies). */
function construireContacts(props, champs = {}) {
    const { tel = "phone", email = "email", site = "website" } = champs;
    const contacts = [];
    if (props[tel]) {
        contacts.push(`<a class="popup-fiche-contact" href="tel:${echapperHtml(String(props[tel]).replace(/\s+/g, ""))}"><i class="fa-solid fa-phone"></i>${echapperHtml(formaterTelephone(props[tel]))}</a>`);
    }
    if (props[email]) {
        contacts.push(`<a class="popup-fiche-contact" href="mailto:${echapperHtml(props[email])}"><i class="fa-solid fa-envelope"></i>${echapperHtml(props[email])}</a>`);
    }
    if (props[site]) {
        contacts.push(`<a class="popup-fiche-contact" href="${echapperHtml(props[site])}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-globe"></i>${echapperHtml(domaineSite(props[site]))}</a>`);
    }
    return contacts;
}

/* Liste jour par jour à partir d'un objet horaires {Mo: [...], ...},
   jour courant mis en évidence. */
function construireLignesHoraires(horaires) {
    if (!horaires) return "";
    const aujourdhui = jourOsmAujourdhui();
    return ORDRE_JOURS_OSM.filter(j => j in horaires).map(j => {
        const plages = horaires[j];
        const texte = plages.length ? plages.join(", ") : "Fermé";
        return `<div class="popup-fiche-jour${j === aujourdhui ? " aujourdhui" : ""}"><span>${JOURS_OSM[j]}</span><strong>${echapperHtml(texte)}</strong></div>`;
    }).join("");
}

function construireBadgeOuvert(horaires) {
    if (!horaires) return "";
    const ouvert = estOuvertMaintenant(horaires);
    return `<span class="popup-fiche-badge ${ouvert ? "ouvert" : "ferme"}"><span></span>${ouvert ? "Ouvert" : "Fermé"}</span>`;
}

/* Élus d'une mairie, format "NOM Prénom (Rôle)\n..." — extraction par
   motif plutôt qu'un split ligne à ligne strict, car certains exports
   comportent des doublons/lignes recollées sans saut de ligne : une
   simple recherche globale de "Nom (Rôle)" ignore proprement ce qui ne
   correspond pas plutôt que de planter ou d'afficher du texte cassé. */
function parserElus(texte) {
    if (!texte || typeof texte !== "string") return [];
    const re = /([A-ZÀ-Ý][\wÀ-ÖØ-öø-ÿ'’-]*(?:\s+[A-ZÀ-Ýa-zà-öø-ÿ][\wÀ-ÖØ-öø-ÿ'’-]*)*)\s*\(([^()]+)\)/g;
    const vus = new Set();
    const elus = [];
    let m;
    while ((m = re.exec(texte)) !== null) {
        const nom = m[1].trim(), role = m[2].trim();
        const cle = nom.toUpperCase();
        if (vus.has(cle)) continue;
        vus.add(cle);
        elus.push({ nom, role });
    }
    return elus;
}

function construireElus(texte) {
    const elus = parserElus(texte);
    if (!elus.length) return "";
    const lignes = elus.map(e => `<div class="popup-fiche-elu"><strong>${echapperHtml(e.nom)}</strong><span>${echapperHtml(e.role)}</span></div>`).join("");
    return `<details class="popup-fiche-repliable">
        <summary><span>Conseil municipal (${elus.length})</span><i class="fa-solid fa-chevron-right"></i></summary>
        <div class="popup-fiche-repliable-liste">${lignes}</div>
    </details>`;
}

function construirePopupCommerce(props) {
    const cat = categorieCommerce(props.type);
    const fermeture = COMMERCES_FERMES[props.osm_id];
    const couleur = fermeture ? "#B8C0BD" : cat.color;
    const nom = premierChampValide(props, ["name", "brand"]) || cat.label;
    const adresse = [props.address, props.com_nom].filter(Boolean).join(" · ");
    /* Horaires/contact masqués si fermé : les afficher quand même serait
       trompeur (un numéro qui ne répondra plus, des horaires qui ne
       s'appliquent plus) - remplacés par la mention de fermeture. */
    const horaires = fermeture ? null : parserHorairesOsm(props.opening_hours);
    const contacts = fermeture ? [] : construireContacts(props);
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="${cat.icon}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">${echapperHtml(cat.label)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${fermeture ? `<span class="popup-fiche-badge ferme-def"><span></span>Fermé définitivement</span>` : construireBadgeOuvert(horaires)}
        </div>

        ${fermeture ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">Repéré comme fermé${fermeture.depuis ? ` depuis ${echapperHtml(fermeture.depuis)}` : ""}${fermeture.note ? ` — ${echapperHtml(fermeture.note)}` : ""}. Le point reste affiché au cas où un nouveau commerce reprendrait le local.</div></div>` : ""}

        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}

        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* Banque (agence) ou distributeur automatique (DAB) : même flux OSM,
   distingué par le champ "type". Terracotta pour les DAB, pour éviter
   que tout le SIG tourne autour du même bleu institutionnel. */
function construirePopupBanque(props) {
    const estDab = props.type === "atm";
    const style = estDab
        ? { icon: "fa-solid fa-money-bill-wave", color: PALETTE.terracotta, tag: "Distributeur (DAB)" }
        : { icon: "fa-solid fa-building-columns", color: PALETTE.ardoise, tag: "Banque" };
    const nom = premierChampValide(props, ["name", "brand", "operator"]) || style.tag;
    const horaires = parserHorairesOsm(props.opening_hours);
    const contacts = construireContacts(props);
    const lignesHoraires = construireLignesHoraires(horaires);
    const operateur = props.operator && props.operator !== nom ? props.operator : null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${style.color}"><i class="${style.icon}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${style.color}">${echapperHtml(style.tag)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${operateur ? `<div class="popup-fiche-puce" style="color:${style.color}"><i class="fa-solid fa-building"></i>Opéré par ${echapperHtml(operateur)}</div>` : ""}
                ${!estDab && props.has_atm ? `<div class="popup-fiche-puce" style="color:${PALETTE.terracotta}"><i class="fa-solid fa-money-bill-wave"></i>Distributeur sur place</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>

        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}

        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* Mairie (ou mairie déléguée) : horaires en texte libre plutôt que
   syntaxe OSM (parserHorairesMairie), et liste du conseil municipal
   repliée par défaut (<details>) pour ne pas alourdir la fiche. */
function construirePopupMairie(props) {
    const tag = props.amenity || "Mairie";
    const nom = premierChampValide(props, ["name"]) || tag;
    const horaires = parserHorairesMairie(props.opening_hours);
    const contacts = construireContacts(props, { tel: "contact_phone", email: "contact_email", site: "contact_website" });
    const lignesHoraires = construireLignesHoraires(horaires);
    const elus = construireElus(props.elus);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-landmark"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">${echapperHtml(tag)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.commune ? `<div class="popup-fiche-adresse">${echapperHtml(props.commune)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>

        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}

        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}

        ${elus ? `<div class="popup-fiche-section">${elus}</div>` : ""}
    </div>`;
}

/* Boîte aux lettres La Poste : juste les heures de levée (dernier
   passage du facteur), en semaine et le samedi — pas d'autre info
   utile sur cette couche, donc pas de badge ouvert/fermé ici. */
function extraireHeureLevee(valeur) {
    if (!valeur) return null;
    const m = String(valeur).match(/(\d{2}):(\d{2})/);
    return m ? `${m[1]}:${m[2]}` : null;
}

function construirePopupBal(props) {
    /* "NULL" en toutes lettres, pas une vraie valeur nulle : convention
       de ce flux pour un numéro de voie manquant (déjà rencontrée
       ailleurs, voir premierChampValide/parserValeur). */
    const numero = (props.VA_NO_VOIE && props.VA_NO_VOIE !== "NULL") ? `${props.VA_NO_VOIE} ` : "";
    const voie = capitaliserMots(props.LB_VOIE_EXT);
    const nom = (numero + voie).trim() || "Boîte aux lettres";
    const adresse = [props.CO_POSTAL, capitaliserMots(props.LB_COM)].filter(Boolean).join(" · ");
    const semaine = extraireHeureLevee(props.HDL_SEMAINE_EXTRA);
    const samedi = extraireHeureLevee(props.HDL_SAMEDI_EXTRA);

    const lignes = [
        semaine ? `<div class="popup-fiche-jour"><span>Du lundi au vendredi</span><strong>${echapperHtml(semaine)}</strong></div>` : "",
        samedi ? `<div class="popup-fiche-jour"><span>Le samedi</span><strong>${echapperHtml(samedi)}</strong></div>` : ""
    ].join("");

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.feuille}"><i class="fa-solid fa-envelope"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.feuille}">Boîte aux lettres</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
        </div>

        ${lignes ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Levée du courrier</div>${lignes}</div>` : ""}
    </div>`;
}

/* =========================================================
   POPUP PARCELLE (cadastre) — fiche "à la Parcellai.re" : bâti, ventes
   DVF, DPE, urbanisme (zone PLUi/aléa RGA) et équipements les plus
   proches. Contrairement aux autres fiches, son contenu dépend de
   couches encore en différé (mutations/DPE/PLUi/RGA) : la popup s'ouvre
   d'abord avec juste référence/surface (construirePopupCadastreBase),
   puis se complète une fois les données chargées (voir
   ouvrirPopupParcelle, appelée depuis layers.js au premier "popupopen"
   de chaque parcelle plutôt qu'à la construction de toutes les
   parcelles visibles, sans quoi chaque déplacement de carte
   déclencherait ces chargements pour rien).
   ========================================================= */
function formaterMontant(valeur) {
    return typeof valeur === "number" ? valeur.toLocaleString("fr-FR") + " €" : null;
}

/* couleurDpe et ventesDepuisMutation vivent dans config.js : partagées
   avec l'icône par classe de la couche DPE et le style par prix/m² de
   la couche mutations (voir js/config.js), pas seulement cette popup. */

/* Bloc "Ventes connues", partagé entre la fiche parcelle (ci-dessous) et
   la popup de la couche "mutations" elle-même (voir plus bas). */
function construireVentesHtml(ventes) {
    if (!ventes.length) return "";
    return `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-euro-sign"></i>Ventes connues</div>
        ${ventes.map(v => `<div class="popup-fiche-vente">
            <span>${v.annee ? echapperHtml(String(v.annee)) : "—"}</span>
            <strong>${formaterMontant(v.valeur) || "—"}</strong>
            <span class="popup-fiche-vente-m2">${v.prixM2 ? v.prixM2.toLocaleString("fr-FR") + " €/m²" : ""}</span>
        </div>`).join("")}
    </div>`;
}

function construirePopupCadastreEntete(props) {
    return `<div class="popup-fiche-entete">
        <div class="popup-fiche-icon" style="background:${PALETTE.ardoise}"><i class="fa-solid fa-draw-polygon"></i></div>
        <div class="popup-fiche-titre-wrap">
            <div class="popup-fiche-tag" style="color:${PALETTE.ardoise}">Parcelle cadastrale</div>
            <div class="popup-fiche-titre">${echapperHtml(props.reference || "—")}</div>
            <div class="popup-fiche-adresse">${echapperHtml(props.commune_nom || "")}</div>
        </div>
        ${props.surface_m2 ? `<span class="popup-fiche-badge info">${Math.round(props.surface_m2).toLocaleString("fr-FR")} m²</span>` : ""}
    </div>`;
}

function construirePopupCadastreBase(props) {
    return `<div class="popup-fiche popup-fiche-parcelle">
        ${construirePopupCadastreEntete(props)}
        <div class="popup-fiche-chargement"><i class="fa-solid fa-circle-notch fa-spin"></i>Chargement des informations foncières…</div>
    </div>`;
}

function construirePopupCadastre(props, infos) {
    const bati = infos.nbBatiments ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-house"></i>Bâti</div>
        <div class="popup-fiche-ligne">${infos.nbBatiments} bâtiment${infos.nbBatiments > 1 ? "s" : ""}${infos.surfaceBatie ? ` · ${Math.round(infos.surfaceBatie)} m²` : ""}</div>
    </div>` : "";

    const ventes = construireVentesHtml(infos.ventes);

    const dpe = infos.dpe && infos.dpe.classe ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-bolt"></i>DPE</div>
        <div class="popup-fiche-ligne">
            <span class="popup-fiche-dpe-classe" style="background:${couleurDpe(infos.dpe.classe)}">${echapperHtml(infos.dpe.classe)}</span>
            ${infos.dpe.conso ? `${Math.round(infos.dpe.conso)} kWh/m²/an` : ""}
        </div>
    </div>` : "";

    const urbanisme = (infos.typezonePLUi || infos.niveauRGA) ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-building-shield"></i>Urbanisme</div>
        ${infos.typezonePLUi ? `<div class="popup-fiche-ligne">Zone ${echapperHtml(infos.typezonePLUi)}${infos.libellePLUi ? ` <span class="popup-fiche-precision">${echapperHtml(infos.libellePLUi)}</span>` : ""}</div>` : ""}
        ${infos.niveauRGA ? `<div class="popup-fiche-ligne">Aléa argiles : ${echapperHtml(LABELS_RGA[infos.niveauRGA] || String(infos.niveauRGA))}</div>` : ""}
    </div>` : "";

    /* infos.sup : rempli par fetchSupPourParcelle (recherche.js), appelé
       en parallèle par ouvrirPopupParcelle - absent (undefined) tant que
       ce second appel réseau n'a pas répondu, pas seulement vide, d'où
       le "|| []" plutôt qu'un simple .length. Section à part entière
       plutôt que noyée dans "Urbanisme" (retour direct : les deux
       infos se mélangeaient visuellement sur la fiche). */
    const sup = infos.sup || [];
    const supSection = sup.length ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-scale-balanced"></i>Servitude${sup.length > 1 ? "s" : ""} d'utilité publique</div>
        ${sup.map(s => `<div class="popup-fiche-ligne"><span class="popup-fiche-badge info">🟠 ${echapperHtml(s.libelle)}</span></div>`).join("")}
    </div>` : "";

    /* infos.proximite n'est déjà rempli par infosParcelle (recherche.js)
       que pour un terrain à bâtir ou une parcelle qui porte déjà une
       maison — sur une parcelle agricole/naturelle sans bâti, la
       distance à l'école ou au commerce le plus proche n'intéresse
       personne, donc on ne la calcule même pas. */
    const proximite = infos.proximite.length ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-location-dot"></i>À proximité</div>
        ${infos.proximite.map(p => `<div class="popup-fiche-jour"><span>${echapperHtml(p.titre)}</span><strong>${formaterDistance(p.distance)}</strong></div>`).join("")}
    </div>` : "";

    const rien = !bati && !ventes && !dpe && !urbanisme && !supSection && !proximite
        ? `<div class="popup-fiche-section"><div class="popup-fiche-vide">Aucune information supplémentaire disponible pour cette parcelle.</div></div>` : "";

    return `<div class="popup-fiche popup-fiche-parcelle">
        ${construirePopupCadastreEntete({ ...props, commune_nom: infos.adresse ? `${infos.adresse} · ${props.commune_nom}` : props.commune_nom })}
        ${bati}${ventes}${dpe}${urbanisme}${supSection}${proximite}${rien}
    </div>`;
}

/* Déclenchée au premier "popupopen" de chaque parcelle (voir layers.js) :
   charge les couches foncières encore différées (idempotent, chargerCouche
   ne re-télécharge rien si déjà fait), calcule les infos de cette seule
   parcelle, puis remplace le contenu "chargement..." par la fiche complète. */
function ouvrirPopupParcelle(feature, layer) {
    if (layer._infosChargees) return;
    layer._infosChargees = true;
    /* SUP récupérées en parallèle du reste (pas après) : un appel réseau
       de plus qui ne doit pas retarder l'affichage des infos déjà en
       local (DVF/DPE/PLUi/RGA/bâti) si le service SUP est lent ou
       injoignable - voir fetchSupPourParcelle (recherche.js). */
    Promise.all([chargerDonneesFoncieres(), fetchSupPourParcelle(feature)]).then(([, sup]) => {
        const infos = infosParcelle(feature);
        infos.sup = sup;
        const popup = layer.getPopup();
        if (popup) popup.setContent(injecterItineraire(construirePopupCadastre(feature.properties, infos), feature));
    });
}

/* =========================================================
   POPUP DPE — même fiche que la section DPE de la parcelle, mais pour
   la couche "Diagnostics énergétiques" prise isolément : un DPE de plus
   qu'une donnée croisée avec une parcelle précise.
   ========================================================= */
function formaterDateSeule(date) {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function capitaliserPremiere(texte) {
    return texte ? String(texte).charAt(0).toUpperCase() + String(texte).slice(1) : "";
}

function construirePopupDpe(props) {
    const classe = props.etiquette_dpe;
    const couleur = couleurDpe(classe);
    const nom = premierChampValide(props, ["adresse"]) || (props.type_batiment ? capitaliserPremiere(props.type_batiment) : "Diagnostic énergétique");

    const energie = (classe || props.consommation) ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-bolt"></i>Énergie</div>
        <div class="popup-fiche-ligne">
            ${classe ? `<span class="popup-fiche-dpe-classe" style="background:${couleur}">${echapperHtml(classe)}</span>` : ""}
            ${props.consommation ? `${Math.round(props.consommation)} kWh/m²/an` : ""}
        </div>
        ${(props.etiquette_ges || props.emissions_ges) ? `<div class="popup-fiche-ligne" style="margin-top:6px">
            ${props.etiquette_ges ? `<span class="popup-fiche-dpe-classe" style="background:${couleurDpe(props.etiquette_ges)}">${echapperHtml(props.etiquette_ges)}</span>` : ""}
            ${props.emissions_ges ? `${Math.round(props.emissions_ges)} kgCO²/m²/an <span class="popup-fiche-precision">(gaz à effet de serre)</span>` : ""}
        </div>` : ""}
    </div>` : "";

    const detailsLogement = [
        props.type_batiment ? capitaliserPremiere(props.type_batiment) : "",
        props.surface_habitable ? `${Math.round(props.surface_habitable)} m²` : "",
        props.annee_construction ? `construit en ${props.annee_construction}` : (props.periode_construction || "")
    ].filter(Boolean);
    const logement = detailsLogement.length ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-house"></i>Logement</div>
        <div class="popup-fiche-ligne">${detailsLogement.map(echapperHtml).join(" · ")}</div>
    </div>` : "";

    const chauffage = [props.energie_chauffage, props.energie_ecs].filter(Boolean);
    const sectionChauffage = chauffage.length ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-fire-flame-simple"></i>Chauffage</div>
        <div class="popup-fiche-ligne">${chauffage.map(echapperHtml).join(" · ")}</div>
    </div>` : "";

    const dateEtablissement = formaterDateSeule(props.date_etablissement_dpe);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-bolt"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Diagnostic énergétique</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.commune ? `<div class="popup-fiche-adresse">${echapperHtml(props.commune)}</div>` : ""}
            </div>
        </div>
        ${energie}${logement}${sectionChauffage}
        ${dateEtablissement ? `<div class="popup-fiche-section"><div class="popup-fiche-precision"><i class="fa-regular fa-clock"></i> Diagnostic établi le ${echapperHtml(dateEtablissement)}</div></div>` : ""}
    </div>`;
}

/* =========================================================
   POPUP MUTATION — couche "Mutations immobilières (DVF)" prise
   isolément (par opposition à la fiche parcelle, qui la croise avec le
   cadastre) : réutilise ventesDepuisMutation/construireVentesHtml comme
   la fiche parcelle, colorée avec la même échelle que le style de la
   couche (stylePrixMutation dans config.js) pour rester cohérent entre
   le remplissage de la parcelle sur la carte et sa popup.
   ========================================================= */
function construirePopupMutation(props, feature) {
    const ventes = ventesDepuisMutation(feature);
    const couleur = ventes[0] && ventes[0].prixM2 ? couleurPrix(ventes[0].prixM2) : PALETTE.terracotta;
    const nom = premierChampValide(props, ["adresse"]) || `Parcelle ${[props.section, props.numero_parcelle].filter(Boolean).join(" ")}`.trim() || "Vente immobilière";
    const adresse = [props.code_postal, props.commune].filter(Boolean).join(" · ");
    const ventesHtml = construireVentesHtml(ventes);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-file-invoice-dollar"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Vente immobilière (DVF)</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${props.nb_mutations > 1 ? `<span class="popup-fiche-badge info">${props.nb_mutations} ventes</span>` : ""}
        </div>
        ${ventesHtml || `<div class="popup-fiche-section"><div class="popup-fiche-vide">Aucune vente exploitable (pas de surface bâtie associée) sur cette parcelle.</div></div>`}
    </div>`;
}

/* =========================================================
   POPUP CONSIGNE / CASIER COLIS — flux Overpass (OpenStreetMap), voir
   config.js pour le détail de la requête et les limites de couverture
   (réseaux récents comme Vinted Go potentiellement sous-représentés).
   Champs OSM bruts, pas toujours renseignés selon le contributeur : le
   nom d'enseigne (catégorieLocker) et l'adresse sont reconstruits du
   mieux possible plutôt que de compter sur un seul champ fixe.
   ========================================================= */
function construirePopupLocker(props) {
    const cat = categorieLocker(props);
    const pointRelais = estPointRelaisCommerce(props);
    const nom = premierChampValide(props, ["name", "brand", "ref"]) || cat.label;
    const adresse = [
        [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" "),
        props["addr:city"]
    ].filter(Boolean).join(" · ");
    const horaires = parserHorairesOsm(props.opening_hours);
    /* contact:phone/contact:website : variante de balisage OSM aussi
       courante que phone/website selon le contributeur. */
    const contacts = construireContacts({
        ...props,
        phone: props.phone || props["contact:phone"],
        website: props.website || props["contact:website"]
    });
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${cat.color}"><i class="fa-solid fa-${pointRelais ? "store" : "box"}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${cat.color}">${echapperHtml(cat.label)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
                ${pointRelais ? `<div class="popup-fiche-puce" style="color:${cat.color}"><i class="fa-solid fa-store"></i>Point relais, dans un commerce</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>

        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}

        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* =========================================================
   MÉDECINS, VÉTÉRINAIRES, BIBLIOTHÈQUES, OFFICES DE TOURISME, AIRES DE
   CAMPING-CAR — cinq couches en flux Overpass (voir config.js), même
   vocabulaire de champs OSM que les casiers colis (addr:*, phone/
   contact:phone, website/contact:website, opening_hours, wheelchair),
   donc les mêmes aides (construireContacts, parserHorairesOsm...)
   suffisent, chaque fiche n'ajoutant que ce qui lui est propre.
   ========================================================= */
function adresseOsm(props) {
    return [
        [props["addr:housenumber"], props["addr:street"]].filter(Boolean).join(" "),
        props["addr:city"]
    ].filter(Boolean).join(" · ");
}
function contactsOsm(props) {
    return construireContacts({
        ...props,
        phone: props.phone || props["contact:phone"],
        website: props.website || props["contact:website"]
    });
}

/* Casernes de pompiers / gendarmerie-police : pas de fiche "commerce"
   (pas d'horaires publiques à afficher, pas vocation à être appelées
   pour autre chose qu'une urgence) - juste de quoi identifier/localiser
   le poste, avec un rappel du bon numéro plutôt qu'un numéro de standard
   qui inciterait à l'appeler à la place du 18/112 ou 17/112. */
function construirePopupPompiers(props) {
    const nom = premierChampValide(props, ["name"]) || "Caserne de pompiers";
    const adresse = adresseOsm(props);
    const operateur = props.operator || null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:#AD4826"><i class="fa-solid fa-fire"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:#AD4826">Caserne de pompiers</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
                ${operateur ? `<div class="popup-fiche-puce" style="color:#AD4826"><i class="fa-solid fa-building"></i>${echapperHtml(operateur)}</div>` : ""}
            </div>
        </div>
        <div class="popup-fiche-section"><div class="popup-fiche-precision">En cas d'urgence, composez le 18 ou le 112.</div></div>
    </div>`;
}

function libelleForceOrdre(props) {
    const texte = [props.operator, props.name].filter(Boolean).join(" ").toLowerCase();
    if (texte.includes("gendarmerie")) return "Gendarmerie";
    if (texte.includes("municipale")) return "Police municipale";
    if (texte.includes("police")) return "Police nationale";
    return "Gendarmerie / Police";
}
function construirePopupGendarmerie(props) {
    const tag = libelleForceOrdre(props);
    const nom = premierChampValide(props, ["name"]) || tag;
    const adresse = adresseOsm(props);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:#AD4826"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:#AD4826">${echapperHtml(tag)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
        </div>
        <div class="popup-fiche-section"><div class="popup-fiche-precision">En cas d'urgence, composez le 17 ou le 112.</div></div>
    </div>`;
}

function construirePopupEhpad(props) {
    const nom = premierChampValide(props, ["name", "operator"]) || "EHPAD / maison de retraite";
    const adresse = adresseOsm(props);
    const contacts = contactsOsm(props);
    const capacite = props.capacity ? `${props.capacity} place${Number(props.capacity) > 1 ? "s" : ""}` : null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:#AD4826"><i class="fa-solid fa-person-cane"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:#AD4826">EHPAD / maison de retraite</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
        </div>
        ${capacite ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${echapperHtml(capacite)}</div></div>` : ""}
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
    </div>`;
}

function construirePopupToilettes(props) {
    const horaires = parserHorairesOsm(props.opening_hours);
    const infos = [
        props.fee === "yes" ? "Payant" : (props.fee === "no" ? "Gratuit" : null),
        LABELS_ACCESSIBILITE[props.wheelchair] || null
    ].filter(Boolean);
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.ardoise}"><i class="fa-solid fa-restroom"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.ardoise}">Toilettes publiques</div>
                <div class="popup-fiche-titre">${echapperHtml(props.name || "Toilettes publiques")}</div>
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* =========================================================
   FRANCE SERVICES — extrait statique filtré sur le territoire (voir
   config.js), champs français directement issus du CSV national ANCT
   (id_fs, insee_dep, lib_fs, adresse, complement_adresse, insee_com,
   code_postal, lib_com, mail, telephone, h_lundi..h_samedi, prise_rdv,
   commentaire, type_fs, format_fs, groupe_fs, labellisation_fs).
   Horaires en six champs séparés ("09:00 - 12:30 / 14:00 - 17:30" par
   jour), pas en syntaxe OSM : parserHorairesFranceServices les ramène à
   la même structure {Mo: [...], ...} que parserHorairesOsm pour
   réutiliser construireLignesHoraires/construireBadgeOuvert tels quels. */
const LABELS_FORMAT_FRANCE_SERVICES = {
    Fixe: "Espace fixe",
    "Bus_équivalent": "Bus itinérant",
    Mobile: "Service itinérant",
    Antenne: "Antenne"
};
function libelleFormatFranceServices(valeur) {
    if (!valeur) return null;
    return LABELS_FORMAT_FRANCE_SERVICES[valeur] || capitaliserMots(valeur.replace(/_/g, " "));
}
function parserHorairesFranceServices(props) {
    const champs = { Mo: "h_lundi", Tu: "h_mardi", We: "h_mercredi", Th: "h_jeudi", Fr: "h_vendredi", Sa: "h_samedi" };
    const horaires = {};
    let auMoinsUn = false;
    Object.entries(champs).forEach(([jour, champ]) => {
        const valeur = (props[champ] || "").trim();
        if (!valeur) return;
        auMoinsUn = true;
        horaires[jour] = valeur.split("/").map(p => p.trim().replace(/\s*-\s*/, "-")).filter(Boolean);
    });
    return auMoinsUn ? horaires : null;
}
function construirePopupFranceServices(props) {
    const nom = premierChampValide(props, ["lib_fs"]) || "France Services";
    const adresse = [
        [props.adresse, props.complement_adresse].filter(Boolean).join(", "),
        [props.code_postal, props.lib_com].filter(Boolean).join(" ")
    ].filter(Boolean).join(" · ");
    /* Un "Bus_équivalent"/"Mobile" dessert le territoire en tournée : ses
       horaires publiés sont ceux du point de rattachement administratif,
       pas d'un lieu fixe où se rendre - les afficher comme si c'était un
       vrai horaire d'accueil sur place induirait en erreur, d'où le repli
       sur une simple puce "itinérant" plutôt qu'un badge ouvert/fermé. */
    const itinerant = props.format_fs === "Bus_équivalent" || props.format_fs === "Mobile";
    const horaires = itinerant ? null : parserHorairesFranceServices(props);
    const contacts = construireContacts(props, { tel: "telephone", email: "mail" });
    const lignesHoraires = construireLignesHoraires(horaires);
    const formatLabel = libelleFormatFranceServices(props.format_fs);
    const infos = [props.prise_rdv === "Oui" ? "Sur rendez-vous" : null].filter(Boolean);
    const commentaire = (props.commentaire || "").trim();

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-people-roof"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">France Services</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
                ${itinerant ? `<div class="popup-fiche-puce" style="color:${PALETTE.riviere}"><i class="fa-solid fa-route"></i>${echapperHtml(formatLabel || "Service itinérant")} sur le territoire</div>` : ""}
            </div>
            ${horaires ? construireBadgeOuvert(horaires) : ""}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
        ${commentaire ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(commentaire)}</div></div>` : ""}
        ${props.labellisation_fs ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(props.labellisation_fs)}</div></div>` : ""}
    </div>`;
}

/* Itinéraires cyclables (relations OSM route=bicycle, voir config.js) */
const LABELS_RESEAU_VELO = {
    icn: "Itinéraire international", ncn: "Itinéraire national",
    rcn: "Itinéraire régional", lcn: "Itinéraire local"
};
function construirePopupVelo(props) {
    const nom = premierChampValide(props, ["name"]) || "Itinéraire cyclable";
    const reseau = LABELS_RESEAU_VELO[props.network] || null;
    const contacts = construireContacts({ ...props, website: props.website || props["contact:website"] });

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-bicycle"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">${echapperHtml(reseau || "Itinéraire cyclable")}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.ref ? `<div class="popup-fiche-adresse">Référence ${echapperHtml(props.ref)}</div>` : ""}
            </div>
        </div>
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">En savoir plus</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
    </div>`;
}

/* Historique des catastrophes naturelles (CATNAT/GASPAR, voir config.js)
   - forme exacte des champs par événement non vérifiée en conditions
   réelles (accès réseau restreint pendant le développement) : plusieurs
   noms de champs candidats essayés pour chaque valeur affichée, plutôt
   que de supposer un schéma précis et risquer une fiche vide/cassée si
   la réponse réelle diffère de la documentation trouvée en recherche. */
function libelleEvenementCatnat(ev) {
    return ev.lib_risque_jo || ev.libelle_risque_jo || ev.risque || ev.type_catnat || "Catastrophe naturelle";
}
function dateEvenementCatnat(ev) {
    const d = ev.dat_deb || ev.date_debut_evt || ev.date_debut || null;
    return d ? String(d).slice(0, 10) : null;
}
function construirePopupCatnat(props) {
    const nom = premierChampValide(props, ["nom_offici"]) || "Commune";
    const evenements = props.catnat_evenements || [];
    const lignes = evenements.map(ev => {
        const date = dateEvenementCatnat(ev);
        return `<div class="popup-fiche-ligne">${echapperHtml(libelleEvenementCatnat(ev))}${date ? ` <span style="color:#8A8882">· ${echapperHtml(date)}</span>` : ""}</div>`;
    }).join("");

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.ardoise}"><i class="fa-solid fa-cloud-showers-heavy"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.ardoise}">Historique des catastrophes naturelles</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${evenements.length
            ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">${evenements.length} arrêté${evenements.length > 1 ? "s" : ""} recensé${evenements.length > 1 ? "s" : ""} (source : Géorisques)</div>${lignes}</div>`
            : `<div class="popup-fiche-section"><div class="popup-fiche-precision">Aucun arrêté de catastrophe naturelle recensé sur cette commune (source : Géorisques).</div></div>`}
    </div>`;
}

/* Couleur fixe de l'en-tête (feuille), pas la couleur conditionnelle de
   l'aplat sur la carte (styleQualiteEau, js/config.js) : même raison que
   construirePopupDemographie, la teinte rouge d'un aplat "non conforme"
   resterait lisible mais une icône de section entière dans cette couleur
   serait plus criarde que nécessaire ici. */
function construirePopupQualiteEau(props) {
    const nom = premierChampValide(props, ["nom_offici"]) || "Commune";
    const resultat = props.qualite_eau_resultat;
    const couleur = PALETTE.feuille;

    if (!resultat || !resultat.conclusion_conformite_prelevement) {
        return `<div class="popup-fiche">
            <div class="popup-fiche-entete">
                <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-droplet"></i></div>
                <div class="popup-fiche-titre-wrap">
                    <div class="popup-fiche-tag" style="color:${couleur}">Qualité de l'eau potable</div>
                    <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                </div>
            </div>
            <div class="popup-fiche-section">
                <div class="popup-fiche-vide">Aucun résultat récent disponible pour cette commune (source : Hub'Eau).</div>
            </div>
        </div>`;
    }

    const nonConforme = qualiteEauNonConforme(resultat);
    const reseau = resultat.reseaux && resultat.reseaux[0] && resultat.reseaux[0].nom;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-droplet"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Qualité de l'eau potable</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        <div class="popup-fiche-section">
            <div class="popup-fiche-ligne"><i class="fa-solid ${nonConforme ? "fa-triangle-exclamation" : "fa-circle-check"}" style="color:${nonConforme ? "#AD4826" : PALETTE.feuille}"></i> ${echapperHtml(resultat.conclusion_conformite_prelevement)}</div>
            ${reseau ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-water"></i> Réseau ${echapperHtml(reseau)}</div>` : ""}
            ${resultat.date_prelevement ? `<div class="popup-fiche-ligne"><i class="fa-regular fa-calendar"></i> Dernier contrôle le ${formaterDateSeule(resultat.date_prelevement)}</div>` : ""}
        </div>
        <div class="popup-fiche-section"><div class="popup-fiche-precision">Source : Hub'Eau (ministère de la Santé), dernier prélèvement analysé.</div></div>
    </div>`;
}

/* nom !== type : la ligne "Ruisseau"/"Rivière"... n'est ajoutée que
   quand le titre affiché est un vrai nom propre (ex. "Le Rhonne") -
   sinon ("Ruisseau" utilisé comme titre faute de nom OSM) elle
   répéterait exactement le titre juste au-dessus, pour rien. */
function construirePopupCoursEau(props) {
    const type = LABELS_COURS_EAU[props.waterway] || "Cours d'eau";
    const nom = premierChampValide(props, ["name"]) || type;
    const couleur = PALETTE.riviere;

    const lignes = [
        nom !== type ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-water"></i> ${type}</div>` : null,
        props.intermittent === "yes" ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-droplet-slash"></i> Intermittent : peut s'assécher en été</div>` : null,
        props.tunnel === "culvert" ? `<div class="popup-fiche-precision">Passe en partie sous terre (busé) sur ce tronçon.</div>` : null
    ].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-water"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">${type}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${lignes.length ? `<div class="popup-fiche-section">${lignes.join("")}</div>` : ""}
    </div>`;
}

const LABELS_INTERNET_BIBLIOTHEQUE = { yes: "Accès Internet", wlan: "Wifi disponible", terminal: "Poste informatique" };
function construirePopupBibliotheque(props) {
    const nom = premierChampValide(props, ["name"]) || "Bibliothèque";
    const adresse = adresseOsm(props);
    const horaires = parserHorairesOsm(props.opening_hours);
    const contacts = contactsOsm(props);
    const lignesHoraires = construireLignesHoraires(horaires);
    const infos = [
        LABELS_INTERNET_BIBLIOTHEQUE[props.internet_access] || null,
        LABELS_ACCESSIBILITE[props.wheelchair] || null
    ].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.foret}"><i class="fa-solid fa-book"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.foret}">Bibliothèque / médiathèque</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

function construirePopupOfficeTourisme(props) {
    const nom = premierChampValide(props, ["name"]) || "Office de tourisme";
    const adresse = adresseOsm(props);
    const horaires = parserHorairesOsm(props.opening_hours);
    const contacts = contactsOsm(props);
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-map-location-dot"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">Office de tourisme</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

function construirePopupCampingCar(props) {
    const nom = premierChampValide(props, ["name"]) || "Aire de camping-car";
    const adresse = adresseOsm(props);
    const horaires = parserHorairesOsm(props.opening_hours);
    const contacts = contactsOsm(props);
    const lignesHoraires = construireLignesHoraires(horaires);
    const capacite = props.capacity ? `${props.capacity} emplacement${Number(props.capacity) > 1 ? "s" : ""}` : null;
    const services = [
        props.sanitary_dump_station === "yes" ? "Vidange sanitaire" : (props.sanitary_dump_station === "customers" ? "Vidange sanitaire (clients)" : null),
        props.drinking_water === "yes" ? "Eau potable" : null,
        props.power_supply === "yes" ? "Électricité" : null,
        props.fee === "no" ? "Gratuit" : (props.fee === "yes" ? "Payant" : null)
    ].filter(Boolean);
    const ligne = [capacite, ...services].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-caravan"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">Aire de camping-car</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${ligne.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${ligne.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* =========================================================
   POPUP DÉCHÈTERIE / TRI — trois fiches différentes selon le champ
   "type" (voir iconeDechet dans config.js pour la même distinction côté
   marqueur) : déchèterie, composteur partagé, point d'apport volontaire.
   ========================================================= */
function construirePopupDechet(props) {
    if (props.type === "centre") return construirePopupDecheterie(props);
    if (props.type === "compost") return construirePopupCompost(props);
    return construirePopupApportVolontaire(props);
}

function construirePopupDecheterie(props) {
    const operateur = operateurDechet(props.operator);
    /* Géré exactement comme les commerces (parserHorairesOsm/
       construireBadgeOuvert/construireLignesHoraires, y compris les
       horaires saisonnières été/hiver, ex. "Apr-Sep: Mo-Sa 09:00-19:00;
       Oct-Mar: Mo-Sa 09:00-17:00") - n'affiche simplement rien tant que
       le champ est vide ou mal formé, comme partout ailleurs sur le
       site. */
    const horaires = parserHorairesOsm(props.opening_hours);
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.foret}"><i class="fa-solid fa-warehouse"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.foret}">Déchèterie</div>
                <div class="popup-fiche-titre">${echapperHtml(props.name || "Déchèterie")}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${operateur ? `<div class="popup-fiche-puce" style="color:${PALETTE.foret}"><i class="fa-solid fa-building"></i>Gérée par ${echapperHtml(operateur)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>

        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

function construirePopupCompost(props) {
    const acces = (props.opening_hours || "").trim();
    const public_ = /^public/i.test(acces);
    const operateur = operateurDechet(props.operator);
    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.feuille}"><i class="fa-solid fa-seedling"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.feuille}">Composteur partagé</div>
                <div class="popup-fiche-titre">${echapperHtml(props.name || "Composteur partagé")}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${operateur ? `<div class="popup-fiche-puce" style="color:${PALETTE.feuille}"><i class="fa-solid fa-building"></i>Géré par ${echapperHtml(operateur)}</div>` : ""}
            </div>
            ${acces ? `<span class="popup-fiche-badge ${public_ ? "ouvert" : "ferme"}"><span></span>${public_ ? "Public" : "Accès réservé"}</span>` : ""}
        </div>
        ${(acces && acces.toLowerCase() !== "public") ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(acces)}</div></div>` : ""}
    </div>`;
}

function construirePopupApportVolontaire(props) {
    const flux = fluxPresents(props);
    const couleur = flux[0] ? flux[0].color : PALETTE.ardoise;
    const operateur = operateurDechet(props.operator);
    const chips = flux.map(f => `<span class="popup-fiche-flux" style="color:${f.color}"><span></span>${echapperHtml(f.label)}</span>`).join("");

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-recycle"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Point d'apport volontaire</div>
                <div class="popup-fiche-titre">${echapperHtml(props.name || "Point d'apport volontaire")}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${operateur ? `<div class="popup-fiche-puce" style="color:${couleur}"><i class="fa-solid fa-building"></i>Géré par ${echapperHtml(operateur)}</div>` : ""}
            </div>
        </div>
        ${chips ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre"><i class="fa-solid fa-recycle"></i>Tri sélectif</div><div class="popup-fiche-flux-liste">${chips}</div></div>` : ""}
    </div>`;
}

/* =========================================================
   ITINÉRAIRE (Google Maps / Waze) — ajouté en pied de TOUTES les popups
   du site (voir construirePopup/ouvrirPopupParcelle), un seul point
   d'ajout plutôt qu'une implémentation par fiche.
   ========================================================= */

/* Point représentatif d'une feature pour un lien "itinéraire" : ses
   coordonnées si c'est un point, le centre de l'anneau extérieur pour
   un polygone, le point médian pour une ligne (ex. lignes ALÉOP,
   randonnées — pas de "destination" évidente pour une ligne, le milieu
   reste le choix le plus raisonnable sans info supplémentaire). */
function coordonneesPourItineraire(feature) {
    const geom = feature && feature.geometry;
    if (!geom) return null;
    const centroideAnneau = anneau => {
        let sx = 0, sy = 0;
        anneau.forEach(([x, y]) => { sx += x; sy += y; });
        return [sx / anneau.length, sy / anneau.length];
    };
    if (geom.type === "Point") return geom.coordinates;
    if (geom.type === "Polygon") return centroideAnneau(geom.coordinates[0]);
    if (geom.type === "MultiPolygon") return centroideAnneau(geom.coordinates[0][0]);
    if (geom.type === "LineString") return geom.coordinates[Math.floor(geom.coordinates.length / 2)];
    if (geom.type === "MultiLineString") { const l = geom.coordinates[0]; return l[Math.floor(l.length / 2)]; }
    return null;
}

function construireItineraire(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number") return "";
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    const waze = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    return `<div class="popup-fiche-itineraire">
        <a href="${gmaps}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-google"></i>Google Maps</a>
        <a href="${waze}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-waze"></i>Waze</a>
    </div>`;
}

/* Insère le bloc itinéraire juste avant la balise fermante finale d'une
   fiche : toutes les popups du site (.popup-fiche comme .popup-carburant)
   se terminent par un seul </div> qui ferme le conteneur racine, donc un
   seul point d'insertion suffit plutôt que de dupliquer l'appel dans
   chacune des construirePopupXxx. */
function injecterItineraire(html, feature) {
    const coord = coordonneesPourItineraire(feature);
    if (!coord) return html;
    const bloc = construireItineraire(coord[1], coord[0]);
    if (!bloc) return html;
    return html.replace(/<\/div>\s*$/, bloc + "</div>");
}

/* =========================================================
   FICHES SUR MESURE — le reste des couches du site, une par une plutôt
   que de les laisser sur la fiche générique (voir plus bas) : champs
   humanisés en français plutôt que les noms de colonnes bruts, et
   horaires réellement interprétées (parserHorairesOsm) plutôt
   qu'affichées telles quelles.
   ========================================================= */
function estVrai(v) {
    return v === true || v === "True" || v === "true" || v === "1" || v === 1;
}
function tronquerTexte(texte, max) {
    if (!texte) return "";
    return texte.length > max ? texte.slice(0, max).trim() + "…" : texte;
}
function formaterDureeHeures(h) {
    if (typeof h !== "number" || !Number.isFinite(h)) return null;
    const totalMin = Math.round(h * 60);
    const heures = Math.floor(totalMin / 60), minutes = totalMin % 60;
    return heures ? `${heures} h${minutes ? " " + String(minutes).padStart(2, "0") : ""}` : `${minutes} min`;
}
function couleurDepuisRgb(rgb) {
    const m = String(rgb).match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
    if (!m) return null;
    return "#" + [m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, "0")).join("");
}
const LABELS_ACCESSIBILITE = { yes: "Accessible PMR", no: "Non accessible PMR", limited: "Accessibilité limitée" };
const LABELS_ACCESSIBILITE_BUS = { available: "Accessible PMR", "not available": "Non accessible PMR", limited: "Accessibilité limitée", unknown: "Accessibilité inconnue" };

/* Bornes de recharge (IRVE) : schéma national standardisé
   (data.gouv.fr), horaires en syntaxe OSM comme les autres flux, et
   plusieurs champs booléens stockés en chaînes "True"/"False". */
const PRISES_IRVE = [
    { champ: "prise_type_2", label: "Type 2" },
    { champ: "prise_type_combo_ccs", label: "Combo CCS" },
    { champ: "prise_type_chademo", label: "CHAdeMO" },
    { champ: "prise_type_ef", label: "Domestique (EF)" },
    { champ: "prise_type_autre", label: "Autre prise" }
];
function construirePopupIrve(props) {
    const nom = premierChampValide(props, ["nom_station", "nom_enseigne"]) || "Borne de recharge";
    const enseigne = props.nom_enseigne && props.nom_enseigne !== nom ? props.nom_enseigne : null;
    const horaires = parserHorairesOsm(props.horaires);
    const prises = PRISES_IRVE.filter(p => estVrai(props[p.champ])).map(p => p.label);

    const recharge = (props.nbre_pdc || props.puissance_nominale || prises.length) ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-bolt"></i>Recharge</div>
        <div class="popup-fiche-ligne">${[
            props.nbre_pdc ? `${props.nbre_pdc} point${Number(props.nbre_pdc) > 1 ? "s" : ""} de charge` : "",
            props.puissance_nominale ? `${props.puissance_nominale} kW` : ""
        ].filter(Boolean).join(" · ")}</div>
        ${prises.length ? `<div class="popup-fiche-ligne" style="margin-top:6px">${prises.map(echapperHtml).join(" · ")}</div>` : ""}
    </div>` : "";

    const acces = [
        props.condition_acces,
        estVrai(props.gratuit) ? "Gratuit" : (props.gratuit === "False" ? "Payant" : null),
        estVrai(props.reservation) ? "Réservation obligatoire" : null
    ].filter(Boolean);
    const sectionAcces = acces.length ? `<div class="popup-fiche-section">
        <div class="popup-fiche-section-titre"><i class="fa-solid fa-circle-check"></i>Accès</div>
        <div class="popup-fiche-ligne">${acces.map(echapperHtml).join(" · ")}</div>
    </div>` : "";

    const contacts = construireContacts({
        ...props,
        phone: props.telephone_operateur || null,
        email: (props.contact_operateur || "").includes("@") ? props.contact_operateur : null
    });
    const lignesHoraires = construireLignesHoraires(horaires);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-charging-station"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">Borne de recharge</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.adresse_station ? `<div class="popup-fiche-adresse">${echapperHtml(props.adresse_station)}</div>` : ""}
                ${enseigne ? `<div class="popup-fiche-puce" style="color:${PALETTE.terracotta}"><i class="fa-solid fa-building"></i>${echapperHtml(enseigne)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${recharge}${sectionAcces}
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
        ${lignesHoraires ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>` : ""}
    </div>`;
}

/* Aires de covoiturage. */
function construirePopupCovoiturage(props) {
    const nom = premierChampValide(props, ["nom_lieu", "id_local"]) || "Aire de covoiturage";
    const adresse = [props.ad_lieu, props.com_lieu].filter(Boolean).join(" · ");
    const places = [
        props.nbre_pl ? `${props.nbre_pl} place${props.nbre_pl > 1 ? "s" : ""}` : "",
        props.nbre_pmr ? `dont ${props.nbre_pmr} PMR` : ""
    ].filter(Boolean).join(" ");
    const infos = [
        props.lumiere === true ? "Éclairée" : (props.lumiere === false ? "Non éclairée" : null),
        props.proprio ? `Gérée par ${props.proprio}` : null
    ].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-car"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">Aire de covoiturage</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${typeof props.ouvert === "boolean" ? `<span class="popup-fiche-badge ${props.ouvert ? "ouvert" : "ferme"}"><span></span>${props.ouvert ? "Ouverte" : "Fermée"}</span>` : ""}
        </div>
        ${places ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre"><i class="fa-solid fa-square-parking"></i>Places</div><div class="popup-fiche-ligne">${echapperHtml(places)}</div></div>` : ""}
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${props.comm ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(props.comm)}</div></div>` : ""}
    </div>`;
}

/* Marchés : très peu de champs réellement renseignés dans la donnée
   OSM (la plupart des clés du flux sont vides pour ce territoire),
   horaires parfois hors des motifs courants (ex. "week 01,03 Fr
   17:00-20:00", une périodicité par semaine que parserHorairesOsm ne
   couvre pas) : dans ce cas le texte brut est affiché plutôt que rien,
   c'est toujours plus utile qu'une fiche vide. */
function construirePopupMarche(props) {
    const horaires = parserHorairesOsm(props.opening_hours);
    const lignesHoraires = construireLignesHoraires(horaires);
    const nom = premierChampValide(props, ["name"]) || "Marché";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.feuille}"><i class="fa-solid fa-store"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.feuille}">Marché</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${lignesHoraires
            ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Horaires</div>${lignesHoraires}</div>`
            : (props.opening_hours ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(props.opening_hours)}</div></div>` : "")}
    </div>`;
}

/* Aires de jeux. */
function construirePopupAireJeu(props) {
    const horaires = parserHorairesOsm(props.opening_hours);
    const nom = premierChampValide(props, ["name"]) || "Aire de jeux";
    const infos = [
        (props.min_age || props.max_age) ? `${props.min_age || 0} - ${props.max_age || "?"} ans` : null,
        props.surface ? `${props.surface} m²` : null,
        props.indoor === true ? "Intérieur" : (props.indoor === false ? "Extérieur" : null),
        props.fee === true ? "Payant" : (props.fee === false ? "Gratuit" : null),
        LABELS_ACCESSIBILITE[props.wheelchair] || null
    ].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-child-reaching"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">Aire de jeux</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${props.operator ? `<div class="popup-fiche-puce" style="color:${PALETTE.terracotta}"><i class="fa-solid fa-building"></i>Gérée par ${echapperHtml(props.operator)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
    </div>`;
}

/* Équipements sportifs : "type" (leisure OSM) et "sport" sont des
   valeurs anglaises en anglais brut dans la donnée — traduites via un
   petit dictionnaire des valeurs réellement présentes sur ce
   territoire, avec un repli qui met juste une majuscule pour les
   valeurs non prévues plutôt que rien. */
const LABELS_EQUIPEMENT_SPORTIF = {
    pitch: "Terrain de sport", sports_centre: "Centre sportif", track: "Piste",
    swimming_pool: "Piscine", horse_riding: "Centre équestre",
    recreation_ground: "Terrain de loisirs", fitness_station: "Station de fitness"
};
const LABELS_SPORT = {
    soccer: "Football", boules: "Boules / pétanque", tennis: "Tennis", multi: "Multisports",
    swimming: "Natation", basketball: "Basketball", table_tennis: "Tennis de table",
    athletics: "Athlétisme", equestrian: "Équitation", running: "Course à pied",
    handball: "Handball", billiards: "Billard", skateboard: "Skateboard",
    volleyball: "Volleyball", cycling: "Cyclisme", motocross: "Motocross",
    ultralight_aviation: "Aviation légère (ULM)"
};
/* Certaines valeurs OSM combinent plusieurs sports sur un même terrain
   ("basketball;handball;soccer" - vérifié en conditions réelles sur ce
   territoire) : traduit chaque partie séparément plutôt que d'afficher
   la valeur brute non reconnue dans son ensemble. */
function labelSport(valeurBrute) {
    if (!valeurBrute) return null;
    return String(valeurBrute).split(";").map(v => LABELS_SPORT[v.trim()] || capitaliserPremiere(v.trim())).join(" / ");
}
function construirePopupEquipementSportif(props) {
    const typeLabel = LABELS_EQUIPEMENT_SPORTIF[props.type] || "Équipement sportif";
    const sportLabel = labelSport(props.sport);
    const nom = premierChampValide(props, ["name"]) || sportLabel || typeLabel;
    const horaires = parserHorairesOsm(props.opening_hours);
    const infos = [sportLabel && nom !== sportLabel ? sportLabel : null, LABELS_ACCESSIBILITE[props.wheelchair] || null].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-futbol"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">${echapperHtml(typeLabel)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
                ${props.operator ? `<div class="popup-fiche-puce" style="color:${PALETTE.riviere}"><i class="fa-solid fa-building"></i>Géré par ${echapperHtml(props.operator)}</div>` : ""}
            </div>
            ${construireBadgeOuvert(horaires)}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
    </div>`;
}

/* Petite enfance (assistants maternels) : téléphone/mail portent un
   retour à la ligne de tête dans la donnée source ("\n06 40...") — nettoyés
   à l'affichage plutôt que de le laisser polluer le lien tel:/mailto:. */
function construirePopupPetiteEnfance(props) {
    const nom = props.nom || "Assistant maternel";
    const contacts = construireContacts({
        ...props,
        phone: props.telephone ? props.telephone.trim() : null,
        email: props.mail ? props.mail.trim() : null,
        website: props.ficheCAF || null
    });

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-baby"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">${echapperHtml(props.type || "Petite enfance")}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.adresse ? `<div class="popup-fiche-adresse">${echapperHtml(props.adresse)}</div>` : ""}
            </div>
        </div>
        ${contacts.length ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Contact</div><div class="popup-fiche-contacts">${contacts.join("")}</div></div>` : ""}
    </div>`;
}

/* Écoles. Clés accentuées : la vraie donnée (education.geojson) porte
   "élémentaire"/"collège"/"lycée" avec accents (vérifié en conditions
   réelles) - sans ça la plupart des entrées ratent la table et
   retombent sur capitaliserPremiere(type_fr) juste en dessous (résultat
   visuellement identique par coïncidence, mais la table ne servait à
   rien pour ces trois types). */
const LABELS_TYPE_ECOLE = { primaire: "École primaire", maternelle: "École maternelle", "élémentaire": "École élémentaire", "collège": "Collège", "lycée": "Lycée", SEGPA: "SEGPA" };
function construirePopupEcole(props) {
    const typeLabel = LABELS_TYPE_ECOLE[props.type_fr] || (props.type_fr ? capitaliserPremiere(props.type_fr) : "École");
    const nom = premierChampValide(props, ["name"]) || typeLabel;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.terracotta}"><i class="fa-solid fa-graduation-cap"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.terracotta}">${echapperHtml(typeLabel)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.com_nom ? `<div class="popup-fiche-adresse">${echapperHtml(props.com_nom)}</div>` : ""}
            </div>
            ${props.statut ? `<span class="popup-fiche-badge info">${echapperHtml(capitaliserPremiere(props.statut))}</span>` : ""}
        </div>
    </div>`;
}

/* Défibrillateurs : "2000-01-01" en date de dernière maintenance est
   une valeur-sentinelle du jeu de données (huit enregistrements
   l'ont, exactement la même date ronde) plutôt qu'une vraie date
   connue — traitée comme absente à l'affichage. */
function construirePopupDae(props) {
    const nom = props.c_nom && props.c_nom !== "DAE" ? props.c_nom : "Défibrillateur";
    const adresse = [[props.c_adr_num, props.c_adr_voie].filter(Boolean).join(" "), props.c_com_cp, props.c_com_nom].filter(Boolean).join(" · ");
    const enService = props.c_etat_fonct === "En fonctionnement";
    const infos = [props.c_acc ? `Accès ${props.c_acc.toLowerCase()}` : null, props.c_acc_complt || null].filter(Boolean);
    const maintenance = (props.c_dermnt && props.c_dermnt !== "2000-01-01") ? formaterDateSeule(props.c_dermnt) : null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:#AD4826"><i class="fa-solid fa-heart-pulse"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:#AD4826">Défibrillateur</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${adresse ? `<div class="popup-fiche-adresse">${echapperHtml(adresse)}</div>` : ""}
            </div>
            ${props.c_etat_fonct ? `<span class="popup-fiche-badge ${enService ? "ouvert" : "ferme"}"><span></span>${echapperHtml(props.c_etat_fonct)}</span>` : ""}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${maintenance ? `<div class="popup-fiche-section"><div class="popup-fiche-precision"><i class="fa-regular fa-clock"></i> Dernière maintenance le ${echapperHtml(maintenance)}</div></div>` : ""}
    </div>`;
}

/* Monuments protégés (base Mérimée, ministère de la Culture) : source
   de données inhabituellement riche par rapport aux autres couches OSM/
   flux publics du site (~90 champs par édifice), mais très inégalement
   renseignée d'un édifice à l'autre - vérifié sur les 41 édifices réels
   du territoire avant de choisir quels champs afficher : description_de
   _l_edifice (2/41 renseignés) et historique (12/41) restent minoritaires
   mais assez informatifs quand présents pour valoir une section dédiée ;
   à l'inverse, matériaux/état de conservation/éléments remarquables
   (0/41 partout) ne sont pas montrés, une section vide n'apportant rien.
   "copyright" est un pavé légal systématique (pas une info sur
   l'édifice) volontairement jamais affiché. */

/* "classé MH" est une protection plus forte et plus rare qu'"inscrit MH"
   (droit du patrimoine français) : distingués par la couleur du badge
   plutôt qu'une même couleur "info" indifférenciée. */
function couleurProtectionMH(typologie) {
    return typologie && /class/i.test(typologie) ? "#AD4826" : "#7F7E7B";
}

/* "2020/07/03 : inscrit MH" (parfois avec espace insécable avant ":")
   -> "03/07/2020 — Inscrit MH". Repli sur le texte brut si le format ne
   correspond pas à ce schéma (pas garanti à 100% sur toute la base
   nationale, mais vérifié sur les 41 édifices réels du territoire). */
function formaterDateProtectionMH(texte) {
    if (!texte) return null;
    const m = String(texte).match(/^(\d{4})\/(\d{2})\/(\d{2})\s*:\s*(.+)$/);
    if (!m) return capitaliserPremiere(texte);
    const [, annee, mois, jour, reste] = m;
    return `${jour}/${mois}/${annee} — ${capitaliserPremiere(reste.trim())}`;
}

/* "19e siècle;19e siècle" (doublon constaté sur plusieurs édifices réels
   du territoire, campagne principale = campagne secondaire dans la
   source) -> "19e siècle" : dédoublonné avant affichage plutôt que
   répété tel quel, sans quoi ça ressemble à une coquille du site. */
function listeSiecles(texte) {
    if (!texte) return null;
    const valeurs = [...new Set(String(texte).split(";").map(v => v.trim()).filter(Boolean))];
    return valeurs.join(", ") || null;
}

/* Contrairement à lien_vers_la_base_archiv_mh (toujours une seule URL),
   lien_vers_la_base_palissy porte souvent PLUSIEURS URLs jointes par
   ";" (un lien par objet mobilier protégé rattaché à l'édifice - jusqu'à
   21 sur un seul édifice du territoire) : les concaténer en un seul
   <a href> casserait le lien. Affiche au plus 3 liens cliquables, le
   reste en simple texte plutôt que de faire exploser la hauteur de la
   fiche pour un édifice à la liste inhabituellement longue. */
function liensPalissy(champ) {
    if (!champ) return [];
    const urls = [...new Set(String(champ).split(";").map(u => u.trim()).filter(Boolean))];
    const max = 3;
    const visibles = urls.slice(0, max);
    const liens = visibles.map((url, i) =>
        `<a class="popup-fiche-contact" href="${echapperHtml(url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-palette"></i>${urls.length > 1 ? `Objet protégé n°${i + 1}` : "Objets & décors"} (base Palissy)</a>`
    );
    const reste = urls.length - visibles.length;
    if (reste > 0) {
        liens.push(`<div class="popup-fiche-precision">+ ${reste} autre${reste > 1 ? "s" : ""} objet${reste > 1 ? "s" : ""} protégé${reste > 1 ? "s" : ""} référencé${reste > 1 ? "s" : ""} sur la base Palissy</div>`);
    }
    return liens;
}

function construirePopupMonument(props) {
    const nom = premierChampValide(props, ["titre_editorial_de_la_notice", "denomination_de_l_edifice", "autre_appellation_de_l_edifice"]) || "Monument protégé";
    const typeEdifice = props.denomination_de_l_edifice ? capitaliserPremiere(props.denomination_de_l_edifice) : null;
    const protectionTexte = premierChampValide(props, ["typologie_de_la_protection", "nature_de_la_protection"]);
    const protection = protectionTexte ? capitaliserPremiere(protectionTexte) : null;
    const couleurBadge = couleurProtectionMH(protectionTexte);
    const lieu = [props.lieudit, props.adresse_forme_index].filter(Boolean).join(", ");

    const infos = [
        props.domaine ? capitaliserPremiere(props.domaine) : null,
        listeSiecles(props.format_abrege_du_siecle_de_construction || props.siecle_de_la_campagne_principale_de_construction),
        props.statut_juridique_de_l_edifice ? capitaliserPremiere(props.statut_juridique_de_l_edifice) : null
    ].filter(Boolean);

    const description = tronquerTexte(props.description_de_l_edifice, 380);
    const historique = tronquerTexte(props.historique, 380);
    const dateProtection = formaterDateProtectionMH(props.date_et_typologie_de_la_protection);
    const precisionProtection = tronquerTexte(props.precision_de_la_protection, 260);

    const liens = [];
    if (props.lien_vers_la_base_archiv_mh) {
        liens.push(`<a class="popup-fiche-contact" href="${echapperHtml(props.lien_vers_la_base_archiv_mh)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open"></i>Notice complète (base Mérimée)</a>`);
    }
    liens.push(...liensPalissy(props.lien_vers_la_base_palissy));

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:#7F7E7B"><i class="fa-solid fa-monument"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:#7F7E7B">${echapperHtml(typeEdifice || "Monument historique")}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${(lieu || props.commune_forme_index) ? `<div class="popup-fiche-adresse">${echapperHtml([lieu, props.commune_forme_index].filter(Boolean).join(" · "))}</div>` : ""}
            </div>
            ${protection ? `<span class="popup-fiche-badge info" style="color:${couleurBadge};background:${couleurBadge}1A">${echapperHtml(protection)}</span>` : ""}
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${description ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Description</div><div class="popup-fiche-precision">${echapperHtml(description)}</div></div>` : ""}
        ${historique ? `<div class="popup-fiche-section"><div class="popup-fiche-section-titre">Historique</div><div class="popup-fiche-precision">${echapperHtml(historique)}</div></div>` : ""}
        ${dateProtection || precisionProtection ? `<div class="popup-fiche-section">
            <div class="popup-fiche-section-titre">Protection</div>
            ${dateProtection ? `<div class="popup-fiche-ligne">${echapperHtml(dateProtection)}</div>` : ""}
            ${precisionProtection ? `<div class="popup-fiche-precision">${echapperHtml(precisionProtection)}</div>` : ""}
        </div>` : ""}
        ${liens.length ? `<div class="popup-fiche-section"><div class="popup-fiche-contacts">${liens.join("")}</div></div>` : ""}
        ${(props.cadastre || props.reference) ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${[
            props.cadastre ? `Référence cadastrale : ${echapperHtml(props.cadastre)}` : null,
            props.reference ? `Référence Mérimée : ${echapperHtml(props.reference)}` : null
        ].filter(Boolean).join(" · ")}</div></div>` : ""}
    </div>`;
}

/* Randonnées. */
/* nwn/rwn/lwn/iwn : préfixe "w" (walking) contrairement à ncn/rcn/lcn/icn
   (préfixe "c", cycling) - schéma réseau OSM différent d'un mode à
   l'autre, malgré la même échelle national/régional/local/international. */
const LABELS_RESEAU_RANDONNEE = {
    iwn: "Itinéraire international", nwn: "Itinéraire national",
    rwn: "Itinéraire régional", lwn: "Itinéraire local"
};
function construirePopupRandonnee(props) {
    const duree = formaterDureeHeures(props.dureeEstim);
    const infos = [
        typeof props.distance === "number" ? `${props.distance} km` : null,
        duree ? `${duree} environ` : null,
        typeof props.denivelePo === "number" ? `+${Math.round(props.denivelePo)} m` : null,
        typeof props.deniveleNe === "number" ? `-${Math.round(Math.abs(props.deniveleNe))} m` : null
    ].filter(Boolean);
    const nom = props.name || (props.id ? "Circuit " + props.id : "Circuit de randonnée");
    const reseau = LABELS_RESEAU_RANDONNEE[props.network] || null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.feuille}"><i class="fa-solid fa-person-hiking"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.feuille}">${echapperHtml(reseau || "Randonnée")}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.join(" · ")}</div></div>` : ""}
    </div>`;
}

/* Points remarquables de la forêt de Bercé (voir config.js pour
   categoriePointRemarquableBerce/le flux Overpass + fichier manuel). */
function construirePopupPointRemarquableBerce(props) {
    const cat = categoriePointRemarquableBerce(props);
    const nom = premierChampValide(props, ["name"]) || cat.label;
    const infos = [
        /* Nom binomial (genre + espèce) : seule la première lettre se
           met en majuscule (convention botanique), pas chaque mot comme
           capitaliserMots le ferait ("Quercus Petraea" serait incorrect). */
        props.species ? capitaliserPremiere(props.species) : null,
        props.circumference ? `Circonférence ${props.circumference} m` : null,
        props.height ? `Hauteur ${props.height} m` : null
    ].filter(Boolean);
    const description = (props.description || "").trim();

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${cat.color}"><i class="${cat.icon}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${cat.color}">${echapperHtml(cat.label)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${infos.length ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${infos.map(echapperHtml).join(" · ")}</div></div>` : ""}
        ${description ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(description)}</div></div>` : ""}
    </div>`;
}

/* Arrêts de bus ALÉOP. */
function construirePopupArretBus(props) {
    const nom = premierChampValide(props, ["name"]) || "Arrêt de bus";
    const accessibilite = LABELS_ACCESSIBILITE_BUS[props.wheelchair_boarding] || null;

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.riviere}"><i class="fa-solid fa-bus"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.riviere}">Arrêt de bus (ALÉOP)</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${accessibilite ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">${echapperHtml(accessibilite)}</div></div>` : ""}
    </div>`;
}

/* Lignes ALÉOP : couleur reprise de la ligne réelle (route_color, un
   "rgb(r,g,b)" côté GTFS) plutôt qu'une couleur fixe, pour que la
   popup corresponde visuellement à la ligne tracée sur la carte. */
function construirePopupLigneBus(props) {
    const couleur = couleurDepuisRgb(props.route_color) || PALETTE.riviere;
    const nom = props.route_short_name ? `Ligne ${props.route_short_name}` : "Ligne ALÉOP";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-route"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Ligne ALÉOP</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.route_long_name ? `<div class="popup-fiche-adresse">${echapperHtml(props.route_long_name)}</div>` : ""}
            </div>
        </div>
    </div>`;
}

/* Prix immobilier par commune : "commune" ne porte que le code INSEE
   dans ce fichier, pas le nom — retrouvé via COMMUNES_TERRITOIRE
   (config.js) plutôt que d'afficher un code à 5 chiffres. Couleur
   reprise de couleurPrix (layers.js), la même échelle que la
   choroplethe de cette couche sur la carte. */
function construirePopupPrixCommune(props) {
    const nom = COMMUNES_TERRITOIRE[props.commune] || props.commune;
    const couleur = couleurPrix(props.prix_m2_median);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-house-chimney"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Prix immobilier</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
                ${props.periode ? `<div class="popup-fiche-adresse">${echapperHtml(props.periode)}</div>` : ""}
            </div>
        </div>
        <div class="popup-fiche-section">
            <div class="popup-fiche-ligne">Prix médian : ${props.prix_median ? Math.round(props.prix_median).toLocaleString("fr-FR") + " €" : "—"}</div>
            <div class="popup-fiche-ligne">Prix/m² médian : ${props.prix_m2_median ? Math.round(props.prix_m2_median).toLocaleString("fr-FR") + " €/m²" : "—"}</div>
            ${props.prix_m2_maison_median ? `<div class="popup-fiche-ligne">Prix/m² (maisons) : ${Math.round(props.prix_m2_maison_median).toLocaleString("fr-FR")} €/m²</div>` : ""}
            ${props.nb_ventes ? `<div class="popup-fiche-ligne">${props.nb_ventes} ventes sur la période</div>` : ""}
        </div>
    </div>`;
}

/* "Mon territoire en chiffres" (démographie INSEE) : extrait Insee -
   Statistiques locales fourni par l'utilisatrice pour les 24 communes
   (voir couches/urbanisme/demographie_communes.geojson). Chaque ligne
   reste strictement conditionnelle à la présence du champ correspondant
   plutôt que de supposer que l'extrait couvre systématiquement tous les
   indicateurs (les tranches d'âge ou la vacance des logements, par
   exemple, ne sont pas dans tous les extraits Insee). */
function construirePopupDemographie(props) {
    const nom = premierChampValide(props, ["commune_nom", "commune"]) || "Commune";
    /* Couleur fixe (terracotta, déjà la couleur déclarée pour cette
       couche dans config.js) plutôt que couleurPopulation(), dont les
       teintes les plus claires (petites communes) sont illisibles en
       texte/icône sur fond blanc - couleurPopulation() reste pertinente
       pour l'aplat de la choroplèthe sur la carte (une grande zone
       remplie n'a pas ce problème de contraste), mais pas ici. */
    const couleur = PALETTE.terracotta;
    /* evolution_annuelle_2017_2023 : taux ANNUEL moyen (Insee), pas une
       variation cumulée sur 10 ans - étiqueté avec sa vraie période
       plutôt que de laisser deviner ou d'afficher "sur 10 ans" comme une
       ancienne version le faisait (avant d'avoir de vraies données). */
    const evolution = typeof props.evolution_annuelle_2017_2023 === "number" ? props.evolution_annuelle_2017_2023 : null;

    const lignes = [
        typeof props.population === "number"
            ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-people-group"></i> ${props.population.toLocaleString("fr-FR")} habitants${evolution !== null ? ` <span class="popup-fiche-precision">(${evolution > 0 ? "+" : ""}${evolution}%/an en moyenne 2017-2023)</span>` : ""}</div>`
            : null,
        (typeof props.part_moins_25 === "number" || typeof props.part_25_64 === "number" || typeof props.part_65_plus === "number")
            ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-child-reaching"></i> ${[
                typeof props.part_moins_25 === "number" ? `${props.part_moins_25}% de moins de 25 ans` : null,
                typeof props.part_25_64 === "number" ? `${props.part_25_64}% de 25 à 64 ans` : null,
                typeof props.part_65_plus === "number" ? `${props.part_65_plus}% de 65 ans et +` : null
            ].filter(Boolean).join(" · ")}</div>`
            : null,
        typeof props.nb_logements === "number"
            ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-house"></i> ${props.nb_logements.toLocaleString("fr-FR")} logements${typeof props.part_logements_vacants === "number" ? ` <span class="popup-fiche-precision">(dont ${props.part_logements_vacants}% vacants)</span>` : ""}</div>` : null,
        typeof props.revenu_median === "number"
            ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-sack-dollar"></i> Revenu médian : ${Math.round(props.revenu_median).toLocaleString("fr-FR")} €/an</div>` : null,
        typeof props.nb_entreprises === "number"
            ? `<div class="popup-fiche-ligne"><i class="fa-solid fa-building"></i> ${props.nb_entreprises.toLocaleString("fr-FR")} établissements</div>` : null
    ].filter(Boolean);

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-chart-column"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Mon territoire en chiffres</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        <div class="popup-fiche-section">
            ${lignes.length ? lignes.join("") : `<div class="popup-fiche-vide">Aucun indicateur disponible pour cette commune.</div>`}
        </div>
    </div>`;
}

/* Zonage PLUi : LABELS_PLUI (recherche.js) déjà utilisé par la
   recherche foncière et la fiche parcelle, réutilisé ici pour rester
   cohérent partout où un code de zone PLUi est affiché. */
function construirePopupZonePLUi(props) {
    const label = (typeof LABELS_PLUI !== "undefined" && LABELS_PLUI[props.typezone]) || props.typezone || "Zone";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.ardoise}"><i class="fa-solid fa-map"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.ardoise}">Zonage PLUi</div>
                <div class="popup-fiche-titre">${echapperHtml(label)}</div>
                ${(props.libelong && props.libelong !== label) ? `<div class="popup-fiche-adresse">${echapperHtml(props.libelong)}</div>` : ""}
            </div>
        </div>
        ${props.urlfic ? `<div class="popup-fiche-section"><a class="popup-fiche-contact" href="${echapperHtml(props.urlfic)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i>Voir le règlement</a></div>` : ""}
    </div>`;
}

/* Aléa retrait-gonflement des argiles (RGA) : LABELS_RGA
   (recherche.js), même réutilisation que pour le zonage PLUi. */
function construirePopupRga(props) {
    const label = (typeof LABELS_RGA !== "undefined" && LABELS_RGA[props.niveau]) || String(props.niveau);
    const couleur = { 1: "#F2C94C", 2: "#F2994A", 3: "#D85A30" }[props.niveau] || "#D85A30";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleur}"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleur}">Retrait-gonflement des argiles</div>
                <div class="popup-fiche-titre">Aléa ${echapperHtml(label)}</div>
            </div>
        </div>
        ${props.surf_m2 ? `<div class="popup-fiche-section"><div class="popup-fiche-ligne">Zone concernée : ${(props.surf_m2 / 10000).toFixed(1).replace(".", ",")} ha</div></div>` : ""}
    </div>`;
}

/* =========================================================
   POPUP VIGIEAU (restrictions sécheresse)
   Schéma confirmé en conditions réelles par l'utilisatrice (capture de
   donneesBrutes["vigieau"][0].properties) - remplace le premier essai
   qui passait par la popup générique (titleFields/subtitleFields
   devinés) : celui-ci montrait bien le nom de zone et le niveau, mais
   rien du détail des restrictions (le plus utile de cette couche),
   `arreteRestriction` et `restrictions` étant des objets/tableaux
   imbriqués que la popup générique ne sait pas afficher (voir
   estValeurSimple plus haut).
   Champs réels : nom, code, type ("AEP"/"SUP"/"SOU" - alimentation en
   eau potable / eaux superficielles / eaux souterraines), niveauGravite
   (chaîne, ex. "vigilance" - voir niveauVigieau dans config.js, partagé
   avec la couleur du polygone pour que les deux ne puissent jamais
   diverger), departement ({code, nom}), arreteRestriction ({numero,
   dateDebut, dateFin, dateSignature, fichier} - fichier est un lien PDF
   vers l'arrêté), restrictions (tableau d'usages : nom, thematique,
   description, et un booléen concerneXxx par public concerné -
   particulier/entreprise/collectivite/exploitation/eso/esu/aep).
   ========================================================= */
const LABELS_TYPE_EAU_VIGIEAU = { AEP: "Eau potable", SUP: "Eaux superficielles", SOU: "Eaux souterraines" };

/* Les zones peuvent porter plusieurs dizaines d'usages réglementés (23
   sur la zone testée) : trop pour les afficher toutes en clair sans
   noyer le reste de la popup. Repliées dans un <details> (natif,
   aucun JS supplémentaire nécessaire) et limitées à celles qui
   concernent les particuliers - public de ce site, les restrictions
   qui ne concernent que les exploitations agricoles ou l'irrigation
   professionnelle n'ont pas leur place ici. Le lien vers l'arrêté PDF
   reste le repli pour le détail complet, professionnel inclus. */
/* Regroupe les usages réglementés par thématique (champ réel
   "thematique", ex. "Arrosage", "Lavage"...) plutôt qu'une liste plate :
   retour direct de l'utilisatrice, 23 lignes nom+description empilées
   sans repère visuel étaient illisibles même repliées dans le <details>.
   Ordre de première apparition (pas un tri alphabétique arbitraire) pour
   rester stable et prévisible d'une zone à l'autre. */
function grouperRestrictionsParThematique(restrictions) {
    const groupes = {};
    const ordre = [];
    restrictions.forEach(r => {
        const cle = r.thematique || "Autres usages";
        if (!groupes[cle]) { groupes[cle] = []; ordre.push(cle); }
        groupes[cle].push(r);
    });
    return ordre.map(thematique => ({ thematique, items: groupes[thematique] }));
}

function construirePopupVigieau(props) {
    const niveau = niveauVigieau({ properties: props });
    const typeEau = LABELS_TYPE_EAU_VIGIEAU[props.type] || props.type;
    const departement = props.departement && props.departement.nom;
    const arrete = props.arreteRestriction || {};
    const restrictions = Array.isArray(props.restrictions) ? props.restrictions : [];
    const restrictionsParticulier = restrictions.filter(r => r.concerneParticulier);
    const groupesRestrictions = grouperRestrictionsParThematique(restrictionsParticulier);

    const infosArrete = [
        arrete.numero ? `Arrêté n° ${arrete.numero}` : null,
        arrete.dateDebut ? `en vigueur depuis le ${formaterDateSeule(arrete.dateDebut)}` : null
    ].filter(Boolean).join(", ");
    const lienArrete = arrete.fichier
        ? `<a class="popup-fiche-contact" href="${echapperHtml(arrete.fichier)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-file-pdf"></i>Voir l'arrêté complet</a>`
        : "";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${niveau.color}"><i class="fa-solid fa-droplet-slash"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${niveau.color}">Restrictions sécheresse (Vigieau)</div>
                <div class="popup-fiche-titre">${echapperHtml(props.nom || "Zone")}</div>
                <div class="popup-fiche-adresse">${[typeEau, departement].filter(Boolean).map(echapperHtml).join(" · ")}</div>
            </div>
            <span class="popup-fiche-badge" style="background:${niveau.color}20;color:${niveau.color}">${echapperHtml(niveau.label)}</span>
        </div>
        ${infosArrete || lienArrete ? `<div class="popup-fiche-section">
            ${infosArrete ? `<div class="popup-fiche-ligne">${echapperHtml(infosArrete)}</div>` : ""}
            ${lienArrete ? `<div class="popup-fiche-contacts">${lienArrete}</div>` : ""}
        </div>` : ""}
        ${restrictionsParticulier.length ? `<div class="popup-fiche-section">
            <details class="popup-fiche-repliable">
                <summary><span>${restrictionsParticulier.length} usage(s) réglementé(s) pour les particuliers</span><i class="fa-solid fa-chevron-right"></i></summary>
                <div class="popup-fiche-repliable-liste">
                    ${groupesRestrictions.map(g => `
                        <div class="popup-fiche-restriction-groupe">
                            <div class="popup-fiche-restriction-theme">${echapperHtml(g.thematique)}</div>
                            ${g.items.map(r => `
                                <div class="popup-fiche-restriction-item">
                                    <div class="popup-fiche-jour"><span>${echapperHtml(r.nom)}</span></div>
                                    ${r.description ? `<div class="popup-fiche-precision">${echapperHtml(r.description.trim())}</div>` : ""}
                                </div>
                            `).join("")}
                        </div>
                    `).join("")}
                </div>
            </details>
        </div>` : ""}
    </div>`;
}

/* =========================================================
   POPUP GÉNÉRIQUE — dernier repli pour toute couche sans fiche dédiée
   déclarant titleFields/subtitleFields dans config.js (aucune
   aujourd'hui - Vigieau, seule couche à l'avoir jamais utilisée, a
   maintenant sa propre fiche ci-dessus) : même habillage visuel
   (.popup-fiche) que les fiches sur mesure plutôt qu'un style à part
   (l'ancien .popup-geo) qui détonnait par rapport au reste du site -
   gardée en repli pour une future couche au schéma non garanti.
   ========================================================= */
/* Adresse géocodée par l'API Adresse (recherche unifiée, js/search.js) :
   pas de feature/couche du site à réutiliser, juste un point avec un
   libellé — reste dans l'habillage .popup-fiche pour rester cohérent
   avec le reste du site plutôt que d'avoir un style à part. */
function construirePopupAdresse(titre, lat, lon) {
    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${PALETTE.ardoise}"><i class="fa-solid fa-location-dot"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${PALETTE.ardoise}">Adresse</div>
                <div class="popup-fiche-titre">${echapperHtml(titre)}</div>
            </div>
        </div>
        ${construireItineraire(lat, lon)}
    </div>`;
}

/* Un champ distant non documenté (voir plus haut) peut très bien être un
   objet ou un tableau imbriqué (ex. Vigieau : ArreteRestriction,
   Restrictions) plutôt qu'un simple texte/nombre - affiché tel quel via
   un template string, ça donne "[object Object]" à l'écran plutôt qu'une
   erreur qui alerterait. Filtré en amont pour ne jamais afficher ça :
   mieux vaut omettre un champ que montrer du texte incompréhensible. */
function estValeurSimple(v) {
    return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function construirePopupGenerique(feature, layerConf) {
    const props = feature.properties || {};
    const { icon, color } = resoudreIconeCouleur(feature, layerConf);
    const iconeAffichee = icon || (layerConf.type === "line" ? "fa-solid fa-route" : "fa-solid fa-draw-polygon");
    const couleurAffichee = color || PALETTE.ardoise;

    const titreBrut = premierChampValide(props, layerConf.titleFields || []);
    const titre = estValeurSimple(titreBrut) ? titreBrut : layerConf.label;
    const sousInfos = (layerConf.subtitleFields || [])
        .map(c => props[c])
        .filter(v => v !== undefined && v !== null && v !== "" && v !== "NULL" && estValeurSimple(v));

    const reste = Object.keys(props)
        .filter(k => !CHAMPS_MASQUES.has(k) && !(layerConf.titleFields || []).includes(k) && !(layerConf.subtitleFields || []).includes(k) && props[k] !== null && props[k] !== "" && props[k] !== "NULL" && estValeurSimple(props[k]))
        .slice(0, 6);
    const details = reste.length ? `<div class="popup-fiche-section">
        ${reste.map(k => `<div class="popup-fiche-jour"><span>${echapperHtml(humaniser(k))}</span><strong>${echapperHtml(props[k])}</strong></div>`).join("")}
    </div>` : "";

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${couleurAffichee}"><i class="${iconeAffichee}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${couleurAffichee}">${echapperHtml(layerConf.label)}</div>
                <div class="popup-fiche-titre">${echapperHtml(titre)}</div>
                ${sousInfos.length ? `<div class="popup-fiche-adresse">${sousInfos.map(echapperHtml).join(" · ")}</div>` : ""}
            </div>
        </div>
        ${details}
    </div>`;
}

/* Petit patrimoine rural (voir config.js pour la catégorisation) - mêmes
   aides déjà en place (adresseOsm/contactsOsm, parserHorairesOsm...).
   Parkings/points d'eau potable/antennes-relais n'ont volontairement pas
   de fiche dédiée : voir sansPopup dans config.js (données OSM trop
   pauvres la plupart du temps sur ce territoire pour justifier une
   popup, décidé avec l'utilisatrice - le marqueur seul suffit). */

/* categoriePatrimoineRural : définie dans config.js (réutilisée aussi
   par iconePatrimoineRural pour la couleur/icône du marqueur). */
function construirePopupPatrimoineRural(props) {
    const cat = categoriePatrimoineRural(props);
    const nom = premierChampValide(props, ["name"]) || cat.label;
    const description = (props.description || "").trim();

    return `<div class="popup-fiche">
        <div class="popup-fiche-entete">
            <div class="popup-fiche-icon" style="background:${cat.color}"><i class="${cat.icon}"></i></div>
            <div class="popup-fiche-titre-wrap">
                <div class="popup-fiche-tag" style="color:${cat.color}">${echapperHtml(cat.label)}</div>
                <div class="popup-fiche-titre">${echapperHtml(nom)}</div>
            </div>
        </div>
        ${description ? `<div class="popup-fiche-section"><div class="popup-fiche-precision">${echapperHtml(description)}</div></div>` : ""}
    </div>`;
}

function construirePopup(feature, layerConf) {
    const props = feature.properties || {};
    let html;
    if (layerConf.id === "carburants") html = construirePopupCarburant(props);
    else if (layerConf.id === "commerces") html = construirePopupCommerce(props);
    else if (layerConf.id === "banques") html = construirePopupBanque(props);
    else if (layerConf.id === "mairies") html = construirePopupMairie(props);
    else if (layerConf.id === "bal") html = construirePopupBal(props);
    else if (layerConf.id === "cadastre") html = construirePopupCadastreBase(props);
    else if (layerConf.id === "dpe") html = construirePopupDpe(props);
    else if (layerConf.id === "mutations") html = construirePopupMutation(props, feature);
    else if (layerConf.id === "dechets") html = construirePopupDechet(props);
    else if (layerConf.id === "lockers") html = construirePopupLocker(props);
    else if (layerConf.id === "bibliotheques") html = construirePopupBibliotheque(props);
    else if (layerConf.id === "officesTourisme") html = construirePopupOfficeTourisme(props);
    else if (layerConf.id === "campingcar") html = construirePopupCampingCar(props);
    else if (layerConf.id === "pompiers") html = construirePopupPompiers(props);
    else if (layerConf.id === "gendarmerie") html = construirePopupGendarmerie(props);
    else if (layerConf.id === "franceServices") html = construirePopupFranceServices(props);
    else if (layerConf.id === "ehpad") html = construirePopupEhpad(props);
    else if (layerConf.id === "toilettes") html = construirePopupToilettes(props);
    else if (layerConf.id === "velo") html = construirePopupVelo(props);
    else if (layerConf.id === "catnat") html = construirePopupCatnat(props);
    else if (layerConf.id === "pointsRemarquablesBerce") html = construirePopupPointRemarquableBerce(props);
    else if (layerConf.id === "patrimoineRural") html = construirePopupPatrimoineRural(props);
    else if (layerConf.id === "irve") html = construirePopupIrve(props);
    else if (layerConf.id === "airecovoiturage") html = construirePopupCovoiturage(props);
    else if (layerConf.id === "marches") html = construirePopupMarche(props);
    else if (layerConf.id === "airesJeu") html = construirePopupAireJeu(props);
    else if (layerConf.id === "equipementSportif") html = construirePopupEquipementSportif(props);
    else if (layerConf.id === "petiteEnfance") html = construirePopupPetiteEnfance(props);
    else if (layerConf.id === "education") html = construirePopupEcole(props);
    else if (layerConf.id === "dae") html = construirePopupDae(props);
    else if (layerConf.id === "immeublesProteges") html = construirePopupMonument(props);
    else if (layerConf.id === "randonnees") html = construirePopupRandonnee(props);
    else if (layerConf.id === "arretsALEOP") html = construirePopupArretBus(props);
    else if (layerConf.id === "reseauALEOP") html = construirePopupLigneBus(props);
    else if (layerConf.id === "prixImmobilier") html = construirePopupPrixCommune(props);
    else if (layerConf.id === "demographie") html = construirePopupDemographie(props);
    else if (layerConf.id === "qualiteEau") html = construirePopupQualiteEau(props);
    else if (layerConf.id === "coursEau") html = construirePopupCoursEau(props);
    else if (layerConf.id === "zonagePLUi") html = construirePopupZonePLUi(props);
    else if (layerConf.id === "rga") html = construirePopupRga(props);
    else if (layerConf.id === "vigieau") html = construirePopupVigieau(props);
    else html = construirePopupGenerique(feature, layerConf);
    return injecterItineraire(html, feature);
}
