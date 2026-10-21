import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export function cargarModelo(url: string): Promise<T.Group> {
  return new Promise((listo, fallo) => {
    new GLTFLoader().load(url, gltf => listo(gltf.scene), undefined,
      () => fallo(new Error(`No se pudo cargar el modelo ${url}`)));
  });
}

export function cargarHdr(url: string): Promise<T.Texture> {
  return new Promise((listo, fallo) => {
    new HDRLoader().load(url, textura => {
      // La textura equirectangular se usa como ambiente y como fondo.
      textura.mapping = T.EquirectangularReflectionMapping;
      listo(textura);
    }, undefined, () => fallo(new Error(`No se pudo cargar el cielo ${url}`)));
  });
}

export function mallasDe(raiz: T.Object3D): T.Mesh[] {
  const mallas: T.Mesh[] = [];
  raiz.traverse(o => {
    if (o instanceof T.Mesh) mallas.push(o);
  });
  return mallas;
}

export function materialesDe(malla: T.Mesh): T.Material[] {
  const material = malla.material;
  return Array.isArray(material) ? material : [material];
}

export function liberar(raiz: T.Object3D): void {
  for (const malla of mallasDe(raiz)) {
    malla.geometry.dispose();
    for (const material of materialesDe(malla)) material.dispose();
  }
}
