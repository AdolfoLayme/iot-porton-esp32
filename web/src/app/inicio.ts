import '@fontsource-variable/sora/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../estilos/base.css';
import '../estilos/app.css';
import { crearConexion } from '../red/conexion';
import { credencialAbierta, usuarios } from '../red/modos';
import { pintarEstado, type EstadoPorton, type Evento } from '../estado/porton';
import { elemento, texto, temaInicial } from './dom';
import { montarMicrofono } from '../voz/microfono';
import { prepararPwa } from './pwa';
import { acuse, baliza, contar, entrarSesion, moverHoja, obstaculo } from './movimiento';
import { entrar, haySesion, modoSeguro, pedirLlave, renovarAntesDe, salir } from '../red/sesion';
import { cargarHistorial, filaEvento, montarMiembros } from './admin';
temaInicial(); prepararPwa();
const conexion = crearConexion();
let estado: EstadoPorton | null = null, online = false, broker = false, generacion = 0;
let renovacion: ReturnType<typeof setTimeout> | undefined;
const nombres: Record<string, string> = {};
const nombreDe = (id: string) => nombres[id] ?? usuarios.find(u => u.id === id)?.nombre ?? (id === 'local' ? 'Botón físico' : id === 'sensor' ? 'Sensor de obstáculo' : 'Usuario');
conexion.alMiembros(m => Object.assign(nombres, m));
// Modo seguro (por defecto): correo y contraseña. Modo abierto: solo desarrollo, con franja visible.
elemento('franja').hidden = modoSeguro; elemento('entrar').hidden = modoSeguro; elemento('entrar-seguro').hidden = !modoSeguro;
if (!modoSeguro) texto('nota-entrada', 'Modo desarrollo: sin contraseña y sin seguridad.');
const mandar = (orden: string) => {
  try {
    if (!online) throw new Error('El portón está sin conexión. Espera a que vuelva a estar en línea.');
    conexion.mandar(orden); texto('mensaje', '');
    window.parent.postMessage({tipo: 'porton-orden', orden}, location.origin);
  } catch (e) { texto('mensaje', e instanceof Error ? e.message : 'No se pudo enviar la orden.'); }
};
const abortarVoz = montarMicrofono(mandar);
function pintar() {
  const vista = pintarEstado(estado, online);
  texto('titulo-estado', vista.titulo); texto('detalle', vista.detalle);
  elemento('titulo-estado').parentElement!.dataset.tono = vista.tono;
  if (estado) contar(elemento('porcentaje'), estado.pos); else texto('porcentaje', '—');
  texto('distancia', estado ? `${estado.dist} cm` : '— cm');
  texto('broker', `Broker: ${broker ? 'conectado' : 'reconectando'}`);
  texto('online', `Portón: ${online ? 'en línea' : 'sin conexión'}`);
  elemento('broker').dataset.activo = String(broker); elemento('online').dataset.activo = String(online);
  const disponible = online && broker && !!estado;
  document.querySelectorAll<HTMLButtonElement>('[data-orden],#aplicar').forEach(b => {b.disabled = !disponible;});
  elemento<HTMLInputElement>('apertura').disabled = !disponible;
  // CSS (transform-box: view-box, origen en la bisagra 120,210): 100 % = 90°.
  // DESACTIVADO 2026-10-20: rotación por CSS; ahora GSAP con inercia (movimiento.ts).
  // elemento('hoja').style.transform = `rotate(${-((estado?.pos ?? 0) * .9)}deg)`;
  moverHoja(estado?.pos ?? 0);
  baliza(!!estado && online && estado.pos !== estado.objetivo);
  const habia = elemento('obst').getAttribute('opacity') === '1';
  elemento('obst').setAttribute('opacity', estado?.obstaculo ? '1' : '0');
  if (estado?.obstaculo && !habia) obstaculo(true);
  elemento('haz').dataset.alerta = String(!!estado?.obstaculo);
  elemento('barra').style.width = `${estado?.pos ?? 0}%`;
  // SVG usa atributo transform; CSS no interpola posiciones inventadas.
  document.getElementById('plano')?.setAttribute('aria-label', estado ? `Vista superior. Última apertura recibida: ${estado.pos} %. ${online ? 'En línea' : 'Sin conexión'}.` : 'Esperando telemetría del portón');
}
function agregarEvento(e: Evento) {
  if (e.orden.startsWith('ping')) return;
  const lista = elemento<HTMLOListElement>('eventos'); lista.querySelector('.vacio')?.remove();
  const quien = nombreDe(e.usuario);
  lista.prepend(filaEvento(quien, e.orden, e.resultado, e.motivo, new Date())); if (lista.children.length > 100) lista.lastElementChild?.remove();
  // Solo se avisa lo que no se hizo (ocupado, obstáculo); lo aceptado ya se ve en el portón.
  texto('mensaje', e.resultado === 'aceptada' ? '' : e.motivo === 'bloqueado por obstáculo'
    ? `${quien}: no se puede cerrar, hay un obstáculo en el paso del portón.` : `${quien}: ${e.motivo || e.resultado}`);
  acuse(elemento('mensaje'), e.resultado === 'aceptada' ? 'bien' : e.resultado === 'ignorada' ? 'neutro' : 'mal');
  window.parent.postMessage({tipo: 'porton-evento'}, location.origin);
}
conexion.alEstado(e => {
  // Al despejarse el paso se borra el aviso de obstáculo que quedó de una orden rechazada.
  if (estado?.obstaculo && !e.obstaculo && elemento('mensaje').textContent?.includes('obstáculo')) texto('mensaje', '');
  estado = e; pintar();
});
conexion.alEvento(agregarEvento);
conexion.alOnline(b => {online = b; pintar();});
conexion.alBroker(b => {broker = b; pintar();});
const latencias: number[] = [];
conexion.alLatencia(ms => {
  texto('latencia', ms === null ? '— ms' : `${ms} ms`);
  if (ms === null) return;
  latencias.push(ms); if (latencias.length > 30) latencias.shift();
  const max = Math.max(...latencias, 1);
  elemento('spark-linea').setAttribute('points', latencias.map((v, i) => `${(i / 29) * 100},${38 - (v / max) * 34}`).join(' '));
});
elemento<HTMLFormElement>('entrar').onsubmit = e => {
  e.preventDefault(); const id = elemento<HTMLSelectElement>('usuario').value;
  const actual = ++generacion; estado = null; online = false;
  mostrarSesion(usuarios.find(u => u.id === id)?.nombre || id);
  void conexion.conectar(credencialAbierta(id)).then(() => { if (actual === generacion) texto('mensaje', ''); })
    .catch(() => { if (actual === generacion) texto('mensaje', 'No se pudo conectar. Reintentando automáticamente…'); });
};
function mostrarSesion(identidad: string) {
  requestAnimationFrame(entrarSesion);
  elemento('entrada').hidden = true; elemento('sesion').hidden = false; elemento('navegacion').hidden = false;
  texto('identidad', identidad); pintar();
  elemento('titulo-estado').setAttribute('tabindex', '-1'); elemento('titulo-estado').focus({ preventScroll: true });
}
function marcarLlave(vigente: boolean) { texto('llave', `Llave: ${vigente ? 'vigente' : 'sin llave'}`); elemento('llave').dataset.activo = String(vigente); }
/** Pide una llave temporal, conecta y agenda la renovación 5 min antes de que venza. */
async function conectarSeguro(actual: number): Promise<void> {
  try {
    const llave = await pedirLlave();
    if (actual !== generacion) return;
    texto('identidad', `${llave.nombre}${llave.rol === 'admin' ? ' · administrador' : ''}`); marcarLlave(true);
    await conexion.conectar(llave);
    if (actual !== generacion) return;
    texto('mensaje', '');
    window.parent.postMessage({tipo: 'porton-sesion'}, location.origin);
    void montarMiembros(llave.rol === 'admin', llave.usuarioId);
    clearTimeout(renovacion);
    renovacion = setTimeout(() => { if (actual === generacion) void conectarSeguro(actual); }, renovarAntesDe(llave.vence, 5 * 60_000));
  } catch (e) {
    if (actual !== generacion) return;
    marcarLlave(false); texto('mensaje', e instanceof Error ? e.message : 'No se pudo obtener la llave.');
  }
}
// Ojo para ver/ocultar la contraseña y error visible junto al formulario (2026-10-21, como en las apps reales).
const campoClave = elemento<HTMLInputElement>('clave'), verClave = elemento<HTMLButtonElement>('ver-clave');
verClave.onclick = () => {
  const ver = campoClave.type === 'password'; campoClave.type = ver ? 'text' : 'password';
  verClave.setAttribute('aria-pressed', String(ver)); verClave.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
};
const errorEntrada = (msj: string) => {
  texto('error-entrada', msj);
  for (const id of ['correo', 'clave']) elemento(id).setAttribute('aria-invalid', String(!!msj));
};
for (const id of ['correo', 'clave']) elemento(id).addEventListener('input', () => errorEntrada(''));
elemento<HTMLFormElement>('entrar-seguro').onsubmit = async e => {
  e.preventDefault(); const actual = ++generacion, boton = elemento<HTMLButtonElement>('boton-entrar');
  errorEntrada(''); boton.disabled = true;
  try {
    await entrar(elemento<HTMLInputElement>('correo').value.trim(), campoClave.value);
    campoClave.value = ''; campoClave.type = 'password';
    mostrarSesion('Entrando…'); await conectarSeguro(actual);
  } catch (err) { errorEntrada(err instanceof Error ? err.message : 'No se pudo entrar.'); campoClave.select(); }
  finally { boton.disabled = false; }
};
if (modoSeguro) void haySesion().then(si => { if (si) { mostrarSesion('Entrando…'); void conectarSeguro(++generacion); } }).catch(() => undefined);
elemento('salir').onclick = () => {
  ++generacion; clearTimeout(renovacion); conexion.cerrar(); abortarVoz(); estado = null; pintar();
  if (modoSeguro) { void salir(); marcarLlave(false); }
  elemento('entrada').hidden = false; elemento('sesion').hidden = true; elemento('navegacion').hidden = true;
  elemento('eventos').replaceChildren(Object.assign(document.createElement('li'), {className: 'vacio', textContent: 'Todavía no llegaron eventos del portón.'}));
  cambiarVista('control'); elemento(modoSeguro ? 'correo' : 'usuario').focus();
};
document.querySelectorAll<HTMLButtonElement>('[data-orden]').forEach(b => {b.onclick = () => mandar(b.dataset.orden!);});
elemento<HTMLInputElement>('apertura').oninput = e => {
  const pct = (e.target as HTMLInputElement).value; texto('elegido', `${pct} %`); texto('aplicar', `Ir a ${pct} %`);
};
elemento<HTMLFormElement>('parcial').onsubmit = e => {e.preventDefault(); mandar(`pos:${elemento<HTMLInputElement>('apertura').value}`);};
function cambiarVista(vista: string) {
  if (vista === 'historial' && modoSeguro) void cargarHistorial(nombreDe);
  for (const id of ['control', 'historial', 'miembros']) elemento(id).hidden = id !== vista;
  document.querySelectorAll<HTMLButtonElement>('[data-vista]').forEach(b => {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}
document.querySelectorAll<HTMLButtonElement>('[data-vista]').forEach(b => {b.onclick = () => cambiarVista(b.dataset.vista!);});
window.addEventListener('pagehide', () => {conexion.cerrar(); abortarVoz();});
window.addEventListener('pageshow', e => { if (e.persisted) elemento('salir').click(); });
pintar();
