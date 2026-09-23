/* =========================================================
   MON VILLAGE DES CALCULS
   Répondre à des additions rapporte des étoiles ⭐,
   qui servent à construire son village.
   Tout est enregistré sur l'appareil (localStorage).
   ========================================================= */
"use strict";

/* ---------- entraînements ---------- */
const MODES = {
  t1:  { label: "Table de 1", big: "+1",  example: "5 + 1", animal: "🐣", reward: 1,
         colors: ["#F2C14E", "#C7951F", "#FFF1C2"] },
  t2:  { label: "Table de 2", big: "+2",  example: "6 + 2", animal: "🐰", reward: 1,
         colors: ["#E98FB0", "#C0607F", "#FFE3EC"] },
  s10: { label: "Jusqu'à 10", big: "≤10", example: "4 + 3", animal: "🦊", reward: 1,
         colors: ["#F0924A", "#C4651F", "#FFE5D1"] },
  s20: { label: "Jusqu'à 20", big: "≤20", example: "9 + 7", animal: "🐻", reward: 2,
         colors: ["#6FA8DC", "#3F77AE", "#DDEEFF"] },
};

const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function makeQuestion(mode) {
  let a, b;
  if (mode === "t1" || mode === "t2") {
    const n = mode === "t1" ? 1 : 2;
    const x = rand(0, 10);
    // La table peut être posée dans les deux sens : 1 + 7 ou 7 + 1
    [a, b] = Math.random() < 0.5 ? [x, n] : [n, x];
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

/* ---------- constructions ---------- */
// level = niveau du village requis pour débloquer la construction
const BUILDINGS = [
  { id: "flower",   emoji: "🌷", name: "Fleurs",     cost: 2,   level: 1, pop: 0 },
  { id: "tree",     emoji: "🌳", name: "Arbre",      cost: 3,   level: 1, pop: 0 },
  { id: "house",    emoji: "🏠", name: "Maison",     cost: 8,   level: 1, pop: 3 },
  { id: "field",    emoji: "🌾", name: "Champ",      cost: 6,   level: 2, pop: 0 },
  { id: "pine",     emoji: "🌲", name: "Sapin",      cost: 4,   level: 2, pop: 0 },
  { id: "cow",      emoji: "🐄", name: "Vache",      cost: 10,  level: 2, pop: 0 },
  { id: "garden",   emoji: "🏡", name: "Jolie maison", cost: 15, level: 3, pop: 5 },
  { id: "fountain", emoji: "⛲", name: "Fontaine",   cost: 12,  level: 3, pop: 0 },
  { id: "shop",     emoji: "🏪", name: "Magasin",    cost: 25,  level: 4, pop: 2 },
  { id: "school",   emoji: "🏫", name: "École",      cost: 40,  level: 4, pop: 4 },
  { id: "tent",     emoji: "🎪", name: "Cirque",     cost: 50,  level: 5, pop: 2 },
  { id: "hospital", emoji: "🏥", name: "Hôpital",    cost: 60,  level: 5, pop: 6 },
  { id: "building", emoji: "🏢", name: "Immeuble",   cost: 70,  level: 6, pop: 15 },
  { id: "wheel",    emoji: "🎡", name: "Grande roue", cost: 80, level: 6, pop: 0 },
  { id: "stadium",  emoji: "🏟️", name: "Stade",      cost: 100, level: 7, pop: 5 },
  { id: "castle",   emoji: "🏰", name: "Château",    cost: 150, level: 7, pop: 10 },
];
const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
// Ces constructions se balancent doucement dans le vent
const SWAYS = new Set(["flower", "tree", "pine", "field"]);

// Le niveau monte avec la valeur totale des constructions
const LEVELS = [
  { name: "Clairière",   min: 0 },
  { name: "Hameau",      min: 20 },
  { name: "Petit village", min: 60 },
  { name: "Village",     min: 140 },
  { name: "Gros village", min: 260 },
  { name: "Bourg",       min: 450 },
  { name: "Petite ville", min: 700 },
  { name: "Grande ville", min: 1100 },
];

const COLS = 5;
const START_ROWS = 4;
const MAX_ROWS = 10;
const expandCost = rows => (rows - START_ROWS + 1) * 15;

/* ---------- sauvegarde ---------- */
const SAVE_KEY = "village-calculs-v1";

function freshState() {
  return {
    name: "Mon village",
    stars: 5, // petit cadeau pour construire tout de suite
    rows: START_ROWS,
    tiles: {},         // "x,y" -> id de construction
    sound: true,
    length: 10,
    stats: {},         // mode -> { played, good, total, best }
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved) return Object.assign(freshState(), saved);
  } catch (e) { /* stockage indisponible : on repart de zéro */ }
  return freshState();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignoré */ }
}

let state = load();

/* ---------- utilitaires d'interface ---------- */
const $ = id => document.getElementById(id);

function show(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  if (name === "village") renderVillage();
  if (name === "modes") renderModes();
}

let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

function confetti(symbols = ["⭐", "🎉", "✨", "🌟"]) {
  const box = $("confetti");
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.textContent = symbols[i % symbols.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.animationDelay = Math.random() * 0.5 + "s";
    box.appendChild(s);
    setTimeout(() => s.remove(), 2300);
  }
}

function bump(el) {
  el.classList.remove("bump");
  void el.offsetWidth;
  el.classList.add("bump");
}

/* ---------- sons (générés, sans fichiers) ---------- */
let audio;
function beep(notes) {
  if (!state.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    let t = audio.currentTime;
    for (const [freq, dur] of notes) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur * 0.8;
    }
  } catch (e) { /* pas de son, tant pis */ }
}
const SOUND = {
  good:  () => beep([[660, .12], [880, .2]]),
  bad:   () => beep([[300, .25]]),
  build: () => beep([[523, .1], [659, .1], [784, .18]]),
  win:   () => beep([[523, .12], [659, .12], [784, .12], [1047, .35]]),
  tap:   () => beep([[500, .05]]),
};

/* =========================================================
   VILLAGE
   ========================================================= */
let selected = null; // id de construction, "remove", ou null

function villageValue() {
  return Object.values(state.tiles).reduce((sum, id) => sum + (BY_ID[id]?.cost || 0), 0);
}

function levelInfo() {
  const value = villageValue();
  let i = 0;
  while (i + 1 < LEVELS.length && value >= LEVELS[i + 1].min) i++;
  const next = LEVELS[i + 1];
  const progress = next ? (value - LEVELS[i].min) / (next.min - LEVELS[i].min) : 1;
  return { level: i + 1, name: LEVELS[i].name, progress };
}

function population() {
  return Object.values(state.tiles).reduce((sum, id) => sum + (BY_ID[id]?.pop || 0), 0);
}

function renderVillage() {
  $("village-name").textContent = state.name;
  $("stars").textContent = state.stars;
  $("population").textContent = population();

  const lvl = levelInfo();
  $("level-name").textContent = `Niv. ${lvl.level} · ${lvl.name}`;
  $("level-progress").style.width = Math.round(lvl.progress * 100) + "%";

  // Boutique et texte d'abord : l'île prend la place qui reste
  renderShop(lvl.level);
  updateHint();
  renderMap();
}

function renderMap() {
  const map = $("map");
  map.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  // L'île doit tenir dans la place disponible (largeur et hauteur)
  const wrap = map.parentElement;
  const extra = 24 + 22 + (state.rows < MAX_ROWS ? 56 : 0); // marges, falaise, panneau
  const tile = Math.min((wrap.clientWidth - 24) / COLS, (wrap.clientHeight - extra) / state.rows);
  map.style.width = Math.max(200, tile * COLS + 24) + "px";

  map.innerHTML = "";
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = x + "," + y;
      const tile = document.createElement("button");
      tile.className = "tile" + (x % 2 ? " alt" : "");
      tile.dataset.key = key;
      const id = state.tiles[key];
      if (id) {
        const b = document.createElement("span");
        b.className = "b" + (SWAYS.has(id) ? " sway" : "");
        b.textContent = BY_ID[id].emoji;
        tile.appendChild(b);
        tile.setAttribute("aria-label", BY_ID[id].name);
      } else {
        // Décor fixe (toujours au même endroit) : touffes d'herbe et cailloux
        const h = (x * 7 + y * 13) % 9;
        if (h === 0 || h === 4) tile.classList.add("tuft");
        if (h === 4) tile.classList.add("t2");
        if (h === 7) tile.classList.add("pebble");
        tile.setAttribute("aria-label", "Herbe");
      }
      if (selected === "remove") tile.classList.add("removable");
      else if (selected && !id) tile.classList.add("can-build");
      tile.addEventListener("click", () => onTile(key, tile));
      map.appendChild(tile);
    }
  }

  // Dernière rangée : agrandir le terrain
  if (state.rows < MAX_ROWS) {
    const cost = expandCost(state.rows);
    const btn = document.createElement("button");
    btn.className = "tile expand";
    btn.style.gridColumn = `1 / span ${COLS}`;
    btn.style.aspectRatio = "auto";
    btn.textContent = `🚜 Agrandir : ${cost} ⭐`;
    btn.addEventListener("click", () => expand(cost));
    map.appendChild(btn);
  }
}

function renderShop(level) {
  const shop = $("shop");
  shop.innerHTML = "";

  for (const b of BUILDINGS) {
    const el = document.createElement("button");
    el.className = "item";
    const locked = b.level > level;
    if (locked) el.classList.add("locked");
    else if (b.cost > state.stars) el.classList.add("too-expensive");
    if (selected === b.id) el.classList.add("selected");
    el.innerHTML = locked
      ? `<span class="emo">🔒</span><span class="name">Niveau ${b.level}</span><span class="cost">${b.cost} ⭐</span>`
      : `<span class="emo">${b.emoji}</span><span class="name">${b.name}</span><span class="cost">${b.cost} ⭐</span>`;
    el.addEventListener("click", () => {
      SOUND.tap();
      if (locked) return toast(`🔒 Fais grandir ton village jusqu'au niveau ${b.level} !`);
      if (b.cost > state.stars) return toast(`Il te manque ${b.cost - state.stars} ⭐`);
      selected = selected === b.id ? null : b.id;
      renderVillage();
    });
    shop.appendChild(el);
  }

  const rm = document.createElement("button");
  rm.className = "item tool" + (selected === "remove" ? " selected" : "");
  rm.innerHTML = `<span class="emo">🧹</span><span class="name">Enlever</span><span class="cost">½ ⭐</span>`;
  rm.addEventListener("click", () => {
    SOUND.tap();
    selected = selected === "remove" ? null : "remove";
    renderVillage();
  });
  shop.appendChild(rm);
}

function updateHint() {
  const hint = $("hint");
  if (selected === "remove") hint.textContent = "Touche une construction pour l'enlever (tu récupères la moitié des étoiles).";
  else if (selected) hint.textContent = `Touche un carré d'herbe pour poser : ${BY_ID[selected].emoji} ${BY_ID[selected].name}`;
  else if (Object.keys(state.tiles).length === 0) hint.textContent = "Choisis une construction en bas, puis touche un carré d'herbe.";
  else hint.textContent = "Réponds à des additions pour gagner des étoiles ⭐";
}

function onTile(key, tileEl) {
  const current = state.tiles[key];

  if (selected === "remove") {
    if (!current) return;
    const refund = Math.floor(BY_ID[current].cost / 2);
    delete state.tiles[key];
    state.stars += refund;
    save();
    SOUND.tap();
    toast(`🧹 +${refund} ⭐`);
    renderVillage();
    return;
  }

  if (current) {
    // Toucher une construction la fait bouger
    tileEl.classList.remove("wiggle");
    void tileEl.offsetWidth;
    tileEl.classList.add("wiggle");
    SOUND.tap();
    return toast(BY_ID[current].emoji + " " + BY_ID[current].name);
  }

  if (!selected) {
    return toast("Choisis d'abord une construction en bas 👇");
  }

  const b = BY_ID[selected];
  if (b.cost > state.stars) {
    selected = null;
    renderVillage();
    return toast(`Il te manque ${b.cost - state.stars} ⭐`);
  }

  const before = levelInfo().level;
  state.stars -= b.cost;
  state.tiles[key] = b.id;
  if (b.cost > state.stars) selected = null; // plus assez pour en poser un autre
  save();
  SOUND.build();
  renderVillage();
  const built = document.querySelector(`.tile[data-key="${key}"]`);
  if (built) {
    built.classList.add("just-built");
    puff(built);
  }

  const after = levelInfo();
  if (after.level > before) {
    SOUND.win();
    confetti(["🎉", "🏠", "⭐", "🌳"]);
    toast(`🎉 Ton village devient : ${after.name} !`);
  }
}

function puff(tile) {
  for (let i = 0; i < 5; i++) {
    const p = document.createElement("span");
    p.className = "puff";
    p.textContent = i % 2 ? "✨" : "💨";
    const angle = (i / 5) * Math.PI * 2;
    p.style.setProperty("--dx", Math.cos(angle) * 40 + "px");
    p.style.setProperty("--dy", Math.sin(angle) * 30 + "px");
    tile.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function expand(cost) {
  if (state.stars < cost) {
    SOUND.tap();
    return toast(`Il te faut ${cost} ⭐ pour agrandir (il en manque ${cost - state.stars})`);
  }
  state.stars -= cost;
  state.rows++;
  save();
  SOUND.build();
  toast("🚜 Nouveau terrain !");
  renderVillage();
}

$("village-name").addEventListener("click", () => {
  const name = prompt("Comment s'appelle ton village ?", state.name);
  if (name && name.trim()) {
    state.name = name.trim().slice(0, 24);
    save();
    renderVillage();
  }
});

/* =========================================================
   CHOIX DU JEU
   ========================================================= */
function renderModes() {
  const box = $("modes");
  box.innerHTML = "";
  for (const [id, m] of Object.entries(MODES)) {
    const st = state.stats[id];
    const el = document.createElement("button");
    el.className = "mode";
    const [c, dark, light] = m.colors;
    el.style.cssText = `--c:${c};--c-dark:${dark};--c-light:${light}`;
    el.innerHTML = `
      <span class="animal">${m.animal}</span>
      <span class="big">${m.big}</span>
      <span class="label">${m.label}</span>
      <span class="example">${m.example}</span>
      <span class="reward">+${m.reward} ⭐</span>
      ${st ? `<span class="best">🏆 ${st.best}/${st.bestOf}</span>` : ""}`;
    el.addEventListener("click", () => startQuiz(id));
    box.appendChild(el);
  }
}

/* =========================================================
   QUESTIONS
   ========================================================= */
let quiz = null;

function startQuiz(mode) {
  quiz = {
    mode,
    index: 0,
    length: state.length,
    results: [],   // true / false par question
    earned: 0,
    streak: 0,
    tries: 0,
    input: "",
    last: null,
    busy: false,
  };
  $("mascot").textContent = MODES[mode].animal;
  show("quiz");
  nextQuestion();
}

function nextQuestion() {
  let q;
  do { q = makeQuestion(quiz.mode); }
  while (quiz.last && q.a === quiz.last.a && q.b === quiz.last.b);
  quiz.q = quiz.last = q;
  quiz.input = "";
  quiz.tries = 0;
  quiz.busy = false;

  $("question-card").classList.remove("right", "wrong");
  $("feedback").textContent = "";
  $("helper").hidden = true;
  $("btn-help").disabled = false;
  $("keypad").classList.remove("locked");
  renderQuestion();
  renderDots();
}

function renderQuestion() {
  const { a, b } = quiz.q;
  $("question").innerHTML = `${a} + ${b} = <span class="answer" id="answer">${quiz.input || "?"}</span>`;
  $("quiz-stars").textContent = state.stars;
}

function renderDots() {
  const box = $("quiz-dots");
  box.innerHTML = "";
  for (let i = 0; i < quiz.length; i++) {
    const d = document.createElement("span");
    if (i < quiz.results.length) d.className = quiz.results[i] ? "good" : "bad";
    else if (i === quiz.index) d.className = "current";
    box.appendChild(d);
  }
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

function press(key) {
  if (!quiz || quiz.busy) return;
  if (key === "del") {
    quiz.input = quiz.input.slice(0, -1);
  } else if (key === "ok") {
    if (quiz.input !== "") check();
    return;
  } else if (quiz.input.length < 2) {
    quiz.input = (quiz.input === "0" ? "" : quiz.input) + key;
  }
  SOUND.tap();
  renderQuestion();
}

function check() {
  const value = parseInt(quiz.input, 10);
  const card = $("question-card");
  quiz.tries++;

  if (value === quiz.q.result) {
    card.classList.remove("wrong");
    card.classList.add("right");
    quiz.busy = true;
    $("keypad").classList.add("locked");

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
    save();

    const praise = ["Bravo !", "Super !", "Génial !", "Parfait !", "Trop fort !", "Oui !"];
    let msg = praise[rand(0, praise.length - 1)];
    if (gain) msg += ` +${gain} ⭐`;
    if (quiz.tries === 1 && quiz.streak % 5 === 0) msg += " 🔥 Série de " + quiz.streak + " !";
    if (quiz.tries > 1) msg = "C'est ça ! 👍";
    $("feedback").textContent = msg;
    $("quiz-stars").textContent = state.stars;
    if (gain) bump($("quiz-stars").parentElement);
    SOUND.good();

    quiz.results.push(quiz.tries === 1);
    setTimeout(advance, 1100);
    return;
  }

  // Mauvaise réponse
  SOUND.bad();
  card.classList.remove("wrong");
  void card.offsetWidth;
  card.classList.add("wrong");
  quiz.streak = 0;

  if (quiz.tries === 1) {
    $("feedback").textContent = "Presque ! Essaie encore 💪";
    showHelper();
    quiz.busy = true;
    setTimeout(() => {
      quiz.busy = false;
      quiz.input = "";
      card.classList.remove("wrong");
      renderQuestion();
    }, 700);
  } else {
    // Deuxième erreur : on montre la réponse et on passe à la suite
    quiz.busy = true;
    $("keypad").classList.add("locked");
    showHelper();
    quiz.input = String(quiz.q.result);
    renderQuestion();
    $("feedback").textContent = `La réponse était ${quiz.q.result}. Tu y arriveras la prochaine fois !`;
    quiz.results.push(false);
    setTimeout(advance, 2600);
  }
}

function advance() {
  quiz.index++;
  if (quiz.index >= quiz.length) finishQuiz();
  else nextQuestion();
}

function finishQuiz() {
  const good = quiz.results.filter(Boolean).length;
  const total = quiz.length;
  const perfect = good === total;
  if (perfect) {
    quiz.earned += 3;
    state.stars += 3;
  }

  const st = state.stats[quiz.mode] || { played: 0, good: 0, total: 0, best: 0, bestOf: total };
  st.played++;
  st.good += good;
  st.total += total;
  if (good / total >= st.best / st.bestOf) { st.best = good; st.bestOf = total; }
  state.stats[quiz.mode] = st;
  save();

  let emoji, title;
  if (perfect) { emoji = "🏆"; title = "Parfait !"; }
  else if (good >= total * 0.7) { emoji = "🎉"; title = "Bravo !"; }
  else if (good >= total * 0.4) { emoji = "👍"; title = "Bien joué !"; }
  else { emoji = "💪"; title = "Continue, tu progresses !"; }

  $("result-emoji").textContent = emoji;
  $("result-title").textContent = title;
  $("result-text").textContent =
    `${good} bonne${good > 1 ? "s" : ""} réponse${good > 1 ? "s" : ""} du premier coup sur ${total}` +
    (perfect ? " — bonus +3 ⭐ !" : "");
  $("result-stars").textContent = quiz.earned;
  show("result");
  SOUND.win();
  if (good >= total * 0.7) confetti();
}

/* ---------- clavier ---------- */
$("keypad").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (btn) press(btn.dataset.k || btn.textContent);
});

// Clavier physique (pratique sur tablette ou ordinateur)
document.addEventListener("keydown", e => {
  if (!$("screen-quiz").classList.contains("active")) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === "Backspace") press("del");
  else if (e.key === "Enter") press("ok");
});

$("btn-help").addEventListener("click", () => { SOUND.tap(); showHelper(); });

$("quiz-quit").addEventListener("click", () => {
  if (quiz && quiz.results.length > 0 && !confirm("Arrêter la partie ? Tu gardes les étoiles déjà gagnées.")) return;
  quiz = null;
  show("modes");
});

/* =========================================================
   NAVIGATION & RÉGLAGES
   ========================================================= */
document.querySelectorAll("[data-go]").forEach(btn =>
  btn.addEventListener("click", () => { selected = null; show(btn.dataset.go); }));

$("btn-play").addEventListener("click", () => { selected = null; show("modes"); });
$("btn-again").addEventListener("click", () => startQuiz(quiz.mode));

function renderSoundBtn() { $("btn-sound").textContent = state.sound ? "🔊" : "🔇"; }
$("btn-sound").addEventListener("click", () => {
  state.sound = !state.sound;
  save();
  renderSoundBtn();
});

$("btn-settings").addEventListener("click", () => {
  $("opt-length").value = String(state.length);
  const rows = Object.entries(MODES).map(([id, m]) => {
    const st = state.stats[id];
    const pct = st ? Math.round(100 * st.good / st.total) + " %" : "—";
    return `<tr><td>${m.label}</td><td>${st ? st.played + " partie(s)" : ""}</td><td>${pct}</td></tr>`;
  }).join("");
  $("stats").innerHTML = `<table>${rows}</table>`;
  $("settings").showModal();
});

$("opt-length").addEventListener("change", e => {
  state.length = parseInt(e.target.value, 10);
  save();
});

$("btn-close-settings").addEventListener("click", () => $("settings").close());

$("btn-reset").addEventListener("click", () => {
  if (!confirm("Effacer le village, les étoiles et les statistiques ?")) return;
  const { sound, length } = state;
  state = Object.assign(freshState(), { sound, length });
  save();
  $("settings").close();
  selected = null;
  show("village");
});

window.addEventListener("resize", () => {
  if ($("screen-village").classList.contains("active")) renderMap();
});

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
renderSoundBtn();
show("village");
document.fonts?.ready.then(() => {
  if ($("screen-village").classList.contains("active")) renderMap();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
