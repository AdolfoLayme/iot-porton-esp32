// Medidor de apertura (estilo animejs.com, hecho para el portón): un anillo de color, marcas de 3° y,
// dentro, la hoja del portón girando sobre su bisagra entre 0° (cerrado) y 90° (abierto).
// Momento principal: el medidor se "enciende" al cargar; después la hoja sigue la telemetría real.
import { animate, createTimeline, stagger, svg } from 'animejs';

const NS = 'http://www.w3.org/2000/svg';
const ESPECTRO = ['#ff4b4b', '#ff7d36', '#ffa828', '#ffcc2a', '#b7ff54', '#3ddc84', '#2fd0f0', '#5b8cff'];
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const punto = (r: number, grados: number) => [r * Math.cos(grados * Math.PI / 180), -r * Math.sin(grados * Math.PI / 180)];

function nodo<K extends keyof SVGElementTagNameMap>(tipo: K, attrs: Record<string, string | number>, padre: Element) {
  const el = document.createElementNS(NS, tipo);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  padre.append(el); return el;
}
function arco(r: number, desde: number, hasta: number) {
  const [x1, y1] = punto(r, desde), [x2, y2] = punto(r, hasta);
  return `M${x1} ${y1} A${r} ${r} 0 ${hasta - desde > 180 ? 1 : 0} 0 ${x2} ${y2}`;
}

export function montarMedidor(contenedor: SVGSVGElement) {
  contenedor.setAttribute('viewBox', '-210 -210 420 420');
  const anillo = nodo('g', { class: 'm-anillo' }, contenedor);
  ESPECTRO.forEach((color, i) => nodo('path', { d: arco(188, i * 45 + 2, i * 45 + 43), stroke: color, class: 'm-segmento' }, anillo));
  const marcas = nodo('g', { class: 'm-marcas' }, contenedor);
  for (let g = 0; g < 360; g += 3) {
    const [x1, y1] = punto(g <= 90 ? 150 : 158, g), [x2, y2] = punto(168, g);
    nodo('line', { x1, y1, x2, y2, class: g <= 90 ? 'm-marca m-activa' : 'm-marca', 'data-g': g }, marcas);
  }
  nodo('path', { d: arco(132, 0, 90), class: 'm-guia' }, contenedor);
  const barrido = nodo('path', { class: 'm-barrido', d: '' }, contenedor);
  for (const [g, t] of [[0, '0°'], [45, '45°'], [90, '90°']] as const) {
    const [x, y] = punto(g === 90 ? 146 : 142, g === 90 ? 97 : g); nodo('text', { x, y: y + 4, class: 'm-rotulo', 'text-anchor': 'middle' }, contenedor).textContent = t;
  }
  // Hoja con rayas de seguridad, girando sobre la bisagra (0,0).
  const defs = nodo('defs', {}, contenedor);
  const patron = nodo('pattern', { id: 'm-rayas', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  nodo('rect', { width: 12, height: 12, fill: '#ffcc2a' }, patron); nodo('rect', { width: 6, height: 12, fill: '#252423' }, patron);
  const hoja = nodo('g', { class: 'm-hoja' }, contenedor);
  nodo('rect', { x: 0, y: -7, width: 128, height: 14, rx: 3, fill: 'url(#m-rayas)' }, hoja);
  const baliza = nodo('circle', { cx: 124, cy: 0, r: 5, class: 'm-baliza' }, hoja);
  nodo('circle', { r: 11, class: 'm-bisagra' }, contenedor);
  nodo('circle', { r: 4, class: 'm-bisagra-centro' }, contenedor);

  const estado = { grados: 0 };
  const pintar = () => {
    hoja.setAttribute('transform', `rotate(${-estado.grados})`);
    const [x, y] = punto(132, estado.grados);
    barrido.setAttribute('d', estado.grados < .5 ? '' : `M0 0 L132 0 A132 132 0 0 0 ${x} ${y} Z`);
    marcas.querySelectorAll<SVGLineElement>('.m-activa').forEach(m => m.classList.toggle('m-encendida', Number(m.dataset.g) <= estado.grados));
  };

  // Encendido: segmentos que se dibujan, marcas en cascada y la hoja que barre 0→90→0 como autoprueba.
  if (!reducido()) {
    createTimeline({ defaults: { ease: 'outExpo' } })
      .add(svg.createDrawable(anillo.querySelectorAll('path')), { draw: ['0 0', '0 1'], duration: 900, delay: stagger(70) })
      .add(marcas.querySelectorAll('line'), { opacity: [0, 1], scale: [.4, 1], duration: 500, delay: stagger(4, { from: 'first' }) }, 200)
      .add(estado, { grados: [0, 90, 0], duration: 1400, ease: 'inOutQuad', onUpdate: pintar }, 500);
  }
  let latido: ReturnType<typeof animate> | null = null;
  pintar();

  return {
    /** Sigue la posición publicada por el ESP32 (0–100 %); la baliza late mientras se mueve. */
    actualizar(pos: number, moviendo: boolean) {
      animate(estado, { grados: pos * 0.9, duration: reducido() ? 0 : 450, ease: 'outQuart', onUpdate: pintar });
      if (moviendo && !latido && !reducido()) latido = animate(baliza, { opacity: [1, .2], r: [5, 8], duration: 380, alternate: true, loop: true, ease: 'inOutSine' });
      else if (!moviendo && latido) { latido.revert(); latido = null; }
    },
  };
}
