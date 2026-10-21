// Corre los escenarios de prueba reales y guarda capturas en doc/ev/.
import { abrirPestana } from './wk-lib.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const EV = 'doc/ev/', APP = 'https://porton-iot.vercel.app';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const cuentas = Object.fromEntries(readFileSync('/home/adolfo/.config/porton/cuentas.txt', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([n, e, c]) => [n, { e, c }]));

// --- Navegador: contextos aislados (cada usuario = un "celular" distinto) ---
const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let n = 0; const env = (m, p = {}, s) => new Promise(r => { const id = ++n; ws.addEventListener('message', function f(e) { const d = JSON.parse(e.data); if (d.id === id) { ws.removeEventListener('message', f); r(d.result ?? d.error); } }); ws.send(JSON.stringify({ id, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
const contextos = [];
async function pagina(url, ancho = 390, alto = 844, movil = true) {
  const { browserContextId } = await env('Target.createBrowserContext'); contextos.push(browserContextId);
  const { targetId } = await env('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: s } = await env('Target.attachToTarget', { targetId, flatten: true });
  await env('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 2, mobile: movil }, s);
  await env('Page.navigate', { url }, s); await dormir(4000);
  const ev = async x => (await env('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s)).result?.value;
  const foto = async (nombre, completa = false) => {
    const r = await env('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, s);
    writeFileSync(EV + nombre, Buffer.from(r.data, 'base64')); console.log('foto', nombre);
  };
  return { ev, foto, s };
}
async function usuario(nombre) {
  const p = await pagina(APP + '/', 390, 1180);
  await p.ev(`correo.value=${JSON.stringify(cuentas[nombre].e)};clave.value=${JSON.stringify(cuentas[nombre].c)};document.getElementById('entrar-seguro').requestSubmit()`);
  await dormir(7000);
  p.orden = o => p.ev(`document.querySelector('[data-orden=${o}]').click()`);
  p.esperar = async (txt, max = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if ((await p.ev(`document.getElementById('titulo-estado').textContent`)).includes(txt)) return true; await dormir(400); } console.log('  (no llegó a', txt, ')'); return false; };
  p.leer = () => p.ev(`['titulo-estado','porcentaje','detalle','mensaje'].map(i=>document.getElementById(i).textContent).join(' | ')`);
  console.log(nombre, await p.ev(`identidad.textContent+' / '+online.textContent`));
  return p;
}

// --- Wokwi ---
const W = await abrirPestana('550B50E73C9B8F8947EDD8DAF0A01603');
await W.env('Emulation.setDeviceMetricsOverride', { width: 1500, height: 860, deviceScaleFactor: 1, mobile: false });
await W.env('Page.bringToFront'); await dormir(1500);
{ const zoom = async (pasos, dy) => { const a = JSON.parse(await W.js(`JSON.stringify(document.querySelector('wokwi-lcd1602').getBoundingClientRect())`)), b = JSON.parse(await W.js(`JSON.stringify(document.querySelector('wokwi-hc-sr04').getBoundingClientRect())`));
    const x = (a.x + b.x + b.width) / 2, y = (a.y + b.y + b.height) / 2;
    for (let i = 0; i < pasos; i++) await W.env('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }); await dormir(600); };
  await zoom(Number(process.env.ZOOM_OUT || 0), 120); await zoom(Number(process.env.ZOOM_IN || 0), -120);
  const a = JSON.parse(await W.js(`JSON.stringify([document.querySelector('wokwi-lcd1602').getBoundingClientRect(),document.querySelector('wokwi-hc-sr04').getBoundingClientRect(),document.querySelector('wokwi-servo').getBoundingClientRect()])`)); console.log('zoom', a.map(r => [r.x|0, r.y|0, r.width|0])); }
const wfoto = async nombre => { await W.env('Page.bringToFront'); const r = await W.env('Page.captureScreenshot', { format: 'png' }); writeFileSync(EV + nombre, Buffer.from(r.data, 'base64')); console.log('foto', nombre); };
async function distancia(cm) {
  const hay = await W.js(`!![...document.querySelectorAll('input[type=range]')].find(i=>i.offsetParent&&i.max==='400')`);
  if (!hay) { const r = JSON.parse(await W.js(`JSON.stringify(document.querySelector('wokwi-hc-sr04').getBoundingClientRect())`)); await W.clic(r.x + r.width / 2, r.y + r.height / 2); await dormir(500); }
  await W.js(`(()=>{const i=[...document.querySelectorAll('input[type=range]')].find(i=>i.offsetParent&&i.max==='400');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'${cm}');i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
const cerrarPopup = () => W.js(`document.querySelector('[aria-label="Close"], button[title=Close]')?.click()`);

try {
  const A = await usuario('Usuario A'), B = await usuario('Usuario B');
  await distancia(100); await cerrarPopup();
  await A.orden('cerrar'); await A.esperar('cerrado');
  await wfoto('w-00-reposo.png');

  // Caso 1: apertura, cierre y apertura parcial
  await A.orden('abrir'); await A.esperar('Abriendo'); await dormir(500); await wfoto('w-11-abriendo.png'); await A.foto('a-11-abriendo.png');
  await A.esperar('abierto'); await dormir(800); await wfoto('w-12-abierto.png'); await A.foto('a-12-abierto.png'); console.log('A', await A.leer());
  await A.orden('cerrar'); await A.esperar('cerrado'); await dormir(800); await wfoto('w-13-cerrado.png'); await A.foto('a-13-cerrado.png');
  await A.ev(`(()=>{const i=apertura;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'50');i.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('parcial').requestSubmit()})()`);
  await A.esperar('detenido'); await dormir(800); await wfoto('w-14-parcial.png'); await A.foto('a-14-parcial.png'); console.log('A', await A.leer());
  await A.orden('cerrar'); await A.esperar('cerrado');

  // Caso 3: dos usuarios a la vez
  await A.orden('abrir'); await A.esperar('Abriendo'); await dormir(300); await B.orden('cerrar'); await dormir(700);
  await B.foto('b-31-ocupado.png'); await A.foto('a-31-turno.png'); await wfoto('w-31-ocupado.png'); console.log('B', await B.leer());
  await A.esperar('abierto');
  await A.orden('cerrar'); await A.esperar('Cerrando'); await dormir(500); await B.orden('parar'); await B.esperar('detenido');
  await dormir(600); await wfoto('w-32-parar.png'); await B.foto('b-32-parar.png'); console.log('B', await B.leer());

  // Caso 2: obstáculo
  await A.orden('abrir'); await A.esperar('abierto');
  await A.orden('cerrar'); await A.esperar('Cerrando'); await dormir(500); await distancia(10); await A.esperar('Obstáculo');
  await dormir(600); await wfoto('w-21-obstaculo.png'); await A.foto('a-21-obstaculo.png'); console.log('A', await A.leer());
  await dormir(4000);
  await A.orden('cerrar'); await dormir(1500); await A.foto('a-22-bloqueado.png'); await wfoto('w-22-bloqueado.png'); console.log('A', await A.leer());
  await distancia(100); await dormir(800); await cerrarPopup(); await dormir(1500);
  await A.orden('cerrar'); await A.esperar('cerrado'); await dormir(800); await wfoto('w-23-despejado.png'); console.log('A', await A.leer());

  // Casa 3D (portón abierto) y app en escritorio
  await A.orden('abrir'); await A.esperar('abierto');
  const casa = await pagina(APP + '/casa.html', 1440, 900, false); await dormir(14000); await casa.foto('c-casa-abierto.png');
  const Ad = await pagina(APP + '/', 1440, 900, false);
  await Ad.ev(`correo.value=${JSON.stringify(cuentas['Usuario A'].e)};clave.value=${JSON.stringify(cuentas['Usuario A'].c)};document.getElementById('entrar-seguro').requestSubmit()`);
  await dormir(8000); await Ad.foto('d-app-escritorio.png');
  await A.orden('cerrar'); await dormir(4000);

  // Administración
  const adm = await usuario('Admin');
  await adm.ev(`document.querySelector('[data-vista=historial]').click()`); await dormir(3500); await adm.foto('m-historial.png');
  await adm.ev(`document.querySelector('[data-vista=miembros]').click()`); await dormir(3500); await adm.foto('m-miembros.png');

  // Login y error de contraseña
  const L = await pagina(APP + '/'); await L.foto('l-login.png');
  await L.ev(`correo.value='usuario.a@porton-iot.app';clave.value='clave-mala';document.getElementById('ver-clave').click();document.getElementById('entrar-seguro').requestSubmit()`);
  await dormir(3500); await L.foto('l-error.png');
} finally {
  await W.env('Emulation.clearDeviceMetricsOverride'); W.cerrar();
  for (const c of contextos) await env('Target.disposeBrowserContext', { browserContextId: c });
  ws.close();
}
