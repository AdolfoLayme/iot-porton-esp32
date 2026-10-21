// Movimiento con GSAP. Momento principal: la hoja del portón sigue la telemetría con inercia real
// y la baliza ámbar late mientras se mueve. Todo lo demás es retroalimentación breve.
// Respeta "reducir movimiento": sin animación, solo el estado final.
import { gsap } from 'gsap';

const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SALIDA = 'expo.out';
let latido: gsap.core.Timeline | null = null;
const cifra = { valor: 0 };

/** La hoja gira hacia la posición publicada por el ESP32 (100 % = 90°); nunca adelanta el estado. */
export function moverHoja(pos: number) {
  const hoja = document.getElementById('hoja');
  if (!hoja) return;
  gsap.to(hoja, { rotation: -pos * 0.9, svgOrigin: '120 210', duration: reducido() ? 0 : 0.35, ease: 'power2.out', overwrite: true });
}

/** El porcentaje cuenta hacia el valor nuevo en vez de saltar. */
export function contar(el: HTMLElement, destino: number) {
  if (reducido()) { el.textContent = String(destino); cifra.valor = destino; return; }
  gsap.to(cifra, { valor: destino, duration: 0.35, ease: 'power2.out', overwrite: true,
    onUpdate: () => { el.textContent = String(Math.round(cifra.valor)); } });
}

/** Baliza: halo ámbar en la bisagra y luz en la punta de la hoja mientras el portón se mueve. */
export function baliza(moviendo: boolean) {
  if (moviendo && !latido && !reducido()) {
    latido = gsap.timeline({ repeat: -1 })
      .fromTo('#halo', { opacity: 0.55, scale: 0.6, svgOrigin: '120 210' }, { opacity: 0, scale: 1.6, duration: 0.7, ease: 'power1.out' })
      .fromTo('#baliza', { opacity: 1 }, { opacity: 0.25, duration: 0.35, yoyo: true, repeat: 1, ease: 'none' }, 0);
  } else if (!moviendo && latido) {
    latido.kill(); latido = null;
    gsap.to('#halo', { opacity: 0, duration: 0.2 }); gsap.to('#baliza', { opacity: 0.35, duration: 0.2 });
  }
}

/** Acuse del mensaje: rechazo (ocupado/bloqueada) con un desplazamiento corto; éxito con un destello de color. */
export function acuse(el: HTMLElement, tono: 'bien' | 'mal' | 'neutro') {
  el.dataset.tono = tono;
  if (reducido()) return;
  if (tono === 'mal') gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.45, ease: 'elastic.out(1,0.35)' });
  else gsap.fromTo(el, { opacity: 0.2, y: 4 }, { opacity: 1, y: 0, duration: 0.3, ease: SALIDA });
}

/** El sensor detecta algo: el haz se enciende en rojo y el aviso aparece desde su centro. */
export function obstaculo(hay: boolean) {
  if (reducido()) return;
  if (hay) gsap.fromTo('#obst', { scale: 0.3, svgOrigin: '220 195' }, { scale: 1, duration: 0.4, ease: 'back.out(2)' });
}

/** Entrada a la sesión: las dos tarjetas se descubren de abajo hacia arriba (recorte), una tras otra. */
export function entrarSesion() {
  if (reducido()) return;
  gsap.fromTo(['.col-vista', '.col-mando'],
    { clipPath: 'inset(100% 0 0 0 round 14px)', y: 12 },
    { clipPath: 'inset(0% 0 0 0 round 14px)', y: 0, duration: 0.6, ease: SALIDA, stagger: 0.08, clearProps: 'clipPath,transform' });
}
