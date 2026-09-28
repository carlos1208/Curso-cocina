// Renders brisket_ahumado.html frame-by-frame in headless Chromium.
//   node render.cjs                  → brisket.mp4 (master) + brisket_web.mp4 (no audio)
//   node render.cjs --stills 1,5.2   → stills/t01.00.png … (quick look at given times)
// Env: FFMPEG (path to ffmpeg), WORKERS (default 4), OUT_DIR (frame dir, default ./frames)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WORKERS = +(process.env.WORKERS || 4);
const OUT_DIR = process.env.OUT_DIR || path.join(ROOT, 'frames');
const PAGE = 'file://' + path.join(ROOT, 'brisket_ahumado.html') + '?render';

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  await page.goto(PAGE);
  await page.evaluate(() => window.reelReady);
  return page;
}
const grab = (page, f, type, q) => page.evaluate(async ([f, type, q]) => {
  await window.renderFrame(f);
  return document.getElementById('c').toDataURL(type, q).split(',')[1];
}, [f, type, q]);

(async () => {
  const browser = await chromium.launch();
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser);
    const { FPS } = await page.evaluate(() => window.reelInfo);
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      const name = `t${t.toFixed(2).padStart(5, '0')}.png`;
      fs.writeFileSync(path.join(ROOT, 'stills', name), Buffer.from(await grab(page, Math.round(t * FPS), 'image/png'), 'base64'));
    }
  } else {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const probe = await openPage(browser);
    const { FPS, frames: total } = await probe.evaluate(() => window.reelInfo);
    await probe.close();
    let next = 0, done = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async () => {
      const page = await openPage(browser);
      while (next < total) {
        const f = next++;
        const jpg = await grab(page, f, 'image/jpeg', 0.95);
        fs.writeFileSync(path.join(OUT_DIR, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(jpg, 'base64'));
        if (++done % 90 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    }));
    const run = a => { const r = spawnSync(FFMPEG, a, { stdio: 'inherit', cwd: OUT_DIR }); if (r.status !== 0) process.exit(r.status || 1); };
    const input = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(OUT_DIR, 'f%04d.jpg')];
    run([...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(ROOT, 'brisket.mp4')]);
    console.log('wrote brisket.mp4 (master)');
    run([...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-maxrate', '5M', '-bufsize', '8M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(ROOT, 'brisket_web.mp4')]);
    console.log('wrote brisket_web.mp4');
  }
  await browser.close();
})();
