/* =========================================================
   MON PETIT MONDE
   Réussir des additions rapporte des étoiles ⭐ qui servent à
   construire, décorer et peupler son petit monde.
   Tout est enregistré sur l'appareil (localStorage).
   Images : Fluent Emoji 3D de Microsoft (licence MIT).
   ========================================================= */
"use strict";

const $ = id => document.getElementById(id);
const IMG = name => `img/${name}.png`;
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = list => list[rand(0, list.length - 1)];
const shuffle = list => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};
const starCost = n => `<span class="cost">${n}<img src="${IMG("star")}" alt="étoiles"></span>`;

/* =========================================================
   ENTRAÎNEMENTS
   ========================================================= */
// Tables d'addition de 1 à 9 : la table de n, c'est n + 0, n + 1… n + 9
const TABLE_LOOK = [
  null,
  { img: "baby_chick",  c: "#F2C14E", dark: "#C7951F" },
  { img: "rabbit_face", c: "#E98FB0", dark: "#C0607F" },
  { img: "hedgehog",    c: "#B98A5E", dark: "#8A5E37" },
  { img: "duck",        c: "#5FB3A3", dark: "#357F71" },
  { img: "cat",         c: "#F29E4C", dark: "#C4701F" },
  { img: "dog",         c: "#C79A6B", dark: "#96693C" },
  { img: "pig",         c: "#EF8FA8", dark: "#C25E7A" },
  { img: "cow",         c: "#8C9BAB", dark: "#5E6D7D" },
  { img: "horse",       c: "#A77B5A", dark: "#774E30" },
];
const MODES = {};
for (let n = 1; n <= 9; n++) {
  MODES["t" + n] = {
    table: n,
    label: `Table de ${n}`,
    big: `+${n}`,
    example: `${n} + 4`,
    reward: n <= 4 ? 1 : 2, // les grandes tables rapportent plus
    max: n + 11,
    ...TABLE_LOOK[n],
  };
}
Object.assign(MODES, {
  s10: { label: "Jusqu'à 10", big: "≤10", example: "4 + 3", img: "fox",  reward: 1, max: 10, c: "#F0924A", dark: "#C4651F" },
  s20: { label: "Jusqu'à 20", big: "≤20", example: "9 + 7", img: "bear", reward: 2, max: 20, c: "#6FA8DC", dark: "#3F77AE" },
});

function makeQuestion(mode, deck) {
  let a, b;
  const n = MODES[mode].table;
  if (n) {
    // On pioche dans un paquet mélangé de 0 à 9 : chaque calcul
    // de la table passe une fois avant qu'on en revoie un
    if (!deck.length) deck.push(...shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    a = n;
    b = deck.pop();
  } else if (mode === "s10") {
    a = rand(1, 9);
    b = rand(1, 10 - a);
  } else {
    // Jusqu'à 20 : on favorise les résultats au-dessus de 10
    const sum = Math.random() < 0.75 ? rand(11, 20) : rand(5, 10);
    a = rand(Math.max(1, sum - 10), Math.min(sum - 1, 10));
    b = sum - a;
    if (Math.random() < 0.5) [a, b] = [b, a];
  }
  return { a, b, result: a + b };
}

// Trois mauvaises réponses plausibles (proches de la bonne)
function makeChoices(q, mode) {
  const max = MODES[mode].max;
  const set = new Set([q.result]);
  for (const d of shuffle([-1, 1, -2, 2, 3, -3])) {
    const v = q.result + d;
    if (v >= 0 && v <= max) set.add(v);
    if (set.size === 4) break;
  }
  while (set.size < 4) set.add(rand(0, max));
  return shuffle([...set]);
}

/* =========================================================
   CATALOGUE
   ========================================================= */
// Maisons : 3 niveaux, on améliore en touchant la maison
const HOUSE = [
  // scale : taille sur la carte, pour qu'on voie la maison grandir
  { img: "house",             name: "Maison",        cost: 10, pop: 3,  scale: 1 },
  { img: "house_with_garden", name: "Jolie maison",  cost: 30, pop: 6,  scale: 1.15 },
  { img: "houses",            name: "Grande maison", cost: 50, pop: 10, scale: 1.35 },
];

// Constructions posées sur un emplacement
const BUILDINGS = {
  house:    { cat: "maisons",    name: "Maison",        img: "house",             cost: 10,  level: 1 },
  hut:      { cat: "batiments",  name: "Cabane",        img: "hut",               cost: 6,   level: 1 },
  camping:  { cat: "batiments",  name: "Camping",       img: "camping",           cost: 12,  level: 1 },
  fountain: { cat: "batiments",  name: "Fontaine",      img: "fountain",          cost: 15,  level: 2 },
  shop:     { cat: "batiments",  name: "Épicerie",      img: "convenience_store", cost: 25,  level: 2 },
  school:   { cat: "batiments",  name: "École",         img: "school",            cost: 40,  level: 3 },
  post:     { cat: "batiments",  name: "La Poste",      img: "post_office",       cost: 45,  level: 3 },
  bank:     { cat: "batiments",  name: "Banque",        img: "bank",              cost: 50,  level: 4 },
  hospital: { cat: "batiments",  name: "Hôpital",       img: "hospital",          cost: 60,  level: 4 },
  hotel:    { cat: "batiments",  name: "Hôtel",         img: "hotel",             cost: 70,  level: 5 },
  circus:   { cat: "batiments",  name: "Cirque",        img: "circus_tent",       cost: 60,  level: 5 },
  wheel:    { cat: "batiments",  name: "Grande roue",   img: "ferris_wheel",      cost: 90,  level: 6 },
  stadium:  { cat: "batiments",  name: "Stade",         img: "stadium",           cost: 110, level: 7 },
  castle:   { cat: "batiments",  name: "Château",       img: "castle",            cost: 150, level: 8 },
  // Production : donne une petite récolte d'étoiles chaque jour
  wheat:    { cat: "production", name: "Champ de blé",  img: "sheaf_of_rice", cost: 8,  level: 1, harvest: 1 },
  carrot:   { cat: "production", name: "Potager",       img: "carrot",        cost: 10, level: 1, harvest: 1 },
  sunflower:{ cat: "production", name: "Tournesols",    img: "sunflower",     cost: 12, level: 2, harvest: 1 },
  corn:     { cat: "production", name: "Maïs",          img: "ear_of_corn",   cost: 14, level: 2, harvest: 1 },
  berry:    { cat: "production", name: "Fraises",       img: "strawberry",    cost: 18, level: 3, harvest: 2 },
  apple:    { cat: "production", name: "Verger",        img: "red_apple",     cost: 22, level: 3, harvest: 2 },
  bees:     { cat: "production", name: "Ruche",         img: "honeybee",      cost: 28, level: 4, harvest: 2 },
  tractor:  { cat: "production", name: "Tracteur",      img: "tractor",       cost: 40, level: 5, harvest: 3 },
};
const BUILD_TABS = [
  { id: "maisons",    label: "Maisons",    img: "house" },
  { id: "batiments",  label: "Bâtiments",  img: "school" },
  { id: "production", label: "Production", img: "sheaf_of_rice" },
];

// Décorations : posées librement sur l'herbe
const DECOS = {
  tulip:    { cat: "fleurs", name: "Tulipe",     img: "tulip",            cost: 2,  level: 1 },
  blossom:  { cat: "fleurs", name: "Marguerite", img: "blossom",          cost: 2,  level: 1 },
  rose:     { cat: "fleurs", name: "Rose",       img: "rose",             cost: 3,  level: 1 },
  hibiscus: { cat: "fleurs", name: "Hibiscus",   img: "hibiscus",         cost: 3,  level: 2 },
  sakura:   { cat: "fleurs", name: "Fleur rose", img: "cherry_blossom",   cost: 4,  level: 2 },
  clover:   { cat: "fleurs", name: "Trèfle",     img: "four_leaf_clover", cost: 5,  level: 3 },
  tree:     { cat: "arbres", name: "Arbre",      img: "deciduous_tree",   cost: 4,  level: 1 },
  pine:     { cat: "arbres", name: "Sapin",      img: "evergreen_tree",   cost: 4,  level: 1 },
  cactus:   { cat: "arbres", name: "Cactus",     img: "cactus",           cost: 6,  level: 2 },
  palm:     { cat: "arbres", name: "Palmier",    img: "palm_tree",        cost: 8,  level: 3 },
  rock:     { cat: "nature", name: "Rocher",     img: "rock",             cost: 2,  level: 1 },
  log:      { cat: "nature", name: "Bûche",      img: "wood",             cost: 3,  level: 1 },
  mushroom: { cat: "nature", name: "Champignon", img: "mushroom",         cost: 3,  level: 1 },
  plant:    { cat: "objets", name: "Plante",     img: "potted_plant",     cost: 4,  level: 1 },
  mailbox:  { cat: "objets", name: "Boîte aux lettres", img: "mailbox",   cost: 6,  level: 2 },
  tent:     { cat: "objets", name: "Tente",      img: "tent",             cost: 8,  level: 2 },
  carousel: { cat: "objets", name: "Manège",     img: "carousel_horse",   cost: 20, level: 4 },
  rainbow:  { cat: "objets", name: "Arc-en-ciel", img: "rainbow",         cost: 25, level: 5 },
  moai:     { cat: "objets", name: "Statue",     img: "moai",             cost: 30, level: 6 },
};
const DECO_TABS = [
  { id: "all",    label: "Toutes" },
  { id: "fleurs", label: "Fleurs" },
  { id: "arbres", label: "Arbres" },
  { id: "nature", label: "Nature" },
  { id: "objets", label: "Objets" },
];

// Animaux : ils se promènent tout seuls (right = l'image regarde à droite)
const ANIMALS = {
  chick:    { name: "Poussin",  img: "baby_chick", cost: 5,  level: 1 },
  rooster:  { name: "Coq",      img: "rooster",    cost: 10, level: 1 },
  rabbit:   { name: "Lapin",    img: "rabbit",     cost: 15, level: 1 },
  snail:    { name: "Escargot", img: "snail",      cost: 8,  level: 1, speed: 0.25 },
  duck:     { name: "Canard",   img: "duck",       cost: 15, level: 2 },
  hedgehog: { name: "Hérisson", img: "hedgehog",   cost: 18, level: 2 },
  turtle:   { name: "Tortue",   img: "turtle",     cost: 18, level: 2, speed: 0.4 },
  cat:      { name: "Chat",     img: "cat",        cost: 25, level: 2, right: true },
  dog:      { name: "Chien",    img: "dog",        cost: 30, level: 3 },
  squirrel: { name: "Écureuil", img: "chipmunk",   cost: 25, level: 3 },
  sheep:    { name: "Mouton",   img: "ewe",        cost: 35, level: 3, right: true },
  pig:      { name: "Cochon",   img: "pig",        cost: 35, level: 4, right: true },
  goat:     { name: "Chèvre",   img: "goat",       cost: 40, level: 4 },
  cow:      { name: "Vache",    img: "cow",        cost: 45, level: 5 },
  swan:     { name: "Cygne",    img: "swan",       cost: 45, level: 5 },
  horse:    { name: "Cheval",   img: "horse",      cost: 60, level: 6, right: true },
  llama:    { name: "Lama",     img: "llama",      cost: 70, level: 7 },
};
const MAX_ANIMALS = 14;

// Personnage
const SKINS = ["default", "light", "medium_light", "medium", "medium_dark", "dark"];
const ACCESSORIES = {
  none:    { name: "Rien",      img: null },
  cap:     { name: "Casquette", img: "billed_cap",     cls: "hat" },
  ribbon:  { name: "Nœud",      img: "ribbon",         cls: "ribbon" },
  glasses: { name: "Lunettes",  img: "glasses",        cls: "glasses" },
  crown:   { name: "Couronne",  img: "crown",          cls: "crown" },
  top:     { name: "Chapeau",   img: "top_hat",        cls: "top" },
  grad:    { name: "Diplômé",   img: "graduation_cap", cls: "grad" },
};

// Niveaux du monde (selon la valeur de tout ce qui est construit)
const LEVELS = [0, 25, 70, 150, 270, 440, 680, 1000];

/* ---------- la carte (unités = pixels de l'image de fond, 1448 × 1086) ---------- */
// La carte est plus large que l'écran : on la fait glisser du doigt.
const MAP_W = 1448, MAP_H = 1086;
const START_X = 760; // point de la carte au centre de l'écran au démarrage
// Emplacements à construire (sur les plaques de terre), dans l'ordre où ils se débloquent
const PLOTS = [
  { x: 612, y: 560 }, { x: 968, y: 772 }, { x: 855, y: 262 }, { x: 765, y: 925 },
  { x: 438, y: 780 }, { x: 1080, y: 470 }, { x: 230, y: 455 }, { x: 1285, y: 615 },
  { x: 480, y: 380 }, { x: 1140, y: 690 },
];
const plotsForLevel = level => Math.min(PLOTS.length, 3 + level);
// Tailles des objets sur la carte (même unité)
const SIZE = { house: 150, building: 150, production: 110, deco: 58, tree: 84, animal: 90 };
// La prairie : on y pose les décorations et les animaux s'y promènent
const MEADOW = [
  [300, 300], [430, 245], [560, 215], [800, 210], [910, 225], [980, 260], [1080, 300],
  [1210, 330], [1300, 390], [1320, 520], [1250, 600], [1240, 700], [1200, 800], [1110, 880],
  [980, 950], [800, 975], [620, 960], [440, 880], [300, 830], [190, 780], [160, 620],
  [170, 470], [250, 380],
];
// La rivière et la cascade (en haut à gauche)
const WATER = [[0, 0], [420, 0], [420, 130], [300, 200], [270, 300], [200, 380], [0, 450]];

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inWater = (x, y) => inPolygon(x, y, WATER);
const onGrass = (x, y) => inPolygon(x, y, MEADOW);

/* =========================================================
   SAUVEGARDE
   ========================================================= */
const SAVE_KEY = "petit-monde-v1";

function freshState() {
  return {
    stars: 10, // petit cadeau pour construire tout de suite
    mapVersion: 2, // 2 = carte avec l'image de fond
    plots: {},  // index -> { id, lvl, day }
    decos: [],  // { id, x, y }
    animals: [], // { id }
    avatar: { base: "girl", skin: "default", acc: "none", name: "" },
    settings: { sound: true, length: 10, input: "choices" },
    stats: {},  // mode -> { played, good, total, best, bestOf }
    counters: { correct: 0, perfect: 0, harvest: 0 },
    claimed: [],
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) {
      const s = freshState();
      if (saved.mapVersion !== 2) {
        // Ancienne carte (400 × 660) : on replace les décorations dans la nouvelle prairie
        saved.decos = (saved.decos || []).map(d => {
          let x = Math.round(250 + (d.x - 36) / 328 * 1000);
          let y = Math.round(260 + (d.y - 118) / 522 * 700);
          if (!onGrass(x, y)) ({ x, y } = randomSpot());
          return { ...d, x, y };
        });
        saved.mapVersion = 2;
      }
      return Object.assign(s, saved, {
        avatar: Object.assign(s.avatar, saved.avatar),
        settings: Object.assign(s.settings, saved.settings),
        counters: Object.assign(s.counters, saved.counters),
      });
    }
    // Ancienne version (« Mon Village des Calculs ») : on garde les étoiles
    const old = JSON.parse(localStorage.getItem("village-calculs-v1"));
    if (old) {
      const s = freshState();
      s.stars += old.stars || 0;
      return s;
    }
  } catch (e) { /* stockage indisponible : on repart de zéro */ }
  return freshState();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
}

let state = load();

/* =========================================================
   OUTILS D'INTERFACE
   ========================================================= */
function show(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  if (name === "world") renderWorld();
}
const isActive = name => $("screen-" + name).classList.contains("active");

let toastTimer;
function toast(text) {
  const t = $("toast");
  t.innerHTML = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2000);
}

function confetti(images = ["star", "sparkles", "party_popper", "cherry_blossom"]) {
  for (let i = 0; i < 26; i++) {
    const s = document.createElement("img");
    s.className = "fall";
    s.src = IMG(images[i % images.length]);
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    $("fx").appendChild(s);
    setTimeout(() => s.remove(), 2600);
  }
}

// Petites étoiles qui s'envolent vers le compteur
function flyStars(fromEl, n) {
  const from = fromEl.getBoundingClientRect();
  const to = $("stars").closest(".pill").getBoundingClientRect();
  for (let i = 0; i < Math.min(n, 6); i++) {
    const s = document.createElement("img");
    s.className = "fly";
    s.src = IMG("star");
    s.style.left = from.left + from.width / 2 - 17 + "px";
    s.style.top = from.top + from.height / 2 - 17 + "px";
    $("fx").appendChild(s);
    setTimeout(() => {
      s.style.left = to.left + 4 + "px";
      s.style.top = to.top + 2 + "px";
      s.style.transform = "scale(.7)";
    }, 30 + i * 90);
    setTimeout(() => s.remove(), 900 + i * 90);
  }
}

function hearts(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    const h = document.createElement("img");
    h.className = "heart";
    h.src = IMG("red_heart");
    h.style.left = r.left + r.width / 2 - 13 + (i - 1) * 18 + "px";
    h.style.top = r.top + "px";
    h.style.animationDelay = i * 0.12 + "s";
    $("fx").appendChild(h);
    setTimeout(() => h.remove(), 1400);
  }
}

function puff(el) {
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("img");
    p.className = "puff";
    p.src = IMG(i % 2 ? "sparkles" : "star");
    const angle = (i / 6) * Math.PI * 2;
    p.style.left = r.left + r.width / 2 + "px";
    p.style.top = r.top + r.height * 0.6 + "px";
    p.style.setProperty("--dx", Math.cos(angle) * 50 + "px");
    p.style.setProperty("--dy", Math.sin(angle) * 36 + "px");
    $("fx").appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function bump(el) {
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

function avatarHTML(av = state.avatar) {
  const acc = ACCESSORIES[av.acc];
  return `<img class="base" src="${IMG(av.base + "_" + av.skin)}" alt="">` +
    (acc && acc.img ? `<img class="acc ${acc.cls}" src="${IMG(acc.img)}" alt="">` : "");
}
function renderAvatars() {
  document.querySelectorAll("[data-avatar]").forEach(el => { el.innerHTML = avatarHTML(); });
}

/* ---------- sons (générés, sans fichiers) ---------- */
let audio;
function beep(notes, type = "triangle") {
  if (!state.settings.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    let t = audio.currentTime;
    for (const [freq, dur] of notes) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur * 0.8;
    }
  } catch (e) { /* pas de son, tant pis */ }
}
const SOUND = {
  good:  () => beep([[660, .12], [880, .22]]),
  bad:   () => beep([[320, .22]]),
  build: () => beep([[523, .1], [659, .1], [784, .2]]),
  coin:  () => beep([[988, .08], [1319, .2]], "sine"),
  win:   () => beep([[523, .12], [659, .12], [784, .12], [1047, .4]]),
  tap:   () => beep([[520, .05]], "sine"),
  pop:   () => beep([[700, .06], [900, .08]], "sine"),
};

/* =========================================================
   CALCULS SUR LE MONDE
   ========================================================= */
function buildingValue(p) {
  if (p.id === "house") return HOUSE.slice(0, p.lvl).reduce((s, h) => s + h.cost, 0);
  return BUILDINGS[p.id].cost;
}
function worldValue() {
  let v = 0;
  for (const p of Object.values(state.plots)) v += buildingValue(p);
  for (const d of state.decos) v += DECOS[d.id].cost;
  for (const a of state.animals) v += ANIMALS[a.id].cost;
  return v;
}
function levelInfo() {
  const v = worldValue();
  let i = 0;
  while (i + 1 < LEVELS.length && v >= LEVELS[i + 1]) i++;
  const next = LEVELS[i + 1];
  return { level: i + 1, progress: next ? (v - LEVELS[i]) / (next - LEVELS[i]) : 1 };
}
const currentLevel = () => levelInfo().level;
const countBuilt = id => Object.values(state.plots).filter(p => p.id === id).length;
const maxHouseLevel = () => Math.max(0, ...Object.values(state.plots).filter(p => p.id === "house").map(p => p.lvl));
const today = () => new Date().toLocaleDateString("fr-CA"); // AAAA-MM-JJ, heure locale

function spend(n) {
  if (state.stars < n) return false;
  state.stars -= n;
  return true;
}

// Appelé après chaque achat : vérifie si le monde a changé de niveau
function afterChange(levelBefore) {
  save();
  const after = currentLevel();
  renderWorld();
  if (after > levelBefore) {
    SOUND.win();
    confetti();
    const newPlots = plotsForLevel(after) - plotsForLevel(levelBefore);
    toast(`🎉 Niveau ${after} !` + (newPlots ? `<br>Un nouvel emplacement s'ouvre` : `<br>De nouvelles choses à découvrir`));
  }
}

/* =========================================================
   MON MONDE : affichage
   ========================================================= */
let placing = null;       // { kind: "building" | "deco", id }
let targetPlot = null;    // emplacement touché avant d'ouvrir « Construire »

// La carte couvre tout l'écran (un peu agrandie) ; les boutons flottent
// par-dessus. On la fait glisser dans tous les sens (panX / panY en pixels).
const ZOOM = 1.12; // zoom sur les écrans en paysage (on peut aussi glisser en vertical)
const START_Y = 600;
let panX = null, panY = null;

function sizeMap() {
  const area = $("map-area");
  const map = $("map");
  const vw = area.clientWidth, vh = area.clientHeight;
  if (!vh) return; // écran pas encore affiché
  // En portrait (téléphone), la carte tient déjà en hauteur : pas de zoom en plus
  const scale = Math.max(vw / MAP_W, vh / MAP_H) * (vh > vw ? 1 : ZOOM);
  const w = MAP_W * scale, h = MAP_H * scale;
  map.style.width = w + "px";
  map.style.height = h + "px";
  map.style.setProperty("--u", h / 660 + "px");
  if (panX === null) {
    panX = START_X * scale - vw / 2;
    panY = START_Y * scale - vh / 2;
  }
  setPan(panX, panY);
}

function setPan(x, y = panY, smooth = false) {
  const area = $("map-area");
  const map = $("map");
  const maxX = Math.max(0, map.offsetWidth - area.clientWidth);
  const maxY = Math.max(0, map.offsetHeight - area.clientHeight);
  panX = Math.min(maxX, Math.max(0, x));
  panY = Math.min(maxY, Math.max(0, y || 0));
  map.classList.toggle("smooth", smooth);
  map.style.transform = `translate(${-panX}px, ${-panY}px)`;
  $("pan-left").hidden = panX <= 2;
  $("pan-right").hidden = panX >= maxX - 2;
}

// Place un élément sur la carte (x, y = point au sol ; w = largeur)
function place(el, x, y, w) {
  el.style.left = (x / MAP_W) * 100 + "%";
  el.style.top = (y / MAP_H) * 100 + "%";
  if (w) el.style.width = (w / MAP_W) * 100 + "%";
  el.style.zIndex = Math.round(y);
}

function renderWorld() {
  $("stars").textContent = state.stars;
  const { level, progress } = levelInfo();
  $("level-name").textContent = "Niveau " + level;
  $("level-progress").style.width = Math.round(progress * 100) + "%";
  renderAvatars();
  renderQuestBadge();
  sizeMap();
  renderMap(level);
  renderPlacing();
}

function renderMap(level) {
  const layer = $("layer");
  // On garde les animaux (ils se déplacent) et on redessine le reste
  layer.querySelectorAll(":scope > :not(.animal)").forEach(el => el.remove());

  const open = plotsForLevel(level);
  PLOTS.forEach((pos, i) => {
    const built = state.plots[i];
    if (built) {
      layer.appendChild(buildingEl(i, built, pos));
    } else if (i < open) {
      const p = document.createElement("button");
      p.className = "plot";
      p.textContent = "+";
      p.setAttribute("aria-label", "Emplacement libre");
      place(p, pos.x, pos.y);
      p.style.zIndex = 2000; // toujours touchable, même si un animal passe dessus
      p.addEventListener("click", e => { e.stopPropagation(); onPlot(i); });
      layer.appendChild(p);
    } else if (i === open) {
      // Le prochain emplacement se voit, cadenassé
      const p = document.createElement("button");
      p.className = "plot locked";
      p.innerHTML = `<img src="${IMG("locked")}" alt="">`;
      p.setAttribute("aria-label", "Emplacement bloqué");
      place(p, pos.x, pos.y);
      p.addEventListener("click", e => {
        e.stopPropagation();
        SOUND.tap();
        toast(`Cet emplacement s'ouvre au niveau ${level + 1} 🔒<br>Construis et décore pour y arriver !`);
      });
      layer.appendChild(p);
    }
  });

  state.decos.forEach((d, i) => {
    const def = DECOS[d.id];
    const el = document.createElement("button");
    el.className = "obj deco" + (def.cat === "fleurs" || def.cat === "arbres" ? " sway" : "");
    el.innerHTML = `<img src="${IMG(def.img)}" alt="${def.name}">`;
    place(el, d.x, d.y, def.cat === "arbres" ? SIZE.tree : SIZE.deco);
    el.addEventListener("click", e => { e.stopPropagation(); onDeco(i, el); });
    layer.appendChild(el);
  });

  syncAnimals();
}

function buildingEl(i, built, pos) {
  const isHouse = built.id === "house";
  const def = isHouse ? HOUSE[built.lvl - 1] : BUILDINGS[built.id];
  const production = BUILDINGS[built.id].cat === "production";
  const el = document.createElement("button");
  el.className = "obj building" + (production ? " sway" : "");
  el.dataset.plot = i;
  let html = `<img src="${IMG(def.img)}" alt="${def.name}">`;
  if (isHouse) html += `<span class="lvl-badge">${built.lvl}</span>`;
  if (canHarvest(built)) html += `<span class="harvest"><img src="${IMG("star")}" alt="Récolte prête"></span>`;
  el.innerHTML = html;
  place(el, pos.x, pos.y + 26, (production ? SIZE.production : SIZE.building) * (def.scale || 1));
  el.addEventListener("click", e => { e.stopPropagation(); onBuilding(i, el); });
  return el;
}

function renderPlacing() {
  const bar = $("placing");
  $("map").classList.toggle("placing-building", placing?.kind === "building");
  if (!placing) { bar.hidden = true; return; }
  const def = placing.kind === "building" ? BUILDINGS[placing.id] : DECOS[placing.id];
  bar.hidden = false;
  $("placing-img").src = IMG(def.img);
  $("placing-text").textContent = placing.kind === "building"
    ? "Touche un emplacement ＋"
    : "Touche l'herbe pour poser";
}

/* =========================================================
   MON MONDE : actions
   ========================================================= */
// Touche un emplacement libre
async function onPlot(i) {
  SOUND.tap();
  if (placing?.kind === "building") {
    const id = placing.id;
    if (await confirmBuild(id)) build(i, id);
    return;
  }
  targetPlot = i;
  openBuild();
}

function confirmBuild(id) {
  const def = BUILDINGS[id];
  return ask({
    title: "Construire ici ?",
    img: def.img,
    name: def.name,
    sub: id === "house" ? "Niveau 1" : (def.harvest ? `Récolte : +${def.harvest} ⭐ par jour` : ""),
    cost: def.cost,
    buttons: [
      { label: "Annuler", cls: "btn-grey", value: false },
      { label: "Construire", cls: "btn-green", value: true, disabled: state.stars < def.cost },
    ],
  });
}

function build(i, id) {
  const def = BUILDINGS[id];
  if (!spend(def.cost)) return toast(`Il te manque ${def.cost - state.stars} ⭐<br>Joue pour en gagner !`);
  const before = currentLevel();
  state.plots[i] = { id, lvl: 1, day: today() };
  if (state.stars < def.cost) placing = null;
  SOUND.build();
  afterChange(before);
  const el = document.querySelector(`.building[data-plot="${i}"]`);
  if (el) { el.classList.add("new"); puff(el); }
}

// Touche une construction existante
async function onBuilding(i, el) {
  const built = state.plots[i];
  const def = BUILDINGS[built.id];

  if (canHarvest(built)) {
    built.day = today();
    state.stars += def.harvest;
    state.counters.harvest++;
    save();
    SOUND.coin();
    flyStars(el, def.harvest);
    renderWorld();
    return;
  }

  el.classList.remove("tap");
  void el.offsetWidth;
  el.classList.add("tap");
  SOUND.tap();

  const buttons = [{ label: "Fermer", cls: "btn-grey", value: null }];
  let sub = "", cost = null, name = def.name, img = def.img;
  if (built.id === "house") {
    const cur = HOUSE[built.lvl - 1];
    name = cur.name;
    img = cur.img;
    sub = `Niveau ${built.lvl} · ${cur.pop} habitants`;
    const next = HOUSE[built.lvl];
    if (next) {
      cost = next.cost;
      buttons.push({ label: "Améliorer", cls: "btn-green", value: "up", disabled: state.stars < next.cost });
    } else {
      sub += " · niveau maximum !";
    }
  } else if (def.harvest) {
    sub = `Prochaine récolte demain (+${def.harvest} ⭐)`;
  }
  buttons.push({ label: "Démolir", cls: "btn-red", value: "remove" });

  const choice = await ask({ title: name, img, name: cost ? "Améliorer :" : "", sub, cost, buttons });
  if (choice === "up") upgrade(i);
  if (choice === "remove") demolish(i);
}

function upgrade(i) {
  const built = state.plots[i];
  const next = HOUSE[built.lvl];
  if (!next || !spend(next.cost)) return;
  const before = currentLevel();
  built.lvl++;
  SOUND.build();
  afterChange(before);
  const el = document.querySelector(`.building[data-plot="${i}"]`);
  if (el) { el.classList.add("new"); puff(el); }
  toast(`✨ ${next.name} !`);
}

async function demolish(i) {
  const built = state.plots[i];
  const refund = Math.floor(buildingValue(built) / 2);
  const ok = await ask({
    title: "Démolir ?",
    img: built.id === "house" ? HOUSE[built.lvl - 1].img : BUILDINGS[built.id].img,
    name: "Tu récupères",
    cost: refund,
    buttons: [
      { label: "Non", cls: "btn-grey", value: false },
      { label: "Démolir", cls: "btn-red", value: true },
    ],
  });
  if (!ok) return;
  delete state.plots[i];
  state.stars += refund;
  save();
  SOUND.pop();
  renderWorld();
}

function canHarvest(built) {
  return !!BUILDINGS[built.id].harvest && built.day !== today();
}

// Touche une décoration
async function onDeco(i, el) {
  if (placing) return; // en mode pose, on ne dérange pas
  const d = state.decos[i];
  const def = DECOS[d.id];
  el.classList.remove("tap");
  void el.offsetWidth;
  el.classList.add("tap");
  SOUND.tap();
  const refund = Math.floor(def.cost / 2);
  const ok = await ask({
    title: def.name,
    img: def.img,
    name: "Ranger cette décoration ?",
    sub: refund ? `Tu récupères ${refund} ⭐` : "",
    buttons: [
      { label: "Garder", cls: "btn-grey", value: false },
      { label: "Ranger", cls: "btn-red", value: true },
    ],
  });
  if (!ok) return;
  state.decos.splice(i, 1);
  state.stars += refund;
  save();
  SOUND.pop();
  renderWorld();
}

// Touche la carte (pose d'une décoration)
$("map").addEventListener("click", e => {
  if (placing?.kind !== "deco") {
    if (placing?.kind === "building") toast("Touche un emplacement ＋");
    return;
  }
  const r = $("map").getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * MAP_W;
  const y = (e.clientY - r.top) / r.height * MAP_H;
  if (!onGrass(x, y)) {
    SOUND.bad();
    return toast(inWater(x, y) ? "Pas dans l'eau ! 💦" : "Pose-la sur l'herbe 🌱");
  }
  const def = DECOS[placing.id];
  if (!spend(def.cost)) {
    placing = null;
    renderPlacing();
    return toast(`Il te manque ${def.cost - state.stars} ⭐`);
  }
  const before = currentLevel();
  state.decos.push({ id: placing.id, x: Math.round(x), y: Math.round(y) });
  if (state.stars < def.cost) placing = null;
  SOUND.pop();
  afterChange(before);
  const els = document.querySelectorAll(".obj.deco");
  const el = els[els.length - 1];
  if (el) { el.classList.add("new"); puff(el); }
});

/* ---------- faire glisser la carte ---------- */
{
  const area = $("map-area");
  let drag = null, dragged = false, dragEnd = 0;
  area.addEventListener("pointerdown", e => {
    dragged = false;
    if (e.target.closest(".placing, .pan-arrow")) return;
    drag = { x: e.clientX, y: e.clientY, panX, panY, id: e.pointerId };
  });
  area.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!dragged && Math.hypot(dx, dy) > 8) {
      dragged = true;
      area.classList.add("dragging");
      try { area.setPointerCapture(drag.id); } catch (err) { /* ignoré */ }
    }
    if (dragged) setPan(drag.panX - dx, drag.panY - dy);
  });
  const end = () => {
    if (dragged) dragEnd = Date.now();
    drag = null;
    dragged = false;
    area.classList.remove("dragging");
  };
  area.addEventListener("pointerup", end);
  area.addEventListener("pointercancel", end);
  // Un glissement ne doit pas compter comme un toucher (pas de construction par erreur)
  area.addEventListener("click", e => {
    if (Date.now() - dragEnd < 350) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  area.addEventListener("wheel", e => {
    e.preventDefault();
    // Molette : défile en vertical s'il y a de la place, sinon en horizontal
    const roomY = $("map").offsetHeight > area.clientHeight + 2;
    if (e.shiftKey || !roomY) setPan(panX + e.deltaX + (roomY ? 0 : e.deltaY), panY);
    else setPan(panX + e.deltaX, panY + e.deltaY);
  }, { passive: false });
  $("pan-left").addEventListener("click", () => { SOUND.tap(); setPan(panX - area.clientWidth * 0.6, panY, true); });
  $("pan-right").addEventListener("click", () => { SOUND.tap(); setPan(panX + area.clientWidth * 0.6, panY, true); });
}

$("placing-cancel").addEventListener("click", e => {
  e.stopPropagation();
  placing = null;
  SOUND.tap();
  renderPlacing();
});

/* =========================================================
   ANIMAUX
   ========================================================= */
function syncAnimals() {
  const layer = $("layer");
  const els = [...layer.querySelectorAll(".animal")];
  // Supprime les animaux en trop, ajoute les nouveaux
  els.slice(state.animals.length).forEach(el => el.remove());
  state.animals.forEach((a, i) => {
    const existing = els[i];
    if (existing && existing.dataset.id === a.id) return;
    if (existing) existing.remove();
    const def = ANIMALS[a.id];
    const el = document.createElement("button");
    el.className = "animal";
    el.dataset.id = a.id;
    el.innerHTML = `<span><img src="${IMG(def.img)}" alt="${def.name}"></span>`;
    const start = randomSpot();
    el._x = start.x;
    el._y = start.y;
    el._next = Date.now() + rand(500, 3000);
    place(el, start.x, start.y, SIZE.animal);
    el.addEventListener("click", e => {
      e.stopPropagation();
      el.classList.remove("jump");
      void el.offsetWidth;
      el.classList.add("jump");
      SOUND.pop();
      hearts(el);
    });
    layer.appendChild(el);
  });
}

function randomSpot() {
  for (let i = 0; i < 40; i++) {
    const x = rand(160, 1320), y = rand(210, 975);
    if (onGrass(x, y)) return { x, y };
  }
  return { x: 760, y: 600 };
}

// Toutes les secondes, certains animaux partent se promener
setInterval(() => {
  if (!isActive("world") || document.hidden) return;
  const now = Date.now();
  document.querySelectorAll("#layer .animal").forEach(el => {
    if (now < el._next) return;
    const def = ANIMALS[el.dataset.id];
    const speed = 36 * (def.speed || 1); // unités par seconde
    let tx = el._x, ty = el._y;
    for (let i = 0; i < 20; i++) {
      tx = el._x + rand(-150, 150);
      ty = el._y + rand(-115, 115);
      if (onGrass(tx, ty)) break;
    }
    if (!onGrass(tx, ty)) ({ x: tx, y: ty } = randomSpot());
    const dur = Math.hypot(tx - el._x, ty - el._y) / speed;
    el.classList.toggle("flip", (tx > el._x) !== !!def.right);
    el.classList.add("walk");
    el.style.transitionDuration = dur + "s";
    place(el, tx, ty);
    el._x = tx;
    el._y = ty;
    el._next = now + dur * 1000 + rand(1500, 5000);
    setTimeout(() => el.classList.remove("walk"), dur * 1000);
  });
}, 1000);

/* =========================================================
   FENÊTRES
   ========================================================= */
let onModalClose = null;

function openModal(title, render) {
  $("modal-title").textContent = title;
  const body = $("modal-body");
  body.innerHTML = "";
  render(body);
  $("overlay").hidden = false;
}
function closeModal() {
  $("overlay").hidden = true;
  document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
  if (onModalClose) { const f = onModalClose; onModalClose = null; f(); }
}
$("modal-close").addEventListener("click", () => { SOUND.tap(); targetPlot = null; closeModal(); });
$("overlay").addEventListener("click", e => { if (e.target.id === "overlay") { targetPlot = null; closeModal(); } });

// Petite fenêtre de confirmation, renvoie la valeur du bouton choisi
function ask({ title, img, name = "", sub = "", cost = null, buttons }) {
  return new Promise(resolve => {
    $("confirm-title").textContent = title;
    $("confirm-img").src = IMG(img);
    $("confirm-name").textContent = name;
    $("confirm-sub").textContent = sub;
    $("confirm-cost").innerHTML = cost === null ? "" : `${cost}<img src="${IMG("star")}" alt="étoiles">`;
    const box = $("confirm-actions");
    box.innerHTML = "";
    const done = value => { $("confirm").hidden = true; resolve(value); };
    for (const b of buttons) {
      const el = document.createElement("button");
      el.className = "btn " + b.cls;
      el.textContent = b.label;
      el.disabled = !!b.disabled;
      el.addEventListener("click", () => { SOUND.tap(); done(b.value); });
      box.appendChild(el);
    }
    $("confirm").onclick = e => { if (e.target.id === "confirm") done(buttons[0].value); };
    $("confirm").hidden = false;
  });
}

function card({ img, name, cost, level, owned }) {
  const locked = level > currentLevel();
  const el = document.createElement("button");
  el.className = "card" + (locked ? " locked" : cost > state.stars ? " poor" : "");
  el.innerHTML = `<img src="${IMG(img)}" alt="">
    <span class="name">${name}</span>
    ${locked ? `<span class="cost">Niveau ${level}</span><img class="lock" src="${IMG("locked")}" alt="bloqué">` : starCost(cost)}
    ${owned ? `<span class="owned">×${owned}</span>` : ""}`;
  el._locked = locked;
  return el;
}

function checkBuyable(el, cost, level) {
  SOUND.tap();
  if (el._locked) { toast(`🔒 Ton monde doit atteindre le niveau ${level}`); return false; }
  if (cost > state.stars) { toast(`Il te manque ${cost - state.stars} ⭐<br>Joue pour en gagner !`); return false; }
  return true;
}

function tabsEl(list, current, onPick) {
  const tabs = document.createElement("div");
  tabs.className = "tabs";
  for (const t of list) {
    const b = document.createElement("button");
    b.className = "tab" + (t.id === current ? " active" : "");
    b.innerHTML = (t.img ? `<img src="${IMG(t.img)}" alt="">` : "") + t.label;
    b.addEventListener("click", () => { SOUND.tap(); onPick(t.id); });
    tabs.appendChild(b);
  }
  return tabs;
}

/* ---------- Construire ---------- */
let buildTab = "maisons";

function openBuild() {
  openModal("Construire", body => {
    body.appendChild(tabsEl(BUILD_TABS, buildTab, id => { buildTab = id; openBuild(); }));

    if (buildTab === "maisons") {
      const chain = document.createElement("div");
      chain.className = "chain";
      HOUSE.forEach((h, i) => {
        if (i) chain.insertAdjacentHTML("beforeend", `<span class="arrow">➜</span>`);
        const c = card({ img: h.img, name: `Niveau ${i + 1}`, cost: h.cost, level: 1 });
        c.addEventListener("click", () => {
          if (i === 0) return chooseBuilding("house", c);
          SOUND.tap();
          toast("Construis une maison, puis touche-la<br>pour l'améliorer !");
        });
        chain.appendChild(c);
      });
      body.appendChild(chain);
      body.insertAdjacentHTML("beforeend",
        `<p class="note">Touche une maison de ton monde pour l'améliorer.<br>Plus elle est grande, plus il y a d'habitants !</p>`);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "cards";
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.cat !== buildTab) continue;
      const c = card({ ...def, owned: countBuilt(id) });
      c.addEventListener("click", () => chooseBuilding(id, c));
      grid.appendChild(c);
    }
    body.appendChild(grid);
    if (buildTab === "production") {
      body.insertAdjacentHTML("beforeend",
        `<p class="note">Chaque jour, touche tes cultures pour récolter des étoiles ⭐</p>`);
    }
  });
}

async function chooseBuilding(id, cardEl) {
  const def = BUILDINGS[id];
  if (!checkBuyable(cardEl, def.cost, def.level)) return;
  const open = plotsForLevel(currentLevel());
  const free = PLOTS.map((_, i) => i).filter(i => i < open && !state.plots[i]);
  if (!free.length) {
    return toast("Plus d'emplacement libre !<br>Monte de niveau pour en ouvrir un.");
  }
  if (targetPlot !== null && !state.plots[targetPlot]) {
    // On avait déjà touché un emplacement : on construit directement là
    const i = targetPlot;
    targetPlot = null;
    closeModal();
    if (await confirmBuild(id)) build(i, id);
    return;
  }
  placing = { kind: "building", id };
  closeModal();
  renderPlacing();
}

/* ---------- Décorations ---------- */
let decoTab = "all";

function openDecos() {
  openModal("Décorations", body => {
    body.appendChild(tabsEl(DECO_TABS, decoTab, id => { decoTab = id; openDecos(); }));
    const grid = document.createElement("div");
    grid.className = "cards";
    for (const [id, def] of Object.entries(DECOS)) {
      if (decoTab !== "all" && def.cat !== decoTab) continue;
      const c = card(def);
      c.addEventListener("click", () => {
        if (!checkBuyable(c, def.cost, def.level)) return;
        placing = { kind: "deco", id };
        closeModal();
        renderPlacing();
      });
      grid.appendChild(c);
    }
    body.appendChild(grid);
  });
}

/* ---------- Animaux ---------- */
function openAnimals() {
  openModal("Animaux", body => {
    body.insertAdjacentHTML("beforeend",
      `<p class="note">Tes animaux se promènent dans ton monde.<br>Touche-les pour un câlin !</p>`);
    const grid = document.createElement("div");
    grid.className = "cards";
    for (const [id, def] of Object.entries(ANIMALS)) {
      const owned = state.animals.filter(a => a.id === id).length;
      const c = card({ ...def, owned });
      c.addEventListener("click", async () => {
        if (!checkBuyable(c, def.cost, def.level)) return;
        if (state.animals.length >= MAX_ANIMALS) return toast("Ton monde est plein d'animaux ! 🐾");
        const ok = await ask({
          title: "Adopter ?",
          img: def.img,
          name: def.name,
          cost: def.cost,
          buttons: [
            { label: "Annuler", cls: "btn-grey", value: false },
            { label: "Adopter", cls: "btn-green", value: true },
          ],
        });
        if (!ok || !spend(def.cost)) return;
        const before = currentLevel();
        state.animals.push({ id });
        closeModal();
        SOUND.build();
        afterChange(before);
        const els = document.querySelectorAll("#layer .animal");
        const el = els[els.length - 1];
        if (el) setTimeout(() => hearts(el), 200);
        toast(`${def.name} arrive dans ton monde ! 💕`);
      });
      grid.appendChild(c);
    }
    body.appendChild(grid);
  });
}

/* =========================================================
   PROGRESSION (quêtes)
   ========================================================= */
const QUESTS = [
  { id: "add10",    text: "Réussir 10 additions",          goal: 10, value: () => state.counters.correct, reward: 5,  img: "check_mark_button" },
  { id: "house",    text: "Construire une maison",         goal: 1,  value: () => countBuilt("house"),   reward: 3,  img: "house" },
  { id: "animal",   text: "Adopter un animal",             goal: 1,  value: () => state.animals.length,  reward: 3,  img: "paw_prints" },
  { id: "deco3",    text: "Décorer avec 3 éléments",       goal: 3,  value: () => state.decos.length,    reward: 3,  img: "cherry_blossom" },
  { id: "field",    text: "Faire 3 récoltes",              goal: 3,  value: () => state.counters.harvest, reward: 5, img: "sheaf_of_rice" },
  { id: "upgrade",  text: "Améliorer une maison au niveau 2", goal: 1, value: () => maxHouseLevel() >= 2 ? 1 : 0, reward: 5, img: "house_with_garden" },
  { id: "perfect",  text: "Faire un sans-faute",           goal: 1,  value: () => state.counters.perfect, reward: 5, img: "trophy" },
  { id: "modes",    text: "Essayer 4 jeux différents",     goal: 4,  value: () => Object.keys(state.stats).length, reward: 8, img: "books" },
  { id: "tables",   text: "Jouer aux 9 tables",            goal: 9,  value: () => Object.keys(state.stats).filter(id => MODES[id]?.table).length, reward: 15, img: "trophy" },
  { id: "add50",    text: "Réussir 50 additions",          goal: 50, value: () => state.counters.correct, reward: 10, img: "glowing_star" },
  { id: "animals3", text: "Avoir 3 animaux",               goal: 3,  value: () => state.animals.length,  reward: 8,  img: "cow" },
  { id: "level3",   text: "Atteindre le niveau 3",         goal: 3,  value: () => currentLevel(),        reward: 8,  img: "chart_increasing" },
  { id: "school",   text: "Construire une école",          goal: 1,  value: () => countBuilt("school"),  reward: 10, img: "school" },
  { id: "house3",   text: "Avoir une maison niveau 3",     goal: 1,  value: () => maxHouseLevel() >= 3 ? 1 : 0, reward: 12, img: "houses" },
  { id: "add100",   text: "Réussir 100 additions",         goal: 100, value: () => state.counters.correct, reward: 15, img: "star" },
  { id: "perfect5", text: "Faire 5 sans-fautes",           goal: 5,  value: () => state.counters.perfect, reward: 15, img: "crown" },
  { id: "castle",   text: "Construire le château",         goal: 1,  value: () => countBuilt("castle"),  reward: 25, img: "castle" },
];
const questDone = q => q.value() >= q.goal;
const claimable = () => QUESTS.filter(q => questDone(q) && !state.claimed.includes(q.id));

function renderQuestBadge() {
  const n = claimable().length;
  const badge = $("quest-badge");
  badge.hidden = !n;
  badge.textContent = n;
}

function openQuests() {
  openModal("Ma progression", body => {
    const list = document.createElement("div");
    list.className = "quests";
    // À récupérer d'abord, puis en cours, puis terminées
    const order = q => state.claimed.includes(q.id) ? 2 : questDone(q) ? 0 : 1;
    for (const q of [...QUESTS].sort((a, b) => order(a) - order(b))) {
      const v = Math.min(q.value(), q.goal);
      const claimed = state.claimed.includes(q.id);
      const row = document.createElement("div");
      row.className = "quest" + (v >= q.goal ? " done" : "");
      row.innerHTML = `
        <img src="${IMG(q.img)}" alt="">
        <div class="q-text">${q.text}
          <div class="progress green"><div style="width:${(v / q.goal) * 100}%"></div><span>${v}/${q.goal}</span></div>
        </div>`;
      const right = document.createElement("div");
      right.className = "reward";
      if (claimed) {
        right.innerHTML = `<img src="${IMG("check_mark_button")}" alt="Terminé">`;
      } else if (v >= q.goal) {
        const b = document.createElement("button");
        b.className = "btn btn-gold";
        b.innerHTML = `+${q.reward}<img src="${IMG("star")}" alt="étoiles">`;
        b.addEventListener("click", () => {
          state.claimed.push(q.id);
          state.stars += q.reward;
          save();
          SOUND.coin();
          flyStars(b, q.reward);
          renderWorld();
          setTimeout(openQuests, 350);
        });
        right.appendChild(b);
      } else {
        right.innerHTML = `${q.reward}<img src="${IMG("star")}" alt="étoiles">`;
      }
      row.appendChild(right);
      list.appendChild(row);
    }
    body.appendChild(list);
  });
}

/* =========================================================
   MON PERSONNAGE
   ========================================================= */
let profileTab = "base";

function openProfile() {
  openModal("Mon personnage", body => {
    const wrap = document.createElement("div");
    wrap.className = "profile";
    wrap.innerHTML = `<div class="stage"><span class="avatar" data-avatar></span></div>`;

    const input = document.createElement("input");
    input.className = "name-input";
    input.placeholder = "Ton prénom";
    input.maxLength = 16;
    input.value = state.avatar.name;
    input.addEventListener("input", () => { state.avatar.name = input.value.trim(); save(); });
    wrap.appendChild(input);

    wrap.appendChild(tabsEl(
      [{ id: "base", label: "Personnage" }, { id: "skin", label: "Couleur" }, { id: "acc", label: "Accessoires" }],
      profileTab, id => { profileTab = id; openProfile(); }));

    const grid = document.createElement("div");
    grid.className = "cards";
    const av = state.avatar;
    const option = (img, selected, onPick, label = "") => {
      const c = document.createElement("button");
      c.className = "card" + (selected ? " selected" : "");
      c.innerHTML = img ? `<img src="${IMG(img)}" alt="${label}">` : `<span class="name">${label}</span>`;
      c.addEventListener("click", () => { onPick(); save(); SOUND.pop(); renderAvatars(); openProfile(); });
      grid.appendChild(c);
    };
    if (profileTab === "base") {
      option(`girl_${av.skin}`, av.base === "girl", () => { av.base = "girl"; }, "Fille");
      option(`boy_${av.skin}`, av.base === "boy", () => { av.base = "boy"; }, "Garçon");
    } else if (profileTab === "skin") {
      for (const skin of SKINS) option(`${av.base}_${skin}`, av.skin === skin, () => { av.skin = skin; });
    } else {
      for (const [id, acc] of Object.entries(ACCESSORIES)) {
        option(acc.img, av.acc === id, () => { av.acc = id; }, acc.name);
      }
    }
    wrap.appendChild(grid);
    body.appendChild(wrap);
    renderAvatars();
  });
}

/* =========================================================
   PARAMÈTRES
   ========================================================= */
function openSettings() {
  openModal("Paramètres", body => {
    const s = state.settings;
    const seg = (options, current, onPick) => {
      const box = document.createElement("div");
      box.className = "seg";
      for (const [value, label] of options) {
        const b = document.createElement("button");
        b.textContent = label;
        if (value === current) b.className = "on";
        b.addEventListener("click", () => { onPick(value); save(); SOUND.tap(); openSettings(); });
        box.appendChild(b);
      }
      return box;
    };
    const row = (label, control) => {
      const r = document.createElement("div");
      r.className = "set-row";
      r.innerHTML = `<span>${label}</span>`;
      r.appendChild(control);
      return r;
    };
    const wrap = document.createElement("div");
    wrap.className = "settings";
    wrap.appendChild(row("Son", seg([[true, "Oui"], [false, "Non"]], s.sound, v => { s.sound = v; })));
    if (document.documentElement.requestFullscreen) {
      const fs = document.createElement("button");
      fs.className = "btn btn-cream btn-sm";
      fs.textContent = document.fullscreenElement ? "Quitter" : "Activer";
      fs.addEventListener("click", () => {
        SOUND.tap();
        const done = () => setTimeout(openSettings, 300);
        if (document.fullscreenElement) document.exitFullscreen().then(done, done);
        else document.documentElement.requestFullscreen({ navigationUI: "hide" })
          .then(() => screen.orientation?.lock?.("portrait")).catch(() => {}).finally(done);
      });
      wrap.appendChild(row("Plein écran", fs));
    }
    wrap.appendChild(row("Réponses", seg([["choices", "4 boutons"], ["keypad", "Clavier"]], s.input, v => { s.input = v; })));
    wrap.appendChild(row("Questions par partie", seg([[5, "5"], [10, "10"], [15, "15"]], s.length, v => { s.length = v; })));

    const rows = Object.entries(MODES).map(([id, m]) => {
      const st = state.stats[id];
      const pct = st ? Math.round(100 * st.good / st.total) + " %" : "—";
      return `<tr><td>${m.label}</td><td>${st ? st.played + " partie" + (st.played > 1 ? "s" : "") : ""}</td><td>${pct}</td></tr>`;
    }).join("");
    wrap.insertAdjacentHTML("beforeend",
      `<div><b>Espace parents</b> <small>(réussite du premier coup)</small><table class="stats">${rows}
        <tr><td>Additions réussies</td><td></td><td>${state.counters.correct}</td></tr></table></div>`);

    const reset = document.createElement("button");
    reset.className = "btn btn-red btn-sm";
    reset.textContent = "Recommencer un nouveau monde";
    reset.addEventListener("click", async () => {
      closeModal();
      const ok = await ask({
        title: "Tout effacer ?",
        img: "house",
        name: "Le monde, les étoiles et les progrès seront effacés.",
        buttons: [
          { label: "Non", cls: "btn-grey", value: false },
          { label: "Effacer", cls: "btn-red", value: true },
        ],
      });
      if (!ok) return;
      const { settings, avatar } = state;
      state = Object.assign(freshState(), { settings, avatar });
      placing = null;
      $("layer").innerHTML = "";
      save();
      show("world");
    });
    wrap.appendChild(reset);
    wrap.insertAdjacentHTML("beforeend",
      `<p class="small-print">Images : Fluent Emoji de Microsoft (licence MIT)</p>`);
    body.appendChild(wrap);
  });
}

/* =========================================================
   CHOIX DU JEU
   ========================================================= */
function openModes() {
  openModal("Choisis ton jeu", body => {
    const best = id => {
      const st = state.stats[id];
      return st ? `<span class="best">🏆 ${st.best}/${st.bestOf}</span>` : "";
    };
    const go = id => () => { SOUND.tap(); closeModal(); startQuiz(id); };

    body.insertAdjacentHTML("beforeend", `<h3 class="modes-title">Les tables d'addition</h3>`);
    const tables = document.createElement("div");
    tables.className = "tables";
    for (let n = 1; n <= 9; n++) {
      const id = "t" + n, m = MODES[id];
      const el = document.createElement("button");
      el.className = "table-btn";
      el.style.cssText = `--c:${m.c};--c-dark:${m.dark}`;
      el.setAttribute("aria-label", m.label);
      el.innerHTML = `<img src="${IMG(m.img)}" alt=""><span class="big">+${n}</span>
        <span class="reward">+${m.reward} ⭐</span>${best(id)}`;
      el.addEventListener("click", go(id));
      tables.appendChild(el);
    }
    body.appendChild(tables);

    body.insertAdjacentHTML("beforeend", `<h3 class="modes-title">Les additions mélangées</h3>`);
    const grid = document.createElement("div");
    grid.className = "modes";
    for (const id of ["s10", "s20"]) {
      const m = MODES[id];
      const el = document.createElement("button");
      el.className = "mode";
      el.style.cssText = `--c:${m.c};--c-dark:${m.dark}`;
      el.innerHTML = `
        <img src="${IMG(m.img)}" alt="">
        <span class="big">${m.big}</span>
        <span class="label">${m.label}</span>
        <span class="example">${m.example}</span>
        <span class="reward">+${m.reward} ⭐</span>
        ${best(id)}`;
      el.addEventListener("click", go(id));
      grid.appendChild(el);
    }
    body.appendChild(grid);
  });
}

/* =========================================================
   QUESTIONS
   ========================================================= */
let quiz = null;

function startQuiz(mode) {
  placing = null;
  quiz = {
    mode,
    index: 0,
    length: state.settings.length,
    results: [],
    earned: 0,
    streak: 0,
    tries: 0,
    input: "",
    last: null,
    deck: [],
    busy: false,
  };
  $("mascot").src = IMG(MODES[mode].img);
  const keypad = state.settings.input === "keypad";
  $("keypad").hidden = !keypad;
  $("answers").hidden = keypad;
  renderAvatars();
  show("quiz");
  nextQuestion();
}

function nextQuestion() {
  let q;
  do { q = makeQuestion(quiz.mode, quiz.deck); }
  while (quiz.last && q.a === quiz.last.a && q.b === quiz.last.b && !MODES[quiz.mode].table);
  quiz.q = quiz.last = q;
  quiz.input = "";
  quiz.tries = 0;
  quiz.busy = false;

  $("board").classList.remove("right", "wrong");
  $("feedback").textContent = "";
  $("helper").hidden = true;
  $("btn-help").disabled = false;
  $("bubble").classList.remove("show");
  $("keypad").classList.remove("locked");
  $("quiz-stars").textContent = state.stars;
  $("quiz-progress").style.width = (quiz.index / quiz.length) * 100 + "%";
  renderQuestion();

  const box = $("answers");
  box.classList.remove("locked");
  box.innerHTML = "";
  for (const v of makeChoices(q, quiz.mode)) {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = v;
    b.dataset.v = v;
    b.addEventListener("click", () => answer(v, b));
    box.appendChild(b);
  }
}

function renderQuestion(shown) {
  const { a, b } = quiz.q;
  const value = shown ?? (quiz.input || "?");
  $("question").innerHTML = `${a} + ${b} = <span class="answer">${value}</span>`;
}

function say(text) {
  const b = $("bubble");
  b.innerHTML = text;
  b.classList.remove("show");
  void b.offsetWidth;
  b.classList.add("show");
}

function showHelper() {
  const { a, b } = quiz.q;
  const group = (n, cls) =>
    `<div class="group ${cls}" style="--n:${Math.min(Math.max(n, 1), 5)}">${"<i></i>".repeat(n)}</div>`;
  const h = $("helper");
  h.innerHTML = `${group(a, "a")}<span class="plus">+</span>${group(b, "b")}`;
  h.hidden = false;
  $("btn-help").disabled = true;
}

function answer(value, btn) {
  if (!quiz || quiz.busy) return;
  quiz.tries++;
  const board = $("board");

  if (value === quiz.q.result) {
    quiz.busy = true;
    board.classList.remove("wrong");
    board.classList.add("right");
    $("answers").classList.add("locked");
    $("keypad").classList.add("locked");
    if (btn) btn.classList.add("good");
    renderQuestion(value);

    let gain = 0;
    if (quiz.tries === 1) {
      gain = MODES[quiz.mode].reward;
      quiz.streak++;
      if (quiz.streak % 5 === 0) gain += 2; // bonus série
    } else {
      quiz.streak = 0;
    }
    quiz.earned += gain;
    state.stars += gain;
    state.counters.correct++;
    save();

    let msg = quiz.tries === 1 ? pick(["Bravo !", "Super !", "Génial !", "Parfait !", "Trop fort !", "Oui !"]) : "C'est ça ! 👍";
    if (gain) msg += ` <b>+${gain}</b> ⭐`;
    if (quiz.tries === 1 && quiz.streak % 5 === 0) msg += `<br>🔥 ${quiz.streak} d'affilée !`;
    say(msg);
    $("quiz-stars").textContent = state.stars;
    if (gain) bump($("quiz-stars").parentElement);
    SOUND.good();
    quiz.results.push(quiz.tries === 1);
    setTimeout(advance, 1200);
    return;
  }

  // Mauvaise réponse
  SOUND.bad();
  board.classList.remove("wrong");
  void board.offsetWidth;
  board.classList.add("wrong");
  quiz.streak = 0;
  if (btn) btn.classList.add("bad");

  if (quiz.tries === 1) {
    $("feedback").textContent = "Presque ! Compte les points 👇";
    say("Essaie encore ! 💪");
    showHelper();
    quiz.busy = true;
    setTimeout(() => {
      quiz.busy = false;
      quiz.input = "";
      board.classList.remove("wrong");
      renderQuestion();
    }, 600);
  } else {
    quiz.busy = true;
    $("answers").classList.add("locked");
    $("keypad").classList.add("locked");
    showHelper();
    renderQuestion(quiz.q.result);
    $("answers").querySelector(`[data-v="${quiz.q.result}"]`)?.classList.add("good");
    $("feedback").textContent = `La réponse était ${quiz.q.result}.`;
    say("Tu y arriveras la prochaine fois !");
    quiz.results.push(false);
    setTimeout(advance, 2600);
  }
}

function advance() {
  if (!quiz) return; // partie arrêtée entre-temps
  quiz.index++;
  if (quiz.index >= quiz.length) finishQuiz();
  else nextQuestion();
}

function finishQuiz() {
  $("quiz-progress").style.width = "100%";
  const good = quiz.results.filter(Boolean).length;
  const total = quiz.length;
  const perfect = good === total;
  if (perfect) {
    quiz.earned += 3;
    state.stars += 3;
    state.counters.perfect++;
  }
  const st = state.stats[quiz.mode] || { played: 0, good: 0, total: 0, best: 0, bestOf: total };
  st.played++;
  st.good += good;
  st.total += total;
  if (good / total >= st.best / st.bestOf) { st.best = good; st.bestOf = total; }
  state.stats[quiz.mode] = st;
  save();

  let img, title;
  if (perfect) { img = "trophy"; title = "Sans-faute !"; }
  else if (good >= total * 0.7) { img = "party_popper"; title = "Bravo !"; }
  else if (good >= total * 0.4) { img = "glowing_star"; title = "Bien joué !"; }
  else { img = "seedling"; title = "Tu progresses !"; }

  SOUND.win();
  if (good >= total * 0.7) confetti();

  const mode = quiz.mode;
  openModal(title, body => {
    body.innerHTML = `
      <div class="result">
        <img src="${IMG(img)}" alt="">
        <p>${good} bonne${good > 1 ? "s" : ""} réponse${good > 1 ? "s" : ""} du premier coup sur ${total}${perfect ? "<br>Bonus sans-faute : +3 ⭐ !" : ""}</p>
        <div class="won">+${quiz.earned}<img src="${IMG("star")}" alt="étoiles"></div>
        <button class="btn btn-green" id="btn-again">🔁 Encore !</button>
        <button class="btn btn-cream" id="btn-build">🏡 Construire mon monde</button>
      </div>`;
  });
  // Fermer la fenêtre de résultat ramène au monde, sauf si on rejoue
  onModalClose = () => show("world");
  $("btn-again").addEventListener("click", () => { onModalClose = null; closeModal(); startQuiz(mode); });
  $("btn-build").addEventListener("click", () => closeModal());
}

/* ---------- clavier ---------- */
function press(key) {
  if (!quiz || quiz.busy) return;
  if (key === "del") {
    quiz.input = quiz.input.slice(0, -1);
  } else if (key === "ok") {
    if (quiz.input !== "") answer(parseInt(quiz.input, 10), null);
    return;
  } else if (quiz.input.length < 2) {
    quiz.input = (quiz.input === "0" ? "" : quiz.input) + key;
  }
  SOUND.tap();
  renderQuestion();
}
$("keypad").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (btn) press(btn.dataset.k || btn.textContent);
});
document.addEventListener("keydown", e => {
  if (!isActive("quiz") || !$("overlay").hidden || state.settings.input !== "keypad") return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === "Backspace") press("del");
  else if (e.key === "Enter") press("ok");
});

$("btn-help").addEventListener("click", () => { SOUND.tap(); showHelper(); });

$("quiz-quit").addEventListener("click", async () => {
  if (quiz && quiz.results.length > 0) {
    const ok = await ask({
      title: "Arrêter ?",
      img: "star",
      name: "Tu gardes les étoiles déjà gagnées.",
      buttons: [
        { label: "Continuer", cls: "btn-green", value: false },
        { label: "Arrêter", cls: "btn-grey", value: true },
      ],
    });
    if (!ok) return;
  }
  quiz = null;
  show("world");
});

/* =========================================================
   NAVIGATION
   ========================================================= */
const PANELS = { build: openBuild, decos: openDecos, animals: openAnimals, quests: openQuests };
document.querySelectorAll(".menu-btn").forEach(btn => btn.addEventListener("click", () => {
  SOUND.tap();
  placing = null;
  targetPlot = null;
  renderPlacing();
  btn.classList.add("active");
  PANELS[btn.dataset.panel]();
}));

$("btn-play").addEventListener("click", () => {
  SOUND.tap();
  placing = null;
  renderPlacing();
  openModes();
});
$("btn-start").addEventListener("click", () => { SOUND.good(); show("world"); });
$("btn-title-settings").addEventListener("click", () => { SOUND.tap(); openSettings(); });
$("btn-title-profile").addEventListener("click", () => { SOUND.tap(); openProfile(); });
$("btn-settings").addEventListener("click", () => { SOUND.tap(); openSettings(); });
$("btn-profile").addEventListener("click", () => { SOUND.tap(); openProfile(); });

window.addEventListener("resize", () => { if (isActive("world")) sizeMap(); });

/* ---------- plein écran ---------- */
// Une fois installé, le manifeste ouvre déjà le jeu en plein écran.
// Dans le navigateur, on le demande au premier toucher (il faut un geste).
function goFullscreen() {
  const installed = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches;
  const el = document.documentElement;
  if (installed || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: "hide" })
    .then(() => screen.orientation?.lock?.("portrait"))
    .catch(() => {});
}
document.addEventListener("pointerup", goFullscreen, { once: true });

/* ---------- démarrage ---------- */
renderAvatars();
document.fonts?.ready.then(() => { if (isActive("world")) sizeMap(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
