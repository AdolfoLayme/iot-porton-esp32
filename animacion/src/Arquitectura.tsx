// Arquitectura completa del portón en un solo cuadro. Bucle de 13 s: primero una orden con el botón de la app
// y luego la misma orden por voz, para mostrar que desde el celular el camino es idéntico.
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {ACENTO, activo, Caja, GRIS, Linea, MONO, NEGRO, Paquete, TEXTO, TITULO, type Punto} from './piezas';

const VOZ = 240;               // recorrido completo con voz (8 s)
const INICIO_BOTON = 80;       // con el botón el recorrido empieza en la publicación MQTT
const BOTON = VOZ - INICIO_BOTON;
export const CUADROS = BOTON + VOZ;

// Puntos de anclaje en los bordes de las cajas (x, y).
const P = {
  celular: [400, 300] as Punto, celularLogin: [400, 420] as Punto, casa: [400, 700] as Punto, casaVercel: [400, 790] as Punto,
  vercel: [470, 790] as Punto, supabase: [800, 740] as Punto, supabaseVoz: [1080, 830] as Punto, gemini: [1180, 830] as Punto,
  flespiApp: [700, 330] as Punto, flespiCasa: [700, 560] as Punto, flespiEsp: [1100, 520] as Punto, esp: [1450, 520] as Punto,
  llaveA: [870, 740] as Punto, llaveB: [870, 640] as Punto, hookA: [1000, 640] as Punto, hookB: [1000, 740] as Punto,
};

// Qué se está explicando en cada tramo del bucle.
const PASOS: [number, string][] = [
  [0, 'El usuario dice «ábrelo»: el audio va a la función voz de Supabase'],
  [24, 'Gemini entiende la frase y la convierte en la orden «abrir»'],
  [56, 'La orden vuelve a la app, ya validada'],
  [80, 'La app publica ABRIR en su canal porton/cmd/<usuario>'],
  [110, 'flespi entrega la orden al ESP32 por un canal cifrado (TLS)'],
  [128, 'El ESP32 aplica las reglas (PARAR, obstáculo, turno) y mueve el servo'],
  [165, 'El ESP32 publica el nuevo estado del portón'],
  [183, 'La app, la casa 3D y el historial se actualizan al instante'],
];

export function Arquitectura() {
  const v = useCurrentFrame();
  const conVoz = v >= BOTON;
  // f = cuadro dentro de la línea de tiempo de la voz; la vuelta con botón usa solo su tramo final.
  const f = conVoz ? v - BOTON : v + INICIO_BOTON;
  const pasos = conVoz ? PASOS : PASOS.filter(([d]) => d >= INICIO_BOTON);
  const paso = pasos.filter(([d]) => f >= d).length;
  const [, fraseBase] = pasos[paso - 1];
  const frase = !conVoz && paso === 1 ? 'El usuario pulsa ABRIR en la app: la orden sale por porton/cmd/<usuario>' : fraseBase;
  const zona = (x: number, texto: string) => (
    <div style={{position: 'absolute', left: x, top: 108, fontFamily: MONO, fontSize: 18, color: GRIS, letterSpacing: 2}}>{texto}</div>
  );
  return (
    <AbsoluteFill style={{background: '#fff'}}>
      <div style={{position: 'absolute', left: 70, top: 28, fontFamily: TITULO, fontSize: 64, color: NEGRO}}>ARQUITECTURA DEL SISTEMA</div>
      <div style={{position: 'absolute', right: 70, top: 52, fontFamily: TEXTO, fontSize: 22, color: GRIS}}>Portón IoT · ESP32 + MQTT</div>
      {zona(70, 'USUARIOS')}{zona(700, 'NUBE')}{zona(1450, 'DISPOSITIVO · WOKWI')}
      <Img src={staticFile('logos/wokwi.svg')} style={{position: 'absolute', left: 1712, top: 100, height: 30}} />
      <Img src={staticFile('logos/mqtt.svg')} style={{position: 'absolute', left: 770, top: 104, height: 26}} />

      {/* Conexiones: continuas = datos en vivo por MQTT; punteadas = configuración y servicios. */}
      <Linea a={P.celular} b={P.flespiApp} etiqueta="WSS · 443" />
      <Linea a={P.casa} b={P.flespiCasa} etiqueta="WSS · 443" lado={1} />
      <Linea a={P.flespiEsp} b={P.esp} etiqueta="MQTTS · 8883 (TLS)" />
      <Linea a={P.vercel} b={P.casaVercel} punteada />
      <Linea a={P.celularLogin} b={P.supabase} etiqueta="login · llave 1 h · voz" punteada en={0.2} lado={1} />
      <Linea a={P.supabaseVoz} b={P.gemini} punteada />
      <Linea a={P.llaveA} b={P.llaveB} punteada />
      <Linea a={P.hookA} b={P.hookB} punteada />
      <div style={{position: 'absolute', left: 752, top: 676, fontFamily: MONO, fontSize: 16}}>crea llave</div>
      <div style={{position: 'absolute', left: 1012, top: 676, fontFamily: MONO, fontSize: 16}}>webhook</div>
      <Linea a={[1555, 360]} b={[1555, 310]} /><Linea a={[1765, 360]} b={[1765, 310]} />
      <Linea a={[1555, 700]} b={[1555, 750]} /><Linea a={[1765, 700]} b={[1765, 750]} />

      <Caja x={70} y={150} w={330} h={330} titulo="Celular · App" logo="logos/pwa.svg" logoAlto={30} resaltar={activo(f, 0, 8) || activo(f, 74, 90) || activo(f, 206, 240)}
        lineas={['Abrir, cerrar y parar', 'Apertura parcial', 'Control por voz', 'Historial y miembros']} />
      <Caja x={70} y={560} w={330} h={270} titulo="Casa 3D" logo="logos/threedotjs.svg" resaltar={activo(f, 206, 240)}
        lineas={['Refleja el portón en vivo', 'Llave de solo lectura', 'Avisa si el carro corta el haz']} />
      <Caja x={470} y={740} w={260} h={190} titulo="Vercel" logo="logos/vercel.svg" logoAlto={32} lineas={['Publica la app', 'y la casa 3D']} />
      <Caja x={780} y={740} w={300} h={190} titulo="Supabase" logo="logos/supabase.svg" resaltar={activo(f, 20, 30) || activo(f, 52, 60) || activo(f, 202, 222)}
        lineas={['Cuentas · llave MQTT 1 h', 'Miembros e historial', 'Base de datos con RLS']} />
      <Caja x={1180} y={740} w={220} h={190} titulo="Gemini" logo="logos/gemini.svg" resaltar={activo(f, 22, 56)} lineas={['Entiende la voz', 'y la vuelve orden']} />
      <Caja x={700} y={200} w={400} h={440} titulo="Broker MQTT" logo="logos/flespi.svg" logoAlto={34} resaltar={activo(f, 108, 116) || activo(f, 181, 189)}>
        {['porton/cmd/<usuario>', 'porton/estado', 'porton/evento', 'porton/online', 'porton/entorno'].map(t => (
          <div key={t} style={{fontFamily: MONO, fontSize: 18, color: NEGRO, borderBottom: `2px solid ${NEGRO}`, padding: '6px 0'}}>{t}</div>
        ))}
        <div style={{fontFamily: TEXTO, fontSize: 18, color: NEGRO, marginTop: 8}}>Cada usuario solo escribe en su propio canal</div>
      </Caja>
      <Caja x={1450} y={360} w={420} h={340} titulo="ESP32 DevKitC V4" img="esp32h.png" imgAlto={150} logo="logos/espressif.svg" resaltar={activo(f, 126, 166)}
        lineas={['Núcleo 0: WiFi + TLS + MQTT', 'Núcleo 1: reglas y control']} />
      <Caja x={1450} y={130} w={205} h={180} titulo="HC-SR04" tam={28} img="hcsr04.png" imgAlto={62} lineas={['TRIG 5 · ECHO 19']} />
      <Caja x={1665} y={130} w={205} h={180} titulo="Servo SG90" tam={28} img="sg90.png" imgAlto={62} lineas={['PWM · GPIO 18']}
        resaltar={activo(f, 135, 166)} />
      <Caja x={1450} y={750} w={205} h={180} titulo="LCD 16x2" tam={28} img="lcd.png" imgAlto={56} lineas={['I2C · 21 / 22']} />
      <Caja x={1665} y={750} w={205} h={180} titulo="Botones · LEDs" tam={28} lineas={['Botones 32·33·25', 'LEDs 27 · 26']} />

      <Paquete f={f} a={P.celularLogin} b={P.supabase} desde={0} hasta={24} texto="audio" />
      <Paquete f={f} a={P.supabaseVoz} b={P.gemini} desde={24} hasta={40} texto="audio" />
      <Paquete f={f} a={P.gemini} b={P.supabaseVoz} desde={40} hasta={56} texto="abrir" />
      <Paquete f={f} a={P.supabase} b={P.celularLogin} desde={56} hasta={80} texto="abrir" />
      <Paquete f={f} a={P.celular} b={P.flespiApp} desde={80} hasta={110} texto="abrir" />
      <Paquete f={f} a={P.flespiEsp} b={P.esp} desde={110} hasta={128} texto="abrir" />
      <Paquete f={f} a={P.esp} b={P.flespiEsp} desde={165} hasta={183} texto="estado" />
      <Paquete f={f} a={P.flespiApp} b={P.celular} desde={183} hasta={208} texto="estado" />
      <Paquete f={f} a={P.flespiCasa} b={P.casa} desde={183} hasta={208} texto="estado" />
      <Paquete f={f} a={P.hookA} b={P.hookB} desde={183} hasta={204} texto="evento" />

      <div style={{position: 'absolute', left: 70, top: 968, right: 70, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{fontFamily: TITULO, fontSize: 30, background: NEGRO, color: '#fff', padding: '4px 14px', letterSpacing: 1}}>{conVoz ? 'CON VOZ' : 'CON BOTÓN'}</div>
        <div style={{fontFamily: TITULO, fontSize: 40, background: ACENTO, border: `4px solid ${NEGRO}`, padding: '0 16px', color: NEGRO}}>{paso}</div>
        <div style={{fontFamily: TEXTO, fontSize: 30, fontWeight: 600, color: NEGRO}}>{frase}</div>
      </div>
    </AbsoluteFill>
  );
}
