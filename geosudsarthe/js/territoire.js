/* =========================================================
   GéoSudSarthe — FICHIER DE TERRITOIRE (généré par outils/build_territoire.py)
   Voir js/territoire.js (GéoBercé) pour le détail de chaque champ.
   ========================================================= */
const TERRITOIRE = {
    id: "geosudsarthe",
    nom: "GéoSudSarthe",
    nomComplet: "Sud Sarthe",
    comcom: "Communauté de communes Sud Sarthe",
    urlProd: "https://swallowage.github.io/geosudsarthe/",
    centre: [47.707432, 0.210716],
    zoom: 11,
    rayonCarburantsM: 25000,
    siren: "200073112",

    /* À renseigner : actualités (voir js/territoire.js : Illiwap, lien ou null)
       et sous-domaine GoatCounter. null = pas de bouton / pas de suivi. */
    actualites: null,
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
        "couches/patrimoine/patrimoineRural.geojson",
        "couches/securite/ehpad.geojson",
        "couches/securite/gendarmerie.geojson",
        "couches/securite/pompiers.geojson",
        "couches/services/airesJeu.geojson",
        "couches/services/antennes.geojson",
        "couches/services/bibliotheques.geojson",
        "couches/services/equipementSportif.geojson",
        "couches/services/fontaines.geojson",
        "couches/services/lockers_manuels.geojson",
        "couches/services/marches.geojson",
        "couches/services/parkings.geojson",
        "couches/services/toilettes.geojson",
        "couches/tourisme/campingcar.geojson",
        "couches/tourisme/cours_eau.geojson",
        "couches/tourisme/officesTourisme.geojson",
        "couches/tourisme/randonnees.geojson"
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
