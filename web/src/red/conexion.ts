import mqtt, { type MqttClient } from 'mqtt';
import { leerEstado, leerEvento, type EstadoPorton, type Evento } from '../estado/porton';
import type { Credencial } from './modos';
export interface Conexion {
  conectar(c: Credencial): Promise<void>;
  mandar(orden: string): void;
  /** Casa 3D: distancia (cm) del sensor al carro que cruza el haz, para el ESP32. */
  entorno(cm: number): void;
  alEstado(f: (e: EstadoPorton) => void): void;
  alEvento(f: (e: Evento) => void): void;
  alOnline(f: (online: boolean) => void): void;
  alBroker(f: (online: boolean) => void): void;
  alLatencia(f: (ms: number | null) => void): void;
  alMiembros(f: (nombres: Record<string, string>) => void): void;
  latencia(): number | null;
  cerrar(): void;
}
export function crearConexion(): Conexion {
  let cliente: MqttClient | null = null, credencial: Credencial | null = null;
  let reloj: ReturnType<typeof setInterval> | undefined, ultimoPong = 0, rtt: number | null = null;
  let pendiente = '', inicio = 0;
  const estados: ((e: EstadoPorton) => void)[] = [], eventos: ((e: Evento) => void)[] = [];
  const nombres: ((m: Record<string, string>) => void)[] = [];
  const online: ((b: boolean) => void)[] = [], brokers: ((b: boolean) => void)[] = [], latencias: ((n: number | null) => void)[] = [];
  const avisarOnline = (b: boolean) => online.forEach(f => f(b));
  const avisarBroker = (b: boolean) => brokers.forEach(f => f(b));
  function cerrar() {
    clearInterval(reloj); reloj = undefined;
    cliente?.removeAllListeners(); cliente?.end(true); cliente = null;
    credencial = null; pendiente = ''; rtt = null; avisarOnline(false); avisarBroker(false);
    latencias.forEach(f => f(null));
  }
  function entorno(cm: number) {
    if (!cliente?.connected || !credencial) return;
    cliente.publish(`${credencial.base}/entorno`, String(Math.round(cm)), {qos: 0, retain: false});
  }
  function mandar(orden: string) {
    if (!cliente?.connected || !credencial) throw new Error('Sin conexión al broker. Vuelve a intentar cuando se conecte.');
    if (!/^(abrir|cerrar|parar|pos:(?:100|[1-9]?\d))$/.test(orden)) throw new Error('Orden inválida.');
    // Nunca encolar movimientos: una orden vieja no debe ejecutarse al volver la red.
    cliente.publish(`${credencial.base}/cmd/${credencial.usuarioId}`, orden, {qos: 0, retain: false});
  }
  return {
    conectar(c) {
      cerrar(); credencial = c;
      if (!/^[a-zA-Z0-9_-]{1,40}$/.test(c.usuarioId) || /[+#]/.test(c.base)) return Promise.reject(new Error('Canal inválido.'));
      if (c.modo === 'seguro' && (!c.token || !c.vence || c.vence <= Date.now()))
        return Promise.reject(new Error('Falta una llave vigente.'));
      return new Promise<void>((resolve, reject) => {
        const cl = mqtt.connect(c.url, {clientId: `web-${c.usuarioId}-${crypto.randomUUID().slice(0,8)}`, clean: true,
          username: c.token, password: c.token ? '' : undefined, reconnectPeriod: 2000, connectTimeout: 10000, queueQoSZero: false});
        cliente = cl;
        cl.on('connect', () => {
          // Invalida el estado retenido de una sesión anterior hasta recibir online.
          avisarOnline(false); avisarBroker(true); ultimoPong = performance.now();
          const temas = c.soloLectura ? ['estado', 'online'] : ['estado', 'evento', 'online', 'miembros', `pong/${c.usuarioId}`];
          cl.subscribe(temas.map(s => `${c.base}/${s}`), {qos: 0}, error => error ? reject(error) : resolve());
          clearInterval(reloj);
          // El visor no puede publicar pings: lo da en línea mientras lleguen estados (el ESP32 publica cada 1 s).
          if (c.soloLectura) { reloj = setInterval(() => { if (performance.now() - ultimoPong > 4000) avisarOnline(false); }, 1000); return; }
          reloj = setInterval(() => {
            if (!cl.connected) return;
            if (performance.now() - ultimoPong > 7000) { rtt = null; avisarOnline(false); latencias.forEach(f => f(null)); }
            pendiente = `ping:${crypto.randomUUID()}`; inicio = performance.now();
            cl.publish(`${c.base}/cmd/${c.usuarioId}`, pendiente, {qos: 0, retain: false});
          }, 2000);
        });
        cl.on('message', (tema, datos) => {
          const texto = datos.toString();
          if (tema === `${c.base}/estado`) {
            const e = leerEstado(texto); if (e) estados.forEach(f => f(e));
            if (c.soloLectura) { ultimoPong = performance.now(); avisarOnline(true); }
          }
          if (tema === `${c.base}/evento`) { const e = leerEvento(texto); if (e) eventos.forEach(f => f(e)); }
          if (tema === `${c.base}/online` && !c.soloLectura) avisarOnline(texto === '1');
          if (tema === `${c.base}/miembros`) {
            try { const m: unknown = JSON.parse(texto); if (m && typeof m === 'object') nombres.forEach(f => f(m as Record<string, string>)); }
            catch { /* Lista mal formada: se siguen mostrando los ids. */ }
          }
          if (tema === `${c.base}/pong/${c.usuarioId}` && texto === pendiente && pendiente) {
            rtt = Math.round(performance.now() - inicio); ultimoPong = performance.now(); pendiente = '';
            avisarOnline(true); latencias.forEach(f => f(rtt));
          }
        });
        cl.on('offline', () => { avisarOnline(false); avisarBroker(false); rtt = null; latencias.forEach(f => f(null)); });
        cl.on('close', () => { avisarOnline(false); avisarBroker(false); });
        cl.on('error', error => { avisarBroker(false); reject(error); });
      });
    },
    mandar, entorno, alEstado: f => {estados.push(f);}, alEvento: f => {eventos.push(f);}, alOnline: f => {online.push(f);},
    alBroker: f => {brokers.push(f);}, alMiembros: f => {nombres.push(f);}, alLatencia: f => {latencias.push(f);}, latencia: () => rtt, cerrar,
  };
}
