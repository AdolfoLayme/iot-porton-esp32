import { expect, test } from 'vitest';
import { interpretar } from '../src/voz/interpretar';
const casos: [string, string | null, number?][] = [
  ['abre el portón', 'abrir'], ['ábrelo', 'abrir'], ['abrí', 'abrir'], ['abrir', 'abrir'],
  ['cierra', 'cerrar'], ['ciérralo', 'cerrar'], ['cerrá la puerta', 'cerrar'], ['cerrar', 'cerrar'],
  ['para', 'parar'], ['detente', 'parar'], ['stop', 'parar'], ['alto', 'parar'],
  ['ábrelo a la mitad', 'ir', 50], ['abre un poco', 'ir', 25],
  ['abre al setenta por ciento', 'ir', 70], ['abre al 70 %', 'ir', 70],
  ['abre todo', 'abrir'], ['abre… no, cierra', 'cerrar'], ['hola qué tal', null], ['', null],
  ['ABRE EL PORTÓN', 'abrir'], ['abrilo al cincuenta por ciento', 'ir', 50],
  ['abrí al treinta y cinco por ciento', 'ir', 35], ['abre al cero por ciento', 'ir', 0],
  ['abre al cien por ciento', 'ir', 100], ['abre al veinticinco por ciento', 'ir', 25],
  ['cerralo', 'cerrar'], ['pará', 'parar'], ['detenelo', 'parar'],
  ['abre al 150 %', null], ['abre al -5 %', null], ['abre al 70.5 %', null],
  ['abre a la mitad, no, cierra', 'cerrar'], ['parar y abre', 'abrir'], ['abre y detente', 'parar'],
  ['preparado para salir', null], ['no abras', null], ['no cierres', null], ['no abrir', null],
  ['abre al noventa y nueve por ciento', 'ir', 99],
];
for (const [frase, orden, pct] of casos) test(`interpreta «${frase}»`, () => {
  const resultado = interpretar(frase);
  if (!orden) expect(resultado).toBeNull();
  else {
    expect(resultado).toMatchObject({orden, confirmar: orden !== 'parar', texto: frase});
    expect(resultado?.pct).toBe(pct);
  }
});
