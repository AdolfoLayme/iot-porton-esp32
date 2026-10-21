import { readFileSync, writeFileSync } from 'node:fs';
import { abrirPestana } from './wk-lib.mjs';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const C = Object.fromEntries(readFileSync('/home/adolfo/.config/porton/cuentas.txt', 'utf8').trim().split('\n').map(l => l.split('\t')).map(([n, e, c]) => [n, { e, c }]));
const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let n = 0; const env = (m, p = {}, s) => new Promise(r => { const id = ++n; ws.addEventListener('message', function f(e) { const d = JSON.parse(e.data); if (d.id === id) { ws.removeEventListener('message', f); r(d.result ?? d.error); } }); ws.send(JSON.stringify({ id, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
const ctx = [];
async function pagina(url, w, h, movil) {
  const { browserContextId } = await env('Target.createBrowserContext'); ctx.push(browserContextId);
  const { targetId } = await env('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId: s } = await env('Target.attachToTarget', { targetId, flatten: true });
  await env('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: movil ? 2 : 1, mobile: movil }, s);
  await env('Page.navigate', { url }, s); await dormir(4000);
  const ev = async x => (await env('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }, s)).result?.value;
  const foto = async f => { const r = await env('Page.captureScreenshot', { format: 'png' }, s); writeFileSync(f, Buffer.from(r.data, 'base64')); };
  return { ev, foto };
}
const W = await abrirPestana('550B50E73C9B8F8947EDD8DAF0A01603');
const wfoto = async f => { await W.env('Emulation.setDeviceMetricsOverride', { width: 1500, height: 860, deviceScaleFactor: 1, mobile: false }); await W.env('Page.bringToFront'); await dormir(400); const r = await W.env('Page.captureScreenshot', { format: 'png' }); writeFileSync(f, Buffer.from(r.data, 'base64')); await W.env('Emulation.clearDeviceMetricsOverride'); };
const BASE = process.argv[2] || 'http://127.0.0.1:5174';
try {
  const A = await pagina(BASE + '/', 390, 1180, true);
  await A.ev(`correo.value='${C['Usuario A'].e}';clave.value='${C['Usuario A'].c}';document.getElementById('entrar-seguro').requestSubmit()`);
  await dormir(7000);
  const leer = () => A.ev(`['titulo-estado','detalle','mensaje','distancia'].map(i=>document.getElementById(i).textContent).join(' | ')`);
  const esperar = async (t, max = 40000) => { const t0 = Date.now(); while (Date.now() - t0 < max) { if ((await leer()).includes(t)) return true; await dormir(500); } return false; };
  for (let i = 0; i < 40 && !(await A.ev("online.textContent")).includes('en línea'); i++) await dormir(500);
  console.log('A:', await leer());
  await A.ev(`document.querySelector('[data-orden=abrir]').click()`); console.log('abierto', await esperar('abierto'));
  const casa = await pagina(BASE + '/casa.html?camara=2,3.2,-15.5,-3,0.5,-9.5', 1440, 900, false); await dormir(12000);
  await casa.ev(`document.getElementById('carro-puerta').click()`);
  console.log('obstáculo por el carro:', await esperar('Obstáculo', 60000)); await dormir(1500);
  await casa.foto('doc/ev/c-carro-puerta.png');
  await A.ev(`document.querySelector('[data-orden=cerrar]').click()`); await dormir(2500);
  console.log('A tras cerrar:', await leer());
  await A.foto('doc/ev/a-carro-bloqueado.png'); await wfoto('doc/ev/w-carro-bloqueado.png');
  await casa.ev(`document.getElementById('carro').click()`); await dormir(9000);
  console.log('A tras despejar:', await leer());
  await A.ev(`document.querySelector('[data-orden=cerrar]').click()`); console.log('cerrado', await esperar('cerrado'));
  await casa.foto('doc/ev/c-carro-cochera.png');
} finally { for (const c of ctx) await env('Target.disposeBrowserContext', { browserContextId: c }); ws.close(); W.cerrar(); }
