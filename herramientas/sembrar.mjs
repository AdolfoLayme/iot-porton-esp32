// Crea las cuentas de prueba (Admin, Usuario A, Usuario B) y publica la lista de miembros en flespi.
// Uso: node herramientas/sembrar.mjs
// Las contraseñas se escriben SOLO en ~/.config/porton/cuentas.txt (chmod 600), nunca en el repo.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs';

const REF = 'jrxxoylavczuhhvkdtav', URL = `https://${REF}.supabase.co`;
const dir = `${homedir()}/.config/porton`;
const leer = n => readFileSync(`${dir}/${n}`, 'utf8').trim();

const claves = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
  headers: { Authorization: `Bearer ${leer('supabase-token')}` },
})).json();
const servicio = claves.find(k => k.name === 'service_role').api_key;
const sb = createClient(URL, servicio, { auth: { persistSession: false } });

const cuentas = [
  { email: 'admin@porton-iot.app', nombre: 'Admin', rol: 'admin' },
  { email: 'usuario.a@porton-iot.app', nombre: 'Usuario A', rol: 'miembro' },
  { email: 'usuario.b@porton-iot.app', nombre: 'Usuario B', rol: 'miembro' },
];
const { data: existentes } = await sb.auth.admin.listUsers();
const lineas = [];
for (const c of cuentas) {
  const clave = randomBytes(9).toString('base64url');
  let usuario = existentes.users.find(u => u.email === c.email);
  if (usuario) await sb.auth.admin.updateUserById(usuario.id, { password: clave });
  else usuario = (await sb.auth.admin.createUser({ email: c.email, password: clave, email_confirm: true })).data.user;
  const { error } = await sb.from('miembros').upsert({ user_id: usuario.id, nombre: c.nombre, rol: c.rol, activo: true });
  if (error) throw error;
  lineas.push(`${c.nombre}\t${c.email}\t${clave}`);
}
writeFileSync(`${dir}/cuentas.txt`, lineas.join('\n') + '\n', { mode: 0o600 });

// Lista {id: nombre} retenida para el ESP32 y las apps.
const { data } = await sb.from('miembros').select('user_id,nombre').eq('activo', true);
const r = await fetch('https://flespi.io/mqtt/messages', {
  method: 'POST',
  headers: { Authorization: `FlespiToken ${leer('flespi-master')}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ topic: 'porton/miembros', payload: JSON.stringify(Object.fromEntries(data.map(m => [m.user_id, m.nombre]))), retained: true }),
});
console.log(`cuentas listas: ${lineas.length} (en ${dir}/cuentas.txt); miembros publicados: ${r.status}`);
