// Comprende una orden de voz libre ("déjalo entreabierto", audio de iPhone…) con Gemini y la devuelve
// como orden del portón. NO manda nada al portón: la app la envía con su propia llave (identidad por tema).
import { json, miembroDe, preflight } from '../_compartido/comun.ts';

const MODELOS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const SISTEMA = `Eres el asistente de voz de un portón automático en Perú. Si el usuario pide mover el portón,
llama a mover_porton. "abre/ábrelo" = abrir; "cierra" = cerrar; "para/detente/alto" = parar;
un porcentaje o "a la mitad/un poco/entreabierto" = ir con porcentaje (mitad 50, un poco 25, entreabierto 20).
Si no es una orden del portón, no llames a la función y responde en una frase corta en español.`;
const HERRAMIENTA = {
  functionDeclarations: [{
    name: 'mover_porton',
    description: 'Mueve el portón automático.',
    parameters: {
      type: 'OBJECT',
      properties: {
        accion: { type: 'STRING', enum: ['abrir', 'cerrar', 'parar', 'ir'] },
        porcentaje: { type: 'INTEGER', description: 'Apertura 0-100, solo con accion=ir' },
      },
      required: ['accion'],
    },
  }],
};

type Parte = { text?: string; functionCall?: { name: string; args: { accion?: string; porcentaje?: number } } };

/** Traduce la llamada del modelo a la orden MQTT, validando rangos (nunca se confía en el modelo). */
export function aOrden(args: { accion?: string; porcentaje?: number }): string | null {
  if (args.accion === 'abrir' || args.accion === 'cerrar' || args.accion === 'parar') return args.accion;
  if (args.accion === 'ir' && Number.isFinite(args.porcentaje)) return `pos:${Math.max(0, Math.min(100, Math.round(args.porcentaje!)))}`;
  return null;
}

async function preguntar(modelo: string, partes: unknown[]): Promise<Parte[]> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SISTEMA }] },
      contents: [{ role: 'user', parts: partes }],
      tools: [HERRAMIENTA],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!r.ok) throw new Error(`gemini ${modelo} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts ?? [];
}

Deno.serve(async req => {
  const p = preflight(req); if (p) return p;
  if (!await miembroDe(req)) return json({ error: 'No eres miembro activo del portón.' }, 403);
  let cuerpo: { texto?: string; audio?: string; mime?: string };
  try { cuerpo = await req.json(); } catch { return json({ error: 'JSON inválido' }, 400); }
  const texto = cuerpo.texto?.slice(0, 300);
  if (!texto && !(cuerpo.audio && cuerpo.audio.length < 2_000_000)) return json({ error: 'Falta texto o audio (máx. ~1,5 MB).' }, 400);
  const partes = texto ? [{ text: texto }] : [{ inlineData: { mimeType: cuerpo.mime ?? 'audio/webm', data: cuerpo.audio } }, { text: 'Orden de voz del usuario.' }];
  for (const modelo of MODELOS) {
    try {
      const resp = await preguntar(modelo, partes);
      const llamada = resp.find(x => x.functionCall?.name === 'mover_porton')?.functionCall;
      const orden = llamada ? aOrden(llamada.args) : null;
      return json({ orden, respuesta: orden ? null : resp.find(x => x.text)?.text?.trim() ?? 'No entendí una orden para el portón.', modelo });
    } catch (e) { console.error(e); }
  }
  return json({ error: 'El asistente de voz no está disponible ahora. Usa los botones.' }, 502);
});
