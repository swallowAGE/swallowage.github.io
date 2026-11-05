/* =========================================================
   GÉOBERCÉ / GÉOSUDSARTHE / GÉOBELINOIS — FICHIER DE TERRITOIRE
   Tout ce qui change d'un territoire à l'autre est ici : nom, communes,
   centre de la carte, identifiants des services tiers. Le reste du code
   (js/*.js) est le même pour tous les territoires et lit TERRITOIRE.

   Chargé AVANT js/config.js (voir index.html). Pour un autre territoire,
   on remplace ce fichier par celui de territoires/<id>.js au moment de la
   publication (voir README, section « Plusieurs territoires »).
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

    /* Identifiant Illiwap de la communauté de communes (null = pas de
       station Illiwap connue : le bouton « Actualités » n'a alors rien à
       montrer au niveau de l'intercommunalité). */
    illiwap: "cc-loir-luce-berce",

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

/* Applique le nom du territoire aux textes visibles de la page. Le HTML
   contient déjà ceux de GéoBercé (la page reste correcte sans JavaScript) :
   pour GéoBercé, cette fonction ne change donc rien. */
document.addEventListener("DOMContentLoaded", () => {
    document.title = `${TERRITOIRE.nom} — Le SIG local du territoire ${TERRITOIRE.nomComplet}`;
    const titre = document.getElementById("brand-title");
    if (titre) titre.textContent = TERRITOIRE.nom;
    const apropos = document.querySelector("#about-modal h2");
    if (apropos) apropos.textContent = TERRITOIRE.nom;
    document.querySelectorAll(".brand-logo").forEach(img => { img.alt = `Logo ${TERRITOIRE.nom}`; });
    const intro = document.querySelector("#about-modal .about-info p");
    if (intro) intro.textContent = intro.textContent.replace("Loir-Lucé-Bercé", TERRITOIRE.nomComplet);
});
