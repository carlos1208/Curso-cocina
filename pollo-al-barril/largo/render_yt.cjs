// Renders engine_yt.js (timeline.json) in headless Chromium. Each worker renders a contiguous range of frames and
// pipes them straight into its own ffmpeg (no frames on disk); the segments are then joined without re-encoding.
//   node render_yt.cjs                     → video_sin_audio.mp4 (1920x1080, 30 fps, CRF 16)
//   node render_yt.cjs --stills 3,40.5     → stills/t003.00.png …
//   node render_yt.cjs --range 30:45       → preview_30-45.mp4 (a section, for quick review)
//   TL=timeline_short.json node render_yt.cjs → short_sin_audio.mp4 (the vertical Short; stills go to stills_short/)
// Env: FFMPEG, WORKERS (default 4). Run from the project folder.
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const HERE = process.cwd(), ROOT = HERE;
const FFMPEG = process.env.FFMPEG || 'ffmpeg', WORKERS = +(process.env.WORKERS || 4);
const TLF = process.env.TL || '', SHORT = TLF.includes('short');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.json': 'application/json' };

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
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exit(1); });
  await page.goto(`http://127.0.0.1:${port}/index.html?render${TLF ? '&tl=' + TLF : ''}`);
  await page.evaluate(() => window.reelReady);
  return page;
}
const grab = (page, f, type, q) => page.evaluate(async ([f, type, q]) => {
  await window.renderFrame(f);
  return document.getElementById('c').toDataURL(type, q).split(',')[1];
}, [f, type, q]);

(async () => {
  const srv = await serve(), port = srv.address().port, browser = await chromium.launch();
  const si = process.argv.indexOf('--stills');
  if (si > 0) {
    const page = await openPage(browser, port);
    const { FPS } = await page.evaluate(() => window.reelInfo);
    const sd = SHORT ? 'stills_short' : 'stills';
    fs.mkdirSync(path.join(HERE, sd), { recursive: true });
    for (const t of process.argv[si + 1].split(',').map(Number)) {
      const name = `t${t.toFixed(2).padStart(6, '0')}.png`;
      fs.writeFileSync(path.join(HERE, sd, name), Buffer.from(await grab(page, Math.round(t * FPS), 'image/png'), 'base64'));
    }
  } else {
    const probe = await openPage(browser, port);
    const { FPS, frames: total } = await probe.evaluate(() => window.reelInfo);
    await probe.close();
    const ri = process.argv.indexOf('--range');
    const [f0, f1] = ri > 0 ? process.argv[ri + 1].split(':').map(s => Math.round(+s * FPS)) : [0, total];
    const n = f1 - f0, per = Math.ceil(n / WORKERS), segDir = path.join(HERE, SHORT ? 'segments_short' : 'segments');
    fs.mkdirSync(segDir, { recursive: true });
    let done = 0; const t0 = Date.now();
    const segs = await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = f0 + w * per, b = Math.min(f1, a + per); if (a >= b) return null;
      const seg = path.join(segDir, `seg${w}.mp4`);
      const ff = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise(r => ff.on('close', r));
      const page = await openPage(browser, port);
      for (let f = a; f < b; f++) {
        const buf = Buffer.from(await grab(page, f, 'image/jpeg', 0.95), 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (++done % 150 === 0) console.log(`${done}/${n} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await closed; await page.close();
      return seg;
    }));
    const list = path.join(segDir, 'list.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
    const outName = ri > 0 ? `preview_${process.argv[ri + 1].replace(':', '-')}.mp4` : SHORT ? 'short_sin_audio.mp4' : 'video_sin_audio.mp4';
    const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(HERE, outName)], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);
    console.log(`wrote ${outName} (${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  await browser.close(); srv.close();
})();
