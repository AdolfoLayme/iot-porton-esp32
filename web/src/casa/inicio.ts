import '@fontsource-variable/sora/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../estilos/base.css';
import { crearConexion } from '../red/conexion';
import { credencialAbierta, credencialVisor } from '../red/modos';
import { haySesion, modoSeguro, pedirLlave } from '../red/sesion';
import { pintarEstado, type EstadoPorton } from '../estado/porton';
import { elemento, texto } from '../app/dom';
import { montarCasa } from './escena';

const lienzo = elemento<HTMLCanvasElement>('escena');
const conexion = crearConexion();
let casa: ReturnType<typeof montarCasa> | null = null;
let estado: EstadoPorton | null = null;
let enLinea = false;

try {
  casa = montarCasa(lienzo);
} catch {
  lienzo.hidden = true;
  texto('cargando', 'Este navegador no pudo abrir WebGL. Prueba con otro o activa la aceleración gráfica.');
}

function pintar(): void {
  const resumen = pintarEstado(estado, enLinea);
  texto('estado', resumen.titulo);
  texto('detalle', resumen.detalle);
  texto('chip-online', enLinea ? 'Sí' : 'No');
  texto('chip-pos', estado ? `${estado.pos} %` : '— %');
  if (estado) casa?.actualizar(estado, enLinea);
}

lienzo.addEventListener('casa:listo', () => {
  elemento('cargando').hidden = true;
  elemento<HTMLButtonElement>('carro').disabled = false;
  elemento<HTMLButtonElement>('carro-puerta').disabled = false;
});

lienzo.addEventListener('casa:fallo', evento => {
  const dato = evento instanceof CustomEvent ? (evento as CustomEvent<unknown>).detail : null;
  texto('cargando', typeof dato === 'string' ? dato : 'No se pudo cargar la escena de la casa.');
});

conexion.alEstado(nuevo => {
  estado = nuevo;
  pintar();
});
conexion.alOnline(valor => {
  enLinea = valor;
  pintar();
});
conexion.alLatencia(ms => texto('chip-rtt', ms === null ? '— ms' : `${ms} ms`));

elemento<HTMLButtonElement>('clima').onclick = () => {
  const eraNoche = document.documentElement.dataset.clima === 'noche';
  document.documentElement.dataset.clima = eraNoche ? 'dia' : 'noche';
  texto('clima', eraNoche ? 'Noche' : 'Día');
  lienzo.dispatchEvent(new CustomEvent('casa:clima'));
};

// El carro entra y se queda bajo el portón: el sensor lo detecta y el ESP32 no deja cerrar.
elemento<HTMLButtonElement>('carro-puerta').onclick = () => lienzo.dispatchEvent(new CustomEvent('casa:carro-puerta'));
// Lo que el sensor "ve" en la casa (el carro en el haz) se envía al ESP32 por porton/entorno.
lienzo.addEventListener('casa:entorno', e => conexion.entorno((e as CustomEvent<number>).detail));

elemento<HTMLButtonElement>('carro').onclick = () => {
  lienzo.dispatchEvent(new CustomEvent('casa:carro'));
};

// Modo seguro: la escena ya se ve; la telemetría usa la sesión abierta en la app de control (mismo origen).
let llaveVence = 0, conectadoVisor = false;
async function iniciarSeguro(): Promise<void> {
  // La casa se conecta sola con la llave de solo lectura, sin iniciar sesión (2026-10-21, pedido de Adolfo).
  const visor = credencialVisor();
  if (visor) {
    if (conectadoVisor) return;
    conectadoVisor = true;
    await conexion.conectar(visor).catch(() => { conectadoVisor = false; texto('detalle', 'No se pudo conectar con el broker. Reintentando…'); });
    return;
  }
  if (!(await haySesion().catch(() => false))) {
    texto('detalle', '');
    return;
  }
  // Una llave vigente no se vuelve a pedir: antes cada "focus" sin portón en línea creaba otra (89 llaves).
  if (Date.now() < llaveVence - 5 * 60_000) return;
  try {
    const llave = await pedirLlave(); llaveVence = llave.vence;
    await conexion.conectar(llave);
  } catch (error) {
    texto('detalle', error instanceof Error ? error.message : 'No se pudo conectar con el broker.');
  }
}

function iniciar(): void {
  if (modoSeguro) {
    void iniciarSeguro();
    return;
  }
  try {
    void conexion.conectar(credencialAbierta('admin'))
      .catch(() => texto('detalle', 'Broker sin conexión. Reintentando…'));
  } catch {
    texto('detalle', 'No se pudo iniciar la conexión con el broker.');
  }
}

iniciar();
// Al volver de la app de control (donde se inicia sesión) se reintenta la conexión.
window.addEventListener('focus', () => {
  if (modoSeguro && !enLinea) void iniciarSeguro();
});

window.addEventListener('pagehide', () => {
  conexion.cerrar();
  casa?.destruir();
});
