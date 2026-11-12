// Renderiza video.js fotograma a fotograma en Chromium headless y lo une con soundtrack.wav.
//   node render.cjs                      → fable_analista.mp4 (todos los fotogramas)
//   node render.cjs --stills 1.2,3.7     → stills/t1.2.png … (vistazo rápido a esos segundos)
//   node render.cjs --scenes             → imprime el inicio y la duración de cada escena
// Env: FFMPEG (ruta a ffmpeg), WORKERS (4 por defecto), OUT_DIR (carpeta de fotogramas, ./frames)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WORKERS = +(process.env.WORKERS || 4);
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'frames');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

function serve() {
  const srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render`);
  await page.evaluate(() => window.reelReady);
  return page;
}

const grab = (page, f) => page.evaluate(f => {
  window.renderFrame(f);
  return document.getElementById('c').toDataURL('image/png').split(',')[1];
}, f);

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  const first = await openPage(browser, port);
  const { total, fps, scenes } = await first.evaluate(() => ({ total: window.TOTAL_FRAMES, fps: window.FPS, scenes: window.SCENES }));
  const si = process.argv.indexOf('--stills');
  if (process.argv.includes('--scenes')) {
    for (const s of scenes) console.log(s.id.padEnd(8), s.start.toFixed(3), s.dur.toFixed(3));
    console.log('total', (total / fps).toFixed(3), 's ·', total, 'fotogramas');
  } else if (si > 0) {
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      fs.writeFileSync(path.join(ROOT, 'stills', `t${t.toFixed(2).padStart(6, '0')}.png`), Buffer.from(await grab(first, Math.round(t * fps)), 'base64'));
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    let next = 0, done = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const page = w === 0 ? first : await openPage(browser, port);
      while (next < total) {
        const f = next++;
        fs.writeFileSync(path.join(OUT_DIR, `f${String(f).padStart(5, '0')}.png`), Buffer.from(await grab(page, f), 'base64'));
        if (++done % 300 === 0) console.log(`${done}/${total} fotogramas  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }));
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(OUT_DIR, 'f%05d.png'),
      '-i', path.join(ROOT, 'soundtrack.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(ROOT, 'fable_analista.mp4')], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
    console.log('listo: fable_analista.mp4');
  }
  await browser.close();
  srv.close();
})();
