// Voz "tipo Alexa": reconocimiento de Google (Web Speech) + reglas locales; lo que las reglas no entienden lo
// interpreta Gemini (función `voz`). En iPhone, donde Web Speech no funciona en la app instalada, se graba audio.
import { interpretar } from './interpretar';
import { elemento, texto } from '../app/dom';
import { entenderVoz, modoSeguro } from '../red/sesion';
type ResultadoVoz = { results: ArrayLike<ArrayLike<{transcript: string}>> };
interface Reconocimiento {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: ResultadoVoz) => void) | null;
  onerror: ((e: {error: string}) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
}
type ConstructorVoz = new () => Reconocimiento;
const GRABACION_MS = 4000;
const etiqueta = (orden: string) => orden.startsWith('pos:') ? `abrir a ${orden.slice(4)} %` : orden;

/** Responde en voz alta con la mejor voz en español disponible (es-PE → es-419 → es-*). */
function hablar(frase: string) {
  if (!('speechSynthesis' in window)) return;
  const voces = speechSynthesis.getVoices();
  const voz = ['es-PE', 'es-419', 'es-US', 'es-MX'].map(l => voces.find(v => v.lang === l)).find(Boolean) ?? voces.find(v => v.lang.startsWith('es'));
  const u = new SpeechSynthesisUtterance(frase); u.lang = voz?.lang ?? 'es-PE'; if (voz) u.voice = voz;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

export function montarMicrofono(enviar: (orden: string) => void) {
  const navegador = window as Window & {SpeechRecognition?: ConstructorVoz; webkitSpeechRecognition?: ConstructorVoz};
  const Reconocer = navegador.SpeechRecognition || navegador.webkitSpeechRecognition;
  const puedeGrabar = modoSeguro && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
  const boton = elemento<HTMLButtonElement>('microfono'), confirmar = elemento<HTMLButtonElement>('confirmar-voz');
  const cancelar = elemento<HTMLButtonElement>('cancelar-voz');
  if (!Reconocer && !puedeGrabar) {
    texto('voz-ayuda', 'La voz no está disponible en este navegador.');
    return () => {};
  }
  let pendiente: string | null = null, idiomaAlterno = false, grabadora: MediaRecorder | null = null;
  const escuchando = (si: boolean) => { boton.dataset.escuchando = String(si); boton.setAttribute('aria-label', si ? 'Escuchando, toca para terminar' : 'Hablar'); };
  const limpiar = () => { pendiente = null; confirmar.hidden = true; cancelar.hidden = true; };
  boton.hidden = false;
  // DESACTIVADO 2026-10-21: texto de ayuda «Habla como con Alexa…» (Adolfo: basta con el ícono del micrófono).

  /** Orden ya entendida: PARAR se envía al instante; lo demás espera confirmación. */
  function proponer(orden: string | null, oido: string, respuesta?: string | null) {
    if (!orden) { const r = respuesta ?? `No entendí una orden en «${oido}».`; texto('transcripcion', r); hablar(r); return; }
    if (orden === 'parar') { enviar('parar'); limpiar(); hablar('Parando.'); return; }
    // Envío directo, como Alexa (2026-10-21, pedido de Adolfo). DESACTIVADO: paso de «Enviar / Cancelar».
    enviar(orden); limpiar(); texto('transcripcion', `«${oido}» → ${etiqueta(orden)}`); hablar(`Listo, ${etiqueta(orden)}.`);
  }
  async function conIA(cuerpo: Parameters<typeof entenderVoz>[0], oido: string) {
    texto('transcripcion', 'Pensando…');
    try { const r = await entenderVoz(cuerpo); proponer(r.orden, oido, r.respuesta); }
    catch (e) { texto('transcripcion', e instanceof Error ? e.message : 'No se pudo entender la orden.'); }
  }

  // Camino 1: Web Speech (Chrome/Android). Reglas primero: sin red ni cuota para órdenes simples.
  const r = Reconocer ? new Reconocer() : null;
  if (r) {
    r.lang = 'es-PE'; r.interimResults = false; r.continuous = false;
    r.onresult = e => {
      const frase = e.results[0]?.[0]?.transcript ?? '';
      const local = interpretar(frase);
      if (local) proponer(local.orden === 'ir' ? `pos:${local.pct}` : local.orden, frase);
      else if (modoSeguro) void conIA({texto: frase}, frase);
      else proponer(null, frase);
    };
    r.onerror = e => {
      limpiar();
      if (e.error === 'language-not-supported' && !idiomaAlterno) {
        idiomaAlterno = true; r.lang = 'es-ES'; texto('transcripcion', 'Prueba de nuevo; usaremos español de España.');
      } else texto('transcripcion', e.error === 'not-allowed' ? 'El micrófono no tiene permiso. Puedes usar los controles.' : 'No se pudo reconocer la voz. Prueba de nuevo o usa los controles.');
    };
    r.onend = () => { boton.disabled = false; escuchando(false); };
  }

  // Camino 2: grabar audio y que Gemini lo entienda directamente (iPhone y navegadores sin Web Speech).
  async function grabar() {
    const flujo = await navigator.mediaDevices.getUserMedia({audio: true});
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'].find(m => MediaRecorder.isTypeSupported(m)) ?? '';
    grabadora = new MediaRecorder(flujo, mime ? {mimeType: mime} : undefined);
    const trozos: Blob[] = [];
    grabadora.ondataavailable = e => trozos.push(e.data);
    grabadora.onstop = async () => {
      flujo.getTracks().forEach(t => t.stop()); boton.disabled = false; escuchando(false);
      const blob = new Blob(trozos, {type: grabadora?.mimeType || 'audio/webm'}); grabadora = null;
      // FileReader evita desbordar la pila con audios largos (fromCharCode(...bytes) falla con >100 KB).
      const base64 = await new Promise<string>(ok => { const f = new FileReader(); f.onload = () => ok(String(f.result).split(',')[1] ?? ''); f.readAsDataURL(blob); });
      await conIA({audio: base64, mime: blob.type.split(';')[0]}, 'tu mensaje de voz');
    };
    grabadora.start(); escuchando(true);
    setTimeout(() => grabadora?.state === 'recording' && grabadora.stop(), GRABACION_MS);
  }

  boton.onclick = () => {
    if (grabadora?.state === 'recording') { grabadora.stop(); return; }
    limpiar(); texto('transcripcion', 'Escuchando…');
    if (r) { try { r.start(); boton.disabled = true; escuchando(true); } catch { texto('transcripcion', 'El micrófono ya está escuchando.'); } }
    else void grabar().catch(() => texto('transcripcion', 'El micrófono no tiene permiso. Puedes usar los controles.'));
  };
  confirmar.onclick = () => { if (pendiente) { enviar(pendiente); hablar(`Listo, ${etiqueta(pendiente)}.`); } limpiar(); };
  cancelar.onclick = () => { limpiar(); texto('transcripcion', 'Orden cancelada.'); boton.focus(); };
  return () => { limpiar(); r?.abort(); if (grabadora?.state === 'recording') grabadora.stop(); };
}
