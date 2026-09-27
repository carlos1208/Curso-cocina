'use strict';
/*
 * MUJADDARA — recipe video, 30 s, 1080x1920 (vertical), 30 fps.
 * Photos are brought to life with camera moves, procedural steam, oil glints, rack focus,
 * beat-synced transitions and animated step typography. Pure function of time t.
 * Soundtrack (audio.py): 96 BPM, one bar (2.5 s) per scene.
 */
const W = 1080, H = 1920, FPS = 30, DUR = 30, BAR = 2.5, E8 = BAR / 8;
const SHUTTER = 0.5;
let SUB = 3;
const COL = { cream: '#F6EFE3', saffron: '#F2B544', dark: '#140E09', ember: '#E0782F' };

// ───────── math ─────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inQuad: t => t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const PERM = new Uint8Array(512);
(() => { const r = rng(3), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = PERM[X] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z, B = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  return lerp(lerp(lerp(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u), lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
    lerp(lerp(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u), lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}
const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

// ───────── canvases ─────────
const out = document.getElementById('c').getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const sceneC = mk(), sctx = sceneC.getContext('2d');
const accC = mk(), actx = accC.getContext('2d');
const layA = mk(), lA = layA.getContext('2d');
const layB = mk(), lB = layB.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');

const IMG = {};
let SMOKE = [], GLINT, GRAIN = [], VIGNETTE;

function textW(str, font, sp = 0) { mctx.font = font; let w = 0; for (const ch of str) w += mctx.measureText(ch).width + sp; return w - (str.length ? sp : 0); }
function drawText(c, str, x, y, font, color, align = 'left', sp = 0) {
  c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  if (!sp) { c.textAlign = align; c.fillText(str, x, y); return; }
  c.textAlign = 'left';
  let cx = align === 'center' ? x - textW(str, font, sp) / 2 : align === 'right' ? x - textW(str, font, sp) : x;
  for (const ch of str) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
}
const typed = (s, t, t0, cps = 45) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

// ───────── assets ─────────
async function loadAssets() {
  await Promise.all(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map(async k => {
    const im = new Image(); im.src = `img/${k}.jpg`; await im.decode(); IMG[k] = im;
  }));
  // pre-blurred hero for the ingredients card
  const b = document.createElement('canvas'); b.width = 675; b.height = 1210;
  const bc = b.getContext('2d'); bc.filter = 'blur(14px) brightness(0.8)';
  bc.drawImage(IMG['10'], -30, -30, 735, 1270); IMG.blur = b;
  // smoke sprites: fBm noise × soft radial falloff
  for (let k = 0; k < 3; k++) {
    const s = document.createElement('canvas'); s.width = s.height = 256;
    const sc = s.getContext('2d'), id = sc.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const dx = (x - 128) / 128, dy = (y - 128) / 128, d = Math.sqrt(dx * dx + dy * dy);
      let n = 0, a = .5, f = 1;
      for (let o = 0; o < 5; o++) { n += a * noise(x / 256 * 4 * f + k * 10, y / 256 * 4 * f, k * 3.1); a *= .5; f *= 2; }
      const v = clamp(.5 + n * 1.3) * Math.pow(clamp(1 - d), 1.8);
      const i = (y * 256 + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = 255; id.data[i + 3] = v * 255;
    }
    sc.putImageData(id, 0, 0); SMOKE.push(s);
  }
  const g = document.createElement('canvas'); g.width = g.height = 64;
  const gc = g.getContext('2d'), rg = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(255,252,240,1)'); rg.addColorStop(.18, 'rgba(255,235,190,.55)'); rg.addColorStop(1, 'rgba(255,200,120,0)');
  gc.fillStyle = rg; gc.fillRect(0, 0, 64, 64); GLINT = g;
  for (let k = 0; k < 4; k++) {
    const t = document.createElement('canvas'); t.width = t.height = 256;
    const tc = t.getContext('2d'), id = tc.createImageData(256, 256), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    tc.putImageData(id, 0, 0); GRAIN.push(out.createPattern(t, 'repeat'));
  }
  VIGNETTE = out.createRadialGradient(W / 2, H * .45, H * .3, W / 2, H * .5, H * .85);
  VIGNETTE.addColorStop(0, 'rgba(20,10,0,0)'); VIGNETTE.addColorStop(1, 'rgba(20,10,0,0.45)');
}

// ───────── scene data ─────────
const SC = [
  { kind: 'intro', img: '10', mv: { z: [1.38, 1.14], f: [[.55, .52], [.5, .47]] },
    steam: [{ x0: .42, x1: .64, y: .44, n: 16, rise: 130, size: 300, alpha: .24, seed: 1 }] },
  { kind: 'ingredients', img: 'blur', mv: { z: [1.2, 1.1], f: [[.5, .5], [.5, .45]] } },
  { n: 1, img: '01', title: 'Precocer las lentejas', lines: ['1 taza de lentejas + 1 L de agua', 'Fuego alto · hervir 10 min'], timer: 10,
    mv: { z: [1.06, 1.24], f: [[.5, .55], [.5, .6]] },
    steam: [{ x0: .12, x1: .88, y: .42, n: 24, rise: 170, size: 330, alpha: .26, seed: 2 }],
    glints: { x0: .08, x1: .92, y0: .44, y1: .74, n: 90, a: .9, size: 30, seed: 3 } },
  { n: 2, img: '02', title: 'Colar', lines: ['Desecha el agua de cocción', 'Reserva las lentejas'],
    mv: { z: [1.12, 1.15], f: [[.5, .36], [.5, .58]] },
    steam: [{ x0: .3, x1: .8, y: .5, n: 12, rise: 150, size: 280, alpha: .2, seed: 4 }] },
  { n: 3, img: '03', title: 'Caramelizar la cebolla', lines: ['2 cdas de aceite + 1 cebolla picada', '½ cdta de sal · fuego medio'], caramel: true,
    mv: { z: [1.24, 1.06], f: [[.44, .56], [.5, .52]], r: [-1.2, .4] },
    steam: [{ x0: .2, x1: .8, y: .6, n: 8, rise: 120, size: 240, alpha: .13, seed: 5 }],
    glints: { x0: .05, x1: .95, y0: .45, y1: .8, n: 45, a: .6, size: 22, seed: 6 } },
  { n: 4, img: '04', title: 'Integrar', chips: ['Lentejas', '1 taza de arroz', '2½ tazas de agua', '½ cdta de comino', '2 cdtas de sal'],
    mv: { z: [1.26, 1.26], f: [[.38, .55], [.62, .5]] },
    glints: { x0: .05, x1: .95, y0: .25, y1: .85, n: 70, a: .75, size: 24, seed: 7 } },
  { n: 5, img: '05', title: 'Tapa y fuego bajo', lines: ['Cocina a fuego lento', 'hasta que se consuma el agua'], timer: 20,
    mv: { z: [1.04, 1.22], f: [[.5, .55], [.5, .62]] },
    steam: [{ x0: .03, x1: .12, y: .47, n: 9, rise: 110, size: 170, alpha: .22, seed: 8 }, { x0: .46, x1: .54, y: .33, n: 6, rise: 90, size: 140, alpha: .15, seed: 9 }] },
  { n: 5, img: '08', title: '20 minutos después', lines: ['El agua se absorbió', 'El arroz queda suelto'],
    mv: { z: [1.3, 1.08], f: [[.5, .56], [.5, .5]] },
    steam: [{ x0: .18, x1: .86, y: .42, n: 28, rise: 180, size: 340, alpha: .3, seed: 10 }] },
  { n: 6, img: '06', title: 'Cebolla crujiente', lines: ['2–3 cdas de aceite + cebolla en juliana', 'Remueve hasta dorar'],
    mv: { z: [1.08, 1.25], f: [[.5, .55], [.52, .56]] },
    glints: { x0: .12, x1: .88, y0: .46, y1: .68, n: 130, a: 1, size: 30, seed: 11 },
    steam: [{ x0: .2, x1: .8, y: .46, n: 10, rise: 160, size: 230, alpha: .12, seed: 12 }] },
  { n: 7, img: '07', title: 'Escurrir', lines: ['Sobre papel absorbente', 'Así quedan crujientes'],
    mv: { z: [1.14, 1.2], f: [[.5, .5], [.5, .46]], r: [-1.6, 1.4] } },
  { n: 8, img: '09', title: 'Montaje', lines: ['Sirve caliente', 'Corona con cebolla y perejil'],
    mv: { z: [1.16, 1.16], f: [[.5, .36], [.5, .5]] },
    steam: [{ x0: .3, x1: .55, y: .64, n: 9, rise: 100, size: 210, alpha: .15, seed: 13 }] },
  { kind: 'final', img: '10', mv: { z: [1.12, 1.22], f: [[.5, .58], [.5, .6]] },
    steam: [{ x0: .42, x1: .64, y: .44, n: 16, rise: 130, size: 300, alpha: .24, seed: 14 }] },
];
// ───────── video clips (?clips): real footage replaces the photos ─────────
// scene index → [clip folder in clips/, in-point (s), optional camera move]
const USE_CLIPS = /[?&]clips/.test(location.search);
const CLIP_FPS = 24, CLIP_LAST = 191;
const CLIP_MAP = {
  0: ['10_plato', .4, { z: [1.04, 1.04], f: [[.5, .5], [.5, .5]] }],
  3: ['02_colar', .9], 4: ['03_caramelizar', 1.0], 5: ['04_integrar', .4], 6: ['05_tapa', 1.0],
  7: ['05b_destapar', .25], 8: ['06_freir', 1.0], 9: ['07_escurrir', .6],
  10: ['08_montaje', .5, { z: [1.3, 1.32], f: [[.4, .58], [.42, .6]] }],   // crop keeps the napkin logo (x > .83) out of frame
  11: ['10_plato', 4.9, { z: [1.12, 1.16], f: [[.5, .62], [.5, .62]] }],
};
if (USE_CLIPS) for (const [i, [name, inp, mv]] of Object.entries(CLIP_MAP)) {
  Object.assign(SC[i], { clip: { name, in: inp }, steam: null, glints: null, mv: mv || { z: [1.03, 1.09], f: [[.5, .5], [.5, .5]] } });
}
const CACHE = new Map();
const clipIdx = (s, i, t) => clamp(Math.round((s.clip.in + (t - i * BAR)) * CLIP_FPS), 0, CLIP_LAST);
const clipKey = (name, k) => `${name}/${k}`;
function clipFrame(s, i, t) {
  const k = clipIdx(s, i, t);
  for (const d of [0, -1, 1, -2, 2]) { const im = CACHE.get(clipKey(s.clip.name, clamp(k + d, 0, CLIP_LAST))); if (im) return im; }
  return null;
}
async function prepareClips(t) {
  const keys = new Set();
  for (const tt of [t, t + SHUTTER / FPS]) {
    const c = Math.floor(tt / BAR);
    for (let i = Math.max(0, c - 1); i <= Math.min(11, c + 1); i++) {
      const s = SC[i];
      if (s.clip && tt >= i * BAR - .45 && tt <= (i + 1) * BAR + .45) keys.add(clipKey(s.clip.name, clipIdx(s, i, tt)));
    }
  }
  await Promise.all([...keys].filter(k => !CACHE.has(k)).map(async k => {
    const [n, idx] = k.split('/'), im = new Image();
    im.src = `clips/${n}/f${String(idx).padStart(3, '0')}.jpg`; await im.decode(); CACHE.set(k, im);
  }));
  while (CACHE.size > 60) CACHE.delete(CACHE.keys().next().value);
}

// transition INTO scene i (at t = i*BAR): [type, half-window]
const TR = [null, ['dissolve', .3], ['zoom', .16], ['whipUp', .13], ['whipL', .13], ['zoom', .16], ['whipL', .13],
  ['flash', .22], ['whipUp', .13], ['whipL', .13], ['zoom', .16], ['dissolve', .35]];
const INGREDIENTS = [['1 taza', 'lentejas'], ['1 L', 'agua (precocción)'], ['2', 'cebollas grandes'], ['1 taza', 'arroz'],
  ['2½ tazas', 'agua'], ['4–5 cdas', 'aceite de oliva'], ['½ cdta', 'comino en polvo'], ['2½ cdtas', 'sal'], ['al gusto', 'perejil fresco']];

// ───────── photo layer ─────────
function photo(c, s, t, i) {
  const img = (s.clip && clipFrame(s, i, t)) || IMG[s.img], mv = s.mv;
  const u = E.inOutSine(prog(t, i * BAR - .35, (i + 1) * BAR + .35));
  const z = lerp(mv.z[0], mv.z[1], u);
  const fx = lerp(mv.f[0][0], mv.f[1][0], u), fy = lerp(mv.f[0][1], mv.f[1][1], u);
  const rot = mv.r ? lerp(mv.r[0], mv.r[1], u) * Math.PI / 180 : 0;
  const sc = Math.max(W / img.width, H / img.height) * z;
  const tx = clamp(W / 2 - fx * img.width * sc, W - img.width * sc, 0);
  const ty = clamp(H / 2 - fy * img.height * sc, H - img.height * sc, 0);
  c.save();
  c.translate(W / 2, H / 2); c.rotate(rot); c.translate(-W / 2, -H / 2);
  // rack focus after soft cuts
  const tr = TR[i];
  const blur = tr && tr[0] !== 'whipL' && tr[0] !== 'whipUp' ? 12 * (1 - E.outCubic(prog(t, i * BAR - .05, i * BAR + .5))) : 0;
  if (blur > .4) c.filter = `blur(${blur.toFixed(1)}px)`;
  c.drawImage(img, tx, ty, img.width * sc, img.height * sc);
  c.filter = 'none';
  const map = (nx, ny) => [tx + nx * img.width * sc, ty + ny * img.height * sc];
  if (s.glints) glints(c, t, s.glints, map, sc);
  if (s.steam) for (const em of s.steam) steam(c, t, em, map, sc);
  c.restore();
}
function steam(c, t, em, map, sc) {
  const life = 3.2;
  c.save(); c.globalCompositeOperation = 'screen';
  for (let k = 0; k < em.n; k++) {
    const tt = t + k / em.n * life + em.seed * 1.7, age = tt % life, cyc = Math.floor(tt / life), a = age / life;
    const r1 = hash(k * 13.1 + cyc * 71.7 + em.seed), r2 = hash(k * 7.3 + cyc * 19.1 + em.seed * 3);
    const [px, py] = map(lerp(em.x0, em.x1, r1), em.y);
    const x = px + Math.sin(age * 1.2 + k) * 30 * a + noise(k * .7, age * .6, em.seed) * 90 * a;
    const y = py - age * em.rise * (.7 + r2 * .6);
    const size = em.size * (.45 + a * 1.5) * (sc / .9);
    const al = em.alpha * Math.pow(Math.sin(Math.PI * a), 1.3);
    if (al < .005) continue;
    c.globalAlpha = al;
    c.save(); c.translate(x, y); c.rotate((k % 2 ? 1 : -1) * age * .35 + r2 * TAU);
    c.drawImage(SMOKE[k % 3], -size / 2, -size / 2, size, size); c.restore();
  }
  c.restore();
}
function glints(c, t, g, map, sc) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < g.n; k++) {
    const f = 5 + hash(k * 3.3 + g.seed) * 12, ph = hash(k * 9.1 + g.seed) * TAU;
    const w = Math.sin(t * f + ph);
    if (w < .8) continue;
    const fl = Math.pow((w - .8) / .2, 2);
    const cyc = Math.floor((t * f + ph) / TAU);
    const [x, y] = map(lerp(g.x0, g.x1, hash(k * 1.7 + cyc * 3.9 + g.seed)), lerp(g.y0, g.y1, hash(k * 5.9 + cyc * 1.3 + g.seed)));
    const s = g.size * (.5 + fl * .8) * (sc / .9);
    c.globalAlpha = fl * g.a;
    c.drawImage(GLINT, x - s / 2, y - s / 2, s, s);
  }
  c.restore();
}
function shade(c, top = .8) {
  const g = c.createLinearGradient(0, 880, 0, H);
  g.addColorStop(0, 'rgba(14,9,5,0)'); g.addColorStop(.42, `rgba(14,9,5,${top * .75})`); g.addColorStop(1, `rgba(14,9,5,${top})`);
  c.fillStyle = g; c.fillRect(0, 880, W, H - 880);
  const g2 = c.createLinearGradient(0, 0, 0, 330);
  g2.addColorStop(0, 'rgba(14,9,5,.5)'); g2.addColorStop(1, 'rgba(14,9,5,0)');
  c.fillStyle = g2; c.fillRect(0, 0, W, 330);
}

// ───────── typography blocks ─────────
function wrap(str, font, maxW) {
  const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (textW(test, font) > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  lines.push(cur); return lines;
}
function maskedWords(c, lines, x, y0, lh, font, color, t, t0, stagger = .06) {
  let k = 0;
  lines.forEach((ln, li) => {
    const y = y0 + li * lh; let cx = x;
    c.font = font;
    for (const w of ln.split(' ')) {
      const p = E.outExpo(prog(t, t0 + k * stagger, t0 + k * stagger + .55));
      const ww = c.measureText(w).width;
      if (p > 0) {
        c.save(); c.beginPath(); c.rect(cx - 4, y - lh, ww + 8, lh + 18); c.clip();
        drawText(c, w, cx, y + (1 - p) * lh, font, color); c.restore();
      }
      cx += ww + c.measureText(' ').width; k++;
    }
  });
}
function stepBlock(c, s, t, i) {
  const u = t - i * BAR, X = 72;
  // number
  const pn = E.outExpo(prog(u, .1, .7));
  c.save(); c.beginPath(); c.rect(0, 1040, W, 200); c.clip();
  drawText(c, String(s.n).padStart(2, '0'), X - 6, 1222 + (1 - pn) * 190, 'italic 600 188px Fraunces', COL.saffron);
  c.restore();
  c.globalAlpha = prog(u, .3, .6);
  drawText(c, '/ 08', X + 232, 1212, '700 30px Mono', rgba(COL.cream, .75), 'left', 2);
  c.globalAlpha = 1;
  const lr = E.outExpo(prog(u, .2, .8));
  c.fillStyle = rgba(COL.cream, .35); c.fillRect(X + 232, 1228, 180 * lr, 2);
  // title
  const tf = '700 68px Grotesk', tl = wrap(s.title.toUpperCase(), tf, W - 2 * X);
  maskedWords(c, tl, X, 1318, 76, tf, COL.cream, u, .22, .07);
  let y = 1318 + (tl.length - 1) * 76 + 74;
  // detail lines
  if (s.lines) s.lines.forEach((ln, k) => {
    const p = E.outCubic(prog(u, .55 + k * .16, .95 + k * .16));
    c.globalAlpha = p; drawText(c, ln, X + (1 - p) * -40, y + k * 56, '500 40px Grotesk', rgba(COL.cream, .93)); c.globalAlpha = 1;
  });
  if (s.lines) y += s.lines.length * 56;
  // ingredient chips
  if (s.chips) {
    let cx = X, cy = y - 30;
    c.font = '500 36px Grotesk';
    s.chips.forEach((ch, k) => {
      const w = c.measureText(ch).width + 52;
      if (cx + w > W - X) { cx = X; cy += 80; }
      const p = E.outBack(prog(u, .45 + k * E8, .75 + k * E8), 2.2);
      if (p > 0) {
        c.save(); c.translate(cx + w / 2, cy + 30); c.scale(p, p);
        c.fillStyle = k === 0 ? COL.saffron : 'rgba(246,239,227,.16)';
        c.strokeStyle = k === 0 ? COL.saffron : 'rgba(246,239,227,.45)'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(-w / 2, -30, w, 60, 30); c.fill(); c.stroke();
        drawText(c, ch, 0, 12, '500 36px Grotesk', k === 0 ? COL.dark : COL.cream, 'center');
        c.restore();
      }
      cx += w + 14;
    });
  }
  // caramel colour scale
  if (s.caramel) {
    const by = y - 6, bw = 560, p = E.inOutCubic(prog(u, .7, 2.2));
    const a = prog(u, .6, .8); c.globalAlpha = a;
    const g = c.createLinearGradient(X, 0, X + bw, 0);
    g.addColorStop(0, '#F3E6BD'); g.addColorStop(.35, '#DDAA5E'); g.addColorStop(.7, '#9A5A22'); g.addColorStop(1, '#4A2710');
    c.fillStyle = g; c.beginPath(); c.roundRect(X, by, bw, 16, 8); c.fill();
    c.fillStyle = COL.cream; c.beginPath(); c.arc(X + bw * p, by + 8, 15, 0, TAU); c.fill();
    c.fillStyle = COL.dark; c.beginPath(); c.arc(X + bw * p, by + 8, 7, 0, TAU); c.fill();
    drawText(c, p > .92 ? 'CAFÉ OSCURO ✓' : 'CAFÉ OSCURO', X + bw + 26, by + 16, '700 24px Mono', p > .92 ? COL.saffron : rgba(COL.cream, .7), 'left', 2);
    c.globalAlpha = 1;
  }
  // timer
  if (s.timer) {
    const pp = E.outBack(prog(u, .3, .65), 2), f = E.inOutCubic(prog(u, .5, 2.3));
    if (pp > 0) {
      const cx = W - 172, cy = 1150;
      c.save(); c.translate(cx, cy); c.scale(pp, pp);
      c.fillStyle = 'rgba(20,14,9,.6)'; c.beginPath(); c.arc(0, 0, 96, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(246,239,227,.2)'; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 78, 0, TAU); c.stroke();
      c.strokeStyle = COL.saffron; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 78, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(.001, f)); c.stroke(); c.lineCap = 'butt';
      const secs = Math.round(f * s.timer * 60);
      drawText(c, `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, 0, 12, '700 36px Mono', COL.cream, 'center');
      drawText(c, 'MIN', 0, 48, '700 18px Mono', rgba(COL.cream, .6), 'center', 3);
      c.restore();
    }
  }
}
function titleLockup(c, t, t0, y, withTag) {
  const font = '600 158px Fraunces', word = 'MUJADDARA', sp = 4;
  mctx.font = font;
  let w = textW(word, font, sp), scale = Math.min(1, (W - 120) / w);
  const x0 = W / 2 - w * scale / 2;
  c.save(); c.translate(x0, y); c.scale(scale, scale);
  let cx = 0, k = 0;
  c.font = font; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  for (const ch of word) {
    const p = E.outExpo(prog(t, t0 + k * .045, t0 + k * .045 + .7));
    c.save(); c.beginPath(); c.rect(cx - 10, -150, c.measureText(ch).width + 20, 190); c.clip();
    c.fillStyle = COL.cream; c.fillText(ch, cx, (1 - p) * 170); c.restore();
    cx += c.measureText(ch).width + sp; k++;
  }
  c.restore();
  const lr = E.outExpo(prog(t, t0 + .3, t0 + 1));
  c.fillStyle = COL.saffron; c.fillRect(W / 2 - 170 * lr, y + 36, 340 * lr, 3);
  if (withTag) {
    c.globalAlpha = prog(t, t0 - .1, t0 + .3);
    drawText(c, typed('CURSO DE COCINA  ·  RECETA 01', t, t0 - .1, 60), W / 2, y - 176, '700 26px Mono', COL.saffron, 'center', 4);
    c.globalAlpha = 1;
  }
}

// ───────── scenes ─────────
function drawScene(c, i, t) {
  const s = SC[i];
  c.fillStyle = COL.dark; c.fillRect(0, 0, W, H);
  if (s.kind === 'ingredients') {
    const img = IMG.blur, u = prog(t, i * BAR - .35, (i + 1) * BAR + .35), z = lerp(1.2, 1.1, u);
    const w = W * z, h = w * img.height / img.width;
    c.drawImage(img, W / 2 - w / 2, H / 2 - h / 2 - u * 40, w, h);
    c.fillStyle = 'rgba(14,9,5,.55)'; c.fillRect(0, 0, W, H);
    ingredients(c, t - i * BAR);
    return;
  }
  photo(c, s, t, i);
  const u = t - i * BAR;
  if (s.kind === 'intro') {
    shade(c, .82);
    titleLockup(c, u, .35, 1450, true);
    const sub = 'arroz con lentejas y cebolla crujiente';
    c.globalAlpha = E.outCubic(prog(u, 1.0, 1.6));
    drawText(c, sub, W / 2, 1560 + (1 - c.globalAlpha) * 20, 'italic 400 46px Fraunces', rgba(COL.cream, .92), 'center');
    c.globalAlpha = 1;
  } else if (s.kind === 'final') {
    shade(c, .85);
    titleLockup(c, u, .2, 1500, true);
    const p = E.outCubic(prog(u, .7, 1.3));
    c.globalAlpha = p;
    drawText(c, 'Buen provecho.', W / 2, 1610 + (1 - p) * 20, 'italic 400 56px Fraunces', COL.saffron, 'center');
    c.globalAlpha = E.outCubic(prog(u, 1.0, 1.5)) * .8;
    drawText(c, '≈ 40 MIN  ·  8 PASOS  ·  9 INGREDIENTES', W / 2, 1690, '700 24px Mono', COL.cream, 'center', 3);
    c.globalAlpha = 1;
  } else {
    shade(c, .86);
    stepBlock(c, s, t, i);
  }
}
function ingredients(c, u) {
  const X = 90;
  const pt = E.outExpo(prog(u, .05, .6));
  c.save(); c.beginPath(); c.rect(0, 330, W, 90); c.clip();
  drawText(c, 'INGREDIENTES', X, 400 + (1 - pt) * 80, '700 44px Grotesk', COL.saffron, 'left', 10);
  c.restore();
  c.globalAlpha = prog(u, .3, .6);
  drawText(c, '9', W - X, 402, 'italic 600 64px Fraunces', rgba(COL.cream, .8), 'right');
  c.globalAlpha = 1;
  c.fillStyle = rgba(COL.cream, .5); c.fillRect(X, 440, (W - 2 * X) * E.outExpo(prog(u, .1, .8)), 2);
  INGREDIENTS.forEach(([q, name], k) => {
    const y = 540 + k * 98, t0 = .22 + k * E8 / 2;
    const p = E.outExpo(prog(u, t0, t0 + .6));
    if (p <= 0) return;
    c.globalAlpha = Math.min(1, p * 1.5);
    drawText(c, q, X + (1 - p) * -30, y, 'italic 600 46px Fraunces', COL.saffron);
    drawText(c, name, 380 + (1 - p) * 30, y, '500 42px Grotesk', COL.cream);
    c.fillStyle = rgba(COL.cream, .14); c.fillRect(X, y + 32, (W - 2 * X) * p, 1.5);
    c.globalAlpha = 1;
  });
  c.globalAlpha = E.outCubic(prog(u, 1.7, 2.1)) * .7;
  drawText(c, '≈ 40 MIN  ·  1 CAZUELA  ·  1 SARTÉN', W / 2, 1520, '700 26px Mono', COL.cream, 'center', 3);
  c.globalAlpha = 1;
}

// ───────── compositor ─────────
function frameScene(t) {
  const c = sctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const i = Math.min(11, Math.floor(t / BAR));
  // which boundary are we near?
  let k = -1, e = 0;
  for (const cand of [i, i + 1]) {
    if (cand < 1 || cand > 11) continue;
    const [, hw] = TR[cand], b = cand * BAR;
    if (Math.abs(t - b) < hw) { k = cand; e = (t - (b - hw)) / (2 * hw); }
  }
  if (k < 0) { drawScene(c, i, t); return; }
  const type = TR[k][0];
  drawScene(lA, k - 1, t); drawScene(lB, k, t);
  c.fillStyle = COL.dark; c.fillRect(0, 0, W, H);
  if (type === 'whipL' || type === 'whipUp') {
    const q = E.inOutQuart(e), horiz = type === 'whipL';
    c.drawImage(layA, horiz ? -W * q : 0, horiz ? 0 : -H * q);
    c.drawImage(layB, horiz ? W * (1 - q) : 0, horiz ? 0 : H * (1 - q));
  } else if (type === 'zoom') {
    const za = 1 + .7 * E.inQuad(e), zb = lerp(1.45, 1, E.outCubic(e));
    c.save(); c.translate(W / 2, H / 2); c.scale(za, za); c.drawImage(layA, -W / 2, -H / 2); c.restore();
    c.save(); c.globalAlpha = E.inOutSine(clamp(e * 1.4 - .2)); c.translate(W / 2, H / 2); c.scale(zb, zb); c.drawImage(layB, -W / 2, -H / 2); c.restore();
  } else {
    c.drawImage(layA, 0, 0);
    c.globalAlpha = E.inOutSine(e); c.drawImage(layB, 0, 0); c.globalAlpha = 1;
    const peak = Math.sin(Math.PI * e);
    c.save(); c.globalCompositeOperation = 'screen';
    if (type === 'flash') { c.fillStyle = `rgba(255,236,205,${.85 * peak})`; c.fillRect(0, 0, W, H); }
    const g = c.createRadialGradient(W * (.1 + .8 * e), H * .3, 0, W * (.1 + .8 * e), H * .3, 1300);
    g.addColorStop(0, `rgba(255,160,70,${.6 * peak})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.restore();
  }
  c.globalAlpha = 1;
}

const STEP_T = [[5, 7.5], [7.5, 10], [10, 12.5], [12.5, 15], [15, 20], [20, 22.5], [22.5, 25], [25, 27.5]];
function hud(o, t) {
  const a = prog(t, 4.85, 5.2) * (1 - prog(t, 27.4, 27.7));
  if (a <= 0) return;
  o.save(); o.globalAlpha = a;
  const x0 = 60, x1 = W - 60, gap = 10, sw = (x1 - x0 - gap * 7) / 8, y = 150;
  let cur = 0;
  STEP_T.forEach(([s, e], k) => {
    const f = prog(t, s, e); if (t >= s) cur = k;
    o.fillStyle = 'rgba(246,239,227,.28)'; o.beginPath(); o.roundRect(x0 + k * (sw + gap), y, sw, 6, 3); o.fill();
    if (f > 0) { o.fillStyle = COL.cream; o.beginPath(); o.roundRect(x0 + k * (sw + gap), y, sw * f, 6, 3); o.fill(); }
  });
  drawText(o, 'MUJADDARA', x0, y + 52, '700 26px Grotesk', COL.cream, 'left', 5);
  drawText(o, `PASO ${cur + 1} / 8`, x1, y + 52, '700 24px Mono', rgba(COL.cream, .85), 'right', 2);
  o.restore();
}
function post(o, src, t) {
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
  o.drawImage(src, 0, 0);
  // warm grade + gentle contrast
  o.globalCompositeOperation = 'soft-light'; o.fillStyle = 'rgba(255,170,90,.22)'; o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'source-over';
  o.fillStyle = VIGNETTE; o.fillRect(0, 0, W, H);
  hud(o, t);
  const f = Math.floor(t * FPS);
  o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = .07;
  o.translate((f * 97) % 256, (f * 57) % 256); o.fillStyle = GRAIN[f % 4]; o.fillRect(-256, -256, W + 256, H + 256);
  o.restore();
  const blk = Math.max(1 - prog(t, 0, .3), prog(t, 29.4, 30));
  if (blk > 0) { o.globalAlpha = blk; o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.globalAlpha = 1; }
}
function inTransition(t) { for (let k = 1; k <= 11; k++) { if (Math.abs(t - k * BAR) < TR[k][1] && TR[k][0].startsWith('whip') || Math.abs(t - k * BAR) < TR[k][1] && TR[k][0] === 'zoom') return true; } return false; }
function renderAt(t, sub = SUB) {
  if (sub > 1 && inTransition(t)) sub = 14;
  for (let s = 0; s < sub; s++) {
    frameScene(Math.min(DUR - 1e-4, t + (s / sub) * SHUTTER / FPS));
    actx.globalAlpha = 1 / (s + 1); actx.drawImage(sceneC, 0, 0);
  }
  actx.globalAlpha = 1;
  post(out, accC, t);
}

// ───────── API / preview ─────────
window.reelReady = (async () => {
  await Promise.all(['600 100px Fraunces', 'italic 400 40px Fraunces', 'italic 600 40px Fraunces', '500 30px Grotesk', '700 30px Grotesk', '400 20px Mono', '700 20px Mono'].map(f => document.fonts.load(f, 'Aá½–·✓')));
  await loadAssets();
})();
window.renderFrame = async f => { if (USE_CLIPS) await prepareClips(f / FPS); renderAt(f / FPS); };
window.reelInfo = { W, H, FPS, DUR, frames: FPS * DUR };

if (!/[?&]render/.test(location.search)) {
  const params = new URLSearchParams(location.search);
  SUB = +(params.get('sub') || 1);
  const music = document.getElementById('music'), play = document.getElementById('play');
  window.reelReady.then(() => {
    const at = params.get('t');
    if (at !== null) { window.renderFrame(Math.round(+at * FPS)); return; }
    renderAt(1.8); play.hidden = false;
    const loop = () => { const tt = Math.min(DUR - 1e-3, music.currentTime); if (USE_CLIPS) prepareClips(tt); renderAt(tt); if (!music.paused) requestAnimationFrame(loop); else play.hidden = false; };
    play.onclick = () => { play.hidden = true; music.currentTime = 0; music.play().then(loop); };
  });
}
