/* =========================================================
   PERSONNAGE DESSINÉ EN CODE
   Pièces interchangeables (peau, coiffure, yeux, tenue, accessoires), toutes
   alignées : chaque combinaison fonctionne. Vue de face, grosse tête.
   Utilisation :  Perso.svg(look, "full" | "bust" | "head")
   Un « look » est un petit objet : { skin, hair, hairColor, eyes, outfit, top, bottom, accessory }
   (skin, hairColor, eyes, top, bottom = numéros dans les listes de couleurs ci-dessous).
   Pour remplacer ces dessins par des images, il suffira de changer Perso.svg.
   ========================================================= */
"use strict";
window.Perso = (() => {
const INK = "#5A3A22";

function shade(hex, k) { // k < 0 assombrit, k > 0 éclaircit
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, "0")).join("");
}


/* ---------- cheveux : [derrière la tête, devant] ---------- */
function hair(style, c) {
  const d = shade(c, -0.22), l = shade(c, 0.28);
  const st = `fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  const hl = `<path d="M70 58 Q86 46 108 50" fill="none" stroke="${l}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  const cap = `M44 96 C40 50 70 30 100 30 C130 30 160 50 156 96 C150 80 138 66 124 62 C110 76 80 78 66 64 C54 72 46 84 44 96Z`;
  const fringe = `M44 96 C38 48 68 28 100 28 C132 28 162 48 156 96 C152 76 142 62 128 56 C112 70 90 72 74 58 C60 66 50 80 44 96Z`;
  switch (style) {
    case "court": return ["", `<path d="${cap}" ${st}/>${hl}`];
    case "carre": return [
      `<path d="M40 100 C34 40 66 24 100 24 C134 24 166 40 160 100 L158 132 Q150 142 138 136 L62 136 Q50 142 42 132Z" ${st}/>`,
      `<path d="M46 92 C42 50 70 32 100 32 C130 32 158 50 154 92 C140 78 122 70 100 70 C78 70 60 78 46 92Z" ${st}/>${hl}`];
    case "couettes": return [
      `<ellipse cx="34" cy="116" rx="17" ry="26" transform="rotate(14 34 116)" ${st}/><ellipse cx="166" cy="116" rx="17" ry="26" transform="rotate(-14 166 116)" ${st}/>
       <rect x="40" y="86" width="12" height="10" rx="4" fill="#F26FA6" stroke="${INK}" stroke-width="2.5"/><rect x="148" y="86" width="12" height="10" rx="4" fill="#F26FA6" stroke="${INK}" stroke-width="2.5"/>`,
      `<path d="${fringe}" ${st}/>${hl}`];
    case "queue": return [
      `<path d="M150 58 C186 56 190 110 168 150 C170 116 160 90 146 82Z" ${st}/><rect x="140" y="52" width="14" height="12" rx="5" fill="#F26FA6" stroke="${INK}" stroke-width="2.5"/>`,
      `<path d="${fringe}" ${st}/>${hl}`];
    case "boucles": return [
      `<g ${st}><circle cx="48" cy="84" r="20"/><circle cx="152" cy="84" r="20"/><circle cx="40" cy="112" r="16"/><circle cx="160" cy="112" r="16"/><circle cx="60" cy="52" r="22"/><circle cx="140" cy="52" r="22"/><circle cx="100" cy="40" r="26"/></g>`,
      `<path d="M52 82 C58 62 78 54 100 54 C122 54 142 62 148 82 C136 70 118 66 100 66 C82 66 64 70 52 82Z" ${st}/>${hl}`];
    case "chignon": return [
      `<circle cx="100" cy="20" r="22" ${st}/><path d="M86 24 Q100 14 114 24" fill="none" stroke="${l}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
      `<path d="${cap}" ${st}/>${hl}`];
    case "long": return [
      `<path d="M38 100 C32 40 66 22 100 22 C134 22 168 40 162 100 L170 186 Q154 200 136 184 L136 120 L64 120 L64 184 Q46 200 30 186Z" ${st}/>`,
      `<path d="${fringe}" ${st}/>${hl}`];
    case "pique": return ["", `<path d="M44 94 L42 52 L62 62 L66 26 L86 48 L100 18 L114 48 L134 26 L138 62 L158 52 L156 94 C150 76 140 66 128 60 C112 72 88 72 72 60 C60 68 50 80 44 94Z" ${st}/>`];
    case "afro": return [
      `<circle cx="100" cy="78" r="72" ${st}/>`,
      `<path d="M54 92 C58 66 78 56 100 56 C122 56 142 66 146 92 C134 78 118 72 100 72 C82 72 66 78 54 92Z" fill="${d}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`];
  }
  return ["", ""];
}

/* ---------- tenue : haut, bas, chaussures ---------- */
function outfit(kind, c1, c2, skin) {
  const sk = skin, skd = shade(skin, -0.12);
  const stroke = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const c1d = shade(c1, -0.18), c2d = shade(c2, -0.18);
  const torso = `M60 156 Q100 146 140 156 L148 222 Q100 232 52 222Z`;
  const arm = (side) => { // bras : peau + manche
    const x = side < 0 ? 58 : 142, hx = side < 0 ? 36 : 164;
    return `<path d="M${x} 164 L${hx} 216" fill="none" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>
            <path d="M${x} 164 L${hx} 216" fill="none" stroke="${sk}" stroke-width="18" stroke-linecap="round"/>`;
  };
  const sleeve = (side, len, col) => {
    const x = side < 0 ? 58 : 142, hx = side < 0 ? 36 : 164;
    const ex = x + (hx - x) * len, ey = 164 + 52 * len;
    return `<path d="M${x} 164 L${ex} ${ey}" fill="none" stroke="${INK}" stroke-width="27" stroke-linecap="round"/>
            <path d="M${x} 164 L${ex} ${ey}" fill="none" stroke="${col}" stroke-width="21" stroke-linecap="round"/>`;
  };
  const hand = side => `<circle cx="${side < 0 ? 35 : 165}" cy="219" r="10" fill="${sk}" ${stroke}/>`;
  const leg = (x, col, len = 1) => `<path d="M${x} 220 L${x} ${220 + 50 * len}" fill="none" stroke="${INK}" stroke-width="26" stroke-linecap="round"/>
        <path d="M${x} 220 L${x} ${220 + 50 * len}" fill="none" stroke="${col}" stroke-width="20" stroke-linecap="round"/>`;
  const shoes = col => [76, 124].map(x => `<ellipse cx="${x}" cy="280" rx="17" ry="10" fill="${col}" ${stroke}/>
        <path d="M${x - 10} 276 Q${x} 272 ${x + 10} 276" fill="none" stroke="${shade(col, 0.4)}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`).join("");
  let legs = "", top = "", extra = "";
  const bare = [leg(76, sk), leg(124, sk)].join("");
  switch (kind) {
    case "tshirt":
      legs = leg(76, c2) + leg(124, c2);
      top = `<path d="${torso}" fill="${c1}" ${stroke}/>` + sleeve(-1, .38, c1) + sleeve(1, .38, c1);
      extra = `<path d="M82 154 Q100 166 118 154" fill="none" stroke="${c1d}" stroke-width="3" stroke-linecap="round"/>`; break;
    case "pull":
      legs = leg(76, c2) + leg(124, c2);
      top = `<path d="${torso}" fill="${c1}" ${stroke}/>` + sleeve(-1, .9, c1) + sleeve(1, .9, c1);
      extra = `<path d="M54 200 Q100 210 146 200" fill="none" stroke="${c1d}" stroke-width="5" stroke-linecap="round"/><path d="M84 152 Q100 160 116 152" fill="none" stroke="${c1d}" stroke-width="6" stroke-linecap="round"/>`; break;
    case "robe":
      legs = bare;
      top = `<path d="M60 156 Q100 146 140 156 L150 190 L172 250 Q100 266 28 250 L50 190Z" fill="${c1}" ${stroke}/>` + sleeve(-1, .3, c1) + sleeve(1, .3, c1);
      extra = `<path d="M52 196 Q100 208 148 196" fill="none" stroke="${c1d}" stroke-width="4" stroke-linecap="round"/><path d="M40 238 Q100 252 160 238" fill="none" stroke="${shade(c1, .35)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8"/>`; break;
    case "salopette":
      legs = leg(76, c1) + leg(124, c1);
      top = `<path d="${torso}" fill="${c2}" ${stroke}/>` + sleeve(-1, .38, c2) + sleeve(1, .38, c2) +
        `<path d="M62 178 L138 178 L146 222 Q100 232 54 222Z" fill="${c1}" ${stroke}/><path d="M72 156 L70 180 M128 156 L130 180" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M72 156 L70 180 M128 156 L130 180" stroke="${c1}" stroke-width="6" stroke-linecap="round"/>
         <circle cx="70" cy="181" r="4.5" fill="${shade(c1, .45)}" stroke="${INK}" stroke-width="2"/><circle cx="130" cy="181" r="4.5" fill="${shade(c1, .45)}" stroke="${INK}" stroke-width="2"/>`; break;
    case "veste":
      legs = leg(76, c2) + leg(124, c2);
      top = `<path d="M60 156 Q100 146 140 156 L148 222 Q100 232 52 222Z" fill="#fff" ${stroke}/>` + `<path d="${torso}" fill="${c1}" ${stroke}/>` + sleeve(-1, .9, c1) + sleeve(1, .9, c1);
      extra = `<path d="M100 150 L100 228" stroke="${c1d}" stroke-width="3"/><path d="M84 152 L100 168 L116 152" fill="${shade(c1, .25)}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; break;
    case "mariniere":
      legs = leg(76, c2) + leg(124, c2);
      top = `<path d="${torso}" fill="#fff" ${stroke}/>` + [168, 184, 200, 216].map(y => `<path d="M${55 + (y - 156) * .1} ${y} L${145 - (y - 156) * .1} ${y}" stroke="${c1}" stroke-width="8"/>`).join("") + `<path d="${torso}" fill="none" ${stroke}/>` + sleeve(-1, .9, "#fff") + sleeve(1, .9, "#fff");
      extra = `<path d="M82 154 Q100 166 118 154" fill="none" stroke="${c1d}" stroke-width="3" stroke-linecap="round"/>`; break;
  }
  const hands = (kind === "tshirt" || kind === "robe" || kind === "salopette") ? arm(-1) + arm(1) : "";
  // ordre : jambes, bras (peau), haut, mains
  return { legs: legs + shoes(c2d), arms: hands, top, extra, hands: hand(-1) + hand(1) };
}

/* ---------- accessoires ---------- */
function accessory(kind) {
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  switch (kind) {
    case "casquette": return { over: `<path d="M48 70 C50 28 150 28 152 70 L152 76 C130 66 70 66 48 76Z" fill="#E8584A" ${st}/><path d="M64 70 Q100 62 136 70 L170 84 Q140 78 100 78 Q60 78 30 84Z" fill="#C93F33" ${st}/><circle cx="100" cy="38" r="5" fill="#C93F33" ${st}/>` };
    case "noeud": return { over: `<g ${st}><path d="M146 54 C134 36 120 44 134 62 C140 66 146 62 146 54Z" fill="#F26FA6"/><path d="M146 54 C164 36 178 50 160 66 C152 68 146 62 146 54Z" fill="#F26FA6"/><circle cx="146" cy="56" r="7" fill="#E04F8A"/></g>` };
    case "lunettes": return { face: `<g fill="rgba(180,220,255,.25)" ${st}><circle cx="78" cy="98" r="19"/><circle cx="122" cy="98" r="19"/><path d="M97 98 L103 98"/><path d="M59 96 L48 92 M141 96 L152 92"/></g>` };
    case "couronne": return { over: `<path d="M64 52 L58 22 L80 38 L100 14 L120 38 L142 22 L136 52Z" fill="#FFCB47" ${st}/><circle cx="100" cy="30" r="5" fill="#E8584A" ${st}/><circle cx="72" cy="40" r="3.5" fill="#3FA2E6" ${st}/><circle cx="128" cy="40" r="3.5" fill="#6CBF4B" ${st}/>` };
    case "bonnet": return { over: `<path d="M46 74 C44 24 156 24 154 74 C130 64 70 64 46 74Z" fill="#3FA2E6" ${st}/><rect x="42" y="64" width="116" height="16" rx="8" fill="#2E7FBF" ${st}/><circle cx="100" cy="20" r="11" fill="#fff" ${st}/>` };
    case "fleur": return { over: `<g ${st}><circle cx="70" cy="48" r="7" fill="#fff"/><circle cx="82" cy="52" r="7" fill="#fff"/><circle cx="82" cy="40" r="7" fill="#fff"/><circle cx="64" cy="38" r="7" fill="#fff"/><circle cx="72" cy="44" r="6" fill="#FFCB47"/></g>` };
    case "ecouteurs": return { over: `<path d="M48 96 C44 30 156 30 152 96" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M48 96 C44 30 156 30 152 96" fill="none" stroke="#8E6BD8" stroke-width="5" stroke-linecap="round"/><rect x="34" y="88" width="20" height="30" rx="9" fill="#8E6BD8" ${st}/><rect x="146" y="88" width="20" height="30" rx="9" fill="#8E6BD8" ${st}/>` };
    case "sacados": return { back: `<rect x="56" y="150" width="88" height="76" rx="18" fill="#F29E3D" stroke="${INK}" stroke-width="3"/>` };
  }
  return {};
}


function avatarSVG(o) {
  const skin = o.skin, skd = shade(skin, -0.14), skl = shade(skin, 0.3);
  const [hBack, hFront] = hair(o.hair, o.hairColor);
  const out = outfit(o.outfit, o.top, o.bottom, skin);
  const acc = accessory(o.accessory);
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eye = (cx) => `<g><ellipse cx="${cx}" cy="100" rx="9" ry="11" fill="#fff" ${st}/>
      <ellipse cx="${cx}" cy="102" rx="6.5" ry="8.5" fill="${o.eyes}"/><ellipse cx="${cx}" cy="103" rx="3.4" ry="5" fill="#241812"/>
      <circle cx="${cx - 2.5}" cy="98" r="2.8" fill="#fff"/><circle cx="${cx + 2.5}" cy="106" r="1.3" fill="#fff"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300">
  <ellipse cx="100" cy="288" rx="62" ry="9" fill="rgba(60,40,10,.18)"/>
  ${acc.back || ""}
  ${hBack}
  ${out.legs}
  ${out.arms}
  <rect x="88" y="138" width="24" height="22" rx="8" fill="${skd}" ${st}/>
  ${out.top}${out.extra}${out.hands}
  <circle cx="45" cy="104" r="11" fill="${skin}" ${st}/><circle cx="155" cy="104" r="11" fill="${skin}" ${st}/>
  <ellipse cx="100" cy="96" rx="56" ry="52" fill="${skin}" ${st}/>
  <path d="M64 120 Q100 150 136 120 Q132 140 100 146 Q68 140 64 120Z" fill="${skd}" opacity=".35"/>
  <ellipse cx="78" cy="68" rx="20" ry="10" fill="${skl}" opacity=".55"/>
  ${eye(78)}${eye(122)}
  <path d="M64 82 Q78 74 90 82 M110 82 Q122 74 136 82" fill="none" stroke="${shade(o.hairColor, -.1)}" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="62" cy="118" rx="10" ry="6.5" fill="#F27B8A" opacity=".4"/><ellipse cx="138" cy="118" rx="10" ry="6.5" fill="#F27B8A" opacity=".4"/>
  <path d="M99 112 Q100 115 102 112" fill="none" stroke="${shade(skin, -.3)}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M88 124 Q100 136 112 124" fill="#fff" stroke="#8A3B2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${acc.face || ""}
  ${hFront}
  ${acc.over || ""}
</svg>`;
}


const SKINS = ["#FFE0C7", "#F7CBA6", "#EBB287", "#D49A6A", "#B77848", "#8E5A38", "#6B4129", "#4B2E1E"];
const HAIR_COLORS = ["#2B1D16", "#5C3A24", "#9A6234", "#D8A23E", "#F0D27A", "#C4472A", "#F26FA6", "#58A6E8", "#8E6BD8", "#E8E4DC"];
const EYE_COLORS = ["#5C3A24", "#2E6FB5", "#3E9B5F", "#8A6D2B", "#6B6B78", "#8E4FC0"];
const OUTFIT_COLORS = ["#E8584A", "#F29E3D", "#F4CF45", "#6CBF4B", "#3FA2E6", "#6F72E0", "#C06FD8", "#F27BA8", "#FFFFFF", "#4A4F63"];

const HAIR_STYLES = [
  ["court", "Court"], ["carre", "Carré"], ["couettes", "Couettes"], ["queue", "Queue"], ["boucles", "Bouclés"],
  ["chignon", "Chignon"], ["long", "Long"], ["pique", "Piquants"], ["afro", "Afro"],
];
const OUTFITS = [
  ["tshirt", "T-shirt"], ["pull", "Pull"], ["robe", "Robe"], ["salopette", "Salopette"], ["veste", "Veste"], ["mariniere", "Marinière"],
];
const ACCESSORIES = [
  ["none", "Aucun"], ["casquette", "Casquette"], ["noeud", "Nœud"], ["lunettes", "Lunettes"], ["couronne", "Couronne"],
  ["bonnet", "Bonnet"], ["fleur", "Fleur"], ["ecouteurs", "Casque"], ["sacados", "Sac à dos"],
];
const NAMES = ["Léa", "Noah", "Jade", "Lucas", "Manon", "Hugo", "Inès", "Louis", "Zoé", "Nathan", "Chloé", "Tom",
  "Emma", "Léo", "Alice", "Ethan", "Lola", "Gabriel", "Mila", "Adam", "Camille", "Jules", "Sarah", "Théo"];

const VIEWBOX = { full: "0 0 200 300", bust: "6 0 188 236", head: "20 2 160 160" };

function svg(look, view = "full") {
  const o = {
    skin: SKINS[look.skin] || SKINS[1],
    hair: look.hair,
    hairColor: HAIR_COLORS[look.hairColor] || HAIR_COLORS[1],
    eyes: EYE_COLORS[look.eyes] || EYE_COLORS[0],
    outfit: look.outfit,
    top: OUTFIT_COLORS[look.top] || OUTFIT_COLORS[0],
    bottom: OUTFIT_COLORS[look.bottom] || OUTFIT_COLORS[4],
    accessory: look.accessory,
  };
  const markup = avatarSVG(o);
  return markup.replace('viewBox="0 0 200 300"', `viewBox="${VIEWBOX[view] || VIEWBOX.full}"`)
    .replace('<svg ', '<svg preserveAspectRatio="xMidYMax meet" ');
}

const pick = list => list[Math.floor(Math.random() * list.length)];
function random() {
  return {
    skin: Math.floor(Math.random() * SKINS.length),
    hair: pick(HAIR_STYLES)[0],
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    eyes: Math.floor(Math.random() * EYE_COLORS.length),
    outfit: pick(OUTFITS)[0],
    top: Math.floor(Math.random() * OUTFIT_COLORS.length),
    bottom: Math.floor(Math.random() * OUTFIT_COLORS.length),
    accessory: Math.random() < 0.55 ? "none" : pick(ACCESSORIES.slice(1))[0],
  };
}

// Anciens personnages (images Fluent : base fille/garçon, couleur de peau, accessoire)
function migrate(old) {
  const skin = { default: 1, light: 0, medium_light: 2, medium: 3, medium_dark: 5, dark: 7 };
  const acc = { cap: "casquette", ribbon: "noeud", glasses: "lunettes", crown: "couronne" };
  return {
    skin: skin[old.skin] ?? 1,
    hair: old.base === "boy" ? "court" : "couettes",
    hairColor: 2, eyes: 0,
    outfit: old.base === "boy" ? "salopette" : "robe",
    top: old.base === "boy" ? 4 : 7, bottom: old.base === "boy" ? 2 : 0,
    accessory: acc[old.acc] || "none",
  };
}

const DEFAULT_LOOK = { skin: 1, hair: "court", hairColor: 2, eyes: 0, outfit: "tshirt", top: 0, bottom: 4, accessory: "none" };

return { svg, random, migrate, DEFAULT_LOOK, SKINS, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, HAIR_STYLES, OUTFITS, ACCESSORIES, NAMES };
})();
