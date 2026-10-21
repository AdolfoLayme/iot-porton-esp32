// Piezas del diagrama: cajas, conexiones y "paquetes" que viajan por ellas.
import type {CSSProperties, ReactNode} from 'react';
import {Img, interpolate, staticFile, Easing} from 'remotion';
import {loadFont as cargarAnton} from '@remotion/google-fonts/Anton';
import {loadFont as cargarInter} from '@remotion/google-fonts/Inter';
import {loadFont as cargarMono} from '@remotion/google-fonts/JetBrainsMono';

export const TITULO = cargarAnton().fontFamily;
export const TEXTO = cargarInter().fontFamily;
export const MONO = cargarMono().fontFamily;
export const NEGRO = '#111111';
export const ACENTO = '#FFD23F';   // amarillo de la app de control
export const GRIS = '#6b6b6b';

export type Punto = [number, number];

/** Activo entre los cuadros [desde, hasta): sirve para resaltar una caja cuando le llega algo. */
export const activo = (f: number, desde: number, hasta: number) => f >= desde && f < hasta;

export function Caja({x, y, w, h, titulo, tam = 34, logo, logoAlto = 40, lineas = [], img, imgAlto = 0, resaltar = false, children}: {
  x: number; y: number; w: number; h: number; titulo: string; tam?: number; logo?: string; logoAlto?: number; lineas?: string[];
  img?: string; imgAlto?: number; resaltar?: boolean; children?: ReactNode;
}) {
  const estilo: CSSProperties = {
    position: 'absolute', left: x, top: y, width: w, height: h, boxSizing: 'border-box',
    border: `4px solid ${NEGRO}`, background: resaltar ? ACENTO : '#fff', padding: '14px 18px',
    boxShadow: `8px 8px 0 ${NEGRO}`, display: 'flex', flexDirection: 'column', gap: 6,
  };
  return (
    <div style={estilo}>
      {/* Logo oficial del servicio o componente, arriba a la derecha. */}
      {logo && <Img src={staticFile(logo)} style={{position: 'absolute', top: 12, right: 14, height: logoAlto}} />}
      <div style={{fontFamily: TITULO, fontSize: tam, lineHeight: 1, color: NEGRO, textTransform: 'uppercase'}}>{titulo}</div>
      {img && <Img src={staticFile(img)} style={{height: imgAlto, objectFit: 'contain', alignSelf: 'center', margin: '6px 0'}} />}
      {lineas.map(l => (
        <div key={l} style={{fontFamily: TEXTO, fontSize: 19, lineHeight: 1.25, color: NEGRO}}>{l}</div>
      ))}
      {children}
    </div>
  );
}

/** Conexión recta entre dos puntos con su etiqueta. Punteada = configuración, no datos en vivo. */
export function Linea({a, b, etiqueta, punteada = false, lado = -1, en = 0.5}: {
  a: Punto; b: Punto; etiqueta?: string; punteada?: boolean; lado?: number; en?: number;
}) {
  // en: fracción del recorrido donde va la etiqueta (0 = en a, 1 = en b).
  const [mx, my] = [a[0] + (b[0] - a[0]) * en, a[1] + (b[1] - a[1]) * en];
  return (
    <>
      <svg style={{position: 'absolute', inset: 0}} width={1920} height={1080}>
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={NEGRO} strokeWidth={3}
          strokeDasharray={punteada ? '10 8' : undefined} />
      </svg>
      {etiqueta && (
        <div style={{
          position: 'absolute', left: mx, top: my + lado * 22, transform: 'translate(-50%, -50%)',
          fontFamily: MONO, fontSize: 16, background: '#fff', padding: '2px 6px', color: NEGRO, whiteSpace: 'nowrap',
        }}>{etiqueta}</div>
      )}
    </>
  );
}

/** Paquete que viaja de a hacia b entre los cuadros desde→hasta; fuera de ese rango no se dibuja. */
/** f: cuadro del recorrido actual (no del video), para reusar la misma línea de tiempo en cada vuelta. */
export function Paquete({f, a, b, desde, hasta, texto}: {f: number; a: Punto; b: Punto; desde: number; hasta: number; texto: string}) {
  if (f < desde || f >= hasta) return null;
  const t = interpolate(f, [desde, hasta - 1], [0, 1], {easing: Easing.inOut(Easing.cubic)});
  const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', background: ACENTO,
      border: `3px solid ${NEGRO}`, padding: '4px 10px', fontFamily: MONO, fontSize: 18, fontWeight: 700,
      color: NEGRO, whiteSpace: 'nowrap', boxShadow: `4px 4px 0 ${NEGRO}`,
    }}>{texto}</div>
  );
}
