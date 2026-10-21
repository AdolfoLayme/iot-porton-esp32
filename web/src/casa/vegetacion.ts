// Vegetación real (pedido de Adolfo: "el arbusto sigue cuadrado; la planta es un círculo").
// - Setos: miles de hojas reales (ambientCG LeafSet024, CC0) instanciadas sobre la forma del seto, con un
//   núcleo de follaje oscuro debajo, como se hace en motores de juego (la técnica del acuario de referencia).
// - Macetas: plantas reales de Poly Haven (potted_plant_01/02, CC0) en lugar de las esferas.
// - La maceta que tapaba la entrada de la cochera se quita (también su base de ladrillo).
import * as T from 'three';
import { cargarModelo, mallasDe, materialesDe } from './cargar';

const DENSIDAD = 520, MAX_HOJAS = 48000, TAM_HOJA = 0.12, CELDA = 0.6;

function azar(semilla: number) { // mulberry32: el seto sale igual en cada carga
  return () => { semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Agrupa los triángulos del seto (en el mundo) por celdas conectadas: cada grupo es un seto o una maceta.
 *  Se marca toda la superficie de cada triángulo (una caja solo tiene vértices en sus esquinas). */
function grupos(malla: T.Mesh): T.Box3[] {
  const geo = malla.geometry, pos = geo.getAttribute('position'), idx = geo.getIndex(), celdas = new Map<string, T.Box3>();
  malla.updateMatrixWorld(true);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), tri = new T.Box3();
  const n = idx ? idx.count : pos.count, vert = (i: number) => (idx ? idx.getX(i) : i);
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, vert(i)).applyMatrix4(malla.matrixWorld);
    b.fromBufferAttribute(pos, vert(i + 1)).applyMatrix4(malla.matrixWorld);
    c.fromBufferAttribute(pos, vert(i + 2)).applyMatrix4(malla.matrixWorld);
    tri.makeEmpty().expandByPoint(a).expandByPoint(b).expandByPoint(c);
    for (let x = Math.floor(tri.min.x / CELDA); x <= Math.floor(tri.max.x / CELDA); x++)
      for (let z = Math.floor(tri.min.z / CELDA); z <= Math.floor(tri.max.z / CELDA); z++) {
        const k = `${x},${z}`, caja = celdas.get(k) ?? celdas.set(k, new T.Box3()).get(k)!;
        caja.expandByPoint(new T.Vector3(Math.max(tri.min.x, x * CELDA), tri.min.y, Math.max(tri.min.z, z * CELDA)));
        caja.expandByPoint(new T.Vector3(Math.min(tri.max.x, (x + 1) * CELDA), tri.max.y, Math.min(tri.max.z, (z + 1) * CELDA)));
      }
  }
  const vistos = new Set<string>(), salida: T.Box3[] = [];
  for (const inicio of celdas.keys()) {
    if (vistos.has(inicio)) continue;
    const caja = new T.Box3(), pila = [inicio]; vistos.add(inicio);
    while (pila.length) {
      const k = pila.pop()!, [x, z] = k.split(',').map(Number); caja.union(celdas.get(k)!);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = `${x + dx},${z + dz}`; if (celdas.has(n) && !vistos.has(n)) { vistos.add(n); pila.push(n); }
      }
    }
    salida.push(caja);
  }
  return salida;
}

/** Baja bajo el suelo los vértices de un material dentro de una zona (para quitar la base de la maceta mal puesta). */
const PISOS = ['cesped', 'entrada_hormigon', 'vereda_hormigon', 'calle_asfalto', 'interior_cochera'];
function hundir(modelo: T.Object3D, zona: T.Box3) {
  for (const malla of mallasDe(modelo)) {
    if (materialesDe(malla).some(m => PISOS.includes(m.name))) continue;
    const pos = malla.geometry.getAttribute('position') as T.BufferAttribute, v = new T.Vector3();
    const inversa = malla.matrixWorld.clone().invert();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(malla.matrixWorld);
      if (zona.containsPoint(v)) { v.y -= 5; v.applyMatrix4(inversa); pos.setXYZ(i, v.x, v.y, v.z); }
    }
    pos.needsUpdate = true; malla.geometry.computeBoundingSphere();
  }
}

function seto(escena: T.Scene, caja: T.Box3, material: T.MeshStandardMaterial, nucleo: T.Material, rnd: () => number, cupo: number) {
  const tam = caja.getSize(new T.Vector3()), centro = caja.getCenter(new T.Vector3());
  const nucleoMalla = new T.Mesh(new T.BoxGeometry(tam.x * 0.94, tam.y * 0.96, tam.z * 0.94), nucleo);
  nucleoMalla.position.copy(centro); nucleoMalla.position.y -= tam.y * 0.02; escena.add(nucleoMalla);
  // Caras: arriba y los 4 lados, cada una con su área.
  const caras = [
    { n: new T.Vector3(0, 1, 0), a: tam.x * tam.z }, { n: new T.Vector3(1, 0, 0), a: tam.z * tam.y }, { n: new T.Vector3(-1, 0, 0), a: tam.z * tam.y },
    { n: new T.Vector3(0, 0, 1), a: tam.x * tam.y }, { n: new T.Vector3(0, 0, -1), a: tam.x * tam.y },
  ];
  const total = caras.reduce((s, c) => s + c.a, 0), cantidad = Math.min(cupo, Math.round(total * DENSIDAD));
  const geos = Array.from({ length: 9 }, (_, i) => { // una geometría por hoja del atlas 3×3
    const g = new T.PlaneGeometry(TAM_HOJA, TAM_HOJA), uv = g.getAttribute('uv');
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + (i % 3)) / 3, (uv.getY(k) + Math.floor(i / 3)) / 3);
    return g;
  });
  const mallas = geos.map(g => { const m = new T.InstancedMesh(g, material, Math.ceil(cantidad / 9) + 1); m.count = 0; m.castShadow = true; m.receiveShadow = true; escena.add(m); return m; });
  const d = new T.Object3D(), color = new T.Color(), p = new T.Vector3();
  for (let i = 0; i < cantidad; i++) {
    let r = rnd() * total, cara = caras[0];
    for (const c of caras) { if ((r -= c.a) <= 0) { cara = c; break; } }
    const { n } = cara;
    p.set(centro.x + (rnd() - .5) * tam.x, centro.y + (rnd() - .5) * tam.y, centro.z + (rnd() - .5) * tam.z);
    if (n.y) p.y = caja.max.y; if (n.x) p.x = n.x > 0 ? caja.max.x : caja.min.x; if (n.z) p.z = n.z > 0 ? caja.max.z : caja.min.z;
    // Esquinas redondeadas: cerca del borde superior la hoja baja y entra un poco.
    const borde = Math.min(caja.max.x - p.x, p.x - caja.min.x, caja.max.z - p.z, p.z - caja.min.z);
    if (borde < 0.12) p.y -= (0.12 - borde) * 0.8;
    p.addScaledVector(n, -0.02 + rnd() * 0.07);
    d.position.copy(p);
    d.lookAt(p.x + n.x + (rnd() - .5) * 1.4, p.y + n.y + (rnd() - .2) * 1.2, p.z + n.z + (rnd() - .5) * 1.4);
    d.rotateZ(rnd() * Math.PI * 2); d.scale.setScalar(0.75 + rnd() * 0.6); d.updateMatrix();
    const m = mallas[Math.floor(rnd() * 9)];
    m.setMatrixAt(m.count, d.matrix);
    m.setColorAt(m.count, color.setHSL(0.25 + rnd() * 0.05, 0.45, 0.32 + rnd() * 0.18)); m.count++;
  }
  mallas.forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  return [nucleoMalla, ...mallas] as T.Object3D[];
}

export function crearVegetacion(escena: T.Scene, modelo: T.Object3D, anisotropia: number) {
  const extras: T.Object3D[] = [], rnd = azar(20261020);
  const hojas = new T.TextureLoader().load('/casa/hojas/hojas.png');
  hojas.colorSpace = T.SRGBColorSpace; hojas.anisotropy = anisotropia;
  const material = new T.MeshStandardMaterial({ map: hojas, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.75 });
  const nucleo = new T.MeshStandardMaterial({ color: '#1f3818', roughness: 1 });
  // Carril de la cochera: el ancho de la cochera, desde el portón hasta adentro.
  const cochera = mallasDe(modelo).find(m => materialesDe(m).some(x => x.name === 'interior_cochera'));
  const camino = cochera ? new T.Box3().setFromObject(cochera).expandByVector(new T.Vector3(0.2, 0, 20)) : null;

  const macetas: T.Box3[] = [];
  for (const malla of mallasDe(modelo).filter(m => materialesDe(m).some(x => x.name === 'seto'))) {
    let cupo = MAX_HOJAS;
    for (const caja of grupos(malla)) {
      const tam = caja.getSize(new T.Vector3());
      if (Math.max(tam.x, tam.z) > 2.2) { const hechos = seto(escena, caja, material, nucleo, rnd, cupo); extras.push(...hechos); cupo -= 9000; }
      else macetas.push(caja);
    }
    malla.visible = false;
  }
  // Plantas reales en las macetas; la que queda dentro del camino de la cochera se quita con su base.
  void Promise.all(['potted_plant_01', 'potted_plant_02'].map(n => cargarModelo(`/casa/plantas/${n}/${n}_1k.gltf`))).then(modelos => {
    macetas.forEach((caja, i) => {
      const c = caja.getCenter(new T.Vector3());
      if (camino && camino.containsPoint(new T.Vector3(c.x, camino.min.y + 0.1, c.z))) {
        hundir(modelo, new T.Box3(new T.Vector3(c.x - .6, 0.02, c.z - .6), new T.Vector3(c.x + .6, caja.min.y + .05, c.z + .6)));
        return;
      }
      const planta = modelos[i % 2].clone(), tam = new T.Box3().setFromObject(planta).getSize(new T.Vector3());
      planta.scale.setScalar(Math.max(0.95, caja.getSize(new T.Vector3()).y * 1.7) / tam.y);
      planta.position.set(c.x, caja.min.y - 0.02, c.z); planta.rotation.y = rnd() * Math.PI * 2;
      planta.traverse(o => { if (o instanceof T.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
      escena.add(planta); extras.push(planta);
    });
  }).catch(() => { /* Sin modelos quedan las bases vacías. */ });

  return { destruir() { extras.forEach(o => escena.remove(o)); hojas.dispose(); material.dispose(); nucleo.dispose(); } };
}
