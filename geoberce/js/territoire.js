/* =========================================================
   GÉOBERCÉ / GÉOSUDSARTHE / GÉOBELINOIS — FICHIER DE TERRITOIRE
   Tout ce qui change d'un territoire à l'autre est ici : nom, communes,
   centre de la carte, identifiants des services tiers. Le reste du code
   (js/*.js) est le même pour tous les territoires et lit TERRITOIRE.

   Chargé AVANT js/config.js (voir index.html). Ce fichier ne contient que
   des DONNÉES : pour un autre territoire, il est remplacé par
   territoires/<id>/territoire.js à la publication (voir README). Le
   comportement qui en dépend est dans js/territoire-appliquer.js, commun
   à tous les territoires.
   ========================================================= */
const TERRITOIRE = {
    /* Identifiant technique : préfixe des clés de stockage local et des
       caches du navigateur. Ne pas le changer pour un territoire déjà en
       ligne (les réglages enregistrés par les visiteurs seraient perdus). */
    id: "geoberce",

    nom: "GéoBercé",
    nomComplet: "Loir-Lucé-Bercé",
    comcom: "Communauté de communes Loir-Lucé-Bercé",
    urlProd: "https://swallowage.github.io/geoberce/",

    /* Carte : centre [lat, lon] et zoom de départ. */
    centre: [47.791528, 0.412223],
    zoom: 12,

    /* Rayon (en mètres) autour du centre pour les stations-service. */
    rayonCarburantsM: 25000,

    /* SIREN de la communauté de communes (code_siren dans
       couches/communes.geojson) : sert au cadastre complet par EPCI. */
    siren: "200070373",

    /* Actualités : bouton « Actualités » de la barre du haut, et carte
       « Actualités » de la fiche de chaque commune. Trois cas :
         { type: "illiwap", id: "cc-...", communes: true }
             fenêtre intégrée avec le flux Illiwap de la communauté de communes ;
             `communes: true` ajoute le flux Illiwap de chaque commune (code INSEE)
             dans sa fiche ;
         { type: "lien", libelle: "Intramuros", url: "https://..." }
             le bouton ouvre ce lien dans un nouvel onglet (pour un service qui ne
             s'intègre pas dans la page, comme Intramuros) ;
         { type: "intramuros", communes: { "72124": "https://www.intramuros.org/...", ... } }
             une page Intramuros par commune (le service ne s'intègre pas dans la
             page) : le bouton ouvre un menu des communes, chacune renvoyant vers sa
             page dans un nouvel onglet, et la fiche de chaque commune a son lien ;
         null
             pas de bouton « Actualités ». */
    actualites: { type: "illiwap", id: "cc-loir-luce-berce", communes: true },

    /* Sous-domaine GoatCounter (suivi de visites), null = pas de suivi. */
    goatcounter: "geoberce",

    /* Couches de js/config.js à ne pas afficher pour ce territoire
       (identifiants). Les couches propres à un territoire déclarent aussi
       `territoires: ["geoberce"]` directement dans js/config.js. */
    couchesExclues: [],

    /* Code INSEE -> nom de chaque commune du territoire. */
    communes: {
        "72027": "Beaumont-sur-Dême", "72028": "Beaumont-Pied-de-Bœuf", "72052": "Chahaignes",
        "72068": "La Chartre-sur-le-Loir", "72071": "Montval-sur-Loir", "72103": "Courdemanche",
        "72115": "Dissay-sous-Courcillon", "72134": "Flée", "72143": "Le Grand-Lucé",
        "72153": "Jupilles", "72160": "Lavernat", "72161": "Lhomme", "72173": "Luceau",
        "72183": "Marçon", "72210": "Montreuil-le-Henri", "72221": "Nogent-sur-Loir",
        "72248": "Pruillé-l'Éguillé", "72262": "Loir en Vallée", "72279": "Saint-Georges-de-la-Couée",
        "72311": "Saint-Pierre-de-Chevillé", "72314": "Saint-Pierre-du-Lorouër",
        "72325": "Saint-Vincent-du-Lorouër", "72356": "Thoiré-sur-Dinan", "72376": "Villaines-sous-Lucé"
    }
};
