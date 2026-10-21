// Utilidades compartidas por las funciones del portón. El master token de flespi vive solo aquí (secreto).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const BASE = 'porton';
const FLESPI = 'https://flespi.io';
const cabeceras = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (cuerpo: unknown, estado = 200) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...cabeceras, 'Content-Type': 'application/json' } });
export const preflight = (req: Request) => req.method === 'OPTIONS' ? new Response('ok', { headers: cabeceras }) : null;

export const servicio = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

export type Miembro = { user_id: string; nombre: string; rol: 'admin' | 'miembro'; activo: boolean };

/** Usuario del JWT + su fila de miembros. null si el JWT no vale o no es miembro activo. */
export async function miembroDe(req: Request): Promise<Miembro | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const sb = servicio();
  // Un JWT ajeno (p. ej. la anon key) no trae usuario: se niega, no se cae con 500.
  const { data, error } = await sb.auth.getUser(jwt).catch(() => ({ data: { user: null }, error: true }));
  const user = data?.user;
  if (error || !user) return null;
  const { data: fila } = await sb.from('miembros').select('user_id,nombre,rol,activo').eq('user_id', user.id).maybeSingle();
  return fila && fila.activo ? fila as Miembro : null;
}

async function flespi(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const r = await fetch(FLESPI + ruta, {
    ...init,
    headers: { Authorization: `FlespiToken ${Deno.env.get('FLESPI_MASTER')}`, 'Content-Type': 'application/json' },
  });
  const cuerpo = await r.json();
  if (!r.ok || cuerpo.errors) throw new Error(`flespi ${r.status}: ${JSON.stringify(cuerpo.errors ?? cuerpo)}`);
  return cuerpo.result;
}

type Acl = { uri: 'mqtt'; topic: string; actions: ('publish' | 'subscribe')[] };
const pub = (topic: string): Acl => ({ uri: 'mqtt', topic, actions: ['publish'] });
const sub = (topic: string): Acl => ({ uri: 'mqtt', topic, actions: ['subscribe'] });

/** ACL de un usuario: solo publica en SU tema de órdenes; solo lee estado público y su pong. */
export const aclUsuario = (id: string): Acl[] => [
  pub(`${BASE}/cmd/${id}`),
  ...['estado', 'evento', 'online', 'miembros', `pong/${id}`].map(t => sub(`${BASE}/${t}`)),
];

const MAX_LLAVES = 3;   // por usuario (celular + PC + demo); flespi gratis admite 100 en total
export async function crearLlave(id: string, ttl = 3600): Promise<{ key: string; id: number }> {
  const todas = await flespi('/platform/tokens/all?fields=id,info') as { id: number; info: string }[];
  const suyas = todas.filter(t => t.info === `porton-${id}`).map(t => t.id).sort((a, b) => a - b);
  const sobran = suyas.slice(0, Math.max(0, suyas.length - (MAX_LLAVES - 1)));
  if (sobran.length) await flespi(`/platform/tokens/${sobran.join(',')}`, { method: 'DELETE' });
  const [t] = await flespi('/platform/tokens', {
    method: 'POST',
    body: JSON.stringify([{ info: `porton-${id}`, ttl, access: { type: 2, acl: aclUsuario(id) } }]),
  }) as { key: string; id: number }[];
  return t;
}

/** Revoca todas las llaves vigentes de un usuario (al desactivarlo). */
export async function revocarLlaves(id: string): Promise<number> {
  const todas = await flespi('/platform/tokens/all?fields=id,info') as { id: number; info: string }[];
  const suyas = todas.filter(t => t.info === `porton-${id}`).map(t => t.id);
  if (suyas.length) await flespi(`/platform/tokens/${suyas.join(',')}`, { method: 'DELETE' });
  return suyas.length;
}

/** Publica el mapa {id: nombre} retenido para que el ESP32 y las apps muestren nombres. */
export async function publicarMiembros(sb: SupabaseClient): Promise<void> {
  const { data } = await sb.from('miembros').select('user_id,nombre').eq('activo', true);
  const mapa = Object.fromEntries((data ?? []).map(m => [m.user_id, m.nombre]));
  await flespi(`/mqtt/messages`, {
    method: 'POST',
    body: JSON.stringify({ topic: `${BASE}/miembros`, payload: JSON.stringify(mapa), retained: true }),
  });
}
