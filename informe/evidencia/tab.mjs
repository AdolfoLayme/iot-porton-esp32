import { writeFileSync } from 'node:fs';
const t = (await (await fetch('http://localhost:9223/json')).json()).find(x => x.id === process.argv[2]);
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let n = 0; const env = (m, p = {}) => new Promise(r => { const id = ++n; ws.addEventListener('message', function f(e) { const d = JSON.parse(e.data); if (d.id === id) { ws.removeEventListener('message', f); r(d.result); } }); ws.send(JSON.stringify({ id, method: m, params: p })); });
const r = await env('Runtime.evaluate', { expression: process.argv[4], returnByValue: true, awaitPromise: true });
console.log(r.result.value);
const s = await env('Page.captureScreenshot', { format: 'png' }); writeFileSync(process.argv[3], Buffer.from(s.data, 'base64')); ws.close();
