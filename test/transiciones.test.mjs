import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transicionDe, estiloDeTransicion } from '../src/comun/transiciones.mjs';

test('R, ausente o null → sin transición', () => {
  assert.equal(transicionDe(null), null);
  assert.equal(transicionDe({ S: 'R', D: 1 }), null);
  assert.equal(transicionDe({}), null);
});
test('valores por defecto y acotados', () => {
  assert.deepEqual(transicionDe({ S: 'Fade' }), { tipo: 'Fade', duracion: 1, dimension: 'H', movimiento: 'I', direccion: 0 });
  assert.equal(transicionDe({ S: 'Wipe', D: -3 }).duracion, 1);
  assert.equal(transicionDe({ S: 'Wipe', D: 99 }).duracion, 1);
  assert.equal(transicionDe({ S: 'Wipe', D: 2.5, Di: 90 }).direccion, 90);
  assert.equal(transicionDe({ S: 'Loquesea' }).tipo, 'Fade');
  assert.deepEqual(transicionDe({ S: 'Split', Dm: 'V', M: 'O' }), { tipo: 'Split', duracion: 1, dimension: 'V', movimiento: 'O', direccion: 0 });
});
test('estilo', () => {
  assert.deepEqual(estiloDeTransicion({ tipo: 'Wipe', duracion: 0.5, dimension: 'H', movimiento: 'I', direccion: 90 }),
    { clase: 'liberadopdf-trans-wipe', duracionMs: 500 });
});
