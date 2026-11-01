// Renders the SVG illustrations in headless Chromium → ../img/<name>.jpg (1080x1920).
//   node illus/render.cjs [name …]   (default: all scenes)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const S = require('./scenes.cjs');
const OUT = path.join(__dirname, '..', 'img');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(S);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const n of names) {
    const t0 = Date.now();
    await page.setContent(`<html><body style="margin:0;background:#000">${S[n]()}</body></html>`);
    const png = path.join(OUT, `${n}.png`);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', path.join(OUT, `${n}.jpg`)], { stdio: 'inherit' });
    fs.unlinkSync(png);
    console.log(n, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  await browser.close();
})();
