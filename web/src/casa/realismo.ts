// Materiales reales para la casa (pedido de Adolfo: "pasto real, texturas en las paredes, focos de verdad"):
// pasto (ambientCG Grass001), concreto y ladrillo (Poly Haven), hojas para setos y macetas, y un foco
// industrial con jaula (Poly Haven industrial_wall_lamp) en lugar de la esfera de la baliza. Todo CC0.
// DESACTIVADO 2026-10-20: arbustos shrub_03 esparcidos sobre el seto (parecían maleza y salían por todas partes).
import * as T from 'three';
import { cargarModelo, mallasDe, materialesDe } from './cargar';
import type { MaterialesClima } from './clima';

const TEX = '/casa/texturas/';
type Superficie = { nombres: string[]; base: string; metros: number; tinte?: string; caja?: boolean };
const SUPERFICIES: Superficie[] = [
  { nombres: ['cesped'], base: 'grass001', metros: 2.2 },
  { nombres: ['entrada_hormigon', 'vereda_hormigon'], base: 'concrete_floor_02', metros: 3 },
  { nombres: ['modular_urban_apartments_facade_trim_01', 'modular_urban_apartments_facade_plaster'], base: 'brick_wall_02', metros: 1.6, caja: true },
  { nombres: ['poste_piedra'], base: 'concrete_floor_02', metros: 1.2, tinte: '#e8e4dc', caja: true },
  // DESACTIVADO 2026-10-20: textura de hojas sobre el seto en caja (seguía cuadrado). Ver vegetacion.ts.
];

/** UV por proyección de caja: cada cara toma el plano de su normal dominante, en metros / escala. */
function uvDeCaja(malla: T.Mesh, metros: number) {
  const g = malla.geometry, pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  if (!pos || !nor) return;
  const esc = malla.getWorldScale(new T.Vector3()), uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * esc.x, y = pos.getY(i) * esc.y, z = pos.getZ(i) * esc.z;
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y];
    uv[i * 2] = u / metros; uv[i * 2 + 1] = v / metros;
  }
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
}

export function aplicarRealismo(escena: T.Scene, modelo: T.Object3D, anisotropia: number, clima: MaterialesClima) {
  const texturas: T.Texture[] = [], extras: T.Object3D[] = [];
  const cargar = (archivo: string, color: boolean, rep: T.Vector2) => {
    const t = new T.TextureLoader().load(TEX + archivo);
    if (color) t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.copy(rep); t.anisotropy = anisotropia;
    texturas.push(t); return t;
  };
  for (const s of SUPERFICIES) {
    for (const malla of mallasDe(modelo)) {
      for (const m of materialesDe(malla)) {
        if (!(m instanceof T.MeshStandardMaterial) || !s.nombres.includes(m.name)) continue;
        // Sin UV útiles (muros): proyección de caja en metros reales y repetición 1.
        if (s.caja) { uvDeCaja(malla, s.metros); }
        const tam = s.caja ? new T.Vector3(s.metros, s.metros, s.metros) : new T.Box3().setFromObject(malla).getSize(new T.Vector3());
        // Superficie plana: x por z. Vertical (muros, columnas): largo por alto.
        const plana = tam.y < 0.5;
        const rep = plana ? new T.Vector2(tam.x / s.metros, tam.z / s.metros) : new T.Vector2(Math.max(tam.x, tam.z) / s.metros, tam.y / s.metros);
        if (s.caja) rep.set(1, 1); else rep.set(Math.max(1, rep.x), Math.max(1, rep.y));
        m.map = cargar(`${s.base}_diff_1k.jpg`, true, rep);
        m.normalMap = cargar(`${s.base}_nor_gl_1k.jpg`, false, rep);
        m.roughnessMap = cargar(`${s.base}_rough_1k.jpg`, false, rep);
        m.color.set(s.tinte ?? '#ffffff'); m.roughness = 1; m.metalness = 0; m.needsUpdate = true;
      }
    }
  }

  // Foco con jaula sobre la columna de la bisagra, mirando a la calle; su vidrio hace de baliza roja/verde.
  const esfera = modelo.getObjectByName('baliza');
  if (esfera) void cargarModelo('/casa/foco/industrial_wall_lamp_1k.gltf').then(foco => {
    const lugar = esfera.getWorldPosition(new T.Vector3());
    const tam = new T.Box3().setFromObject(foco).getSize(new T.Vector3());
    foco.scale.setScalar(0.38 / Math.max(tam.x, tam.y, tam.z));
    foco.position.set(lugar.x, lugar.y - 0.32, lugar.z - 0.2);
    foco.rotation.y = Math.PI;
    escena.add(foco); extras.push(foco); esfera.visible = false;
    for (const malla of mallasDe(foco)) {
      malla.castShadow = true;
      for (const m of materialesDe(malla)) if (m instanceof T.MeshStandardMaterial && m.name.includes('glass')) clima.baliza = m;
    }
    const luz = new T.PointLight('#22d35f', 0, 5, 2); luz.position.set(lugar.x, lugar.y - 0.3, lugar.z - 0.45);
    escena.add(luz); extras.push(luz); clima.balizaLuz = luz;
  }).catch(() => { /* Sin el foco queda la baliza original. */ });

  return { destruir() { texturas.forEach(t => t.dispose()); extras.forEach(o => escena.remove(o)); } };
}
