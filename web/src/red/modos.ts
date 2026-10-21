export type Credencial = {
  modo: 'abierto' | 'seguro'; base: string; usuarioId: string; nombre: string;
  url: string; token?: string; vence?: number;
  /** Visor (casa 3D): solo escucha estado y online; sin ping ni órdenes. */
  soloLectura?: boolean;
};
/** Llave pública de solo lectura para la casa 3D (herramientas/token-visor.mjs). */
export function credencialVisor(): Credencial | null {
  const token = import.meta.env.VITE_VISOR_TOKEN, vence = Number(import.meta.env.VITE_VISOR_VENCE);
  if (!token || !vence || vence <= Date.now()) return null;
  return {modo: 'seguro', base: 'porton', usuarioId: 'visor', nombre: 'Visor', url: 'wss://mqtt.flespi.io:443', token, vence, soloLectura: true};
}
export const usuarios = [{id: 'usuario-a', nombre: 'Usuario A'}, {id: 'usuario-b', nombre: 'Usuario B'}, {id: 'admin', nombre: 'Admin'}];
export const baseDev = import.meta.env.VITE_BASE_DEV || 'porton-dev-a6d9f031';
export function credencialAbierta(id: string): Credencial {
  if (import.meta.env.VITE_MODO === 'seguro') throw new Error('El acceso seguro se configura en fase B.');
  const usuario = usuarios.find(u => u.id === id);
  if (!usuario) throw new Error('Elige un usuario de prueba.');
  return {modo: 'abierto', base: baseDev, usuarioId: usuario.id, nombre: usuario.nombre, url: 'wss://broker.emqx.io:8084/mqtt'};
}
