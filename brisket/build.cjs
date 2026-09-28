// Inlines brisket.js and the fonts into one self-contained file: brisket_ahumado.html
//   node build.cjs
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
html = html.replace(/url\((fonts\/[^)]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${fs.readFileSync(path.join(ROOT, f)).toString('base64')})`);
const js = fs.readFileSync(path.join(ROOT, 'brisket.js'), 'utf8');
if (js.includes('</script')) throw new Error('brisket.js cannot be inlined as-is');
html = html.replace('<script src="brisket.js"></script>', () => `<script>\n${js}</script>`);
fs.writeFileSync(path.join(ROOT, 'brisket_ahumado.html'), html);
console.log(`wrote brisket_ahumado.html (${(html.length / 1024).toFixed(0)} KB)`);
