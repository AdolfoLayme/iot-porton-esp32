// Mascota que cruza el paso del portón (2026-10-21, pedido de Adolfo: ver el obstáculo en la casa 3D).
// Cuando el ESP32 marca obstáculo (el HC-SR04 de Wokwi baja de 20 cm), el perro camina desde el patio hasta el
// haz del sensor y se queda ahí; cuando el paso se despeja, vuelve al patio y desaparece. Es solo visual: la casa
// no crea obstáculos, los muestra. Modelo: "Dog" de Quaternius (CC0), convertido a GLB con Blender.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ALTO = 0.55, VELOCIDAD = 1.1, RECORRIDO = 3.2;   // m, m/s, m desde el patio hasta el haz

type Paso = { punto: T.Vector3; lado: number; haciaBisagra: number };

export function crearMascota(escena: T.Scene, piso: T.Object3D, paso: Paso) {
  // Altura del piso bajo el haz (patio de concreto) con un rayo hacia abajo.
  const rayo = new T.Raycaster(new T.Vector3(paso.punto.x, 5, paso.punto.z), new T.Vector3(0, -1, 0));
  const y = rayo.intersectObject(piso, true)[0]?.point.y ?? 0;
  const destino = new T.Vector3(paso.punto.x, y, paso.punto.z);
  const origen = destino.clone().add(new T.Vector3(0, 0, paso.lado * RECORRIDO));
  const grupo = new T.Group(); grupo.visible = false; grupo.position.copy(origen); escena.add(grupo);
  let mezclador: T.AnimationMixer | null = null, caminar: T.AnimationAction | null = null, quieto: T.AnimationAction | null = null;
  let avance = 0;   // 0 = en el patio (oculto), 1 = en el haz

  new GLTFLoader().load('/casa/mascota/perro.glb', gltf => {
    const perro = gltf.scene;
    const caja = new T.Box3().setFromObject(perro), tam = caja.getSize(new T.Vector3());
    perro.scale.setScalar(ALTO / tam.y);
    perro.position.y = -caja.min.y * (ALTO / tam.y);
    perro.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    grupo.add(perro);
    mezclador = new T.AnimationMixer(perro);
    const clip = (n: string) => gltf.animations.find(a => a.name === n);
    const c = clip('Walking'), q = clip('Idle');
    if (c) caminar = mezclador.clipAction(c);
    if (q) quieto = mezclador.clipAction(q);
    quieto?.play();
  });

  function animar(accion: T.AnimationAction | null, otra: T.AnimationAction | null) {
    if (!accion || accion.isRunning() && accion.getEffectiveWeight() > 0.99) return;
    accion.reset().play(); if (otra) accion.crossFadeFrom(otra, 0.25, false);
  }

  return {
    actualizar(dt: number, obstaculo: boolean) {
      const meta = obstaculo ? 1 : 0, antes = avance;
      avance = meta > avance ? Math.min(1, avance + VELOCIDAD * dt / RECORRIDO) : Math.max(0, avance - VELOCIDAD * dt / RECORRIDO);
      const moviendo = avance !== antes;
      grupo.visible = avance > 0;
      grupo.position.lerpVectors(origen, destino, avance);
      // El modelo mira hacia +X. Entrando (o quieto en el haz) mira a la calle; saliendo, al patio.
      const saliendo = moviendo && meta < antes;
      grupo.rotation.y = (saliendo ? -1 : 1) * paso.lado * Math.PI / 2;
      if (moviendo) animar(caminar, quieto); else animar(quieto, caminar);
      mezclador?.update(dt);
    },
    destruir() { escena.remove(grupo); },
  };
}
