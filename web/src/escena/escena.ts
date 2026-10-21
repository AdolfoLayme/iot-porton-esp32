import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearMaqueta } from './maqueta';
import type { EstadoPorton } from '../estado/porton';
export function montarEscena(lienzo: HTMLCanvasElement): {actualizar(e: EstadoPorton,online: boolean): void;destruir(): void} {
  const render = new T.WebGLRenderer({canvas:lienzo,antialias:true,powerPreference:'high-performance'});
  render.setPixelRatio(Math.min(devicePixelRatio,2));render.outputColorSpace=T.SRGBColorSpace;
  render.toneMapping=T.ACESFilmicToneMapping;render.toneMappingExposure=1.25;
  const escena = new T.Scene();escena.background=new T.Color(getComputedStyle(document.documentElement).getPropertyValue('--panel2').trim()||'#18202b');
  const camara = new T.PerspectiveCamera(38,1,.1,80);camara.position.set(7,7,9);
  const controles = new OrbitControls(camara,lienzo);controles.target.set(0,.3,0);
  controles.enableDamping=true;controles.enablePan=false;controles.minDistance=6;controles.maxDistance=18;
  controles.minPolarAngle=.25;controles.maxPolarAngle=Math.PI*.47;controles.update();controles.saveState();
  escena.add(new T.HemisphereLight('#ffffff','#7f725d',2.8));
  const sol = new T.DirectionalLight('#fff2db',3);sol.position.set(-3,8,5);escena.add(sol);
  const maqueta = crearMaqueta(escena);
  let objetivo=0,angulo=0,anterior=performance.now(),raf=0,destruida=false,primerEstado=true;
  const reducir=matchMedia('(prefers-reduced-motion: reduce)');
  function redimensionar(){
    const r=lienzo.getBoundingClientRect();render.setSize(Math.max(1,r.width),Math.max(1,r.height),false);
    camara.aspect=r.width/Math.max(1,r.height);camara.updateProjectionMatrix();
  }
  const observador = new ResizeObserver(redimensionar);observador.observe(lienzo);redimensionar();
  function dibujar(ahora: number){
    if(destruida)return;const dt=Math.min((ahora-anterior)/1000,.1);anterior=ahora;
    angulo = reducir.matches ? objetivo : angulo+(objetivo-angulo)*(1-Math.exp(-dt/.15));
    maqueta.pivote.rotation.y=angulo;controles.update();
    if(!document.hidden)render.render(escena,camara);
    raf=requestAnimationFrame(dibujar);
  }
  raf=requestAnimationFrame(dibujar);
  // Teclado como alternativa a arrastrar la cámara: flechas y +/-.
  function teclado(e: KeyboardEvent){
    const paso=.5;
    if(e.key==='ArrowLeft')camara.position.x-=paso;
    else if(e.key==='ArrowRight')camara.position.x+=paso;
    else if(e.key==='ArrowUp')camara.position.y+=paso;
    else if(e.key==='ArrowDown')camara.position.y-=paso;
    else if(e.key==='+')camara.position.multiplyScalar(.95);
    else if(e.key==='-')camara.position.multiplyScalar(1.05);
    else if(e.key==='Home')controles.reset();else return;
    camara.position.y=Math.max(.6,Math.min(12,camara.position.y));
    const distancia=Math.hypot(camara.position.x,camara.position.y,camara.position.z);
    if(distancia<6||distancia>18)camara.position.multiplyScalar(Math.max(6,Math.min(18,distancia))/distancia);
    e.preventDefault();controles.update();
  }
  lienzo.addEventListener('keydown',teclado);
  return {
    actualizar(e,online){
      objetivo=e.pos/100*Math.PI/2;
      if(primerEstado){angulo=objetivo;primerEstado=false;}
      maqueta.obstaculo.visible=e.obstaculo;maqueta.hazMaterial.color.set(e.obstaculo?'#ff4b4b':'#39c6f4');
      maqueta.hazMaterial.opacity=online?.18:.06;
      for (const [i,encendida] of [online&&e.led.verde, online&&e.led.rojo].entries()) {
        maqueta.luces[i].emissiveIntensity=encendida?2.4:.05;
        maqueta.halos[i].intensity=encendida?1.6:0;
      }
      lienzo.setAttribute('aria-label',`Maqueta: ${e.pos} % de apertura. ${e.obstaculo?'Obstáculo presente. ':''}${online?'En línea.':'Sin conexión: última posición recibida.'} Usa las flechas para orbitar, más y menos para acercar, Inicio para restablecer.`);
    },
    destruir(){destruida=true;cancelAnimationFrame(raf);observador.disconnect();lienzo.removeEventListener('keydown',teclado);controles.dispose();maqueta.destruir();render.dispose();}
  };
}
