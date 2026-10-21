export type OrdenVoz = {
  orden: 'abrir' | 'cerrar' | 'parar' | 'ir';
  pct?: number;
  confirmar: boolean;
  texto: string;
};

const unidades = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
const decenas = ['veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
function numero(texto: string): number | null {
  const numeros = new Map<string, number>([['cien', 100], ['ciento', 100]]);
  unidades.forEach((u, n) => numeros.set(u, n));
  especiales.forEach((u, n) => numeros.set(u, n + 10));
  decenas.forEach((d, n) => {
    const valor = (n + 2) * 10;
    numeros.set(d, valor);
    unidades.slice(1).forEach((u, i) => numeros.set(n === 0 ? `veinti${u}` : `${d} y ${u}`, valor + i + 1));
  });
  const literal = texto.trim().replace(/^(?:a|al)\s+/, '').replace(/^(?:el|un)\s+/, '').trim();
  if (/^-?\d+(?:[.,]\d+)?$/.test(literal)) return Number(literal.replace(',', '.'));
  return numeros.get(literal) ?? null;
}

export function interpretar(frase: string): OrdenVoz | null {
  const texto = frase.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const patron = /\b(abre|abrelo|abri|abrilo|abrir|abras|cierra|cierralo|cerra|cerralo|cerrar|cierres|para|parar|parate|detente|detenelo|detener|stop|alto)\b/g;
  const coincidencias = [...texto.matchAll(patron)];
  // «para» como preposición no es una orden. La negación tampoco mueve el portón.
  const ultima = coincidencias.at(-1);
  if (!ultima || /\bno\s*$/.test(texto.slice(0, ultima.index))) return null;
  const verbo = ultima[0];
  const resto = texto.slice(ultima.index + verbo.length).trim();
  if (verbo === 'para' && resto && !/^(?:el porton|la puerta|ya|por favor)[.!?]*$/.test(resto)) return null;
  let orden: OrdenVoz['orden'] = /^(para|det|stop|alto)/.test(verbo) ? 'parar' : /^(cie|cerr)/.test(verbo) ? 'cerrar' : 'abrir';
  let pct: number | undefined;
  if (orden !== 'parar') {
    if (/\bmitad\b/.test(resto)) pct = 50;
    else if (/\bun poco\b/.test(resto)) pct = 25;
    else {
      const porcentaje = resto.match(/(?:a|al)\s+(.+?)\s*(?:por ciento|%)/);
      if (porcentaje) {
        const n = numero(porcentaje[1]);
        if (n === null || !Number.isInteger(n) || n < 0 || n > 100) return null;
        pct = n;
      }
    }
    if (pct !== undefined) orden = 'ir';
  }
  return { orden, ...(pct === undefined ? {} : { pct }), confirmar: orden !== 'parar', texto: frase };
}
