import '@fontsource-variable/sora/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../estilos/base.css';
import '../estilos/demo.css';
import {crearConexion} from '../red/conexion';
import {credencialAbierta, credencialVisor} from '../red/modos';
import {pintarEstado,type EstadoPorton} from '../estado/porton';
import {montarEscena} from '../escena/escena';
import {elemento,texto,temaInicial} from '../app/dom';
import {crearRecorrido} from './recorrido';
import {montarMedidor} from './medidor';
import {haySesion, modoSeguro, pedirLlave} from '../red/sesion';
temaInicial();
const conexion=crearConexion(), segundo=crearConexion(), camino=crearRecorrido();
let estado: EstadoPorton|null=null,online=false,listoB=false;
let escena:ReturnType<typeof montarEscena>|null=null;
const medidor=montarMedidor(elemento<SVGSVGElement & HTMLElement>('medidor'));
const lienzo=elemento<HTMLCanvasElement>('escena');
try {escena=montarEscena(lienzo);}
catch {
  lienzo.hidden=true;elemento('respaldo').hidden=false;
  // Copia del SVG anterior; dashboard/ se mantiene intacto.
  void fetch('/respaldo.svg').then(r=>r.text()).then(s=>{
    const svg=new DOMParser().parseFromString(s,'image/svg+xml').documentElement;
    elemento('respaldo-plano').replaceChildren(...Array.from(svg.childNodes));pintar();
  }).catch(()=>texto('estado-expo','No se pudo cargar el respaldo. Usa la app de control.'));
}
function pintar(){
  texto('estado-expo',pintarEstado(estado,online).titulo);
  if(estado){
    escena?.actualizar(estado,online);medidor.actualizar(estado.pos,online&&estado.pos!==estado.objetivo);texto('expo-pos',`${estado.pos} %`);texto('expo-dist',`${estado.dist} cm`);
    document.querySelector('#respaldo-plano #hoja')?.setAttribute('transform',`rotate(${-estado.pos*.9} 120 210)`);
    document.querySelector('#respaldo-plano #obst')?.setAttribute('opacity',estado.obstaculo?'1':'0');
    // DESACTIVADO 2026-10-21: texto guía de aviso-posicion.
  }
  elemento<HTMLButtonElement>('probar-b').disabled=!(online&&estado&&listoB);
}
conexion.alEstado(e=>{estado=e;pintar();});
conexion.alOnline(b=>{online=b;pintar();});
conexion.alEvento(e=>{
  camino.evento(conexion.latencia());
  if(e.usuario==='usuario-b')texto('resultado-b',`Usuario B · ${e.resultado}: ${e.motivo}`);
});
conexion.alLatencia(n=>texto('expo-rtt',n===null?'— ms':`${n} ms`));
segundo.alBroker(b=>{listoB=b;pintar();});
// Modo seguro: la demo usa la misma sesión que la app del marco (mismo origen). El botón "Usuario B" se reemplaza
// por un segundo celular real con su propia cuenta.
async function iniciarSeguro(){
  // Sin sesión se conecta sola con la llave de solo lectura (2026-10-21).
  if(!await haySesion().catch(()=>false)){const v=credencialVisor();if(v)await conexion.conectar(v).catch(()=>texto('estado-expo','Sin conexión'));return;}
  try{await conexion.conectar(await pedirLlave());}
  catch(e){texto('estado-expo',e instanceof Error?e.message:'No se pudo conectar.');}
}
function iniciar(){
  if(modoSeguro){void iniciarSeguro();return;}
  try {
    void conexion.conectar(credencialAbierta('admin')).catch(()=>texto('estado-expo','Broker sin conexión. Reintentando…'));
    void segundo.conectar(credencialAbierta('usuario-b')).catch(()=>texto('resultado-b','No se pudo conectar Usuario B. Reintentando…'));
  }catch{texto('resultado-b','En modo seguro, usa un segundo celular con su propia sesión.');}
}
iniciar();
elemento('probar-b').onclick=()=>{
  if(!online||!estado)return;
  try {
    const orden=estado.objetivo>estado.pos||estado.pos>=50?'cerrar':'abrir';
    segundo.mandar(orden);camino.orden();texto('resultado-b',`Usuario B envió «${orden}». Esperando la decisión…`);
  }catch{texto('resultado-b','Usuario B perdió la conexión. Espera a que vuelva el broker.');}
};
window.addEventListener('message',e=>{
  const marco=elemento<HTMLIFrameElement>('app-expo');
  if(e.origin!==location.origin||e.source!==marco.contentWindow||!e.data||typeof e.data!=='object')return;
  if(e.data.tipo==='porton-orden')camino.orden();
  if(e.data.tipo==='porton-sesion'&&modoSeguro&&!online)void iniciarSeguro();
});
window.addEventListener('pagehide',()=>{conexion.cerrar();segundo.cerrar();escena?.destruir();camino.destruir();});
