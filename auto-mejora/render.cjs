// Renderiza video.js fotograma a fotograma en Chromium headless y lo codifica con ffmpeg.
//   node render.cjs --events            → events.json (lo lee audio.py)
//   node render.cjs --stills 3,12.5     → stills/t3.png, stills/t12.5.png
//   node render.cjs                     → auto-mejora-recursiva.mp4 (necesita soundtrack.wav)
// Cada worker renderiza un tramo continuo y lo pasa por tubería a su propio ffmpeg,
// así no se escriben miles de PNG en disco. Luego los tramos se concatenan sin recodificar.
// Env: FFMPEG (ruta a ffmpeg), WORKERS (por defecto 4), NAME (nombre del archivo de salida)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const WORKERS = +(process.env.WORKERS || 4);
const NAME = process.env.NAME || 'auto-mejora-recursiva';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.woff2': 'font/woff2', '.wav': 'audio/wav' };

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
  await page.evaluate(() => window.videoReady);
  return page;
}

const grab = (page, f) => page.evaluate(f => {
  window.renderFrame(f);
  return document.getElementById('c').toDataURL('image/png').split(',')[1];
}, f);

const run = a => { const r = spawnSync(FFMPEG, a, { stdio: 'inherit', cwd: ROOT }); if (r.status !== 0) process.exit(r.status || 1); };

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch();
  const meta = await (async () => { const p = await openPage(browser, port); const m = await p.evaluate(() => window.VIDEO); await p.close(); return m; })();

  if (process.argv.includes('--events')) {
    fs.writeFileSync(path.join(ROOT, 'events.json'), JSON.stringify({ total: meta.TOTAL, scenes: meta.scenes, events: meta.events }, null, 1));
    console.log(`events.json: ${meta.events.length} eventos, ${meta.TOTAL.toFixed(1)} s`);
  } else if (process.argv.includes('--stills')) {
    const page = await openPage(browser, port);
    fs.mkdirSync(path.join(ROOT, 'stills'), { recursive: true });
    const times = process.argv[process.argv.indexOf('--stills') + 1].split(',').map(Number);
    for (const t of times) fs.writeFileSync(path.join(ROOT, 'stills', `t${String(t.toFixed(2)).padStart(6, '0')}.png`), Buffer.from(await grab(page, Math.round(t * meta.FPS)), 'base64'));
    console.log(`${times.length} fotogramas en stills/`);
  } else {
    const total = meta.frames;
    const segDir = path.join(ROOT, 'segments');
    fs.mkdirSync(segDir, { recursive: true });
    const per = Math.ceil(total / WORKERS);
    let done = 0; const t0 = Date.now();
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * per, b = Math.min(total, a + per);
      const page = await openPage(browser, port);
      const ff = spawn(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.FPS), '-c:v', 'png', '-i', '-',
        '-vf', 'noise=alls=4:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-tune', 'animation', '-g', '60',
        '-pix_fmt', 'yuv420p', path.join(segDir, `seg${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
      for (let f = a; f < b; f++) {
        const buf = Buffer.from(await grab(page, f), 'base64');
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (++done % 300 === 0) console.log(`${done}/${total} fotogramas  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      }
      ff.stdin.end();
      await closed;
      await page.close();
    }));
    const list = path.join(segDir, 'list.txt');
    fs.writeFileSync(list, Array.from({ length: WORKERS }, (_, w) => `file 'seg${w}.mp4'`).join('\n'));
    run(['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', path.join(ROOT, 'soundtrack.wav'),
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', path.join(ROOT, `${NAME}.mp4`)]);
    console.log(`listo: ${NAME}.mp4 en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  await browser.close();
  srv.close();
})();
