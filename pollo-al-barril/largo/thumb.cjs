// Renders thumb.html to miniatura.png (1280x720) with the same local server trick as render_yt.cjs.
const http = require('http'), fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const HERE = process.cwd(), ROOT = HERE;
const T = { '.html': 'text/html', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`http://127.0.0.1:${srv.address().port}/thumb.html`); await p.waitForFunction(() => window.done);
  fs.writeFileSync(path.join(HERE, 'miniatura.png'), Buffer.from((await p.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64'));
  await b.close(); srv.close(); console.log('wrote miniatura.png');
})();
