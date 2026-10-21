// Rampa de acceso (rebaje) frente al portón: el carro sube de la pista a la vereda por una rampa de concreto,
// como en una calle real, en vez de "atravesar" el cordón. Devuelve la altura del piso para cada z del carro.
import * as T from 'three';
import { mallasDe, materialesDe } from './cargar';

const LARGO_RAMPA = 0.8;

export function crearAcceso(escena: T.Scene, modelo: T.Object3D, hoja: T.Object3D) {
  const caja = (nombre: string) => {
    const m = mallasDe(modelo).find(x => materialesDe(x).some(y => y.name === nombre));
    return m ? { b: new T.Box3().setFromObject(m), mat: materialesDe(m)[0] } : null;
  };
  const vereda = caja('vereda_hormigon'), calle = caja('calle_asfalto'), entrada = caja('entrada_hormigon');
  const giro = hoja.rotation.y; hoja.rotation.y = 0; hoja.updateMatrixWorld(true);
  const porton = new T.Box3().setFromObject(hoja); hoja.rotation.y = giro; hoja.updateMatrixWorld(true);
  if (!vereda || !calle) return { altura: () => 0, destruir() {} };

  const borde = vereda.b.min.z, pista = calle.b.max.y, alto = vereda.b.max.y - pista;
  const patio = (entrada?.b.max.y ?? vereda.b.max.y) - pista, linea = porton.getCenter(new T.Vector3()).z;
  // Cuña de concreto: perfil triangular (z, y) extruido a lo ancho del portón.
  const perfil = new T.Shape([new T.Vector2(0, 0), new T.Vector2(LARGO_RAMPA, 0), new T.Vector2(LARGO_RAMPA, alto)]);
  const ancho = porton.max.x - porton.min.x + 0.4;
  const geo = new T.ExtrudeGeometry(perfil, { depth: ancho, bevelEnabled: false });
  const rampa = new T.Mesh(geo, vereda.mat);
  rampa.rotation.y = -Math.PI / 2;                       // extrusión a lo largo de x; el perfil sube hacia +z
  rampa.position.set(porton.max.x + 0.2, pista, borde - LARGO_RAMPA);
  rampa.receiveShadow = true; escena.add(rampa);

  return {
    /** Altura del piso bajo el carro (0 = pista). */
    altura(z: number) {
      if (z < borde - LARGO_RAMPA) return 0;
      if (z < borde) return alto * (z - (borde - LARGO_RAMPA)) / LARGO_RAMPA;
      if (z < linea) return alto;
      return z < linea + 0.4 ? alto + (patio - alto) * (z - linea) / 0.4 : patio;
    },
    destruir() { escena.remove(rampa); geo.dispose(); },
  };
}
