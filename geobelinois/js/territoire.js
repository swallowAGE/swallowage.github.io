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

    /* À renseigner : identifiant Illiwap de la communauté de communes, et
       sous-domaine GoatCounter. null = pas encore connu / pas de suivi. */
    illiwap: null,
    goatcounter: null,

    couchesExclues: [],

    /* Fichiers de couches/ réellement disponibles pour ce territoire
       (couches/communes.geojson et epci.geojson sont toujours présents).
       Une couche de js/config.js dont un fichier local n'est pas dans cette
       liste n'est pas affichée. À compléter au fil des scripts de données. */
    fichiersDisponibles: [],

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
