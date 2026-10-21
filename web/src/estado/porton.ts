export type EstadoPorton = {
  pos: number; objetivo: number; estado: string; dist: number; obstaculo: boolean;
  turno: {id: string; nombre: string} | null; led: {verde: boolean; rojo: boolean};
};
export type Evento = {ts: number; usuario: string; orden: string; resultado: string; motivo: string};
function objeto(d: unknown): d is Record<string, unknown> { return typeof d === 'object' && d !== null; }
const porcentaje = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
export function leerEstado(texto: string): EstadoPorton | null {
  try {
    const d: unknown = JSON.parse(texto);
    if (!objeto(d) || !porcentaje(d.pos) || !porcentaje(d.objetivo) || typeof d.estado !== 'string' ||
      typeof d.dist !== 'number' || !Number.isFinite(d.dist) || typeof d.obstaculo !== 'boolean' ||
      !objeto(d.led) || typeof d.led.verde !== 'boolean' || typeof d.led.rojo !== 'boolean') return null;
    if (d.turno !== null && (!objeto(d.turno) || typeof d.turno.id !== 'string' || typeof d.turno.nombre !== 'string')) return null;
    return d as EstadoPorton;
  } catch { return null; }
}
export function leerEvento(texto: string): Evento | null {
  try {
    const d: unknown = JSON.parse(texto);
    if (!objeto(d) || typeof d.ts !== 'number' || !Number.isFinite(d.ts) ||
      !['usuario', 'orden', 'resultado', 'motivo'].every(k => typeof d[k] === 'string')) return null;
    return d as Evento;
  } catch { return null; }
}
export function pintarEstado(e: EstadoPorton | null, online: boolean): {
  titulo: string; tono: 'ok' | 'mueve' | 'alerta' | 'apagado'; detalle: string;
} {
  if (!online) return {titulo: 'Portón sin conexión', tono: 'apagado', detalle: ''};
  if (!e) return {titulo: 'Esperando estado', tono: 'apagado', detalle: ''};
  if (e.obstaculo) return {titulo: 'Obstáculo detectado', tono: 'alerta', detalle: 'Hay un obstáculo en el paso del portón: no se puede cerrar.'};
  const mueve = ['abriendo', 'cerrando', 'pausa'].includes(e.estado);
  const titulos: Record<string, string> = {abierto: 'Portón abierto', cerrado: 'Portón cerrado', detenido: 'Portón detenido',
    abriendo: 'Abriendo portón', cerrando: 'Cerrando portón', pausa: 'Pausa de inversión'};
  return {titulo: titulos[e.estado] ?? 'Estado recibido', tono: mueve ? 'mueve' : 'ok',
    detalle: e.turno ? `${e.turno.nombre} está ${e.estado === 'pausa' ? 'cambiando de sentido' : e.estado}` : ''};
}
