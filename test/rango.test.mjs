import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangoDeCabecera } from '../src/comun/rango.mjs';

test('rangoDeCabecera interpreta Range: bytes=a-b, bytes=a- y bytes=-n sobre un total', () => {
  assert.deepEqual(rangoDeCabecera('bytes=0-99', 1000), { inicio: 0, fin: 99 });
  assert.deepEqual(rangoDeCabecera('bytes=500-', 1000), { inicio: 500, fin: 999 });
  assert.deepEqual(rangoDeCabecera('bytes=-100', 1000), { inicio: 900, fin: 999 });
  assert.deepEqual(rangoDeCabecera('bytes=0-5000', 1000), { inicio: 0, fin: 999 }); // se recorta al final
});

test('rangoDeCabecera devuelve null si no hay cabecera, no es de bytes o el rango no cabe', () => {
  assert.equal(rangoDeCabecera(null, 1000), null);
  assert.equal(rangoDeCabecera('', 1000), null);
  assert.equal(rangoDeCabecera('items=0-1', 1000), null);
  assert.equal(rangoDeCabecera('bytes=2000-3000', 1000), null);
  assert.equal(rangoDeCabecera('bytes=50-10', 1000), null);
  assert.equal(rangoDeCabecera('bytes=0-10,20-30', 1000), null); // varios rangos: no se admiten
});
