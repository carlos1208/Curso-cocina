'use strict';
// Drawing toolkit for the sobrebarriga illustrations: seeded randomness, smooth organic paths,
// shared SVG filters (wood grain, noise textures, liquid gloss, soft shadows) and food/kitchen parts.
// Everything returns SVG markup strings; scenes.cjs composes them into 1080x1920 overhead shots.
const W = 1080, H = 1920, TAU = Math.PI * 2;

function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let rand = mulberry(1);
const seed = s => { rand = mulberry(s); };
const R = (a, b) => a + (b - a) * rand();
const pick = arr => arr[Math.floor(rand() * arr.length)];
const f1 = n => (Math.round(n * 10) / 10).toString();
let UID = 0;
const uid = p => `${p}${++UID}`;
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// smooth path through points (Catmull-Rom → cubic Bézier)
function smooth(pts, closed = true) {
  const n = pts.length, P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
function blob(cx, cy, rx, ry, n = 12, jit = .1, a = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, r = 1 + R(-jit, jit), [x, y] = rot(Math.cos(t) * rx * r, Math.sin(t) * ry * r, a);
    pts.push([cx + x, cy + y]);
  }
  return smooth(pts);
}
// superellipse slab centred on 0,0 (draw inside a transformed <g>)
function slab(w, h, jit = .03, n = 30, pw = 3.2) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, c = Math.cos(t), s = Math.sin(t);
    pts.push([Math.sign(c) * Math.pow(Math.abs(c), 2 / pw) * w / 2 * (1 + R(-jit, jit)),
      Math.sign(s) * Math.pow(Math.abs(s), 2 / pw) * h / 2 * (1 + R(-jit, jit))]);
  }
  return smooth(pts);
}
// tapered curved strip centred on 0,0 along x (onion julienne, pepper strips, stems, zest)
function strip(len, thick, bend = 0, taper = .6, m = 10) {
  const L = [], Rr = [];
  for (let i = 0; i <= m; i++) {
    const u = i / m, x = (u - .5) * len, y = bend * (1 - Math.pow(2 * u - 1, 2));
    const dy = bend * -4 * (2 * u - 1) / len * 2, nx = -dy / Math.hypot(1, dy), ny = 1 / Math.hypot(1, dy);
    const t = thick / 2 * (1 - taper + taper * Math.pow(Math.sin(Math.PI * u), .5));
    L.push([x + nx * t, y + ny * t]); Rr.push([x - nx * t, y - ny * t]);
  }
  return smooth([...L, ...Rr.reverse()]);
}
const g = (x, y, a, inner, extra = '') => `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(a)})" ${extra}>${inner}</g>`;

// ───────── shared defs ─────────
function noiseFilter(id, freq, oct, sd, rgb, k, c) {
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${sd}"/>
    <feColorMatrix type="matrix" values="0 0 0 0 ${rgb[0]}  0 0 0 0 ${rgb[1]}  0 0 0 0 ${rgb[2]}  ${k} 0 0 0 ${c}"/></filter>`;
}
function defs() {
  return `<defs>
  ${noiseFilter('woodgrain', '0.0022 0.055', 4, 7, [.55, .36, .22], 1.7, -.62)}
  ${noiseFilter('woodgrain2', '0.004 0.11', 3, 19, [.06, .03, .015], 2.2, -1.0)}
  ${noiseFilter('boardgrain', '0.003 0.04', 4, 4, [.45, .27, .13], 1.6, -.55)}
  ${noiseFilter('speck', '0.6', 1, 3, [1, 1, 1], 3, -2.2)}
  ${noiseFilter('meatnz', '0.012 0.05', 4, 11, [.25, .04, .05], 1.8, -.65)}
  ${noiseFilter('crust', '0.03', 4, 23, [.12, .05, .02], 2.4, -.9)}
  ${noiseFilter('crustlight', '0.02', 3, 31, [.78, .45, .2], 2.2, -1.05)}
  ${noiseFilter('pure', '0.05', 3, 41, [.75, .5, .05], 2.2, -.95)}
  ${noiseFilter('purelight', '0.035', 3, 43, [1, .95, .7], 2.4, -1.1)}
  ${noiseFilter('ironnz', '0.9', 2, 5, [.5, .5, .5], 1.4, -.55)}
  ${noiseFilter('platenz', '0.7', 2, 9, [.75, .72, .68], 1.6, -.95)}
  ${noiseFilter('linen', '0.9 0.06', 2, 13, [.5, .45, .38], 1.4, -.5)}
  <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="18"/><feOffset dx="10" dy="26"/><feComponentTransfer><feFuncA type="linear" slope=".7"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="shs" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dx="3" dy="7"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="rough2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="8"/><feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
  <filter id="b3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="b8" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="b20" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="b40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="gloss" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".0045 .006" numOctaves="2" seed="5" result="n"/>
    <feGaussianBlur in="n" stdDeviation="7" result="nb"/>
    <feSpecularLighting in="nb" surfaceScale="9" specularConstant=".9" specularExponent="70" lighting-color="#ffe6c4" result="sp"><feDistantLight azimuth="225" elevation="58"/></feSpecularLighting>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>
    <feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k1="0" k2="1" k3=".32" k4="0"/></filter>
  <filter id="gloss2" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="2" seed="15" result="n"/>
    <feGaussianBlur in="n" stdDeviation="4" result="nb"/>
    <feSpecularLighting in="nb" surfaceScale="8" specularConstant="1" specularExponent="60" lighting-color="#fff0dc" result="sp"><feDistantLight azimuth="225" elevation="56"/></feSpecularLighting>
    <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>
    <feComposite in="SourceGraphic" in2="spi" operator="arithmetic" k1="0" k2="1" k3=".4" k4="0"/></filter>
  <radialGradient id="keylight" cx=".28" cy=".22" r=".85"><stop offset="0" stop-color="#ffd9a8" stop-opacity=".22"/><stop offset=".5" stop-color="#ffb070" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".4" r=".8"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  </defs>`;
}

// ───────── surfaces ─────────
function table() {
  let s = `<rect width="${W}" height="${H}" fill="#2b1a10"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#woodgrain)" opacity=".75"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#woodgrain2)" opacity=".8"/>`;
  for (const y of [170, 610, 1060, 1490]) {
    s += `<rect x="0" y="${y}" width="${W}" height="5" fill="#0d0805" opacity=".85"/><rect x="0" y="${y + 5}" width="${W}" height="2" fill="#6a4a33" opacity=".3"/>`;
  }
  return s;
}
const light = () => `<rect width="${W}" height="${H}" fill="url(#keylight)" style="mix-blend-mode:screen"/><rect width="${W}" height="${H}" fill="url(#vig)"/>`;
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}${body}</svg>`;

function linen(x, y, w, h, a, col = '#d8ccb6') {
  const id = uid('ln');
  return g(x, y, a, `<clipPath id="${id}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6"/></clipPath>
    <g filter="url(#sh)"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="6" fill="${col}"/></g>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#linen)" clip-path="url(#${id})" opacity=".5" style="mix-blend-mode:multiply"/>
    ${[0, 1, 2].map(k => `<rect x="${-w / 2}" y="${-h / 2 + 40 + k * 16}" width="${w}" height="6" fill="#b5462e" opacity=".55" clip-path="url(#${id})"/>`).join('')}`);
}

// ───────── cookware ─────────
function pot(cx, cy, r, inner, o = {}) {
  const id = uid('pot'), ri = r * .9, hd = o.handles !== false;
  let s = '';
  if (hd) for (const sx of [-1, 1]) {
    s += g(cx + sx * r * 1.0, cy, 0, `<path d="M${sx * -20},-70 C${sx * 70},-80 ${sx * 105},-40 ${sx * 105},0 C${sx * 105},40 ${sx * 70},80 ${sx * -20},70" fill="none" stroke="#151312" stroke-width="30" stroke-linecap="round" filter="url(#sh)"/>
      <path d="M${sx * 10},-62 C${sx * 70},-70 ${sx * 94},-36 ${sx * 96},0" fill="none" stroke="#5a5856" stroke-width="5" stroke-linecap="round" opacity=".6" filter="url(#b1)"/>`);
  }
  s += `<g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#1b1918"/></g>
    <circle cx="${cx}" cy="${cy}" r="${r}" filter="url(#ironnz)" opacity=".18"/>
    <circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="#2c2a29" stroke-width="${r - ri}"/>
    <path d="${arc(cx, cy, (r + ri) / 2, 200, 300)}" fill="none" stroke="#8d8986" stroke-width="${(r - ri) * .35}" stroke-linecap="round" opacity=".55" filter="url(#b3)"/>
    <path d="${arc(cx, cy, (r + ri) / 2, 20, 70)}" fill="none" stroke="#6d6966" stroke-width="${(r - ri) * .25}" stroke-linecap="round" opacity=".35" filter="url(#b3)"/>
    <clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${ri}"/></clipPath>
    <g clip-path="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${ri}" fill="${o.base || '#141110'}"/>${inner}
      <circle cx="${cx}" cy="${cy}" r="${ri}" fill="url(#${id}in)"/></g>
    <radialGradient id="${id}in" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${o.innerShade ?? .7}"/></radialGradient>`;
  return s;
}
function arc(cx, cy, r, a0, a1) {
  const p = a => [cx + Math.cos(a * Math.PI / 180) * r, cy + Math.sin(a * Math.PI / 180) * r];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${f1(x0)},${f1(y0)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)},${f1(y1)}`;
}
function lid(cx, cy, r) {
  const id = uid('lid');
  let s = `<radialGradient id="${id}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#5b5754"/><stop offset=".45" stop-color="#2e2b29"/><stop offset="1" stop-color="#121010"/></radialGradient>
    <g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/></g>
    <circle cx="${cx}" cy="${cy}" r="${r}" filter="url(#ironnz)" opacity=".16"/>`;
  for (const k of [.92, .8, .55]) s += `<circle cx="${cx}" cy="${cy}" r="${r * k}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3"/><circle cx="${cx}" cy="${cy}" r="${r * k + 3}" fill="none" stroke="#8a8682" stroke-opacity=".18" stroke-width="2"/>`;
  s += `<path d="${arc(cx, cy, r * .86, 195, 285)}" fill="none" stroke="#d8d2cc" stroke-width="22" stroke-linecap="round" opacity=".18" filter="url(#b8)"/>`;
  // knob
  s += `<g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r * .13}" fill="#1a1817"/></g>
    <circle cx="${cx - r * .03}" cy="${cy - r * .035}" r="${r * .085}" fill="#3d3a38"/>
    <ellipse cx="${cx - r * .05}" cy="${cy - r * .06}" rx="${r * .045}" ry="${r * .025}" fill="#bdb6b0" opacity=".55" filter="url(#b3)"/>`;
  // condensation droplets near the rim
  for (let k = 0; k < 140; k++) {
    const a = R(0, TAU), rr = r * R(.6, .97), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, d = R(2, 7);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(d)}" fill="#cfc8c0" opacity="${f1(R(.08, .22))}"/><circle cx="${f1(x - d * .3)}" cy="${f1(y - d * .3)}" r="${f1(d * .3)}" fill="#fff" opacity=".45"/>`;
  }
  return s;
}
function saucepan(cx, cy, r, inner, handleA = -40) {
  const id = uid('sp'), ri = r * .93;
  const hx = Math.cos(handleA * Math.PI / 180), hy = Math.sin(handleA * Math.PI / 180);
  let s = g(cx + hx * (r + 260), cy + hy * (r + 260), handleA, `<g filter="url(#sh)"><rect x="-300" y="-34" width="600" height="68" rx="34" fill="url(#${id}h)"/></g><rect x="-250" y="-14" width="420" height="8" rx="4" fill="#fff" opacity=".35" filter="url(#b3)"/>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5e3e0"/><stop offset=".5" stop-color="#9c9a97"/><stop offset="1" stop-color="#5d5b59"/></linearGradient>`);
  s += `<radialGradient id="${id}r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#f1efec"/><stop offset=".55" stop-color="#a7a4a0"/><stop offset="1" stop-color="#5f5c59"/></radialGradient>
    <g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}r)"/></g>
    <circle cx="${cx}" cy="${cy}" r="${(r + ri) / 2}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
    <clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${ri}"/></clipPath>
    <g clip-path="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${ri}" fill="#1a0c06"/>${inner}<circle cx="${cx}" cy="${cy}" r="${ri}" fill="url(#${id}in)"/></g>
    <radialGradient id="${id}in" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`;
  return s;
}
function skillet(cx, cy, r, inner, handleA = -130) {
  const hx = Math.cos(handleA * Math.PI / 180), hy = Math.sin(handleA * Math.PI / 180);
  let s = g(cx + hx * (r + 230), cy + hy * (r + 230), handleA, `<g filter="url(#sh)"><path d="M-300,-40 L230,-52 C262,-52 280,-30 280,0 C280,30 262,52 230,52 L-300,40 Z" fill="#191716"/></g>
    <path d="M-280,-26 L220,-34" stroke="#76716d" stroke-width="5" opacity=".5" filter="url(#b1)"/><circle cx="200" cy="0" r="16" fill="#0b0a09"/>`);
  return s + pot(cx, cy, r, inner, { handles: false, innerShade: .55 });
}
function plate(cx, cy, r) {
  const id = uid('pl');
  return `<radialGradient id="${id}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#3b3836"/><stop offset=".7" stop-color="#2a2827"/><stop offset="1" stop-color="#1c1a19"/></radialGradient>
    <g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/></g>
    <circle cx="${cx}" cy="${cy}" r="${r}" filter="url(#platenz)" opacity=".22"/>
    <circle cx="${cx}" cy="${cy}" r="${r * .74}" fill="none" stroke="#141312" stroke-opacity=".6" stroke-width="10" filter="url(#b8)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * .745}" fill="none" stroke="#5a5552" stroke-opacity=".35" stroke-width="2"/>
    <path d="${arc(cx, cy, r * .88, 200, 290)}" fill="none" stroke="#c9c1b8" stroke-width="20" stroke-linecap="round" opacity=".14" filter="url(#b8)"/>`;
}
function bowl(cx, cy, r, inner) {
  const id = uid('bw');
  return `<radialGradient id="${id}g" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#f4efe7"/><stop offset="1" stop-color="#b9b0a4"/></radialGradient>
    <g filter="url(#sh)"><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}g)"/></g>
    <clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r * .8}"/></clipPath>
    <g clip-path="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${r * .8}" fill="#d8cfc3"/>${inner}<circle cx="${cx}" cy="${cy}" r="${r * .8}" fill="url(#${id}in)"/></g>
    <radialGradient id="${id}in" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`;
}
function woodSpoon(x0, y0, x1, y1) {
  const a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI, len = Math.hypot(x1 - x0, y1 - y0), id = uid('ws');
  return g(x0, y0, a, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b07a"/><stop offset=".6" stop-color="#b98a54"/><stop offset="1" stop-color="#8d6237"/></linearGradient>
    <g filter="url(#sh)"><path d="M0,-17 L${len - 150},-15 C${len - 110},-16 ${len - 100},-58 ${len - 20},-58 C${len + 60},-58 ${len + 70},58 ${len - 20},58 C${len - 100},58 ${len - 110},16 ${len - 150},15 L0,17 C-14,17 -14,-17 0,-17Z" fill="url(#${id})"/></g>
    <ellipse cx="${len - 10}" cy="0" rx="60" ry="40" fill="#8a5a30" opacity=".45"/>
    <rect x="0" y="-12" width="${len - 160}" height="5" rx="2" fill="#fff" opacity=".25" filter="url(#b1)"/>`);
}
function fork(x, y, a, s = 1) {
  const id = uid('fk');
  return g(x, y, a, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f2"/><stop offset=".5" stop-color="#a9a8a5"/><stop offset="1" stop-color="#666461"/></linearGradient>
    <g filter="url(#shs)" transform="scale(${s})"><path d="M0,-22 L380,-14 C400,-13 410,-30 440,-34 L560,-38 L560,-30 L450,-24 L450,-12 L560,-14 L560,-6 L450,-4 L450,4 L560,6 L560,14 L450,12 L450,24 L560,30 L560,38 L440,34 C410,30 400,13 380,14 L0,22 C-24,22 -24,-22 0,-22Z" fill="url(#${id})"/>
    <rect x="10" y="-12" width="360" height="6" rx="3" fill="#fff" opacity=".6" filter="url(#b1)"/></g>`);
}

// ───────── food ─────────
function rawMeat(w, h) {
  const id = uid('rm'), d = flank(w, h), cl = uid('rmc');
  let s = `<linearGradient id="${id}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#c24a50"/><stop offset=".6" stop-color="#a53139"/><stop offset="1" stop-color="#86222b"/></linearGradient>
    <clipPath id="${cl}"><path d="${d}"/></clipPath>
    <g filter="url(#sh)"><path d="${d}" fill="url(#${id})"/></g>
    <g clip-path="url(#${cl})">
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#meatnz)" opacity=".7" style="mix-blend-mode:multiply"/>`;
  for (let k = 0; k < 46; k++) {   // muscle fibres along the cut
    const y = R(-h / 2, h / 2), pts = [];
    for (let i = 0; i <= 6; i++) pts.push([-w / 2 + i * w / 6, y + R(-6, 6)]);
    s += `<path d="${smooth(pts, false)}" fill="none" stroke="${pick(['#6e1820', '#d86a70'])}" stroke-width="${f1(R(1, 2.6))}" opacity="${f1(R(.15, .35))}"/>`;
  }
  for (let k = 0; k < 9; k++) {    // fat marbling / silver skin
    const x = R(-w * .42, w * .42), y = R(-h * .4, h * .4);
    s += g(x, y, R(-12, 12), `<path d="${strip(R(80, 220), R(6, 20), R(-14, 14), .8)}" fill="#f2ddd2" opacity="${f1(R(.35, .7))}" filter="url(#b1)"/>`);
  }
  s += `<path d="${strip(w * .95, 40, 6, .5)}" transform="translate(0,${-h / 2 + 22})" fill="#f3e2d6" opacity=".75" filter="url(#b3)"/>`;
  s += `</g><path d="${d}" fill="none" stroke="#5e141c" stroke-width="5" opacity=".45" filter="url(#b3)"/>
    <ellipse cx="${-w * .18}" cy="${-h * .18}" rx="${w * .25}" ry="${h * .1}" fill="#fff" opacity=".12" filter="url(#b20)"/>`;
  return s;
}
// seared / braised / glazed slab. tone: 'seared' | 'braised' | 'glazed'
function cookedMeat(w, h, tone = 'seared', o = {}) {
  const id = uid('cm'), cl = uid('cmc'), d = o.d || flank(w, h);
  const pal = {
    seared: ['#7a3a14', '#4e220c', '#2a0f04'],
    braised: ['#5e2c14', '#40190a', '#240c04'],
    glazed: ['#5a2611', '#3a160a', '#1f0a04'],
  }[tone];
  let s = `<radialGradient id="${id}" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".65" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></radialGradient>
    <clipPath id="${cl}"><path d="${d}"/></clipPath>
    <g filter="url(#sh)"><path d="${d}" fill="url(#${id})"/></g>
    <g clip-path="url(#${cl})">
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#crust)" opacity="${tone === 'seared' ? .85 : .6}"/>
    <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" filter="url(#crustlight)" opacity="${tone === 'seared' ? .16 : .22}" style="mix-blend-mode:screen"/>`;
  const fib = o.fibres ?? 30;
  for (let k = 0; k < fib; k++) {
    const y = R(-h / 2, h / 2), pts = [];
    for (let i = 0; i <= 6; i++) pts.push([-w / 2 + i * w / 6, y + R(-5, 5)]);
    s += `<path d="${smooth(pts, false)}" fill="none" stroke="${pick(['#1a0703', '#2a0e05', '#8a4a22'])}" stroke-width="${f1(R(1, 2.4))}" opacity="${f1(R(.12, .3))}"/>`;
  }
  if (o.fat) s += `<path d="${strip(w * .9, h * .22, 8, .5)}" transform="translate(0,${-h / 2 + h * .1})" fill="${tone === 'seared' ? '#c99252' : '#8d5a2c'}" opacity=".6" filter="url(#b3)"/>`;
  s += `</g><path d="${d}" fill="none" stroke="${tone === 'seared' ? '#2a0f05' : '#120502'}" stroke-width="7" opacity=".55" filter="url(#b3)"/>`;
  s += `<ellipse cx="${-w * .15}" cy="${-h * .2}" rx="${w * .28}" ry="${h * .08}" transform="rotate(-6)" fill="#ffd9a8" opacity="${tone === 'seared' ? .14 : .1}" filter="url(#b20)"/>`;
  s += highlights(-w * .1, -h * .18, w * .3, h * .12, tone === 'seared' ? 7 : 5, '#ffe2b8', .55);
  return s;
}
// glossy liquid (sauce, beer, braising liquid) filling a shape
function liquid(d, base, o = {}) {
  return `<path d="${d}" fill="${base}" filter="url(#${o.fine ? 'gloss2' : 'gloss'})" ${o.op ? `opacity="${o.op}"` : ''}/>`;
}
function highlights(cx, cy, rx, ry, n, col = '#fff1dc', op = .5) {
  // soft, consistently oriented reflections of a window up-left
  let s = '';
  for (let k = 0; k < n; k++) {
    const x = cx + R(-rx, rx), y = cy + R(-ry, ry);
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(R(10, 34))}" ry="${f1(R(2.2, 4.5))}" transform="rotate(${f1(R(-45, -25))} ${f1(x)} ${f1(y)})" fill="${col}" opacity="${f1(R(op * .45, op))}" filter="url(#b1)"/>`;
  }
  return s;
}
function sheen(cx, cy, r, op = .2) {
  return `<path d="${arc(cx, cy, r * .8, 195, 255)}" stroke="#fff1dc" stroke-width="${f1(r * .1)}" fill="none" stroke-linecap="round" opacity="${op}" filter="url(#b20)"/>
    <path d="${arc(cx, cy, r * .86, 205, 235)}" stroke="#fff6ea" stroke-width="${f1(r * .025)}" fill="none" stroke-linecap="round" opacity="${op * 1.6}" filter="url(#b3)"/>`;
}
// flank-steak outline: long, flat, uneven thickness, tapered rounded ends (centred on 0,0)
function flank(w, h, n = 16) {
  const top = [], bot = [];
  const a1 = R(.1, .25), a2 = R(-.12, .12);
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = (u - .5) * w;
    const t = h * (.82 + a1 * Math.sin(Math.PI * u) + a2 * (u - .5) * 2) * Math.pow(1 - Math.pow(Math.abs(2 * u - 1), 3.2), .3);
    const mid = Math.sin(u * Math.PI * 1.3) * h * .06;
    top.push([x, mid - t / 2 + R(-4, 4)]); bot.push([x, mid + t / 2 + R(-4, 4)]);
  }
  return smooth([...top.slice(0, n), ...bot.reverse().slice(0, n)]);
}
function bubblesSvg(cx, cy, rx, ry, n, rmin = 3, rmax = 14, col = '#7a4a28') {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = R(0, TAU), rr = Math.sqrt(rand()), x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr, r = R(rmin, rmax);
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${col}" stroke-width="${f1(Math.max(1, r * .18))}" opacity=".75"/><circle cx="${f1(x - r * .35)}" cy="${f1(y - r * .35)}" r="${f1(r * .22)}" fill="#fff4e0" opacity=".7"/>`;
  }
  return s;
}
function onionStrip(cool = 0) {   // cool 0 = raw/white, 1 = soft golden, 2 = melted brown
  const fill = ['#f4ead6', '#e8cf98', '#8a5a2e'][cool], edge = ['#d9c9a8', '#c39a55', '#5a3416'][cool];
  return `<path d="${strip(R(90, 170), R(13, 21), R(-30, 30), .7)}" fill="${fill}" stroke="${edge}" stroke-width="2" opacity="${cool === 2 ? .8 : .93}"/>`;
}
function pepperStrip() {
  return `<path d="${strip(R(80, 150), R(14, 22), R(-14, 14), .4)}" fill="#c3281d" stroke="#8c150e" stroke-width="2.5"/><path d="${strip(R(50, 100), 3, R(-6, 6), .9)}" fill="#ff8a6a" opacity=".55" filter="url(#b1)"/>`;
}
function tomatoChunk() {
  const s = R(38, 62), d = slab(s, s * R(.8, 1.1), .12, 12, 3);
  return `<path d="${d}" fill="#cf3726" stroke="#99190f" stroke-width="2"/><path d="${blob(R(-4, 4), R(-4, 4), s * .3, s * .26, 8, .2)}" fill="#ee6a48" opacity=".9"/>
    ${[0, 1, 2].map(() => `<ellipse cx="${f1(R(-s * .25, s * .25))}" cy="${f1(R(-s * .25, s * .25))}" rx="3.2" ry="2" fill="#f6c25a" opacity=".85"/>`).join('')}
    <circle cx="${f1(-s * .2)}" cy="${f1(-s * .22)}" r="${f1(s * .1)}" fill="#fff" opacity=".35" filter="url(#b1)"/>`;
}
const garlicBit = () => `<path d="${blob(0, 0, R(5, 10), R(4, 8), 7, .25)}" fill="#f2ead2" stroke="#cdbf96" stroke-width="1.2"/>`;
function bayLeaf(L = 170, wd = 52, cooked = false) {
  const id = uid('bl');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cooked ? '#5d5a2c' : '#8a9a4e'}"/><stop offset="1" stop-color="${cooked ? '#3a3818' : '#566a2a'}"/></linearGradient>
    <g filter="url(#shs)"><path d="M${-L / 2},0 C${-L / 4},${-wd * .7} ${L / 4},${-wd * .62} ${L / 2},0 C${L / 4},${wd * .62} ${-L / 4},${wd * .7} ${-L / 2},0Z" fill="url(#${id})"/></g>
    <path d="M${-L / 2 + 6},0 C${-L / 6},-3 ${L / 6},-3 ${L / 2 - 6},0" stroke="${cooked ? '#8a8448' : '#c4cf86'}" stroke-width="2.5" fill="none" opacity=".8"/>
    ${[-3, -2, -1, 1, 2, 3].map(k => `<path d="M${k * L / 9},-2 L${k * L / 9 + L / 14},${-wd * .32}M${k * L / 9},2 L${k * L / 9 + L / 14},${wd * .32}" stroke="${cooked ? '#8a8448' : '#b9c47a'}" stroke-width="1.2" opacity=".5"/>`).join('')}`;
}
function thyme(L = 200, cooked = false) {
  let s = `<path d="${strip(L, 4, R(-10, 10), .3)}" fill="${cooked ? '#4a3016' : '#7a5634'}"/>`;
  const n = Math.floor(L / 16);
  for (let i = 1; i < n; i++) {
    const x = -L / 2 + i * L / n, sz = R(5, 8) * (1 - i / n * .4);
    for (const sy of [-1, 1]) s += `<ellipse cx="${f1(x + 4)}" cy="${f1(sy * (sz * .9))}" rx="${f1(sz * 1.2)}" ry="${f1(sz * .6)}" transform="rotate(${sy * 35} ${f1(x)} 0)" fill="${cooked ? '#4f5426' : pick(['#6f8c45', '#5d7a3a', '#86a253'])}"/>`;
  }
  return s;
}
function cilantro(sz = 1) {
  const id = uid('ci');
  let s = `<radialGradient id="${id}" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#6fbf4f"/><stop offset="1" stop-color="#2f7a2c"/></radialGradient>`;
  s += `<path d="${strip(70 * sz, 3, 6, .2)}" transform="translate(${-40 * sz},0)" fill="#4f8f3a"/>`;
  for (const [x, y, r] of [[10, -16, 24], [28, 8, 22], [4, 18, 20]]) s += `<path d="${blob(x * sz, y * sz, r * sz, r * sz * .85, 11, .22)}" fill="url(#${id})" stroke="#24601f" stroke-width="1.2" filter="url(#shs)"/>`;
  s += `<path d="M${-6 * sz},0 L${26 * sz},-14 M${-6 * sz},0 L${28 * sz},8 M${-6 * sz},0 L${8 * sz},18" stroke="#a6dd84" stroke-width="1.4" opacity=".6"/>`;
  return s;
}
function pickledOnion(r = 34) {
  const a0 = R(0, 360), span = R(140, 300);
  return `<path d="${arc(0, 0, r, a0, a0 + span)}" fill="none" stroke="#a5245f" stroke-width="10" stroke-linecap="round" filter="url(#shs)"/>
    <path d="${arc(0, 0, r, a0, a0 + span)}" fill="none" stroke="#e7a0c4" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <path d="${arc(0, 0, r - 2, a0 + 10, a0 + span * .5)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
}
const zest = () => `<path d="${strip(R(22, 42), 3.5, R(-8, 8), .4)}" fill="${pick(['#f6d531', '#f2c81d', '#fbe36a'])}"/>`;
function sprinkle(cx, cy, rx, ry, n, cols, rmin, rmax, op = .9, elong = 1) {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = R(0, TAU), rr = Math.pow(rand(), .7), x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr, r = R(rmin, rmax);
    s += elong > 1 ? `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * elong)}" ry="${f1(r)}" transform="rotate(${f1(R(0, 180))} ${f1(x)} ${f1(y)})" fill="${pick(cols)}" opacity="${f1(op)}"/>`
      : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${pick(cols)}" opacity="${f1(op)}"/>`;
  }
  return s;
}
function panelaPile(cx, cy, rx, ry, n = 260) {
  let s = `<path d="${blob(cx, cy, rx, ry, 12, .15)}" fill="#a8672a" filter="url(#sh)"/>`;
  for (let k = 0; k < n; k++) {
    const a = R(0, TAU), rr = Math.pow(rand(), .6), x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
    s += g(x, y, R(0, 180), `<path d="${slab(R(6, 15), R(4, 9), .2, 8, 2.4)}" fill="${pick(['#c98a3e', '#dca253', '#9a5b22', '#b87634', '#e8b86a'])}"/>`);
  }
  return s;
}
function butterCube(s = 120) {
  return `<path d="${blob(0, 0, s * 1.05, s * .95, 12, .1)}" fill="#f2d06a" opacity=".55" filter="url(#b8)"/>
    <path d="${blob(0, 0, s * .8, s * .74, 10, .08)}" fill="#f6dc86" opacity=".7" filter="url(#b3)"/>
    <g filter="url(#shs)"><path d="${slab(s * .8, s * .74, .03, 24, 6)}" fill="#f7e4a2"/></g>
    <path d="${slab(s * .6, s * .54, .03, 24, 6)}" fill="#fbefc4" opacity=".8" filter="url(#b3)"/>
    <ellipse cx="${-s * .14}" cy="${-s * .14}" rx="${s * .18}" ry="${s * .07}" fill="#fff" opacity=".6" filter="url(#b3)"/>`;
}
function swirl(cx, cy, r0, r1, turns, col, wd, op) {
  const pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * turns * TAU, r = r0 + (r1 - r0) * u; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * .9]); }
  return `<path d="${smooth(pts, false)}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" opacity="${op}" filter="url(#b3)"/>`;
}

module.exports = { sheen, flank, W, H, TAU, seed, R, pick, f1, uid, rot, smooth, blob, slab, strip, g, svg, table, light, linen, pot, lid, saucepan, skillet, plate, bowl, woodSpoon, fork, arc,
  rawMeat, cookedMeat, liquid, highlights, bubblesSvg, onionStrip, pepperStrip, tomatoChunk, garlicBit, bayLeaf, thyme, cilantro, pickledOnion, zest, sprinkle, panelaPile, butterCube, swirl };
