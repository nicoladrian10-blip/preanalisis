// Servidor estático mínimo para probar la página en local (no hace falta para publicarla).
// Uso: node tools/servidor-local.js   →  http://localhost:8765/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript', '.md': 'text/plain; charset=utf-8' };
const puerto = Number(process.env.PORT) || 8765;
http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.normalize(path.join(raiz, ruta === '/' ? 'index.html' : ruta));
  if (!f.startsWith(raiz)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    console.log(req.method, req.url, err ? 404 : 200);
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(puerto, () => console.log('Sirviendo en http://localhost:' + puerto + '/'));
