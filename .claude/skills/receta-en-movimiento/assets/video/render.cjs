// Renders engine.js (driven by recipe.json) frame-by-frame in headless Chromium and muxes it with soundtrack.wav.
// Run from the project folder: node render.cjs
//   node render.cjs                  → receta.mp4 (master) + receta_web.mp4 (NAME=... to rename)
//   node render.cjs --stills 1,5.2   → stills/t1.png … (quick look at given times)
//   QUERY=photos node render.cjs    → ignore clips, photos only
// Env: FFMPEG (path to ffmpeg), WORKERS (default 4), OUT_DIR (frame dir, default ./frames)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = process.cwd();
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WORKERS = +(process.env.WORKERS || 4);
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'frames');
const QUERY = process.env.QUERY ? '&' + process.env.QUERY : '';      // e.g. QUERY=clips
const NAME = process.env.NAME || 'receta';                          // output basename
const AUDIO = process.env.AUDIO || 'soundtrack.wav';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.json': 'application/json' };

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
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render${QUERY}`);
  await page.evaluate(() => window.reelReady);
  return page;
}
const grab = (page, f, type, q) => page.evaluate(async ([f, type, q]) => {
  await window.renderFrame(f);
  return document.getElementById('c').toDataURL(type, q).split(',')[1];
}, [f, type, q]);

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser, port);
    const { FPS } = await page.evaluate(() => window.reelInfo);
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      const name = `t${String(t.toFixed(2)).padStart(5, '0')}.png`;
      fs.writeFileSync(path.join(ROOT, 'stills', name), Buffer.from(await grab(page, Math.round(t * FPS), 'image/png'), 'base64'));
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const probe = await openPage(browser, port);
    const { FPS, frames: total } = await probe.evaluate(() => window.reelInfo);
    await probe.close();
    let next = 0, done = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async () => {
      const page = await openPage(browser, port);
      while (next < total) {
        const f = next++;
        const jpg = await grab(page, f, 'image/jpeg', 0.96);
        fs.writeFileSync(path.join(OUT_DIR, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(jpg, 'base64'));
        if (++done % 60 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }));
    const run = a => { const r = spawnSync(FFMPEG, a, { stdio: 'inherit', cwd: OUT_DIR }); if (r.status !== 0) process.exit(r.status || 1); };
    const input = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(OUT_DIR, 'f%04d.jpg'), '-i', path.join(ROOT, AUDIO)];
    run([...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', path.join(ROOT, `${NAME}.mp4`)]);
    console.log(`wrote ${NAME}.mp4 (master)`);
    const web = [...input, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '4M', '-maxrate', '6M', '-bufsize', '8M'];
    run([...web, '-pass', '1', '-an', '-f', 'null', '/dev/null']);
    run([...web, '-pass', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(ROOT, `${NAME}_web.mp4`)]);
    console.log(`wrote ${NAME}_web.mp4`);
  }
  await browser.close();
  srv.close();
})();
