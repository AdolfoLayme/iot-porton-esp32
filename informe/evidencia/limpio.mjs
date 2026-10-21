// Pestaña en un contexto aislado (sin cookies ni sesión), como un navegador nuevo.
import { writeFileSync } from 'node:fs';
const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let n = 0; const env = (m, p = {}, s) => new Promise(r => { const id = ++n; ws.addEventListener('message', function f(e) { const d = JSON.parse(e.data); if (d.id === id) { ws.removeEventListener('message', f); r(d.result ?? d.error); } }); ws.send(JSON.stringify({ id, method: m, params: p, ...(s ? { sessionId: s } : {}) })); });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const { browserContextId } = await env('Target.createBrowserContext');
const { targetId } = await env('Target.createTarget', { url: process.argv[2], browserContextId });
const { sessionId } = await env('Target.attachToTarget', { targetId, flatten: true });
try {
  for (let i = 0; i < 5; i++) { await dormir(6000); const r = await env('Runtime.evaluate', { expression: process.argv[3], returnByValue: true }, sessionId); console.log((i + 1) * 6, r.result?.value); }
  const s = await env('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync('limpio.png', Buffer.from(s.data, 'base64'));
} finally { await env('Target.disposeBrowserContext', { browserContextId }); ws.close(); }
