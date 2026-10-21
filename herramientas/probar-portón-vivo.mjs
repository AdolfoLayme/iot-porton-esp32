// Prueba de punta a punta con el ESP32 (Wokwi o maqueta) en línea: dos usuarios a la vez y el historial.
// Uso: node herramientas/probar-portón-vivo.mjs   (el portón tiene que estar corriendo en modo seguro)
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import assert from 'node:assert/strict';
import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';
import mqtt from '../web/node_modules/mqtt/build/index.js';

const env = Object.fromEntries(readFileSync(new globalThis.URL('../web/.env.local', import.meta.url), 'utf8').trim().split('\n').map(l => l.split('=')));
const cuentas = Object.fromEntries(readFileSync(`${homedir()}/.config/porton/cuentas.txt`, 'utf8').trim().split('\n').map(l => l.split('\t')).map(([n, e, c]) => [n, { e, c }]));
const esperar = ms => new Promise(r => setTimeout(r, ms));

async function usuario(nombre) {
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email: cuentas[nombre].e, password: cuentas[nombre].c });
  const { data: llave } = await sb.functions.invoke('llave-mqtt', { body: {} });
  const c = mqtt.connect(llave.url, { username: llave.token, protocolVersion: 5 });
  const eventos = [], estados = [];
  let online = false;
  c.on('message', (t, m) => {
    if (t === 'porton/evento') eventos.push(JSON.parse(m)); else if (t === 'porton/estado') estados.push(JSON.parse(m));
    else if (t === 'porton/online') online = String(m) === '1';
  });
  await new Promise(r => c.on('connect', () => c.subscribe(['porton/evento', 'porton/estado', 'porton/online'], r)));
  return { sb, c, id: llave.usuarioId, eventos, estados, online: () => online, mandar: o => c.publish(`porton/cmd/${llave.usuarioId}`, o) };
}

const A = await usuario('Usuario A'), B = await usuario('Usuario B');
await esperar(2000);
assert.ok(A.online(), 'el portón no está en línea (¿corre la simulación en modo seguro?)'); console.log('✓ portón en línea');
A.mandar('cerrar'); await esperar(4000);   // punto de partida conocido
A.mandar('abrir'); await esperar(600);
B.mandar('cerrar'); await esperar(1500);
const deB = A.eventos.find(e => e.usuario === B.id && e.orden === 'cerrar');
assert.equal(deB?.resultado, 'ocupado', `B debía recibir "ocupado", llegó ${JSON.stringify(deB)}`);
console.log(`✓ A abre y B recibe "ocupado": ${deB.motivo}`);
const turno = A.estados.findLast(e => e.turno)?.turno;
assert.equal(turno?.nombre, 'Usuario A'); console.log('✓ todos ven quién tiene el turno: Usuario A');
B.mandar('parar'); await esperar(1500);
assert.equal(A.eventos.findLast(e => e.usuario === B.id)?.resultado, 'aceptada'); console.log('✓ PARAR de B gana aunque el turno sea de A');
await esperar(3000);
const { data: hist } = await A.sb.from('historial').select('user_id,orden,resultado').order('ts', { ascending: false }).limit(5);
assert.ok(hist.some(h => h.user_id === B.id && h.resultado === 'ocupado')); console.log(`✓ historial guardado (${hist.length} últimas filas leídas por A)`);
A.c.end(true); B.c.end(true);
console.log('\nportón vivo: todo OK');
