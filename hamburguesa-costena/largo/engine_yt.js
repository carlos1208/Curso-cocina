'use strict';
/*
 * Long-form recipe video engine — 1920x1080 (YouTube), 30 fps, driven by timeline.json.
 * The footage is vertical, so the layout is editorial: a 9:16 "card" with the shot, a blurred copy of it filling
 * the frame, and a text column with animated callouts (quantities, timers, heat, tips) and subtitles. The card
 * switches sides every chapter; chapters open with a two-layer wipe. Every frame is a pure function of time t.
 * Query params: ?t=12.3 (single frame), ?render (driven by render_yt.cjs).
 */
let W = 1920, H = 1080;              // the vertical Short sets 1080x1920 from its timeline
let FPS = 30, DUR = 157.7, TL = null, VERT = false;
const SHUTTER = 0.5;
const COL = { cream: '#F6EFE3', saffron: '#F2B544', dark: '#140E09', ember: '#E0782F' };

// ───────── math ─────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const TAU = Math.PI * 2;
const E = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuart: t => t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * TAU / 3) + 1,
};
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const noise1 = (x, s = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + s * 57), hash(i + 1 + s * 57), u) * 2 - 1; };
const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;

// ───────── canvases ─────────
const out = document.getElementById('c').getContext('2d');
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let sceneC, S, accC, A;               // created in setup(), once the size is known
const tinyC = mk(40, 72), tinyX = tinyC.getContext('2d');          // blurred background source (portrait)
const midC = mk(320, 180), midX = midC.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');
let GRAIN = [], VIGNETTE;

function textW(str, font, sp = 0) { mctx.font = font; let w = 0; for (const ch of str) w += mctx.measureText(ch).width + sp; return w - (str.length ? sp : 0); }
function drawText(c, str, x, y, font, color, align = 'left', sp = 0) {
  c.font = font; c.fillStyle = color; c.textBaseline = 'alphabetic';
  if (!sp) { c.textAlign = align; c.fillText(str, x, y); return; }
  c.textAlign = 'left';
  let cx = align === 'center' ? x - textW(str, font, sp) / 2 : align === 'right' ? x - textW(str, font, sp) : x;
  for (const ch of str) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
}
function wrapWords(words, font, maxW) {           // words: [{w, hi}] → lines of words
  mctx.font = font; const sp = mctx.measureText(' ').width, lines = [[]]; let lw = 0;
  for (const wd of words) {
    const ww = mctx.measureText(wd.w).width;
    if (lines[lines.length - 1].length && lw + sp + ww > maxW) { lines.push([]); lw = 0; }
    lw += (lines[lines.length - 1].length ? sp : 0) + ww; lines[lines.length - 1].push(wd);
  }
  return lines;
}
function rich(s) {                               // "**600 g**, de" → words made of coloured parts, no space before the comma
  const words = []; let glue = false;
  s.split('**').forEach((seg, k) => {
    const hi = k % 2 === 1, toks = seg.split(' ');
    toks.forEach((tok, j) => {
      if (tok === '') { glue = false; return; }
      if (j === 0 && glue && words.length) { const w = words[words.length - 1]; w.parts.push({ s: tok, hi }); w.w += tok; }
      else words.push({ w: tok, parts: [{ s: tok, hi }] });
      glue = true;
    });
    glue = !seg.endsWith(' ') && seg !== '';
  });
  return words;
}
function wrapPlain(str, font, maxW) { return wrapWords(str.split(' ').map(w => ({ w })), font, maxW).map(l => l.map(x => x.w).join(' ')); }

// ───────── media ─────────
const IMG = {}, CACHE = new Map(), REQ = new Set();
let INDEX = {};
function stillOf(key) { const m = TL.media[key]; return m && m.img ? IMG[m.img] : null; }
function frameImg(key, i) {
  const k = `${key}/${i}`, im = CACHE.get(k);
  if (im) return im;
  REQ.add(k);
  for (const d of [-1, 1, -2, 2, -3, 3]) { const n = CACHE.get(`${key}/${i + d}`); if (n) return n; }
  return null;
}
// media sample at clip time m (seconds): two neighbouring frames and the blend between them (smooth slow motion)
function sample(key, m) {
  const st = stillOf(key); if (st) return { a: st, b: null, w: 0, iw: st.naturalWidth, ih: st.naturalHeight };
  const info = INDEX[key]; if (!info) return null;
  const f = clamp(m * info.fps, 0, info.frames - 1), i = Math.floor(f), w = f - i;
  const a = frameImg(key, i), b = w > .02 && i + 1 < info.frames ? frameImg(key, i + 1) : null;
  if (!a) return null;
  return { a, b, w, iw: a.naturalWidth, ih: a.naturalHeight };
}
async function loadRequested() {
  const keys = [...REQ]; REQ.clear();
  await Promise.all(keys.map(async k => {
    if (CACHE.has(k)) return;
    const [key, i] = k.split('/'), im = new Image();
    im.src = `frames/${key}/f${String(i).padStart(4, '0')}.jpg`;
    try { await im.decode(); CACHE.set(k, im); } catch (e) { /* frame past the end: neighbours cover it */ }
  }));
  while (CACHE.size > 260) CACHE.delete(CACHE.keys().next().value);
}

// draws a media sample to cover rect (x, y, w, h) with zoom z around focus (fx, fy); returns image→screen mapping
function cover(c, smp, x, y, w, h, z, fx, fy, shimmer, t) {
  if (!smp) return null;
  const sc = Math.max(w / smp.iw, h / smp.ih) * z, iw = smp.iw * sc, ih = smp.ih * sc;
  const tx = clamp(x + w / 2 - fx * iw, x + w - iw, x), ty = clamp(y + h / 2 - fy * ih, y + h - ih, y);
  c.drawImage(smp.a, tx, ty, iw, ih);
  if (smp.b) { c.globalAlpha *= smp.w; c.drawImage(smp.b, tx, ty, iw, ih); c.globalAlpha /= Math.max(1e-3, smp.w); }
  if (shimmer) {                        // heat haze: redraw horizontal strips with a travelling sine offset
    const [x0, y0, x1, y1] = shimmer, sy0 = y0 * smp.ih, sy1 = y1 * smp.ih, step = 3;
    for (let sy = sy0; sy < sy1; sy += step) {
      const k = (sy - sy0) / (sy1 - sy0), amp = Math.sin(Math.PI * k) * 5;
      const dx = Math.sin(sy * .09 + t * 9) * amp + Math.sin(sy * .031 - t * 5) * amp * .6;
      c.drawImage(smp.a, x0 * smp.iw, sy, (x1 - x0) * smp.iw, step, tx + x0 * iw + dx, ty + sy * sc, (x1 - x0) * iw, step * sc + .5);
    }
  }
  return { map: (nx, ny) => [tx + nx * iw, ty + ny * ih], sc };
}

// ───────── timeline helpers ─────────
let SHOTS = [], CH = [], CO = [], PINS = [], CUES = [];
function shotIndex(t) { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].t0) return i; return 0; }
function chapterAt(t) { let k = 0; CH.forEach((c, i) => { if (t >= c.t) k = i; }); return CH[k]; }
function mediaTime(s, t) { return s.a + (t - s.t0) * (s.b - s.a) / Math.max(1e-3, s.t1 - s.t0); }
function camera(s, t) {
  const u = E.inOutSine(prog(t, s.t0 - .3, s.t1 + .3));
  return { z: lerp(s.z[0], s.z[1], u), fx: lerp(s.f[0][0], s.f[1][0], u), fy: lerp(s.f[0][1], s.f[1][1], u) };
}
function shotSample(s, t) { return sample(s.src, mediaTime(s, t)); }

// ───────── layout ─────────
const CARD = { w: 506, h: 900, y: 90 };
const cardX = side => side === 'L' ? 244 : 1170;
const colX = side => side === 'L' ? 880 : 150;
const COLW = 880;

function roundClip(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); c.clip(); }
function shadowCard(c, x, y, w, h, r, a = 1) {
  c.save(); c.globalAlpha *= a; c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
  c.fillStyle = '#0d0906'; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); c.restore();
}
function cardFrame(c, x, y, w, h, r, a = 1) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = 'rgba(246,239,227,.22)'; c.lineWidth = 2; c.beginPath(); c.roundRect(x + 1, y + 1, w - 2, h - 2, r); c.stroke(); c.restore();
}

// blurred, darkened copy of the main shot behind everything
function background(c, smp, cam, t, ch, amt = 1) {
  if (smp) {
    tinyX.clearRect(0, 0, 40, 72);
    cover(tinyX, smp, 0, 0, 40, 72, Math.min(cam.z, 1.6), cam.fx, cam.fy);
    midX.imageSmoothingQuality = 'high';
    midX.drawImage(tinyC, 0, 12, 40, 48, -20, -20, 360, 220);
    c.save(); c.globalAlpha = amt; c.imageSmoothingQuality = 'high';
    const drift = Math.sin(t * .07) * 30;
    c.drawImage(midC, -60 + drift, -40, W + 120, H + 80);
    c.restore();
  }
  c.fillStyle = 'rgba(16,11,7,.62)'; c.fillRect(0, 0, W, H);
  // warm light from the card side + chapter tint
  const side = ch.side, lx = side === 'L' ? W * .22 : W * .78;
  const g = c.createRadialGradient(lx, H * .45, 60, lx, H * .5, W * .7);
  g.addColorStop(0, rgba(ch.color, .16)); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function watermark(c, ch, t) {
  if (!ch.mark) return;
  const side = ch.side, font = '700 250px Grotesk';
  c.save(); c.globalAlpha = .05 * prog(t, ch.t + .2, ch.t + 1.2); c.strokeStyle = COL.cream; c.lineWidth = 2; c.font = font;
  const w = textW(ch.mark, font, 10), drift = (t - ch.t) * 6;
  const x = side === 'L' ? 40 - drift : W - 40 - w + drift, y = H - 70;
  let cx = x; for (const chr of ch.mark) { c.strokeText(chr, cx, y); cx += c.measureText(chr).width + 10; }
  c.restore();
}

// the main card: current shot (+ previous one during a push/zoom), pins and traces on top
function mainCard(c, t, ch, i) {
  const s = SHOTS[i], side = ch.side;
  let x = cardX(side), y = CARD.y;
  const { w, h } = CARD, r = 26;
  // after a chapter wipe the card settles in
  const enter = E.outCubic(prog(t, ch.t + .2, ch.t + 1.0));
  const dx = (1 - enter) * (side === 'L' ? -80 : 80), sc = lerp(.94, 1, enter);
  const float = Math.sin(t * .6) * 4;
  c.save();
  c.translate(x + w / 2 + dx, y + h / 2 + float); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
  shadowCard(c, 0, 0, w, h, r);
  c.save(); roundClip(c, 0, 0, w, h, r);
  c.fillStyle = '#0d0906'; c.fillRect(0, 0, w, h);
  let map = null;
  const prev = SHOTS[i - 1], tr = s.tr, win = tr === 'push' ? .24 : tr === 'zoom' ? .3 : 0;
  const p = win && prev ? E.inOutCubic(prog(t, s.t0 - win, s.t0 + win)) : 1;
  if (prev && p < 1 && t < s.t0 + win) {
    // outgoing shot, still playing
    const pc = camera(prev, t), ps = shotSample(prev, t);
    c.save();
    if (tr === 'push') c.translate(0, -p * h);
    else { c.globalAlpha = 1 - p; c.translate(w / 2, h / 2); c.scale(1 - .12 * p, 1 - .12 * p); c.translate(-w / 2, -h / 2); }
    cover(c, ps, 0, 0, w, h, pc.z, pc.fx, pc.fy, prev.shimmer, t);
    c.restore();
  }
  if (t >= s.t0 - win) {
    const cam = camera(s, t), smp = shotSample(s, t);
    c.save();
    if (tr === 'push' && p < 1) c.translate(0, (1 - p) * h);
    if (tr === 'zoom' && p < 1) { c.globalAlpha = p; c.translate(w / 2, h / 2); c.scale(1.25 - .25 * p, 1.25 - .25 * p); c.translate(-w / 2, -h / 2); }
    const m = cover(c, smp, 0, 0, w, h, cam.z, cam.fx, cam.fy, s.shimmer, t);
    c.restore();
    if (m && p >= 1) map = m;
    else if (m) map = m;
  }
  // inner vignette for depth
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(.25, 'rgba(0,0,0,0)'); g.addColorStop(.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (map) { pins(c, t, s, map); traces(c, t, s, map); }
  c.restore();
  cardFrame(c, 0, 0, w, h, r);
  c.restore();
}

function pins(c, t, s, map) {
  PINS.filter(p => p.shot === s.id && t >= p.t).forEach(p => {
    const [px, py] = map.map(p.xy[0], p.xy[1]), a = t - p.t, pop = E.outBack(prog(a, 0, .35), 2.5);
    const col = chapterAt(t).color;
    for (const d of [0, .45]) {          // two expanding rings
      const k = prog(a, d, d + 1.1); if (k <= 0 || k >= 1) continue;
      c.strokeStyle = rgba(col, .8 * (1 - k)); c.lineWidth = 3; c.beginPath(); c.arc(px, py, 10 + 44 * E.outCubic(k), 0, TAU); c.stroke();
    }
    c.save(); c.translate(px, py); c.scale(pop, pop);
    c.fillStyle = col; c.strokeStyle = COL.cream; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill(); c.stroke();
    drawText(c, String(p.n), 0, 7, '700 19px Grotesk', COL.dark, 'center');
    c.restore();
  });
}
function traces(c, t, s, map) {
  CO.filter(o => o.kind === 'trace' && o.shot === s.id && t >= o.t).forEach(o => {
    const pts = o.path.map(q => map.map(q[0], q[1])), k = E.inOutCubic(prog(t, o.t, o.t + 1.1));
    let len = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.setLineDash([2, 18]); c.lineDashOffset = -t * 40;
    c.strokeStyle = 'rgba(246,239,227,.95)'; c.lineWidth = 7; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    let rem = len * k, end = pts[0];
    for (let i = 1; i < pts.length && rem > 0; i++) {
      const f = Math.min(1, rem / seg[i - 1]); end = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      c.lineTo(end[0], end[1]); rem -= seg[i - 1];
    }
    c.stroke(); c.setLineDash([]);
    if (k > .05) {                       // arrow head
      const a0 = pts[pts.length - 2], ang = Math.atan2(end[1] - a0[1], end[0] - a0[0]);
      c.fillStyle = COL.cream; c.beginPath(); c.moveTo(end[0] + Math.cos(ang) * 16, end[1] + Math.sin(ang) * 16);
      c.lineTo(end[0] + Math.cos(ang + 2.5) * 16, end[1] + Math.sin(ang + 2.5) * 16); c.lineTo(end[0] + Math.cos(ang - 2.5) * 16, end[1] + Math.sin(ang - 2.5) * 16); c.fill();
    }
    c.restore();
  });
}

// ───────── text column ─────────
function maskedLine(c, str, x, y, font, color, t, t0, sp = 0, dur = .6) {
  const p = E.outExpo(prog(t, t0, t0 + dur)); if (p <= 0) return;
  mctx.font = font; const asc = parseInt(font.match(/(\d+)px/)[1], 10);
  c.save(); c.beginPath(); c.rect(x - 10, y - asc * 1.05, 1900, asc * 1.35); c.clip();
  drawText(c, str, x, y + (1 - p) * asc * 1.2, font, color, 'left', sp); c.restore();
}
function columnHead(c, t, ch) {
  const x = colX(ch.side), a = prog(t, ch.t + .25, ch.t + .7);
  c.save(); c.globalAlpha = a;
  drawText(c, TL.tag, x, 118, '400 17px Mono', rgba(COL.cream, .55), 'left', 3);
  // chapter progress: one segment per cooking chapter
  const cook = CH.filter(k => k.n >= 1 && k.n <= 6), gap = 8, sw = (COLW - gap * (cook.length - 1)) / cook.length;
  cook.forEach((k, j) => {
    const nx = CH[CH.indexOf(k) + 1], f = prog(t, k.t, nx ? nx.t : DUR);
    c.fillStyle = 'rgba(246,239,227,.2)'; c.fillRect(x + j * (sw + gap), 140, sw, 4);
    if (f > 0) { c.fillStyle = k === ch ? ch.color : rgba(COL.cream, .85); c.fillRect(x + j * (sw + gap), 140, sw * f, 4); }
  });
  drawText(c, `${String(ch.n).padStart(2, '0')}  ·  ${ch.title.toUpperCase()}`, x, 196, '700 21px Mono', ch.color, 'left', 3);
  c.restore();
  maskedLine(c, ch.h1, x - 4, 300, '600 96px Fraunces', COL.cream, t, ch.t + .35);
  maskedLine(c, ch.h2, x - 4, 396, 'italic 400 96px Fraunces', ch.color, t, ch.t + .5);
}

// callouts: each has t (in) and t1 (out); callouts sharing t1 stack in order of t
const ZONE = 470;
const HGT = { heat: 92, timer: 156, tip: 98, note: 62, big: 150, chips: 74, balls: 190, measure: 180, gauge: 0, trace: 0, board: 0, stack: 0 };
function heightOf(o) {
  if (o.kind === 'list') return o.rows.length * 66 + 12;
  if (o.kind === 'tip') return wrapPlain(o.text, 'italic 600 50px Fraunces', COLW - 110).length > 1 ? 156 : 98;
  if (o.kind === 'chips') return 74;
  return HGT[o.kind] ?? 90;
}
function callouts(c, t, ch, x0 = colX(ch.side), zone = ZONE) {
  const live = CO.filter(o => t >= o.t - .05 && t < (o.t1 ?? DUR) + .35 && o.t >= ch.t - .01 && o.kind !== 'trace');
  const groups = {};
  live.forEach(o => (groups[o.t1] = groups[o.t1] || []).push(o));
  Object.values(groups).forEach(g => {
    let y = zone;
    g.sort((a, b) => a.t - b.t).forEach(o => {
      if (o.kind === 'gauge') return;
      const out = prog(t, o.t1 - .25, o.t1 + .05);
      c.save(); c.globalAlpha = 1 - out; c.translate(0, -out * 24);
      DRAW[o.kind] && DRAW[o.kind](c, o, t, x0, y, ch);
      c.restore();
      y += heightOf(o) + 14;
    });
  });
  const gauge = live.find(o => o.kind === 'gauge');
  if (gauge) { c.save(); c.globalAlpha = 1 - prog(t, gauge.t1 - .25, gauge.t1 + .05); DRAW.gauge(c, gauge, t, x0, 846, ch); c.restore(); }
}
const inAnim = (t, t0, d = .45) => E.outCubic(prog(t, t0, t0 + d));
function slideIn(c, t, t0, fn) {
  const p = inAnim(t, t0); if (p <= 0) return;
  c.save(); c.globalAlpha *= p; c.translate((1 - p) * -36, 0); fn(p); c.restore();
}
function icon(c, kind, x, y, r, col) {
  c.save(); c.translate(x, y);
  c.fillStyle = kind === 'x' ? '#C8412B' : col; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.strokeStyle = kind === 'x' ? COL.cream : COL.dark; c.fillStyle = c.strokeStyle; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
  const k = r / 32;
  c.scale(k, k); c.beginPath();
  switch (kind) {
    case 'x': c.moveTo(-11, -11); c.lineTo(11, 11); c.moveTo(11, -11); c.lineTo(-11, 11); c.stroke(); break;
    case 'check': c.moveTo(-12, 1); c.lineTo(-3, 10); c.lineTo(13, -9); c.stroke(); break;
    case 'drop': c.moveTo(0, -15); c.bezierCurveTo(10, -2, 12, 4, 12, 7); c.arc(0, 7, 12, 0, Math.PI); c.bezierCurveTo(-12, 4, -10, -2, 0, -15); c.fill(); break;
    case 'spark': for (let a = 0; a < 4; a++) { c.moveTo(0, 0); c.lineTo(Math.cos(a * Math.PI / 2) * 15, Math.sin(a * Math.PI / 2) * 15); } c.stroke(); c.lineWidth = 3; c.beginPath(); for (let a = 0; a < 4; a++) { const q = a * Math.PI / 2 + Math.PI / 4; c.moveTo(0, 0); c.lineTo(Math.cos(q) * 9, Math.sin(q) * 9); } c.stroke(); break;
    case 'hand': c.arc(0, 2, 11, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(-6, -6); c.lineTo(-6, -15); c.moveTo(0, -8); c.lineTo(0, -17); c.moveTo(6, -6); c.lineTo(6, -15); c.stroke(); break;
    case 'press': c.moveTo(-14, -12); c.lineTo(14, -12); c.moveTo(0, -18); c.lineTo(0, -4); c.moveTo(-6, -9); c.lineTo(0, -3); c.lineTo(6, -9); c.stroke(); c.beginPath(); c.roundRect(-15, 3, 30, 10, 5); c.fill(); break;
    case 'bread': c.moveTo(-15, 8); c.lineTo(-15, -2); c.bezierCurveTo(-15, -16, 15, -16, 15, -2); c.lineTo(15, 8); c.closePath(); c.stroke(); break;
    case 'fire': c.moveTo(0, -16); c.bezierCurveTo(10, -6, 13, 2, 11, 8); c.bezierCurveTo(9, 15, -9, 15, -11, 8); c.bezierCurveTo(-13, 1, -6, -2, -4, -8); c.bezierCurveTo(-2, -3, 2, -2, 0, -16); c.fill(); break;
  }
  c.restore();
}
const DRAW = {
  tip(c, o, t, x, y, ch) {
    slideIn(c, t, o.t, p => {
      const pop = E.outBack(prog(t, o.t, o.t + .4), 2.4);
      c.save(); c.translate(x + 34, y + 40); c.scale(pop, pop); icon(c, o.icon, 0, 0, 32, ch.color); c.restore();
      const lines = wrapPlain(o.text, 'italic 600 50px Fraunces', COLW - 110);
      lines.forEach((ln, k) => drawText(c, ln, x + 92, y + 56 + k * 58, 'italic 600 50px Fraunces', COL.cream));
    });
  },
  note(c, o, t, x, y, ch) {
    slideIn(c, t, o.t, () => {
      c.fillStyle = ch.color; c.fillRect(x, y + 8, 4, 40);
      drawText(c, o.text, x + 22, y + 40, '500 32px Grotesk', rgba(COL.cream, .85));
    });
  },
  big(c, o, t, x, y, ch) {
    const lines = o.text.split('\n').flatMap(p => wrapPlain(p, 'italic 600 104px Fraunces', COLW));
    lines.forEach((ln, k) => maskedLine(c, ln, x - 4, y + 104 + k * 110, 'italic 600 104px Fraunces', ch.color, t, o.t + k * .12, 0, .7));
  },
  chips(c, o, t, x, y, ch) {
    let cx = x;
    const font = '500 30px Grotesk';
    o.items.forEach(([txt, ti], k) => {
      mctx.font = font; const w = mctx.measureText(txt).width + 46;
      const p = E.outBack(prog(t, ti, ti + .35), 2.2);
      if (p > 0) {
        c.save(); c.translate(cx + w / 2, y + 30); c.scale(p, p);
        const first = k === 0 && o.items.length > 1 || o.items.length === 1;
        c.fillStyle = first ? ch.color : 'rgba(246,239,227,.12)'; c.strokeStyle = first ? ch.color : 'rgba(246,239,227,.4)'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(-w / 2, -29, w, 58, 29); c.fill(); c.stroke();
        drawText(c, txt, 0, 10, font, first ? COL.dark : COL.cream, 'center');
        c.restore();
      }
      cx += w + 12;
    });
  },
  heat(c, o, t, x, y, ch) {
    slideIn(c, t, o.t, () => {
      for (let k = 0; k < 4; k++) {
        const on = k < o.level, fill = E.outCubic(prog(t, o.t + .15 + k * .09, o.t + .5 + k * .09));
        const hh = 26 + k * 14, fl = on ? 1 + noise1(t * 7 + k * 3.1, k) * .08 : 1;
        c.fillStyle = 'rgba(246,239,227,.14)'; c.beginPath(); c.roundRect(x + k * 30, y + 74 - hh, 20, hh, 6); c.fill();
        if (on && fill > 0) {
          const g = c.createLinearGradient(0, y + 74 - hh, 0, y + 74); g.addColorStop(0, '#F7C35A'); g.addColorStop(1, '#D9442B');
          c.fillStyle = g; c.beginPath(); c.roundRect(x + k * 30, y + 74 - hh * fill * fl, 20, hh * fill * fl, 6); c.fill();
        }
      }
      drawText(c, o.label, x + 146, y + 50, '700 38px Grotesk', COL.cream);
      drawText(c, 'FUEGO', x + 148, y + 80, '700 16px Mono', rgba(COL.cream, .5), 'left', 4);
    });
  },
  timer(c, o, t, x, y, ch) {
    slideIn(c, t, o.t, () => {
      const cx = x + 72, cy = y + 74, R = 62, f = E.inOutCubic(prog(t, o.t + .15, o.t + 1.7));
      const col = o.cold ? '#A9D8EA' : ch.color;
      c.fillStyle = 'rgba(12,8,5,.55)'; c.beginPath(); c.arc(cx, cy, R + 12, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(246,239,227,.16)'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
      c.lineCap = 'round'; c.strokeStyle = col;
      if (o.plus) {                       // two phases: 2 min, flip, 1 more
        const tot = o.value + o.plus, a1 = o.value / tot, g1 = Math.min(f, a1), g2 = Math.max(0, f - a1);
        c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * g1 - .06); c.stroke();
        if (g2 > 0) { c.strokeStyle = COL.cream; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2 + TAU * a1 + .06, -Math.PI / 2 + TAU * (a1 + g2)); c.stroke(); }
      } else { c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(.001, f)); c.stroke(); }
      c.lineCap = 'butt';
      // digits: minutes count up (seconds tick for short timers)
      const Tm = o.value + (o.plus || 0), v = f * Tm;
      let big = o.approx ? `≈${Math.round(v)}` : Tm <= 5 ? `${Math.floor(v)}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}` : String(Math.round(v));
      if (o.plus && f >= 1) big = `${o.value}+${o.plus}`;
      const tf = Tm <= 5 && !o.plus ? '600 40px Grotesk' : 'italic 600 50px Fraunces';
      drawText(c, big, cx, cy + (Tm <= 5 && !o.plus ? 12 : 16), tf, COL.cream, 'center');
      drawText(c, o.unit.toUpperCase(), cx, cy + 42, '700 14px Mono', rgba(COL.cream, .6), 'center', 3);
      const label = o.plus ? `${o.value} min, voltea y ${o.plus} más` : `${o.approx ? 'unos ' : ''}${o.value} ${o.value === 1 ? 'minuto' : 'minutos'}`;
      drawText(c, label, x + 172, y + 66, '700 42px Grotesk', COL.cream);
      drawText(c, o.label, x + 172, y + 106, '500 28px Grotesk', rgba(COL.cream, .72));
      if (o.sides) {                      // "× 2 lados" badge with a flip arrow
        const bx = x + 172, by = y + 120, p = E.outBack(prog(t, o.t + .9, o.t + 1.3), 2);
        if (p > 0) { c.save(); c.translate(bx, by); c.scale(p, p); c.fillStyle = col; c.beginPath(); c.roundRect(0, 0, 150, 34, 17); c.fill(); drawText(c, '↻  2 LADOS', 75, 24, '700 17px Mono', COL.dark, 'center', 2); c.restore(); }
      }
      if (o.cold) {                       // snowflake
        c.save(); c.translate(cx + 56, cy - 56); c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
        for (let a = 0; a < 3; a++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-14, 0); c.lineTo(14, 0); c.stroke(); }
        c.restore();
      }
    });
  },
  list(c, o, t, x, y, ch) {
    o.rows.forEach(([q, unit, label, ti], k) => {
      const ry = y + k * 66, p = inAnim(t, ti);
      if (p <= 0) return;
      c.save(); c.globalAlpha *= p; c.translate((1 - p) * -30, 0);
      const qs = typeof q === 'number' ? String(Math.round(q * E.outExpo(prog(t, ti, ti + .6)))) : q;
      drawText(c, qs, x + 96, ry + 50, 'italic 600 48px Fraunces', COL.saffron, 'right');
      drawText(c, unit, x + 110, ry + 50, '700 26px Grotesk', COL.saffron);
      drawText(c, label, x + 200, ry + 49, '500 34px Grotesk', COL.cream);
      c.fillStyle = 'rgba(246,239,227,.14)'; c.fillRect(x, ry + 64, COLW * E.outCubic(prog(t, ti, ti + .6)), 1);
      c.restore();
    });
  },
  board(c, o, t, x, y, ch) {
    const cw = (COLW - 40) / 3;
    o.groups.forEach(([gid, name], gi) => {
      const gx = x + gi * (cw + 20), items = o.items.filter(it => it.g === gid);
      const ga = prog(t, items[0].t - .5, items[0].t);
      if (ga <= 0) return;
      c.save(); c.globalAlpha *= ga;
      drawText(c, name.toUpperCase(), gx, y + 18, '700 18px Mono', gi === 0 ? COL.saffron : gi === 1 ? '#E0694C' : '#C9D98A', 'left', 4);
      c.fillStyle = 'rgba(246,239,227,.25)'; c.fillRect(gx, y + 34, cw * E.outCubic(ga), 2);
      c.restore();
      items.forEach((it, k) => {
        const iy = y + 50 + k * 96, p = inAnim(t, it.t); if (p <= 0) return;
        const n = o.items.indexOf(it) + 1;
        c.save(); c.globalAlpha *= p; c.translate((1 - p) * -24, 0);
        const pop = E.outBack(prog(t, it.t, it.t + .35), 2.6);
        c.save(); c.translate(gx + 14, iy + 30); c.scale(pop, pop);
        c.fillStyle = ch.color; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); drawText(c, String(n), 0, 6, '700 16px Grotesk', COL.dark, 'center'); c.restore();
        const val = it.v == null ? '' : String(Math.round(it.v * E.outExpo(prog(t, it.t, it.t + .7))));
        drawText(c, val, gx + 40, iy + 46, 'italic 600 48px Fraunces', COL.cream);
        if (val) drawText(c, it.unit, gx + 44 + textW(val, 'italic 600 48px Fraunces'), iy + 46, '700 24px Grotesk', ch.color);
        drawText(c, it.label, gx + 40, iy + (val ? 80 : 46), val ? '500 24px Grotesk' : 'italic 600 40px Fraunces', rgba(COL.cream, val ? .78 : 1));
        c.restore();
      });
    });
  },
  gauge(c, o, t, x, y, ch) {
    const p = inAnim(t, o.t); if (p <= 0) return;
    c.save(); c.globalAlpha *= p;
    const bw = COLW - 20, n = o.stops.length;
    const g = c.createLinearGradient(x, 0, x + bw, 0); o.colors.forEach((cl, k) => g.addColorStop(k / (o.colors.length - 1), cl));
    c.fillStyle = g; c.beginPath(); c.roundRect(x, y, bw, 12, 6); c.fill();
    // position follows the stops' times
    let pos = 0;
    for (let k = 0; k < n; k++) { const t0 = o.stops[k][0], t1 = k + 1 < n ? o.stops[k + 1][0] : o.at[1]; if (t >= t0) pos = (k + prog(t, t0, t1) * (k + 1 < n ? 1 : 0)) / (n - 1); }
    pos = clamp(pos * E.outCubic(prog(t, o.t, o.t + .8)));
    const cur = Math.min(n - 1, Math.round(pos * (n - 1) - .49 + .5));
    o.stops.forEach(([, name], k) => {
      const nx = x + bw * k / (n - 1), on = k === Math.min(n - 1, Math.floor(pos * (n - 1) + .02));
      drawText(c, name, nx, y + 42, on ? '700 22px Grotesk' : '500 22px Grotesk', on ? ch.color : rgba(COL.cream, .5), k === 0 ? 'left' : k === n - 1 ? 'right' : 'center');
    });
    const dx = x + bw * pos;
    c.fillStyle = COL.cream; c.beginPath(); c.arc(dx, y + 6, 15, 0, TAU); c.fill();
    c.fillStyle = COL.dark; c.beginPath(); c.arc(dx, y + 6, 6, 0, TAU); c.fill();
    if (pos > .985) drawText(c, '✓', dx + 26, y + 14, '700 24px Grotesk', ch.color);
    c.restore(); void cur;
  },
  balls(c, o, t, x, y, ch) {
    for (let k = 0; k < o.n; k++) {
      const ti = o.t + k * .28, p = E.outBack(prog(t, ti, ti + .45), 2.2); if (p <= 0) continue;
      const cx = x + 70 + k * 150, cy = y + 76;
      c.save(); c.translate(cx, cy); c.scale(p, p);
      const g = c.createRadialGradient(-18, -20, 6, 0, 0, 60); g.addColorStop(0, '#E7998A'); g.addColorStop(.6, '#B5584A'); g.addColorStop(1, '#7A2F26');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.fill();
      const r = rng(k + 3); c.fillStyle = 'rgba(255,225,215,.35)';
      for (let d = 0; d < 26; d++) { const a = r() * TAU, rr = Math.sqrt(r()) * 48; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr, 2 + r() * 3, 0, TAU); c.fill(); }
      c.restore();
      c.globalAlpha *= prog(t, ti + .2, ti + .5);
      drawText(c, o.each, cx, y + 170, '700 26px Grotesk', COL.cream, 'center');
      c.globalAlpha = 1;
    }
    const a = prog(t, o.t + 1.2, o.t + 1.6);
    if (a > 0) { c.save(); c.globalAlpha *= a; drawText(c, `= ${o.n} bolas`, x + 640, y + 88, 'italic 600 56px Fraunces', ch.color); c.restore(); }
  },
  measure(c, o, t, x, y, ch) {
    slideIn(c, t, o.t, () => {
      const sq = E.inOutCubic(prog(t, o.t + .2, o.t + .9)), hgt = lerp(92, 30, sq), wdt = lerp(150, 260, sq);
      const bx = x + 40, base = y + 150;
      c.fillStyle = COL.dark; c.globalAlpha *= .6; c.fillRect(bx - 30, base, 360, 8); c.globalAlpha /= .6;
      const g = c.createLinearGradient(0, base - hgt, 0, base); g.addColorStop(0, '#C66E5E'); g.addColorStop(1, '#8C3B2F');
      c.fillStyle = g; c.beginPath(); c.roundRect(bx + (260 - wdt) / 2, base - hgt, wdt, hgt, hgt / 2.4); c.fill();
      // spatula coming down
      c.fillStyle = '#C9CCCF'; c.fillRect(bx + 10, base - hgt - 14, 240, 10);
      // dimension line
      const lx = bx + 300; c.strokeStyle = ch.color; c.lineWidth = 3;
      c.beginPath(); c.moveTo(lx, base - hgt); c.lineTo(lx, base); c.moveTo(lx - 10, base - hgt); c.lineTo(lx + 10, base - hgt); c.moveTo(lx - 10, base); c.lineTo(lx + 10, base); c.stroke();
      c.globalAlpha *= prog(t, o.t + .8, o.t + 1.1);
      drawText(c, o.text, lx + 28, base - 4, 'italic 600 72px Fraunces', ch.color);
    });
  },
  stack(c, o, t, x, y, ch) {
    // the burger builds from the bottom; labels sit in their own evenly spaced column with leader lines
    const cx = x + 230, base = y + 400, wd = 400, H_ = [62, 22, 66, 32, 38, 34];
    let yy = base;
    const lx = cx + wd / 2 + 110, n = o.layers.length;
    o.layers.forEach(([name, col, ti], k) => {
      const hh = H_[k] || 30, p = prog(t, ti, ti + .5), drop = E.outBack(p, 1.6), ly0 = yy - hh;
      yy -= hh;
      if (p <= 0) return;
      const ly = ly0 - (1 - drop) * 220;
      c.save(); c.globalAlpha *= Math.min(1, p * 3); c.fillStyle = col;
      if (k === 0) { c.beginPath(); c.roundRect(cx - wd / 2, ly, wd, hh, [8, 8, 30, 30]); c.fill(); }
      else if (name.startsWith('salsa')) { c.beginPath(); c.moveTo(cx - wd / 2 + 6, ly + hh); for (let q = 0; q <= 14; q++) c.lineTo(cx - wd / 2 + 6 + q * (wd - 12) / 14, ly + (q % 2 ? 0 : hh * .55)); c.lineTo(cx + wd / 2 - 6, ly + hh); c.fill(); }
      else if (name.startsWith('plátano')) { for (let q = 0; q < 4; q++) { c.beginPath(); c.ellipse(cx - wd / 2 + 52 + q * 99, ly + hh / 2, 52, hh / 2, 0, 0, TAU); c.fill(); } }
      else if (name === 'hogao') { for (let q = 0; q < 7; q++) { c.beginPath(); c.arc(cx - 150 + q * 50 + Math.sin(q) * 8, ly + hh * .75, 24 + (q % 2) * 6, Math.PI, 0); c.fill(); } c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(cx - 60, ly + 8, 5, 0, TAU); c.fill(); }
      else if (name === 'carne') { c.beginPath(); c.roundRect(cx - wd / 2 - 10, ly, wd + 20, hh, 22); c.fill(); const r = rng(9); c.fillStyle = 'rgba(0,0,0,.25)'; for (let d = 0; d < 40; d++) { c.beginPath(); c.arc(cx - wd / 2 + r() * wd, ly + 8 + r() * (hh - 16), 2 + r() * 3, 0, TAU); c.fill(); } }
      else if (name.startsWith('queso')) { c.beginPath(); c.roundRect(cx - wd / 2 + 10, ly, wd - 20, hh, 6); c.fill(); const r = rng(4); c.fillStyle = 'rgba(120,70,20,.5)'; for (let d = 0; d < 22; d++) { c.beginPath(); c.arc(cx - wd / 2 + 20 + r() * (wd - 40), ly + 5 + r() * (hh - 10), 2 + r() * 3, 0, TAU); c.fill(); } }
      else { c.beginPath(); c.roundRect(cx - wd / 2, ly, wd, hh, 10); c.fill(); }
      c.restore();
      const la = prog(t, ti + .2, ti + .5);
      if (la > 0) {
        const ty = base - 20 - k * 58, my = ly0 + hh / 2;
        c.save(); c.globalAlpha *= la;
        c.strokeStyle = 'rgba(246,239,227,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + wd / 2 + 16, my); c.lineTo(lx - 30, ty); c.lineTo(lx - 14, ty); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(lx, ty, 8, 0, TAU); c.fill();
        drawText(c, name, lx + 20, ty + 11, '500 32px Grotesk', COL.cream);
        c.restore();
      }
    });
    void n;
    const tb = o.layers[o.layers.length - 1][2] + 1.2, p = prog(t, tb, tb + .5);
    if (p > 0) {
      const ly = yy - 96 - (1 - E.outBack(p, 1.6)) * 220;
      c.save(); c.globalAlpha *= Math.min(1, p * 3); c.fillStyle = '#D9A15C';
      c.beginPath(); c.moveTo(cx - wd / 2, ly + 92); c.bezierCurveTo(cx - wd / 2, ly - 16, cx + wd / 2, ly - 16, cx + wd / 2, ly + 92); c.closePath(); c.fill();
      c.fillStyle = '#F6EAD0'; const r = rng(2); for (let d = 0; d < 18; d++) { c.beginPath(); c.ellipse(cx - 150 + r() * 300, ly + 18 + r() * 50, 6, 3, r() * 3, 0, TAU); c.fill(); }
      c.restore();
    }
  },
};

// ───────── subtitles ─────────
function subtitles(c, t, x, maxW, bottom, color) {
  const cue = CUES.find(q => t >= q[0] - .02 && t < q[1] + .12); if (!cue) return;
  const a = prog(t, cue[0] - .02, cue[0] + .16) * (1 - prog(t, cue[1], cue[1] + .12));
  const lines = wrapWords(rich(cue[2]), '500 38px Grotesk', maxW), lh = 50, top = bottom - lines.length * lh;
  c.save(); c.globalAlpha = a; c.translate(0, (1 - E.outCubic(prog(t, cue[0] - .02, cue[0] + .2))) * 12);
  c.fillStyle = color; c.fillRect(x - 26, top + 12, 4, lines.length * lh - 10);
  c.font = '500 38px Grotesk'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const sp = c.measureText(' ').width;
  lines.forEach((ln, k) => {
    let cx = x;
    ln.forEach(wd => {
      wd.parts.forEach(pt => { c.fillStyle = pt.hi ? COL.saffron : COL.cream; c.fillText(pt.s, cx, top + lh * (k + 1) - 10); cx += c.measureText(pt.s).width; });
      cx += sp;
    });
  });
  c.restore();
}

// ───────── hook: three dealt cards (0 → S03) ─────────
const HOOK = [
  { cx: 1236, cy: 572, rot: -7, before: { src: 'N15', a: 0, rate: .6, z: 1.04, f: [.5, .52] }, after: null, word: 0 },
  { cx: 1452, cy: 548, rot: 0, before: { src: 'C6', a: 0, rate: .89, z: 1.02, f: [.5, .5] }, after: { src: 'C3', a: 2.2, rate: 1, z: 2.0, f: [.75, .6] }, word: 1 },
  { cx: 1668, cy: 572, rot: 7, before: { src: 'C3', a: 0, rate: .89, z: 1.0, f: [.5, .55] }, after: { src: 'N08', a: 3.2, rate: 1, z: 1.12, f: [.46, .62] }, word: 2 },
];
const HOOK_ROWS = [['hogao caramelizado', 3.3, '#D9573B', 0], ['queso costeño frito', 4.5, '#EFE3C2', 2], ['plátano maduro', 6.6, '#F2B544', 2], ['salsa de suero', 7.6, '#A9C44E', 1]];
const HOOK_WORDS = [['Dulce', 9.1, '#F2B544', 'plátano + hogao'], ['Salado', 9.9, '#EFE3C2', 'queso costeño'], ['Ácido', 10.7, '#A9C44E', 'suero + limón']];
const RESWAP = 9.0;
function hookFocus(t) {
  if (t >= RESWAP) { let f = -1; HOOK_WORDS.forEach((w, k) => { if (t >= w[1]) f = k; }); return t > 11.3 ? -2 : f; }
  let f = -1; HOOK_ROWS.forEach(r => { if (t >= r[1]) f = r[3]; }); return t > 8.4 ? -2 : f;
}
function hookCard(c, t, k, focus) {
  const d = HOOK[k], w = 428, h = 760, r = 24;
  const ent = prog(t, .15 + k * .14, 1.05 + k * .14), e = E.outBack(ent, 1.1);
  const exit = E.inCubic(prog(t, 12.15, 12.6));
  const lift = focus === k ? 1 : 0, dim = focus >= 0 && focus !== k ? 1 : 0;
  const fl = Math.sin(t * .8 + k * 2) * 5;
  // flip at the re-deal (cards with new content)
  const flipP = d.after ? prog(t, RESWAP - .2 + k * .08, RESWAP + .2 + k * .08) : 0;
  const sx = Math.abs(Math.cos(flipP * Math.PI)) || .001;
  const spec = d.after && flipP >= .5 ? d.after : d.before, st = d.after && flipP >= .5 ? RESWAP : 0;
  c.save();
  c.translate(d.cx + (1 - e) * 500 + exit * (k - 1) * 120, d.cy + (1 - e) * 700 + fl - lift * 14 + exit * 900);
  c.rotate((d.rot + (1 - e) * (k - 1) * 18 - lift * d.rot * .5) * Math.PI / 180);
  const s = (1 + lift * .05) * sx; c.scale(s, 1 + lift * .05);
  c.translate(-w / 2, -h / 2);
  c.globalAlpha = Math.min(1, ent * 4);
  shadowCard(c, 0, 0, w, h, r);
  c.save(); roundClip(c, 0, 0, w, h, r);
  const smp = sample(spec.src, spec.a + (t - st) * spec.rate);
  cover(c, smp, 0, 0, w, h, spec.z, spec.f[0], spec.f[1]);
  if (dim) { c.fillStyle = 'rgba(14,10,7,.45)'; c.fillRect(0, 0, w, h); }
  c.restore();
  cardFrame(c, 0, 0, w, h, r);
  c.restore();
}
function hook(c, t) {
  const smp = sample('C6', t * .89);
  background(c, smp, { z: 1.1, fx: .5, fy: .5 }, t, CH[0], .9);
  const focus = hookFocus(t), order = [0, 2, 1];
  if (focus >= 0) { order.splice(order.indexOf(focus), 1); order.push(focus); }
  order.forEach(k => hookCard(c, t, k, focus));
  const x = 150, fadeA = 1 - prog(t, RESWAP - .4, RESWAP - .05);
  if (fadeA > 0) {
    c.save(); c.globalAlpha = fadeA;
    c.globalAlpha *= prog(t, .3, .8); drawText(c, TL.tag, x, 250, '400 18px Mono', rgba(COL.cream, .6), 'left', 3); c.globalAlpha = fadeA;
    maskedLine(c, 'Hamburguesa', x - 6, 400, '600 112px Fraunces', COL.cream, t, .45, 0, .8);
    maskedLine(c, 'costeña', x - 6, 540, 'italic 600 140px Fraunces', COL.saffron, t, .7, 0, .8);
    HOOK_ROWS.forEach(([txt, ti, col], k) => {
      const p = inAnim(t, ti); if (p <= 0) return;
      c.save(); c.globalAlpha *= p; c.translate((1 - p) * -30, 0);
      c.fillStyle = col; c.beginPath(); c.arc(x + 12, 634 + k * 60, 9, 0, TAU); c.fill();
      drawText(c, txt, x + 40, 648 + k * 60, '500 40px Grotesk', COL.cream);
      c.restore();
    });
    c.restore();
  }
  if (t >= RESWAP - .2) {
    const out = prog(t, 12.2, 12.55);
    c.save(); c.globalAlpha = 1 - out;
    HOOK_WORDS.forEach(([word, ti, col, cap], k) => {
      const y = 300 + k * 206;
      maskedLine(c, word, x - 6, y, 'italic 600 150px Fraunces', col, t, ti, 0, .55);
      const a = prog(t, ti + .25, ti + .6);
      if (a > 0) { c.save(); c.globalAlpha *= a; drawText(c, cap.toUpperCase(), x + 6, y + 50, '700 20px Mono', rgba(COL.cream, .65), 'left', 4); c.restore(); }
    });
    const a = prog(t, 11.2, 11.6);
    if (a > 0) { c.save(); c.globalAlpha *= a; drawText(c, 'EN CADA MORDISCO', x, 866, '700 30px Grotesk', COL.cream, 'left', 8); c.restore(); }
    c.restore();
  }
  subtitles(c, t, x + 26, 820, 1010, COL.saffron);
}

// ───────── end screen (S29) ─────────
function endScreen(c, t, ch) {
  const s = SHOTS[SHOTS.length - 1], t0 = s.t0, u = t - t0;
  const smp = shotSample(s, t);
  background(c, smp, { z: 1.1, fx: .5, fy: .5 }, t, ch, .9);
  // card glides from the armado position (left) into the end-screen slot
  const m = E.inOutCubic(prog(t, t0 - .1, t0 + .9));
  const w = lerp(CARD.w, 440, m), h = lerp(CARD.h, 782, m), x = lerp(cardX('L'), 170, m), y = lerp(CARD.y, 150, m);
  c.save(); c.translate(x + w / 2, y + h / 2 + Math.sin(t * .6) * 4); c.rotate(lerp(0, -2.5, m) * Math.PI / 180); c.translate(-w / 2, -h / 2);
  shadowCard(c, 0, 0, w, h, 26);
  c.save(); roundClip(c, 0, 0, w, h, 26); cover(c, smp, 0, 0, w, h, 1.04, .5, .5); c.restore();
  cardFrame(c, 0, 0, w, h, 26); c.restore();
  const x0 = 760;
  maskedLine(c, '¡Buen provecho!', x0 - 6, 250, 'italic 600 118px Fraunces', COL.saffron, t, t0 + .35, 0, .8);
  // subscribe pill: pops, gets "clicked", turns into Suscrito
  const pp = E.outBack(prog(u, .5, .9), 2), clicked = u > 1.55;
  if (pp > 0) {
    const press = 1 - .08 * Math.sin(Math.PI * prog(u, 1.4, 1.7));
    c.save(); c.translate(x0 + 175, 360); c.scale(pp * press, pp * press);
    c.fillStyle = clicked ? 'rgba(246,239,227,.14)' : COL.saffron; c.strokeStyle = clicked ? 'rgba(246,239,227,.5)' : COL.saffron; c.lineWidth = 2;
    c.beginPath(); c.roundRect(-175, -42, 350, 84, 42); c.fill(); c.stroke();
    drawText(c, clicked ? 'SUSCRITO  ✓' : 'SUSCRÍBETE', 22, 12, '700 30px Grotesk', clicked ? COL.cream : COL.dark, 'center', 3);
    // bell (rings after the click)
    const ring = clicked ? Math.sin(u * 28) * Math.exp(-(u - 1.55) * 3) * .5 : 0;
    c.save(); c.translate(-118, -2); c.rotate(ring); c.fillStyle = clicked ? COL.saffron : COL.dark;
    c.beginPath(); c.moveTo(-14, 10); c.lineTo(14, 10); c.lineTo(10, 4); c.bezierCurveTo(10, -18, -10, -18, -10, 4); c.closePath(); c.fill(); c.beginPath(); c.arc(0, 14, 4, 0, TAU); c.fill();
    c.restore(); c.restore();
    // pointer
    const cp = prog(u, .9, 1.45), cur = [lerp(x0 + 520, x0 + 250, E.inOutCubic(cp)), lerp(560, 378, E.inOutCubic(cp))];
    const ca = prog(u, .9, 1.1) * (1 - prog(u, 2.2, 2.6));
    if (ca > 0) { c.save(); c.globalAlpha = ca; c.translate(cur[0], cur[1]); c.fillStyle = COL.cream; c.strokeStyle = COL.dark; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 34); c.lineTo(9, 26); c.lineTo(16, 41); c.lineTo(22, 38); c.lineTo(15, 23); c.lineTo(27, 23); c.closePath(); c.fill(); c.stroke(); c.restore(); }
  }
  // next video slot (place YouTube's video element here) + comments prompt
  const fa = prog(u, 1.8, 2.3);
  if (fa > 0) {
    c.save(); c.globalAlpha = fa;
    drawText(c, 'PRÓXIMO VIDEO', x0, 486, '700 18px Mono', rgba(COL.cream, .6), 'left', 5);
    c.setLineDash([10, 10]); c.lineDashOffset = -t * 20; c.strokeStyle = 'rgba(246,239,227,.45)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(x0, 506, 640, 360, 18); c.stroke(); c.setLineDash([]);
    c.restore();
  }
  const ba = prog(u, 3.4, 3.9);
  if (ba > 0) {
    c.save(); c.globalAlpha = ba; const bx = 1440, by = 560;
    c.fillStyle = 'rgba(246,239,227,.1)'; c.strokeStyle = 'rgba(246,239,227,.35)'; c.lineWidth = 2;
    c.beginPath(); c.roundRect(bx, by, 330, 150, 22); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(bx + 40, by + 150); c.lineTo(bx + 30, by + 182); c.lineTo(bx + 76, by + 150); c.fillStyle = 'rgba(246,239,227,.1)'; c.fill();
    drawText(c, '¿Otra versión?', bx + 28, by + 60, 'italic 600 40px Fraunces', COL.saffron);
    drawText(c, 'Cuéntamelo en', bx + 28, by + 100, '500 26px Grotesk', COL.cream);
    drawText(c, 'los comentarios', bx + 28, by + 132, '500 26px Grotesk', COL.cream);
    for (let k = 0; k < 3; k++) { const b = .5 + .5 * Math.sin(t * 6 - k * .8); c.fillStyle = rgba(COL.cream, .3 + .6 * b); c.beginPath(); c.arc(bx + 250 + k * 22, by + 118 - b * 4, 6, 0, TAU); c.fill(); }
    c.restore();
  }
  subtitles(c, t, x0 + 26, 1100, 1010, COL.saffron);
}

// ───────── chapter wipe: accent layer + dark layer with the chapter number and title ─────────
function wipe(c, t) {
  for (const ch of CH) {
    if (ch.n < 1 || ch.n > 6) continue;
    const c0 = ch.t, a = t - c0; if (a < -.5 || a > .95) continue;
    const dir = ch.side === 'L' ? -1 : 1;          // panels travel towards the card's new side
    const skew = .18 * W;
    const pos = (d) => {                              // −1 off-screen (entry side) → 0 covering → +1 off-screen (exit)
      const inP = E.inOutCubic(prog(a, -.5 + d, -.12 + d)), outP = E.inOutCubic(prog(a, .42 + d, .86 + d));
      return (1 - inP) * -1 + outP;
    };
    const layer = (d, fill, fn) => {
      const p = pos(d); if (p <= -1 || p >= 1) return;
      const off = p * (W + skew) * dir;
      c.save(); c.translate(off, 0);
      c.beginPath(); c.moveTo(-skew, 0); c.lineTo(W + skew, 0); c.lineTo(W, H); c.lineTo(-skew * 2, H); c.closePath();
      c.fillStyle = fill; c.fill(); if (fn) fn(); c.restore();
    };
    layer(0, ch.color);
    layer(.07, '#140E09', () => {
      const num = String(ch.n).padStart(2, '0');
      drawText(c, num, W / 2, H / 2 + 20, 'italic 600 300px Fraunces', ch.color, 'center');
      drawText(c, ch.title.toUpperCase(), W / 2, H / 2 + 120, '700 54px Grotesk', COL.cream, 'center', 10);
    });
  }
}
function wipeActive(t) { return CH.some(ch => ch.n >= 1 && ch.n <= 6 && t - ch.t > -.52 && t - ch.t < .96); }


// ───────── vertical Short (1080x1920): full-bleed footage, big word-by-word captions ─────────
// Shorts UI covers the bottom ~380 px and a column on the right: text stays in x 60–900, y 60–1500.
function vShade(c) {
  let g = c.createLinearGradient(0, 0, 0, 700); g.addColorStop(0, 'rgba(12,8,5,.78)'); g.addColorStop(1, 'rgba(12,8,5,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, 700);
  g = c.createLinearGradient(0, 1150, 0, H); g.addColorStop(0, 'rgba(12,8,5,0)'); g.addColorStop(1, 'rgba(12,8,5,.8)');
  c.fillStyle = g; c.fillRect(0, 1150, W, H - 1150);
}
function vHeader(c, t, ch, label = true) {
  const segs = CH.filter(k => k.side !== 'endshort'), gap = 8, x0 = 40, sw = (W - 80 - gap * (segs.length - 1)) / segs.length;
  segs.forEach((k, j) => {
    const nx = CH[CH.indexOf(k) + 1], f = prog(t, k.t, nx ? nx.t : DUR);
    c.fillStyle = 'rgba(246,239,227,.3)'; c.beginPath(); c.roundRect(x0 + j * (sw + gap), 56, sw, 6, 3); c.fill();
    if (f > 0) { c.fillStyle = COL.cream; c.beginPath(); c.roundRect(x0 + j * (sw + gap), 56, sw * f, 6, 3); c.fill(); }
  });
  drawText(c, TL.tag, 60, 124, '400 22px Mono', rgba(COL.cream, .7), 'left', 3);
  if (label && ch.side === 'V') maskedLine(c, ch.title.toUpperCase(), 58, 214, '700 64px Grotesk', ch.color, t, ch.t + .05, 6, .5);
}
function vMedia(c, t, i) {
  const s = SHOTS[i], prev = SHOTS[i - 1], win = s.tr === 'push' ? .22 : 0;
  const p = win && prev ? E.inOutCubic(prog(t, s.t0 - win, s.t0 + win)) : 1;
  let map = null;
  if (prev && p < 1) {
    const pc = camera(prev, t); c.save(); c.translate(0, -p * H);
    cover(c, shotSample(prev, t), 0, 0, W, H, pc.z, pc.fx, pc.fy, prev.shimmer, t); c.restore();
  }
  const cam = camera(s, t), punch = s.tr === 'cut' && s.t0 > 0 ? 1 - E.outCubic(prog(t, s.t0, s.t0 + .35)) : 0;
  c.save(); if (p < 1) c.translate(0, (1 - p) * H);
  c.translate(W / 2, H / 2); c.scale(1 + .14 * punch, 1 + .14 * punch); c.translate(-W / 2, -H / 2);
  map = cover(c, shotSample(s, t), 0, 0, W, H, cam.z, cam.fx, cam.fy, s.shimmer, t);
  c.restore();
  if (punch > 0) { c.fillStyle = `rgba(255,240,215,${.55 * punch * punch})`; c.fillRect(0, 0, W, H); }   // flash on the cut
  return map;
}
function vCaptions(c, t) {
  const cue = CUES.find(q => t >= q[0] - .05 && t < q[1] + .08); if (!cue) return;
  const words = rich(cue[2]), end = cue[3] ?? cue[1], tot = words.reduce((n, w) => n + w.w.length + 1, 0);
  let acc = 0;
  words.forEach(w => { w.t0 = cue[0] + (end - cue[0]) * acc / tot; acc += w.w.length + 1; w.t1 = cue[0] + (end - cue[0]) * acc / tot; });
  const chunks = []; let cur = [];
  words.forEach(w => {
    const len = cur.reduce((n, x) => n + x.w.length + 1, 0) + w.w.length;
    const prevW = cur.length ? cur[cur.length - 1].w : '', keep = /^[\d½]+$/.test(prevW);   // "1" stays with "cm"
    if (cur.length && !keep && (len > 19 || /[.,:;!?…]$/.test(prevW))) { chunks.push(cur); cur = []; }
    cur.push(w);
  });
  if (cur.length) chunks.push(cur);
  let k = chunks.findIndex(ck => t < ck[ck.length - 1].t1); if (k < 0) k = chunks.length - 1;
  const ck = chunks[k], c0 = ck[0].t0, pop = E.outBack(prog(t, c0 - .02, c0 + .16), 2.4);
  const font = '700 80px Grotesk'; c.font = font;
  const sp = c.measureText(' ').width * 1.5 + 12, ww = ck.map(w => c.measureText(w.w).width), tw = ww.reduce((a, b) => a + b, 0) + sp * (ck.length - 1);
  const sc = Math.min(1, 820 / tw), cx = 480, y = 1360;
  c.save(); c.translate(cx, y); c.scale(sc * (.85 + .15 * pop), sc * (.85 + .15 * pop)); c.globalAlpha = Math.min(1, pop * 1.5);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.lineJoin = 'round';
  let x = -tw / 2;
  ck.forEach((w, j) => {
    const on = (j === 0 ? t >= c0 - .05 : t >= w.t0) && (t < w.t1 || j === ck.length - 1 && t < w.t1 + .3);
    c.save(); c.translate(x + ww[j] / 2, 0); if (on) c.scale(1.08, 1.08); c.translate(-ww[j] / 2, 0);
    c.lineWidth = 14; c.strokeStyle = 'rgba(10,6,3,.9)'; c.strokeText(w.w, 0, 0);
    c.fillStyle = on ? COL.saffron : COL.cream; c.fillText(w.w, 0, 0);
    c.restore(); x += ww[j] + sp;
  });
  c.restore();
}
const V_PINS = [['hogao caramelizado', 3.4, [.36, .43], '#D9573B'], ['queso costeño frito', 4.7, [.26, .54], '#EFE3C2'],
  ['plátano maduro', 6.6, [.52, .46], '#F2B544'], ['salsa de suero', 7.7, [.8, .66], '#A9C44E']];
function vPin(c, t, map, [label, ti, xy, col], k) {
  const a = t - ti; if (a < 0) return;
  const [px, py] = map.map(xy[0], xy[1]), pop = E.outBack(prog(a, 0, .35), 2.5);
  const right = px < W * .55, lx = right ? px + 70 : px - 70, ly = py - 70 - (k % 2) * 30;
  for (const dd of [0, .45]) { const q = prog(a, dd, dd + 1.1); if (q > 0 && q < 1) { c.strokeStyle = rgba(col, .85 * (1 - q)); c.lineWidth = 4; c.beginPath(); c.arc(px, py, 12 + 50 * E.outCubic(q), 0, TAU); c.stroke(); } }
  c.save(); c.translate(px, py); c.scale(pop, pop); c.fillStyle = col; c.strokeStyle = COL.cream; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); c.stroke(); c.restore();
  const la = E.outCubic(prog(a, .12, .45)); if (la <= 0) return;
  c.save(); c.globalAlpha = la;
  c.strokeStyle = COL.cream; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(lerp(px, lx, la), lerp(py, ly, la)); c.stroke();
  const font = '700 40px Grotesk'; c.font = font; const w = c.measureText(label).width + 40;
  const bx = right ? lx : lx - w;
  c.fillStyle = 'rgba(14,10,7,.82)'; c.beginPath(); c.roundRect(bx, ly - 34, w, 68, 34); c.fill();
  c.fillStyle = col; c.beginPath(); c.roundRect(right ? bx : bx + w - 8, ly - 34, 8, 68, 4); c.fill();
  drawText(c, label, bx + 20, ly + 14, font, COL.cream);
  c.restore();
}
function vHook(c, t) {
  const cuts = [[0, 'C6', 0, .89, [1.16, 1.04], [.44, .5]], [9.0, 'N15', 2.0, 1, [1.12, 1.08], [.5, .5]],
    [9.8, 'C3', 2.2, 1, [2.05, 2.0], [.75, .6]], [10.6, 'N08', 3.2, 1, [1.16, 1.12], [.46, .62]]];
  let k = 0; cuts.forEach((q, j) => { if (t >= q[0]) k = j; });
  const [t0, src, m0, rate, zz, f] = cuts[k], t1 = cuts[k + 1] ? cuts[k + 1][0] : CH[1].t;
  const u = E.inOutSine(prog(t, t0, t1)), punch = k ? 1 - E.outCubic(prog(t, t0, t0 + .3)) : 0;
  c.save(); c.translate(W / 2, H / 2); c.scale(1 + .14 * punch, 1 + .14 * punch); c.translate(-W / 2, -H / 2);
  const map = cover(c, sample(src, m0 + (t - t0) * rate), 0, 0, W, H, lerp(zz[0], zz[1], u), f[0], f[1]);
  c.restore();
  if (punch > 0) { c.fillStyle = `rgba(255,240,215,${.5 * punch * punch})`; c.fillRect(0, 0, W, H); }
  vShade(c);
  vHeader(c, t, CH[0], false);
  const ta = 1 - prog(t, 8.6, 9.0);
  if (ta > 0) {
    c.save(); c.globalAlpha = ta;
    maskedLine(c, 'Hamburguesa', 54, 330, '600 128px Fraunces', COL.cream, t, .2, 0, .8);
    maskedLine(c, 'costeña', 50, 490, 'italic 600 168px Fraunces', COL.saffron, t, .45, 0, .8);
    c.restore();
    if (map && k === 0) V_PINS.forEach((p, j) => { c.save(); c.globalAlpha = ta; vPin(c, t, map, p, j); c.restore(); });
  }
  if (t >= 9.0) {
    let w = -1; HOOK_WORDS.forEach((q, j) => { if (t >= q[1]) w = j; });
    if (w >= 0) {
      const [word, ti, col, cap] = HOOK_WORDS[w], pop = E.outBack(prog(t, ti, ti + .28), 2.2), out = prog(t, 11.75, 11.95);
      c.save(); c.globalAlpha = 1 - out; c.translate(480, 560); c.scale(pop * (1 + .5 * out), pop * (1 + .5 * out));
      c.lineJoin = 'round'; c.font = 'italic 600 230px Fraunces'; c.textAlign = 'center'; c.lineWidth = 16; c.strokeStyle = 'rgba(10,6,3,.55)';
      c.strokeText(word, 0, 0); c.fillStyle = col; c.fillText(word, 0, 0);
      drawText(c, cap.toUpperCase(), 0, 80, '700 34px Mono', COL.cream, 'center', 6);
      c.restore();
    }
    const a = prog(t, 11.2, 11.45) * (1 - prog(t, 11.75, 11.95));
    if (a > 0) { c.save(); c.globalAlpha = a; drawText(c, 'EN CADA MORDISCO', 480, 760, '700 44px Grotesk', COL.cream, 'center', 10); c.restore(); }
  }
  vCaptions(c, t);
}
function vEnd(c, t, ch) {
  const a = E.outCubic(prog(t, ch.t, ch.t + .35));
  c.fillStyle = `rgba(14,10,7,${.72 * a})`; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = a;
  maskedLine(c, 'Receta completa', 60, 860, 'italic 600 120px Fraunces', COL.saffron, t, ch.t + .05, 0, .5);
  maskedLine(c, 'en el canal  ▶', 64, 960, '700 64px Grotesk', COL.cream, t, ch.t + .15, 0, .5);
  c.restore();
}
function vScene(c, t) {
  const ch = chapterAt(t);
  if (ch.side === 'hook') { vHook(c, t); return; }
  const i = shotIndex(t), map = vMedia(c, t, i);
  vShade(c);
  if (map) pins(c, t, SHOTS[i], map);
  vHeader(c, t, ch);
  if (ch.side === 'endshort') { vEnd(c, t, ch); return; }
  c.save(); c.scale(1.2, 1.2); callouts(c, t, ch, 60 / 1.2, 290 / 1.2); c.restore();   // bigger for a phone
  vCaptions(c, t);
}

// ───────── frame ─────────
function frameScene(t) {
  const c = S; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if (VERT) { vScene(c, t); return; }
  const ch = chapterAt(t);
  if (ch.side === 'hook') hook(c, t);
  else if (ch.side === 'end') endScreen(c, t, ch);
  else {
    const i = shotIndex(t), s = SHOTS[i];
    background(c, shotSample(s, t), camera(s, t), t, ch);
    watermark(c, ch, t);
    mainCard(c, t, ch, i);
    columnHead(c, t, ch);
    callouts(c, t, ch);
    subtitles(c, t, colX(ch.side) + 26, COLW - 30, 1012, ch.color);
  }
  wipe(c, t);
}
function post(o, src, t) {
  o.globalCompositeOperation = 'source-over'; o.globalAlpha = 1;
  o.drawImage(src, 0, 0);
  o.globalCompositeOperation = 'soft-light'; o.fillStyle = 'rgba(255,170,90,.16)'; o.fillRect(0, 0, W, H);
  o.globalCompositeOperation = 'source-over';
  o.fillStyle = VIGNETTE; o.fillRect(0, 0, W, H);
  const f = Math.floor(t * FPS);
  o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = .06;
  o.translate((f * 97) % 256, (f * 57) % 256); o.fillStyle = GRAIN[f % 4]; o.fillRect(-256, -256, W + 256, H + 256);
  o.restore();
  const blk = Math.max(1 - prog(t, 0, VERT ? .12 : .25), prog(t, DUR - (VERT ? .3 : .7), DUR));
  if (blk > 0) { o.globalAlpha = blk; o.fillStyle = '#000'; o.fillRect(0, 0, W, H); o.globalAlpha = 1; }
}
// motion blur only where things move fast: cuts, wipes, the hook deal/flip and the end-card glide
function subFor(t) {
  if (VERT) {
    if ([9.0, 9.8, 10.6].some(j => Math.abs(t - j) < .2) || t < .5) return 8;
    for (const s of SHOTS) if (s.tr !== 'none' && Math.abs(t - s.t0) < .25 && s.t0 > 0) return 8;
    return 1;
  }
  if (wipeActive(t)) return 10;
  if (t < 1.6 || Math.abs(t - RESWAP) < .45 || (t > 12.1 && t < 12.7)) return 8;
  for (const s of SHOTS) if ((s.tr === 'push' || s.tr === 'zoom') && Math.abs(t - s.t0) < .3) return 8;
  const e = SHOTS[SHOTS.length - 1].t0; if (t > e - .15 && t < e + 1) return 6;
  return 1;
}
function renderAt(t) {
  const sub = subFor(t);
  for (let s = 0; s < sub; s++) {
    frameScene(Math.min(DUR - 1e-4, t + (sub > 1 ? (s / sub) * SHUTTER / FPS : 0)));
    A.globalAlpha = 1 / (s + 1); A.drawImage(sceneC, 0, 0);
  }
  A.globalAlpha = 1;
  post(out, accC, t);
}

// ───────── setup ─────────
async function setup() {
  TL = await (await fetch(new URLSearchParams(location.search).get('tl') || 'timeline.json')).json();
  if (TL.size) [W, H] = TL.size;
  VERT = TL.layout === 'vertical';
  const cv = document.getElementById('c'); cv.width = W; cv.height = H;
  sceneC = mk(); S = sceneC.getContext('2d'); accC = mk(); A = accC.getContext('2d');
  INDEX = await (await fetch('frames/index.json')).json();
  FPS = TL.fps; DUR = TL.duration; SHOTS = TL.shots; CH = TL.chapters; CO = TL.callouts; PINS = TL.pins; CUES = TL.cues;
  await Promise.all(Object.values(TL.media).filter(m => m.img).map(async m => { const im = new Image(); im.src = m.img; await im.decode(); IMG[m.img] = im; }));
  for (let k = 0; k < 4; k++) {
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const gc = g.getContext('2d'), id = gc.createImageData(256, 256), r = rng(50 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); GRAIN.push(out.createPattern(g, 'repeat'));
  }
  VIGNETTE = out.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .45, W / 2, H * .5, Math.max(W, H) * .72);
  VIGNETTE.addColorStop(0, 'rgba(20,10,0,0)'); VIGNETTE.addColorStop(1, 'rgba(20,10,0,0.5)');
  window.reelInfo = { W, H, FPS, DUR, frames: Math.round(FPS * DUR) };
}
window.reelReady = (async () => {
  await Promise.all(['600 100px Fraunces', 'italic 400 40px Fraunces', 'italic 600 40px Fraunces', '500 30px Grotesk', '700 30px Grotesk', '400 20px Mono', '700 20px Mono'].map(f => document.fonts.load(f, 'Aá½–·✓↻≈¿¡')));
  await setup();
})();
// render a frame: a dry pass records which clip frames it needs, they load, then the real pass draws
window.renderFrame = async f => {
  const t = f / FPS;
  for (let k = 0; k < 3; k++) { REQ.clear(); renderAt(t); if (!REQ.size) break; await loadRequested(); }
};
if (!/[?&]render/.test(location.search)) {
  const at = new URLSearchParams(location.search).get('t');
  window.reelReady.then(() => window.renderFrame(Math.round(+(at || 20) * FPS)));
}
