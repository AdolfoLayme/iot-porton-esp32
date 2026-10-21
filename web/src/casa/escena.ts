import * as T from 'three';
import { crearSeguridad } from './seguridad';
// DESACTIVADO 2026-10-21: import { crearMascota } from './mascota';
import { aplicarRealismo } from './realismo';
import { crearAcceso } from './acceso';
import { crearMecanica } from './mecanica';
import { crearVegetacion } from './vegetacion';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { EstadoPorton } from '../estado/porton';
import { cargarModelo, liberar, mallasDe, materialesDe } from './cargar';
import { crearCarro, type Carro } from './carro';
import { crearClima, type Clima, type MaterialesClima } from './clima';

export type EscenaCasa = {
  actualizar(e: EstadoPorton, online: boolean): void;
  destruir(): void;
};

export function montarCasa(lienzo: HTMLCanvasElement): EscenaCasa {
  const render = new T.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
  render.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  render.outputColorSpace = T.SRGBColorSpace;
  render.toneMapping = T.ACESFilmicToneMapping;
  render.toneMappingExposure = 1.1;
  render.shadowMap.enabled = true;
  render.shadowMap.type = T.PCFSoftShadowMap;

  const escena = new T.Scene();
  escena.background = new T.Color('#c6d2d9');
  escena.fog = new T.Fog('#cfd8dd', 34, 118);

  const camara = new T.PerspectiveCamera(38, 1, 0.1, 320);
  const OBJETIVO = new T.Vector3(-2.8, 2.4, -6.2);
  camara.position.set(6.6, 7.4, -26.4);
  const controles = new OrbitControls(camara, lienzo);
  controles.target.copy(OBJETIVO);
  controles.enableDamping = true;
  controles.dampingFactor = 0.075;
  controles.enablePan = false;
  controles.minDistance = 7;
  controles.maxDistance = 55;
  controles.minPolarAngle = 0.12;
  controles.maxPolarAngle = Math.PI * 0.49;

  const ambiente = new T.HemisphereLight('#dfe9f2', '#5b5347', 0.55);
  const sol = new T.DirectionalLight('#fff0d8', 2.6);
  sol.position.set(-16, 24, -14);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -24;
  sol.shadow.camera.right = 24;
  sol.shadow.camera.top = 24;
  sol.shadow.camera.bottom = -24;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 80;
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.035;
  escena.add(ambiente, sol);

  let raiz: T.Group | null = null;
  let hoja: T.Object3D | null = null;
  let carro: Carro | null = null;
  let clima: Clima | null = null;
  let seguridad: ReturnType<typeof crearSeguridad> | null = null;
  // DESACTIVADO 2026-10-21: let mascota: ReturnType<typeof crearMascota> | null = null;
  let realismo: ReturnType<typeof aplicarRealismo> | null = null;
  let acceso: ReturnType<typeof crearAcceso> | null = null;
  let mecanica: ReturnType<typeof crearMecanica> | null = null;
  let vegetacion: ReturnType<typeof crearVegetacion> | null = null;

  let estado: EstadoPorton | null = null;
  let enLinea = false;
  let angulo = 0;
  let primerEstado = true;
  let destruida = false;
  let raf = 0;
  let anterior = performance.now(), ultimoEntorno = 0;
  let encuadrado = false;
  let interactuo = false;
  let encuadreRetrato = false;
  controles.addEventListener('start', () => { interactuo = true; });

  /** Plano inicial: tres cuartos de la fachada, con el portón y el carro en el borde. */
  function encuadrar(retrato: boolean): void {
    encuadrado = true;
    encuadreRetrato = retrato;
    camara.fov = retrato ? 44 : 38;
    const distancia = retrato ? 30 : 22;
    const direccion = new T.Vector3(0.30, 0.19, -0.93).normalize();
    camara.position.copy(OBJETIVO).addScaledVector(direccion, distancia);
    controles.target.copy(OBJETIVO);
    // ?camara=x,y,z,tx,ty,tz: vista fija para revisar detalles (capturas de verificación).
    const vista = new URLSearchParams(location.search).get('camara')?.split(',').map(Number);
    if (vista?.length === 6 && vista.every(Number.isFinite)) { camara.position.set(vista[0], vista[1], vista[2]); controles.target.set(vista[3], vista[4], vista[5]); }
  }

  function redimensionar(): void {
    const caja = lienzo.getBoundingClientRect();
    const ancho = Math.max(1, caja.width), alto = Math.max(1, caja.height);
    render.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    const retrato = camara.aspect < 0.8;
    // Encuadre cinematográfico de la fachada: se rehace al cambiar de orientación
    // mientras el visitante no haya movido la cámara.
    if (!encuadrado || (!interactuo && retrato !== encuadreRetrato)) encuadrar(retrato);
    camara.updateProjectionMatrix();
    controles.update();
  }
  const observador = new ResizeObserver(redimensionar);
  observador.observe(lienzo);
  redimensionar();

  function dibujar(ahora: number): void {
    if (destruida) return;
    const dt = Math.min((ahora - anterior) / 1000, 0.1);
    anterior = ahora;
    const pos = estado?.pos ?? 0;
    const moviendose = !!estado && estado.pos !== estado.objetivo;
    if (hoja) {
      const destino = (pos / 100) * (Math.PI / 2);
      angulo += (destino - angulo) * (1 - Math.exp(-dt / 0.32));
      if (Math.abs(destino - angulo) < 0.0004) angulo = destino;
      hoja.rotation.y = angulo;
    }
    carro?.actualizar(dt, pos, estado?.obstaculo ?? false);
    clima?.parpadearBaliza(moviendose, ahora / 1000, enLinea && !!estado?.led.verde);
    clima?.lucesCochera(!!estado && (estado.led.verde || moviendose));
    seguridad?.actualizar(estado, enLinea);
    // Entorno simulado: si el carro corta el haz, se avisa al ESP32 la distancia que mediría el HC-SR04.
    if (carro && seguridad && ahora - ultimoEntorno > 400) {
      const h = carro.huella(), p = seguridad.paso;
      const enHaz = h.zMin <= p.punto.z && p.punto.z <= h.zMax &&
        h.xMax >= Math.min(p.sensorX, p.bisagraX) && h.xMin <= Math.max(p.sensorX, p.bisagraX);
      if (enHaz) {
        ultimoEntorno = ahora;
        // La casa es tamaño real y el umbral del firmware (20 cm) es el de la maqueta: se pasa a esa escala, de modo
        // que cualquier cosa dentro del haz quede bajo el umbral, proporcional a dónde lo corta.
        const metros = p.haciaBisagra > 0 ? h.xMin - p.sensorX : p.sensorX - h.xMax;
        const fraccion = Math.min(1, Math.max(0, metros / Math.abs(p.bisagraX - p.sensorX)));
        lienzo.dispatchEvent(new CustomEvent<number>('casa:entorno', { detail: Math.max(2, fraccion * 19) }));
      }
    }
    // DESACTIVADO 2026-10-21: mascota en el haz (Adolfo prefirió usar el carro como obstáculo).
    // mascota?.actualizar(dt, enLinea && !!estado?.obstaculo);
    mecanica?.actualizar();
    controles.update();
    if (!document.hidden) render.render(escena, camara);
    raf = requestAnimationFrame(dibujar);
  }

  async function cargar(): Promise<void> {
    const modelo = await cargarModelo('/casa/casa.glb');
    raiz = modelo;
    escena.add(modelo);
    hoja = modelo.getObjectByName('porton_hoja') ?? null;
    const nodoCarro = modelo.getObjectByName('carro');
    if (hoja) acceso = crearAcceso(escena, modelo, hoja);
    if (hoja) mecanica = crearMecanica(escena, hoja);
    if (nodoCarro) carro = crearCarro(nodoCarro, z => acceso?.altura(z) ?? 0);
    vegetacion = crearVegetacion(escena, modelo, render.capabilities.getMaxAnisotropy());

    const materiales: MaterialesClima = { ventanas: [], farola: [], baliza: null, cochera: null };
    for (const malla of mallasDe(modelo)) {
      malla.castShadow = true;
      malla.receiveShadow = true;
      for (const material of materialesDe(malla)) {
        if (!(material instanceof T.MeshStandardMaterial)) continue;
        if (material.name === 'ventanas') materiales.ventanas.push(material);
        else if (material.name === 'street_lamp_01_bulb' || material.name === 'street_lamp_01_glass') materiales.farola.push(material);
        else if (material.name === 'baliza') materiales.baliza = material;
        else if (material.name === 'luz_cochera_emisiva') materiales.cochera = material;
      }
    }
    clima = crearClima(escena, sol, ambiente, materiales);

    // DESACTIVADO 2026-10-20: el cono salía del sensor hacia la calle (no vigilaba el paso del portón).
    // const sensor = modelo.getObjectByName('sensor'); ... cono.position.set(centro.x, centro.y, centro.z - 1.55);
    if (hoja) seguridad = crearSeguridad(escena, modelo, hoja);
    if (seguridad) carro?.fijarPuerta(seguridad.paso.punto.z);
    // DESACTIVADO 2026-10-21: if (seguridad) mascota = crearMascota(escena, modelo, seguridad.paso);
    realismo = aplicarRealismo(escena, modelo, render.capabilities.getMaxAnisotropy(), materiales);

    lienzo.dispatchEvent(new CustomEvent('casa:listo'));
  }

  void cargar().catch((error: unknown) => {
    const detalle = error instanceof Error ? error.message : 'Error al cargar la escena.';
    lienzo.dispatchEvent(new CustomEvent<string>('casa:fallo', { detail: detalle }));
  });

  function alternarClima(): void {
    clima?.alternar();
  }
  function llegarCarro(): void {
    carro?.llegar();
  }
  function carroEnPuerta(): void {
    carro?.llegar(true);
  }
  lienzo.addEventListener('casa:clima', alternarClima);
  lienzo.addEventListener('casa:carro', llegarCarro);
  lienzo.addEventListener('casa:carro-puerta', carroEnPuerta);

  raf = requestAnimationFrame(dibujar);

  return {
    actualizar(e, online) {
      estado = e;
      enLinea = online;
      if (primerEstado && hoja) {
        angulo = (e.pos / 100) * (Math.PI / 2);
        hoja.rotation.y = angulo;
        primerEstado = false;
      }
      lienzo.setAttribute('aria-label', `Casa con portón automático: ${e.pos} % de apertura. ` +
        `${e.obstaculo ? 'Obstáculo detectado. ' : ''}${online ? 'En línea.' : 'Sin conexión: última posición recibida.'} ` +
        'Arrastra para orbitar y usa la rueda para acercar.');
    },
    destruir() {
      destruida = true;
      cancelAnimationFrame(raf);
      observador.disconnect();
      lienzo.removeEventListener('casa:clima', alternarClima);
      lienzo.removeEventListener('casa:carro', llegarCarro);
      lienzo.removeEventListener('casa:carro-puerta', carroEnPuerta);
      controles.dispose();
      clima?.destruir();
      if (raiz) liberar(raiz);
      seguridad?.destruir();
      realismo?.destruir();
      acceso?.destruir();
      mecanica?.destruir();
      vegetacion?.destruir();
      render.dispose();
    },
  };
}
