import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export function crearMaqueta(escena: T.Scene) {
  const texturas: T.Texture[] = [];
  function textura(ruta: string, x = 1, y = 1) {
    const t = new T.TextureLoader().load(ruta); t.colorSpace = T.SRGBColorSpace;
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(x,y); texturas.push(t); return t;
  }
  const madera = new T.MeshStandardMaterial({map: textura('/texturas/madera.webp', 2, 1), roughness: .85});
  const carton = new T.MeshStandardMaterial({map: textura('/texturas/carton.webp', 2, 1), roughness: .95});
  const metal = new T.MeshStandardMaterial({color: '#b3b8b6', metalness: .8, roughness: .32});
  const negro = new T.MeshStandardMaterial({color: '#232728', roughness: .65});
  const azul = new T.MeshStandardMaterial({color: '#234f8d', roughness: .45, metalness: .2});
  const placa = new T.MeshStandardMaterial({color: '#17423c', roughness: .6});
  function caja(x: number,y: number,z: number, px: number,py: number,pz: number, material: T.Material, padre: T.Object3D = escena) {
    const m = new T.Mesh(new T.BoxGeometry(x,y,z), material); m.position.set(px,py,pz); padre.add(m); return m;
  }
  function cilindro(r: number,h: number,x: number,y: number,z: number, material: T.Material, padre: T.Object3D = escena) {
    const m = new T.Mesh(new T.CylinderGeometry(r,r,h,24),material); m.position.set(x,y,z); padre.add(m); return m;
  }
  caja(8,.22,5,0,-.11,0,madera);
  // Bordes de MDF, postes y bisagra visibles como en una maqueta de taller.
  caja(.16,1.9,.22,-1.65,.95,.25,madera); caja(.16,1.9,.22,1.65,.95,.25,madera);
  cilindro(.065,1.5,-1.65,.85,.25,metal);
  const pivote = new T.Group(); pivote.position.set(-1.65,.22,.25); escena.add(pivote);
  caja(3.12,1.42,.055,1.6,.75,0,carton,pivote);
  const borde = new T.MeshStandardMaterial({color: '#a7804e',roughness: 1});
  caja(3.12,.035,.075,1.6,1.46,0,borde,pivote);
  caja(3.12,.035,.075,1.6,.04,0,borde,pivote);
  caja(.08,.08,.12,2.92,.75,-.06,negro,pivote);
  // Brazo real del servo conectado a la hoja, gira con la misma bisagra.
  caja(.7,.045,.10,.26,-.05,0,metal,pivote);
  const servoProvisorio = caja(.44,.38,.3,-1.65,.19,.25,azul);
  let destruido = false;
  new GLTFLoader().load('/modelos/servo.glb', gltf => {
    if (destruido) {liberar(gltf.scene); return;}
    const modelo = gltf.scene, limites = new T.Box3().setFromObject(modelo);
    const tam = limites.getSize(new T.Vector3()), centro = limites.getCenter(new T.Vector3());
    const escala = .75 / Math.max(tam.x,tam.y,tam.z);
    modelo.scale.set(escala,escala,escala); modelo.position.copy(centro).multiplyScalar(-escala);
    const soporte = new T.Group(); soporte.position.set(-1.65,.25,.25); soporte.add(modelo); escena.add(soporte);
    escena.remove(servoProvisorio); servoProvisorio.geometry.dispose();
  }, undefined, () => { /* Geometría de respaldo si el archivo no está disponible. */ });
  // DESACTIVADO 2026-10-20: HC-SR04 en el piso, en medio de la maqueta (no vigilaba el paso del portón).
  // HC-SR04 en el poste derecho, a la altura de un auto/persona, mirando a lo largo del paso del portón:
  // cumple la función de la fotocélula de un portón real (si algo cruza mientras cierra, el ESP32 reabre).
  const sensor = new T.Group(); sensor.position.set(1.5,.42,.02); sensor.rotation.y = -Math.PI/2; escena.add(sensor);
  caja(.95,.45,.055,0,0,0,azul,sensor);
  for (const x of [-.27,.27]) {
    const tubo = cilindro(.175,.14,x,.05,.08,metal,sensor); tubo.rotation.x = Math.PI/2;
    const rejilla = cilindro(.14,.012,x,.05,.155,negro,sensor); rejilla.rotation.x = Math.PI/2;
  }
  const hazMaterial = new T.MeshBasicMaterial({color: '#39c6f4',transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});
  const haz = new T.Mesh(new T.ConeGeometry(.42,2.9,28),hazMaterial);
  haz.rotation.z = -Math.PI/2; haz.position.set(-.05,.47,.02); escena.add(haz);
  // ESP32 de referencia: PCB, blindaje metálico, USB y conectores.
  caja(.85,.07,1.55,2.4,.09,-1.1,placa);
  caja(.62,.09,.68,2.4,.17,-1.35,metal); caja(.42,.12,.27,2.4,.15,-.35,metal);
  caja(.48,.10,.29,2.4,.16,-.9,negro);
  for (const x of [1.99,2.81]) {
    caja(.1,.1,1.4,x,.16,-1.1,negro);
    for(let i=0;i<12;i++) caja(.025,.025,.055,x,.22,-1.74+i*.115,metal);
  }
  const dorado = new T.MeshStandardMaterial({color:'#b39753',metalness:.7,roughness:.3});
  for (let i=0;i<5;i++) caja(.49,.008,.025,2.4,.22,-1.97+i*.06,dorado);
  // DESACTIVADO 2026-10-20: LEDs solo sobre la placa. Ahora son las luces del portón, en lo alto del poste
  // derecho (verde = abierto, roja parpadea = en movimiento), con un halo de luz real.
  caja(.34,.12,.34,1.65,1.96,.25,negro);
  const halos: T.PointLight[] = [];
  const luces = ['#2fd38a','#ff4b4b'].map((color,i) => {
    const m = new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.25});
    const led = new T.Mesh(new T.SphereGeometry(.1,20,14),m);led.position.set(1.65,2.1,.17+i*.16);escena.add(led);
    const halo = new T.PointLight(color,0,2.2,2);halo.position.copy(led.position);escena.add(halo);
    halos.push(halo); return m;
  });
  // El obstáculo aparece justo en el paso que vigila el sensor.
  const obstaculo = caja(.55,.75,.55,.2,.375,.02,carton); obstaculo.visible = false;
  // Sombras de contacto suaves, sin mapas dinámicos costosos en celulares.
  const sombra = new T.MeshBasicMaterial({color:'#292a21',transparent:true,opacity:.10,depthWrite:false});
  const contacto = new T.Mesh(new T.PlaneGeometry(3.5,.35),sombra); contacto.rotation.x=-Math.PI/2;contacto.position.set(0,.006,.3);escena.add(contacto);
  function liberar(raiz: T.Object3D) {
    const geometrias = new Set<T.BufferGeometry>(), materiales = new Set<T.Material>();
    raiz.traverse(o => {if(o instanceof T.Mesh){geometrias.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach((m: T.Material)=>materiales.add(m));}});
    geometrias.forEach(g=>g.dispose());materiales.forEach(m=>m.dispose());
  }
  return {pivote,luces,halos,hazMaterial,obstaculo,
    destruir(){destruido=true;liberar(escena);texturas.forEach(t=>t.dispose());}};
}
