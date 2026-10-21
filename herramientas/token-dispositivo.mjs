// Crea la llave MQTT del ESP32 (1 año) y escribe wokwi/config.h (ignorado por git) en modo seguro.
// Uso: node herramientas/token-dispositivo.mjs [--wifi SSID CLAVE] [--dias N]
// Wokwi gratis publica el código: para la simulación usa una llave corta (p. ej. --dias 30) y revócala después.
// Sin --wifi usa la red simulada de Wokwi. Para la maqueta real: --wifi "MiCasa" "clave".
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const dir = `${homedir()}/.config/porton`;
const master = readFileSync(`${dir}/flespi-master`, 'utf8').trim();
const i = process.argv.indexOf('--wifi');
const [ssid, clave] = i > 0 ? process.argv.slice(i + 1, i + 3) : ['Wokwi-GUEST', ''];
const d = process.argv.indexOf('--dias'), dias = d > 0 ? Number(process.argv[d + 1]) : 365;

const pub = topic => ({ uri: 'mqtt', topic, actions: ['publish'] });
const sub = topic => ({ uri: 'mqtt', topic, actions: ['subscribe'] });
// El portón es el único que puede publicar estado/evento/online: nadie puede hacerse pasar por él.
const acl = [...['estado', 'evento', 'online', 'pong/+'].map(t => pub(`porton/${t}`)), sub('porton/cmd/+'), sub('porton/miembros'), sub('porton/entorno')];
const r = await fetch('https://flespi.io/platform/tokens', {
  method: 'POST',
  headers: { Authorization: `FlespiToken ${master}`, 'Content-Type': 'application/json' },
  body: JSON.stringify([{ info: ssid === 'Wokwi-GUEST' ? 'porton-dispositivo-wokwi' : 'porton-dispositivo', expire: Math.floor(Date.now() / 1000) + dias * 86400, access: { type: 2, acl } }]),
});
const cuerpo = await r.json();
if (!r.ok || cuerpo.errors) throw new Error(JSON.stringify(cuerpo.errors ?? cuerpo));
const token = cuerpo.result[0].key;

const plantilla = readFileSync(new URL('../wokwi/config.ejemplo.h', import.meta.url), 'utf8');
const config = plantilla
  .replace(/#define MODO_SEGURO \d/, '#define MODO_SEGURO 1')
  .replace(/WIFI_SSID = ".*?"/, `WIFI_SSID = ${JSON.stringify(ssid)}`)
  .replace(/WIFI_PASS = ".*?"/, `WIFI_PASS = ${JSON.stringify(clave ?? '')}`)
  .replace(/TOPIC_BASE = ".*?"/, 'TOPIC_BASE = "porton"')
  .replace(/MQTT_TOKEN = ".*?"/, `MQTT_TOKEN = "${token}"`);
writeFileSync(new URL('../wokwi/config.h', import.meta.url), config, { mode: 0o600 });
console.log(`llave del dispositivo creada (id ${cuerpo.result[0].id}, vence en ${dias} días); wokwi/config.h escrito para la red "${ssid}"`);
