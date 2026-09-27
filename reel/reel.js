'use strict';
/*
 * MOTION REEL 2026 — 20 s, 1920x1080, 60 fps.
 * Everything is a pure function of time t (no simulation state), so any frame can be
 * rendered in any order: preview in the browser, or render frame-by-frame with render.cjs.
 * The soundtrack (audio.py) runs at 120 BPM: a beat every 0.5 s, cuts land on beats.
 */

const W = 1920, H = 1080, FPS = 60, DUR = 20, BEAT = 0.5;
const SHUTTER = 0.5;               // 180° shutter for motion blur
let SUB = 4;                       // motion-blur subframes per frame
const NAME = 'CLAUDE';
const COL = {
  bg: '#0B0B12', ink: '#F4EFE6', lime: '#C6FF1A', coral: '#FF4B2B',
  violet: '#6E4BFF', cyan: '#29E0FF', deep: '#07070B',
};

// ───────────────────────── math ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Improved Perlin noise (3D)
const PERM = new Uint8Array(512);
(() => {
  const r = rng(7), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function grad(h, x, y, z) {
  h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = PERM[X] + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z, B = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;
  return lerp(lerp(lerp(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u),
    lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
  lerp(lerp(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u),
    lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v), w);
}

// ───────────────────────── color ─────────────────────────
const HEX = new Map();
const hex = h => { let v = HEX.get(h); if (!v) { v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); HEX.set(h, v); } return v; };
const mixc = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; };
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

// ───────────────────────── rhythm ─────────────────────────
// kick envelope: 1 on every beat of the groove (2 s .. 16 s), decaying fast
function kick(t) {
  if (t < 2 || t >= 16) return 0;
  return Math.exp(-((t - 2) % BEAT) * 9);
}
function impulse(t, at, decay = 8) { return t >= at ? Math.exp(-(t - at) * decay) : 0; }

// ───────────────────────── canvases ─────────────────────────
const cv = document.getElementById('c');
const out = cv.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const sceneC = mk(), sctx = sceneC.getContext('2d');
const accC = mk(), actx = accC.getContext('2d');
const tmpC = mk(), tctx = tmpC.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');

function bg(c, col) { c.fillStyle = col; c.fillRect(-300, -300, W + 600, H + 600); }

// text layout: per-char advance so we can animate each glyph
function layout(text, size, spacing = 0, fam = 'Anton', weight = 400) {
  mctx.font = `${weight} ${size}px ${fam}`;
  const chars = []; let x = 0;
  for (const ch of text) { const w = mctx.measureText(ch).width; chars.push({ ch, x, w }); x += w + spacing; }
  const m = mctx.measureText('H');
  return { chars, width: x - spacing, cap: m.actualBoundingBoxAscent, size, font: mctx.font };
}
function drawText(c, str, x, y, font, color, align = 'left', spacing = 0) {
  c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  if (!spacing) { c.textAlign = align; c.fillText(str, x, y); return; }
  c.textAlign = 'left';
  let w = 0; for (const ch of str) w += c.measureText(ch).width + spacing; w -= spacing;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  for (const ch of str) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + spacing; }
}
function typed(str, t, start, cps = 60) { return str.slice(0, Math.max(0, Math.floor((t - start) * cps))); }

// ───────────────────────── precomputed assets ─────────────────────────
let L_MOTION, L_EVERY, L_FRAME, L_TELLS, L_STORY, L_NAME;
const NP = 4000;                           // particles (grid → text → sphere)
const GX = 16, GY = 9, CELL = 120;
const P = [];                              // particle data
let grainTiles = [], vignette;

function precompute() {
  L_MOTION = layout('MOTION', 430, 6);
  L_EVERY = layout('EVERY', 400, 8);
  L_FRAME = layout('FRAME', 360, 8);
  L_TELLS = layout('TELLS', 400, 8);
  L_STORY = layout('A STORY', 380, 8);
  L_NAME = layout(NAME, 300, 10);

  // sample "DESIGN" into target points
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  const x = tc.getContext('2d');
  const ld = layout('DESIGN', 420, 16);
  x.font = ld.font; x.fillStyle = '#fff'; x.textAlign = 'left';
  const x0 = W / 2 - ld.width / 2, base = H / 2 + ld.cap / 2;
  for (const ch of ld.chars) x.fillText(ch.ch, x0 + ch.x, base);
  const img = x.getImageData(0, 0, W, H).data;
  const pts = [];
  for (let yy = 0; yy < H; yy += 4) for (let xx = 0; xx < W; xx += 4) if (img[(yy * W + xx) * 4 + 3] > 128) pts.push([xx, yy]);
  const r = rng(42);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }

  const pal = [COL.lime, COL.cyan, COL.coral, COL.violet, COL.ink];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NP; i++) {
    const cell = i % (GX * GY);
    const sx = (cell % GX) * CELL + CELL / 2 + (r() - .5) * 6, sy = Math.floor(cell / GX) * CELL + CELL / 2 + (r() - .5) * 6;
    const tp = pts[i % pts.length];
    const tx = tp[0] + (i >= pts.length ? (r() - .5) * 4 : 0), ty = tp[1] + (i >= pts.length ? (r() - .5) * 4 : 0);
    // fibonacci sphere
    const yy = 1 - 2 * (i + .5) / NP, rr = Math.sqrt(1 - yy * yy), ph = i * ga;
    // torus
    const a = i % 160, b = Math.floor(i / 160);
    const u = TAU * a / 160 + b * .1, v = TAU * b / 25, R0 = .82, r0 = .34;
    const base = pal[i % pal.length];
    const cols = []; for (let q = 0; q <= 8; q++) cols.push(mixc(base, COL.ink, q / 8 * .55));
    P.push({
      sx, sy, tx, ty,
      ang: Math.atan2(sy - H / 2, sx - W / 2) + (r() - .5) * 1.4,
      spd: .35 + r() * .9, sw: (r() - .5) * 2.2, delay: (tx / W) * .25 + r() * .05,
      sph: [Math.cos(ph) * rr, yy, Math.sin(ph) * rr],
      tor: [(R0 + r0 * Math.cos(v)) * Math.cos(u), r0 * Math.sin(v), (R0 + r0 * Math.cos(v)) * Math.sin(u)],
      cols,
    });
  }

  // film grain tiles
  for (let k = 0; k < 4; k++) {
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const gc = g.getContext('2d'), id = gc.createImageData(256, 256), rg = rng(100 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = rg() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0);
    grainTiles.push(out.createPattern(g, 'repeat'));
  }
  vignette = out.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.32)');
}

// ═════════════════════════ SCENE 1 · 0–2 s · bouncing ball (principles) ═════════════════════════
const BALL_R = 22, GROUND = H / 2 + 150;
const HITS = [0.5, 1.0, 1.5];
const BXK = [[0.1, W / 2 - 640], [0.5, W / 2 - 420], [1.0, W / 2 - 180], [1.5, W / 2]];
function ballX(t) {
  if (t <= BXK[0][0]) return BXK[0][1];
  for (let i = 1; i < BXK.length; i++) if (t <= BXK[i][0]) return lerp(BXK[i - 1][1], BXK[i][1], prog(t, BXK[i - 1][0], BXK[i][0]));
  return BXK[BXK.length - 1][1];
}
function ballShape(t) {
  let yb, vy = 0;
  const bounce = (a, b, h) => { const p = (t - a) / (b - a); yb = GROUND - h * 4 * p * (1 - p); vy = Math.abs(h * 4 * (1 - 2 * p) / (b - a)); };
  if (t < 0.5) { const p = prog(t, 0.1, 0.5); yb = lerp(-80, GROUND, p * p); vy = 2 * p * (GROUND + 80) / 0.4; }
  else if (t < 1.0) bounce(0.5, 1.0, 300);
  else if (t < 1.5) bounce(1.0, 1.5, 190);
  else yb = GROUND;
  const stretch = Math.min(.5, vy / 3200);
  let sq = 0; for (const h of HITS) sq = Math.max(sq, .45 * Math.exp(-Math.pow((t - h) / .035, 2)));
  let sy = (1 + stretch) * (1 - sq);
  const ant = E.outCubic(prog(t, 1.55, 1.8));
  sy *= 1 - .42 * ant;
  return { x: ballX(t), yb, sx: 1 / sy, sy };
}
function scene1(c, t) {
  bg(c, COL.bg);
  const la = 1 - prog(t, 1.55, 1.85);
  // ruler / ground
  const lw = E.outExpo(prog(t, 0.0, 0.7)) * 760;
  c.globalAlpha = la;
  c.strokeStyle = rgba(COL.ink, .35); c.lineWidth = 2;
  c.beginPath(); c.moveTo(W / 2 - lw, GROUND); c.lineTo(W / 2 + lw, GROUND); c.stroke();
  c.fillStyle = rgba(COL.ink, .25);
  for (let x = -760; x <= 760; x += 40) if (Math.abs(x) < lw) c.fillRect(W / 2 + x - 1, GROUND + 6, 2, x % 200 === 0 ? 14 : 7);
  // ripples + annotations
  const labels = ['SQUASH', 'STRETCH', 'ANTICIPATION'];
  HITS.forEach((h, k) => {
    const p = prog(t, h, h + .6), hx = ballX(h);
    if (p > 0 && p < 1) {
      const rx = 20 + E.outExpo(p) * 170;
      c.strokeStyle = rgba(COL.lime, (1 - p) * .8); c.lineWidth = 2;
      c.beginPath(); c.ellipse(hx, GROUND, rx, rx * .22, 0, 0, TAU); c.stroke();
    }
    const lp = prog(t, h + .02, h + .2);
    if (lp > 0) {
      c.strokeStyle = rgba(COL.lime, .8); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(hx, GROUND + 26); c.lineTo(hx, GROUND + 26 + 44 * E.outExpo(lp)); c.stroke();
      c.fillStyle = COL.lime; c.fillRect(hx - 3, GROUND + 67 * E.outExpo(lp), 6, 6);
      drawText(c, '0' + (k + 1), hx, GROUND + 104, '700 16px Mono', rgba(COL.ink, .5), 'center');
      drawText(c, typed(labels[k], t, h + .05, 70), hx, GROUND + 130, '700 20px Mono', COL.ink, 'center', 3);
    }
  });
  c.globalAlpha = 1;
  // ball → world
  const b = ballShape(t);
  const lp = prog(t, 1.8, 2.0);
  c.fillStyle = COL.lime;
  if (lp <= 0) {
    c.beginPath(); c.ellipse(b.x, b.yb - BALL_R * b.sy, BALL_R * b.sx, BALL_R * b.sy, 0, 0, TAU); c.fill();
  } else {
    const rel = E.outBack(prog(t, 1.8, 1.9), 3);
    const sy = lerp(b.sy, 1, rel), sx = 1 / sy;
    const r = lerp(BALL_R, 1500, E.inExpo(lp));
    const cy = lerp(GROUND - BALL_R * sy, H / 2, E.outCubic(lp));
    c.beginPath(); c.ellipse(b.x, cy, r * sx, r * sy, 0, 0, TAU); c.fill();
  }
}

// ═════════════════════════ SCENE 2 · 2–4 s · MOTION (slam, slice, zoom through the O) ═════════════════════════
function scene2(c, t) {
  bg(c, COL.lime);
  const Lm = L_MOTION, x0 = W / 2 - Lm.width / 2, base = H / 2 + Lm.cap / 2, mid = H / 2;
  const oi = 4, ox = x0 + Lm.chars[oi].x + Lm.chars[oi].w / 2, oy = mid;

  const zp = prog(t, 3.55, 4.0);
  c.save();
  if (zp > 0) {
    const Z = Math.pow(95, E.inExpo(zp)), e2 = zp * zp;
    c.translate(lerp(ox, W / 2, e2), lerp(oy, H / 2, e2)); c.scale(Z, Z); c.translate(-ox, -oy);
  }
  const sl = E.outExpo(prog(t, 3.0, 3.3)) * (1 - E.inExpo(prog(t, 3.4, 3.55)));
  const off = sl * 280;

  const glyphs = (color, stroke) => {
    c.font = Lm.font; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    Lm.chars.forEach((ch, i) => {
      const ti = 2.0 + i * .06, p = prog(t, ti, ti + .42);
      if (p <= 0) return;
      const s = 1 + 1.5 * (1 - E.outBack(p, 2.2));
      const rot = (i % 2 ? 1 : -1) * .3 * (1 - E.outExpo(p));
      let yo = 0;
      for (const bt of [2.5, 3.0, 3.5]) { const d = t - bt - i * .035; if (d > 0 && d < .28) yo -= 42 * Math.sin(d / .28 * Math.PI); }
      const cx = x0 + ch.x + ch.w / 2;
      c.save(); c.translate(cx, mid + yo); c.rotate(rot); c.scale(s, s); c.globalAlpha = Math.min(1, p * 5);
      if (stroke) { c.strokeStyle = color; c.lineWidth = 3; c.strokeText(ch.ch, 0, Lm.cap / 2); }
      else { c.fillStyle = color; c.fillText(ch.ch, 0, Lm.cap / 2); }
      c.restore();
    });
  };
  if (sl > 0.001) {
    glyphs(COL.coral);
    c.strokeStyle = COL.coral; c.lineWidth = 4;
    c.beginPath(); c.moveTo(W / 2 - sl * W, mid); c.lineTo(W / 2 + sl * W, mid); c.stroke();
    c.save(); c.beginPath(); c.rect(-300, -300, W + 600, mid + 300); c.clip(); c.translate(-off, 0); glyphs(COL.bg); c.restore();
    c.save(); c.beginPath(); c.rect(-300, mid, W + 600, H + 300); c.clip(); c.translate(off, 0); glyphs(COL.bg); c.restore();
  } else glyphs(COL.bg);

  // caption
  const cap = typed('KINETIC TYPOGRAPHY', t, 2.4, 60);
  drawText(c, cap, W / 2, base + 90, '700 24px Mono', COL.bg, 'center', 8);
  const lp = E.outExpo(prog(t, 2.35, 2.9));
  c.fillStyle = COL.bg; c.fillRect(W / 2 - 180 * lp, base + 120, 360 * lp, 3);
  c.restore();
}

// ═════════════════════════ SCENE 3 · 4–6 s · EVERY / FRAME / TELLS / A STORY ═════════════════════════
function centered(c, Lx, t0, t, fn, color) {
  const x0 = W / 2 - Lx.width / 2, base = H / 2 + Lx.cap / 2;
  c.font = Lx.font; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = color;
  Lx.chars.forEach((ch, i) => { c.save(); fn(i, x0 + ch.x + ch.w / 2, base); c.fillText(ch.ch, 0, 0); c.restore(); });
  return { x0, base };
}
function scene3(c, t) {
  if (t < 4.5) {
    bg(c, COL.lime);
    const p = E.outExpo(prog(t, 4.0, 4.38));
    const s = lerp(1.35, 1, p), sp = lerp(70, 0, p);
    const n = L_EVERY.chars.length;
    centered(c, L_EVERY, 4, t, (i, x, y) => {
      c.translate(W / 2 + (x - W / 2 + (i - (n - 1) / 2) * sp) * s, y + (1 - p) * 30);
      c.scale(s * lerp(1.25, 1, p), s);
    }, COL.bg);
    // speed lines
    c.fillStyle = COL.bg;
    for (let k = 0; k < 6; k++) { const w = (1 - p) * 700 * (0.4 + (k * 37 % 10) / 10); c.fillRect(k % 2 ? W - w : 0, 180 + k * 140, w, 6); }
  } else if (t < 5.0) {
    bg(c, COL.bg);
    const p = E.outExpo(prog(t, 4.5, 4.8));
    const s = lerp(.88, 1, p);
    const { x0, base } = centered(c, L_FRAME, 4.5, t, (i, x, y) => {
      c.translate(W / 2 + (x - W / 2) * s, H / 2 + (y - H / 2) * s); c.scale(s, s); c.globalAlpha = Math.min(1, p * 3);
    }, COL.ink);
    // selection box drawing on
    const pad = 44, bx = x0 - pad, by = base - L_FRAME.cap - pad, bw = L_FRAME.width + pad * 2, bh = L_FRAME.cap + pad * 2;
    const q = E.outExpo(prog(t, 4.53, 4.88)), per = 2 * (bw + bh);
    c.strokeStyle = COL.lime; c.lineWidth = 3; c.setLineDash([per * q, per]);
    c.strokeRect(bx, by, bw, bh); c.setLineDash([]);
    const hq = E.outBack(prog(t, 4.68, 4.85), 3);
    if (hq > 0) {
      c.fillStyle = COL.bg; c.strokeStyle = COL.lime; c.lineWidth = 3;
      for (const [hx, hy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh], [bx + bw / 2, by], [bx + bw / 2, by + bh], [bx, by + bh / 2], [bx + bw, by + bh / 2]]) {
        const hs = 16 * hq; c.fillRect(hx - hs / 2, hy - hs / 2, hs, hs); c.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
      drawText(c, typed(`W ${Math.round(bw)}  H ${Math.round(bh)}  ·  X ${Math.round(bx)}  Y ${Math.round(by)}`, t, 4.7, 120), bx, by - 22, '700 20px Mono', COL.lime);
    }
  } else if (t < 5.5) {
    bg(c, COL.coral);
    const Lt = L_TELLS, base = H / 2 + Lt.cap / 2;
    c.save(); c.beginPath(); c.rect(-300, base - Lt.cap - 40, W + 600, Lt.cap + 50); c.clip();
    centered(c, Lt, 5.0, t, (i, x, y) => {
      const p = E.outExpo(prog(t, 5.0 + i * .04, 5.0 + i * .04 + .32));
      c.translate(x, y + (1 - p) * (Lt.cap + 60));
    }, COL.bg);
    c.restore();
    const lp = E.outExpo(prog(t, 5.12, 5.45));
    c.fillStyle = COL.bg; c.fillRect(W / 2 - Lt.width / 2, base + 30, Lt.width * lp, 10);
  } else {
    bg(c, COL.violet);
    centered(c, L_STORY, 5.5, t, (i, x, y) => {
      const p = prog(t, 5.5 + i * .03, 5.5 + i * .03 + .22);
      const s = E.outBack(p, 2.5);
      c.translate(x, y - L_STORY.cap / 2); c.scale(s, s); c.translate(0, L_STORY.cap / 2);
      c.globalAlpha = p > 0 ? 1 : 0;
    }, COL.ink);
    // caret
    const ci = Math.min(L_STORY.chars.length, Math.floor((t - 5.5) / .03) + 1);
    const lc = L_STORY.chars[ci - 1];
    if (Math.floor(t * 8) % 2 === 0) {
      c.fillStyle = COL.lime;
      c.fillRect(W / 2 - L_STORY.width / 2 + lc.x + lc.w + 14, H / 2 - L_STORY.cap / 2, 16, L_STORY.cap);
    }
    // stripes wipe into the grid scene
    const cols = 12, cw = W / cols;
    c.fillStyle = COL.bg;
    for (let k = 0; k < cols; k++) {
      const p = E.inOutCubic(prog(t, 5.78 + k * .012, 5.78 + k * .012 + .14));
      if (p > 0) c.fillRect(k * cw - 1, -300, cw + 2, 300 + (H + 300) * p);
    }
  }
}

// ═════════════════════════ SCENE 4 · 6–8 s · shape grid with ripple waves ═════════════════════════
const hx3 = h => hex(h);
const STATES = [
  { s: 10, r: 1, rot: 0, c: [COL.ink, COL.ink] },
  { s: 72, r: 1, rot: 0, c: [COL.lime, COL.cyan] },
  { s: 80, r: .12, rot: Math.PI / 4, c: [COL.coral, COL.violet] },
  { s: 56, r: .45, rot: Math.PI, c: [COL.violet, COL.lime] },
  { s: 9, r: 1, rot: Math.PI * 1.5, c: [COL.ink, COL.ink] },
];
const WAVES = [[6.0, W / 2, H / 2], [6.5, 0, 0], [7.0, W, H], [7.5, W / 2, H / 2]];
function scene4(c, t) {
  bg(c, COL.bg);
  const gp = E.outCubic(prog(t, 6, 8));
  const rot = lerp(.14, 0, gp), sc = lerp(1.2, 1, gp);
  // wavefronts
  for (const [tb, ox, oy] of WAVES) {
    const r = (t - tb) * 3500;
    if (r > 0 && r < 2400) { c.strokeStyle = rgba(COL.ink, .25 * (1 - r / 2400)); c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, r, 0, TAU); c.stroke(); }
  }
  c.save();
  c.translate(W / 2, H / 2); c.rotate(rot); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const x = i * CELL + CELL / 2, y = j * CELL + CELL / 2, alt = (i + j) % 2;
    let s = STATES[0].s, r = STATES[0].r, ro = STATES[0].rot;
    let col = hx3(STATES[0].c[alt]).slice();
    let pulse = 0;
    WAVES.forEach(([tb, ox, oy], b) => {
      const last = b === WAVES.length - 1;
      const d = Math.hypot(x - ox, y - oy) / (last ? 6000 : 3500), p = prog(t, tb + d, tb + d + (last ? .26 : .42));
      if (p <= 0) return;
      const nx = STATES[b + 1], eb = E.outBack(p, 2), ec = E.outCubic(p);
      s = lerp(s, nx.s, eb); r = lerp(r, nx.r, ec); ro = lerp(ro, nx.rot, ec);
      const nc = hx3(nx.c[alt]); col = col.map((v, k) => lerp(v, nc[k], ec));
      pulse = Math.max(pulse, Math.sin(p * Math.PI) * .25);
    });
    s = Math.max(1, s * (1 + pulse));
    c.save(); c.translate(x, y); c.rotate(ro);
    c.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
    c.beginPath(); c.roundRect(-s / 2, -s / 2, s, s, clamp(r) * s / 2); c.fill();
    c.restore();
  }
  c.restore();
}

// ═════════════════════════ SCENE 5 · 8–10 s · particles → DESIGN → sphere ═════════════════════════
function sphereProj(i, t) {
  const p = P[i];
  const mt = E.inOutCubic(prog(t, 10.95, 11.5));
  let x = lerp(p.sph[0], p.tor[0], mt), y = lerp(p.sph[1], p.tor[1], mt), z = lerp(p.sph[2], p.tor[2], mt);
  let d = 1 + .09 * noise(x * 1.8 + 3, y * 1.8 + t * .9, z * 1.8) + .07 * kick(t) * Math.sin(y * 10 - t * 9);
  d *= 1 - E.inExpo(prog(t, 11.68, 11.98));
  const R = 360 * d;
  x *= R; y *= R; z *= R;
  const yaw = t * .9, pitch = .42 + .18 * Math.sin(t * 1.3) + mt * .5;
  let X = x * Math.cos(yaw) + z * Math.sin(yaw), Z = -x * Math.sin(yaw) + z * Math.cos(yaw);
  let Y = y * Math.cos(pitch) - Z * Math.sin(pitch); Z = y * Math.sin(pitch) + Z * Math.cos(pitch);
  const D = 1400, s = D / (D - Z);
  return { x: W / 2 + X * s, y: H / 2 + Y * s, s, z: Z / 380 };
}
function pos5(i, t) {
  const p = P[i];
  const u = clamp(t - 8, 0, 2), sp = E.outCubic(clamp(u / 1.1));
  let x = p.sx + Math.cos(p.ang) * p.spd * sp * 300, y = p.sy + Math.sin(p.ang) * p.spd * sp * 300;
  const th = p.sw * u * 1.9, dx = x - W / 2, dy = y - H / 2;
  x = W / 2 + dx * Math.cos(th) - dy * Math.sin(th); y = H / 2 + dx * Math.sin(th) + dy * Math.cos(th);
  x += noise(p.sx * .004, p.sy * .004, u * 1.3) * 160 * sp;
  y += noise(p.sx * .004 + 9.1, p.sy * .004, u * 1.3) * 160 * sp;
  const m = E.inOutCubic(prog(t, 8.72 + p.delay, 9.28 + p.delay));
  x = lerp(x, p.tx, m); y = lerp(y, p.ty, m);
  const sh = kick(t) * m * 3;
  if (sh > .1) { x += noise(p.tx * .05, t * 30, 1) * sh; y += noise(p.ty * .05, t * 30, 2) * sh; }
  const q = E.inOutCubic(prog(t, 9.7, 10.0));
  if (q > 0) { const s = sphereProj(i, 10.0); x = lerp(x, s.x, q); y = lerp(y, s.y, q); }
  return [x, y, m];
}
function scene5(c, t) {
  bg(c, COL.bg);
  const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 900);
  g.addColorStop(0, rgba(COL.violet, .22 + .12 * kick(t))); g.addColorStop(1, rgba(COL.violet, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < NP; i++) {
    const [x, y, m] = pos5(i, t);
    c.fillStyle = P[i].cols[Math.round(m * 8)];
    const s = lerp(5.5, 3.6, m);
    c.fillRect(x - s / 2, y - s / 2, s, s);
  }
  // caption under the word
  const a = prog(t, 9.25, 9.4) * (1 - prog(t, 9.6, 9.7));
  if (a > 0) { c.globalAlpha = a; drawText(c, typed('4,000 PARTICLES · 0 KEYFRAMES', t, 9.25, 80), W / 2, H / 2 + 300, '700 22px Mono', COL.lime, 'center', 6); c.globalAlpha = 1; }
}

// ═════════════════════════ SCENE 6 · 10–12 s · 3D point sphere → torus → collapse ═════════════════════════
const DEPTH = [];
for (let k = 0; k <= 10; k++) DEPTH.push(mixc(COL.violet, COL.lime, k / 10));
function scene6(c, t) {
  bg(c, COL.deep);
  const k = kick(t);
  // HUD ring
  c.save(); c.translate(W / 2, H / 2); c.rotate(t * .3);
  c.strokeStyle = rgba(COL.ink, .18); c.lineWidth = 2; c.setLineDash([2, 14]);
  c.beginPath(); c.arc(0, 0, 470 + k * 14, 0, TAU); c.stroke();
  c.setLineDash([60, 400]); c.strokeStyle = rgba(COL.lime, .5);
  c.beginPath(); c.arc(0, 0, 500, 0, TAU); c.stroke(); c.setLineDash([]);
  c.restore();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < NP; i++) {
    const s = sphereProj(i, t);
    const dz = clamp((s.z + 1) / 2);
    c.globalAlpha = .35 + .65 * dz;
    c.fillStyle = DEPTH[Math.round(dz * 10)];
    const sz = (2 + 3.4 * dz) * s.s;
    c.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
  }
  // orbit ring of points
  const n = 180, rr = 560 * (1 - E.inExpo(prog(t, 11.6, 11.95)));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU - t * 1.3, x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = 0;
    const tilt = .9, Y = y * Math.cos(tilt) - z * Math.sin(tilt), Z = y * Math.sin(tilt) + z * Math.cos(tilt);
    const s = 1400 / (1400 - Z);
    c.globalAlpha = .5; c.fillStyle = i % 10 === 0 ? COL.coral : COL.ink;
    const sz = (i % 10 === 0 ? 7 : 2.5) * s;
    c.fillRect(W / 2 + x * s - sz / 2, H / 2 + Y * s - sz / 2, sz, sz);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // labels
  const lab = t < 11 ? 'SPHERE · 4,000 PTS · FIBONACCI' : 'TORUS · 160 × 25';
  drawText(c, typed(lab, t, t < 11 ? 10.05 : 11.0, 90), 160, H - 170, '700 20px Mono', COL.lime, 'left', 4);
  drawText(c, `YAW ${(t * .9 % TAU).toFixed(3)}  PITCH ${(.42 + .18 * Math.sin(t * 1.3)).toFixed(3)}`, 160, H - 140, '400 18px Mono', rgba(COL.ink, .6), 'left', 2);
  // collapse flash
  const f = prog(t, 11.9, 12.0);
  if (f > 0) { c.fillStyle = rgba(COL.ink, E.inExpo(f)); c.beginPath(); c.arc(W / 2, H / 2, 6 + f * 40, 0, TAU); c.fill(); }
}

// ═════════════════════════ SCENE 7 · 12–14 s · montage (4 × half-beat cuts) ═════════════════════════
function scene7(c, t) {
  const k = kick(t);
  if (t < 12.5) { // rings
    const u = t - 12;
    bg(c, COL.bg);
    c.save(); c.translate(W / 2, H / 2); const s = lerp(.6, 1, E.outExpo(u / .35)); c.scale(s, s);
    for (let i = 0; i < 12; i++) {
      const r = 50 + i * 40;
      c.save(); c.rotate((i % 2 ? 1 : -1) * u * (3.2 - i * .18) + i);
      c.strokeStyle = i % 3 === 0 ? COL.lime : rgba(COL.ink, .85); c.lineWidth = i % 3 === 0 ? 8 : 3;
      c.setLineDash(i % 2 ? [r * .6, r * .25] : [4, 12 + i]);
      c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.restore();
    }
    c.setLineDash([]);
    c.rotate(-u * .8);
    for (let i = 0; i < 120; i++) { c.rotate(TAU / 120); c.fillStyle = i % 10 ? rgba(COL.ink, .4) : COL.coral; c.fillRect(560, -1, i % 10 ? 18 : 40, 2 + (i % 10 ? 0 : 2)); }
    c.fillStyle = COL.coral; c.beginPath(); c.arc(0, 0, 18 + k * 24, 0, TAU); c.fill();
    c.restore();
  } else if (t < 13) { // isometric
    const u = t - 12.5;
    bg(c, COL.violet);
    const a = 50, ca = Math.cos(Math.PI / 6) * a, sa = .5 * a, n = 10;
    const ox = W / 2, oy = H / 2 - 230;
    for (let sum = 0; sum <= 2 * (n - 1); sum++) for (let gx = 0; gx < n; gx++) {
      const gy = sum - gx; if (gy < 0 || gy >= n) continue;
      const dist = Math.hypot(gx - (n - 1) / 2, gy - (n - 1) / 2);
      const pop = E.outBack(prog(u, dist * .02, dist * .02 + .2), 2);
      const h = (12 + 170 * Math.pow(Math.max(0, Math.sin(dist * .9 - u * 14)), 2)) * pop;
      const x = ox + (gx - gy) * ca, y = oy + (gx + gy) * sa;
      // top
      c.fillStyle = COL.ink; c.beginPath();
      c.moveTo(x, y - h); c.lineTo(x + ca, y + sa - h); c.lineTo(x, y + 2 * sa - h); c.lineTo(x - ca, y + sa - h); c.closePath(); c.fill();
      // left
      c.fillStyle = COL.coral; c.beginPath();
      c.moveTo(x - ca, y + sa - h); c.lineTo(x, y + 2 * sa - h); c.lineTo(x, y + 2 * sa); c.lineTo(x - ca, y + sa); c.closePath(); c.fill();
      // right
      c.fillStyle = '#B8301A'; c.beginPath();
      c.moveTo(x + ca, y + sa - h); c.lineTo(x, y + 2 * sa - h); c.lineTo(x, y + 2 * sa); c.lineTo(x + ca, y + sa); c.closePath(); c.fill();
    }
  } else if (t < 13.5) { // unknown pleasures
    const u = t - 13;
    bg(c, COL.deep);
    c.lineWidth = 2.4; c.strokeStyle = COL.ink; c.fillStyle = COL.deep;
    for (let li = 0; li < 34; li++) {
      const base = 190 + li * 22.5;
      c.beginPath(); c.moveTo(470, base);
      for (let x = 470; x <= 1450; x += 7) {
        const env = Math.exp(-Math.pow((x - 960) / 150, 2));
        const n1 = noise(x * .013, li * .37, u * 4.5) + .35;
        c.lineTo(x, base - env * Math.max(0, n1) * (150 + 90 * k) - env * 6 * Math.sin(x * .2 + u * 20));
      }
      c.lineTo(1450, base + 40); c.lineTo(470, base + 40); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(470, base);
      for (let x = 470; x <= 1450; x += 7) {
        const env = Math.exp(-Math.pow((x - 960) / 150, 2));
        const n1 = noise(x * .013, li * .37, u * 4.5) + .35;
        c.lineTo(x, base - env * Math.max(0, n1) * (150 + 90 * k) - env * 6 * Math.sin(x * .2 + u * 20));
      }
      c.stroke();
    }
  } else { // kaleidoscope → cream circle wipe
    const u = t - 13.5;
    bg(c, COL.coral);
    c.save(); c.translate(W / 2, H / 2); c.rotate(u * 1.6);
    const cols = [COL.bg, COL.ink, COL.lime];
    for (let w = 0; w < 12; w++) {
      c.save(); c.rotate(w * TAU / 12); if (w % 2) c.scale(1, -1);
      for (let j = 0; j < 7; j++) {
        const r = 70 + j * 95 + ((u * 420) % 95), s = 22 + j * 9;
        c.save(); c.translate(r, r * .22); c.rotate(u * 7 + j);
        c.fillStyle = cols[(j + w) % 3];
        c.beginPath(); c.moveTo(0, -s); c.lineTo(s * .87, s * .5); c.lineTo(-s * .87, s * .5); c.closePath(); c.fill();
        c.restore();
      }
      c.restore();
    }
    c.fillStyle = COL.bg; c.beginPath(); c.arc(0, 0, 60 + k * 26, 0, TAU); c.fill();
    c.restore();
    const wp = prog(t, 13.8, 14.0);
    if (wp > 0) { c.fillStyle = COL.ink; c.beginPath(); c.arc(W / 2, H / 2, E.inExpo(wp) * 1200 + wp * 60, 0, TAU); c.fill(); }
  }
  // montage chip
  const labels = ['GEOMETRY', 'ISOMETRIC', 'GENERATIVE', 'PATTERN'];
  const idx = Math.min(3, Math.floor((t - 12) / .5));
  const chip = `${String(idx + 1).padStart(2, '0')} / ${labels[idx]}`;
  c.font = '700 22px Mono';
  const cw = c.measureText(chip).width + 36;
  c.fillStyle = COL.lime; c.fillRect(W / 2 - cw / 2, 120, cw * E.outExpo(prog(t, 12 + idx * .5, 12.15 + idx * .5)), 44);
  drawText(c, chip, W / 2, 150, '700 22px Mono', COL.bg, 'center');
}

// ═════════════════════════ SCENE 8 · 14–16 s · data viz dashboard ═════════════════════════
const BARS = [.35, .55, .42, .8, .62, 1, .7, .5, .85, .6, .4, .75];
const LINE = (() => { const a = []; for (let i = 0; i <= 64; i++) a.push(.2 + .6 * (i / 64) + .12 * noise(i * .18, 3.3, 0) + .05 * Math.sin(i * .9)); return a; })();
function slideUp(c, t, t0, x, y, h, draw) {
  const p = E.outExpo(prog(t, t0, t0 + .45));
  if (p <= 0) return;
  c.save(); c.beginPath(); c.rect(x - 10, y - h, 900, h + 16); c.clip(); c.translate(0, (1 - p) * h); draw(); c.restore();
}
function scene8(c, t) {
  bg(c, COL.ink);
  const k = kick(t), ink = COL.bg;
  // header
  const hl = E.outExpo(prog(t, 14.0, 14.5));
  c.fillStyle = ink; c.fillRect(160, 206, 1600 * hl, 2);
  drawText(c, typed('RENDER STATS // SHOWREEL 2026', t, 14.02, 90), 160, 186, '700 20px Mono', ink, 'left', 3);
  drawText(c, typed('SRC: reel.js', t, 14.1, 90), 1760, 186, '400 20px Mono', rgba(COL.bg, .6), 'right', 2);
  // big counter
  const v = Math.round(1200 * E.outExpo(prog(Math.floor(t * FPS) / FPS, 14.1, 15.2)));
  slideUp(c, t, 14.05, 150, 540, 320, () => {
    drawText(c, String(v).padStart(4, '0'), 150, 540, '400 300px Anton', ink, 'left', 4);
  });
  slideUp(c, t, 14.2, 160, 588, 40, () => drawText(c, 'FRAMES RENDERED  ·  60 FPS  ·  20 SEC', 160, 588, '700 20px Mono', ink, 'left', 3));
  // mini stats
  [['60', 'FPS'], ['0', 'PLUGINS'], ['100%', 'CODE']].forEach(([val, lab], i) => {
    const x = 160 + i * 250;
    slideUp(c, t, 14.3 + i * .08, x, 700, 70, () => drawText(c, val, x, 700, '700 66px Grotesk', i === 2 ? COL.coral : ink));
    slideUp(c, t, 14.36 + i * .08, x, 736, 30, () => drawText(c, lab, x, 736, '700 18px Mono', rgba(COL.bg, .65), 'left', 3));
  });
  // bars
  const bx0 = 1000, bw = 44, gap = 20, base = 720;
  c.fillStyle = ink; c.fillRect(bx0 - 10, base, 12 * (bw + gap) - gap + 20, 2 * E.outExpo(prog(t, 14.1, 14.4)) + .01);
  BARS.forEach((b, i) => {
    const p = E.outBack(prog(t, 14.15 + i * .035, 14.6 + i * .035), 1.6);
    if (p <= 0) return;
    const bump = 1 + .22 * k * (((i * 7) % 5) / 4);
    const h = b * 440 * p * bump;
    c.fillStyle = b === 1 ? COL.coral : ink;
    c.fillRect(bx0 + i * (bw + gap), base - h, bw, h);
    if (p > .8) drawText(c, String(Math.round(b * 100)), bx0 + i * (bw + gap) + bw / 2, base - h - 12, '700 15px Mono', ink, 'center');
  });
  // line chart with lime area
  const lp = E.outCubic(prog(t, 14.3, 15.4)), x0 = 160, x1 = 1760, y0 = 980, hh = 170;
  const nPts = LINE.length - 1, upto = lp * nPts;
  if (upto > 0) {
    const pts = [];
    for (let i = 0; i <= Math.floor(upto); i++) pts.push([x0 + (x1 - x0) * i / nPts, y0 - LINE[i] * hh]);
    const fi = Math.floor(upto), fr = upto - fi;
    if (fi < nPts) pts.push([x0 + (x1 - x0) * upto / nPts, y0 - lerp(LINE[fi], LINE[fi + 1], fr) * hh]);
    c.fillStyle = COL.lime; c.beginPath(); c.moveTo(x0, y0);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(pts[pts.length - 1][0], y0); c.closePath(); c.fill();
    c.strokeStyle = ink; c.lineWidth = 3; c.beginPath();
    pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    const [hx, hy] = pts[pts.length - 1];
    c.fillStyle = COL.coral; c.beginPath(); c.arc(hx, hy, 9 + k * 4, 0, TAU); c.fill();
    drawText(c, `+${Math.round(lp * 312)}%`, hx + 18, hy - 14, '700 20px Mono', ink);
  }
  c.fillStyle = ink; c.fillRect(x0, y0, (x1 - x0) * hl, 2);
  // exit: rotating diamond → tunnel
  const dp = prog(t, 15.55, 16.0);
  if (dp > 0) {
    const d = E.inCubic(dp) * 1600;
    c.save(); c.translate(W / 2, H / 2); c.rotate(Math.PI / 4 + dp * dp * 2.4);
    c.fillStyle = COL.bg; c.fillRect(-d / Math.SQRT2, -d / Math.SQRT2, d * Math.SQRT2, d * Math.SQRT2);
    c.strokeStyle = COL.lime; c.lineWidth = 6; c.strokeRect(-d / Math.SQRT2, -d / Math.SQRT2, d * Math.SQRT2, d * Math.SQRT2);
    c.restore();
  }
}

// ═════════════════════════ SCENE 9 · 16–18 s · tunnel build-up + countdown ═════════════════════════
const ROLL = [...[0, 1, 2, 3].map(k => 16 + k * .25), ...[0, 1, 2, 3].map(k => 17 + k * .125), ...[0, 1, 2, 3, 4, 5].map(k => 17.5 + k * .0625)];
function scene9(c, t) {
  bg(c, COL.bg);
  if (t >= 17.875) return; // silence gap: black
  const u = t - 16;
  let fl = 0; for (const rt of ROLL) if (t >= rt) fl = Math.max(fl, Math.exp(-(t - rt) * 26));
  c.fillStyle = rgba(COL.violet, .22 * fl); c.fillRect(0, 0, W, H);
  const travel = 900 * u + 520 * u * u * u, cols = [COL.lime, COL.violet, COL.coral, COL.ink];
  c.save(); c.translate(W / 2, H / 2); c.rotate(u * u * .45);
  const items = [];
  for (let k = 0; k < 32; k++) {
    const z = ((k * 200 - travel) % 6400 + 6400) % 6400 + 40;
    items.push([z, k]);
  }
  items.sort((a, b) => b[0] - a[0]);
  for (const [z, k] of items) {
    const s = 520 * 420 / z;
    if (s > 4000) continue;
    c.save(); c.rotate(z * .0005 * (1 + u * 1.5) + u * .8);
    c.globalAlpha = Math.pow(clamp(1 - z / 6400), 1.4);
    c.strokeStyle = cols[k % 4]; c.lineWidth = clamp(2600 / z, 1, 60);
    c.strokeRect(-s, -s, s * 2, s * 2);
    c.restore();
  }
  c.restore(); c.globalAlpha = 1;
  // countdown
  const nums = [[17.0, '3'], [17.25, '2'], [17.5, '1']];
  for (let i = nums.length - 1; i >= 0; i--) {
    const [t0, str] = nums[i];
    if (t >= t0) {
      const p = E.outExpo(prog(t, t0, t0 + .2)), s = lerp(1.6, 1, p);
      c.save(); c.translate(W / 2, H / 2); c.scale(s, s);
      drawText(c, str, 14, 210, '400 560px Anton', COL.coral, 'center');
      drawText(c, str, 0, 196, '400 560px Anton', COL.ink, 'center');
      c.restore();
      break;
    }
  }
  if (t < 17) {
    const a = prog(t, 16.1, 16.3);
    c.globalAlpha = a;
    drawText(c, typed('BUILDING UP', t, 16.1, 40), W / 2, H / 2 + 12, '700 30px Mono', COL.ink, 'center', 14);
    c.globalAlpha = 1;
  }
}

// ═════════════════════════ SCENE 10 · 18–20 s · signature end card ═════════════════════════
const DRIFT = (() => { const r = rng(9), a = []; for (let i = 0; i < 90; i++) a.push([r() * W, r() * H, (r() - .5) * 30, -10 - r() * 30, 1 + r() * 2.5]); return a; })();
function scene10(c, t) {
  bg(c, COL.bg);
  const u = t - 18;
  for (const [x, y, vx, vy, s] of DRIFT) {
    c.fillStyle = rgba(COL.ink, .18);
    c.fillRect((x + vx * u + W) % W, (y + vy * u + H) % H, s, s);
  }
  const z = lerp(1.08, 1, E.outCubic(prog(t, 18, 20)));
  c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
  const Ln = L_NAME, gapDot = 26, total = Ln.width + gapDot + BALL_R * 2;
  const x0 = W / 2 - total / 2, base = H / 2 + 40;
  // name, masked reveal
  c.save(); c.beginPath(); c.rect(-300, base - Ln.cap - 60, W + 600, Ln.cap + 70); c.clip();
  c.font = Ln.font; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = COL.ink;
  Ln.chars.forEach((ch, i) => {
    const p = E.outExpo(prog(t, 18.04 + i * .05, 18.64 + i * .05));
    c.fillText(ch.ch, x0 + ch.x + ch.w / 2, base + (1 - p) * (Ln.cap + 80));
  });
  c.restore();
  // underline
  const ul = E.outExpo(prog(t, 18.35, 18.95));
  c.fillStyle = COL.lime; c.fillRect(W / 2 - total / 2 * ul, base + 34, total * ul, 6);
  // subtitle
  const sub = 'MOTION DESIGNER  ·  SHOWREEL 2026';
  c.font = '500 32px Grotesk'; c.textAlign = 'left';
  let sw = 0; for (const ch of sub) sw += c.measureText(ch).width + 7; sw -= 7;
  let sx = W / 2 - sw / 2, i = 0;
  for (const ch of sub) {
    const p = E.outCubic(prog(t, 18.55 + i * .016, 18.85 + i * .016));
    c.globalAlpha = p; c.fillStyle = COL.ink; c.fillText(ch, sx, base + 104 + (1 - p) * 16);
    sx += c.measureText(ch).width + 7; i++;
  }
  c.globalAlpha = prog(t, 19.1, 19.4) * .5;
  drawText(c, '100% CODE  ·  CANVAS 2D  ·  1200 FRAMES  ·  NO TEMPLATES', W / 2, base + 170, '400 18px Mono', COL.ink, 'center', 4);
  c.globalAlpha = 1;
  // the ball from the intro comes back as the full stop
  const dx = x0 + Ln.width + gapDot + BALL_R;
  if (t >= 19.0) {
    let yb, vy = 0;
    if (t < 19.25) { const p = prog(t, 19.0, 19.25); yb = lerp(-60, base, p * p); vy = 2 * p * (base + 60) / .25; }
    else if (t < 19.45) { const p = prog(t, 19.25, 19.45); yb = base - 60 * 4 * p * (1 - p); vy = Math.abs(240 * (1 - 2 * p) / .2); }
    else yb = base;
    const stretch = Math.min(.5, vy / 4000);
    let sq = .45 * Math.exp(-Math.pow((t - 19.25) / .03, 2)) + .25 * Math.exp(-Math.pow((t - 19.45) / .03, 2));
    const sy = (1 + stretch) * (1 - sq), sxx = 1 / sy;
    c.fillStyle = COL.lime; c.beginPath(); c.ellipse(dx, yb - BALL_R * sy, BALL_R * sxx, BALL_R * sy, 0, 0, TAU); c.fill();
  }
  c.restore();
  // white flash on impact
  const fl = 1 - E.outQuart(prog(t, 18.0, 18.3));
  if (fl > 0) { c.fillStyle = rgba('#FFFFFF', fl); c.fillRect(-300, -300, W + 600, H + 600); }
}

// ───────────────────────── compositor ─────────────────────────
const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, scene10];
function drawScene(c, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const k = kick(t);
  const shake = k * 5 + impulse(t, 18, 5) * 28 + impulse(t, 2, 7) * 14;
  const sx = noise(t * 18, .5, 1) * shake, sy = noise(.5, t * 18, 2) * shake;
  const z = 1 + k * .012 + impulse(t, 18, 6) * .04;
  c.setTransform(z, 0, 0, z, W / 2 * (1 - z) + sx, H / 2 * (1 - z) + sy);
  SCENES[Math.min(9, Math.floor(t / 2))](c, t);
  c.setTransform(1, 0, 0, 1, 0, 0);
}

const SECTIONS = [[0, '00 · PRINCIPLES OF ANIMATION'], [2, '01 · KINETIC TYPE'], [4, '02 · EDITORIAL CUTS'], [6, '03 · GRID SYSTEMS'],
  [8, '04 · PARTICLES'], [10, '05 · 3D / DEPTH'], [12, '06 · MONTAGE'], [14, '07 · DATA VIZ'], [16, '08 · BUILD-UP'], [18, '09 · SIGNATURE']];
const pad2 = n => String(n).padStart(2, '0');
function hud(o, t) {
  let a = clamp(t / .4) * (1 - prog(t, 19.6, 19.85));
  if (t >= 17.875 && t < 18.05) a = 0;
  if (a <= 0) return;
  const m = 56, L = 28;
  // REC dot
  o.globalAlpha = a * (Math.floor(t * 2) % 2 === 0 ? 1 : .35);
  o.fillStyle = COL.coral; o.beginPath(); o.arc(m + 44, m + 22, 7, 0, TAU); o.fill();
  o.save(); o.globalCompositeOperation = 'difference'; o.globalAlpha = a * .9;
  o.fillStyle = '#fff'; o.strokeStyle = '#fff'; o.lineWidth = 2;
  o.beginPath();
  for (const [x, y, dx, dy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    o.moveTo(x + dx * L, y); o.lineTo(x, y); o.lineTo(x, y + dy * L);
  }
  o.stroke();
  const f = Math.min(1199, Math.floor(t * FPS + 1e-6));
  o.font = '700 17px Mono'; o.textBaseline = 'middle'; o.textAlign = 'left';
  o.fillText(`REC   TC 00:00:${pad2(Math.floor(f / 60))}:${pad2(f % 60)}`, m + 60, m + 23);
  o.textAlign = 'right';
  o.fillText('SHOWREEL/2026   1920×1080   60FPS', W - m - 12, m + 23);
  // section label, typed on change
  let sec = SECTIONS[0]; for (const s of SECTIONS) if (t >= s[0]) sec = s;
  o.textAlign = 'left';
  const txt = typed(sec[1], t, sec[0], 90);
  o.fillText(txt, m + 12, H - m - 22);
  if (Math.floor(t * 4) % 2 === 0) { const w = o.measureText(txt).width; o.fillRect(m + 16 + w, H - m - 31, 10, 18); }
  // progress
  const pw = 280, px = W - m - 12 - pw, py = H - m - 22;
  o.fillRect(px, py - 1, pw * (f + 1) / 1200, 3);
  o.globalAlpha = a * .35; o.fillRect(px, py - 1, pw, 3);
  o.globalAlpha = a * .9; o.textAlign = 'right';
  o.fillText(`F ${String(f + 1).padStart(4, '0')}/1200`, px - 18, py);
  o.restore();
}

const CA_HITS = [[2, 16], [4, 8], [4.5, 6], [5, 6], [5.5, 6], [6, 8], [8, 8], [10, 10], [12, 10], [12.5, 8], [13, 8], [13.5, 8], [14, 8], [16, 8], [18, 18]];
function post(o, src, t) {
  let ca = kick(t) * 3;
  for (const [at, amt] of CA_HITS) ca += impulse(t, at, 9) * amt;
  o.globalAlpha = 1; o.globalCompositeOperation = 'source-over';
  if (ca > .6) {
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    o.globalCompositeOperation = 'lighter';
    for (const [col, dx] of [['#f00', -ca], ['#0f0', 0], ['#00f', ca]]) {
      tctx.globalCompositeOperation = 'source-over'; tctx.drawImage(src, 0, 0);
      tctx.globalCompositeOperation = 'multiply'; tctx.fillStyle = col; tctx.fillRect(0, 0, W, H);
      o.drawImage(tmpC, dx, 0);
    }
    o.globalCompositeOperation = 'source-over';
  } else o.drawImage(src, 0, 0);
  hud(o, t);
  o.globalAlpha = 1;
  o.fillStyle = vignette; o.fillRect(0, 0, W, H);
  // grain
  const f = Math.floor(t * FPS);
  o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = .09;
  o.translate((f * 97) % 256, (f * 57) % 256);
  o.fillStyle = grainTiles[f % 4]; o.fillRect(-256, -256, W + 256, H + 256);
  o.restore();
  // global fades
  const blk = Math.max(1 - prog(t, 0, .15), prog(t, 19.75, 20));
  if (blk > 0) { o.globalAlpha = blk; o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.globalAlpha = 1; }
}

const FAST = [[1.85, 2.0], [3.6, 4.0], [5.78, 6.0], [11.7, 12.0], [13.8, 14.0], [15.6, 16.0], [16.9, 17.875]];
function renderAt(t, sub = SUB) {
  if (sub > 1 && FAST.some(([a, b]) => t >= a && t < b)) sub *= 3;
  for (let s = 0; s < sub; s++) {
    const ts = Math.min(DUR - 1e-4, t + (s / sub) * SHUTTER / FPS);
    drawScene(sctx, ts);
    actx.globalAlpha = 1 / (s + 1); actx.drawImage(sceneC, 0, 0);
  }
  actx.globalAlpha = 1;
  post(out, accC, t);
}

// ───────────────────────── API / preview ─────────────────────────
window.reelReady = (async () => {
  await Promise.all(['400 100px Anton', '500 30px Grotesk', '700 30px Grotesk', '400 20px Mono', '700 20px Mono'].map(f => document.fonts.load(f)));
  precompute();
})();
window.renderFrame = f => renderAt(f / FPS);
window.reelInfo = { W, H, FPS, DUR, frames: FPS * DUR };

if (!/[?&]render/.test(location.search)) {
  const params = new URLSearchParams(location.search);
  SUB = +(params.get('sub') || 1);
  const music = document.getElementById('music'), play = document.getElementById('play');
  window.reelReady.then(() => {
    const at = params.get('t');
    if (at !== null) { renderAt(+at); return; }
    renderAt(0.9);
    play.hidden = false;
    const loop = () => { renderAt(Math.min(DUR - 1e-3, music.currentTime)); if (!music.paused) requestAnimationFrame(loop); else play.hidden = false; };
    play.onclick = () => { play.hidden = true; music.currentTime = 0; music.play().then(loop); };
  });
}
