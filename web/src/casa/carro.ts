import * as T from 'three';

export type EstadoCarro = 'calle' | 'yendo' | 'esperando' | 'entrando' | 'detenido' | 'en-puerta' | 'estacionado';

export type Carro = {
  /** `enPuerta`: entra y se queda parado bajo el portón (obstáculo para el sensor). */
  llegar(enPuerta?: boolean): void;
  /** z del haz del sensor, donde se detiene el carro en modo `enPuerta`. */
  fijarPuerta(z: number): void;
  /** Rectángulo que ocupa el carro en el piso (mundo). */
  huella(): { xMin: number; xMax: number; zMin: number; zMax: number };
  actualizar(dt: number, apertura: number, obstaculo: boolean): void;
  estado(): EstadoCarro;
};

const CALLE = -14.8;      // centro del carro aparcado junto al cordón, ya sobre el asfalto
const ESPERA = -12.6;     // frente al portón, sin invadir la línea predial
const COCHERA = 2.35;     // centro del carro dentro de la cochera
const LINEA = -10.0;      // línea del portón en el GLB
// Física simple pero real (2026-10-21, pedido de Adolfo): acelera y frena con límites de un auto,
// las ruedas giran según la distancia recorrida y la carrocería se inclina y rebota con la suspensión.
const ACELERACION = 1.8, FRENADA = 3.2, FRENO_EMERGENCIA = 7.5;   // m/s²
const VEL_CALLE = 3.0, VEL_PATIO = 1.8;                            // m/s
const RADIO_RUEDA = 0.35, BATALLA = 2.33;                          // m (del modelo: ejes en z +1,51 y −0,82)

// DESACTIVADO 2026-10-21: velocidad constante de 3 m/s, ruedas fijas y sin suspensión.
export function crearCarro(objeto: T.Object3D, altura: (z: number) => number = () => 0): Carro {
  let modo: EstadoCarro = 'calle';
  let z = CALLE, v = 0, inclinacion = 0, rebote = 0, velRebote = 0, pararEnPuerta = false, zPuerta = LINEA + 0.5;
  const ruedas = [0, 1, 2, 3].map(i => objeto.getObjectByName(`rueda_${i}`)).filter((r): r is T.Object3D => !!r);
  objeto.position.set(-3, 0, CALLE);
  objeto.updateMatrixWorld(true);
  const caja = new T.Box3().setFromObject(objeto), medio = caja.getCenter(new T.Vector3());
  const ancho = caja.max.x - caja.min.x, largo = caja.max.z - caja.min.z, desfase = medio.z - CALLE;

  function llegar(enPuerta = false): void {
    pararEnPuerta = enPuerta;
    // Parado en el portón: el botón normal lo hace seguir hasta la cochera.
    if (modo === 'en-puerta') { if (!enPuerta) modo = 'entrando'; return; }
    // Si ya estacionó, el botón lo devuelve a la calle para repetir la llegada.
    if (modo === 'estacionado' || modo === 'detenido') { z = CALLE; v = 0; modo = 'yendo'; }
    else if (modo === 'calle' || modo === 'esperando') modo = 'yendo';
  }

  /** Velocidad hacia una meta: acelera hasta el tope y frena justo a tiempo (v² = 2·a·d). */
  function hacia(meta: number, tope: number, dt: number): void {
    const resta = Math.max(0, meta - z), vFreno = Math.sqrt(2 * FRENADA * resta);
    const deseada = Math.min(tope, vFreno);
    v = v < deseada ? Math.min(deseada, v + ACELERACION * dt) : Math.max(deseada, v - FRENADA * dt);
    z = Math.min(meta, z + v * dt);
    if (resta < 0.005) v = 0;
  }

  function actualizar(dt: number, apertura: number, obstaculo: boolean): void {
    const abierto = apertura >= 90;
    const zAntes = z;
    if (modo === 'yendo') {
      hacia(ESPERA, VEL_CALLE, dt);
      if (z >= ESPERA - 0.005 && v === 0) modo = 'esperando';
    } else if (modo === 'esperando') {
      if (abierto && !obstaculo) modo = 'entrando';
    } else if (modo === 'entrando') {
      // Si el portón empieza a cerrarse mientras cruza, frena en seco. (El obstáculo que ve el sensor puede ser
      // el propio carro, así que no lo frena.) DESACTIVADO 2026-10-21: if ((!abierto || obstaculo) && enBoca)
      const enBoca = z > LINEA - 1.4 && z < -2;
      void obstaculo;
      const meta = pararEnPuerta ? zPuerta : COCHERA;
      if (!abierto && enBoca && z < meta - 0.01) modo = 'detenido';
      else {
        hacia(meta, z > LINEA ? VEL_PATIO : VEL_CALLE, dt);
        if (z >= meta - 0.005 && v === 0) modo = pararEnPuerta ? 'en-puerta' : 'estacionado';
      }
    } else if (modo === 'detenido') {
      v = Math.max(0, v - FRENO_EMERGENCIA * dt); z += v * dt;
      if (v === 0 && abierto) modo = 'entrando';   // el obstáculo puede ser el propio carro
    }
    const avance = z - zAntes;
    for (const r of ruedas) r.rotation.x += avance / RADIO_RUEDA;
    // Suspensión: el piso bajo cada eje da la inclinación; un resorte amortiguado da el rebote.
    const yDel = altura(z + 1.51), yTras = altura(z - 0.82);
    const objetivo = -Math.atan2(yDel - yTras, BATALLA);
    const golpe = objetivo - inclinacion;
    inclinacion += golpe * Math.min(1, dt * 12);
    velRebote += (-120 * rebote - 14 * velRebote - Math.abs(golpe) * 40) * dt;  // k=120, c=14 (amortiguado)
    rebote += velRebote * dt;
    objeto.position.z = z;
    objeto.position.y = (yDel + yTras) / 2 + rebote * 0.04;
    objeto.rotation.x = inclinacion;
  }

  return {
    llegar, actualizar, estado: () => modo,
    fijarPuerta(zp) { zPuerta = zp - desfase; },   // el centro de la carrocería queda sobre el haz
    huella() {
      const c = z + desfase, x = objeto.position.x + (medio.x - (-3));
      return { xMin: x - ancho / 2, xMax: x + ancho / 2, zMin: c - largo / 2, zMax: c + largo / 2 };
    },
  };
}
