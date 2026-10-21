// Entrega una llave MQTT temporal (1 h) solo a miembros activos. Sin llave no se puede ni conectar al broker.
import { BASE, crearLlave, json, miembroDe, preflight } from '../_compartido/comun.ts';

const TTL = 3600;

Deno.serve(async req => {
  const p = preflight(req); if (p) return p;
  const m = await miembroDe(req);
  if (!m) return json({ error: 'No eres miembro activo del portón.' }, 403);
  try {
    const llave = await crearLlave(m.user_id, TTL);
    return json({
      token: llave.key, vence: Date.now() + TTL * 1000, base: BASE,
      usuarioId: m.user_id, nombre: m.nombre, rol: m.rol, url: 'wss://mqtt.flespi.io:443',
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'No se pudo crear la llave. Intenta de nuevo.' }, 502);
  }
});
