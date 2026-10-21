// Gestión de miembros, solo para administradores: listar, crear, activar/desactivar y cambiar rol.
// Al desactivar, se revocan en flespi las llaves vigentes de esa persona (corte inmediato).
import { json, miembroDe, preflight, publicarMiembros, revocarLlaves, servicio } from '../_compartido/comun.ts';

type Pedido =
  | { accion: 'listar' }
  | { accion: 'crear'; email: string; nombre: string; rol?: 'admin' | 'miembro' }
  | { accion: 'activar' | 'desactivar'; user_id: string }
  | { accion: 'rol'; user_id: string; rol: 'admin' | 'miembro' };

const claveTemporal = () => crypto.randomUUID().replaceAll('-', '').slice(0, 14);

Deno.serve(async req => {
  const p = preflight(req); if (p) return p;
  const yo = await miembroDe(req);
  if (!yo || yo.rol !== 'admin') return json({ error: 'Solo un administrador puede gestionar miembros.' }, 403);
  let pedido: Pedido;
  try { pedido = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const sb = servicio();
  try {
    switch (pedido.accion) {
      case 'listar': {
        const { data, error } = await sb.from('miembros').select('user_id,nombre,rol,activo,creado').order('creado');
        if (error) throw error;
        return json({ miembros: data });
      }
      case 'crear': {
        const nombre = pedido.nombre?.trim();
        if (!/^\S+@\S+\.\S+$/.test(pedido.email ?? '') || !nombre || nombre.length > 40) return json({ error: 'Correo o nombre inválido.' }, 400);
        const clave = claveTemporal();
        const { data, error } = await sb.auth.admin.createUser({ email: pedido.email, password: clave, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
        const { error: e2 } = await sb.from('miembros').insert({ user_id: data.user.id, nombre, rol: pedido.rol === 'admin' ? 'admin' : 'miembro' });
        if (e2) throw e2;
        await publicarMiembros(sb);
        // La clave temporal se muestra una sola vez al admin para que se la entregue a la persona.
        return json({ user_id: data.user.id, clave_temporal: clave });
      }
      case 'activar':
      case 'desactivar': {
        if (pedido.user_id === yo.user_id) return json({ error: 'No puedes desactivarte a ti mismo.' }, 400);
        const activo = pedido.accion === 'activar';
        const { error } = await sb.from('miembros').update({ activo }).eq('user_id', pedido.user_id);
        if (error) throw error;
        const revocadas = activo ? 0 : await revocarLlaves(pedido.user_id);
        await publicarMiembros(sb);
        return json({ ok: true, revocadas });
      }
      case 'rol': {
        if (pedido.user_id === yo.user_id) return json({ error: 'No puedes cambiar tu propio rol.' }, 400);
        const { error } = await sb.from('miembros').update({ rol: pedido.rol === 'admin' ? 'admin' : 'miembro' }).eq('user_id', pedido.user_id);
        if (error) throw error;
        return json({ ok: true });
      }
      default: return json({ error: 'Acción desconocida' }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'Error del servidor' }, 500);
  }
});
