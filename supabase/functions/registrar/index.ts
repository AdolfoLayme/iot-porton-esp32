// Guarda en el historial cada evento que publica el ESP32 en porton/evento.
// Lo llama el webhook de flespi con el secreto del dispositivo; nunca un navegador.
import { json, servicio } from '../_compartido/comun.ts';

const texto = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : '';

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  if (req.headers.get('x-secreto-dispositivo') !== Deno.env.get('SECRETO_DISPOSITIVO')) return json({ error: 'No autorizado' }, 401);
  let e: Record<string, unknown>;
  try { e = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  // ping/pong no son órdenes: no se guardan.
  if (texto(e.orden, 20).startsWith('ping')) return json({ ok: true, guardado: false });
  const fila = {
    user_id: texto(e.usuario, 40) || 'desconocido', orden: texto(e.orden, 20),
    resultado: texto(e.resultado, 20), motivo: texto(e.motivo, 120),
  };
  if (!fila.orden || !fila.resultado) return json({ error: 'Evento incompleto' }, 400);
  const { error } = await servicio().from('historial').insert(fila);
  if (error) { console.error(error); return json({ error: 'No se pudo guardar' }, 500); }
  return json({ ok: true, guardado: true });
});
