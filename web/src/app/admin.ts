// Historial persistente y gestión de miembros (modo seguro).
import { gestionarMiembros, leerHistorial, type Miembro } from '../red/sesion';
import { elemento, texto } from './dom';

// Frases de app comercial (2026-10-21): «Usuario A abrió el portón» + estado, en vez de «Usuario A · abrir / aceptada: aceptada».
const HECHO: Record<string, string> = { abrir: 'abrió el portón', cerrar: 'cerró el portón', parar: 'detuvo el portón' };
const PEDIDO: Record<string, string> = { abrir: 'pidió abrir', cerrar: 'pidió cerrar', parar: 'pidió detener' };
const ESTADO: Record<string, [string, string]> = {
  aceptada: ['Hecho', 'bien'], ocupado: ['Otra persona lo estaba usando', 'aviso'],
  bloqueada: ['Bloqueado por obstáculo', 'mal'], ignorada: ['Orden repetida', 'suave'],
};
const ICONO: Record<string, string> = { abrir: 'm5 14 7-7 7 7M12 7v13', cerrar: 'm5 10 7 7 7-7M12 17V4', parar: 'M7 7h10v10H7z' };

export function filaEvento(quien: string, orden: string, resultado: string, _motivo: string, fecha: Date): HTMLLIElement {
  const li = document.createElement('li'), tipo = orden.startsWith('pos:') ? 'abrir' : orden;
  li.dataset.tono = (ESTADO[resultado] ?? ['', 'suave'])[1];
  const icono = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icono.setAttribute('viewBox', '0 0 24 24');
  icono.setAttribute('aria-hidden', 'true'); icono.innerHTML = `<path d="${ICONO[tipo] ?? ICONO.abrir}"/>`;
  const accion = orden.startsWith('pos:')
    ? (resultado === 'aceptada' ? `abrió el portón al ${orden.slice(4)} %` : `pidió abrir al ${orden.slice(4)} %`)
    : (resultado === 'aceptada' ? HECHO[tipo] : PEDIDO[tipo]) ?? orden;
  const titulo = document.createElement('p'); const nombre = document.createElement('strong'); nombre.textContent = quien;
  titulo.append(nombre, ` ${accion}`);
  const pie = document.createElement('div'); pie.className = 'evento-pie';
  const hora = document.createElement('time'); hora.dateTime = fecha.toISOString();
  const hoy = fecha.toDateString() === new Date().toDateString();
  hora.textContent = hoy ? fecha.toLocaleTimeString('es-PE', {hour: '2-digit', minute: '2-digit'}) : fecha.toLocaleString('es-PE', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  const estado = document.createElement('span'); estado.className = 'pastilla'; estado.textContent = (ESTADO[resultado] ?? [resultado])[0];
  pie.append(hora, estado);
  const cuerpo = document.createElement('div'); cuerpo.append(titulo, pie);
  li.append(icono, cuerpo);
  return li;
}

/** Reemplaza la lista por lo guardado en Supabase (lo que el ESP32 reportó, de cualquier sesión). */
export async function cargarHistorial(nombre: (id: string) => string): Promise<void> {
  const lista = elemento<HTMLOListElement>('eventos');
  try {
    const filas = await leerHistorial();
    if (!filas.length) return;
    lista.replaceChildren(...filas.map(f => filaEvento(nombre(f.user_id), f.orden, f.resultado, f.motivo, new Date(f.ts))));
  } catch (e) { texto('nota-historial', e instanceof Error ? e.message : 'No se pudo leer el historial.'); }
}

let miId = '';
async function pintarMiembros(): Promise<void> {
  const lista = elemento<HTMLUListElement>('lista-miembros');
  const { miembros } = await gestionarMiembros<{ miembros: Miembro[] }>({ accion: 'listar' });
  lista.replaceChildren(...miembros.map(m => {
    const li = document.createElement('li'); li.dataset.activo = String(m.activo);
    const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = m.nombre.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
    const datos = document.createElement('div');
    const nombre = document.createElement('strong'); nombre.textContent = m.nombre + (m.user_id === miId ? ' (tú)' : '');
    const rol = document.createElement('span'); rol.textContent = `${m.rol === 'admin' ? 'Administrador' : 'Miembro'}${m.activo ? '' : ' · sin acceso'}`;
    datos.append(nombre, rol); li.append(avatar, datos);
    if (m.user_id === miId) return li;
    // Interruptor de acceso, como en las apps comerciales (role=switch).
    const interruptor = document.createElement('button'); interruptor.className = 'interruptor';
    interruptor.setAttribute('role', 'switch'); interruptor.setAttribute('aria-checked', String(m.activo));
    interruptor.setAttribute('aria-label', `Acceso de ${m.nombre}`);
    interruptor.onclick = async () => {
      interruptor.disabled = true;
      try {
        const r = await gestionarMiembros<{ revocadas?: number }>({ accion: m.activo ? 'desactivar' : 'activar', user_id: m.user_id });
        texto('nota-miembros', m.activo ? `${m.nombre} ya no puede abrir el portón (${r.revocadas ?? 0} llave(s) cortada(s)).` : `${m.nombre} vuelve a tener acceso.`);
        await pintarMiembros();
      } catch (e) { texto('nota-miembros', e instanceof Error ? e.message : 'No se pudo cambiar el acceso.'); interruptor.disabled = false; }
    };
    li.append(interruptor);
    return li;
  }));
}

export async function montarMiembros(esAdmin: boolean, yo = ''): Promise<void> {
  miId = yo;
  const form = elemento<HTMLFormElement>('nuevo-miembro');
  const abrir = elemento<HTMLButtonElement>('abrir-nuevo');
  form.hidden = true; abrir.hidden = !esAdmin;
  abrir.onclick = () => { form.hidden = false; abrir.hidden = true; elemento('nuevo-nombre').focus(); };
  elemento<HTMLButtonElement>('cancelar-nuevo').onclick = () => { form.reset(); form.hidden = true; abrir.hidden = false; };
  if (!esAdmin) { elemento('lista-miembros').replaceChildren(); texto('nota-miembros', 'Solo el administrador puede agregar o quitar personas.'); return; }
  texto('nota-miembros', '');
  form.onsubmit = async e => {
    e.preventDefault();
    const nombre = elemento<HTMLInputElement>('nuevo-nombre').value.trim(), email = elemento<HTMLInputElement>('nuevo-correo').value.trim();
    try {
      const r = await gestionarMiembros<{ clave_temporal: string }>({ accion: 'crear', email, nombre, rol: elemento<HTMLSelectElement>('nuevo-rol').value });
      texto('clave-nueva', `Listo. Entrégale a ${nombre} su contraseña temporal: ${r.clave_temporal} (no se vuelve a mostrar).`);
      form.reset(); form.hidden = true; abrir.hidden = false; await pintarMiembros();
    } catch (err) { texto('clave-nueva', err instanceof Error ? err.message : 'No se pudo agregar.'); }
  };
  try { await pintarMiembros(); } catch (e) { texto('nota-miembros', e instanceof Error ? e.message : 'No se pudo leer la lista.'); }
}
