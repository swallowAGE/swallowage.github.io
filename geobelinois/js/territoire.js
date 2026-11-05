/* =========================================================
   GéoBelinois — FICHIER DE TERRITOIRE (généré par outils/build_territoire.py)
   Voir js/territoire.js (GéoBercé) pour le détail de chaque champ.
   ========================================================= */
const TERRITOIRE = {
    id: "geobelinois",
    nom: "GéoBelinois",
    nomComplet: "Orée de Bercé-Bélinois",
    comcom: "Communauté de communes Orée de Bercé – Bélinois",
    urlProd: "https://swallowage.github.io/geobelinois/",
    centre: [47.8492, 0.2544],
    zoom: 12,
    rayonCarburantsM: 25000,
    siren: "247200447",

    /* À renseigner : actualités (voir js/territoire.js : Illiwap, lien ou null)
       et sous-domaine GoatCounter. null = pas de bouton / pas de suivi. */
    actualites: {
        type: "intramuros",
        communes: {
            "72124": "https://www.intramuros.org/ecommoy",
            "72155": "https://www.intramuros.org/laigne-saint-gervais",
            "72187": "https://www.intramuros.org/marigne-laille",
            "72200": "https://www.intramuros.org/monce-en-belin",
            "72268": "https://www.intramuros.org/saint-biez-en-belin",
            "72306": "https://www.intramuros.org/saint-ouen-en-belin",
            "72350": "https://www.intramuros.org/teloche"
        }
    },
    goatcounter: null,

    couchesExclues: [],

    /* Fichiers de couches/ réellement disponibles pour ce territoire
       (couches/communes.geojson et epci.geojson sont toujours présents).
       Une couche de js/config.js dont un fichier local n'est pas dans cette
       liste n'est pas affichée. À compléter au fil des scripts de données. */
    fichiersDisponibles: [
        "couches/associations/associations.geojson",
        "couches/commerces/artisans.geojson",
        "couches/commerces/banques.geojson",
        "couches/commerces/commerces.geojson",
        "couches/famille/education.geojson",
        "couches/mobilite/airecovoiturage.geojson",
        "couches/mobilite/arretsALEOP.geojson",
        "couches/mobilite/reseauALEOP.geojson",
        "couches/patrimoine/immeublesProteges.geojson",
        "couches/patrimoine/patrimoineRural.geojson",
        "couches/securite/dae.geojson",
        "couches/securite/ehpad.geojson",
        "couches/securite/gendarmerie.geojson",
        "couches/securite/pompiers.geojson",
        "couches/services/airesJeu.geojson",
        "couches/services/antennes.geojson",
        "couches/services/bal.geojson",
        "couches/services/bibliotheques.geojson",
        "couches/services/dechets.geojson",
        "couches/services/equipementSportif.geojson",
        "couches/services/fontaines.geojson",
        "couches/services/franceServices.geojson",
        "couches/services/irve.geojson",
        "couches/services/lockers_manuels.geojson",
        "couches/services/lockers_osm.geojson",
        "couches/services/mairies.geojson",
        "couches/services/parkings.geojson",
        "couches/services/toilettes.geojson",
        "couches/tourisme/campingcar.geojson",
        "couches/tourisme/cours_eau.geojson",
        "couches/tourisme/officesTourisme.geojson",
        "couches/tourisme/randonnees.geojson",
        "couches/urbanisme/dpe_loir_luce_berce.geojson",
        "couches/urbanisme/parcelles_dvf_2021_2025_loir_luce_berce.geojson",
        "couches/urbanisme/prix_immobilier_communes.geojson",
        "couches/urbanisme/rga_2025_loir_luce_berce.geojson",
        "couches/urbanisme/zonage_plui_loir_luce_berce_filtre.geojson"
    ],

    communes: {
        "72124": "Écommoy",
        "72155": "Laigné-Saint-Gervais",
        "72187": "Marigné-Laillé",
        "72200": "Moncé-en-Belin",
        "72268": "Saint-Biez-en-Belin",
        "72306": "Saint-Ouen-en-Belin",
        "72350": "Teloché"
    }
};
