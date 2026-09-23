/* =========================================================
   MON PETIT MONDE — SERVICE WORKER
   Réseau d'abord (pour recevoir les mises à jour), puis cache
   en secours : le jeu reste jouable sans connexion. Toutes les
   images sont mises en cache dès l'installation. La sauvegarde
   du monde est dans localStorage, elle n'est jamais touchée ici.
   ========================================================= */
const CACHE = "petit-monde-v3";
const FILES = [
  "./", "index.html", "style.css", "app.js", "manifest.json", "icons/icon-192.png",
  "img/baby_chick.png", "img/bank.png", "img/bear.png", "img/billed_cap.png", "img/blossom.png",
  "img/books.png", "img/boy_dark.png", "img/boy_default.png", "img/boy_light.png",
  "img/boy_medium.png", "img/boy_medium_dark.png", "img/boy_medium_light.png", "img/cactus.png",
  "img/camping.png", "img/carousel_horse.png", "img/carrot.png", "img/castle.png", "img/cat.png",
  "img/chart_increasing.png", "img/check_mark_button.png", "img/cherry_blossom.png",
  "img/chipmunk.png", "img/circus_tent.png", "img/convenience_store.png", "img/cow.png",
  "img/crown.png", "img/deciduous_tree.png", "img/dog.png", "img/duck.png", "img/ear_of_corn.png",
  "img/evergreen_tree.png", "img/ewe.png", "img/ferris_wheel.png", "img/fountain.png",
  "img/four_leaf_clover.png", "img/fond-carte.webp", "img/fox.png", "img/gear.png", "img/girl_dark.png",
  "img/girl_default.png", "img/girl_light.png", "img/girl_medium.png", "img/girl_medium_dark.png",
  "img/girl_medium_light.png", "img/glasses.png", "img/glowing_star.png", "img/goat.png",
  "img/graduation_cap.png", "img/hammer.png", "img/hedgehog.png", "img/herb.png",
  "img/hibiscus.png", "img/honeybee.png", "img/horse.png", "img/hospital.png", "img/hotel.png",
  "img/house.png", "img/house_with_garden.png", "img/houses.png", "img/hut.png",
  "img/light_bulb.png", "img/llama.png", "img/locked.png", "img/mailbox.png", "img/moai.png",
  "img/mushroom.png", "img/muted_speaker.png", "img/palm_tree.png", "img/party_popper.png",
  "img/paw_prints.png", "img/pig.png", "img/post_office.png", "img/potted_plant.png",
  "img/rabbit.png", "img/rabbit_face.png", "img/rainbow.png", "img/red_apple.png",
  "img/red_heart.png", "img/ribbon.png", "img/rock.png", "img/rooster.png", "img/rose.png",
  "img/school.png", "img/seedling.png", "img/sheaf_of_rice.png", "img/snail.png",
  "img/sparkles.png", "img/speaker_high_volume.png", "img/stadium.png", "img/star.png",
  "img/strawberry.png", "img/sunflower.png", "img/swan.png", "img/tent.png", "img/top_hat.png",
  "img/tractor.png", "img/trophy.png", "img/tulip.png", "img/turtle.png", "img/wood.png",
  "img/wrapped_gift.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
