// Prueba real de punta a punta de la seguridad (Supabase + flespi). Uso: node herramientas/probar-seguridad.mjs
// Comprueba: sin sesión no hay llave; la llave de A no publica como B ni como el portón; el portón recibe la orden
// identificando a A por el tema; un miembro desactivado pierde su llave al instante.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';
import mqtt from '../web/node_modules/mqtt/build/index.js';

const REF = 'jrxxoylavczuhhvkdtav', URL = `https://${REF}.supabase.co`, dir = `${homedir()}/.config/porton`;
const leer = n => readFileSync(`${dir}/${n}`, 'utf8').trim();
const claves = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${leer('supabase-token')}` } })).json();
const anon = claves.find(k => k.name === 'anon').api_key;
const cuentas = Object.fromEntries(leer('cuentas.txt').split('\n').map(l => l.split('\t')).map(([n, e, c]) => [n, { e, c }]));
const tokenDispositivo = readFileSync(new globalThis.URL('../wokwi/config.h', import.meta.url), 'utf8').match(/MQTT_TOKEN = "(\w+)"/)[1];
let ok = 0; const paso = (m) => console.log(`  ✓ ${m}`, ++ok);

async function sesion(nombre) {
  const sb = createClient(URL, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email: cuentas[nombre].e, password: cuentas[nombre].c });
  if (error) throw error;
  return { sb, jwt: data.session.access_token, id: data.user.id };
}
const funcion = (nombre, jwt, cuerpo = {}) => fetch(`${URL}/functions/v1/${nombre}`, {
  method: 'POST', headers: { Authorization: `Bearer ${jwt}`, apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
});
const conectar = token => new Promise((res, rej) => {
  const c = mqtt.connect('wss://mqtt.flespi.io:443', { username: token, protocolVersion: 5, reconnectPeriod: 0 });
  c.once('connect', () => res(c)); c.once('error', rej);
});
const publicar = (c, t, m) => new Promise(res => c.publish(t, m, { qos: 1 }, (e) => res(e ? e.message : 'ok')));

// 1. Sin sesión válida no hay llave.
assert.equal((await funcion('llave-mqtt', anon)).status, 403); paso('sin sesión: llave negada (403)');

// 2. Usuario A recibe su llave temporal.
const A = await sesion('Usuario A'), B = await sesion('Usuario B'), admin = await sesion('Admin');
const llaveA = await (await funcion('llave-mqtt', A.jwt)).json();
assert.ok(llaveA.token && llaveA.vence > Date.now()); paso(`Usuario A recibe llave (vence en ${Math.round((llaveA.vence - Date.now()) / 60000)} min)`);

// 3. El portón (token del dispositivo) escucha las órdenes y sabe quién las manda por el tema.
const porton = await conectar(tokenDispositivo);
const recibidas = [];
porton.on('message', (t, m) => recibidas.push(`${t}=${m}`));
await new Promise(r => porton.subscribe('porton/cmd/+', r));
const cA = await conectar(llaveA.token);
assert.equal(await publicar(cA, `porton/cmd/${A.id}`, 'ping:prueba'), 'ok'); paso('A publica en su propio tema');
assert.match(await publicar(cA, `porton/cmd/${B.id}`, 'abrir'), /Not authorized/); paso('A NO puede mandar órdenes como B');
assert.match(await publicar(cA, 'porton/estado', '{"pos":100}'), /Not authorized/); paso('A NO puede hacerse pasar por el portón');
await new Promise(r => setTimeout(r, 1500));
assert.deepEqual(recibidas, [`porton/cmd/${A.id}=ping:prueba`]); paso('el portón recibió solo la orden legítima, identificando a A');

// 4. Un token inventado no conecta.
await assert.rejects(conectar('tokenInventado123'), /Bad User Name or Password|Not authorized/); paso('token inventado: rechazado por el broker');

// 5. Desactivar a B le corta el acceso al instante; reactivar lo devuelve.
const llaveB = await (await funcion('llave-mqtt', B.jwt)).json();
const off = await (await funcion('miembros', admin.jwt, { accion: 'desactivar', user_id: B.id })).json();
assert.ok(off.revocadas >= 1); paso(`admin desactiva a B: ${off.revocadas} llave(s) revocada(s)`);
assert.equal((await funcion('llave-mqtt', B.jwt)).status, 403); paso('B desactivado: llave negada');
await assert.rejects(conectar(llaveB.token)); paso('la llave vieja de B ya no conecta');
assert.equal((await funcion('miembros', A.jwt, { accion: 'listar' })).status, 403); paso('un miembro común no gestiona miembros');
await funcion('miembros', admin.jwt, { accion: 'activar', user_id: B.id });
assert.equal((await funcion('llave-mqtt', B.jwt)).status, 200); paso('B reactivado: vuelve a recibir llave');

cA.end(true); porton.end(true);
console.log(`\n${ok}/12 pruebas de seguridad OK`);
