import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cajaVisible } from '../src/comun/herramientas/caja.mjs';

test('cajaVisible: sin CropBox es el MediaBox; con CropBox es la intersección con el MediaBox', () => {
  const media = { x: 0, y: 0, width: 600, height: 800 };
  assert.deepEqual(cajaVisible({ mediaBox: media }), { x: 0, y: 0, ancho: 600, alto: 800 });
  assert.deepEqual(cajaVisible({ mediaBox: media, cropBox: { x: 50, y: 60, width: 500, height: 700 } }), { x: 50, y: 60, ancho: 500, alto: 700 });
  assert.deepEqual(cajaVisible({ mediaBox: media, cropBox: { x: -100, y: 500, width: 1000, height: 1000 } }), { x: 0, y: 500, ancho: 600, alto: 300 });
  assert.deepEqual(cajaVisible({ mediaBox: { x: 20, y: 30, width: 100, height: 50 } }), { x: 20, y: 30, ancho: 100, alto: 50 });
});
