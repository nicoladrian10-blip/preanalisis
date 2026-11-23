// Incrusta assets/logo.png, assets/icon-64.png y assets/icon-180.png dentro de index.html (data-URI).
// Uso: node tools/incrustar-recursos.js
// Se puede ejecutar tantas veces como se quiera: sustituye lo que haya incrustado.
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const html = path.join(raiz, 'index.html');
const b64 = (f) => fs.readFileSync(path.join(raiz, 'assets', f)).toString('base64');

let t = fs.readFileSync(html, 'utf8');
const antes = t.length;
t = t.replace(/window\.LOGO_SRC = "data:image\/png;base64,[^"]*";/, () => `window.LOGO_SRC = "data:image/png;base64,${b64('logo.png')}";`);
t = t.replace(/(<link rel="icon" type="image\/png" href="data:image\/png;base64,)[^"]*(")/, (_, a, b) => a + b64('icon-64.png') + b);
t = t.replace(/(<link rel="apple-touch-icon" href="data:image\/png;base64,)[^"]*(")/, (_, a, b) => a + b64('icon-180.png') + b);
fs.writeFileSync(html, t);
console.log(`index.html: ${antes} -> ${t.length} bytes`);
