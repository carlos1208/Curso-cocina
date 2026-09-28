'use strict';
/*
 * BRISKET AHUMADO — recipe explainer, 30 s, 1080x1920 (9:16), 30 fps.
 * Illustrated top-down stage drawn on canvas. Every frame is a pure function of t:
 * all textures are generated once from seeded noise, nothing depends on wall-clock time.
 */
const W = 1080, H = 1920, FPS = 30, DUR = 30;
const SX = 540, SY = 790;                    // stage centre
const MX = 72, CW = W - MX * 2;              // text margin / column width
const COL = { bg: '#14100D', cream: '#F4ECDF', ember: '#EE7A3A', mute: 'rgba(244,236,223,.58)', dim: 'rgba(244,236,223,.3)' };
const F = { serif: 'Fraunces, Georgia, serif', sans: 'Grotesk, Helvetica, Arial, sans-serif', mono: 'Mono, Menlo, Consolas, monospace' };

// ───────── math ─────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const sstep = (a, b, x) => { const u = prog(x, a, b); return u * u * (3 - 2 * u); };
const plateau = (t, a, b, e) => sstep(a, a + e, t) * (1 - sstep(b - e, b, t));
const TAU = Math.PI * 2;
const E = {
  inQuad: t => t * t,
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const PERM = new Uint8Array(512);
(() => { const r = rng(7), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
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
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ───────── canvases & text ─────────
const out = document.getElementById('c').getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mctx = mk(4, 4).getContext('2d');

function textW(str, font, sp = 0) {
  mctx.font = font;
  if (!sp) return mctx.measureText(str).width;
  let w = 0; for (const ch of str) w += mctx.measureText(ch).width + sp; return w - sp;
}
function drawText(c, str, x, y, font, color, align = 'left', sp = 0) {
  c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  if (!sp) { c.textAlign = align; c.fillText(str, x, y); return; }
  c.textAlign = 'left';
  let cx = align === 'center' ? x - textW(str, font, sp) / 2 : align === 'right' ? x - textW(str, font, sp) : x;
  for (const ch of str) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
}
const FIT = new Map();
function fitSize(str, pre, fam, max, maxW, spK = 0) {
  const key = `${str}|${pre}|${max}|${maxW}`;
  if (!FIT.has(key)) { let s = max; while (s > 24 && textW(str, `${pre} ${s}px ${fam}`, s * spK) > maxW) s -= 2; FIT.set(key, s); }
  return FIT.get(key);
}
// masked slide-up reveal: p = appear progress, q = exit progress
function reveal(c, str, x, y, size, font, color, align, sp, p, q = 0) {
  if (p <= 0 || q >= 1) return;
  c.save();
  c.beginPath(); c.rect(0, y - size * 1.08, W, size * 1.45); c.clip();
  const dy = (1 - E.outExpo(p)) * size * 1.25 - E.inCubic(q) * size * 1.25;
  c.globalAlpha *= clamp(p * 4) * (1 - q * q);
  drawText(c, str, x, y + dy, font, color, align, sp);
  c.restore();
}
const pa = (t, t0, d = .55) => prog(t, t0, t0 + d);            // appear progress
const pq = (t, t1, d = .28) => prog(t, t1 - d, t1);             // exit progress

// ───────── brisket geometry (stage-local px, point on the left, flat on the right) ─────────
const BR_PTS = [[-350, -30], [-336, -130], [-280, -180], [-180, -192], [-80, -178], [20, -156], [130, -142], [240, -136], [318, -118],
  [354, -60], [358, 30], [334, 100], [260, 128], [140, 138], [10, 150], [-120, 168], [-244, 170], [-320, 126], [-352, 50]];
function closedSpline(pts, steps = 24) {
  const n = pts.length, path = new Path2D(), samples = [];
  const at = i => pts[(i + n) % n];
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
    for (let s = 0; s < steps; s++) {
      const u = s / steps, v = 1 - u, a = v * v * v, b = 3 * v * v * u, cc = 3 * v * u * u, d = u * u * u;
      samples.push([a * p1[0] + b * c1[0] + cc * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + cc * c2[1] + d * p2[1]]);
    }
  }
  path.closePath();
  return { path, samples };
}
const BR = closedSpline(BR_PTS);
BR.ang = BR.samples.map(([x, y]) => Math.atan2(y, x));
function outlineAt(a) {                                   // outline point + tangent at polar angle a
  let best = 0, bd = 9;
  BR.ang.forEach((b, i) => { const d = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); if (d < bd) { bd = d; best = i; } });
  const n = BR.samples.length, p = BR.samples[best], q = BR.samples[(best + 1) % n], o = BR.samples[(best - 1 + n) % n];
  return { p, tan: Math.atan2(q[1] - o[1], q[0] - o[0]) };
}
const BW = 780, BH = 460, OX = 390, OY = 230;             // texture canvas (brisket-local origin at OX,OY)
let MASK, INNER;
function colExt(lx) {                                     // vertical extent of the brisket at local x
  const ix = Math.round(lx + OX); let y0 = -1, y1 = -1;
  for (let y = 0; y < BH; y++) if (MASK[y * BW + ix] > .5) { if (y0 < 0) y0 = y; y1 = y; }
  return [y0 - OY, y1 - OY];
}

// ───────── recipe timeline ─────────
const STEPS = [
  { t0: 3.0, t1: 5.2, head: 'El corte', tag: 'INGREDIENTE', name: 'BRISKET ENTERO', qty: '6 kg', note: 'Corte packer: punta y plano, con su grasa' },
  { t0: 5.2, t1: 7.8, head: 'Recortar', tag: 'TÉCNICA', name: 'RECORTAR GRASA', qty: 'a 6 mm', note: 'Capa pareja · bordes redondeados' },
  { t0: 7.8, t1: 9.8, head: 'Sazonar', tag: 'INGREDIENTE', name: 'SAL KOSHER', qty: '½ taza', note: 'Unos 70 g · grano grueso, por todos lados' },
  { t0: 9.8, t1: 11.8, head: 'Sazonar', tag: 'INGREDIENTE', name: 'PIMIENTA NEGRA', qty: '½ taza', note: 'Unos 55 g · molida gruesa · 1:1 con la sal' },
  { t0: 11.8, t1: 13.6, head: 'Encender el ahumador', tag: 'INGREDIENTE', name: 'LEÑA DE ROBLE', qty: '4 troncos', note: 'Precalentar a 120 °C · humo limpio y azulado' },
  { t0: 13.6, t1: 16.0, head: 'Ahumar', tag: 'COCCIÓN', name: 'AHUMAR', qty: '6 h a 120 °C', note: 'Grasa arriba · hasta 74 °C internos' },
  { t0: 16.0, t1: 17.4, head: 'Rociar', tag: 'INGREDIENTE', name: 'VINAGRE + AGUA', qty: '125 + 125 ml', note: 'Vinagre de manzana · cada hora, si la corteza seca' },
  { t0: 17.4, t1: 19.6, head: 'Envolver', tag: 'INGREDIENTE', name: 'PAPEL DE CARNICERO', qty: '1 m', note: 'Sin encerar · envolver bien ajustado' },
  { t0: 19.6, t1: 22.6, head: 'Terminar la cocción', tag: 'COCCIÓN', name: 'AHUMAR ENVUELTO', qty: '+5 h', note: 'Hasta 95 °C internos · la sonda entra sin resistencia' },
  { t0: 22.6, t1: 24.2, head: 'Reposar', tag: 'REPOSO', name: 'REPOSAR', qty: '1 h', note: 'Envuelto, sin abrir · los jugos se redistribuyen' },
  { t0: 24.2, t1: 26.6, head: 'Cortar', tag: 'TÉCNICA', name: 'REBANAR', qty: '6 mm', note: 'En contra de la fibra · grosor de un lápiz' },
  { t0: 26.6, t1: 28.0, head: 'Servir', tag: 'GUARNICIÓN',
    list: [['PEPINILLOS', '8 rodajas', 26.62], ['CEBOLLA BLANCA', '½ pieza', 27.07], ['PAN BLANCO', '4 rebanadas', 27.52]] },
];
const PHASES = [[0, 3, 'INTRO'], [3, 11.8, 'PREPARAR'], [11.8, 22.6, 'AHUMAR'], [22.6, 28, 'CORTAR'], [28, 30, 'FIN']];
const stepAt = t => { for (let i = STEPS.length - 1; i >= 0; i--) if (t >= STEPS[i].t0) return t < STEPS[i].t1 ? i : -1; return -1; };
// consecutive steps with the same headline share one headline block
const HEADS = [];
for (const s of STEPS) { const h = HEADS[HEADS.length - 1]; if (h && h.text === s.head) h.t1 = s.t1; else HEADS.push({ text: s.head, t0: s.t0, t1: s.t1 }); }

// cooking gauges (°C and elapsed hours) as functions of t
function pitTemp(t) { return t < 12.3 ? 20 : t < 13.4 ? lerp(20, 120, E.outCubic(prog(t, 12.3, 13.4))) : 120 + 1.4 * noise(t * .9, 3.3, .5); }
function coreTemp(t) {
  if (t < 13.6) return 4;
  if (t < 17.4) { const p = prog(t, 13.6, 17.4); return 4 + 66 * E.outCubic(p) + 4 * p; }   // fast rise, then "the stall"
  if (t < 19.6) return 74 + prog(t, 17.4, 19.6);
  if (t < 22.6) return 75 + 20 * E.inOutSine(prog(t, 19.6, 22.6));
  return 95 - 2 * prog(t, 22.6, 24.2);
}
function cookHours(t) {
  if (t < 17.4) return 6 * prog(t, 13.6, 17.4);
  if (t < 19.6) return 6 + .25 * prog(t, 17.4, 19.6);
  if (t < 22.6) return 6.25 + 4.75 * prog(t, 19.6, 22.6);
  return 11 + prog(t, 22.6, 24.2);
}
const hm = h => { const m = Math.floor(h * 60 + 1e-6); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };
const toF = c => Math.round(c * 9 / 5 + 32);

// ───────── generated assets ─────────
const TEX = {};
let SALT = [], PEP = [], LUMPS = [], SLICES = [], SMOKE = [], GRAIN = [], PAPER, VIGNETTE;
const TRIM = [5.5, 7.5], SALT_T = [8.1, 9.5], PEP_T = [10.1, 11.5];
const CUT0 = 24.95, CUT_DT = .19, CUTS = [350, 300, 254, 208, 162, 116, 70, 24, -22];
const SLICE_POS = { x: -100, y: -110 };

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), dst = new Float32Array(w * h), n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) { tmp[row + x] = acc / n; acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { dst[y * w + x] = acc / n; acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return dst;
}

function brisketTextures() {
  const m = mk(BW, BH), mc = m.getContext('2d');
  mc.translate(OX, OY); mc.fillStyle = '#fff'; mc.fill(BR.path);
  const md = mc.getImageData(0, 0, BW, BH).data;
  MASK = new Float32Array(BW * BH);
  for (let i = 0; i < MASK.length; i++) MASK[i] = md[i * 4 + 3] / 255;
  const bl = boxBlur(boxBlur(MASK, BW, BH, 16), BW, BH, 16);
  INNER = new Float32Array(BW * BH);
  for (let i = 0; i < MASK.length; i++) INNER[i] = clamp((bl[i] - .5) * 2.2);
  // height field: rounded edges, the point sits higher than the flat
  const hb = boxBlur(boxBlur(MASK, BW, BH, 26), BW, BH, 26), HT = new Float32Array(BW * BH);
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) HT[y * BW + x] = hb[y * BW + x] * (.7 + .5 * sstep(120, -260, x - OX));
  const bump = i => 1 + 13 * (.55 * (HT[i + 1] - HT[i - 1]) / 2 + .75 * (HT[i + BW] - HT[i - BW]) / 2);

  const make = shade => {
    const c = mk(BW, BH), cc = c.getContext('2d'), id = cc.createImageData(BW, BH), d = id.data;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const i = y * BW + x, a = MASK[i]; if (!a) continue;
      const lx = x - OX, ly = y - OY, inner = INNER[i];
      const light = (1 + .06 * (-lx / 350 * .6 - ly / 180 * .8)) * bump(i);
      const col = shade(lx, ly, inner, i);
      if (col.length > 3) { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = col[3] * a; continue; }
      const k = light * (.8 + .2 * inner);
      d[i * 4] = col[0] * k; d[i * 4 + 1] = col[1] * k; d[i * 4 + 2] = col[2] * k; d[i * 4 + 3] = a * 255;
    }
    cc.putImageData(id, 0, 0);
    // deckle seam between point and flat
    cc.save(); cc.translate(OX, OY); cc.clip(BR.path);
    cc.strokeStyle = 'rgba(80,30,20,.16)'; cc.lineWidth = 5; cc.beginPath(); cc.moveTo(-10, -160); cc.bezierCurveTo(30, -60, -40, 60, -10, 175); cc.stroke();
    cc.restore();
    return c;
  };
  const meat = (lx, ly) => {
    const fib = .5 + .5 * noise(lx / 70, ly / 5, 3), mott = .5 + .5 * noise(lx / 28, ly / 28, 5);
    return mix3([146, 38, 46], [198, 88, 88], .35 * fib + .5 * mott);
  };
  const fatN = (lx, ly) => noise(lx / 60, ly / 60, 1) * .6 + noise(lx / 20, ly / 20, 2) * .25;
  const fine = (lx, ly, k) => 1 + .05 * noise(lx / 5, ly / 5, k) + .03 * noise(lx / 2.5, ly / 2.5, k + 1);
  TEX.raw = make((lx, ly, inner) => {
    const f = sstep(.2, .42, inner + fatN(lx, ly) * .5);
    const fat = mix3([244, 236, 220], [226, 208, 178], .35 + .35 * noise(lx / 22, ly / 22, 4))
      .map(v => v * (.95 + .07 * noise(lx / 45, ly / 45, 7)) * fine(lx, ly, 8));
    return mix3(meat(lx, ly), fat, f);
  });
  TEX.trim = make((lx, ly, inner) => {
    const thr = .64 + .36 * sstep(150, 350, lx) + .12 * sstep(40, 160, ly);   // more meat shows on the flat and the lower edge
    let f = sstep(thr - .16, thr + .06, inner + fatN(lx, ly) * .5);
    f *= 1 - .3 * sstep(.55, .8, noise(lx / 70, ly / 70, 15));                  // thin spots let the meat blush through
    const fat = mix3([240, 230, 210], [230, 212, 182], .5 + .4 * noise(lx / 30, ly / 30, 4)).map(v => v * fine(lx, ly, 18));
    return mix3(meat(lx, ly), fat, f);
  });
  TEX.bark = make((lx, ly, inner) => {
    const crack = sstep(.8, .97, 1 - Math.abs(noise(lx / 13, ly / 13, 9)));
    const grain = .5 + .35 * noise(lx / 3, ly / 3, 10) + .15 * noise(lx / 7, ly / 7, 13);
    const base = mix3([56, 30, 18], [24, 13, 9], .45 + .45 * noise(lx / 30, ly / 30, 11));
    const warm = (1 - inner) * .85 + .35 * (.5 + .5 * noise(lx / 50, ly / 50, 12));
    return mix3(base, [124, 52, 24], clamp(warm * .55)).map(v => v * (1 - .22 * crack) * (.72 + .5 * grain));
  });
  // glistening rendered fat on the bark (drawn with 'screen')
  TEX.sheen = make((lx, ly, inner, i) => {
    const n = noise(lx / 9, ly / 9, 31) * .6 + noise(lx / 3.5, ly / 3.5, 32) * .4;
    const broad = .35 + .65 * clamp(1 - ((lx + 140) ** 2 / 320 ** 2 + (ly + 70) ** 2 / 170 ** 2));
    const v = sstep(.12, .5, n) * broad * clamp((bump(i) - .9) * 2.5) * inner;
    return [255, 214, 168, 255 * clamp(v)];
  });

  // seasoning: specks sampled inside the brisket, landing along the shaker's serpentine path
  const inside = (r, n) => { const pts = []; while (pts.length < n) { const x = (r() * 2 - 1) * 350, y = (r() * 2 - 1) * 190, i = Math.round(y + OY) * BW + Math.round(x + OX); if (MASK[i] > .95 && INNER[i] > .08) pts.push([x, y]); } return pts; };
  const land = (x, y, [a, b], r) => { const row = y < -60 ? 0 : y < 60 ? 1 : 2, u = clamp((x + 330) / 660); return a + (b - a) * (row + (row % 2 ? 1 - u : u)) / 3 + (r() - .5) * .08; };
  const rs = rng(11), rp = rng(12);
  SALT = inside(rs, 750).map(([x, y]) => ({ x, y, s: 1.6 + rs() * 1.8, tl: land(x, y, SALT_T, rs), ox: (rs() - .5) * 60, oy: (rs() - .5) * 60, c: rs() < .7 ? '#FBF8F2' : '#E4DED4' }));
  const pc = ['#15100D', '#221A15', '#2E2621', '#46403B'];
  PEP = inside(rp, 1250).map(([x, y]) => ({ x, y, s: 1.8 + rp() * 2.6, tl: land(x, y, PEP_T, rp), ox: (rp() - .5) * 60, oy: (rp() - .5) * 60, c: pc[Math.floor(rp() * 4)] }));
  const bake = list => { const c = mk(BW, BH), cc = c.getContext('2d'); cc.translate(OX, OY); for (const s of list) { cc.fillStyle = s.c; cc.fillRect(s.x, s.y, s.s, s.s); } return c; };
  TEX.salt = bake(SALT); TEX.pep = bake(PEP);

  // cooked brisket (used for slicing): bark + pepper + sheen
  const ck = mk(BW, BH), kc = ck.getContext('2d');
  kc.drawImage(TEX.bark, 0, 0); kc.globalAlpha = .8; kc.drawImage(TEX.pep, 0, 0); kc.globalAlpha = 1;
  kc.translate(OX, OY); gloss(kc, .7);
  TEX.cooked = ck;

  // fat trimmings hanging off the edge
  const rl = rng(21);
  LUMPS = [-2.7, -1.75, -.7, .35, 1.25, 2.3].map((a, j) => {
    const { p, tan } = outlineAt(a), len = Math.hypot(p[0], p[1]);
    const rx = 48 + rl() * 26, ry = 20 + rl() * 10, pts = [];
    for (let k = 0; k < 16; k++) { const u = k / 16 * TAU, rr = 1 + .3 * noise(Math.cos(u) * 1.6 + j * 3, Math.sin(u) * 1.6, 20); pts.push([Math.cos(u) * rx * rr, Math.sin(u) * ry * rr]); }
    return { a, x: p[0] + p[0] / len * ry * .25, y: p[1] + p[1] / len * ry * .25, nx: p[0] / len, ny: p[1] / len, rot: tan, rx, path: closedSpline(pts, 8).path,
      td: TRIM[0] + (TRIM[1] - TRIM[0]) * (a + Math.PI) / TAU };
  });

  // slices: strip geometry + the cut face each one shows once it falls over
  SLICES = [];
  for (let k = 1; k < CUTS.length; k++) {
    const xa = CUTS[k], xb = Math.min(CUTS[k - 1], 346), mid = (xa + xb) / 2, [top, bot] = colExt(mid);
    const tc = CUT0 + (k - 1) * CUT_DT + .17;
    SLICES.push({ k, xa, xb, mid, top, bot, tc, face: sliceFace(k, (bot - top) * .92),
      tx: 236 - (k - 1) * 50, ty: 224 + 10 * Math.sin(k * 1.7), rot: (hash(k * 3.1) - .5) * .16 });
  }
}

function gloss(c, g) {
  if (g <= 0) return;
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha *= clamp(g);
  c.drawImage(TEX.sheen, -OX, -OY);
  c.restore();
}

function sliceFace(k, h) {
  const w = 74, pad = 10, c = mk(w + pad * 2, Math.ceil(h) + pad * 2), g = c.getContext('2d'), r = rng(40 + k);
  g.translate(pad, pad);
  const rr = (x, y, ww, hh, rad, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, ww, hh, rad); g.fill(); };
  const L = 8;                                                // bark is thickest on the top surface (left edge)
  rr(0, 0, w, h, 14, '#1E110B');
  rr(L, 4, w - L - 4, h - 8, 11, '#AE4B52');                  // smoke ring
  rr(L, 6, 5, h - 12, 2, '#E2C697');                          // rendered fat cap
  const ix = L + 9, iw = w - ix - 8;
  const mg = g.createRadialGradient(ix + iw * .45, h * .45, 4, ix + iw / 2, h / 2, h * .55);
  mg.addColorStop(0, '#B07660'); mg.addColorStop(.6, '#98624C'); mg.addColorStop(1, '#7C4A38');
  g.fillStyle = mg; g.beginPath(); g.roundRect(ix, 9, iw, h - 18, 8); g.fill();
  g.save(); g.beginPath(); g.roundRect(ix, 9, iw, h - 18, 8); g.clip();
  for (let i = 0; i < 160; i++) {                             // fibre ends: fine granular texture
    g.fillStyle = r() < .55 ? 'rgba(70,32,20,.16)' : 'rgba(236,184,156,.12)';
    g.fillRect(ix + r() * iw, 9 + r() * (h - 18), 1.4 + r() * 2, 1.2 + r() * 1.4);
  }
  for (let i = 0; i < (k >= 6 ? 14 : 4); i++) {               // marbling, richer towards the point
    g.fillStyle = `rgba(236,208,166,${.25 + .35 * r()})`; g.beginPath();
    g.ellipse(ix + r() * iw, 12 + r() * (h - 24), 2 + r() * 5, 1 + r() * 2, (r() - .5) * .6, 0, TAU); g.fill();
  }
  const jh = g.createLinearGradient(ix, 0, ix + iw, 0);        // juicy sheen
  jh.addColorStop(0, 'rgba(255,220,200,.14)'); jh.addColorStop(.4, 'rgba(255,220,200,0)'); jh.addColorStop(1, 'rgba(255,220,200,.05)');
  g.fillStyle = jh; g.fillRect(ix, 9, iw, h - 18);
  g.restore();
  for (let i = 0; i < 40; i++) { g.fillStyle = r() < .5 ? 'rgba(6,4,3,.8)' : 'rgba(90,50,30,.6)'; g.fillRect(r() * 7, 6 + r() * (h - 12), 2.2, 2.2); }
  return c;
}

function surfaceTextures() {
  // cutting board
  const b = mk(920, 800), bc = b.getContext('2d'), r = rng(5);
  bc.translate(460, 400);
  const bg = bc.createLinearGradient(-460, -400, 460, 400);
  bg.addColorStop(0, '#CFA16B'); bg.addColorStop(1, '#AE7D4B');
  bc.fillStyle = bg; bc.beginPath(); bc.roundRect(-460, -400, 920, 800, 38); bc.fill();
  bc.save(); bc.clip();
  for (let i = 0; i < 95; i++) {
    const y0 = -410 + i * 8.8 + r() * 6, dark = r();
    bc.strokeStyle = `rgba(${dark < .8 ? '110,62,26' : '240,200,150'},${dark < .8 ? .05 + .1 * r() : .08})`;
    bc.lineWidth = .8 + r() * 2.4; bc.beginPath();
    for (let x = -470; x <= 470; x += 20) { const y = y0 + noise(x / 280, i * .21, 1.5) * 22 + noise(x / 60, i * .5, 2.5) * 3; x === -470 ? bc.moveTo(x, y) : bc.lineTo(x, y); }
    bc.stroke();
  }
  bc.restore();
  bc.strokeStyle = 'rgba(80,42,14,.32)'; bc.lineWidth = 7; bc.beginPath(); bc.roundRect(-420, -360, 840, 720, 24); bc.stroke();
  bc.strokeStyle = 'rgba(255,226,180,.14)'; bc.lineWidth = 2; bc.beginPath(); bc.roundRect(-416, -356, 840, 720, 24); bc.stroke();
  bc.strokeStyle = 'rgba(255,230,190,.28)'; bc.lineWidth = 3; bc.beginPath(); bc.roundRect(-458, -398, 916, 796, 37); bc.stroke();
  TEX.board = b;

  // smoker chamber with grate
  const g = mk(960, 840), gc = g.getContext('2d');
  gc.translate(480, 420);
  gc.fillStyle = '#0F0D0B'; gc.beginPath(); gc.roundRect(-480, -420, 960, 840, 34); gc.fill();
  gc.save(); gc.clip();
  const fl = gc.createRadialGradient(0, 0, 50, 0, 0, 620); fl.addColorStop(0, '#221C18'); fl.addColorStop(1, '#0E0C0A');
  gc.fillStyle = fl; gc.fillRect(-480, -420, 960, 840);
  for (const y of [-330, 330]) { gc.fillStyle = '#1B1815'; gc.fillRect(-480, y - 10, 960, 20); }
  for (let x = -462; x <= 462; x += 42) {
    const sg = gc.createLinearGradient(x - 6, 0, x + 6, 0);
    sg.addColorStop(0, '#2C2824'); sg.addColorStop(.45, '#6E665E'); sg.addColorStop(1, '#27231F');
    gc.fillStyle = 'rgba(0,0,0,.5)'; gc.fillRect(x - 2, -420, 12, 840);
    gc.fillStyle = sg; gc.fillRect(x - 6, -420, 12, 840);
  }
  gc.restore();
  gc.strokeStyle = '#2B2622'; gc.lineWidth = 18; gc.beginPath(); gc.roundRect(-471, -411, 942, 822, 28); gc.stroke();
  gc.strokeStyle = 'rgba(255,255,255,.07)'; gc.lineWidth = 2; gc.beginPath(); gc.roundRect(-479, -419, 958, 838, 34); gc.stroke();
  TEX.grate = g;

  // pink butcher paper
  const p = mk(256, 256), pc = p.getContext('2d'), id = pc.createImageData(256, 256), rp = rng(8);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4, n = 1 + .035 * noise(x / 9, y / 9, 4) + .04 * (rp() - .5);
    id.data[i] = 222 * n; id.data[i + 1] = 168 * n; id.data[i + 2] = 142 * n; id.data[i + 3] = 255;
  }
  pc.putImageData(id, 0, 0);
  for (let i = 0; i < 160; i++) { pc.strokeStyle = rp() < .5 ? 'rgba(255,240,230,.12)' : 'rgba(120,60,40,.06)'; pc.lineWidth = 1; const x = rp() * 256, y = rp() * 256, a = rp() * TAU, l = 6 + rp() * 16; pc.beginPath(); pc.moveTo(x, y); pc.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); pc.stroke(); }
  PAPER = mk(1000, 960);                                   // one pre-tiled sheet; flaps copy regions of it
  const sc0 = PAPER.getContext('2d'); sc0.fillStyle = sc0.createPattern(p, 'repeat'); sc0.fillRect(0, 0, 1000, 960);

  // logs for the firebox
  TEX.log = mk(230, 70);
  const lc = TEX.log.getContext('2d'), rl = rng(9);
  const lg = lc.createLinearGradient(0, 4, 0, 66); lg.addColorStop(0, '#2E1D12'); lg.addColorStop(.5, '#6A4428'); lg.addColorStop(1, '#261709');
  lc.fillStyle = lg; lc.beginPath(); lc.roundRect(4, 6, 200, 58, 20); lc.fill();
  for (let i = 0; i < 16; i++) { lc.strokeStyle = 'rgba(20,10,5,.55)'; lc.lineWidth = 1.5 + rl() * 2; const y = 12 + rl() * 46, x = 10 + rl() * 120; lc.beginPath(); lc.moveTo(x, y); lc.lineTo(x + 30 + rl() * 60, y + (rl() - .5) * 4); lc.stroke(); }
  lc.fillStyle = '#C79A68'; lc.beginPath(); lc.ellipse(200, 35, 20, 29, 0, 0, TAU); lc.fill();
  lc.strokeStyle = 'rgba(120,80,40,.6)'; lc.lineWidth = 1.5;
  for (let k = 1; k < 5; k++) { lc.beginPath(); lc.ellipse(200, 35, 20 * k / 5, 29 * k / 5, 0, 0, TAU); lc.stroke(); }

  // garnish sprites
  TEX.pickle = mk(96, 96);
  const kc = TEX.pickle.getContext('2d'); kc.translate(48, 48);
  kc.fillStyle = '#4D6A28'; kc.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, rr = 40 + 1.6 * Math.sin(a * 11); kc.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } kc.fill();
  const pg = kc.createRadialGradient(-6, -6, 4, 0, 0, 36); pg.addColorStop(0, '#DCE09A'); pg.addColorStop(.6, '#B5C062'); pg.addColorStop(1, '#8F9F3E');
  kc.fillStyle = pg; kc.beginPath(); kc.arc(0, 0, 35, 0, TAU); kc.fill();
  kc.fillStyle = 'rgba(245,242,200,.85)';
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; kc.beginPath(); kc.ellipse(Math.cos(a) * 15, Math.sin(a) * 15, 4.5, 2.5, a, 0, TAU); kc.fill(); }
  TEX.onion = mk(110, 110);
  const oc = TEX.onion.getContext('2d'); oc.translate(55, 55);
  oc.fillStyle = 'rgba(250,244,250,.5)'; oc.beginPath(); oc.arc(0, 0, 48, 0, TAU); oc.fill();
  for (const [rr, w, col] of [[46, 7, '#F6EEF6'], [35, 6, '#EDE2EE'], [25, 5, '#F4ECF4'], [15, 4, '#E6DAE8']]) { oc.strokeStyle = col; oc.lineWidth = w; oc.beginPath(); oc.arc(0, 0, rr, 0, TAU); oc.stroke(); }
  oc.strokeStyle = 'rgba(160,120,170,.35)'; oc.lineWidth = 1.5; oc.beginPath(); oc.arc(0, 0, 49.5, 0, TAU); oc.stroke();
  TEX.bread = mk(180, 190);
  const dc = TEX.bread.getContext('2d'), rb = rng(13); dc.translate(90, 95);
  const loaf = () => { dc.beginPath(); dc.moveTo(-70, 80); dc.lineTo(-70, -30); dc.bezierCurveTo(-90, -95, -10, -100, 0, -70); dc.bezierCurveTo(10, -100, 90, -95, 70, -30); dc.lineTo(70, 80); dc.closePath(); };
  loaf(); dc.fillStyle = '#C3874B'; dc.fill();
  dc.save(); dc.scale(.87, .87); dc.translate(0, 4); loaf(); dc.fillStyle = '#F4E8D1'; dc.fill(); dc.clip();
  for (let i = 0; i < 140; i++) { dc.fillStyle = `rgba(190,160,115,${.2 + rb() * .3})`; dc.beginPath(); dc.ellipse((rb() - .5) * 150, (rb() - .5) * 170, 1 + rb() * 3, .8 + rb() * 2, rb() * 3, 0, TAU); dc.fill(); }
  dc.restore();

  // smoke sprites: fBm noise × soft radial falloff
  for (let k = 0; k < 3; k++) {
    const s = mk(192, 192), sc = s.getContext('2d'), sd = sc.createImageData(192, 192);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      const dx = (x - 96) / 96, dy = (y - 96) / 96, dd = Math.sqrt(dx * dx + dy * dy);
      let n = 0, a = .5, f = 1;
      for (let o = 0; o < 4; o++) { n += a * noise(x / 192 * 4 * f + k * 10, y / 192 * 4 * f, k * 3.1); a *= .5; f *= 2; }
      const i = (y * 192 + x) * 4, v = clamp(.5 + n * 1.3) * Math.pow(clamp(1 - dd), 1.8);
      sd.data[i] = 226; sd.data[i + 1] = 230; sd.data[i + 2] = 236; sd.data[i + 3] = v * 255;
    }
    sc.putImageData(sd, 0, 0); SMOKE.push(s);
  }
  for (let k = 0; k < 4; k++) {
    const gr = mk(256, 256), gc2 = gr.getContext('2d'), gd = gc2.createImageData(256, 256), rr = rng(50 + k);
    for (let i = 0; i < gd.data.length; i += 4) { const v = rr() * 255; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = 255; }
    gc2.putImageData(gd, 0, 0); GRAIN.push(out.createPattern(gr, 'repeat'));
  }
  VIGNETTE = out.createRadialGradient(W / 2, H * .44, H * .32, W / 2, H * .5, H * .82);
  VIGNETTE.addColorStop(0, 'rgba(0,0,0,0)'); VIGNETTE.addColorStop(1, 'rgba(0,0,0,.5)');
}

// ───────── stage state ─────────
function camera(t) {
  return { s: lerp(.93, 1, E.outCubic(prog(t, 0, 1.6))) * (1 + .04 * E.inOutSine(prog(t, 28, 30))), a: E.outCubic(prog(t, 0, .7)) };
}
function brisketState(t) {
  const drop = prog(t, 3.0, 3.55), mv = E.inOutCubic(prog(t, 24.5, 24.9));
  const lift = Math.max(1 - E.outCubic(prog(t, 3.0, 3.6)), plateau(t, 11.7, 12.95, .3), .6 * plateau(t, 17.35, 17.95, .2), plateau(t, 22.45, 23.5, .3));
  return { x: SLICE_POS.x * mv, y: SLICE_POS.y * mv, s: (t < 3.55 ? lerp(1.22, 1, E.outCubic(drop)) : 1) * (1 + .05 * lift), lift, alpha: clamp(drop * 2.5), on: t >= 3.0 };
}
function boardX(t) {
  if (t < 11.95) return 0;
  if (t < 12.55) return -1300 * E.inOutCubic(prog(t, 11.95, 12.55));
  if (t < 22.75) return null;
  return 1300 * (1 - E.inOutCubic(prog(t, 22.75, 23.35)));
}
function grateX(t) {
  if (t < 12.15 || t > 23.2) return null;
  if (t < 12.75) return 1300 * (1 - E.inOutCubic(prog(t, 12.15, 12.75)));
  return -1300 * E.inOutCubic(prog(t, 22.6, 23.2));
}
const fireAmt = t => sstep(12.4, 13.3, t) * (1 - sstep(22.4, 23.0, t));
const barkAmt = t => .9 * E.inOutSine(prog(t, 13.8, 17.4)) + .1 * prog(t, 19.6, 22.6);
function wrapState(t) {
  const f = (a, b) => E.inOutCubic(prog(t, a, b));
  let bot = f(17.9, 18.35), top = f(18.25, 18.7), left = f(18.65, 19.05), right = f(18.95, 19.35);
  if (t >= 24.2) { right = 1 - f(24.2, 24.34); left = 1 - f(24.24, 24.38); top = 1 - f(24.3, 24.46); bot = 1 - f(24.36, 24.52); }
  return { bot, top, left, right, dx: 1300 * (1 - E.outCubic(prog(t, 17.45, 17.9))) - 1300 * E.inCubic(prog(t, 24.52, 24.9)),
    on: t >= 17.45 && t < 24.9, alpha: 1 - E.inQuad(prog(t, 24.45, 24.8)), full: Math.min(bot, top, left, right) };
}
function currentCut(t) { let x = 400; for (const s of SLICES) if (t >= s.tc) x = s.xa; return x; }

// ───────── stage drawing ─────────
function drawSurfaces(c, t) {
  const bx = boardX(t);
  if (bx !== null) {
    c.save(); c.translate(bx, 0);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 70; c.shadowOffsetY = 28;
    c.drawImage(TEX.board, -460, -400); c.restore();
  }
  const gx = grateX(t);
  if (gx !== null) {
    c.save(); c.translate(gx, 0);
    c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    c.drawImage(TEX.grate, -480, -420); c.shadowColor = 'transparent';
    const fire = fireAmt(t);
    if (fire > 0) {                                        // firebox glow bleeding in from the left
      c.beginPath(); c.roundRect(-462, -402, 924, 804, 22); c.clip();
      const fl = .85 + .15 * noise(t * 5, .3, 1);
      const g = c.createLinearGradient(-480, 0, 60, 0);
      g.addColorStop(0, `rgba(238,110,40,${.3 * fire * fl})`); g.addColorStop(1, 'rgba(238,110,40,0)');
      c.fillStyle = g; c.fillRect(-480, -420, 960, 840);
    }
    c.restore();
  }
}

function drawLumps(c, t) {
  for (const L of LUMPS) {
    if (t > L.td + .6) continue;
    const d = 170 * E.outCubic(prog(t, L.td, L.td + .5)), a = 1 - prog(t, L.td + .2, L.td + .6);
    c.save(); c.globalAlpha *= a;
    c.translate(L.x + L.nx * d, L.y + L.ny * d); c.rotate(L.rot + .9 * prog(t, L.td, L.td + .5));
    const g = c.createRadialGradient(-L.rx * .3, -6, 2, 0, 0, L.rx);
    g.addColorStop(0, '#F4EBD8'); g.addColorStop(.65, '#E2CEAC'); g.addColorStop(1, '#C99A86');
    c.shadowColor = 'rgba(40,20,5,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
    c.fillStyle = g; c.fill(L.path); c.restore();
  }
}

function drawBrisket(c, t, B) {
  const cut = currentCut(t);
  c.save();
  if (cut < 400) { c.beginPath(); c.rect(-420, -320, cut + 420, 640); c.clip(); }
  c.save();
  c.shadowColor = `rgba(18,8,2,${.55 - .15 * B.lift})`; c.shadowBlur = 24 + 60 * B.lift; c.shadowOffsetX = 8 + 36 * B.lift; c.shadowOffsetY = 12 + 46 * B.lift;
  c.fillStyle = '#3A1E14'; c.fill(BR.path); c.restore();
  if (t >= 24.3) {
    c.drawImage(TEX.cooked, -OX, -OY);
  } else {
    c.drawImage(TEX.raw, -OX, -OY);
    if (t >= TRIM[0]) {                                     // trimmed surface sweeps in behind the knife
      const a = -Math.PI + TAU * E.inOutSine(prog(t, TRIM[0], TRIM[1]));
      c.save(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 900, -Math.PI, a); c.closePath(); c.clip();
      c.drawImage(TEX.trim, -OX, -OY); c.restore();
    }
    const bark = barkAmt(t);
    if (bark > 0) {
      c.save(); c.globalAlpha = .55 * Math.sin(Math.PI * clamp(bark / .8)); c.fillStyle = '#8A4220'; c.fill(BR.path); c.restore();
      c.save(); c.globalAlpha = sstep(.25, 1, bark); c.drawImage(TEX.bark, -OX, -OY); c.restore();
    }
    specks(c, t, SALT, SALT_T, TEX.salt, 1 - sstep(13.8, 15.2, t));
    specks(c, t, PEP, PEP_T, TEX.pep, 1 - .2 * bark);
    gloss(c, .9 * plateau(t, 16.3, 17.9, .35) + .3 * sstep(13.8, 17.4, t));
  }
  if (cut < 400) {                                           // pink edge of the fresh cut
    c.save(); c.clip(BR.path); c.fillStyle = '#B9505B'; c.fillRect(cut - 5, -320, 5, 640); c.restore();
  }
  c.restore();
}
function specks(c, t, list, [a, b], baked, alpha) {
  if (t < a || alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  if (t > b + .2) c.drawImage(baked, -OX, -OY);
  else for (const s of list) if (s.tl <= t) { c.fillStyle = s.c; c.fillRect(s.x, s.y, s.s, s.s); }
  c.restore();
}
function shakerPos(u) {
  u = clamp(u, 0, 3); const row = Math.min(2, Math.floor(u)), f = u - row;
  return [lerp(-330, 330, row % 2 ? 1 - f : f), -120 + 120 * sstep(.9, 1.1, u) + 120 * sstep(1.9, 2.1, u)];
}
function drawSeasoning(c, t) {
  for (const [list, [a, b], kind] of [[SALT, SALT_T, 'salt'], [PEP, PEP_T, 'pep']]) {
    if (t < a - .45 || t > b + .45) continue;
    const up = u => shakerPos(3 * (u - a) / (b - a));
    for (const s of list) {
      if (t < s.tl - .2 || t >= s.tl) continue;
      const e = E.inQuad((t - s.tl + .2) / .2), [sx, sy] = up(s.tl - .2);
      const sz = s.s * (1 + 1.8 * (1 - e));
      c.fillStyle = s.c; c.fillRect(lerp(sx + s.ox, s.x, e), lerp(sy + s.oy, s.y, e), sz, sz);
    }
    const vis = plateau(t, a - .45, b + .45, .35), [x, y] = up(t);
    c.save(); c.globalAlpha *= vis; c.translate(x + 20, y - 30); c.scale(1 + .2 * (1 - vis), 1 + .2 * (1 - vis));
    c.shadowColor = 'rgba(10,5,0,.4)'; c.shadowBlur = 26; c.shadowOffsetX = 34; c.shadowOffsetY = 48;
    if (kind === 'salt') {
      c.fillStyle = '#E9E4DA'; c.beginPath(); c.arc(0, 0, 54, 0, TAU); c.fill(); c.shadowColor = 'transparent';
      const g = c.createRadialGradient(-16, -18, 4, 0, 0, 50); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#CFC7BA');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 46, 0, TAU); c.fill();
      c.fillStyle = '#6B645C';
      for (const [hx, hy] of [[0, 0], [16, 0], [-16, 0], [8, 14], [-8, 14], [8, -14], [-8, -14]]) { c.beginPath(); c.arc(hx, hy, 3.2, 0, TAU); c.fill(); }
    } else {
      c.fillStyle = '#3A2518'; c.beginPath(); c.arc(0, 0, 52, 0, TAU); c.fill(); c.shadowColor = 'transparent';
      const g = c.createRadialGradient(-14, -16, 4, 0, 0, 50); g.addColorStop(0, '#7A5238'); g.addColorStop(1, '#2E1C12');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill();
      c.rotate(t * 9);
      c.fillStyle = '#CFD3D6'; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
      c.fillStyle = '#8D9296'; c.fillRect(-3, -14, 6, 28);
    }
    c.restore();
  }
}

function knife(c, len, handle, w) {
  const bl = c.createLinearGradient(-w / 2, 0, w / 2, 0);
  bl.addColorStop(0, '#F4F6F7'); bl.addColorStop(.35, '#C7CBCF'); bl.addColorStop(1, '#8E959B');
  c.fillStyle = bl; c.beginPath();
  c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.lineTo(w / 2, len * .86); c.quadraticCurveTo(w * .45, len * .97, w * .1, len);
  c.quadraticCurveTo(-w / 2, len * .8, -w / 2, len * .35); c.closePath(); c.fill();
  c.shadowColor = 'transparent';
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-w / 2 + 2, 4); c.lineTo(-w / 2 + 2, len * .35); c.quadraticCurveTo(-w / 2 + 2, len * .8, w * .1, len - 3); c.stroke();
  c.fillStyle = '#B9BEC2'; c.fillRect(-w / 2 - 3, -16, w + 6, 16);
  c.fillStyle = '#2A1B12'; c.beginPath(); c.roundRect(-w * .42, -16 - handle, w * .84, handle, 12); c.fill();
  c.fillStyle = '#C9CDD1'; for (const k of [.25, .5, .75]) { c.beginPath(); c.arc(0, -16 - handle * k, 3.5, 0, TAU); c.fill(); }
}
function drawTrimKnife(c, t) {
  const vis = plateau(t, TRIM[0] - .25, TRIM[1] + .3, .25); if (vis <= 0) return;
  const a = -Math.PI + TAU * E.inOutSine(prog(t, TRIM[0], TRIM[1])), { p, tan } = outlineAt(a);
  c.save(); c.globalAlpha *= vis;
  c.translate(p[0], p[1]); c.rotate(tan - Math.PI / 2 + .5);
  c.shadowColor = 'rgba(10,5,0,.35)'; c.shadowBlur = 14; c.shadowOffsetX = 14; c.shadowOffsetY = 18;
  c.translate(0, -150); knife(c, 160, 100, 26);
  c.restore();
}
function drawSliceKnife(c, t, B) {
  if (t < 24.8 || t > 26.75) return;
  const i = clamp(Math.floor((t - CUT0) / CUT_DT), -1, SLICES.length);
  let x, y = -40;
  if (i < 0) x = lerp(560, CUTS[0] + 20, E.outCubic(prog(t, 24.8, CUT0)));
  else if (i >= SLICES.length) { const u = E.inCubic(prog(t, CUT0 + SLICES.length * CUT_DT, 26.75)); x = lerp(CUTS[CUTS.length - 1], 700, u); y -= 200 * u; }
  else {
    const local = t - (CUT0 + i * CUT_DT);
    x = lerp(i === 0 ? CUTS[0] + 20 : CUTS[i], CUTS[i + 1], E.inOutSine(prog(local, 0, .06)));
    y += Math.sin(prog(local, .05, .17) * TAU * 1.5) * 26;
  }
  c.save(); c.translate(B.x + x, B.y + y); c.globalAlpha *= plateau(t, 24.8, 26.75, .15);
  c.shadowColor = 'rgba(10,5,0,.4)'; c.shadowBlur = 18; c.shadowOffsetX = 18; c.shadowOffsetY = 22;
  c.translate(0, -200); knife(c, 400, 150, 50);
  c.restore();
}
function drawSlices(c, t, B) {
  for (const s of SLICES) {
    if (t < s.tc) continue;
    const p = prog(t, s.tc, s.tc + .42), e = E.outCubic(p);
    const ox = B.x + s.mid, oy = B.y + (s.top + s.bot) / 2;
    const x = lerp(ox, s.tx, e), y = lerp(oy, s.ty, e) - 50 * Math.sin(Math.PI * p);
    c.save(); c.translate(x, y);
    if (p < .5) {                                           // tipping over: the strip narrows edge-on
      const k = 1 - p / .5;
      c.scale(Math.max(.02, k), 1); c.drawImage(TEX.cooked, s.xa + OX, 0, s.xb - s.xa, BH, -(s.xb - s.xa) / 2, -OY - (s.top + s.bot) / 2, s.xb - s.xa, BH);
    } else {                                                // ...and lands showing the cut face
      c.rotate(s.rot * e); c.scale(Math.max(.02, (p - .5) / .5), 1);
      c.shadowColor = 'rgba(40,18,5,.45)'; c.shadowBlur = 14; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
      c.drawImage(s.face, -s.face.width / 2, -s.face.height / 2);
    }
    c.restore();
  }
}

// butcher-paper wrap: band under the meat, flaps fold over it
const PK = { x0: -375, x1: 375, y0: -218, y1: 196, tb: 250, sd: 105 };
function paperTextures() {
  // the paper hugs the meat: shadow + highlight cast by an off-canvas copy of the outline
  const e = mk(960, 600), c = e.getContext('2d');
  c.translate(480, 300);
  const cast = (col, dx, dy, blur) => {
    c.save(); c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = 4000 + dx; c.shadowOffsetY = dy;
    c.translate(-4000, 0); c.fillStyle = '#000'; c.fill(BR.path); c.restore();
  };
  cast('rgba(110,45,22,.3)', 10, 16, 34);
  cast('rgba(255,244,236,.28)', -8, -10, 22);
  c.strokeStyle = 'rgba(120,60,40,.12)'; c.lineWidth = 2;                  // crinkles
  for (let i = 0; i < 7; i++) { const x = (hash(i + 60) - .5) * 640, y = (hash(i + 70) - .5) * 300, a = hash(i + 80) * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60); c.stroke(); }
  TEX.emboss = e;
  TEX.stains = [];
  for (let i = 0; i < 7; i++) {
    const R = 70 + 60 * hash(i + .3), S = Math.ceil(R * 2.4), g = mk(S, S), gc = g.getContext('2d');
    for (let j = 0; j < 3; j++) {
      const r = R * (.45 + .4 * hash(i * 7 + j)), x = S / 2 + (hash(i * 5 + j + .2) - .5) * R, y = S / 2 + (hash(i * 3 + j + .7) - .5) * R * .7;
      const gr = gc.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(150,80,50,.13)'); gr.addColorStop(.85, 'rgba(140,70,40,.2)'); gr.addColorStop(1, 'rgba(150,80,50,0)');
      gc.fillStyle = gr; gc.fillRect(x - r, y - r, r * 2, r * 2);
    }
    TEX.stains.push({ img: g, x: (hash(i + 1.7) - .5) * 560, y: (hash(i + 5.1) - .5) * 220 });
  }
}
function drawPaper(c, t, B, over) {
  const w = wrapState(t); if (!w.on) return;
  const ps = t > 19.4 && t < 24.2 ? B.s : 1;
  c.save(); c.translate(w.dx, 0); c.scale(ps, ps); c.globalAlpha *= w.alpha;
  const sheet = (x, y, ww, hh) => { if (ww > .5 && hh > .5) c.drawImage(PAPER, x + 500, y + 480, ww, hh, x, y, ww, hh); };
  const cl = Math.cos(Math.PI * w.left), cr = Math.cos(Math.PI * w.right), ct = Math.cos(Math.PI * w.top), cb = Math.cos(Math.PI * w.bot);
  const L = PK.x0 - PK.sd * Math.max(0, cl), R = PK.x1 + PK.sd * Math.max(0, cr);
  const flap = (x, y, ww, hh, shade, sh) => {
    c.save(); if (sh) { c.shadowColor = 'rgba(40,15,5,.35)'; c.shadowBlur = 16; c.shadowOffsetX = sh[0]; c.shadowOffsetY = sh[1]; }
    sheet(x, y, ww, hh); c.restore();
    if (shade) { c.fillStyle = shade; c.fillRect(x, y, ww, hh); }
  };
  if (!over) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12; sheet(L, PK.y0, R - L, PK.y1 - PK.y0); c.restore();
    const X0 = PK.x0 - PK.sd, XW = PK.x1 - PK.x0 + PK.sd * 2;
    if (ct > 0) flap(X0, PK.y0 - PK.tb * ct, XW, PK.tb * ct, `rgba(60,20,10,${.22 * (1 - ct)})`);
    if (cb > 0) flap(X0, PK.y1, XW, PK.tb * cb, `rgba(60,20,10,${.22 * (1 - cb)})`);
  } else {
    if (cb < 0) flap(L, PK.y1 + PK.tb * cb, R - L, -PK.tb * cb, 'rgba(255,240,232,.06)', [0, -6]);
    if (ct < 0) flap(L, PK.y0, R - L, -PK.tb * ct, 'rgba(255,240,232,.06)', [0, 6]);
    if (cl < 0) flap(PK.x0, PK.y0, -PK.sd * cl, PK.y1 - PK.y0, 'rgba(255,240,232,.04)', [6, 0]);
    if (cr < 0) flap(PK.x1 + PK.sd * cr, PK.y0, -PK.sd * cr, PK.y1 - PK.y0, 'rgba(255,240,232,.04)', [-6, 0]);
    if (w.full > 0) {
      c.save(); c.beginPath(); c.roundRect(PK.x0, PK.y0, PK.x1 - PK.x0, PK.y1 - PK.y0, 6); c.clip();
      c.globalAlpha *= w.full;
      c.drawImage(TEX.emboss, -480, -300);
      for (const [i, st] of TEX.stains.entries()) {           // rendered fat soaks through the paper
        const k = E.outCubic(prog(t, 19.7 + i * .25, 22.6)); if (k <= .01) continue;
        c.drawImage(st.img, st.x - st.img.width / 2 * k, st.y - st.img.height / 2 * k, st.img.width * k, st.img.height * k);
      }
      c.restore();
    }
  }
  c.restore();
}
function drawProbe(c, t) {
  const vis = plateau(t, 21.3, 22.75, .25); if (vis <= 0) return;
  c.save(); c.globalAlpha *= vis; c.translate(250, -70); c.rotate(-.55); c.scale(.9 + .1 * vis, .9 + .1 * vis);
  c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 16; c.shadowOffsetX = 12; c.shadowOffsetY = 16;
  c.fillStyle = '#C9CDD1'; c.fillRect(-4, 40, 8, 140);
  c.fillStyle = '#E4572E'; c.beginPath(); c.roundRect(-46, -80, 92, 130, 20); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = '#1B1715'; c.beginPath(); c.roundRect(-34, -64, 68, 50, 8); c.fill();
  drawText(c, `${Math.round(coreTemp(t))}°`, 0, -27, `700 32px ${F.mono}`, '#9FF0B0', 'center');
  c.restore();
}
function drawSpray(c, t) {
  const vis = plateau(t, 16.05, 17.35, .25); if (vis <= 0 && t > 17.9) return;
  const nz = [300, -250], A0 = Math.PI * .8;
  for (const [k, tp] of [16.35, 16.7, 17.05].entries()) {
    if (t < tp) continue;
    const puff = prog(t, tp, tp + .35);
    if (puff < 1) {
      const px = nz[0] + Math.cos(A0) * 90, py = nz[1] + Math.sin(A0) * 90, pr = 60 + 150 * puff;
      const g = c.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `rgba(235,240,245,${.3 * (1 - puff)})`); g.addColorStop(1, 'rgba(235,240,245,0)');
      c.fillStyle = g; c.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    for (let j = 0; j < 46; j++) {
      const h1 = hash(k * 100 + j), h2 = hash(k * 100 + j + .5), a = A0 + (h1 - .5) * .8, d = 140 + h2 * 460;
      const fl = prog(t, tp, tp + .2), lx = nz[0] + Math.cos(a) * d, ly = nz[1] + Math.sin(a) * d;
      const x = lerp(nz[0], lx, E.outCubic(fl)), y = lerp(nz[1], ly, E.outCubic(fl)), al = fl < 1 ? .7 : .8 * (1 - prog(t, 17.4, 17.9));
      if (al <= 0) continue;
      c.fillStyle = `rgba(250,235,215,${al})`; c.beginPath(); c.arc(x, y, 1.5 + 2.5 * hash(j + 9), 0, TAU); c.fill();
    }
  }
  if (vis <= 0) return;
  c.save(); c.globalAlpha *= vis; c.translate(nz[0], nz[1]); c.rotate(A0 - Math.PI); c.translate(60 * (1 - vis), 0);
  const pump = [16.35, 16.7, 17.05].reduce((m, tp) => Math.max(m, plateau(t, tp - .06, tp + .1, .05)), 0);
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 22; c.shadowOffsetX = 18; c.shadowOffsetY = 26;
  c.fillStyle = 'rgba(236,238,240,.9)'; c.beginPath(); c.roundRect(40, -62, 160, 124, 40); c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = 'rgba(214,160,90,.55)'; c.beginPath(); c.roundRect(58, -44, 124, 88, 30); c.fill();
  c.fillStyle = '#2B2B2D'; c.beginPath(); c.roundRect(-16, -30, 70, 60, 14); c.fill();
  c.fillRect(-26, -8, 16, 16);
  c.fillStyle = '#EE7A3A'; c.beginPath(); c.roundRect(14 + 8 * pump, 26, 26, 36, 8); c.fill();
  c.restore();
}
function drawFirebox(c, t) {
  const vis = plateau(t, 12.1, 14.5, .35); if (vis <= 0) return;
  const cx = -300, cy = 238, R = 150, fire = sstep(12.5, 13.3, t);
  c.save(); c.globalAlpha *= vis; c.translate(cx, cy); const sc = .6 + .4 * E.outBack(vis); c.scale(sc, sc);
  c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 40; c.shadowOffsetY = 18; c.fillStyle = '#0A0706'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.restore();
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  const eg = c.createRadialGradient(0, 10, 10, 0, 0, R);
  eg.addColorStop(0, `rgba(255,150,60,${.25 + .6 * fire})`); eg.addColorStop(.6, `rgba(150,40,10,${.2 + .4 * fire})`); eg.addColorStop(1, 'rgba(30,10,5,0)');
  c.fillStyle = eg; c.fillRect(-R, -R, R * 2, R * 2);
  const LOGS = [[-10, 40, -.25], [15, -30, .35], [-20, -5, 1.45], [30, 20, -1.2]];
  LOGS.forEach(([x, y, r], k) => {
    const tk = 12.25 + k * .28, p = prog(t, tk, tk + .3); if (p <= 0) return;
    c.save(); c.globalAlpha *= clamp(p * 3); c.translate(x, y); c.rotate(r); const s = lerp(1.5, 1, E.outCubic(p)); c.scale(s * .75, s * .75);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 12; c.shadowOffsetY = 6;
    c.drawImage(TEX.log, -115, -35); c.restore();
  });
  if (fire > 0) {
    c.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 14; j++) {
      const a = j / 14 * TAU + noise(j, t * .6, 2), d = 20 + 50 * hash(j + 2), r = (34 + 26 * noise(t * 4 + j, j, 7)) * fire;
      const x = Math.cos(a) * d, y = Math.sin(a) * d * .8;
      if (r <= 0) continue;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,220,130,.5)'); g.addColorStop(.5, 'rgba(255,120,30,.28)'); g.addColorStop(1, 'rgba(255,80,20,0)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  c.strokeStyle = COL.cream; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  const lbl = 'FOGÓN · ROBLE', lw = textW(lbl, `700 24px ${F.mono}`, 3) + 36;
  c.fillStyle = COL.cream; c.beginPath(); c.roundRect(-lw / 2, R - 20, lw, 42, 21); c.fill();
  drawText(c, lbl, 0, R + 9, `700 24px ${F.mono}`, '#1B130E', 'center', 3);
  c.restore();
}
function drawSmoke(c, t) {
  const sm = plateau(t, 12.5, 23.2, .8);
  if (sm > 0) {                                            // offset smoker: smoke rolls from the firebox across the meat
    for (let i = 0; i < 24; i++) {
      const P = 2.8, a = ((t + hash(i) * P) % P) / P;
      const x = -600 + a * 1200 + 40 * noise(i, t * .4, 1), y = -330 + hash(i + 7) * 660 + Math.sin(a * TAU + i) * 40 - a * 70;
      const sz = 300 + 360 * a;
      c.save(); c.globalAlpha = Math.sin(Math.PI * a) * .2 * sm; c.translate(x, y); c.rotate(hash(i + 3) * TAU + a * .9);
      c.drawImage(SMOKE[i % 3], -sz / 2, -sz / 2, sz, sz); c.restore();
    }
  }
  const steam = [[plateau(t, 22.9, 24.4, .4), [0, 0], 320, .12], [sstep(27.9, 28.6, t), [40, 210], 260, .12]];
  for (const [v, [bx, by], spread, al] of steam) {
    if (v <= 0) continue;
    for (let i = 0; i < 8; i++) {                           // top-down steam: puffs swell towards the camera and vanish
      const P = 1.6, a = ((t + hash(i + 20) * P) % P) / P, sz = 120 + 260 * a;
      c.save(); c.globalAlpha = Math.sin(Math.PI * a) * al * v;
      c.translate(bx + (hash(i + 30) - .5) * spread * 2, by + (hash(i + 40) - .5) * spread * .6 - 60 * a); c.rotate(hash(i) * TAU + a);
      c.drawImage(SMOKE[i % 3], -sz / 2, -sz / 2, sz, sz); c.restore();
    }
  }
}
function drawGarnish(c, t) {
  const pop = (img, x, y, t0, rot, s = 1) => {
    const p = prog(t, t0, t0 + .38); if (p <= 0) return;
    const k = E.outBack(p, 2.2) * s;
    c.save(); c.translate(x, y - 30 * (1 - p)); c.rotate(rot); c.scale(k, k); c.globalAlpha *= clamp(p * 3);
    c.shadowColor = 'rgba(40,18,5,.4)'; c.shadowBlur = 12; c.shadowOffsetX = 4; c.shadowOffsetY = 8;
    c.drawImage(img, -img.width / 2, -img.height / 2); c.restore();
  };
  [[110, -262], [200, -318], [290, -270], [378, -318], [150, -178], [246, -186], [340, -206], [70, -350]].forEach(([x, y], i) => pop(TEX.pickle, x, y, 26.62 + i * .045, i, .92));
  [[112, -70], [226, -92], [346, -106]].forEach(([x, y], i) => pop(TEX.onion, x, y, 27.07 + i * .07, 0, .95));
  pop(TEX.bread, -338, 262, 27.52, -.14); pop(TEX.bread, -312, 208, 27.62, .1);
}
function drawAnnotations(c, t, B) {
  const v = plateau(t, 24.95, 26.3, .25); if (v <= 0) return;
  const cut = currentCut(t);
  c.save(); c.globalAlpha *= v; c.translate(B.x, B.y);
  c.save(); c.clip(BR.path); c.beginPath(); c.rect(-30, -300, cut + 30, 600); c.clip();
  c.setLineDash([12, 12]); c.lineDashOffset = -t * 60; c.strokeStyle = 'rgba(244,236,223,.7)'; c.lineWidth = 3;
  for (const y of [-80, 0, 80]) { c.beginPath(); c.moveTo(-30, y); c.lineTo(360, y); c.stroke(); }
  c.restore();
  const ax0 = 60, ax1 = 300, ay = -222;                    // "grain" arrow above the flat
  c.strokeStyle = COL.cream; c.fillStyle = COL.cream; c.lineWidth = 3;
  c.beginPath(); c.moveTo(ax0, ay); c.lineTo(ax1, ay); c.stroke();
  for (const [x, d] of [[ax0, 1], [ax1, -1]]) { c.beginPath(); c.moveTo(x, ay); c.lineTo(x + 14 * d, ay - 9); c.lineTo(x + 14 * d, ay + 9); c.closePath(); c.fill(); }
  const lw = textW('FIBRA', `700 24px ${F.mono}`, 3) + 28;
  c.fillStyle = '#1B130E'; c.beginPath(); c.roundRect((ax0 + ax1) / 2 - lw / 2, ay - 20, lw, 40, 20); c.fill();
  drawText(c, 'FIBRA', (ax0 + ax1) / 2, ay + 9, `700 24px ${F.mono}`, COL.cream, 'center', 3);
  c.restore();
}

function stage(c, t) {
  const cam = camera(t), B = brisketState(t);
  c.translate(SX, SY); c.scale(cam.s, cam.s); c.globalAlpha = cam.a;
  drawSurfaces(c, t);
  if (B.on) {
    c.save(); c.globalAlpha *= B.alpha;
    drawPaper(c, t, B, false);
    c.save(); c.translate(B.x, B.y); c.scale(B.s, B.s);
    drawLumps(c, t); drawBrisket(c, t, B); drawSeasoning(c, t); drawTrimKnife(c, t);
    c.restore();
    drawPaper(c, t, B, true);
    drawProbe(c, t);
    c.restore();
  }
  drawSlices(c, t, B); drawGarnish(c, t); drawSliceKnife(c, t, B);
  drawSpray(c, t); drawSmoke(c, t); drawFirebox(c, t); drawAnnotations(c, t, B);
}

// ───────── typography & HUD ─────────
function headerRow(c, t) {
  const y = 150;
  const i = stepAt(t);
  if (t < 3) {
    reveal(c, 'RECETA · TEXAS BBQ', MX, y, 28, `700 28px ${F.mono}`, COL.ember, 'left', 4, pa(t, .15), pq(t, 2.95));
  } else if (t >= 28) {
    reveal(c, 'LISTO PARA SERVIR', MX, y, 28, `700 28px ${F.mono}`, COL.ember, 'left', 4, pa(t, 28.05));
  } else if (i >= 0) {
    const s = STEPS[i];
    reveal(c, `PASO ${String(i + 1).padStart(2, '0')} / ${STEPS.length}`, MX, y, 28, `700 28px ${F.mono}`, COL.ember, 'left', 4, pa(t, s.t0 + .05, .45), pq(t, s.t1, .22));
  }
  if (t >= 3) reveal(c, 'BRISKET AHUMADO', W - MX, y, 28, `400 28px ${F.mono}`, COL.mute, 'right', 4, pa(t, 3.1));
  // headline
  const hy = 252, hf = size => `italic 600 ${size}px ${F.serif}`;
  if (t < 3) reveal(c, 'El clásico de Texas', MX, hy, 84, hf(84), COL.cream, 'left', 0, pa(t, .25, .7), pq(t, 2.95, .3));
  else if (t >= 28) reveal(c, 'Buen provecho', MX, hy, 84, hf(84), COL.cream, 'left', 0, pa(t, 28.1, .7));
  else for (const h of HEADS) if (t >= h.t0 && t < h.t1) {
    const sz = fitSize(h.text, 'italic 600', F.serif, 84, CW);
    reveal(c, h.text, MX, hy, sz, hf(sz), COL.cream, 'left', 0, pa(t, h.t0 + .08, .6), pq(t, h.t1, .26));
  }
}

function pills(c, t, items, t0, t1) {
  const gap = 22, w = (CW - gap * 2) / 3, h = 108, y = 1246;
  items.forEach((it, k) => {
    const p = E.outExpo(prog(t, t0 + k * .08, t0 + k * .08 + .6)), q = E.inCubic(prog(t, t1 - .3 + k * .04, t1 + k * .04));
    if (p <= 0 || q >= 1) return;
    const x = MX + k * (w + gap);
    c.save(); c.globalAlpha *= p * (1 - q); c.translate(0, 40 * (1 - p) - 30 * q);
    c.fillStyle = 'rgba(244,236,223,.055)'; c.strokeStyle = 'rgba(244,236,223,.14)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x, y, w, h, 20); c.fill(); c.stroke();
    c.fillStyle = it.hot ? COL.ember : COL.dim; c.beginPath(); c.arc(x + 30, y + 32, 6, 0, TAU); c.fill();
    drawText(c, it.label, x + 46, y + 41, `400 25px ${F.mono}`, COL.mute, 'left', 3);
    const vf = `700 44px ${F.mono}`;
    drawText(c, it.value, x + 24, y + 90, vf, COL.cream);
    if (it.sub) drawText(c, it.sub, x + 24 + textW(it.value, vf) + 10, y + 90, `400 24px ${F.mono}`, COL.mute);
    c.restore();
  });
}
function strip(c, t) {
  if (t < 3.2) pills(c, t, [{ label: 'TIEMPO', value: '12 h' }, { label: 'AHUMADOR', value: '120 °C', hot: 1 }, { label: 'RINDE', value: '10–12', sub: 'porc.' }], .9, 2.95);
  else if (t < 24.6) {
    const rest = t >= 22.75, pit = pitTemp(t), core = coreTemp(t);
    pills(c, t, [
      rest ? { label: 'REPOSO', value: hm(prog(t, 22.6, 24.2)) } : { label: 'AHUMADOR', value: `${Math.round(pit)} °C`, sub: `${toF(pit)} °F`, hot: t > 12.4 },
      { label: 'INTERNA', value: `${Math.round(core)} °C`, sub: `${toF(core)} °F`, hot: t > 13.6 && t < 22.6 },
      { label: 'TIEMPO', value: hm(cookHours(t)) },
    ], 12.0, 24.4);
  } else if (t >= 28) pills(c, t, [{ label: 'AHUMADOR', value: '120 °C', hot: 1 }, { label: 'INTERNA', value: '95 °C', hot: 1 }, { label: 'TOTAL', value: '12 h' }], 28.35, 99);
}

function titleBlock(c, t, t0, t1, tag) {
  reveal(c, tag, MX, 1398, 28, `700 28px ${F.mono}`, COL.ember, 'left', 5, pa(t, t0), pq(t, t1));
  reveal(c, 'Brisket', MX - 4, 1540, 156, `600 156px ${F.serif}`, COL.cream, 'left', 0, pa(t, t0 + .08, .7), pq(t, t1));
  reveal(c, 'ahumado', MX - 4, 1686, 156, `italic 600 156px ${F.serif}`, COL.ember, 'left', 0, pa(t, t0 + .18, .7), pq(t, t1));
}
function card(c, t) {
  if (t < 3.05) { titleBlock(c, t, .3, 3.0, 'AHUMADO LENTO · ESTILO TEXAS'); return; }
  if (t >= 28) { titleBlock(c, t, 28.1, 99, 'RECETA COMPLETA · 30 S'); return; }
  const i = stepAt(t); if (i < 0) return;
  const s = STEPS[i], q = k => pq(t, s.t1 - k * .03, .26);
  reveal(c, s.tag, MX, 1398, 28, `700 28px ${F.mono}`, COL.ember, 'left', 5, pa(t, s.t0), q(3));
  if (s.list) {
    s.list.forEach(([name, qty, tk], r) => {
      const y = 1500 + r * 94, p = pa(t, tk, .5);
      reveal(c, name, MX, y, 58, `700 58px ${F.sans}`, COL.cream, 'left', 1, p, q(2 - r * .5));
      reveal(c, qty, W - MX, y, 62, `italic 600 62px ${F.serif}`, COL.ember, 'right', 0, pa(t, tk + .06, .5), q(2 - r * .5));
      if (p > 0) { c.save(); c.globalAlpha *= clamp(p * 2) * (1 - q(2)); c.fillStyle = 'rgba(244,236,223,.12)'; c.fillRect(MX, y + 26, CW * E.outExpo(p), 2); c.restore(); }
    });
    return;
  }
  const ns = fitSize(s.name, '700', F.sans, 92, CW, .02);
  reveal(c, s.name, MX - 3, 1502, ns, `700 ${ns}px ${F.sans}`, COL.cream, 'left', ns * .02, pa(t, s.t0 + .06), q(2));
  const qs = fitSize(s.qty, 'italic 600', F.serif, 128, CW);
  reveal(c, s.qty, MX - 4, 1628, qs, `italic 600 ${qs}px ${F.serif}`, COL.ember, 'left', 0, pa(t, s.t0 + .13, .6), q(1));
  const nz = fitSize(s.note, '500', F.sans, 34, CW);
  reveal(c, s.note, MX, 1694, nz, `500 ${nz}px ${F.sans}`, COL.mute, 'left', 0, pa(t, s.t0 + .2), q(0));
}

function timeline(c, t) {
  const y = 1790, x0 = MX, w = CW, sx = s => x0 + w * s / DUR;
  c.save(); c.globalAlpha = E.outCubic(prog(t, .1, .7));
  PHASES.forEach(([a, b, label], k) => {
    const xa = sx(a) + (k ? 3 : 0), xb = sx(b) - (k < PHASES.length - 1 ? 3 : 0), on = t >= a && (t < b || (b === DUR && t >= a));
    c.fillStyle = 'rgba(244,236,223,.16)'; c.beginPath(); c.roundRect(xa, y - 3, xb - xa, 6, 3); c.fill();
    const f = clamp((sx(t) - xa) / (xb - xa));
    if (f > 0) { c.fillStyle = COL.ember; c.beginPath(); c.roundRect(xa, y - 3, (xb - xa) * f, 6, 3); c.fill(); }
    drawText(c, label, (xa + xb) / 2, y + 44, `${on ? 700 : 400} 24px ${F.mono}`, on ? COL.cream : COL.dim, 'center', 2);
  });
  for (const s of STEPS) { c.fillStyle = t >= s.t0 ? '#FFD9BF' : 'rgba(244,236,223,.4)'; c.beginPath(); c.arc(sx(s.t0), y, 3.5, 0, TAU); c.fill(); }
  const px = sx(t);
  c.fillStyle = COL.cream; c.beginPath(); c.arc(px, y, 10, 0, TAU); c.fill();
  c.fillStyle = COL.ember; c.beginPath(); c.arc(px, y, 5, 0, TAU); c.fill();
  const sec = Math.min(t, DUR);
  drawText(c, `0:${String(Math.floor(sec)).padStart(2, '0')}`, W - MX - textW(' / 0:30', `400 26px ${F.mono}`), y - 26, `700 26px ${F.mono}`, COL.cream, 'right');
  drawText(c, ' / 0:30', W - MX, y - 26, `400 26px ${F.mono}`, COL.mute, 'right');
  c.restore();
}

// ───────── frame ─────────
function render(t) {
  t = clamp(t, 0, DUR);
  const c = out;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.fillStyle = COL.bg; c.fillRect(0, 0, W, H);
  const fire = fireAmt(t);
  const g = c.createRadialGradient(SX, SY, 0, SX, SY, 980);
  g.addColorStop(0, `rgba(${Math.round(lerp(58, 92, fire))},${Math.round(lerp(42, 44, fire))},${Math.round(lerp(30, 24, fire))},.9)`); g.addColorStop(1, 'rgba(20,16,13,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); stage(c, t); c.restore();
  c.fillStyle = VIGNETTE; c.fillRect(0, 0, W, H);
  headerRow(c, t); strip(c, t); card(c, t); timeline(c, t);
  const f = Math.floor(t * FPS);                            // film grain, seeded by frame number
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .06;
  c.translate((f * 97) % 256, (f * 57) % 256); c.fillStyle = GRAIN[f % 4]; c.fillRect(-256, -256, W + 256, H + 256);
  c.restore();
}

// ───────── API / player ─────────
window.reelInfo = { W, H, FPS, DUR, frames: FPS * DUR };
window.reelReady = (async () => {
  await Promise.all([`600 80px ${F.serif}`, `italic 600 80px ${F.serif}`, `500 30px ${F.sans}`, `700 30px ${F.sans}`, `400 20px ${F.mono}`, `700 20px ${F.mono}`]
    .map(f => document.fonts.load(f, 'Aá½·°Ó–')));
  surfaceTextures(); brisketTextures(); paperTextures();
})();
window.renderFrame = async f => render(f / FPS);

if (!/[?&]render/.test(location.search)) {
  const params = new URLSearchParams(location.search), cv = document.getElementById('c'), hint = document.getElementById('hint');
  const loop = params.has('loop');
  let playing = false, base = 0, pos = 0, drag = false;
  const seek = p => { pos = clamp(p, 0, DUR); base = performance.now() - pos * 1000; };
  const setPlaying = on => { if (on && pos >= DUR) seek(0); playing = on; seek(pos); hint.textContent = pos >= DUR ? '↻  Repetir' : '▶  Reproducir'; hint.hidden = on; };
  const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  const onBar = y => y > 1720;
  cv.addEventListener('pointerdown', e => {
    const [x, y] = toCanvas(e);
    if (onBar(y)) { drag = true; cv.setPointerCapture(e.pointerId); seek((x - MX) / CW * DUR); } else setPlaying(!playing);
  });
  cv.addEventListener('pointermove', e => { if (drag) seek((toCanvas(e)[0] - MX) / CW * DUR); });
  cv.addEventListener('pointerup', () => { drag = false; });
  hint.addEventListener('click', () => setPlaying(true));
  addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.code === 'ArrowRight') seek(pos + 1);
    else if (e.code === 'ArrowLeft') seek(pos - 1);
    else if (e.code === 'Home' || e.key === 'r') { seek(0); setPlaying(true); }
  });
  window.reelReady.then(() => {
    const at = params.get('t');
    if (at !== null) { seek(+at); render(pos); setPlaying(false); } else setPlaying(true);
    const tick = () => {
      if (playing) {
        pos = (performance.now() - base) / 1000;
        if (pos >= DUR) { if (loop) seek(pos % DUR); else { pos = DUR; setPlaying(false); } }
      }
      render(pos);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
