// Fable 5.2 visto por un analista de datos: explainer de ~97 s, 1920×1080 @ 30 fps.
// Cada fotograma es una función pura del tiempo: renderFrame(n) dibuja el fotograma n.
'use strict';

const W = 1920, H = 1080, FPS = 30, BPM = 108, BEAT = 60 / BPM, TAIL = 1.5;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

// ───────────────────────── tema ─────────────────────────
const DARK = {
  bg: '#0F1114', fg: '#F2EDE3', soft: '#C9C5BC', muted: '#8E94A0', line: '#2A2F38', card: '#171A20',
  accent: '#FFD84A', onAccent: '#0F1114', base: '#6B7280', bad: '#FF7A66',
};
const PAPER = {
  bg: '#F2EDE3', fg: '#14161A', soft: '#3A3E46', muted: '#6A6F78', line: '#D5CDBC', card: '#FBF8F2',
  accent: '#FFD84A', onAccent: '#14161A', base: '#A9A294', bad: '#C8402A',
};
let T = DARK;
const SERIF = 'Fraunces', SANS = 'Grotesk', MONO = 'Mono';
const F = (fam, size, w = 500, it = false) => `${it ? 'italic ' : ''}${w} ${size}px ${fam}`;

// ───────────────────────── utilidades ─────────────────────────
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const pr = (t, s, d) => cl((t - s) / d);
const E = {
  out3: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  in3: t => t * t * t,
  io3: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
const fsize = f => +f.match(/(\d+(?:\.\d+)?)px/)[1];
// ruido determinista
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function tx(s, x, y, f, col, o = {}) {
  ctx.font = f; ctx.fillStyle = col; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.fillText(s, x, y);
  ctx.letterSpacing = '0px';
}
function mw(s, f, ls = 0) {
  ctx.font = f; ctx.letterSpacing = ls + 'px';
  const w = ctx.measureText(s).width;
  ctx.letterSpacing = '0px';
  return w;
}
// texto que sube desde detrás de una máscara
function rise(s, x, y, f, col, p, o = {}) {
  if (p <= 0) return;
  const sz = fsize(f), e = E.out5(cl(p));
  ctx.save();
  ctx.beginPath(); ctx.rect(-100, y - sz * 1.1, W + 200, sz * 1.5); ctx.clip();
  ctx.globalAlpha *= cl(p * 3);
  tx(s, x, y + (1 - e) * sz * 0.85, f, col, o);
  ctx.restore();
}
// igual que rise, pero reduce el cuerpo si la línea no cabe en maxW
function riseFit(s, x, y, fam, size, w, col, p, maxW, o = {}) {
  const m = mw(s, F(fam, size, w, o.it));
  const sz = m > maxW ? Math.floor(size * maxW / m) : size;
  rise(s, x, y, F(fam, sz, w, o.it), col, p, o);
}
function txFit(s, x, y, fam, size, w, col, maxW, o = {}) {
  const m = mw(s, F(fam, size, w, o.it));
  const sz = m > maxW ? Math.floor(size * maxW / m) : size;
  tx(s, x, y, F(fam, sz, w, o.it), col, o);
}
function appear(p, fn, dy = 28) {
  if (p <= 0) return;
  const e = E.out5(cl(p));
  ctx.save();
  ctx.globalAlpha *= cl(p * 2.5);
  ctx.translate(0, (1 - e) * dy);
  fn(e);
  ctx.restore();
}
function rr(x, y, w, h, r, fill, stroke, lw = 2) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function seg(x1, y1, x2, y2, col, lw = 2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}
// dibuja una polilínea hasta la fracción e de su longitud
function polyPartial(pts, e, col, lw) {
  if (e <= 0) return;
  let total = 0; const len = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); len.push(d); total += d; }
  let left = total * cl(e);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / len[i - 1]);
    ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
    left -= len[i - 1];
  }
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function check(x, y, s, col, p, lw = 5) {
  polyPartial([[x - 0.45 * s, y + 0.02 * s], [x - 0.12 * s, y + 0.34 * s], [x + 0.48 * s, y - 0.34 * s]], E.out3(cl(p)), col, lw);
}
function cross(x, y, s, col, p, lw = 5) {
  const a = 0.36 * s;
  polyPartial([[x - a, y - a], [x + a, y + a]], E.out3(cl(p * 2)), col, lw);
  polyPartial([[x + a, y - a], [x - a, y + a]], E.out3(cl(p * 2 - 1)), col, lw);
}
function okBadge(x, y, r, p) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= cl(p * 3);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r * E.back(cl(p * 1.6))), 0, 7); ctx.fillStyle = T.accent; ctx.fill();
  check(x, y, r, T.onAccent, cl((p - 0.3) / 0.7), Math.max(3, r * 0.24));
  ctx.restore();
}
function noBadge(x, y, r, p) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= cl(p * 3);
  ctx.beginPath(); ctx.arc(x, y, Math.max(0, r * E.back(cl(p * 1.6))), 0, 7); ctx.strokeStyle = T.bad; ctx.lineWidth = 3; ctx.stroke();
  cross(x, y, r, T.bad, cl((p - 0.3) / 0.7), Math.max(3, r * 0.22));
  ctx.restore();
}
function arrow(x1, y1, x2, y2, col, p, lw = 4, head = 13) {
  if (p <= 0) return;
  const e = E.out3(cl(p)), x = x1 + (x2 - x1) * e, y = y1 + (y2 - y1) * e, a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.globalAlpha *= cl(p * 3);
  seg(x1, y1, x, y, col, lw);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x - head * Math.cos(a - 0.5), y - head * Math.sin(a - 0.5));
  ctx.moveTo(x, y); ctx.lineTo(x - head * Math.cos(a + 0.5), y - head * Math.sin(a + 0.5));
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  ctx.restore();
}
// trazo de resaltador (multiplica sobre el papel)
function hl(x, y, w, h, p, col) {
  if (p <= 0) return;
  const e = E.io3(cl(p)), sk = h * 0.1;
  ctx.save();
  if (T === PAPER) ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = col || T.accent;
  ctx.beginPath();
  ctx.moveTo(x + sk, y); ctx.lineTo(x + w * e + sk, y); ctx.lineTo(x + w * e - sk, y + h); ctx.lineTo(x - sk, y + h);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}
// escribe líneas letra a letra; cpb = caracteres por tiempo musical. Devuelve el beat en que termina.
function typedLines(lines, x, y, lh, f, col, b, b0, cpb) {
  let start = b0;
  lines.forEach((l, i) => {
    const d = l.length / cpb, p = pr(b, start, d);
    if (p > 0) tx(l.slice(0, Math.ceil(p * l.length)), x, y + i * lh, f, col);
    start += d;
  });
  return start;
}
// titular en serif; las líneas que empiezan con * van en cursiva y acento
function headline(lines, x, y, size, lh, b, b0, maxW) {
  const L = lines.map(l => (l[0] === '*' ? { s: l.slice(1), em: true } : { s: l, em: false }));
  let m = 0;
  for (const l of L) m = Math.max(m, mw(l.s, F(SERIF, size, 600, l.em)));
  const sz = m > maxW ? Math.floor(size * maxW / m) : size, k = sz / size;
  L.forEach((l, i) => {
    const f = F(SERIF, sz, 600, l.em), yy = y + i * lh * k, p = pr(b, b0 + i * 0.28, 1.3);
    if (l.em && T === PAPER) hl(x - 14, yy - sz * 0.8, mw(l.s, f) + 28, sz * 1.02, pr(b, b0 + i * 0.28 + 0.5, 1));
    rise(l.s, x, yy, f, l.em && T === DARK ? T.accent : T.fg, p);
  });
  return sz;
}
// barra horizontal con etiqueta directa y valor que cuenta
function bar(label, val, x, y, o) {
  const p = o.p; if (p <= 0) return;
  const lw = o.lw || 190, maxW = o.maxW || 420, h = o.h || 48, e = E.out5(cl(p)), max = o.max || 100;
  ctx.save(); ctx.globalAlpha *= cl(p * 3);
  tx(label, x, y + h / 2 + 11, F(SANS, 30, o.strong ? 700 : 500), o.strong ? T.fg : T.soft);
  const bw = Math.max(3, maxW * val / max * e);
  ctx.fillStyle = o.col; ctx.beginPath(); ctx.roundRect(x + lw, y, bw, h, [0, 6, 6, 0]); ctx.fill();
  tx(o.text ? o.text : fmt(val * e) + ' %', x + lw + bw + 18, y + h / 2 + 13, F(SANS, 36, 700), T.fg);
  ctx.restore();
}

// ───────────────────────── composición común ─────────────────────────
const RX = 1040, RW = 760; // columna derecha de la parte 1

function left(kicker, head, sub, b) {
  rise(kicker, 120, 262, F(MONO, 26, 700), T.accent, pr(b, 0, 1.2), { ls: 4 });
  const sz = headline(head, 120, 404, 108, 120, b, 0.3, 830);
  const ys = 404 + (head.length - 1) * 120 * (sz / 108) + 100;
  sub.forEach((l, i) => riseFit(l, 120, ys + i * 54, SANS, 38, 500, T.soft, pr(b, 1.7 + i * 0.3, 1.2), 840));
}
function p2(n, head, body, b) {
  hl(118, 300, 226, 240, pr(b, 0, 1.2));
  rise(String(n), 160, 512, F(SERIF, 270, 600, true), T.fg, pr(b, 0.15, 1.3));
  const sz = headline(head, 420, 392, 100, 112, b, 0.4, 760);
  const ys = 392 + (head.length - 1) * 112 * (sz / 100) + 104;
  body.forEach((l, i) => riseFit(l, 420, ys + i * 54, SANS, 37, 500, T.soft, pr(b, 1.8 + i * 0.3, 1.2), 780));
}
const PX = 1270, PW = 520; // columna derecha de la parte 2

function bg() {
  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  if (T === DARK) {
    ctx.fillStyle = 'rgba(242,237,227,0.045)';
    for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    const g = ctx.createRadialGradient(W * 0.3, H * 0.35, 100, W * 0.5, H * 0.5, 1300);
    g.addColorStop(0, 'rgba(255,255,255,0.035)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// ───────────────────────── escenas ─────────────────────────
function sIntro(lt, b) {
  // barras de fondo: una serie que crece
  const n = 60;
  for (let i = 0; i < n; i++) {
    const p = pr(b, 0.4 + i * 0.045, 1.6); if (p <= 0) continue;
    const h = (36 + 250 * Math.pow(i / (n - 1), 1.7) + rnd(i) * 44) * E.out5(p) * (1 + 0.02 * Math.sin(lt * 2 + i * 0.5));
    ctx.fillStyle = i >= n - 5 ? T.accent : '#232830';
    ctx.beginPath(); ctx.roundRect(120 + i * 28, 950 - h, 16, h, [4, 4, 0, 0]); ctx.fill();
  }
  rise('CLAUDE FABLE 5.2 · LANZADO EL 9 NOV 2026', 120, 250, F(MONO, 26, 700), T.accent, pr(b, 0, 1.2), { ls: 4 });
  rise('Dónde mejoró Claude', 120, 400, F(SERIF, 128, 600), T.fg, pr(b, 0.4, 1.4));
  rise('con Fable 5.2', 120, 540, F(SERIF, 128, 600, true), T.accent, pr(b, 0.75, 1.4));
  rise('Visto por un analista de datos — y lo que exige', 120, 648, F(SANS, 40, 500), T.soft, pr(b, 2.4, 1.2));
  rise('la era agéntica para transformar la empresa.', 120, 702, F(SANS, 40, 500), T.soft, pr(b, 2.7, 1.2));
}

function sChart(lt, b) {
  left('01 · LECTURA DE GRÁFICOS', ['Ahora sí lee', '*tus gráficos.'], ['Interpreta gráficos y figuras', 'con mucha más precisión.'], b);
  const X = RX, vals = [0.26, 0.40, 0.33, 0.55, 0.48, 0.70, 0.88];
  const gx = i => X + 70 + i * (RW - 140) / (vals.length - 1), gy = v => 446 - v * 165;
  appear(pr(b, 1.2, 1.2), () => {
    rr(X, 190, RW, 290, 18, T.card, T.line);
    tx('ENTRADA · LA IMAGEN DE UN GRÁFICO', X + 28, 236, F(MONO, 20, 700), T.muted, { ls: 2 });
    seg(X + 50, 446, X + RW - 50, 446, T.line, 1.5);
  });
  polyPartial(vals.map((v, i) => [gx(i), gy(v)]), E.io3(pr(b, 1.8, 1.6)), T.soft, 3);
  const scanP = pr(b, 3.2, 2.2), sx = X + 50 + scanP * (RW - 100);
  if (scanP > 0 && scanP < 1) {
    const g = ctx.createLinearGradient(sx - 90, 0, sx, 0);
    g.addColorStop(0, 'rgba(255,216,74,0)'); g.addColorStop(1, 'rgba(255,216,74,0.16)');
    ctx.fillStyle = g; ctx.fillRect(sx - 90, 256, 90, 190);
    ctx.fillStyle = T.accent; ctx.fillRect(sx - 1.5, 256, 3, 190);
  }
  const lab = { 1: '40', 3: '55', 6: '88' };
  vals.forEach((v, i) => {
    const tp = 3.2 + 2.2 * (gx(i) - (X + 50)) / (RW - 100), hit = pr(b, tp, 0.7);
    if (pr(b, 1.8 + i * 0.22, 0.4) <= 0) return;
    ctx.beginPath(); ctx.arc(gx(i), gy(v), 6 + 4 * Math.sin(Math.PI * hit) , 0, 7);
    ctx.fillStyle = hit > 0 ? T.accent : T.soft; ctx.fill();
    if (lab[i] && hit > 0) appear(hit, () => tx(lab[i], gx(i), gy(v) - 20, F(MONO, 24, 700), T.fg, { align: 'center' }), 12);
  });
  appear(pr(b, 4.8, 1), () => tx('CHARTOGRAPHY · ACIERTOS LEYENDO GRÁFICOS', X, 556, F(MONO, 20, 700), T.muted, { ls: 2 }));
  appear(pr(b, 5, 0.8), () => seg(X + 190, 580, X + 190, 736, T.line, 1.5), 0);
  bar('Fable 5.1', 44.8, X, 592, { p: pr(b, 5.1, 1.8), col: T.base });
  bar('Fable 5.2', 73.4, X, 672, { p: pr(b, 5.5, 1.8), col: T.accent, strong: true });
  appear(pr(b, 7.2, 1.1), () => {
    const f = F(SERIF, 62, 600, true);
    tx('+28,6 puntos', X, 826, f, T.fg);
    tx('frente a Fable 5.1', X + mw('+28,6 puntos', f) + 22, 826, F(SANS, 30, 500), T.muted);
  });
  appear(pr(b, 8.2, 1.1), () => {
    txFit('En esfuerzo medio (66,4 %) ya supera a Opus 5.5 en máximo', X, 880, SANS, 26, 500, T.muted, RW);
    txFit('(64,4 %), por menos de 1/10 del costo por tarea.', X, 914, SANS, 26, 500, T.muted, RW);
  });
}

function sLoop(lt, b) {
  left('02 · MÉTODO', ['Mide, prueba', '*y verifica.'], ['Corre ablaciones, optimiza métricas', 'y comprueba que cada cambio funcionó.'], b);
  const X = RX, pills = [['MEDIR', 190], ['PROBAR', 200], ['VERIFICAR', 250]];
  let px = X;
  pills.forEach(([s, w], i) => {
    const on = b >= 3 && b < 9 ? Math.floor(((b - 3) % 1) * 3) === i : false;
    appear(pr(b, 1.2 + i * 0.25, 1), () => {
      rr(px, 196, w, 64, 32, on ? T.accent : null, on ? null : T.line, 2);
      tx(s, px + w / 2 + 1, 237, F(MONO, 22, 700), on ? T.onAccent : T.soft, { align: 'center', ls: 3 });
    });
    if (i < 2) arrow(px + w + 12, 228, px + w + 48, 228, T.muted, pr(b, 1.7 + i * 0.25, 0.8), 3, 10);
    px += w + 60;
  });
  const cy = 300, ch = 480, px0 = X + 80, px1 = X + RW - 80, py0 = 720, py1 = 410;
  const vals = [0.08, 0.30, 0.18, 0.52, 0.72, 0.92], ok = [1, 1, 0, 1, 1, 1];
  const gx = i => px0 + i * (px1 - px0) / 5, gy = v => py0 - v * (py0 - py1);
  appear(pr(b, 1.5, 1.2), () => {
    rr(X, cy, RW, ch, 18, T.card, T.line);
    tx('MÉTRICA POR ITERACIÓN', X + 28, cy + 46, F(MONO, 20, 700), T.muted, { ls: 2 });
    tx('ILUSTRACIÓN', X + RW - 28, cy + 46, F(MONO, 18, 400), T.muted, { align: 'right', ls: 2 });
    seg(px0 - 30, py0 + 24, px1 + 30, py0 + 24, T.line, 1.5);
  });
  let prev = 0;
  for (let i = 1; i < 6; i++) {
    const t0 = 3 + i - 0.5, p = pr(b, t0, 0.5);
    if (p > 0) {
      const a = [gx(prev), gy(vals[prev])], c = [gx(i), gy(vals[i])];
      polyPartial([a, c], E.io3(p), ok[i] ? T.accent : T.muted, ok[i] ? 4 : 2);
    }
    if (ok[i]) prev = i;
  }
  for (let i = 0; i < 6; i++) {
    const t0 = i === 0 ? 2.6 : 3 + i, p = pr(b, t0, 0.5);
    if (p <= 0) continue;
    const x = gx(i), y = gy(vals[i]), r = 9 * E.back(p);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, 7);
    if (ok[i]) { ctx.fillStyle = T.accent; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = T.card; ctx.stroke(); }
    else { ctx.fillStyle = T.card; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = T.muted; ctx.stroke(); }
    if (i === 0) appear(p, () => tx('base', x, y + 44, F(MONO, 20, 400), T.muted, { align: 'center' }), 0);
    else if (ok[i]) okBadge(x, y - 40, 15, pr(b, t0 + 0.35, 0.6));
    else noBadge(x, y + 42, 15, pr(b, t0 + 0.35, 0.6));
  }
  appear(pr(b, 5.2, 1), () => {
    okBadge(X + 18, 822, 14, 1); tx('cambio verificado', X + 44, 831, F(SANS, 26, 500), T.soft);
    noBadge(X + 320, 822, 14, 1); tx('no mejoró: se descarta', X + 346, 831, F(SANS, 26, 500), T.soft);
  });
}

function sHonest(lt, b) {
  left('03 · HONESTIDAD', ['Sabe decir', '*«no lo sé».'], ['Prefiere medir antes que', 'darte un número inventado.'], b);
  const X = RX;
  appear(pr(b, 1.2, 1.2), () => {
    rr(X, 190, RW, 440, 18, T.card, T.line);
    tx('PREGUNTA', X + 36, 244, F(MONO, 20, 700), T.muted, { ls: 2 });
    tx('RECREACIÓN · CASO DESCRITO POR COGNITION', X + RW - 32, 244, F(MONO, 16, 400), T.muted, { align: 'right', ls: 1 });
  });
  typedLines(['¿Cuánto subió la conversión', 'con el cambio?'], X + 36, 296, 46, F(SANS, 34, 500), T.soft, b, 1.9, 30);
  appear(pr(b, 3.5, 0.8), () => {
    seg(X + 36, 372, X + RW - 36, 372, T.line, 1.5);
    tx('FABLE 5.2', X + 36, 420, F(MONO, 20, 700), T.accent, { ls: 2 });
  }, 0);
  typedLines(['«Mi estimación anterior estaba mal.', 'No doy un número hasta', 'medir el cambio.»'], X + 36, 478, 56, F(SERIF, 40, 400, true), T.fg, b, 3.9, 27);
  const rows = ['Menos datos inventados', 'Señala lo que no se reproduce', 'No exagera lo que muestra la evidencia'];
  rows.forEach((s, i) => {
    const p = pr(b, 7 + i * 0.8, 0.9), y = 706 + i * 66;
    okBadge(X + 20, y - 11, 17, p);
    appear(p, () => tx(s, X + 56, y, F(SANS, 32, 500), T.fg), 14);
  });
}

function sSql(lt, b) {
  left('04 · SQL Y DATOS', ['SQL que', '*sí cuadra.'], ['En una prueba de Oracle, otros dos', 'modelos inflaron el total 5–8 veces.'], b);
  const X = RX, y0 = 262, rh = 70;
  const rows = [['Región Andina', '300', true], ['Colombia', '120'], ['Perú', '80'], ['Chile', '100']];
  const wrong = pr(b, 3.3, 1.4), fix = pr(b, 6.2, 0.8);
  appear(pr(b, 1.2, 1.2), () => {
    rr(X, 190, RW, 372, 18, T.card, T.line);
    tx('REGIÓN / PAÍS', X + 36, 240, F(MONO, 20, 700), T.muted, { ls: 2 });
    tx('MONTO', X + RW - 36, 240, F(MONO, 20, 700), T.muted, { align: 'right', ls: 2 });
    tx('ILUSTRACIÓN', X + RW / 2, 240, F(MONO, 16, 400), T.muted, { align: 'center', ls: 2 });
    rows.forEach((r, i) => {
      const y = y0 + i * rh, sum = !!r[2];
      // el barrido de la suma incorrecta abarca también la fila de resumen
      const cover = cl(wrong * 4 - i) * (1 - fix);
      if (cover > 0) { ctx.fillStyle = 'rgba(255,122,102,0.16)'; ctx.fillRect(X + 2, y, (RW - 4) * E.out3(cover), rh); }
      if (fix > 0 && !sum) { ctx.fillStyle = `rgba(255,216,74,${0.13 * fix})`; ctx.fillRect(X + 2, y, RW - 4, rh); ctx.fillStyle = T.accent; ctx.fillRect(X + 2, y, 5 * fix, rh); }
      seg(X + 2, y, X + RW - 2, y, T.line, 1.5);
      ctx.save();
      if (sum) ctx.globalAlpha *= 1 - 0.55 * fix;
      tx(r[0], X + (sum ? 36 : 72), y + 45, F(SANS, 30, sum ? 700 : 500), sum ? T.fg : T.soft);
      if (sum) {
        const wv = mw(r[0], F(SANS, 30, 700));
        rr(X + 36 + wv + 18, y + 20, 124, 32, 16, null, T.muted, 1.5);
        tx('RESUMEN', X + 36 + wv + 80, y + 43, F(MONO, 16, 700), T.muted, { align: 'center', ls: 2 });
      }
      tx(r[1], X + RW - 36, y + 45, F(MONO, 30, sum ? 700 : 400), T.fg, { align: 'right' });
      if (sum && fix > 0) seg(X + 36, y + 35, X + 36 + (RW - 72) * E.out3(fix), y + 35, T.muted, 2);
      ctx.restore();
    });
  });
  const pa = pr(b, 4.7, 0.9), pb = pr(b, 6.7, 0.9);
  noBadge(X + 20, 622, 18, pa);
  appear(pa, () => {
    tx('Otros 2 modelos', X + 56, 620, F(SANS, 30, 700), T.fg);
    tx('suman también la fila de resumen: 5–8× lo esperado', X + 56, 656, F(SANS, 26, 500), T.soft);
  }, 14);
  okBadge(X + 20, 716, 18, pb);
  appear(pb, () => {
    tx('Fable 5.2', X + 56, 714, F(SANS, 30, 700), T.fg);
    tx('devuelve el resultado esperado', X + 56, 750, F(SANS, 26, 500), T.soft);
  }, 14);
  appear(pr(b, 8.3, 1), e => {
    ctx.fillStyle = T.accent; ctx.fillRect(X, 808, 4, 78 * e);
    txFit('data-eng-bench (Snowflake): el modelo más fuerte', X + 24, 838, SANS, 27, 500, T.soft, RW - 24);
    txFit('medido en sus 103 tareas de ingeniería de datos.', X + 24, 874, SANS, 27, 500, T.soft, RW - 24);
  });
}

function sAgents(lt, b) {
  left('05 · AGENTES', ['Flujos enteros,', '*no solo respuestas.'], ['Coordina cientos de subagentes', 'y sostiene trabajo de varios días.'], b);
  const X = RX, cx = X + RW / 2, cy = 336;
  appear(pr(b, 1.2, 1), () => tx('1 ORQUESTADOR · CIENTOS DE SUBAGENTES', X, 204, F(MONO, 20, 700), T.muted, { ls: 2 }));
  const rings = [16, 28, 40];
  let idx = 0;
  rings.forEach((n, k) => {
    for (let j = 0; j < n; j++, idx++) {
      const p = pr(b, 1.6 + idx * 0.03, 1.3); if (p <= 0) continue;
      const e = E.out5(p), a = (j / n) * Math.PI * 2 + lt * 0.12 * (k % 2 ? -1 : 1) + k;
      const x = cx + Math.cos(a) * (120 + 105 * k) * e, y = cy + Math.sin(a) * (40 + 33 * k) * e;
      ctx.globalAlpha = 0.10 * (1 - 0.5 * e) + 0.03;
      seg(cx, cy, x, y, T.fg, 1);
      const pulse = 0.5 + 0.5 * Math.sin(lt * 3 + idx * 1.7);
      ctx.globalAlpha = 0.45 + 0.55 * pulse;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fillStyle = pulse > 0.8 ? T.accent : T.soft; ctx.fill();
    }
  });
  ctx.globalAlpha = 1;
  const pc = pr(b, 1.3, 0.8);
  if (pc > 0) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, 20 * E.back(pc)), 0, 7); ctx.fillStyle = T.accent; ctx.fill(); }
  appear(pr(b, 4.4, 1), () => tx('AUTOMATIONBENCH · FLUJOS DE NEGOCIO', X, 532, F(MONO, 20, 700), T.muted, { ls: 2 }));
  bar('Fable 5.1', 31.4, X, 552, { p: pr(b, 4.7, 1.6), col: T.base, h: 44 });
  bar('Fable 5.2', 51.4, X, 610, { p: pr(b, 5.0, 1.6), col: T.accent, strong: true, h: 44 });
  appear(pr(b, 6.4, 1), () => tx('REMOTE LABOR INDEX · TRABAJO DE CONOCIMIENTO', X, 722, F(MONO, 20, 700), T.muted, { ls: 2 }));
  bar('Fable 5.1', 17.9, X, 742, { p: pr(b, 6.7, 1.6), col: T.base, h: 44 });
  bar('Fable 5.2', 41.3, X, 800, { p: pr(b, 7.0, 1.6), col: T.accent, strong: true, h: 44 });
  appear(pr(b, 4.6, 0.8), () => { seg(X + 190, 544, X + 190, 662, T.line, 1.5); }, 0);
  appear(pr(b, 6.6, 0.8), () => { seg(X + 190, 734, X + 190, 852, T.line, 1.5); }, 0);
}

function sCost(lt, b) {
  left('06 · COSTO Y VELOCIDAD', ['Más rápido.', '*Más barato.'], ['Baja el precio por token', 'y sube la velocidad de salida.'], b);
  const X = RX;
  const price = (label, old, now, y, t0) => {
    appear(pr(b, t0, 1), () => tx(label, X, y - 128, F(MONO, 20, 700), T.muted, { ls: 2 }));
    const fo = F(SERIF, 76, 600), fn = F(SERIF, 132, 600);
    appear(pr(b, t0 + 0.2, 1), () => tx(old, X, y, fo, T.muted));
    const wo = mw(old, fo), st = pr(b, t0 + 1.0, 0.5);
    if (st > 0) seg(X - 6, y - 26, X - 6 + (wo + 12) * E.out3(st), y - 26, T.bad, 5);
    arrow(X + wo + 30, y - 28, X + wo + 96, y - 28, T.muted, pr(b, t0 + 1.2, 0.6), 4, 14);
    rise(now, X + wo + 124, y, fn, T.fg, pr(b, t0 + 1.5, 1));
  };
  price('ENTRADA · POR MILLÓN DE TOKENS', '$10', '$8', 350, 1.4);
  price('SALIDA · POR MILLÓN DE TOKENS', '$50', '$40', 560, 2.6);
  const pb = pr(b, 5.2, 0.9);
  if (pb > 0) {
    const r = 92 * E.back(pb), bx = X + 648, by = 404;
    ctx.save(); ctx.globalAlpha = cl(pb * 3);
    ctx.beginPath(); ctx.arc(bx, by, Math.max(0, r), 0, 7); ctx.fillStyle = T.accent; ctx.fill();
    tx('−20 %', bx, by + 17, F(SANS, 50, 700), T.onAccent, { align: 'center' });
    ctx.restore();
  }
  appear(pr(b, 6.2, 1), () => tx('VELOCIDAD DE SALIDA · FABLE 5.1 = 100', X, 668, F(MONO, 20, 700), T.muted, { ls: 2 }));
  appear(pr(b, 6.4, 0.8), () => seg(X + 190, 680, X + 190, 798, T.line, 1.5), 0);
  bar('Fable 5.1', 100, X, 688, { p: pr(b, 6.5, 1.5), col: T.base, h: 44, max: 150, maxW: 380, text: '100' });
  bar('Fable 5.2', 130, X, 746, { p: pr(b, 6.9, 1.5), col: T.accent, strong: true, h: 44, max: 150, maxW: 380, text: 'hasta 130' });
  appear(pr(b, 8.4, 1), () => txFit('Modo rápido opcional: hasta 2,5× más veloz, a $16 / $80.', X, 880, SANS, 26, 500, T.muted, RW));
}

function sBridge(lt, b) {
  const wipe = E.io3(pr(b, 3.5, 0.9));
  T = DARK; bg();
  if (wipe < 1) {
    ctx.save();
    const out = pr(b, 3.3, 0.5);
    ctx.globalAlpha = 1 - out;
    rise('Pero un modelo mejor', 120, 500, F(SERIF, 120, 600), T.fg, pr(b, 0.1, 1.3));
    riseFit('no transforma la empresa solo.', 120, 640, SERIF, 120, 600, T.accent, pr(b, 0.9, 1.3), 1680, { it: true });
    ctx.restore();
  }
  if (wipe > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, H * (1 - wipe), W, H * wipe); ctx.clip();
    T = PAPER; bg();
    rise('PARTE 2 · LA ERA AGÉNTICA', 120, 360, F(MONO, 26, 700), T.muted, pr(b, 4.2, 1.2), { ls: 4 });
    const f = F(SERIF, 132, 600);
    hl(120 - 16, 500 - 106, mw('6 cosas', f) + 32, 136, pr(b, 5.0, 1));
    rise('6 cosas que debes', 120, 500, f, T.fg, pr(b, 4.4, 1.3));
    rise('tener en cuenta', 120, 650, F(SERIF, 132, 600, true), T.fg, pr(b, 4.7, 1.3));
    ctx.restore();
    if (wipe < 1) T = wipe > 0.5 ? PAPER : DARK;
  }
}

function sData(lt, b) {
  p2(1, ['Datos listos', '*para agentes'], ['Capa semántica, métricas con una sola', 'definición y catálogo al día. El agente', 'rinde lo que rinde su contexto.'], b);
  const X = PX + 10, w = 500, slabs = [['Datos crudos', 640, false], ['Capa semántica', 524, false], ['Métricas con una definición', 408, true]];
  slabs.forEach(([s, y, top], i) => {
    const p = pr(b, 2 + i * 0.9, 1); if (p <= 0) return;
    const e = E.out5(p);
    ctx.save(); ctx.globalAlpha *= cl(p * 3); ctx.translate(0, -(1 - e) * 120);
    rr(X, y, w, 92, 16, top ? T.accent : T.card, top ? null : T.line, 2);
    tx(s, X + w / 2, y + 57, F(SANS, 30, top ? 700 : 500), T.fg, { align: 'center' });
    ctx.restore();
  });
  const pa = pr(b, 5.2, 0.9);
  if (pa > 0) {
    ctx.save(); ctx.globalAlpha *= cl(pa * 3);
    ctx.beginPath(); ctx.arc(X + w / 2, 286, Math.max(0, 26 * E.back(pa)), 0, 7); ctx.fillStyle = T.fg; ctx.fill();
    tx('AGENTE', X + w / 2 + 44, 294, F(MONO, 20, 700), T.muted, { ls: 2 });
    ctx.restore();
  }
  arrow(X + w / 2, 322, X + w / 2, 394, T.fg, pr(b, 5.8, 0.7), 4, 14);
  appear(pr(b, 7, 1), () => tx('mejor contexto, mejor respuesta', X + w / 2, 786, F(SERIF, 32, 400, true), T.soft, { align: 'center' }));
}

function sEvals(lt, b) {
  p2(2, ['Evalúa antes', '*de confiar'], ['Casos con respuesta conocida, resultados', 'reproducibles y revisión por muestreo.', 'La confianza se mide.'], b);
  const X = PX;
  appear(pr(b, 1.6, 1.2), () => {
    rr(X, 250, PW, 470, 18, T.card, T.line);
    tx('EVALUACIÓN · 5 CASOS', X + 30, 298, F(MONO, 20, 700), T.muted, { ls: 2 });
    tx('ILUSTRACIÓN', X + PW - 30, 298, F(MONO, 16, 400), T.muted, { align: 'right', ls: 2 });
  });
  const res = [1, 1, 0, 1, 1];
  res.forEach((ok, i) => {
    const y = 330 + i * 64, p = pr(b, 2.4 + i * 0.7, 0.8);
    appear(pr(b, 2 + i * 0.2, 1), () => {
      seg(X + 2, y, X + PW - 2, y, T.line, 1.5);
      tx(`Caso 0${i + 1}`, X + 30, y + 42, F(SANS, 28, 500), T.fg);
      tx(ok || p <= 0 ? 'respuesta conocida' : 'revisar', X + 170, y + 42, F(SANS, 24, 500), ok || p <= 0 ? T.muted : T.bad);
    }, 0);
    if (ok) okBadge(X + PW - 50, y + 32, 16, p); else noBadge(X + PW - 50, y + 32, 16, p);
  });
  appear(pr(b, 6.4, 1), () => {
    seg(X + 2, 650, X + PW - 2, 650, T.line, 1.5);
    tx('4 de 5 correctos', X + 30, 696, F(SANS, 30, 700), T.fg);
  }, 0);
  const ps = pr(b, 7.3, 0.9);
  if (ps > 0) {
    ctx.save(); ctx.globalAlpha *= cl(ps * 3);
    const e = E.back(ps); ctx.translate(X + PW / 2, 786); ctx.rotate(-0.035); ctx.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e);
    rr(-PW / 2 + 6, -34, PW - 12, 68, 12, null, T.bad, 3);
    tx('BAJO EL UMBRAL · AÚN NO SE DESPLIEGA', 0, 8, F(MONO, 20, 700), T.bad, { align: 'center', ls: 1 });
    ctx.restore();
  }
}

function sPerms(lt, b) {
  p2(3, ['Permisos', '*y gobierno'], ['Mínimo privilegio, solo lectura por defecto,', 'trazabilidad y aprobación humana', 'para lo irreversible.'], b);
  const X = PX;
  appear(pr(b, 1.6, 1.2), () => {
    rr(X, 250, PW, 362, 18, T.card, T.line);
    tx('PERMISOS DEL AGENTE', X + 30, 298, F(MONO, 20, 700), T.muted, { ls: 2 });
  });
  const rows = [['Leer datos', 'on'], ['Escribir tablas', 'ask'], ['Borrar o enviar', 'off'], ['Registro de acciones', 'on']];
  rows.forEach(([s, st], i) => {
    const y = 330 + i * 68, p = pr(b, 2.4 + i * 0.75, 0.8);
    appear(pr(b, 2 + i * 0.2, 1), () => {
      seg(X + 2, y, X + PW - 2, y, T.line, 1.5);
      tx(s, X + 30, y + 44, F(SANS, 28, 500), T.fg);
    }, 0);
    const tx0 = X + PW - 110, ty = y + 18;
    if (st === 'ask') {
      appear(p, () => {
        rr(X + PW - 222, ty, 192, 34, 17, null, T.fg, 2);
        tx('CON APROBACIÓN', X + PW - 126, ty + 23, F(MONO, 16, 700), T.fg, { align: 'center', ls: 1 });
      }, 0);
    } else {
      const k = st === 'on' ? E.io3(p) : 0;
      appear(pr(b, 2 + i * 0.2, 1), () => {
        rr(tx0, ty, 80, 34, 17, k > 0.5 ? T.fg : null, k > 0.5 ? null : T.base, 2);
        ctx.beginPath(); ctx.arc(tx0 + 17 + 46 * k, ty + 17, 11, 0, 7); ctx.fillStyle = k > 0.5 ? T.accent : T.base; ctx.fill();
      }, 0);
    }
  });
  appear(pr(b, 6.6, 1), e => {
    ctx.fillStyle = T.fg; ctx.fillRect(X, 660, 4, 112 * e);
    tx('OJO CON FABLE 5.2', X + 24, 684, F(MONO, 18, 700), T.muted, { ls: 2 });
    txFit('Por defecto retiene los datos 30 días', X + 24, 726, SANS, 27, 500, T.fg, PW - 24);
    txFit('para monitoreo de seguridad.', X + 24, 762, SANS, 27, 500, T.fg, PW - 24);
  });
}

function sModels(lt, b) {
  p2(4, ['El modelo justo', '*para cada tarea'], ['Opus 5.5 para el día a día; Fable 5.2 para', 'lo ambiguo y largo. Mide el costo por', 'tarea terminada, no por token.'], b);
  const X = PX + 60, w = PW - 60;
  const rungs = [['Haiku 5.5', 664], ['Sonnet 5.5', 564], ['Opus 5.5', 464], ['Fable 5.2', 364]];
  rungs.forEach(([s, y], i) => {
    const p = pr(b, 1.8 + i * 0.45, 1); if (p <= 0) return;
    const hi = i === 2 ? E.io3(pr(b, 4, 0.8)) : 0, top = i === 3 ? E.io3(pr(b, 6, 0.8)) : 0;
    appear(p, () => {
      rr(X, y, w, 78, 14, top > 0.5 ? T.fg : T.card, T.line, 2);
      if (hi > 0) { ctx.save(); ctx.globalAlpha *= hi; rr(X, y, w, 78, 14, T.accent, null); ctx.restore(); }
      tx(s, X + 28, y + 50, F(SANS, 30, i >= 2 ? 700 : 500), top > 0.5 ? T.bg : T.fg);
      if (i === 2 && hi > 0) { ctx.save(); ctx.globalAlpha *= hi; tx('EMPIEZA AQUÍ', X + w - 26, y + 48, F(MONO, 18, 700), T.fg, { align: 'right', ls: 2 }); ctx.restore(); }
      if (i === 3 && top > 0) { ctx.save(); ctx.globalAlpha *= top; tx('LO MÁS DIFÍCIL', X + w - 26, y + 48, F(MONO, 18, 700), T.accent, { align: 'right', ls: 2 }); ctx.restore(); }
    });
  });
  arrow(PX + 18, 520, PX + 18, 404, T.fg, pr(b, 5.4, 0.9), 4, 14);
  arrow(PX + 18, 590, PX + 18, 706, T.muted, pr(b, 7, 0.9), 3, 12);
  appear(pr(b, 5.6, 1), () => tx('sube si la tarea es ambigua y larga', X, 330, F(SERIF, 28, 400, true), T.soft));
  appear(pr(b, 7.2, 1), () => tx('baja si es simple y repetitiva', X, 790, F(SERIF, 28, 400, true), T.soft));
}

function sProcess(lt, b) {
  p2(5, ['Rediseña', '*el proceso'], ['Automatizar una tarea suelta rinde poco.', 'Elige un flujo completo, con un KPI', 'de negocio y un responsable.'], b);
  const X = PX;
  appear(pr(b, 1.6, 1), () => tx('ANTES · 5 PASOS MANUALES', X, 290, F(MONO, 20, 700), T.muted, { ls: 2 }));
  for (let i = 0; i < 5; i++) {
    const x = X + i * 106;
    appear(pr(b, 1.9 + i * 0.22, 0.9), () => {
      rr(x, 312, 84, 64, 12, null, T.base, 2);
      if (i < 4) seg(x + 90, 344, x + 100, 344, T.base, 2);
    }, 14);
  }
  const d = pr(b, 2.6, 6);
  if (d > 0 && d < 1) { ctx.beginPath(); ctx.arc(X + 42 + d * 424, 344, 9, 0, 7); ctx.fillStyle = T.muted; ctx.fill(); }
  appear(pr(b, 4.2, 1), () => tx('DESPUÉS · REDISEÑADO', X, 478, F(MONO, 20, 700), T.muted, { ls: 2 }));
  const boxes = [['Agente', 134, 'a'], ['Revisión humana', 226, 'o'], ['Decisión', 120, 'k']];
  let x = X;
  boxes.forEach(([s, w, k], i) => {
    const xx = x;
    appear(pr(b, 4.5 + i * 0.5, 0.9), () => {
      rr(xx, 500, w, 76, 14, k === 'a' ? T.accent : k === 'k' ? T.fg : T.card, k === 'o' ? T.fg : null, 2);
      tx(s, xx + w / 2, 548, F(SANS, 25, 700), k === 'k' ? T.bg : T.fg, { align: 'center' });
    }, 14);
    if (i < 2) arrow(xx + w + 3, 538, xx + w + 17, 538, T.fg, pr(b, 4.9 + i * 0.5, 0.5), 2.5, 7);
    x += w + 20;
  });
  [['Un KPI de negocio', 7], ['Un responsable con nombre', 7.7]].forEach(([s, t0], i) => {
    const p = pr(b, t0, 0.9), y = 700 + i * 62;
    okBadge(X + 18, y - 10, 16, p);
    appear(p, () => tx(s, X + 52, y, F(SANS, 30, 500), T.fg), 14);
  });
}

function sRole(lt, b) {
  p2(6, ['Tu rol', '*cambia'], ['De escribir consultas a definir la pregunta,', 'fijar el criterio de éxito', 'y validar el resultado.'], b);
  const X = PX, dim = 1 - 0.55 * pr(b, 4.2, 0.8);
  appear(pr(b, 1.6, 1.2), () => {
    ctx.globalAlpha *= dim;
    rr(X, 250, PW, 186, 18, T.card, T.line);
    tx('ANTES', X + 30, 298, F(MONO, 20, 700), T.muted, { ls: 2 });
  });
  ctx.save(); ctx.globalAlpha *= dim;
  typedLines(['SELECT region, SUM(ventas)', 'FROM pedidos GROUP BY 1;'], X + 30, 352, 44, F(MONO, 26, 400), T.fg, b, 2.1, 30);
  ctx.restore();
  arrow(X + PW / 2, 452, X + PW / 2, 500, T.fg, pr(b, 4, 0.7), 4, 14);
  appear(pr(b, 4.4, 1.2), () => {
    rr(X, 516, PW, 300, 18, T.card, T.fg, 2.5);
    tx('AHORA', X + 30, 564, F(MONO, 20, 700), T.muted, { ls: 2 });
  });
  ['Definir la pregunta', 'Fijar el criterio de éxito', 'Validar el resultado'].forEach((s, i) => {
    const p = pr(b, 5 + i * 0.8, 0.9), y = 634 + i * 64;
    okBadge(X + 48, y - 10, 16, p);
    appear(p, () => tx(s, X + 82, y, F(SANS, 30, i === 2 ? 700 : 500), T.fg), 14);
  });
}

function sOutro(lt, b) {
  const wipe = E.io3(pr(b, 0, 0.9));
  T = PAPER; bg();
  ctx.save();
  ctx.beginPath(); ctx.rect(0, H * (1 - wipe), W, H * wipe); ctx.clip();
  T = DARK; bg();
  rise('La ventaja ya no es', 120, 330, F(SERIF, 104, 600), T.soft, pr(b, 0.8, 1.3));
  rise('tener el mejor modelo.', 120, 446, F(SERIF, 104, 600), T.soft, pr(b, 1.1, 1.3));
  rise('Es tener datos, procesos y criterio', 120, 610, F(SERIF, 104, 600, true), T.accent, pr(b, 3.4, 1.3));
  rise('listos para usarlo.', 120, 726, F(SERIF, 104, 600, true), T.accent, pr(b, 3.7, 1.3));
  appear(pr(b, 6.4, 1.2), () => {
    seg(120, 836, 1800, 836, T.line, 1.5);
    tx('FUENTES · anthropic.com/claude/fable y el anuncio de Claude Fable 5.2 (9 nov 2026).', 120, 884, F(MONO, 22, 400), T.muted);
    tx('Cifras publicadas por Anthropic y sus clientes de prueba. La parte 2 son recomendaciones propias.', 120, 922, F(MONO, 22, 400), T.muted);
  });
  ctx.restore();
  if (wipe < 0.5) T = PAPER;
}

// ───────────────────────── línea de tiempo ─────────────────────────
const SRC1 = 'FUENTE · ';
const SC = [
  { id: 'intro', beats: 8, theme: DARK, draw: sIntro },
  { id: 'chart', beats: 12, theme: DARK, draw: sChart, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 1, src: SRC1 + 'Anthropic, anuncio de Claude Fable 5.2 (9 nov 2026) · benchmark Chartography, sin herramientas' },
  { id: 'loop', beats: 12, theme: DARK, draw: sLoop, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 2, src: SRC1 + 'Anthropic, página de Claude Fable 5.2 · «Data analysis and machine learning»' },
  { id: 'honest', beats: 12, theme: DARK, draw: sHonest, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 3, src: 'FUENTES · testimonios de Cognition y Balyasny · auditoría de comportamiento de Anthropic' },
  { id: 'sql', beats: 12, theme: DARK, draw: sSql, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 4, src: 'FUENTES · testimonios de Oracle y Snowflake en el anuncio de Claude Fable 5.2' },
  { id: 'agents', beats: 12, theme: DARK, draw: sAgents, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 5, src: SRC1 + 'Anthropic, tabla de benchmarks de Fable 5.2 · RLI en esfuerzo alto · en AutomationBench lidera Gemini 4 Carbon (53,9 %)' },
  { id: 'cost', beats: 12, theme: DARK, draw: sCost, part: 'PARTE 1 · DÓNDE MEJORÓ', n: 6, src: SRC1 + 'Anthropic · precios de API en USD (entrada / salida) · «hasta 30 % más rápido» que Fable 5.1' },
  { id: 'bridge', beats: 8, theme: DARK, draw: sBridge, own: true },
  { id: 'data', beats: 12, theme: PAPER, draw: sData, part: 'PARTE 2 · ERA AGÉNTICA', n: 1, src: 'RECOMENDACIÓN PROPIA · no es un dato del fabricante' },
  { id: 'evals', beats: 12, theme: PAPER, draw: sEvals, part: 'PARTE 2 · ERA AGÉNTICA', n: 2, src: 'RECOMENDACIÓN PROPIA · no es un dato del fabricante' },
  { id: 'perms', beats: 12, theme: PAPER, draw: sPerms, part: 'PARTE 2 · ERA AGÉNTICA', n: 3, src: 'RECOMENDACIÓN PROPIA · retención de datos: Anthropic, página de Claude Fable 5.2' },
  { id: 'models', beats: 12, theme: PAPER, draw: sModels, part: 'PARTE 2 · ERA AGÉNTICA', n: 4, src: 'ELECCIÓN DE MODELO · Anthropic, anuncio de Claude Fable 5.2 («When to use»)' },
  { id: 'process', beats: 12, theme: PAPER, draw: sProcess, part: 'PARTE 2 · ERA AGÉNTICA', n: 5, src: 'RECOMENDACIÓN PROPIA · no es un dato del fabricante' },
  { id: 'role', beats: 12, theme: PAPER, draw: sRole, part: 'PARTE 2 · ERA AGÉNTICA', n: 6, src: 'RECOMENDACIÓN PROPIA · no es un dato del fabricante' },
  { id: 'outro', beats: 12, theme: PAPER, draw: sOutro, own: true, last: true },
];
let acc = 0;
for (const s of SC) { s.start = acc * BEAT; s.dur = s.beats * BEAT; acc += s.beats; }
const MAIN = acc * BEAT, TOTAL = MAIN + TAIL, TOTAL_FRAMES = Math.round(TOTAL * FPS);

function chrome(t, sc, lt) {
  const b = lt / BEAT;
  if (sc.part) {
    const a = cl(pr(b, 0, 1)) * (1 - pr(lt, sc.dur - 0.28, 0.28));
    ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * a;
    tx('FABLE 5.2 · MIRADA DE ANALISTA DE DATOS', 120, 92, F(MONO, 22, 700), T.muted, { ls: 3 });
    tx(`${sc.part} · 0${sc.n}/06`, 1800, 92, F(MONO, 22, 700), T.muted, { align: 'right', ls: 3 });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = cl(pr(b, 2.5, 1.5)) * (1 - pr(lt, sc.dur - 0.28, 0.28));
    tx(sc.src, 120, 982, F(MONO, 19, 400), T.muted, { ls: 0.5 });
    ctx.restore();
  }
  // barra de progreso con marcas por escena
  const x0 = 120, x1 = 1800, y = 1018;
  ctx.fillStyle = T.line; ctx.fillRect(x0, y, x1 - x0, 4);
  ctx.fillStyle = T === DARK ? T.accent : T.fg; ctx.fillRect(x0, y, (x1 - x0) * cl(t / MAIN), 4);
  ctx.fillStyle = T.bg;
  for (const s of SC) if (s.start > 0) ctx.fillRect(x0 + (x1 - x0) * s.start / MAIN - 2, y - 1, 4, 6);
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  let i = SC.findIndex(s => t < s.start + s.dur);
  if (i < 0) i = SC.length - 1;
  const sc = SC[i], lt = t - sc.start;
  T = sc.theme;
  if (!sc.own) bg();
  ctx.save();
  const ex = sc.last ? 0 : pr(lt, sc.dur - 0.28, 0.28);
  if (ex > 0 && !sc.own) { ctx.globalAlpha = 1 - E.in3(ex); ctx.translate(-70 * E.in3(ex), 0); }
  sc.draw(lt, lt / BEAT);
  ctx.restore();
  chrome(t, sc, lt);
  const fo = pr(t, TOTAL - 1.0, 1.0);
  if (fo > 0) { ctx.fillStyle = `rgba(0,0,0,${E.io3(fo)})`; ctx.fillRect(0, 0, W, H); }
}

window.TOTAL_FRAMES = TOTAL_FRAMES;
window.FPS = FPS;
window.SCENES = SC.map(s => ({ id: s.id, start: s.start, dur: s.dur }));
window.renderFrame = n => render(n / FPS);

const fonts = [F(SERIF, 40, 600), F(SERIF, 40, 600, true), F(SERIF, 40, 400, true), F(SANS, 40, 500), F(SANS, 40, 700), F(MONO, 40, 400), F(MONO, 40, 700)];
window.reelReady = Promise.all(fonts.map(f => document.fonts.load(f, 'Añé¿«»–−·×$%'))).then(() => {
  const q = new URLSearchParams(location.search);
  if (q.has('render')) return;
  if (q.has('t')) { render(+q.get('t')); return; }
  // vista previa con sonido: clic para reproducir
  const play = document.getElementById('play'), music = document.getElementById('music');
  render(1.5); play.hidden = false;
  play.onclick = () => {
    play.hidden = true; music.currentTime = 0; music.play();
    const tick = () => { render(Math.min(music.currentTime, TOTAL - 0.001)); if (!music.ended) requestAnimationFrame(tick); else play.hidden = false; };
    tick();
  };
});
