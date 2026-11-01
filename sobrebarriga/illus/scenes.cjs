'use strict';
// One overhead illustration per scene of the sobrebarriga video (1080x1920).
// The subject sits in the upper ~60% of the frame: the video's text block covers the bottom.
const L = require('./lib.cjs');
const { seed, R, g, svg, table, light, blob, strip, slab, smooth, uid, f1, TAU } = L;

const POT = [540, 660, 470];

function pure(cx, cy, rx, ry) {
  const d = blob(cx, cy, rx, ry, 18, .1), cl = uid('pc'), gr = uid('pg');
  let s = `<radialGradient id="${gr}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffd95e"/><stop offset=".6" stop-color="#f2bd34"/><stop offset="1" stop-color="#d79a1c"/></radialGradient>
    <clipPath id="${cl}"><path d="${d}"/></clipPath>
    <g filter="url(#sh)"><g filter="url(#rough)"><path d="${d}" fill="url(#${gr})"/></g></g>
    <g clip-path="url(#${cl})">
      <rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 2}" filter="url(#pure)" opacity=".55" style="mix-blend-mode:multiply"/>
      <rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 2}" filter="url(#purelight)" opacity=".7" style="mix-blend-mode:screen"/>`;
  for (let k = 0; k < 70; k++) {   // rustic lumps
    const a = R(0, TAU), rr = Math.sqrt(R(0, 1)) * .9, x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr, r = R(8, 22);
    s += `<circle cx="${f1(x + 3)}" cy="${f1(y + 4)}" r="${f1(r)}" fill="#b97f12" opacity=".35" filter="url(#b3)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#ffd862" opacity=".55" filter="url(#b1)"/><circle cx="${f1(x - r * .3)}" cy="${f1(y - r * .35)}" r="${f1(r * .3)}" fill="#fff6c8" opacity=".6" filter="url(#b1)"/>`;
  }
  s += L.sprinkle(cx, cy, rx * .9, ry * .9, 26, ['#a06a22', '#8c5718', '#c08a3a'], 2, 5, .8, 2.2);   // bits of skin
  s += `</g>`;
  return s;
}
function glazedSlice(w, h) {
  // a slice cut against the grain: brown cut face with short cross fibres, dark glazed crust on the long edges
  const d = slab(w, h, .035, 30, 4.5), cl = uid('sl'), gr = uid('sg');
  let s = `<linearGradient id="${gr}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f05"/><stop offset=".16" stop-color="#5a2a12"/><stop offset=".5" stop-color="#7a3d1c"/><stop offset=".84" stop-color="#5a2a12"/><stop offset="1" stop-color="#220b03"/></linearGradient>
    <clipPath id="${cl}"><path d="${d}"/></clipPath>
    <g filter="url(#sh)"><path d="${d}" fill="url(#${gr})"/></g><g clip-path="url(#${cl})">`;
  for (let x = -w / 2; x < w / 2; x += R(5, 11)) {
    s += `<path d="M${f1(x)},${f1(-h / 2)} C${f1(x + R(-4, 4))},${f1(-h / 6)} ${f1(x + R(-4, 4))},${f1(h / 6)} ${f1(x + R(-3, 3))},${f1(h / 2)}" stroke="${L.pick(['#a5612f', '#2e1007', '#8a4a22'])}" stroke-width="${f1(R(1.2, 3))}" opacity="${f1(R(.25, .55))}" fill="none"/>`;
  }
  s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#crust)" opacity=".35"/>
    <path d="${strip(w * 1.02, h * .3, 4, .2)}" transform="translate(0,${-h / 2 + h * .06})" fill="#1c0802" opacity=".85" filter="url(#gloss2)"/>
    <path d="${strip(w * .9, h * .14, -3, .4)}" transform="translate(0,${h / 2 - h * .04})" fill="#1c0802" opacity=".7"/>
    <path d="${strip(w * .96, h * .06, 3, .5)}" transform="translate(0,${-h / 2 + h * .2})" fill="#b8642a" opacity=".55" filter="url(#b1)"/>
    <path d="${strip(w * 1.02, h * .72, 5, .15)}" transform="translate(0,${-h * .1})" fill="#1e0803" opacity=".55" filter="url(#gloss2)"/>
    </g>`;
  s += L.highlights(-w * .1, -h * .3, w * .3, h * .05, 3, '#ffe9c8', .7);
  return s;
}
function oilPool(cx, cy, r, col = '#21150c') {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" filter="url(#gloss)"/>`;
}

const S = {
  // ── finished plate: intro, ingredients backdrop and final ──
  hero() {
    seed(10);
    let s = table();
    s += L.linen(150, 250, 560, 380, -16);
    s += L.fork(1010, 1120, -102, 1);
    s += L.plate(540, 700, 480);
    s += L.liquid(blob(560, 735, 345, 262, 14, .12), '#2b1007');
    
    s += pure(505, 720, 275, 195);
    s += g(470, 650, -24, glazedSlice(430, 150));
    s += g(560, 735, -14, glazedSlice(420, 148));
    s += g(640, 815, -6, glazedSlice(380, 140));
    // sauce drizzled over the meat
    for (const [x, y, a, l] of [[470, 700, -22, 200], [600, 790, -12, 180]]) s += g(x, y, a, `<path d="${strip(l, 22, R(-8, 8), .7)}" fill="#250b04" opacity=".9" filter="url(#gloss2)"/>`);
    
    for (const [x, y, a] of [[640, 650, 30], [420, 760, -10], [700, 820, 70], [560, 600, 120], [360, 680, 200], [760, 720, 10], [500, 830, 160]]) s += g(x, y, a, L.pickledOnion(R(26, 40)));
    for (const [x, y, a, z] of [[600, 690, -30, 1], [470, 715, 40, .85], [690, 790, 110, .9], [390, 640, 200, .8], [545, 812, 15, .75]]) s += g(x, y, a, L.cilantro(z));
    for (let k = 0; k < 26; k++) s += g(R(400, 700), R(600, 820), R(0, 180), L.zest());
    s += L.sprinkle(540, 710, 260, 160, 60, ['#111', '#2a2522'], 1.5, 3.2, .9);
    s += light();
    return svg(s);
  },

  // ── 1 · season the raw meat ──
  s1() {
    seed(21);
    let s = table();
    s += g(540, 780, 3, `<g filter="url(#sh)"><rect x="-470" y="-640" width="940" height="1280" rx="40" fill="#b9874f"/></g>
      <rect x="-470" y="-640" width="940" height="1280" rx="40" filter="url(#boardgrain)" opacity=".8"/>
      <rect x="-462" y="-632" width="924" height="1264" rx="36" fill="none" stroke="#e0b47c" stroke-opacity=".35" stroke-width="4"/>`);
    s += g(540, 700, -8, L.rawMeat(800, 410));
    // spices: paprika, cumin, pepper, salt
    s += L.sprinkle(500, 680, 340, 170, 380, ['#c2401f', '#d8582a', '#a8301a'], 1.2, 3.4, .75);
    s += L.sprinkle(540, 690, 340, 170, 160, ['#8e6a37', '#a77f45', '#6f4f26'], 1.6, 2.6, .9, 2.4);
    s += L.sprinkle(540, 690, 350, 175, 200, ['#1a1714', '#2c2622'], 1.2, 2.6, .9);
    s += L.sprinkle(540, 690, 350, 175, 120, ['#ffffff', '#efe9e0'], 1.2, 2.4, .85);
    // mustard brushed on one side
    for (let k = 0; k < 9; k++) s += g(R(600, 800), R(610, 790), R(-14, -2), `<path d="${strip(R(180, 280), R(30, 52), R(-8, 8), .5)}" fill="#d6a226" opacity=".42" filter="url(#b3)"/>`);
    s += g(700, 700, -8, `<path d="${strip(300, 150, 6, .5)}" fill="#d9a41f" opacity=".25" filter="url(#gloss2)"/>`);
    // bowls
    s += L.bowl(190, 300, 110, L.sprinkle(190, 300, 80, 80, 900, ['#b8371f', '#cf4a25', '#9d2c18'], 2, 4.5, 1));
    s += L.bowl(900, 280, 96, L.sprinkle(900, 280, 74, 74, 420, ['#9c7440', '#b58a4f', '#7d5a2e'], 2, 3.4, 1, 2.4));
    s += L.bowl(910, 1070, 96, `<circle cx="910" cy="1070" r="76" fill="#d9a21c" filter="url(#gloss)"/>`);
    s += L.bowl(170, 1080, 90, L.sprinkle(170, 1080, 70, 70, 500, ['#1d1916', '#3a332e', '#55493f'], 2, 4, 1));
    s += light();
    return svg(s);
  },

  // ── 2 · sear in a heavy pot ──
  s2() {
    seed(32);
    let inner = oilPool(...POT, '#1d120a') + L.sheen(540, 660, 430, .25);
    
    inner += g(540, 660, 9, L.cookedMeat(760, 390, 'seared', { fat: true }));
    // sizzling oil around the edge of the meat
    for (let k = 0; k < 140; k++) {
      const a = R(0, TAU), [x, y] = L.rot(Math.cos(a) * R(390, 420), Math.sin(a) * R(205, 230), 9 * Math.PI / 180);
      inner += `<circle cx="${f1(540 + x)}" cy="${f1(660 + y)}" r="${f1(R(2, 6))}" fill="#ffe2a8" opacity="${f1(R(.25, .7))}"/>`;
    }
    let s = table() + L.pot(...POT, inner) + light();
    return svg(s);
  },

  // ── 3 · sofrito in the same pot ──
  s3() {
    seed(43);
    let inner = `<circle cx="540" cy="660" r="430" fill="#3a1f0f"/>` + oilPool(540, 660, 430, '#3d2110');
    const scatter = (n, fn) => { let o = ''; for (let k = 0; k < n; k++) { const a = R(0, TAU), rr = Math.sqrt(R(0, 1)) * 400; o += g(540 + Math.cos(a) * rr, 660 + Math.sin(a) * rr, R(0, 360), fn()); } return o; };
    inner += scatter(64, () => L.onionStrip(1));
    inner += scatter(26, L.pepperStrip);
    inner += scatter(40, L.tomatoChunk);
    inner += scatter(60, L.garlicBit);
    inner += scatter(18, () => L.onionStrip(1));
    
    let s = table() + L.pot(...POT, inner) + L.woodSpoon(1120, 120, 610, 640) + light();
    return svg(s);
  },

  // ── 4 · stout, thyme, bay leaf, mustard ──
  s4() {
    seed(54);
    let inner = `<circle cx="540" cy="660" r="430" fill="#3a1f0f"/>`;
    const scatter = (n, fn, rmax = 400) => { let o = ''; for (let k = 0; k < n; k++) { const a = R(0, TAU), rr = Math.sqrt(R(0, 1)) * rmax; o += g(540 + Math.cos(a) * rr, 660 + Math.sin(a) * rr, R(0, 360), fn()); } return o; };
    inner += scatter(70, () => L.onionStrip(1)) + scatter(18, L.pepperStrip) + scatter(22, L.tomatoChunk);
    inner += `<circle cx="540" cy="660" r="430" fill="#1f0d05" opacity=".86" filter="url(#gloss)"/>` + L.sheen(540, 660, 430, .2);
    // foam: collar along the wall and drifting islands
    for (let k = 0; k < 900; k++) {
      const a = R(0, TAU), rr = k < 600 ? R(370, 425) : R(0, 330), x = 540 + Math.cos(a) * rr, y = 660 + Math.sin(a) * rr;
      if (k >= 600 && Math.sin(x * .012) * Math.cos(y * .015) < .25) continue;
      const r = R(3, 11);
      inner += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${L.pick(['#c9a06a', '#dbbb87', '#b88a52', '#e8d1a6'])}" opacity="${f1(R(.55, .9))}"/>`;
    }
    inner += L.bubblesSvg(540, 660, 380, 380, 70, 2, 9, '#8a5a30');
    inner += L.swirl(600, 610, 10, 80, 1.6, '#d9a21c', 9, .55);
    inner += g(430, 560, 25, L.bayLeaf(190, 58)) + g(690, 780, -40, L.bayLeaf(170, 52));
    inner += g(640, 520, -20, L.thyme(220)) + g(420, 800, 60, L.thyme(190)) + g(560, 700, 140, L.thyme(170));
    
    let s = table() + L.pot(...POT, inner) + light();
    return svg(s);
  },

  // ── 5 · covered, low heat, 2½–3½ h ──
  s5() {
    seed(65);
    let s = table();
    s += L.linen(930, 1250, 420, 300, 12, '#cdbfa6');
    s += L.pot(...POT, `<circle cx="540" cy="660" r="430" fill="#2a1408"/>`) + L.lid(548, 652, 440);
    s += light();
    return svg(s);
  },

  // ── 5b · three hours later: the fork goes in easily ──
  s5b() {
    seed(76);
    let inner = `<circle cx="540" cy="660" r="430" fill="#230d05" filter="url(#gloss)"/>` + L.sheen(540, 660, 430, .2);
    const scatter = (n, fn) => { let o = ''; for (let k = 0; k < n; k++) { const a = R(0, TAU), rr = R(250, 420); o += g(540 + Math.cos(a) * rr, 660 + Math.sin(a) * rr, R(0, 360), fn()); } return o; };
    inner += scatter(50, () => L.onionStrip(2));
    inner += g(530, 660, -6, L.cookedMeat(760, 360, 'braised', { fat: true, fibres: 40 }) + `<path d="${L.flank(700, 300)}" fill="#1c0702" opacity=".35" filter="url(#gloss2)"/>`);
    // braising liquid lapping the edges of the meat
    inner += `<path d="${blob(530, 660, 400, 215, 20, .06)}" fill="none" stroke="#2a1208" stroke-width="34" opacity=".75" filter="url(#b8)"/>`;
    inner += L.highlights(470, 560, 160, 50, 6, '#ffd8a8', .45);
    for (let k = 0; k < 80; k++) {   // fat droplets on the surface
      const a = R(0, TAU), rr = R(270, 420), x = 540 + Math.cos(a) * rr, y = 660 + Math.sin(a) * rr, r = R(3, 12);
      inner += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#9a5e24" opacity=".45"/><circle cx="${f1(x - r * .3)}" cy="${f1(y - r * .3)}" r="${f1(r * .3)}" fill="#ffe2b0" opacity=".55"/>`;
    }
    inner += g(300, 470, 30, L.bayLeaf(160, 50, true)) + g(790, 880, -50, L.thyme(200, true));
    // fibres parting where the fork goes in
    for (let k = 0; k < 7; k++) inner += g(R(560, 650), R(600, 690), R(-50, -30), `<path d="${strip(R(40, 90), R(3, 6), R(-4, 4), .8)}" fill="#160602" opacity=".75"/>`);
    let s = table() + L.pot(...POT, inner) + L.fork(1040, 220, 134, 1) + light();
    return svg(s);
  },

  // ── 6 · strain, panela, vinegar, mustard: reduce ──
  s6() {
    seed(87);
    let inner = `<circle cx="540" cy="680" r="420" fill="#1f0904" filter="url(#gloss)"/>` + L.sheen(560, 700, 420, .22);
    inner += L.swirl(500, 700, 20, 200, 2.2, '#9a5a24', 14, .45);
    inner += L.sprinkle(470, 660, 140, 120, 160, ['#c98a3e', '#dca253', '#b87634'], 2, 4.5, .85);
    inner += L.swirl(640, 600, 10, 70, 1.4, '#d9a21c', 8, .5);
    inner += L.bubblesSvg(540, 680, 380, 380, 120, 4, 22, '#6a3a1a');
    
    let s = table();
    s += L.bowl(170, 300, 140, L.panelaPile(170, 300, 110, 100, 320));
    s += L.saucepan(560, 700, 450, inner, -38);
    s += light();
    return svg(s);
  },

  // ── 7 · off the heat, cold butter ──
  s7() {
    seed(98);
    let inner = `<circle cx="560" cy="700" r="420" fill="#2a0e05" filter="url(#gloss)"/>` + L.sheen(560, 700, 420, .3);
    inner += L.swirl(500, 680, 30, 300, 2.4, '#e6bd62', 12, .4);
    inner += L.swirl(500, 680, 60, 260, 2.4, '#7a3c18', 18, .5);
    inner += g(500, 660, 18, L.butterCube(130));
    
    let s = table() + L.saucepan(560, 700, 450, inner, -38);
    s += L.woodSpoon(80, 1240, 330, 920);
    s += light();
    return svg(s);
  },

  // ── 8 · slice against the grain, glaze in the pan ──
  s8() {
    seed(109);
    let inner = `<circle cx="540" cy="660" r="430" fill="#1e0803" filter="url(#gloss)"/>` + L.sheen(540, 660, 430, .2);
    
    for (let k = 0; k < 6; k++) inner += g(330 + k * 82, 470 + k * 76, -38, glazedSlice(380, 128));
    inner += `<path d="${blob(540, 660, 330, 300, 16, .08)}" fill="none" stroke="#1e0803" stroke-width="40" opacity=".55" filter="url(#b20)"/>`;
    
    let s = table() + L.skillet(...POT, inner, -140) + light();
    return svg(s);
  },
};

module.exports = S;
