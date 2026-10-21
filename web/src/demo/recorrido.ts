// El viaje de cada orden: un punto recorre el camino real celular → broker → ESP32 (al mandar)
// y ESP32 → broker → todos (cuando llega la respuesta). La luz ilustra el orden de los saltos, no sus tiempos.
import { animate, svg } from 'animejs';
import { texto } from '../app/dom';

const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function crearRecorrido() {
  let temporizadores: ReturnType<typeof setTimeout>[] = [];
  let viaje: ReturnType<typeof animate> | null = null;
  const limpiar = () => { temporizadores.forEach(clearTimeout); temporizadores = []; };
  function iluminar(n: number) {
    document.querySelectorAll<HTMLElement>('[data-paso]').forEach(el => { el.dataset.activo = String(Number(el.dataset.paso) <= n); });
  }
  function recorrer(tramo: 'viaje-ida' | 'viaje-vuelta', color: string) {
    const punto = document.getElementById('viaje-punto'), camino = document.getElementById(tramo);
    if (!punto || !camino || reducido()) return;
    viaje?.revert();
    punto.style.fill = color;
    viaje = animate(punto, { ...svg.createMotionPath(camino), duration: 700, ease: 'inOutCubic' });
  }
  return {
    orden() { limpiar(); iluminar(1); recorrer('viaje-ida', '#ffcc2a'); texto('paso-texto', 'Orden enviada'); },
    evento(ms: number | null) {
      limpiar(); iluminar(2); recorrer('viaje-vuelta', '#3ddc84');
      texto('paso-texto', ms === null ? 'Respuesta del ESP32' : `Respuesta del ESP32 · ${ms} ms`);
      temporizadores.push(setTimeout(() => iluminar(3), 250), setTimeout(() => iluminar(4), 550));
    },
    destruir() { limpiar(); viaje?.revert(); },
  };
}
