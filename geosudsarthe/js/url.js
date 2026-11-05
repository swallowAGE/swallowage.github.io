/* =========================================================
   GÉOBERCÉ — OUVERTURE PAR L'ADRESSE (?couche=...)
   Permet de partager un lien qui ouvre GéoBercé avec une ou plusieurs
   couches déjà affichées, sans passer par l'écran d'accueil :
     https://swallowage.github.io/geoberce/?couche=carburant
     https://swallowage.github.io/geoberce/?couche=carburant,bal
   Le nom est reconnu souplement : identifiant exact de la couche
   (carburants), singulier/pluriel, sans accents ni majuscules, quelques
   mots courants (essence, courrier, colis...), ou un morceau de son
   libellé. Un nom inconnu est simplement ignoré.
   ========================================================= */
(function () {
    const ALIAS = {
        carburant: "carburants", essence: "carburants", gazole: "carburants", station: "carburants",
        courrier: "bal", boite: "bal", boites: "bal", poste: "bal",
        colis: "lockers", relais: "lockers", casier: "lockers",
        assmat: "petiteEnfance", assistante: "petiteEnfance", creche: "petiteEnfance",
        artisan: "artisans", commerce: "commerces", ecole: "education",
        argile: "rga", argiles: "rga", chasse: "lotsChasse", defibrillateur: "dae"
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

    ouvrirCouchesDepuisUrl();
})();
