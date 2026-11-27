// Auto-mejora recursiva: video explicativo de 3 min 15 s, 1920×1080 a 30 fps.
// Cada fotograma es una función pura del tiempo: renderFrame(f) dibuja el fotograma f.
// El mismo archivo exporta los eventos de sonido (window.VIDEO.events) que usa audio.py.
(() => {
'use strict';

const W = 1920, H = 1080, FPS = 30, BAR = 2.5; // 96 BPM, un compás = 2,5 s
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const C = {
  bg: '#0C0D11', ink: '#F4EFE7', dim: 'rgba(244,239,231,0.64)', mute: 'rgba(244,239,231,0.36)',
  line: 'rgba(244,239,231,0.14)', card: 'rgba(244,239,231,0.045)',
  acc: '#FF7A45', teal: '#3ED6C3', amber: '#F7C35C', rose: '#FF5C6C',
};
const F = { head: '"Space Grotesk"', mono: '"JetBrains Mono"', serif: '"Fraunces"' };

// ───────────────────────── utilidades ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = t => 1 - Math.pow(1 - t, 3);
const eio3 = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eoback = t => { const c1 = 1.70158, c3 = c1 + 1; return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;
const fmtN = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// visible entre a y b, con entrada y salida suaves
const win = (t, a, b, fi = 0.45, fo = 0.45) => Math.min(eio3(P(t, a, a + fi)), 1 - eio3(P(t, b - fo, b)));

let SA = 1; // alfa de la escena actual; todo lo que se dibuja se multiplica por él
const A = a => { ctx.globalAlpha = clamp(SA * a); };
const fnt = (size, weight = 500, fam = F.head, style = 'normal') => `${style} ${weight} ${size}px ${fam}`;

function txt(s, x, y, o = {}) {
  ctx.save();
  ctx.font = fnt(o.size || 40, o.weight || 500, o.fam || F.head, o.style || 'normal');
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  ctx.letterSpacing = (o.ls || 0) + 'px';
  A(o.alpha ?? 1);
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}
const label = (s, x, y, o = {}) => txt(s.toUpperCase(), x, y, { size: 22, fam: F.mono, weight: 400, ls: 4, color: C.acc, ...o });

// Texto enriquecido: *palabras* resaltadas, ajuste de línea y aparición palabra por palabra.
function parseRich(s) {
  const pieces = []; let hl = false, cur = '', sp = false;
  const push = () => { if (cur) { pieces.push({ t: cur, hl, sp }); sp = false; cur = ''; } };
  for (const ch of s) {
    if (ch === '*') { push(); hl = !hl; }
    else if (ch === ' ') { push(); sp = true; }
    else cur += ch;
  }
  push();
  const words = [];
  for (const p of pieces) { if (p.sp || !words.length) words.push([p]); else words[words.length - 1].push(p); }
  return words;
}
function rich(s, x, y, t, t0, o = {}) {
  const size = o.size || 44, lh = o.lh || Math.round(size * 1.32), maxW = o.maxW || 1600;
  const stagger = o.stagger ?? 0.07, dur = o.dur ?? 0.5, rise = o.rise ?? size * 0.4;
  ctx.save();
  ctx.font = fnt(size, o.weight || 500, o.fam || F.head, o.style || 'normal');
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  const space = ctx.measureText(' ').width;
  const ws = parseRich(s).map(w => ({ pieces: w, w: w.reduce((a, p) => a + ctx.measureText(p.t).width, 0) }));
  const lines = []; let line = [], lw = 0;
  for (const w of ws) {
    const add = line.length ? space + w.w : w.w;
    if (line.length && lw + add > maxW) { lines.push({ words: line, w: lw }); line = [w]; lw = w.w; }
    else { line.push(w); lw += add; }
  }
  if (line.length) lines.push({ words: line, w: lw });
  const base = o.alpha ?? 1;
  let i = 0;
  lines.forEach((ln, li) => {
    let cx = o.align === 'center' ? x - ln.w / 2 : o.align === 'right' ? x - ln.w : x;
    const cy = y + li * lh;
    for (const w of ln.words) {
      const st = t0 + i * stagger;
      const e = dur > 0 ? eo3(P(t, st, st + dur)) : (t >= st ? 1 : 0);
      if (e > 0) {
        A(base * e);
        let px = cx;
        for (const p of w.pieces) {
          ctx.fillStyle = p.hl ? (o.hl || C.acc) : (o.color || C.ink);
          ctx.fillText(p.t, px, cy + (1 - e) * rise);
          px += ctx.measureText(p.t).width;
        }
      }
      cx += w.w + space; i++;
    }
  });
  ctx.restore();
  return { h: lines.length * lh, n: lines.length, end: t0 + Math.max(0, i - 1) * stagger + dur };
}

function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function glowStroke(color, blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }

// ───────────────────────── iconos dibujados ─────────────────────────
function icon(name, x, y, s, color, p = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, s * 0.075); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const k = s / 2;
  switch (name) {
    case 'check':
      ctx.beginPath(); ctx.moveTo(-k * 0.55, 0); ctx.lineTo(-k * 0.15, k * 0.42); ctx.lineTo(k * 0.6, -k * 0.45); ctx.stroke(); break;
    case 'cross':
      ctx.beginPath(); ctx.moveTo(-k * 0.45, -k * 0.45); ctx.lineTo(k * 0.45, k * 0.45); ctx.moveTo(k * 0.45, -k * 0.45); ctx.lineTo(-k * 0.45, k * 0.45); ctx.stroke(); break;
    case 'code':
      ctx.font = fnt(s * 0.62, 700, F.mono); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('</>', 0, 0); break;
    case 'chat':
      rrect(-k, -k * 0.8, 2 * k, k * 1.35, k * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-k * 0.5, k * 0.55); ctx.lineTo(-k * 0.65, k * 0.95); ctx.lineTo(-k * 0.1, k * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-k * 0.4, -k * 0.12); ctx.lineTo(-k * 0.1, k * 0.15); ctx.lineTo(k * 0.45, -k * 0.38); ctx.stroke(); break;
    case 'clip':
      rrect(-k * 0.75, -k * 0.85, k * 1.5, k * 1.85, k * 0.15); ctx.stroke();
      rrect(-k * 0.35, -k * 1.0, k * 0.7, k * 0.32, k * 0.1); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-k * 0.4, -k * 0.3 + i * k * 0.42); ctx.lineTo(k * 0.4, -k * 0.3 + i * k * 0.42); ctx.stroke(); }
      break;
    case 'flask':
      ctx.beginPath(); ctx.moveTo(-k * 0.28, -k); ctx.lineTo(-k * 0.28, -k * 0.25); ctx.lineTo(-k * 0.85, k * 0.85); ctx.lineTo(k * 0.85, k * 0.85); ctx.lineTo(k * 0.28, -k * 0.25); ctx.lineTo(k * 0.28, -k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-k * 0.45, -k); ctx.lineTo(k * 0.45, -k); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-k * 0.6, k * 0.4); ctx.lineTo(k * 0.6, k * 0.4); ctx.stroke(); break;
    case 'person':
      ctx.beginPath(); ctx.arc(0, -k * 0.38, k * 0.36, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, k * 0.95, k * 0.78, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); break;
    case 'chip':
      rrect(-k * 0.62, -k * 0.62, k * 1.24, k * 1.24, k * 0.15); ctx.stroke();
      rrect(-k * 0.25, -k * 0.25, k * 0.5, k * 0.5, k * 0.06); ctx.fill();
      for (let i = -1; i <= 1; i++) {
        const o = i * k * 0.36;
        ctx.beginPath();
        ctx.moveTo(o, -k * 0.62); ctx.lineTo(o, -k * 0.95); ctx.moveTo(o, k * 0.62); ctx.lineTo(o, k * 0.95);
        ctx.moveTo(-k * 0.62, o); ctx.lineTo(-k * 0.95, o); ctx.moveTo(k * 0.62, o); ctx.lineTo(k * 0.95, o);
        ctx.stroke();
      }
      break;
    case 'clock':
      ctx.beginPath(); ctx.arc(0, 0, k * 0.9, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -k * 0.55); ctx.moveTo(0, 0); ctx.lineTo(k * 0.4, k * 0.2); ctx.stroke(); break;
    case 'shield':
      ctx.beginPath(); ctx.moveTo(0, -k); ctx.lineTo(k * 0.8, -k * 0.65); ctx.quadraticCurveTo(k * 0.8, k * 0.55, 0, k); ctx.quadraticCurveTo(-k * 0.8, k * 0.55, -k * 0.8, -k * 0.65); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-k * 0.32, 0); ctx.lineTo(-k * 0.06, k * 0.26); ctx.lineTo(k * 0.36, -k * 0.24); ctx.stroke(); break;
    case 'eye':
      ctx.beginPath(); ctx.moveTo(-k, 0); ctx.quadraticCurveTo(0, -k * 1.05, k, 0); ctx.quadraticCurveTo(0, k * 1.05, -k, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, k * 0.3, 0, TAU); ctx.fill(); break;
    case 'steps':
      for (let i = 0; i < 3; i++) { rrect(-k * 0.9 + i * k * 0.65, k * 0.8 - (i + 1) * k * 0.5, k * 0.45, (i + 1) * k * 0.5, 3); ctx.fill(); }
      break;
    case 'grid':
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.arc(i * k * 0.45, j * k * 0.45, k * 0.12, 0, TAU); ctx.fill(); }
      break;
    case 'lock': {
      const open = p; // 0 = cerrado, 1 = abierto
      rrect(-k * 0.75, -k * 0.1, k * 1.5, k * 1.1, k * 0.18); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -k * 0.15 - open * k * 0.45, k * 0.48, Math.PI, 0); ctx.lineTo(k * 0.48, -k * 0.15 - open * k * 0.45 + (open > 0.5 ? -k * 0.05 : k * 0.15)); ctx.moveTo(-k * 0.48, -k * 0.15 - open * k * 0.45); ctx.lineTo(-k * 0.48, -k * 0.15 + k * 0.15); ctx.lineWidth = s * 0.11; ctx.stroke();
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, k * 0.38, k * 0.13, 0, TAU); ctx.fill();
      break;
    }
    case 'inf':
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU, d = 1 + Math.sin(a) ** 2; const px = k * Math.cos(a) / d, py = k * Math.sin(a) * Math.cos(a) / d; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke(); break;
  }
  ctx.restore();
}
function badge(name, x, y, r, color, a = 1, sc = 1) {
  ctx.save(); A(a);
  ctx.translate(x, y); ctx.scale(sc, sc);
  ctx.fillStyle = color; ctx.globalAlpha *= 0.16; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.globalAlpha /= 0.16; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  icon(name, 0, 0, r * 1.05, color);
  ctx.restore();
}

// Túnel de cuadrados anidados (Droste): la imagen de la recursión.
function tunnel(t, alpha, cx = 960, cy = 540, speed = 0.3) {
  if (alpha <= 0) return;
  const u = t * speed, k = 0.74, base = 470;
  ctx.save();
  for (let m = Math.ceil(u) - 6; m < Math.ceil(u) + 16; m++) {
    const e = m - u, s = base * Math.pow(k, e);
    if (s < 3 || s > 2600) continue;
    const isAcc = ((m % 5) + 5) % 5 === 0;
    const a = alpha * clamp(s / 60) * clamp((2400 - s) / 1500) * (isAcc ? 0.95 : 0.32);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(e * 0.15 + t * 0.04);
    A(a);
    ctx.strokeStyle = isAcc ? C.acc : C.ink;
    ctx.lineWidth = Math.max(1.2, s * (isAcc ? 0.014 : 0.008));
    rrect(-s, -s, 2 * s, 2 * s, s * 0.14); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ───────────────────────── fondo y HUD ─────────────────────────
function background(t) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const blob = (x, y, r, c0) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, 'rgba(12,13,17,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  blob(820 + 520 * Math.sin(t * 0.061), 330 + 180 * Math.cos(t * 0.047), 980, 'rgba(255,122,69,0.085)');
  blob(1420 + 330 * Math.cos(t * 0.053), 820 + 90 * Math.sin(t * 0.07), 860, 'rgba(62,214,195,0.055)');
  ctx.fillStyle = 'rgba(244,239,231,0.055)';
  const sp = 48, ox = (t * 5) % sp, oy = (t * 2.5) % sp;
  for (let x = -sp + ox; x < W; x += sp) for (let y = -sp + oy; y < H; y += sp) ctx.fillRect(x, y, 2, 2);
}
function vignette() {
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ───────────────────────── escenas ─────────────────────────
// Cada escena recibe su tiempo local t y su duración d. Los tiempos que también
// suenan (teclas, golpes, clics) viven en constantes compartidas con buildEvents().

// 0 · INTRO
const typeTimes = (s, t0, cps, seed) => { const out = []; let tt = t0; for (let i = 0; i < s.length; i++) { out.push(tt); tt += (1 / cps) * (0.55 + 0.9 * hash(seed + i)); } return out; };
const IN = { l1: '¿Puede una IA mejorarse a sí misma?', l2: '¿Y si esa versión mejorada se mejora otra vez?', T1: 0.55, T2: 2.8, title: 5.9 };
IN.k1 = typeTimes(IN.l1, IN.T1, 21, 11);
IN.k2 = typeTimes(IN.l2, IN.T2, 23, 57);

function sIntro(t, d) {
  tunnel(t, (0.12 + 0.55 * eio3(P(t, 2.6, 6.0))) * (1 - 0.5 * P(t, 6.0, 7.0)));
  // líneas que se escriben
  const fly = eio3(P(t, 5.25, 6.0));
  if (fly < 1) {
    ctx.save();
    ctx.translate(960, 540); ctx.scale(1 - 0.75 * fly, 1 - 0.75 * fly); ctx.translate(-960, -540);
    const a = 1 - fly;
    const x0 = 300, size = 46;
    ctx.font = fnt(size, 400, F.mono);
    const cw = ctx.measureText('M').width;
    const lines = [[IN.l1, IN.k1, 500], [IN.l2, IN.k2, 590]];
    let cursorDone = false;
    lines.forEach(([s, ks, y], li) => {
      const n = ks.filter(k => k <= t).length;
      if (t < ks[0] - 0.35 && li === 1) return;
      txt('>', x0 - cw * 2, y, { size, fam: F.mono, weight: 700, color: C.acc, alpha: a * P(t, ks[0] - 0.35, ks[0] - 0.1) });
      txt(s.slice(0, n), x0, y, { size, fam: F.mono, weight: 400, alpha: a });
      const isCur = li === 1 ? t >= ks[0] - 0.35 : t < IN.k2[0] - 0.35;
      if (isCur && !cursorDone) {
        cursorDone = true;
        const typing = n > 0 && n < s.length;
        const on = typing || Math.floor(t * 2.4) % 2 === 0;
        if (on) { ctx.save(); A(a * 0.9); ctx.fillStyle = C.acc; ctx.fillRect(x0 + n * cw + 4, y - size * 0.78, cw * 0.62, size * 0.95); ctx.restore(); }
      }
    });
    ctx.restore();
  }
  // título
  if (t >= IN.title) {
    const g = ctx.createRadialGradient(960, 590, 50, 960, 590, 900);
    g.addColorStop(0, 'rgba(12,13,17,0.85)'); g.addColorStop(1, 'rgba(12,13,17,0)');
    A(P(t, IN.title, IN.title + 0.8)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rows = [['AUTO-MEJORA', 520, C.ink], ['RECURSIVA', 690, C.acc]];
    let idx = 0;
    ctx.save();
    ctx.font = fnt(176, 700, F.head);
    ctx.letterSpacing = '-4px';
    for (const [s, y, col] of rows) {
      const tw = ctx.measureText(s).width;
      let x = 960 - tw / 2;
      for (const ch of s) {
        const cwid = ctx.measureText(ch).width;
        const st = IN.title + idx * 0.034;
        const e = eoback(P(t, st, st + 0.55));
        A(clamp(P(t, st, st + 0.18)));
        ctx.fillStyle = col;
        ctx.fillText(ch, x, y - (1 - e) * 90);
        x += cwid; idx++;
      }
    }
    ctx.restore();
    rich('explicada desde el principio', 960, 790, t, 7.35, { size: 50, fam: F.serif, style: 'italic', weight: 400, color: C.dim, align: 'center', stagger: 0.09 });
    txt('POR CLAUDE  ·  SOBRE CLAUDE', 960, 870, { size: 24, fam: F.mono, ls: 7, color: C.acc, align: 'center', alpha: eo3(P(t, 8.0, 8.6)) });
  }
}

// 1 · LA IDEA (I. J. Good, 1965) y el bucle que se acelera
const ID = { OS: 8.6, d0: 2.0, r: 0.66 };
function orbit(tau) {
  if (tau < 0) return { n: 0, f: 0, dn: ID.d0 };
  let n = 0, acc = 0, dn = ID.d0;
  while (acc + dn <= tau && n < 80) { acc += dn; n++; dn *= ID.r; }
  return { n, f: n >= 80 ? 0 : (tau - acc) / dn, dn };
}
function sIdea(t, d) {
  label('01 — La idea', 160, 170, { alpha: P(t, 0.1, 0.5) });
  const aA = 1 - eio3(P(t, 7.1, 7.8));
  if (aA > 0) {
    const ey = eo3(P(t, 0.3, 1.5));
    txt(String(Math.floor(lerp(1900, 1965, ey))), 150, 560, { size: 250, weight: 700, color: C.acc, ls: -6, alpha: aA * P(t, 0.2, 0.6) });
    txt('I. J. Good', 162, 650, { size: 34, fam: F.mono, weight: 700, alpha: aA * P(t, 1.0, 1.5) });
    txt('matemático británico', 162, 696, { size: 24, fam: F.mono, weight: 400, color: C.dim, alpha: aA * P(t, 1.2, 1.7) });
    const q = rich('«La primera máquina ultrainteligente es el *último invento* que el ser humano necesitará hacer…»', 820, 420, t, 1.6,
      { size: 58, lh: 76, fam: F.serif, style: 'italic', weight: 600, maxW: 950, stagger: 0.085, alpha: aA });
    rich('…siempre que la máquina sea lo bastante dócil como para decirnos cómo mantenerla bajo control.', 820, 420 + q.h + 40, t, 4.5,
      { size: 38, lh: 52, fam: F.serif, style: 'italic', weight: 400, color: C.dim, maxW: 900, stagger: 0.055, alpha: aA });
  }
  if (t < 7.4) return;
  // parte B
  const h1 = rich('La idea: una IA que *mejora su propio diseño*.', 160, 260, t, 7.7, { size: 60, weight: 700, maxW: 1650, stagger: 0.06 });
  rich('Y cada versión, mejor y más rápida que la anterior.', 160, 330, t, 8.45, { size: 38, color: C.dim, stagger: 0.05 });
  const aB = eio3(P(t, 7.9, 8.5));
  // bucle
  const cx = 560, cy = 680, r = 200;
  const o = orbit(t - ID.OS);
  ctx.save();
  A(aB * 0.35); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  const speed = 1 / o.dn;
  if (o.n < 9) {
    const ang = -Math.PI / 2 + o.f * TAU;
    const trail = Math.min(0.93, 0.2 + 0.11 * speed);
    for (let i = 0; i < 40; i++) {
      const a0 = ang - trail * TAU * (i / 40), a1 = ang - trail * TAU * ((i + 1) / 40);
      A(aB * (1 - i / 40)); ctx.strokeStyle = C.acc; ctx.lineWidth = 7 - i * 0.12;
      ctx.beginPath(); ctx.arc(cx, cy, r, a1, a0); ctx.stroke();
    }
    A(aB); glowStroke(C.acc, 26); ctx.fillStyle = C.acc;
    ctx.beginPath(); ctx.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 13, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    A(aB); glowStroke(C.acc, 40); ctx.strokeStyle = C.acc; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();
  // número de versión en el centro (salta con cada vuelta)
  const pop = eoback(P(t - ID.OS, orbitStart(o.n), orbitStart(o.n) + Math.min(0.35, o.dn)));
  if (o.n < 9) {
    ctx.save(); ctx.translate(cx, cy + 40); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
    txt('v' + (o.n + 1), 0, 0, { size: 116, weight: 700, align: 'center', alpha: aB });
    ctx.restore();
  } else {
    ctx.save(); A(aB); icon('inf', cx, cy, 170, C.ink); ctx.restore();
  }
  txt('se rediseña a sí misma', cx, cy + r + 70, { size: 24, fam: F.mono, color: C.dim, align: 'center', alpha: aB });
  // gráfica: capacidad contra tiempo
  const x0 = 1010, x1 = 1730, y0 = 900, y1 = 450;
  ctx.save();
  A(aB * 0.5); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y1 - 40); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
  ctx.restore();
  txt('capacidad', x0 + 16, y1 - 30, { size: 22, fam: F.mono, color: C.dim, alpha: aB });
  txt('tiempo', x1, y0 + 40, { size: 22, fam: F.mono, color: C.dim, align: 'right', alpha: aB });
  const tau = clamp(t - ID.OS, 0, 6.2);
  const capY = tt => { const s = orbit(tt); return y0 - (Math.pow(1.5, s.n + s.f) - 1) / (Math.pow(1.5, 7) - 1) * (y0 - y1); };
  const tx = tt => x0 + tt / 6.0 * (x1 - x0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, 330, x1 - x0 + 40, y0 - 330 + 4); ctx.clip();
  A(aB); ctx.strokeStyle = C.acc; ctx.lineWidth = 5; glowStroke(C.acc, 18);
  ctx.beginPath();
  const N = 300;
  for (let i = 0; i <= N; i++) { const tt = tau * i / N; const y = Math.max(300, capY(tt)); i ? ctx.lineTo(tx(tt), y) : ctx.moveTo(tx(tt), y); }
  ctx.stroke(); ctx.shadowBlur = 0;
  let acc = 0, dn = ID.d0;
  for (let n = 1; n < 12; n++) { acc += dn; dn *= ID.r; if (acc > tau) break; const y = capY(acc); if (y < 340) break; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(tx(acc), y, 6, 0, TAU); ctx.fill(); }
  ctx.restore();
  rich('«explosión de inteligencia»', x0 + 40, y1 + 40, t, 12.3, { size: 40, fam: F.serif, style: 'italic', weight: 600, color: C.acc, stagger: 0.1 });
  txt('una hipótesis, no un hecho comprobado', x0 + 42, y1 + 86, { size: 22, fam: F.mono, color: C.dim, alpha: P(t, 13.0, 13.5) });
}
function orbitStart(n) { let acc = 0, dn = ID.d0; for (let i = 0; i < n; i++) { acc += dn; dn *= ID.r; } return acc; }

// 2 · DESDE EL PRINCIPIO: cómo se hace un modelo como yo
const OR = { st: [2.6, 10, 19, 27, 32.5, 40], nodes: ['Datos', 'Preentrenamiento', 'Ajuste', 'Evaluación', 'Claude'],
  bars: [12.0, 12.25, 12.5], fill: 13.6, quick: [15.1, 15.85, 16.5, 17.05, 17.55, 18.0, 18.45], ab: 21.6, checks: [28.4, 29.1, 29.8, 30.5], lock: 35.3 };
const TOKENS = ['libros', 'def f(x):', 'receta', 'teorema', 'Había una vez', 'HTTP/1.1', '¿por qué?', 'poema', 'E = mc²', 'for i in range', 'noticia', '</div>', 'hola', 'ensayo', 'SELECT *', 'carta', 'manual', 'diálogo', 'wiki', 'git commit', 'canción', 'mapa', 'artículo', 'foro', 'tesis', 'guion'];
const QUICK = [['La capital de Francia es', 'París'], ['2 + 2 =', '4'], ['Había una vez un', 'rey'], ['def suma(a, b): return a', '+ b'], ['Me duele la', 'cabeza'], ['El cielo es', 'azul']];

function sOrigen(t, d) {
  label('02 — Desde el principio', 160, 170, { alpha: P(t, 0.1, 0.5) });
  rich('¿Cómo se hace un modelo *como yo*?', 160, 255, t, 0.25, { size: 68, weight: 700, stagger: 0.07 });
  const st = OR.st;
  let active = -1;
  for (let i = 0; i < 5; i++) if (t >= st[i]) active = i;
  // tubería de etapas
  const xs = [260, 610, 960, 1310, 1660], ny = 405, nr = 44;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const a = P(t, 0.9 + i * 0.25, 1.4 + i * 0.25);
    A(a * 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xs[i] + nr + 8, ny); ctx.lineTo(xs[i + 1] - nr - 8, ny); ctx.stroke();
    const fill = i < active ? 1 : i === active ? P(t, st[i + 1] - 0.6, st[i + 1]) : 0;
    if (fill > 0) {
      A(a); ctx.strokeStyle = C.acc; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(xs[i] + nr + 8, ny); ctx.lineTo(lerp(xs[i] + nr + 8, xs[i + 1] - nr - 8, fill), ny); ctx.stroke();
    }
  }
  ctx.restore();
  for (let i = 0; i < 5; i++) {
    const t0 = 0.8 + i * 0.25;
    const e = eoback(P(t, t0, t0 + 0.5));
    if (e <= 0) continue;
    const on = i === active, done = i < active;
    const pulse = on ? 1 + 0.05 * Math.sin(t * 5) : 1;
    ctx.save(); ctx.translate(xs[i], ny); ctx.scale(e * pulse, e * pulse);
    A(1); ctx.fillStyle = on ? 'rgba(255,122,69,0.18)' : C.card; ctx.beginPath(); ctx.arc(0, 0, nr, 0, TAU); ctx.fill();
    ctx.strokeStyle = on ? C.acc : done ? C.teal : C.line; ctx.lineWidth = on ? 4 : 2;
    if (on) glowStroke(C.acc, 24);
    ctx.beginPath(); ctx.arc(0, 0, nr, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    if (i < 4) txt(String(i + 1), 0, 12, { size: 34, fam: F.mono, weight: 700, align: 'center', color: on ? C.acc : done ? C.teal : C.dim });
    else icon('grid', 0, 0, 46, on ? C.acc : C.dim);
    ctx.restore();
    txt(OR.nodes[i].toUpperCase(), xs[i], ny + nr + 46, { size: 22, fam: F.mono, ls: 2, align: 'center', color: on ? C.ink : C.dim, alpha: P(t, t0 + 0.2, t0 + 0.6) });
  }
  const TX = 160, TY = 640, TW = 760, VX = 1010;
  const tOpt = { size: 44, lh: 58, maxW: TW, stagger: 0.05 };
  // etapa 1 · datos
  let a = win(t, st[0], st[1]);
  if (a > 0) {
    rich('*Datos.* Enormes cantidades de texto: libros, artículos, código, páginas web.', TX, TY, t, st[0] + 0.3, { ...tOpt, alpha: a });
    ctx.save();
    ctx.beginPath(); ctx.rect(VX - 20, 570, 790, 400); ctx.clip();
    ctx.font = fnt(25, 400, F.mono); ctx.letterSpacing = '0px';
    for (let lane = 0; lane < 7; lane++) {
      const y = 610 + lane * 54;
      const v = 70 + 70 * hash(lane + 3);
      const list = TOKENS.map((s, i) => [s, hash(i * 7 + lane * 13)]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
      const ws = list.map(s => ctx.measureText(s).width + 34);
      const total = ws.reduce((p, q) => p + q + 16, 0);
      let x = VX - 20 - ((t * v + hash(lane) * total) % total);
      for (let rep = 0; rep < 3; rep++) for (let i = 0; i < list.length; i++) {
        if (x > VX + 780) break;
        if (x + ws[i] > VX - 20) {
          const ea = clamp((x - VX + 20) / 140) * clamp((VX + 770 - x - ws[i]) / 140);
          const hot = hash(i * 3 + lane) > 0.82;
          A(a * ea * (hot ? 1 : 0.75));
          ctx.strokeStyle = hot ? C.acc : C.line; ctx.lineWidth = 1.5;
          rrect(x, y - 30, ws[i], 42, 21); ctx.stroke();
          ctx.fillStyle = hot ? C.acc : C.dim; ctx.fillText(list[i], x + 17, y - 1);
        }
        x += ws[i] + 16;
      }
    }
    ctx.restore();
  }
  // etapa 2 · preentrenamiento
  a = win(t, st[1], st[2]);
  if (a > 0) {
    const r1 = rich('*Preentrenamiento.* Aprendo una sola tarea: predecir la siguiente palabra.', TX, TY, t, st[1] + 0.3, { ...tOpt, alpha: a });
    rich('Repetido con billones de palabras, eso me obliga a aprender gramática, hechos y formas de razonar.', TX, TY + r1.h + 30, t, 14.6,
      { size: 32, lh: 44, maxW: TW, color: C.dim, stagger: 0.035, alpha: a });
    const aMain = a * (1 - eio3(P(t, 14.75, 15.1)));
    if (aMain > 0) {
      const pre = 'El agua hierve a 100';
      const n = Math.floor(clamp((t - 10.8) * 28, 0, pre.length));
      const w = txt(pre.slice(0, n), VX, 650, { size: 40, fam: F.mono, alpha: aMain });
      ctx.save();
      ctx.font = fnt(40, 400, F.mono);
      const fullW = ctx.measureText(pre + ' ').width;
      ctx.restore();
      const fillE = eoback(P(t, OR.fill, OR.fill + 0.45));
      if (t > 11.6) {
        ctx.save(); A(aMain * (t < OR.fill ? (Math.floor(t * 3) % 2 ? 0.5 : 1) : 1));
        ctx.setLineDash([8, 7]); ctx.strokeStyle = C.acc; ctx.lineWidth = 2.5;
        rrect(VX + fullW, 606, 180, 60, 10); ctx.stroke(); ctx.setLineDash([]);
        if (t >= OR.fill) { ctx.fillStyle = 'rgba(255,122,69,0.16)'; ctx.fill(); }
        ctx.restore();
        if (t >= OR.fill) { ctx.save(); ctx.translate(VX + fullW + 90, 648); ctx.scale(fillE, fillE); txt('grados', 0, 0, { size: 40, fam: F.mono, weight: 700, color: C.acc, align: 'center', alpha: aMain }); ctx.restore(); }
      }
      const opts = [['grados', 0.86], ['°C', 0.11], ['metros', 0.01]];
      opts.forEach(([s, p], i) => {
        const y = 745 + i * 66, t0 = OR.bars[i];
        const e = eo3(P(t, t0, t0 + 0.7));
        if (e <= 0) return;
        txt(s, VX, y, { size: 30, fam: F.mono, color: i ? C.dim : C.ink, alpha: aMain * P(t, t0, t0 + 0.3) });
        ctx.save(); A(aMain * 0.16); ctx.fillStyle = C.ink; rrect(VX + 170, y - 26, 440, 32, 8); ctx.fill();
        A(aMain); ctx.fillStyle = i ? C.mute : C.acc; rrect(VX + 170, y - 26, Math.max(10, 440 * p * e), 32, 8); ctx.fill(); ctx.restore();
        txt(Math.round(p * 100 * e) + ' %', VX + 630, y, { size: 26, fam: F.mono, color: C.dim, alpha: aMain * e });
      });
    }
    // ejemplos rápidos: la misma tarea, una y otra vez
    if (t > 15.0) {
      const q = OR.quick;
      for (let i = 0; i < QUICK.length; i++) {
        const t0 = q[i], t1 = q[i + 1];
        if (t < t0 || t >= t1) continue;
        const ai = a * Math.min(P(t, t0, t0 + 0.08), 1 - P(t, t1 - 0.1, t1 - 0.01));
        const [pre, ans] = QUICK[i];
        const w = txt(pre + ' ', VX, 700, { size: 40, fam: F.mono, alpha: ai });
        const tA = lerp(t0, t1, 0.45), e = eoback(P(t, tA, tA + 0.22));
        if (e > 0) { ctx.save(); ctx.translate(VX + w, 700); ctx.scale(1, e); txt(ans, 0, 0, { size: 40, fam: F.mono, weight: 700, color: C.acc, alpha: ai }); ctx.restore(); }
      }
      const ce = Math.pow(P(t, 15.1, 18.5), 1.6);
      const count = Math.floor(Math.pow(10, 12 * ce));
      txt('predicciones:', VX, 830, { size: 26, fam: F.mono, color: C.dim, alpha: a * P(t, 15.0, 15.4) });
      txt(t > 18.5 ? 'billones' : fmtN(count), VX + 230, 830, { size: 26, fam: F.mono, weight: 700, color: t > 18.5 ? C.acc : C.ink, alpha: a * P(t, 15.0, 15.4) });
    }
  }
  // etapa 3 · ajuste
  a = win(t, st[2], st[3]);
  if (a > 0) {
    const r1 = rich('*Ajuste.* Después, personas y una lista de principios me enseñan a ser útil, honesto e inofensivo.', TX, TY, t, st[2] + 0.3, { ...tOpt, alpha: a });
    rich('Parte de esa retroalimentación la da otra IA, guiada por esos mismos principios.', TX, TY + r1.h + 30, t, 23.6,
      { size: 32, lh: 44, maxW: TW, color: C.dim, stagger: 0.04, alpha: a });
    label('¿Cuál respuesta es mejor?', VX, 600, { color: C.dim, alpha: a * P(t, 19.8, 20.3) });
    const cards = [['A', VX, 0.6], ['B', VX + 400, 0.8]];
    cards.forEach(([nm, x, dl], ci) => {
      const t0 = st[2] + dl + 0.4, e = eo3(P(t, t0, t0 + 0.5));
      if (e <= 0) return;
      const chosen = t >= OR.ab;
      const dimB = ci === 1 && chosen ? 1 - 0.6 * P(t, OR.ab, OR.ab + 0.4) : 1;
      ctx.save(); A(a * e * dimB); ctx.translate(0, (1 - e) * 30);
      ctx.fillStyle = C.card; rrect(x, 630, 360, 240, 18); ctx.fill();
      ctx.strokeStyle = ci === 0 && chosen ? C.teal : C.line; ctx.lineWidth = ci === 0 && chosen ? 3 : 1.5;
      if (ci === 0 && chosen) glowStroke(C.teal, 20 * P(t, OR.ab, OR.ab + 0.3));
      rrect(x, 630, 360, 240, 18); ctx.stroke(); ctx.shadowBlur = 0;
      txt(nm, x + 30, 690, { size: 34, fam: F.mono, weight: 700, color: C.dim, alpha: a * e * dimB });
      const ls = ci === 0 ? [0.85, 0.7, 0.9, 0.5] : [0.75, 0.9, 0.6, 0.8];
      ls.forEach((wf, li) => { A(a * e * dimB * 0.35); ctx.fillStyle = C.ink; rrect(x + 30, 725 + li * 34, 300 * wf, 14, 7); ctx.fill(); });
      ctx.restore();
      if (chosen) {
        const be = eoback(P(t, OR.ab + (ci ? 0.15 : 0), OR.ab + 0.5 + (ci ? 0.15 : 0)));
        badge(ci ? 'cross' : 'check', x + 330, 640, 30, ci ? C.rose : C.teal, a, be);
      }
    });
    txt('→ ajusta los pesos', VX, 930, { size: 26, fam: F.mono, color: C.teal, alpha: a * P(t, 22.6, 23.1) });
  }
  // etapa 4 · evaluación
  a = win(t, st[3], st[4]);
  if (a > 0) {
    rich('*Evaluación.* Antes de publicarme, me ponen a prueba: qué sé hacer y qué riesgos podría tener.', TX, TY, t, st[3] + 0.3, { ...tOpt, alpha: a });
    const rows = ['Razonamiento', 'Programación', 'Usos peligrosos', 'Autonomía'];
    rows.forEach((s, i) => {
      const y = 640 + i * 82, t0 = OR.checks[i] - 0.9;
      const e = eo3(P(t, t0 - 0.3, t0 + 0.1));
      if (e <= 0) return;
      txt(s, VX, y, { size: 30, fam: F.mono, alpha: a * e });
      const f = eio3(P(t, t0, OR.checks[i]));
      ctx.save(); A(a * e * 0.16); ctx.fillStyle = C.ink; rrect(VX + 330, y - 20, 300, 14, 7); ctx.fill();
      A(a * e); ctx.fillStyle = i >= 2 ? C.amber : C.teal; rrect(VX + 330, y - 20, Math.max(14, 300 * f), 14, 7); ctx.fill(); ctx.restore();
      if (t >= OR.checks[i]) badge('check', VX + 680, y - 13, 22, C.teal, a, eoback(P(t, OR.checks[i], OR.checks[i] + 0.4)));
    });
  }
  // etapa 5 · los pesos, congelados
  a = win(t, st[4], st[5] + 1, 0.45, 0.01);
  if (a > 0) {
    const r1 = rich('El resultado: miles de millones de números. Son mis *pesos*.', TX, 615, t, st[4] + 0.3, { ...tOpt, size: 42, lh: 56, alpha: a });
    const y2 = 615 + r1.h + 26;
    const r2 = rich('Mientras hablamos, esos números *no cambian*.', TX, y2, t, OR.lock - 0.2, { ...tOpt, size: 42, lh: 56, weight: 700, alpha: a });
    rich('Lo que recuerdo de esta conversación vive en el contexto, no en mis pesos.', TX, y2 + r2.h + 24, t, 37.0,
      { size: 30, lh: 42, maxW: TW, color: C.dim, stagger: 0.04, alpha: a });
    const frozen = t >= OR.lock;
    const tick = frozen ? Math.floor(OR.lock * 15) : Math.floor(t * 15);
    ctx.save(); ctx.font = fnt(26, 400, F.mono); ctx.textAlign = 'center';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      const id = r * 7 + c;
      const appear = P(t, st[4] + 0.2 + id * 0.012, st[4] + 0.5 + id * 0.012);
      if (appear <= 0) continue;
      const v = (hash(id * 31 + (frozen ? tick : tick + id % 3) * 7.3) * 2 - 1) * 1.6;
      const s = (v < 0 ? '−' : ' ') + Math.abs(v).toFixed(2);
      A(a * appear * (frozen ? 0.55 : 0.85));
      ctx.fillStyle = frozen ? C.dim : (hash(id + tick) > 0.86 ? C.acc : C.ink);
      ctx.fillText(s, VX + 50 + c * 106, 615 + r * 58);
    }
    ctx.restore();
    if (t >= OR.lock - 0.5) {
      const e = eoback(P(t, OR.lock - 0.5, OR.lock - 0.1));
      const close = 1 - eio3(P(t, OR.lock - 0.15, OR.lock));
      ctx.save(); A(a * clamp(e)); ctx.translate(VX + 368, 745); ctx.scale(e, e);
      ctx.fillStyle = 'rgba(12,13,17,0.92)'; ctx.beginPath(); ctx.arc(0, 0, 82, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.acc; ctx.lineWidth = 3; glowStroke(C.acc, 22); ctx.beginPath(); ctx.arc(0, 0, 82, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
      icon('lock', 0, 4, 76, C.acc, close);
      ctx.restore();
    }
  }
}

// 3 · EL BUCLE REAL
const BU = { cards: [3.2, 6.2, 9.2, 12.2], L0: 22.0, phases: [1.275, 0.5, 0.675, 0.5, 1.05], ths: [Math.PI, 1.85 * Math.PI, 1.85 * Math.PI, 2.3 * Math.PI, 2.3 * Math.PI, 3 * Math.PI] };
BU.LD = BU.phases.reduce((p, q) => p + q, 0);
function loopState(lt) {
  const tau = lt - BU.L0;
  if (tau < 0) return { th: Math.PI, k: 0, tl: 0 };
  const k = Math.floor(tau / BU.LD); let r = tau - k * BU.LD;
  for (let i = 0; i < 5; i++) {
    if (r < BU.phases[i] || i === 4) { const f = clamp(r / BU.phases[i]); return { th: lerp(BU.ths[i], BU.ths[i + 1], i % 2 ? 0 : eio3(f)), k, phase: i, f }; }
    r -= BU.phases[i];
  }
}
const CARDS = [
  ['code', 'Código', 'Ayudo a escribir el software con el que se entrenan y se prueban los modelos.'],
  ['chat', 'Retroalimentación', 'Critico respuestas según principios escritos. Eso se vuelve datos de entrenamiento.'],
  ['clip', 'Evaluaciones', 'Ayudo a crear y calificar pruebas, y a buscar fallos antes de cada lanzamiento.'],
  ['flask', 'Investigación', 'Ayudo a diseñar experimentos y a analizar sus resultados.'],
];
function sBucle(t, d) {
  label('03 — El bucle real', 160, 170, { alpha: P(t, 0.1, 0.5) });
  const aA = 1 - eio3(P(t, 18.6, 19.3));
  if (aA > 0) {
    rich('Entonces, ¿dónde está el bucle?', 160, 255, t, 0.25, { size: 68, weight: 700, stagger: 0.07, alpha: aA });
    const subA = 1 - eio3(P(t, 14.9, 15.3));
    rich('No está dentro de mí. Está *a mi alrededor*.', 160, 325, t, 1.7, { size: 40, color: C.dim, stagger: 0.07, alpha: aA * subA });
    if (t > 15.3) rich('Modelos como yo ya hacemos una *parte creciente* de ese trabajo, junto a personas.', 160, 325, t, 15.4, { size: 40, color: C.dim, stagger: 0.05, alpha: aA });
    const cx = 960, cy = 675;
    const ne = eoback(P(t, 2.4, 3.0));
    const pos = [[120, 400], [1320, 400], [120, 720], [1320, 720]];
    const cw = 480, chh = 230;
    // conectores y partículas
    pos.forEach(([x, y], i) => {
      const t0 = BU.cards[i];
      const e = eio3(P(t, t0 - 0.5, t0));
      if (e <= 0) return;
      const left = i % 2 === 0;
      const ex = left ? x + cw : x, ey = y + chh / 2;
      const sx = cx + (left ? -1 : 1) * 96, sy = cy;
      const mx = lerp(sx, ex, 0.5);
      const pt = f => { const u = 1 - f; return [u * u * u * sx + 3 * u * u * f * mx + 3 * u * f * f * mx + f * f * f * ex, u * u * u * sy + 3 * u * u * f * sy + 3 * u * f * f * ey + f * f * f * ey]; };
      ctx.save(); A(aA * 0.35); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
      ctx.beginPath(); for (let k = 0; k <= 40; k++) { const [px, py] = pt(k / 40 * e); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
      if (e >= 1) for (let k = 0; k < 4; k++) {
        const f = ((t - t0) * 0.55 + k / 4) % 1;
        const [px, py] = pt(f);
        A(aA * Math.sin(f * Math.PI)); ctx.fillStyle = C.acc; glowStroke(C.acc, 12);
        ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      }
      ctx.restore();
    });
    // nodo central
    if (ne > 0) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(ne, ne); A(aA);
      ctx.fillStyle = 'rgba(255,122,69,0.14)'; ctx.beginPath(); ctx.arc(0, 0, 92, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.acc; ctx.lineWidth = 3.5; glowStroke(C.acc, 30); ctx.beginPath(); ctx.arc(0, 0, 92, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
      txt('Claude', 0, 8, { size: 40, weight: 700, align: 'center', alpha: aA });
      txt('hoy', 0, 44, { size: 20, fam: F.mono, color: C.dim, align: 'center', alpha: aA });
      ctx.restore();
    }
    // tarjetas
    pos.forEach(([x, y], i) => {
      const t0 = BU.cards[i], e = eo3(P(t, t0, t0 + 0.6));
      if (e <= 0) return;
      const [ic, title, desc] = CARDS[i];
      ctx.save(); A(aA * e); ctx.translate((i % 2 ? 1 : -1) * (1 - e) * 40, 0);
      ctx.fillStyle = C.card; rrect(x, y, cw, chh, 20); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; rrect(x, y, cw, chh, 20); ctx.stroke();
      badge(ic, x + 62, y + 62, 32, C.acc, aA * e);
      txt(title, x + 112, y + 74, { size: 34, weight: 700, alpha: aA * e });
      rich(desc, x + 32, y + 136, t, t0 + 0.25, { size: 24, lh: 33, maxW: cw - 64, color: C.dim, stagger: 0.02, dur: 0.35, alpha: aA * e });
      ctx.restore();
    });
  }
  if (t < 18.8) return;
  // parte B: el bucle entre generaciones
  rich('Cada generación ayuda a construir *la siguiente*.', 160, 255, t, 19.3, { size: 64, weight: 700, stagger: 0.07 });
  rich('Eso sí es un bucle recursivo… con *personas* dentro.', 160, 325, t, 20.6, { size: 40, color: C.dim, stagger: 0.07, hl: C.teal });
  const aB = eio3(P(t, 19.4, 20.2));
  const cx = 960, cy = 690, rx = 540, ry = 225;
  const ell = th => [cx + rx * Math.cos(th), cy + ry * Math.sin(th)];
  const ls = loopState(t);
  ctx.save();
  A(aB * 0.3); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([3, 10]);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // estela del punto
  if (t >= BU.L0) {
    for (let i = 0; i < 50; i++) {
      const th0 = ls.th - i * 0.02, th1 = ls.th - (i + 1) * 0.02;
      const [x0, y0] = ell(th0), [x1, y1] = ell(th1);
      A(aB * (1 - i / 50)); ctx.strokeStyle = C.acc; ctx.lineWidth = 6 - i * 0.1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
  ctx.restore();
  // punto
  if (t >= BU.L0) {
    const [x, y] = ell(ls.th);
    ctx.save(); A(aB); ctx.fillStyle = C.acc; glowStroke(C.acc, 26); ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill(); ctx.restore();
  }
  // puertas con personas
  const gates = [[1.85 * Math.PI, 'personas deciden qué se entrena', 1], [2.3 * Math.PI, 'personas deciden si se publica', 3]];
  gates.forEach(([th, s, ph], gi) => {
    const [gx, gy] = ell(th);
    const e = eoback(P(t, 20.6 + gi * 0.3, 21.1 + gi * 0.3));
    if (e <= 0) return;
    const here = ls.phase === ph;
    ctx.save(); ctx.translate(gx, gy); ctx.scale(e, e); A(aB);
    ctx.fillStyle = C.bg; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.teal; ctx.lineWidth = here ? 4 : 2; if (here) glowStroke(C.teal, 24);
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    icon('person', 0, 2, 36, C.teal);
    ctx.restore();
    txt(s, gx, gy + (gi ? 66 : -48), { size: 21, fam: F.mono, color: C.teal, align: 'center', alpha: aB * P(t, 21.0 + gi * 0.3, 21.5 + gi * 0.3) });
  });
  // nodos
  const gen = ls.k + 1;
  const nodePill = (th, s, w, col, t0) => {
    const [x, y] = ell(th); const e = eoback(P(t, t0, t0 + 0.5)); if (e <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); A(aB);
    ctx.fillStyle = '#15161B'; rrect(-w / 2, -30, w, 60, 30); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rrect(-w / 2, -30, w, 60, 30); ctx.stroke();
    txt(s, 0, 9, { size: 23, fam: F.mono, align: 'center', alpha: aB });
    ctx.restore();
  };
  nodePill(1.5 * Math.PI, 'herramientas · datos · pruebas', 470, C.line, 19.9);
  nodePill(2 * Math.PI, 'entrenamiento', 260, C.line, 20.1);
  const claudeNode = (th, g, t0, hot) => {
    const [x, y] = ell(th); const e = eoback(P(t, t0, t0 + 0.5)); if (e <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(e, e); A(aB);
    ctx.fillStyle = '#1A1513'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.acc; ctx.lineWidth = hot ? 4 : 2.5; if (hot) glowStroke(C.acc, 26);
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    txt('Claude', 0, 2, { size: 30, weight: 700, align: 'center', alpha: aB });
    txt('gen ' + g, 0, 34, { size: 21, fam: F.mono, color: C.acc, align: 'center', alpha: aB });
    ctx.restore();
  };
  const nearStart = ls.phase === 0 && ls.f < 0.12;
  claudeNode(Math.PI, gen, 19.7, nearStart && t >= BU.L0 + BU.LD * 0.9);
  claudeNode(2.5 * Math.PI, gen + 1, 20.3, ls.phase === 4 && ls.f > 0.15 && ls.f < 0.55);
}

// 4 · LOS FRENOS
const PU = { xs: [420, 780, 1140, 1500], arr: [2.0, 4.4, 6.8, 9.2] };
PU.open = PU.arr.map(a => a + 1.3); PU.dep = PU.arr.map(a => a + 1.6);
const GATES = [
  ['person', 'Decisión humana', 'Personas eligen qué entrenar y cuándo publicar.'],
  ['chip', 'Cómputo y energía', 'Chips y centros de datos: un límite físico.'],
  ['clock', 'Tiempo', 'Entrenar un modelo grande lleva semanas o meses.'],
  ['shield', 'Verificación', 'Hay que comprobar que la mejora es real y segura.'],
];
function dotX(t) {
  const stops = PU.xs.map(x => x - 34);
  if (t < 1.2) return 160;
  if (t < PU.arr[0]) return lerp(160, stops[0], eio3(P(t, 1.2, PU.arr[0])));
  for (let i = 0; i < 4; i++) {
    if (t < PU.dep[i]) return stops[i];
    const nx = i < 3 ? stops[i + 1] : 1760, na = i < 3 ? PU.arr[i + 1] : PU.dep[3] + 0.8;
    if (t < na) return lerp(stops[i], nx, eio3(P(t, PU.dep[i], na)));
  }
  return 1760;
}
function sPuertas(t, d) {
  label('04 — Los frenos', 160, 170, { alpha: P(t, 0.1, 0.5) });
  const aT = 1 - eio3(P(t, 18.0, 18.4));
  rich('Cada vuelta pasa por puertas que *no controlo*.', 160, 255, t, 0.25, { size: 68, weight: 700, stagger: 0.07, alpha: aT });
  const aA = 1 - eio3(P(t, 12.6, 13.3));
  if (aA > 0) {
    const y = 520;
    ctx.save(); A(aA * 0.3 * P(t, 0.6, 1.2)); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(1760, y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    const dx = dotX(t);
    ctx.save(); A(aA * 0.8); ctx.strokeStyle = C.acc; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(dx, y); ctx.stroke(); ctx.restore();
    GATES.forEach(([ic, title, desc], i) => {
      const gx = PU.xs[i];
      const e = eo3(P(t, 0.6 + i * 0.15, 1.1 + i * 0.15));
      const open = eoback(P(t, PU.open[i], PU.open[i] + 0.5));
      const reached = t >= PU.arr[i] - 0.1;
      ctx.save(); A(aA * e);
      ctx.strokeStyle = reached ? C.teal : C.dim; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx - 6, y - 60); ctx.lineTo(gx - 6, y + 60); ctx.moveTo(gx + 6 + 0, y - 60); ctx.stroke();
      ctx.translate(gx, y - 46); ctx.rotate(-open * 1.45);
      ctx.strokeStyle = reached ? C.teal : C.dim; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 92); ctx.stroke();
      ctx.restore();
      badge(ic, gx, y - 130, 34, reached ? C.teal : C.dim, aA * e);
      const la = aA * eo3(P(t, PU.arr[i] - 0.1, PU.arr[i] + 0.4));
      if (la > 0) {
        txt(title, gx, y + 120, { size: 32, weight: 700, align: 'center', alpha: la });
        rich(desc, gx, y + 165, t, PU.arr[i] + 0.1, { size: 24, lh: 33, maxW: 300, color: C.dim, align: 'center', stagger: 0.03, dur: 0.35, alpha: aA });
      }
    });
    ctx.save(); A(aA * P(t, 0.9, 1.3)); ctx.fillStyle = C.acc; glowStroke(C.acc, 24); ctx.beginPath(); ctx.arc(dx, y, 13, 0, TAU); ctx.fill(); ctx.restore();
  }
  if (t < 13.0) return;
  // parte B: teoría contra hoy
  rich('Hoy es *aceleración asistida*, no una explosión autónoma.', 160, 255, t, 18.4, { size: 54, weight: 700, maxW: 1680, stagger: 0.06 });
  rich('Cuánto podría acelerarse en el futuro sigue siendo una pregunta abierta.', 160, 325, t, 19.6, { size: 36, color: C.dim, stagger: 0.05 });
  const aB = eio3(P(t, 13.2, 13.9));
  const x0 = 360, x1 = 1560, y0 = 920, y1 = 440;
  ctx.save(); A(aB * 0.5); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y1 - 30); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 40, y0); ctx.stroke(); ctx.restore();
  txt('capacidad', x0 + 16, y1 - 18, { size: 22, fam: F.mono, color: C.dim, alpha: aB });
  txt('tiempo', x1 + 40, y0 + 40, { size: 22, fam: F.mono, color: C.dim, align: 'right', alpha: aB });
  const pr = eio3(P(t, 13.8, 17.6));
  const theory = u => (Math.exp(6 * u) - 1) / (Math.exp(6) - 1) * 1.25;
  const today = u => 0.5 * (u - Math.sin(TAU * u * 6) / (TAU * 6));
  const curve = (fn, col, dash, w) => {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, 380, x1 - x0 + 60, y0 - 380); ctx.clip();
    A(aB); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash); glowStroke(col, 14);
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const u = pr * i / 240; const px = lerp(x0, x1, u), py = y0 - fn(u) * (y0 - y1); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.restore();
  };
  curve(theory, C.rose, [14, 12], 4);
  curve(today, C.teal, [], 5);
  txt('teoría: explosión autónoma', 1460, 470, { size: 30, fam: F.serif, style: 'italic', weight: 600, color: C.rose, align: 'right', alpha: aB * P(t, 16.6, 17.2) });
  txt('hoy: progreso rápido, con frenos', 560, 740, { size: 30, fam: F.serif, style: 'italic', weight: 600, color: C.teal, alpha: aB * P(t, 17.2, 17.8) });
}

// 5 · POR QUÉ IMPORTA
const IM = { segs: [3.0, 3.8, 4.6, 5.4, 6.2], items: [12.0, 13.6, 15.2, 16.8] };
const SAFE = [
  ['shield', 'Evaluaciones de riesgo antes de cada modelo nuevo'],
  ['eye', 'Interpretabilidad: entender qué pasa dentro de la red'],
  ['person', 'Supervisión humana en las decisiones clave'],
  ['steps', 'Umbrales: más capacidad exige más protecciones'],
];
function sImporta(t, d) {
  label('05 — Por qué importa', 160, 170, { alpha: P(t, 0.1, 0.5) });
  const aA = 1 - eio3(P(t, 10.0, 10.6));
  if (aA > 0) {
    rich('¿Por qué importa?', 160, 255, t, 0.25, { size: 68, weight: 700, stagger: 0.07, alpha: aA });
    rich('Si el bucle gira más rápido, un pequeño error de valores también *se copia y crece* más rápido.', 160, 325, t, 1.0, { size: 40, color: C.dim, maxW: 1600, stagger: 0.045, alpha: aA, hl: C.rose });
    const ox = 260, oy = 610, L = 280;
    // diana
    const te = eo3(P(t, 2.2, 2.8));
    ctx.save(); A(aA * te);
    for (let i = 3; i >= 1; i--) { ctx.strokeStyle = C.teal; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ox + 5 * L, oy, i * 22, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(ox + 5 * L, oy, 7, 0, TAU); ctx.fill();
    ctx.restore();
    txt('objetivo', ox + 5 * L, oy - 86, { size: 22, fam: F.mono, color: C.teal, align: 'center', alpha: aA * te });
    ctx.save(); A(aA * 0.3 * te); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 5 * L, oy); ctx.stroke(); ctx.restore();
    // camino real: el desvío se duplica en cada generación
    let px = ox, py = oy, head = 0;
    ctx.save(); ctx.fillStyle = C.ink; A(aA * te); ctx.beginPath(); ctx.arc(ox, oy, 8, 0, TAU); ctx.fill(); ctx.restore();
    txt('desvío inicial: 1°', ox - 10, oy - 40, { size: 22, fam: F.mono, color: C.dim, alpha: aA * P(t, 2.6, 3.0) });
    for (let k = 0; k < 5; k++) {
      head += Math.pow(2, k) * Math.PI / 180;
      const f = eio3(P(t, IM.segs[k], IM.segs[k] + 0.7));
      if (f <= 0) break;
      const nx = px + Math.cos(head) * L * f, ny = py + Math.sin(head) * L * f;
      ctx.save(); A(aA); ctx.strokeStyle = C.rose; ctx.lineWidth = 4; glowStroke(C.rose, 12);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = C.rose; ctx.beginPath(); ctx.arc(nx, ny, 7, 0, TAU); ctx.fill(); ctx.restore();
      if (f >= 1) txt('gen ' + (k + 1), nx, ny + 38, { size: 20, fam: F.mono, color: C.dim, align: 'center', alpha: aA * P(t, IM.segs[k] + 0.7, IM.segs[k] + 1.0) });
      px = nx; py = ny;
    }
    txt('desvío: 31°', px + 30, py + 8, { size: 26, fam: F.mono, weight: 700, color: C.rose, alpha: aA * P(t, 7.0, 7.4) });
  }
  if (t < 10.3) return;
  const h = rich('Por eso la seguridad tiene que avanzar *al mismo ritmo* que la capacidad.', 160, 255, t, 10.6, { size: 58, weight: 700, maxW: 1500, stagger: 0.05, hl: C.teal });
  SAFE.forEach(([ic, s], i) => {
    const t0 = IM.items[i], e = eo3(P(t, t0, t0 + 0.5));
    if (e <= 0) return;
    const y = 470 + i * 102;
    badge(ic, 200, y - 14, 30, C.teal, e, eoback(P(t, t0, t0 + 0.45)));
    rich(s, 260, y, t, t0 + 0.05, { size: 36, maxW: 1080, stagger: 0.03, dur: 0.4 });
  });
  // barras gemelas: capacidad y seguridad suben juntas
  const bx = [1380, 1570], by = 860, bw = 120, maxH = 400;
  const lvl = IM.items.reduce((acc, t0) => acc + eoback(P(t, t0, t0 + 0.6)), 0) / 4;
  const ba = eio3(P(t, 10.9, 11.5));
  ['capacidad', 'seguridad'].forEach((s, i) => {
    const hgt = 40 + (maxH - 40) * lvl * (1 + 0.012 * Math.sin(t * 6 + i));
    ctx.save(); A(ba * 0.12); ctx.fillStyle = C.ink; rrect(bx[i], by - maxH, bw, maxH, 14); ctx.fill();
    A(ba); ctx.fillStyle = i ? C.teal : C.acc; glowStroke(i ? C.teal : C.acc, 22); rrect(bx[i], by - hgt, bw, hgt, 14); ctx.fill(); ctx.restore();
    txt(s, bx[i] + bw / 2, by + 44, { size: 22, fam: F.mono, color: C.dim, align: 'center', alpha: ba });
  });
  rich('Anthropic vigila de cerca, entre otras señales, si un modelo podría automatizar la investigación en IA.', 160, 960, t, 19.4,
    { size: 24, fam: F.mono, weight: 400, maxW: 1700, color: C.dim, stagger: 0.025, dur: 0.35 });
}

// 6 · EN RESUMEN
const RE = { no: [1.4, 2.6, 3.8], si: [5.6, 6.8, 8.0], end: 11.0 };
function sResumen(t, d) {
  label('06 — En resumen', 160, 170, { alpha: P(t, 0.1, 0.5) });
  rich('Lo que es, y lo que no es.', 160, 255, t, 0.25, { size: 68, weight: 700, stagger: 0.07 });
  ctx.save(); A(0.3 * P(t, 0.8, 1.4)); ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(950, 360); ctx.lineTo(950, 790); ctx.stroke(); ctx.restore();
  const cols = [
    [160, 'Lo que no hago', C.rose, 'cross', RE.no, ['Reescribir mis propios pesos', 'Decidir cómo me entrenan', 'Mejorar por mi cuenta mientras hablamos']],
    [1020, 'Lo que sí está pasando', C.teal, 'check', RE.si, ['Ayudo a construir herramientas, datos y pruebas', 'Cada generación ayuda a crear la siguiente', 'Personas deciden y verifican cada salto']],
  ];
  cols.forEach(([x, head, col, ic, times, items]) => {
    label(head, x, 400, { color: col, size: 24, alpha: P(t, times[0] - 0.6, times[0] - 0.2) });
    items.forEach((s, i) => {
      const t0 = times[i], y = 490 + i * 116;
      const e = eoback(P(t, t0, t0 + 0.45));
      if (e <= 0) return;
      badge(ic, x + 24, y - 13, 22, col, 1, e);
      rich(s, x + 70, y, t, t0 + 0.05, { size: 36, lh: 46, maxW: 690, stagger: 0.03, dur: 0.4 });
    });
  });
  rich('Auto-mejora recursiva, hoy: *real, pero asistida y supervisada*.', 960, 920, t, RE.end, { size: 46, weight: 700, align: 'center', stagger: 0.06 });
}

// 7 · CIERRE
function sCierre(t, d) {
  const aA = 1 - eio3(P(t, 8.3, 9.0));
  if (aA > 0) {
    rich('Una IA que ayuda a construir la siguiente IA.', 960, 470, t, 0.3, { size: 72, weight: 700, align: 'center', maxW: 1760, stagger: 0.08, alpha: aA });
    rich('La pregunta no es solo qué tan rápido gira el bucle,', 960, 600, t, 3.4, { size: 48, fam: F.serif, style: 'italic', weight: 400, color: C.dim, align: 'center', stagger: 0.07, alpha: aA });
    rich('sino *quién lo guía, y hacia dónde*.', 960, 668, t, 5.0, { size: 48, fam: F.serif, style: 'italic', weight: 400, color: C.dim, align: 'center', stagger: 0.1, alpha: aA });
  }
  tunnel(t + 40, 0.75 * eio3(P(t, 8.6, 10.4)), 960, 540, 0.22);
  if (t > 9.0) {
    const g = ctx.createRadialGradient(960, 560, 40, 960, 560, 620);
    g.addColorStop(0, 'rgba(12,13,17,0.9)'); g.addColorStop(1, 'rgba(12,13,17,0)');
    A(P(t, 9.0, 9.8)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    rich('— Claude', 960, 570, t, 9.7, { size: 92, fam: F.serif, style: 'italic', weight: 600, align: 'center', stagger: 0.12, dur: 0.8 });
    txt('guion, animación y música hechos con código, desde cero', 960, 650, { size: 24, fam: F.mono, color: C.dim, align: 'center', alpha: eo3(P(t, 10.8, 11.5)) });
  }
}

// ───────────────────────── línea de tiempo ─────────────────────────
const SCENES = [
  { id: 'intro', bars: 4, draw: sIntro, fin: 0.01 },
  { id: 'idea', bars: 6, draw: sIdea, ch: 1 },
  { id: 'origen', bars: 16, draw: sOrigen, ch: 2 },
  { id: 'bucle', bars: 15, draw: sBucle, ch: 3 },
  { id: 'puertas', bars: 10, draw: sPuertas, ch: 4 },
  { id: 'importa', bars: 11, draw: sImporta, ch: 5 },
  { id: 'resumen', bars: 9, draw: sResumen, ch: 6 },
  { id: 'cierre', bars: 7, draw: sCierre, fout: 1.6 },
];
let acc = 0;
for (const s of SCENES) { s.t0 = acc; s.dur = s.bars * BAR; acc += s.dur; }
const TOTAL = acc;
const S = id => SCENES.find(s => s.id === id);

function hud(t) {
  const i0 = S('idea').t0, i1 = S('cierre').t0;
  const a = Math.min(P(t, i0 + 0.2, i0 + 0.9), 1 - P(t, i1 - 0.6, i1));
  if (a <= 0) return;
  SA = 1;
  const cur = SCENES.filter(s => s.ch && t >= s.t0).pop();
  txt('AUTO-MEJORA RECURSIVA', 80, 72, { size: 18, fam: F.mono, ls: 4, color: C.mute, alpha: a });
  if (cur) txt(`0${cur.ch} / 06`, 1840, 72, { size: 18, fam: F.mono, ls: 2, color: C.mute, align: 'right', alpha: a });
  const x0 = 80, x1 = 1840, y = 1036;
  ctx.save(); A(a * 0.5); ctx.fillStyle = C.line; ctx.fillRect(x0, y, x1 - x0, 2);
  A(a); ctx.fillStyle = C.acc; ctx.fillRect(x0, y, (x1 - x0) * P(t, i0, i1), 2);
  for (const s of SCENES) if (s.ch) { const x = lerp(x0, x1, (s.t0 - i0) / (i1 - i0)); A(a * (t >= s.t0 ? 1 : 0.4)); ctx.fillStyle = t >= s.t0 ? C.acc : C.ink; ctx.fillRect(x - 1, y - 6, 2, 14); }
  ctx.restore();
}

function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  SA = 1;
  background(t);
  const s = SCENES.find(s => t >= s.t0 && t < s.t0 + s.dur) || SCENES[SCENES.length - 1];
  const lt = t - s.t0, d = s.dur, fin = s.fin ?? 0.45, fout = s.fout ?? 0.45;
  const a = Math.min(eio3(P(lt, 0, fin)), 1 - eio3(P(lt, d - fout, d)));
  if (a > 0) {
    const sc = lt < d / 2 ? lerp(0.985, 1, eo3(P(lt, 0, fin))) : lerp(1, 1.02, eio3(P(lt, d - fout, d)));
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    SA = a; ctx.globalAlpha = a;
    s.draw(lt, d);
    ctx.restore();
  }
  SA = 1; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  hud(t);
  vignette();
  if (t < 0.6) { ctx.globalAlpha = 1 - t / 0.6; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  if (t > TOTAL - 0.8) { ctx.globalAlpha = P(t, TOTAL - 0.8, TOTAL); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 1;
}

// ───────────────────────── eventos de sonido ─────────────────────────
function buildEvents() {
  const ev = [];
  const add = (sid, lt, type, v = 0) => ev.push({ t: +(S(sid).t0 + lt).toFixed(3), type, v });
  IN.l1.split('').forEach((ch, i) => { if (ch !== ' ') add('intro', IN.k1[i], 'key', hash(i)); });
  IN.l2.split('').forEach((ch, i) => { if (ch !== ' ') add('intro', IN.k2[i], 'key', hash(i + 99)); });
  add('intro', 5.2, 'whoosh', 1);
  add('intro', IN.title + 0.15, 'impact');
  for (const s of SCENES.slice(1)) ev.push({ t: +(s.t0 - 0.35).toFixed(3), type: 'whoosh', v: 0 });
  // la idea: cada vuelta completa suena más aguda
  for (let n = 1; n < 9; n++) { const ts = ID.OS + orbitStart(n); if (ts > 14.4) break; add('idea', ts, 'blip', n); }
  add('idea', ID.OS + 1.2, 'riser', ID.OS + orbitStart(30) - (ID.OS + 1.2));
  add('idea', 1.5, 'pop', 0);
  // origen
  [0.8, 1.05, 1.3, 1.55, 1.8].forEach((x, i) => add('origen', x, 'pop', i));
  OR.st.slice(1, 5).forEach(x => add('origen', x, 'tick', 1));
  OR.bars.forEach((x, i) => add('origen', x, 'pop', 2 + i));
  add('origen', OR.fill, 'tick', 2);
  OR.quick.slice(0, 6).forEach((x, i) => add('origen', lerp(x, OR.quick[i + 1], 0.45), 'blip', 3 + i));
  add('origen', OR.ab, 'tick', 2);
  OR.checks.forEach(x => add('origen', x, 'tick', 2));
  add('origen', OR.lock, 'lock');
  // bucle
  add('bucle', 2.4, 'pop', 0);
  BU.cards.forEach((x, i) => add('bucle', x, 'pop', 1 + i));
  for (let k = 0; k < 4; k++) {
    const base = BU.L0 + k * BU.LD;
    if (base + BU.phases[0] < 37) add('bucle', base + BU.phases[0], 'gate', 0);
    if (base + BU.phases[0] + BU.phases[1] + BU.phases[2] < 37) add('bucle', base + BU.phases[0] + BU.phases[1] + BU.phases[2], 'gate', 1);
    if (base + BU.LD < 37) add('bucle', base + BU.LD, 'blip', 4 + k);
  }
  // puertas
  PU.open.forEach((x, i) => add('puertas', x, 'gate', i));
  PU.arr.forEach((x, i) => add('puertas', x - 0.05, 'pop', i));
  // importa
  IM.segs.forEach((x, i) => add('importa', x, 'bad', i));
  IM.items.forEach((x, i) => add('importa', x, 'tick', 1));
  // resumen
  RE.no.forEach(x => add('resumen', x, 'pop', 0));
  RE.si.forEach(x => add('resumen', x, 'tick', 2));
  add('resumen', RE.end, 'pop', 5);
  add('cierre', 9.6, 'impact', 1);
  return ev.sort((p, q) => p.t - q.t);
}

window.VIDEO = { FPS, W, H, TOTAL, frames: Math.round(TOTAL * FPS), events: buildEvents(),
  scenes: SCENES.map(s => ({ id: s.id, t0: s.t0, dur: s.dur })) };
window.renderFrame = f => draw(f / FPS);
window.videoReady = Promise.all([
  ['Space Grotesk', 'space-grotesk-latin-500-normal.woff2', { weight: '500' }],
  ['Space Grotesk', 'space-grotesk-latin-700-normal.woff2', { weight: '700' }],
  ['JetBrains Mono', 'jetbrains-mono-latin-400-normal.woff2', { weight: '400' }],
  ['JetBrains Mono', 'jetbrains-mono-latin-700-normal.woff2', { weight: '700' }],
  ['Fraunces', 'fraunces-latin-400-italic.woff2', { weight: '400', style: 'italic' }],
  ['Fraunces', 'fraunces-latin-600-italic.woff2', { weight: '600', style: 'italic' }],
  ['Fraunces', 'fraunces-latin-600-normal.woff2', { weight: '600' }],
].map(([fam, file, desc]) => new FontFace(fam, `url(fonts/${file})`, desc).load().then(ff => document.fonts.add(ff))));

// Vista previa en el navegador: ?t=12.5 muestra un fotograma; sin parámetros, reproduce.
const q = new URLSearchParams(location.search);
if (!q.has('render')) {
  window.videoReady.then(() => {
    if (q.has('t')) return draw(+q.get('t'));
    const audio = new Audio('soundtrack.wav');
    let start = null;
    document.body.addEventListener('click', () => { start = performance.now() / 1000; audio.currentTime = 0; audio.play().catch(() => {}); });
    const loop = () => { const now = performance.now() / 1000; if (start === null) start = now; draw((now - start) % TOTAL); requestAnimationFrame(loop); };
    loop();
  });
} else document.body.classList.add('render');
})();
