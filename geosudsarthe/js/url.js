/* =========================================================
   GÉOBERCÉ — OUVERTURE PAR L'ADRESSE (?couche=...)
   Permet de partager un lien qui ouvre GéoBercé avec une ou plusieurs
   couches déjà affichées, sans passer par l'écran d'accueil :
     https://hirundage.fr/geoberce/?couche=carburant
     https://hirundage.fr/geoberce/?couche=carburant,bal
   Le nom est reconnu souplement : identifiant exact de la couche
   (carburants), singulier/pluriel, sans accents ni majuscules, quelques
   mots courants (essence, courrier, colis...), ou un morceau de son
   libellé. Un nom inconnu est simplement ignoré.
   Avec « commune » (code INSEE ou nom, sans accents ni majuscules), la carte
   s'ouvre aussi zoomée sur cette commune, au niveau de zoom nécessaire aux
   couches ouvertes :
     https://hirundage.fr/geoberce/?couche=observationsNature&commune=le-grand-luce
   ========================================================= */
(function () {
    const ALIAS = {
        carburant: "carburants", essence: "carburants", gazole: "carburants", station: "carburants",
        courrier: "bal", boite: "bal", boites: "bal", poste: "bal",
        colis: "lockers", relais: "lockers", casier: "lockers",
        assmat: "petiteEnfance", assistante: "petiteEnfance", creche: "petiteEnfance",
        artisan: "artisans", commerce: "commerces", ecole: "education",
        argile: "rga", argiles: "rga", ombre: "ombres", soleil: "ombres", solaire: "cadastreSolaire", cadastresolaire: "cadastreSolaire", ensoleillement: "ombres", chasse: "lotsChasse", defibrillateur: "dae"
    };

    function normaliser(texte) {
        return String(texte || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
    }

    function trouverCouche(nom) {
        const n = normaliser(nom);
        if (!n) return null;
        const cible = normaliser(ALIAS[n] || nom);
        const exact = LAYERS.find(l => normaliser(l.id) === cible || normaliser(l.id) === cible + "s" || normaliser(l.id) + "s" === cible);
        if (exact) return exact;
        return LAYERS.find(l => normaliser(l.label).includes(n)) || null;
    }

    function ouvrirCouchesDepuisUrl() {
        let parametres;
        try { parametres = new URLSearchParams(window.location.search); } catch (_) { return; }
        const brut = parametres.getAll("couche").concat(parametres.getAll("couches")).join(",");
        if (!brut) return;

        let trouvees = 0;
        brut.split(",").forEach(nom => {
            const conf = trouverCouche(nom.trim());
            if (!conf) { console.warn("GéoBercé : couche inconnue dans l'adresse :", nom); return; }
            const checkbox = document.getElementById("layer-" + conf.id);
            if (!checkbox) return;
            if (!checkbox.checked) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event("change"));
            }
            trouvees++;
        });

        if (trouvees) fermerAccueil();
    }

    /* ?commune=72143 ou ?commune=Le Grand-Lucé : zoom sur la commune. Les contours des communes se chargent
       en différé : on réessaie quelques secondes. Le zoom est relevé au seuil des couches ouvertes (zoomMin),
       sinon une couche comme les observations nature resterait masquée. */
    function zoomerCommuneDepuisUrl() {
        let valeur;
        try { valeur = new URLSearchParams(window.location.search).get("commune"); } catch (_) { return; }
        if (!valeur) return;
        const n = normaliser(valeur);
        const code = Object.keys(COMMUNES_TERRITOIRE).find(c => c === valeur.trim() || normaliser(COMMUNES_TERRITOIRE[c]) === n);
        if (!code) { console.warn("GéoBercé : commune inconnue dans l'adresse :", valeur); return; }
        fermerAccueil();
        let essais = 0;
        const attente = setInterval(() => {
            essais++;
            if (typeof couchesCommunesParInsee === "undefined" || !couchesCommunesParInsee[code]) {
                if (essais > 60) clearInterval(attente);
                return;
            }
            clearInterval(attente);
            zoomerSurCommune(map, code);
            const seuil = Math.max(0, ...LAYERS.filter(l => l.zoomMin && document.getElementById("layer-" + l.id)?.checked).map(l => l.zoomMin));
            if (map.getZoom() < seuil) map.setView(couchesCommunesParInsee[code].getBounds().getCenter(), seuil);
        }, 250);
    }

    ouvrirCouchesDepuisUrl();
    zoomerCommuneDepuisUrl();
})();
