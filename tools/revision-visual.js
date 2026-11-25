// Revisión visual y de red con Chrome (DevTools Protocol), sin dependencias.
// 1) Arranca antes el servidor local: node tools/servidor-local.js
// 2) node tools/revision-visual.js [carpeta-salida] [url-base]
// Recorre el formulario como un cliente (Exprés → completar el resto → diagnóstico) a 375 px y 1440 px,
// guarda capturas a página completa y lista TODAS las peticiones de red que hace la página.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SALIDA = path.resolve(process.argv[2] || path.join(__dirname, '..', 'docs', 'capturas'));
const BASE = process.argv[3] || 'http://localhost:8765/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PUERTO = 9333;
fs.mkdirSync(SALIDA, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'preanalisis-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--remote-debugging-port=' + PUERTO, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  let lista;
  for (let i = 0; i < 50; i++) { try { lista = await (await fetch('http://127.0.0.1:' + PUERTO + '/json/list')).json(); if (lista.length) break; } catch (e) {} await espera(200); }
  const pagina = lista.find((t) => t.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pendientes = new Map(); const eventos = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pendientes.has(d.id)) { pendientes.get(d.id)(d); pendientes.delete(d.id); } else if (d.method) eventos.push(d);
  });
  const cdp = (method, params) => new Promise((res, rej) => { const n = ++id; pendientes.set(n, (d) => d.error ? rej(new Error(method + ': ' + d.error.message)) : res(d.result)); ws.send(JSON.stringify({ id: n, method, params: params || {} })); });
  const js = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text); return r.result.value; };

  await cdp('Network.enable'); await cdp('Page.enable'); await cdp('Runtime.enable');
  const peticiones = [];
  const registrar = () => { eventos.splice(0).forEach((e) => { if (e.method === 'Network.requestWillBeSent') peticiones.push({ url: e.params.request.url, metodo: e.params.request.method, tipo: e.params.type }); }); };

  async function viewport(w, h, movil) { await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: movil }); }
  async function ir(url) { await cdp('Page.navigate', { url }); await espera(900); }
  async function captura(nombre) {
    await espera(250);
    const m = await cdp('Page.getLayoutMetrics');
    const alto = Math.ceil(m.cssContentSize.height), ancho = Math.ceil(m.cssLayoutViewport.clientWidth);
    const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: ancho, height: alto, scale: 1 } });
    fs.writeFileSync(path.join(SALIDA, nombre + '.png'), Buffer.from(r.data, 'base64'));
    const desborde = await js('document.documentElement.scrollWidth > innerWidth');
    console.log('captura', nombre, ancho + 'x' + alto, desborde ? '⚠ DESBORDE HORIZONTAL' : 'sin desborde horizontal');
  }
  // Rellena usando los propios controles de la página (clics y eventos input/change)
  const RELLENAR = `window.__fill = (vals) => { for (const [k, v] of Object.entries(vals)) {
      const radios = document.querySelectorAll('input[name="f_' + k + '"]');
      if (radios.length) { [].concat(v).forEach((x) => { const i = document.querySelector('input[name="f_' + k + '"][value="' + x + '"]'); if (!i) throw new Error('opción ' + k + '=' + x); if (!i.checked) i.click(); }); continue; }
      const el = document.getElementById('f_' + k); if (!el) throw new Error('campo ' + k);
      if (el.tagName === 'SELECT') { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
      else { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); } } };
    window.__sig = () => { document.getElementById('b-sig').click(); return document.querySelector('h1,h2').textContent; }; true`;
  const llenar = (o) => js(RELLENAR + ';__fill(' + JSON.stringify(o) + ');true');
  const sig = () => js(RELLENAR + ';__sig()');
  const clic = (sel) => js('document.querySelector(' + JSON.stringify(sel) + ').click();true');

  for (const [w, h, movil, pre] of [[375, 812, true, 'm'], [1440, 900, false, 'd']]) {
    await viewport(w, h, movil);
    await ir(BASE);
    await js('sessionStorage.clear();true'); await ir(BASE);
    await captura(pre + '-01-portada');
    await clic('#b-empezar'); await captura(pre + '-02-modalidad');
    await clic('.modo[data-modo="express"]');
    await llenar({ edad: 41, pareja: 'si', edadPareja: 39, hogar: '4', hijos: '2', hijoEdad1: 9, hijoEdad2: 13, laboral: 'asalariado', laboralPareja: 'asalariado', vivienda: 'hipoteca' });
    await captura(pre + '-03-perfil');
    await sig(); await sig(); // validación: sin ingresos no avanza
    await captura(pre + '-04-ingresos-validacion');
    await llenar({ ingTitular: 2100, pagasTitular: '14', ingPareja: 1500, pagasPareja: '12', estabilidad: 'fijos' });
    await captura(pre + '-05-ingresos');
    await sig();
    await llenar({ cuotaHipoteca: 750, gSuministros: 180, gSeguros: 90, gColegios: 200, gTransporte: 250, gOtrosFijos: 130 }); await sig();
    await llenar({ gVariables: 900, ahorroMensual: 600, ahorroDisponible: 18000 }); await captura(pre + '-06-ahorro-mes'); await sig();
    await llenar({ hipPendiente: 140000, deudas: ['coche'] }); await llenar({ d_coche_pend: 9000, d_coche_cuota: 250 }); await captura(pre + '-07-deudas'); await sig();
    await llenar({ objetivos: ['colchon', 'estudios'] }); await llenar({ o_colchon_importe: 10000, o_colchon_plazo: 2, o_estudios_importe: 20000, o_estudios_plazo: 12 }); await sig();
    await llenar({ preocupacion: 'jubilacion', horario: ['tardes'], comentario: 'Quiero saber si llegaremos bien a la jubilación' }); await sig();
    await captura(pre + '-08-diagnostico-expres');
    // Completar el resto sin perder lo respondido
    await clic('#b-completar');
    await llenar({ savCuentas: 18000, savDepositos: 0, savFondos: 2500, savPlanes: 7000, savAcciones: 0, savOtros: 0 }); await captura(pre + '-08a-ahorro-acumulado'); await sig();
    await llenar({ hipTipo: 'variable', hipAnos: 22 }); await sig();
    await llenar({ valorVivienda: 240000, otrosInmuebles: 'no' }); await captura(pre + '-08b-inmuebles'); await sig();
    await llenar({ seg_vida: 'si', seg_salud: 'no', seg_hogar: 'si', seg_decesos: 'nose', seg_ahorro: 'no' });
    await llenar({ seg_vida_prima: 25, seg_vida_capital: 150000, seg_hogar_prima: 30 }); await captura(pre + '-09-proteccion'); await sig();
    await llenar({ edadJubilacion: 67, anosCotizados: 15 }); await sig();
    await captura(pre + '-09b-objetivos'); await sig(); // objetivos ya respondidos
    await llenar({ r1: '2', r2: '2', r3: '2', r4: '1' }); await captura(pre + '-10-riesgo'); await sig();
    await sig(); // final ya respondido
    await captura(pre + '-11-diagnostico-completo');
    // Recarga: debe conservar el progreso (sessionStorage)
    await ir(BASE);
    const tras = await js('document.querySelector("h1,h2").textContent');
    console.log('tras recargar:', tras);
    await clic('#b-copiar');
  }
  // Captura del mensaje de WhatsApp completo (datos ficticios de demostración)
  await viewport(430, 900, true);
  await ir(BASE + '?demo=completo');
  const caja = await js('(() => { document.querySelector(".top").style.display = "none"; const p = document.querySelector(".preview"); p.style.maxHeight = "none"; p.scrollIntoView(); const r = p.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()');
  await espera(200);
  const img = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: caja.x, y: caja.y, width: caja.w, height: caja.h, scale: 2 } });
  fs.writeFileSync(path.join(SALIDA, 'texto-whatsapp-ejemplo.png'), Buffer.from(img.data, 'base64'));
  console.log('captura texto-whatsapp-ejemplo', Math.round(caja.w) + 'x' + Math.round(caja.h));
  registrar();
  const texto = await js('document.querySelector(".burbuja").innerText');
  fs.writeFileSync(path.join(SALIDA, 'texto-whatsapp-ejemplo.txt'), texto);
  const enlace = await js('document.getElementById("b-wa").href');

  console.log('\nPETICIONES DE RED (' + peticiones.length + '):');
  const resumen = {};
  peticiones.forEach((p) => { const k = p.metodo + ' ' + (p.url.startsWith('data:') ? 'data:(incrustado)' : p.url); resumen[k] = (resumen[k] || 0) + 1; });
  Object.entries(resumen).forEach(([k, n]) => console.log('  ' + n + ' × ' + k));
  const externas = peticiones.filter((p) => !p.url.startsWith('data:') && !p.url.startsWith(BASE));
  const conDatos = peticiones.filter((p) => p.metodo !== 'GET' || /[?&](?!demo=)[^=]+=/.test(p.url.replace(BASE, '')));
  console.log('Externas:', externas.length, '· Con datos (POST o query):', conDatos.length);
  console.log('Enlace WhatsApp (no se abre):', enlace.slice(0, 90) + '…');
  ws.close(); chrome.kill();
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {}
}
main().catch((e) => { console.error(e); process.exit(1); });
