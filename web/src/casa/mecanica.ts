// Mecánica del portón (pedido de Adolfo: "le falta la bisagra y otras cosas"): dos bisagras de barril con
// sus placas en la columna, un brazo motorizado (actuador lineal, como un portón batiente real) que empuja la
// hoja, y un tope en el piso. El actuador se recalcula cada cuadro con la posición real de la hoja.
import * as T from 'three';

const ALTURAS_BISAGRA = [0.32, 1.55], BRAZO_EN_HOJA = 1.0, ALTURA_BRAZO = 0.85;

export function crearMecanica(escena: T.Scene, hoja: T.Object3D) {
  const giro = hoja.rotation.y; hoja.rotation.y = 0; hoja.updateMatrixWorld(true);
  const cerrada = new T.Box3().setFromObject(hoja), centro = cerrada.getCenter(new T.Vector3());
  hoja.rotation.y = 0.3; hoja.updateMatrixWorld(true);
  const lado = Math.sign(new T.Box3().setFromObject(hoja).getCenter(new T.Vector3()).z - centro.z) || 1;
  hoja.rotation.y = giro; hoja.updateMatrixWorld(true);
  const bisagra = hoja.getWorldPosition(new T.Vector3());
  const extremo = Math.abs(cerrada.max.x - bisagra.x) > Math.abs(cerrada.min.x - bisagra.x) ? cerrada.max.x : cerrada.min.x;
  const haciaExtremo = Math.sign(extremo - bisagra.x);

  const grupo = new T.Group(); escena.add(grupo);
  const acero = new T.MeshStandardMaterial({ color: '#2a2c2e', metalness: 0.85, roughness: 0.38 });
  const cromo = new T.MeshStandardMaterial({ color: '#c8ccd0', metalness: 1, roughness: 0.18 });
  const carcasa = new T.MeshStandardMaterial({ color: '#d9d6cf', metalness: 0.1, roughness: 0.55 });
  const pieza = (g: T.BufferGeometry, m: T.Material) => { const x = new T.Mesh(g, m); x.castShadow = true; grupo.add(x); return x; };

  // Bisagras: barril vertical en el eje + placa atornillada a la columna.
  for (const y of ALTURAS_BISAGRA) {
    pieza(new T.CylinderGeometry(0.032, 0.032, 0.16, 20), acero).position.set(bisagra.x, y, bisagra.z);
    pieza(new T.CylinderGeometry(0.036, 0.036, 0.02, 20), cromo).position.set(bisagra.x, y + 0.09, bisagra.z);
    pieza(new T.BoxGeometry(0.1, 0.14, 0.012), acero).position.set(bisagra.x - haciaExtremo * 0.07, y, bisagra.z + lado * 0.04);
  }
  // Actuador: anclaje fijo en la columna (detrás de la bisagra, del lado donde abre) y punto en la hoja.
  const anclaje = new T.Vector3(bisagra.x - haciaExtremo * 0.18, ALTURA_BRAZO, bisagra.z + lado * 0.32);
  pieza(new T.BoxGeometry(0.08, 0.1, 0.12), acero).position.copy(anclaje);
  const cuerpo = pieza(new T.CylinderGeometry(0.045, 0.045, 0.62, 20), carcasa);
  const motor = pieza(new T.BoxGeometry(0.1, 0.12, 0.16), carcasa);
  const vastago = pieza(new T.CylinderGeometry(0.014, 0.014, 1, 12), cromo);
  const ojal = pieza(new T.SphereGeometry(0.025, 12, 8), acero);
  // Tope de piso: donde se apoya la hoja al cerrar.
  pieza(new T.BoxGeometry(0.1, 0.06, 0.08), acero).position.set(extremo - haciaExtremo * 0.08, 0.15, centro.z - lado * 0.1);

  const arriba = new T.Vector3(0, 1, 0), punto = new T.Vector3(), dir = new T.Vector3();
  function orientar(m: T.Object3D, desde: T.Vector3, hasta: T.Vector3, largo?: number) {
    dir.subVectors(hasta, desde); const d = dir.length();
    m.position.copy(desde).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(arriba, dir.normalize());
    if (largo === undefined) m.scale.set(1, d, 1);
  }
  return {
    actualizar() {
      // Punto del brazo en la hoja: a 1 m de la bisagra, girando con ella.
      const a = -hoja.rotation.y * haciaExtremo;
      punto.set(bisagra.x + haciaExtremo * BRAZO_EN_HOJA * Math.cos(a), ALTURA_BRAZO, bisagra.z + lado * BRAZO_EN_HOJA * Math.abs(Math.sin(a)) + lado * 0.06);
      const fin = anclaje.clone().addScaledVector(dir.subVectors(punto, anclaje).normalize(), 0.62);
      orientar(cuerpo, anclaje, fin, 0.62);
      motor.position.copy(anclaje).addScaledVector(dir, 0.1); motor.quaternion.copy(cuerpo.quaternion);
      orientar(vastago, fin, punto);
      ojal.position.copy(punto);
    },
    destruir() { grupo.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); }); [acero, cromo, carcasa].forEach(m => m.dispose()); escena.remove(grupo); },
  };
}
