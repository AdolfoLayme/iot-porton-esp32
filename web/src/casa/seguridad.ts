// Sensor del portón en la casa (2026-10-21, pedido de Adolfo: "posición poco conveniente, no se ve bien").
// Como en los portones batientes reales, va en un poste bajo propio (columna de fotocélula), dentro del
// patio junto a la columna del extremo libre, a 55 cm del suelo. Mira hacia la bisagra y su haz cruza la
// zona por donde barre la hoja: si algo queda ahí mientras cierra, el ESP32 detiene y reabre.
// DESACTIVADO 2026-10-21: placa empotrada en la cara de la columna (quedaba tapada por la hoja).
// DESACTIVADO 2026-10-20: caja con esferas verde/roja sobre el poste (Adolfo: "no agregar elementos circulares").
import * as T from 'three';
import type { EstadoPorton } from '../estado/porton';

const ALTURA_SENSOR = 0.55, DENTRO = 0.55, AL_COSTADO = 0.3;

export function crearSeguridad(escena: T.Scene, modelo: T.Object3D, hoja: T.Object3D) {
  const giro = hoja.rotation.y; hoja.rotation.y = 0; hoja.updateMatrixWorld(true);
  const cerrada = new T.Box3().setFromObject(hoja), centro = cerrada.getCenter(new T.Vector3());
  hoja.rotation.y = 0.3; hoja.updateMatrixWorld(true);
  const lado = Math.sign(new T.Box3().setFromObject(hoja).getCenter(new T.Vector3()).z - centro.z) || -1;
  hoja.rotation.y = giro; hoja.updateMatrixWorld(true);
  const xBisagra = hoja.getWorldPosition(new T.Vector3()).x;
  const extremo = Math.abs(cerrada.max.x - xBisagra) > Math.abs(cerrada.min.x - xBisagra) ? cerrada.max.x : cerrada.min.x;
  const haciaBisagra = Math.sign(xBisagra - extremo);
  const sensorModelo = modelo.getObjectByName('sensor');
  if (sensorModelo) sensorModelo.visible = false;   // el del modelo apuntaba a la calle

  const grupo = new T.Group(); escena.add(grupo);
  const x = extremo - haciaBisagra * AL_COSTADO, z = centro.z + lado * DENTRO;
  const metal = new T.MeshStandardMaterial({ color: '#3b3e42', metalness: 0.8, roughness: 0.4 });
  const plastico = new T.MeshStandardMaterial({ color: '#e7e4dd', roughness: 0.55 });
  const azul = new T.MeshStandardMaterial({ color: '#1f5fa8', roughness: 0.45 });
  const cromo = new T.MeshStandardMaterial({ color: '#cfd3d7', metalness: 1, roughness: 0.2 });
  const pieza = (g: T.BufferGeometry, m: T.Material, px: number, py: number, pz: number) => {
    const p = new T.Mesh(g, m); p.position.set(px, py, pz); p.castShadow = true; grupo.add(p); return p;
  };
  pieza(new T.CylinderGeometry(0.045, 0.05, ALTURA_SENSOR, 18), metal, x, ALTURA_SENSOR / 2, z);          // poste
  pieza(new T.CylinderGeometry(0.07, 0.07, 0.02, 18), metal, x, 0.01, z);                                  // base
  pieza(new T.BoxGeometry(0.1, 0.12, 0.16), plastico, x, ALTURA_SENSOR + 0.05, z);                         // caja estanca
  pieza(new T.BoxGeometry(0.012, 0.07, 0.13), azul, x + haciaBisagra * 0.056, ALTURA_SENSOR + 0.05, z);    // HC-SR04
  for (const dz of [-0.035, 0.035]) {
    const ojo = pieza(new T.CylinderGeometry(0.025, 0.025, 0.025, 18), cromo, x + haciaBisagra * 0.07, ALTURA_SENSOR + 0.05, z + dz);
    ojo.rotation.z = Math.PI / 2;
  }
  // Haz: vértice en el sensor, se abre hacia la bisagra cubriendo la zona de barrido.
  const largo = Math.abs(xBisagra - x) - 0.2;
  const hazMaterial = new T.MeshBasicMaterial({ color: '#2fd0f0', transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide });
  const haz = new T.Mesh(new T.ConeGeometry(0.42, largo, 28, 1, true), hazMaterial);
  haz.rotation.z = haciaBisagra > 0 ? Math.PI / 2 : -Math.PI / 2;
  haz.position.set(x + haciaBisagra * (0.08 + largo / 2), ALTURA_SENSOR + 0.05, z); grupo.add(haz);

  return {
    /** Punto del haz en medio del paso (para la mascota) y lado del patio. */
    paso: { punto: new T.Vector3((x + xBisagra) / 2, 0, z), lado, haciaBisagra, sensorX: x, bisagraX: xBisagra },
    actualizar(e: EstadoPorton | null, online: boolean) {
      hazMaterial.color.set(e?.obstaculo ? '#ff3b30' : '#2fd0f0');
      hazMaterial.opacity = online ? (e?.obstaculo ? 0.38 : 0.22) : 0.12;
    },
    destruir() {
      grupo.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); });
      [metal, plastico, azul, cromo, hazMaterial].forEach(m => m.dispose()); escena.remove(grupo);
    },
  };
}
