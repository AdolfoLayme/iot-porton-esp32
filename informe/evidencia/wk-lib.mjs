// Conexión CDP persistente a una pestaña (por id) con utilidades.
export async function abrirPestana(id) {
  const t = (await (await fetch('http://127.0.0.1:9223/json')).json()).find(x => x.id === id);
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let n = 0;
  const env = (m, p = {}) => new Promise(r => { const i = ++n; ws.addEventListener('message', function f(e) { const d = JSON.parse(e.data); if (d.id === i) { ws.removeEventListener('message', f); r(d.result ?? d.error); } }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const js = async x => (await env('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
  const clic = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await env('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
  return { env, js, clic, cerrar: () => ws.close() };
}
