/* =========================================================
   GéoSudSarthe — FICHIER DE TERRITOIRE (généré par outils/build_territoire.py)
   Voir js/territoire.js (GéoBercé) pour le détail de chaque champ.
   ========================================================= */
const TERRITOIRE = {
    id: "geosudsarthe",
    nom: "GéoSudSarthe",
    nomComplet: "Sud Sarthe",
    comcom: "Communauté de communes Sud Sarthe",
    urlProd: "https://hirundage.fr/geosudsarthe/",
    centre: [47.707432, 0.210716],
    zoom: 11,
    rayonCarburantsM: 25000,
    siren: "200073112",

    /* À renseigner : actualités (voir js/territoire.js : Illiwap, lien ou null)
       et sous-domaine GoatCounter. null = pas de bouton / pas de suivi. */
    actualites: {
        type: "intramuros",
        communes: {
            "72013": "https://www.intramuros.org/aubigne-racan",
            "72182": "https://www.intramuros.org/mansigne"
        },
        widgets: {
            "72013": { cityId: "2473", aggloId: "3" },
            "72182": { cityId: "46", aggloId: "3" }
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
        "couches/chasse/parcelles_forestieres.geojson",
        "couches/commerces/artisans.geojson",
        "couches/commerces/banques.geojson",
        "couches/commerces/commerces.geojson",
        "couches/famille/education.geojson",
        "couches/famille/petiteEnfance.geojson",
        "couches/famille/structures_pe_osm.geojson",
        "couches/mobilite/airecovoiturage.geojson",
        "couches/mobilite/arretsALEOP.geojson",
        "couches/mobilite/reseauALEOP.geojson",
        "couches/patrimoine/immeublesProteges.geojson",
        "couches/patrimoine/patrimoineRural.geojson",
        "couches/risques/ppr_zones.geojson",
        "couches/securite/dae.geojson",
        "couches/securite/ehpad.geojson",
        "couches/securite/gendarmerie.geojson",
        "couches/securite/pompiers.geojson",
        "couches/securite/prsf.geojson",
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
        "couches/services/mairies.geojson",
        "couches/services/marches.geojson",
        "couches/services/parkings.geojson",
        "couches/services/toilettes.geojson",
        "couches/tourisme/campingcar.geojson",
        "couches/tourisme/cours_eau.geojson",
        "couches/tourisme/officesTourisme.geojson",
        "couches/tourisme/randonnees.geojson",
        "couches/tourisme/randonnees_osm.geojson",
        "couches/tourisme/velo.geojson",
        "couches/urbanisme/demographie_communes.geojson",
        "couches/urbanisme/dpe_loir_luce_berce.geojson",
        "couches/urbanisme/parcelles_dvf_2021_2025_loir_luce_berce.geojson",
        "couches/urbanisme/prix_immobilier_communes.geojson",
        "couches/urbanisme/rga_2025_loir_luce_berce.geojson",
        "couches/urbanisme/zonage_plui_loir_luce_berce_filtre.geojson"
    ],

    communes: {
        "72013": "Aubigné-Racan",
        "72049": "La Bruère-sur-Loir",
        "72060": "La Chapelle-aux-Choux",
        "72072": "Château-l'Hermitage",
        "72077": "Chenu",
        "72098": "Coulongé",
        "72175": "Luché-Pringé",
        "72176": "Le Lude",
        "72182": "Mansigné",
        "72191": "Mayet",
        "72243": "Pontvallain",
        "72252": "Requeil",
        "72283": "Saint-Germain-d'Arcé",
        "72291": "Saint-Jean-de-la-Motte",
        "72327": "Sarcé",
        "72330": "Savigné-sous-le-Lude",
        "72364": "Vaas",
        "72369": "Verneil-le-Chétif",
        "72385": "Yvré-le-Pôlin"
    }
};
