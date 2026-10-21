import { expect, test } from 'vitest';
import { pintarEstado, leerEstado, leerEvento, type EstadoPorton } from '../src/estado/porton';
const e: EstadoPorton = {pos: 100, objetivo: 100, estado: 'abierto', dist: 80, obstaculo: false,
  turno: null, led: {verde: true, rojo: false}};
test('online=0 domina al estado retenido abierto', () => {
  expect(pintarEstado(e, false)).toMatchObject({tono: 'apagado', titulo: expect.stringContaining('sin conexión')});
});
test('espera telemetría antes de afirmar posición', () => {
  expect(pintarEstado(null, true).titulo).toContain('Esperando');
});
test('identifica al dueño del movimiento', () => {
  expect(pintarEstado({...e, estado: 'abriendo', turno: {id: 'a', nombre: 'Ana'}}, true).detalle).toContain('Ana está abriendo');
});
test('obstáculo es una alerta', () => {
  expect(pintarEstado({...e, obstaculo: true}, true).tono).toBe('alerta');
});
test('valida telemetría completa y rangos', () => {
  expect(leerEstado(JSON.stringify(e))).toEqual(e);
  for (const dato of ['null', '{}', '{', JSON.stringify({...e, pos: 200}), JSON.stringify({...e, dist: '20'})])
    expect(leerEstado(dato)).toBeNull();
});
test('rechaza eventos malformados sin interrumpir la sesión', () => {
  expect(leerEvento('{}')).toBeNull();
  expect(leerEvento('{')).toBeNull();
  expect(leerEvento(JSON.stringify({ts: 1200, usuario: 'a', orden: 'abrir', resultado: 'aceptada', motivo: 'aceptada'}))?.usuario).toBe('a');
});

import { renovarAntesDe } from '../src/red/sesion';
test('la llave se renueva 5 min antes de vencer', () => { expect(renovarAntesDe(1_000_000 + 3_600_000, 300_000, 1_000_000)).toBe(3_300_000); });
test('una llave por vencer se renueva de inmediato (nunca negativo)', () => { expect(renovarAntesDe(1_000_000 + 60_000, 300_000, 1_000_000)).toBe(0); });
