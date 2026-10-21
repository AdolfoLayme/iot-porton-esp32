// Llave MQTT de SOLO LECTURA para la casa 3D (2026-10-21, pedido de Adolfo: "que se abra donde sea y se conecte sola").
// Lee porton/estado y porton/online y publica solo en porton/entorno: no manda órdenes ni ve quién las mandó.
// Va dentro del JS publicado (es pública a propósito). Uso: node herramientas/token-visor.mjs [--dias N]
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const master = readFileSync(`${homedir()}/.config/porton/flespi-master`, 'utf8').trim();
const d = process.argv.indexOf('--dias'), dias = d > 0 ? Number(process.argv[d + 1]) : 30;
const acl = [...['estado', 'online'].map(t => ({ uri: 'mqtt', topic: `porton/${t}`, actions: ['subscribe'] })),
  // La casa avisa al ESP32 la distancia al carro que cruza el haz (solo puede publicar aquí).
  { uri: 'mqtt', topic: 'porton/entorno', actions: ['publish'] }];
const r = await fetch('https://flespi.io/platform/tokens', {
  method: 'POST',
  headers: { Authorization: `FlespiToken ${master}`, 'Content-Type': 'application/json' },
  body: JSON.stringify([{ info: 'porton-visor-casa', expire: Math.floor(Date.now() / 1000) + dias * 86400, access: { type: 2, acl } }]),
});
const cuerpo = await r.json();
if (!r.ok || cuerpo.errors) throw new Error(JSON.stringify(cuerpo.errors ?? cuerpo));
const { key, id, expire } = cuerpo.result[0];
const ruta = new URL('../web/.env.local', import.meta.url);
const env = readFileSync(ruta, 'utf8').split('\n').filter(l => l && !/^VITE_VISOR_/.test(l));
env.push(`VITE_VISOR_TOKEN=${key}`, `VITE_VISOR_VENCE=${expire * 1000}`);
writeFileSync(ruta, env.join('\n') + '\n', { mode: 0o600 });
console.log(`llave de solo lectura creada (id ${id}, vence en ${dias} días); escrita en web/.env.local`);
