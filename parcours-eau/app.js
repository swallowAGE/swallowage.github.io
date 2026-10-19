'use strict';

/* ---------- Réglages (à adapter) ---------- */
const CONFIG = {
  center: [47.74, 0.40],            // centre de la carte [lat, lon]
  zoom: 10,
  bbox: [0.2, 47.6, 0.6, 47.9],     // emprise des données : lon min, lat min, lon max, lat max
  years: [2024, 2023, 2022, 2021],  // années testées, de la plus récente à la plus ancienne
  api: 'https://hubeau.eaufrance.fr/api/v1',
  overpass: 'https://overpass-api.de/api/interpreter',
};

/* ---------- Outils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const titleCase = s => String(s || '').toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const nf = new Intl.NumberFormat('fr-FR');
const fmtDate = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

async function getJSON(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* ---------- Carte ---------- */
const map = L.map('map', { scrollWheelZoom: false }).setView(CONFIG.center, CONFIG.zoom);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>',
}).addTo(map);

const layers = {
  captages: L.layerGroup(),
  traitement: L.layerGroup(),
  stockage: L.layerGroup(),
  commune: L.layerGroup(),
};

const state = { bounds: null, communes: new Map(), commune: null, year: null, step: 'source' };

const STEPS = {
  source:     { layers: [],                       view: 'default' },
  captage:    { layers: ['captages'],             view: 'captages' },
  protection: { layers: ['captages'],             view: 'captages' },
  traitement: { layers: ['captages', 'traitement'], view: 'captages' },
  stockage:   { layers: ['stockage'],             view: 'captages' },
  reseau:     { layers: ['stockage', 'commune'],  view: 'commune', zoom: 11 },
  robinet:    { layers: ['commune'],              view: 'commune', zoom: 12 },
  retour:     { layers: [],                       view: 'default' },
};

function applyStep(id) {
  const cfg = STEPS[id];
  if (!cfg) return;
  state.step = id;
  Object.entries(layers).forEach(([name, layer]) => {
    if (cfg.layers.includes(name)) layer.addTo(map); else map.removeLayer(layer);
  });
  if (cfg.view === 'captages' && state.bounds) {
    map.flyToBounds(state.bounds, { duration: 1.1 });
  } else if (cfg.view === 'commune' && state.commune) {
    map.flyTo([state.commune.lat, state.commune.lon], cfg.zoom, { duration: 1.1 });
  } else {
    map.flyTo(CONFIG.center, CONFIG.zoom, { duration: 1.1 });
  }
}

const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.step').forEach(s => s.classList.toggle('active', s === e.target));
    applyStep(e.target.dataset.step);
  });
}, { rootMargin: '-45% 0px -45% 0px' });
$$('.step').forEach(s => observer.observe(s));

/* ---------- Captages (Hub'Eau, Prélèvements en eau / BNPE) ---------- */
async function loadCaptages() {
  const out = $('#stat-captage');
  try {
    let rows = [], year = null;
    for (const y of CONFIG.years) {
      const url = `${CONFIG.api}/prelevements/chroniques?bbox=${CONFIG.bbox.join(',')}&code_usage=AEP&annee=${y}&size=1000&format=json`;
      const json = await getJSON(url);
      if (json.data && json.data.length) { rows = json.data; year = y; break; }
    }
    if (!rows.length) throw new Error('aucune donnée');
    state.year = year;

    // Un ouvrage peut apparaître plusieurs fois : on additionne ses volumes.
    const byOuvrage = new Map();
    rows.forEach(r => {
      if (r.latitude == null || r.longitude == null) return;
      const o = byOuvrage.get(r.code_ouvrage) || {
        nom: r.nom_ouvrage, commune: r.nom_commune, insee: r.code_commune_insee,
        lat: r.latitude, lon: r.longitude, volume: 0,
      };
      o.volume += Number(r.volume) || 0;
      byOuvrage.set(r.code_ouvrage, o);
    });

    const ouvrages = [...byOuvrage.values()];
    const pts = [];
    let total = 0;
    ouvrages.forEach(o => {
      total += o.volume;
      pts.push([o.lat, o.lon]);
      const radius = Math.min(26, 6 + 4 * Math.sqrt(o.volume / 100000));
      L.circleMarker([o.lat, o.lon], {
        radius, color: '#0b5c8a', weight: 2, fillColor: '#2aa7d8', fillOpacity: 0.6,
      }).bindPopup(
        `<b>${esc(titleCase(o.nom))}</b><br>${esc(o.commune)}<br>` +
        `${nf.format(Math.round(o.volume))} m³ prélevés en ${year}`
      ).addTo(layers.captages);

      // Liste des communes : on garde pour chacune l'ouvrage le plus important.
      const c = state.communes.get(o.insee);
      if (!c || o.volume > c.volume) {
        state.communes.set(o.insee, { nom: o.commune, lat: o.lat, lon: o.lon, volume: o.volume });
      }
    });

    state.bounds = L.latLngBounds(pts).pad(0.15);
    out.innerHTML =
      `<b>${ouvrages.length} ouvrages</b> déclarés pour l'eau potable dans la zone, ` +
      `<b>${(total / 1e6).toFixed(1).replace('.', ',')} million de m³</b> prélevés en ${year} ` +
      `(environ ${nf.format(Math.round(total / 365))} m³ par jour).`;

    fillCommunes();
    if (STEPS[state.step].layers.includes('captages')) applyStep(state.step);
  } catch (e) {
    out.textContent = "Les données de captages sont momentanément indisponibles. Rechargez la page dans un instant.";
    $('#reseau-info').textContent = 'Données indisponibles.';
    $('#qualite-info').textContent = 'Données indisponibles.';
  }
}

/* ---------- Communes, réseau et qualité (Hub'Eau, Qualité de l'eau potable) ---------- */
function fillCommunes() {
  const list = [...state.communes.entries()].sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr'));
  const best = [...state.communes.entries()].sort((a, b) => b[1].volume - a[1].volume)[0];
  $$('.commune-select').forEach(sel => {
    sel.innerHTML = list.map(([code, c]) => `<option value="${esc(code)}">${esc(c.nom)}</option>`).join('');
    sel.addEventListener('change', () => selectCommune(sel.value));
  });
  if (best) selectCommune(best[0]);
}

function selectCommune(code) {
  const c = state.communes.get(code);
  if (!c) return;
  state.commune = { code, ...c };
  $$('.commune-select').forEach(sel => { sel.value = code; });
  layers.commune.clearLayers();
  L.circleMarker([c.lat, c.lon], { radius: 11, color: '#d98f1e', weight: 3, fillColor: '#f5c26b', fillOpacity: 0.5 })
    .bindTooltip(c.nom, { permanent: false }).addTo(layers.commune);
  if (STEPS[state.step].view === 'commune') applyStep(state.step);
  loadReseau(code);
  loadQualite(code);
}

async function loadReseau(code) {
  const out = $('#reseau-info');
  out.textContent = 'Chargement…';
  try {
    const json = await getJSON(`${CONFIG.api}/qualite_eau_potable/communes_udi?code_commune=${encodeURIComponent(code)}&size=100&format=json`);
    const rows = json.data || [];
    if (!rows.length) { out.textContent = "Aucun réseau référencé pour cette commune."; return; }
    const last = rows.reduce((m, r) => Math.max(m, Number(r.annee) || 0), 0);
    const names = [...new Set(rows.filter(r => Number(r.annee) === last).map(r => titleCase(r.nom_reseau)))];
    out.innerHTML = `En ${last}, <b>${esc(state.commune.nom)}</b> est desservie par ` +
      (names.length > 1 ? `<b>${names.length} réseaux</b> : ` : `le réseau `) + `<b>${esc(names.join(', '))}</b>.`;
  } catch (e) {
    out.textContent = 'Information momentanément indisponible.';
  }
}

async function loadQualite(code) {
  const out = $('#qualite-info');
  out.textContent = 'Chargement…';
  try {
    const url = `${CONFIG.api}/qualite_eau_potable/resultats_dis?code_commune=${encodeURIComponent(code)}&code_parametre=1340&size=1&sort=desc&format=json`;
    const json = await getJSON(url);
    const r = (json.data || [])[0];
    if (!r) { out.textContent = "Aucun résultat d'analyse des nitrates publié pour cette commune."; return; }

    const limites = [r.conformite_limites_bact_prelevement, r.conformite_limites_pc_prelevement];
    const refs = [r.conformite_references_bact_prelevement, r.conformite_references_pc_prelevement];
    let badge = '<span class="badge">Conformité non précisée</span>';
    if (limites.includes('N')) badge = '<span class="badge ko">Non conforme aux limites de qualité</span>';
    else if (limites.every(v => v === 'C')) badge = '<span class="badge ok">Conforme aux limites de qualité</span>';

    const refNote = refs.includes('N')
      ? `<p class="note">Une <i>référence</i> de qualité n'est pas respectée sur ce prélèvement. Ce sont des indicateurs de confort ou de bon fonctionnement du réseau, pas des limites sanitaires.</p>`
      : '';

    out.innerHTML = `${badge}
      <p>${esc(r.conclusion_conformite_prelevement || '')}</p>
      <dl class="kv">
        <dt>Dernier prélèvement</dt><dd>${esc(fmtDate(r.date_prelevement))}</dd>
        <dt>${esc(r.libelle_parametre || 'Nitrates')}</dt><dd>${esc(r.resultat_alphanumerique || r.resultat_numerique)} ${esc(r.libelle_unite || '')}</dd>
        <dt>Limite de qualité</dt><dd>${esc(r.limite_qualite_parametre || '—')}</dd>
      </dl>${refNote}
      <p class="note">Résultat du contrôle sanitaire officiel, pour la commune de ${esc(state.commune.nom)}.</p>`;
  } catch (e) {
    out.textContent = 'Résultats momentanément indisponibles.';
  }
}

/* ---------- Châteaux d'eau et usines de traitement (OpenStreetMap, facultatif) ---------- */
async function loadOSM() {
  const [w, s, e, n] = [CONFIG.bbox[0], CONFIG.bbox[1], CONFIG.bbox[2], CONFIG.bbox[3]];
  const box = `${s},${w},${n},${e}`;
  const q = `[out:json][timeout:25];(
    nwr["man_made"="water_tower"](${box});
    nwr["man_made"="storage_tank"]["content"="water"](${box});
    nwr["man_made"="reservoir_covered"](${box});
    nwr["man_made"="water_works"](${box});
  );out center;`;
  const statStock = $('#stat-stockage'), statTrait = $('#stat-traitement');
  try {
    const json = await getJSON(CONFIG.overpass, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(q),
    });
    let nStock = 0, nTrait = 0;
    (json.elements || []).forEach(el => {
      const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
      if (lat == null || lon == null) return;
      const t = el.tags || {};
      const isTrait = t.man_made === 'water_works';
      const label = t.name ? esc(t.name) : (isTrait ? 'Usine ou station de traitement' : (t.man_made === 'water_tower' ? "Château d'eau" : "Réservoir d'eau"));
      L.circleMarker([lat, lon], {
        radius: 7, weight: 2,
        color: isTrait ? '#7a4bb0' : '#b8561f',
        fillColor: isTrait ? '#a77bd6' : '#e8884a', fillOpacity: 0.75,
      }).bindPopup(`<b>${label}</b><br><small>Source : OpenStreetMap</small>`)
        .addTo(isTrait ? layers.traitement : layers.stockage);
      if (isTrait) nTrait++; else nStock++;
    });
    const caveat = ' Liste non exhaustive : elle dépend de ce que les contributeurs ont cartographié.';
    statStock.textContent = nStock
      ? `${nStock} château(x) d'eau ou réservoir(s) repéré(s) sur la carte (violet : traitement, orange : stockage).${caveat}`
      : '';
    statTrait.textContent = nTrait
      ? `${nTrait} usine(s) ou station(s) de traitement repérée(s) sur la carte, en violet.${caveat}`
      : '';
  } catch (err) {
    statStock.textContent = '';
    statTrait.textContent = '';
  }
}

loadCaptages();
loadOSM();
