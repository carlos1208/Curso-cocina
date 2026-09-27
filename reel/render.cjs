// Renders reel.js frame-by-frame in headless Chromium and muxes it with soundtrack.wav.
//   node render.cjs                    → reel.mp4 (master) + reel_web.mp4 (all 1200 frames)
//   node render.cjs --stills 1.2,3.7   → stills/t1.2.png … (quick look at given times)
// Env: FFMPEG (path to ffmpeg), WORKERS (default 4), OUT_DIR (frame dir, default ./frames)
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

const grab = (page, t) => page.evaluate(t => {
  window.renderFrame(Math.round(t * 60));
  return document.getElementById('c').toDataURL('image/png').split(',')[1];
}, t);

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser, port);
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      fs.writeFileSync(path.join(ROOT, 'stills', `t${t}.png`), Buffer.from(await grab(page, t), 'base64'));
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const total = 1200;
    let next = 0, done = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async () => {
      const page = await openPage(browser, port);
      while (next < total) {
        const f = next++;
        const png = await page.evaluate(f => { window.renderFrame(f); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, f);
        fs.writeFileSync(path.join(OUT_DIR, `f${String(f).padStart(4, '0')}.png`), Buffer.from(png, 'base64'));
        if (++done % 60 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }));
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '60', '-i', path.join(OUT_DIR, 'f%04d.png'),
      '-i', path.join(ROOT, 'soundtrack.wav'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'grain',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', path.join(ROOT, 'reel.mp4')];
    const run = a => { const r = spawnSync(FFMPEG, a, { stdio: 'inherit', cwd: OUT_DIR }); if (r.status !== 0) process.exit(r.status || 1); };
    run(args);
    console.log('wrote reel.mp4 (master)');
    // shareable ~13 MB version: two-pass 5 Mbps
    const web = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '60', '-i', path.join(OUT_DIR, 'f%04d.png'),
      '-i', path.join(ROOT, 'soundtrack.wav'), '-c:v', 'libx264', '-preset', 'slow', '-b:v', '5M', '-maxrate', '7M', '-bufsize', '10M'];
    run([...web, '-pass', '1', '-an', '-f', 'null', '/dev/null']);
    run([...web, '-pass', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(ROOT, 'reel_web.mp4')]);
    console.log('wrote reel_web.mp4');
  }
  await browser.close();
  srv.close();
})();
