/* =========================================================
   GÉOBERCÉ — PANNEAU DE COUCHES
   Généré depuis GROUPS / LAYERS (config.js) : pas besoin
   d'éditer le HTML pour ajouter une couche.
   ========================================================= */

function construirePanneauCouches(map) {
    const conteneur = document.getElementById("layers-tree");
    conteneur.innerHTML = "";

    Object.keys(GROUPS).forEach(groupId => {
        const groupe = GROUPS[groupId];
        const couchesDuGroupe = LAYERS.filter(l => l.group === groupId);
        if (!couchesDuGroupe.length) return;

        const details = document.createElement("details");
        details.className = "layer-group";
        details.open = ["services", "famille"].includes(groupId);

        const summary = document.createElement("summary");
        summary.innerHTML = `
            <span class="layer-group-icon" style="color:${groupe.color}">
                <i class="${groupe.icon}"></i>
            </span>
            <span>${groupe.label}</span>
        `;
        details.appendChild(summary);

        couchesDuGroupe.forEach(conf => {
            const ligne = document.createElement("label");
            ligne.className = "layer-item";
            ligne.dataset.label = conf.label.toLowerCase();

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = "layer-" + conf.id;

            /* Badge d'état (chargement / échec) à côté du libellé : sans
               ça, cocher une couche "en flux" (Vigieau, SUP,
               Overpass...) ne donne aucun signe de vie pendant les
               quelques secondes d'attente - retour direct de
               l'utilisatrice ("on sait pas trop si ça fonctionne ou
               pas"). Recherché dans le DOM à chaque fois plutôt que suivi
               par une seule variable fermée sur le scope : un badge créé
               puis jamais retiré (ex. l'ancien spinner encore présent
               quand l'échec crée son propre badge d'erreur à côté) restait
               orphelin indéfiniment avec la première version de ce code. */
            function retirerBadgeEtat() {
                const existant = texte.querySelector(".layer-etat-badge");
                if (existant) existant.remove();
            }

            checkbox.addEventListener("change", function () {
                retirerBadgeEtat();
                if (checkbox.checked) {
                    if (!coucheChargee[conf.id]) {
                        const badge = document.createElement("span");
                        badge.className = "layer-etat-badge";
                        badge.title = "Chargement en cours...";
                        badge.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
                        texte.appendChild(badge);
                    }
                    chargerCouche(conf, () => {
                        retirerBadgeEtat();
                        if (conf.viewportOnly) {
                            actualiserCoucheViewport(conf, map);
                        } else if (coucheDoitEtreVisible(conf, map)) {
                            groupesLeaflet[conf.id].addTo(map);
                        }
                    }, () => {
                        /* Décochée plutôt que laissée "cochée mais vide" :
                           une case à cocher qui reste active sans rien
                           afficher sur la carte est trompeuse - un
                           nouveau clic relance chargerCouche depuis zéro
                           (coucheChargee[conf.id] reste falsy après un
                           échec, pas de logique de retry à part). */
                        retirerBadgeEtat();
                        checkbox.checked = false;
                        const badge = document.createElement("span");
                        badge.className = "layer-etat-badge layer-etat-badge-erreur";
                        badge.title = "Échec du chargement - recochez pour réessayer";
                        badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i>`;
                        texte.appendChild(badge);
                    });
                } else if (groupesLeaflet[conf.id]) {
                    map.removeLayer(groupesLeaflet[conf.id]);
                }
            });

            const texte = document.createElement("span");
            texte.textContent = conf.label;
            if (conf.lazy) {
                const badge = document.createElement("span");
                badge.className = "layer-lazy-badge";
                /* Deux raisons possibles d'être "lazy", pas la même infobulle :
                   un fichier local volumineux (cadastre, DPE...) vs une couche
                   en flux qui interroge une source distante en direct
                   (Overpass, Géorisques...) à chaque activation - signalé en
                   conditions réelles que ces dernières peuvent mettre du
                   temps, préciser pourquoi plutôt que de laisser deviner. */
                badge.title = conf.fetchPersonnalise
                    ? "Chargée à la demande : interroge des données en direct, peut prendre quelques secondes"
                    : "Chargée à la demande (fichier volumineux)";
                badge.textContent = "●";
                texte.appendChild(badge);
            }
            if (conf.zoomMin) {
                const badge = document.createElement("span");
                badge.className = "layer-zoom-badge";
                badge.title = "Visible seulement en zoomant sur le territoire";
                badge.innerHTML = `<i class="fa-solid fa-magnifying-glass-plus"></i>`;
                texte.appendChild(badge);
            }

            ligne.appendChild(checkbox);
            ligne.appendChild(texte);
            details.appendChild(ligne);

            if (conf.legend) {
                details.appendChild(construireLegende(conf, map));
            }
        });

        conteneur.appendChild(details);
    });
}

/* Petite légende repliable (icône + couleur par catégorie), affichée
   sous une couche dont la config déclare un tableau "legend". Chaque
   catégorie a sa propre case à cocher : avec beaucoup de données (ex :
   commerces), ça permet de n'afficher que certaines catégories plutôt
   que de tout charger d'un bloc. Repose sur layerConf.categoriser côté
   layers.js, qui construit une sous-couche Leaflet par catégorie. */
function construireLegende(conf, map) {
    const categories = (conf.legend || []).concat(conf.legendDefaut ? [conf.legendDefaut] : []);

    const details = document.createElement("details");
    details.className = "layer-legend";

    const summary = document.createElement("summary");
    summary.textContent = "Voir les catégories";
    details.appendChild(summary);

    const liste = document.createElement("div");
    liste.className = "layer-legend-items";

    categories.forEach(cat => {
        const item = document.createElement("label");
        item.className = "layer-legend-item";
        item.innerHTML = `
            <input type="checkbox" checked>
            <span class="layer-legend-pastille" style="background:${cat.color}"><i class="${cat.icon}"></i></span>
            <span>${cat.label}</span>
        `;

        item.querySelector("input").addEventListener("change", function () {
            const couche = (souscouchesLeaflet[conf.id] || {})[cat.id];
            if (!couche) return;
            if (this.checked) {
                map.addLayer(couche);
            } else {
                map.removeLayer(couche);
            }
        });

        liste.appendChild(item);
    });
    details.appendChild(liste);

    return details;
}

/* =========================================================
   VUES DU PANNEAU DE COUCHES
   Le panneau a plusieurs vues mutuellement exclusives (arbre des
   couches normal, résultats "près de chez moi", recherche foncière) :
   ces deux fonctions centralisent le passage de l'une à l'autre pour
   que proximite.js et recherche.js restent cohérents entre eux.
   Le dashboard commune n'en fait plus partie (voir #commune-page dans
   index.html) : passé en page plein écran indépendante, gérée par
   ouvrirDashboardCommune/fermerVueCommune (js/communes.js). */
const VUES_PANNEAU = ["layers-normal-view", "results-view", "recherche-view"];

/* basculerVuePanneau (anciennement ouvrirVuePanneau) : change SEULEMENT
   la vue interne affichée (couches normales / résultats "près de chez
   moi" / recherche foncière) - n'ouvre plus jamais le panneau tout
   seul. Retour direct de l'utilisatrice : "Accueil" rouvrait le
   panneau des couches sur mobile alors qu'il était fermé - la
   précédente version forçait systématiquement `layers-panel-open` à
   chaque appel, y compris depuis fermerVuesPanneau (appelée par
   "Accueil" via fermerResultatsProximite pour "revenir à la vue
   normale en arrière-plan", jamais pour réellement ouvrir quoi que ce
   soit). Les appelants qui veulent réellement OUVRIR le panneau
   (recherche foncière, résultats "près de chez moi") appellent
   togglerPanneauCouches(true) juste après, explicitement -
   togglerPanneauCouches (js/map.js) gère déjà lui-même l'invalidateSize()
   nécessaire au changement de largeur, pas besoin de le refaire ici. */
function basculerVuePanneau(idVue) {
    VUES_PANNEAU.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.hidden = (id !== idVue);
    });
}

function fermerVuesPanneau() {
    basculerVuePanneau("layers-normal-view");
}

/* Filtre texte du panneau */
function initFiltrePanneau() {
    const input = document.getElementById("layers-filter");
    input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll(".layer-item").forEach(item => {
            item.style.display = item.dataset.label.includes(q) ? "" : "none";
        });
    });
}
