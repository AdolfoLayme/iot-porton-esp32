import * as T from 'three';
import { cargarHdr } from './cargar';

export type MaterialesClima = {
  ventanas: T.MeshStandardMaterial[];
  farola: T.MeshStandardMaterial[];
  baliza: T.MeshStandardMaterial | null;
  balizaLuz?: T.PointLight | null;
  cochera: T.MeshStandardMaterial | null;
};

export type Clima = {
  alternar(): boolean;
  esNoche(): boolean;
  lucesCochera(encendida: boolean): void;
  parpadearBaliza(moviendose: boolean, tiempo: number, abierto?: boolean): void;
  destruir(): void;
};

type EscenaConFondo = { background: unknown };

/** Fondo de cielo: el tipo declarado de Scene solo admite Color, así que se amplía aquí. */
function ponerFondo(escena: T.Scene, textura: T.Texture | null): void {
  (escena as unknown as EscenaConFondo).background = textura;
}

export function crearClima(
  escena: T.Scene,
  sol: T.DirectionalLight,
  ambiente: T.HemisphereLight,
  materiales: MaterialesClima,
): Clima {
  const nocheFog = new T.Fog('#0a1018', 30, 108);
  const diaFog = new T.Fog('#d7dfe4', 36, 122);
  const luzFarola = new T.PointLight('#ffd2a0', 0, 26, 2);
  luzFarola.position.set(7.6, 4.45, -11.15);
  const luzCochera = new T.PointLight('#ffd9a8', 0, 13, 2);
  luzCochera.position.set(-3, 2.65, -0.15);
  escena.add(luzFarola, luzCochera);

  let noche = false;
  let hdriDia: T.Texture | null = null;
  let hdriNoche: T.Texture | null = null;
  let pedidoNoche = false;
  let cocheraEncendida = false;

  function aplicar(): void {
    const hdri = noche ? hdriNoche : hdriDia;
    escena.environment = hdri;
    if (hdri) ponerFondo(escena, hdri);
    escena.fog = noche ? nocheFog : diaFog;
    sol.intensity = noche ? 0.18 : 2.6;
    sol.castShadow = !noche;
    ambiente.intensity = noche ? 0.32 : 0.55;
    luzFarola.intensity = noche ? 110 : 0;
    for (const m of materiales.farola) {
      m.emissive.set('#ffd9a0');
      m.emissiveIntensity = noche ? 4 : 0;
    }
    for (const m of materiales.ventanas) {
      m.emissive.set('#ffcf8a');
      m.emissiveIntensity = noche ? 2.4 : 0;
    }
    if (materiales.baliza) {
      materiales.baliza.emissiveIntensity = 0;
    }
    lucesCochera(cocheraEncendida);
  }

  function lucesCochera(encendida: boolean): void {
    cocheraEncendida = encendida;
    luzCochera.intensity = encendida ? 36 : 0;
    if (materiales.cochera) materiales.cochera.emissiveIntensity = encendida ? 3 : 0;
  }

  // DESACTIVADO 2026-10-20: baliza ámbar. Pedido de Adolfo: solo rojo y verde, en la misma baliza.
  // Roja parpadeando = en movimiento; verde fija = abierto; apagada = cerrado.
  function parpadearBaliza(moviendose: boolean, tiempo: number, abierto = false): void {
    const baliza = materiales.baliza;
    if (!baliza) return;
    const color = moviendose ? '#ff3b30' : abierto ? '#22d35f' : '#3a3a3a';
    baliza.color.set(color); baliza.emissive.set(color);
    baliza.emissiveIntensity = moviendose ? (Math.sin(tiempo * 11) > 0 ? 6 : 0.15) : abierto ? 3 : 0;
    if (materiales.balizaLuz) { materiales.balizaLuz.color.set(color); materiales.balizaLuz.intensity = baliza.emissiveIntensity > 1 ? 3 : 0; }
  }

  void cargarHdr('/casa/hdri/dia.hdr').then(textura => {
    hdriDia = textura;
    if (!noche) aplicar();
  }).catch(() => { /* Sin HDRI queda el color de fondo y la luz de relleno. */ });

  return {
    alternar() {
      noche = !noche;
      aplicar();
      if (noche && !hdriNoche && !pedidoNoche) {
        pedidoNoche = true;
        void cargarHdr('/casa/hdri/noche.hdr').then(textura => {
          hdriNoche = textura;
          if (noche) aplicar();
        }).catch(() => { /* De noche queda el cielo diurno ya cargado. */ });
      }
      return noche;
    },
    esNoche: () => noche,
    lucesCochera,
    parpadearBaliza,
    destruir() {
      hdriDia?.dispose();
      hdriNoche?.dispose();
      escena.remove(luzFarola);
      escena.remove(luzCochera);
    },
  };
}
