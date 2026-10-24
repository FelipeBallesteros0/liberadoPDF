import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarRangos, dividirCada, formatearRangos } from '../src/comun/herramientas/rangos.mjs';

test('rangos válidos', () => {
  assert.deepEqual(analizarRangos('1-3, 5, 8-', 10), { paginas: [1, 2, 3, 5, 8, 9, 10] });
  assert.deepEqual(analizarRangos('', 4), { paginas: [1, 2, 3, 4] });
  assert.deepEqual(analizarRangos('3,1,3', 4), { paginas: [1, 3] });
});
test('rangos inválidos', () => {
  assert.equal(analizarRangos('0', 4).error, 'Página fuera del documento: 0');
  assert.equal(analizarRangos('1-999', 4).error, 'Página fuera del documento: 999');
  assert.equal(analizarRangos('5-2', 10).error, 'Rango inválido: 5-2');
  assert.equal(analizarRangos('a', 4).error, 'No entiendo: a');
  assert.equal(analizarRangos(',', 4).error, 'Rango vacío');
});
test('dividirCada y formatearRangos', () => {
  assert.deepEqual(dividirCada(7, 3), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.equal(formatearRangos([1, 2, 3, 5, 8, 9]), '1-3,5,8-9');
});

test('dos números sin guion («1 3») es un error, no una página suelta', () => {
  assert.match(analizarRangos('1 3', 10).error, /No entiendo/);
  assert.match(analizarRangos('1 3 5', 10).error, /No entiendo/);
});
