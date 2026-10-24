import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectanguloDeArrastre } from '../src/comun/instantanea.mjs';

test('rectángulo normalizado y entero; descarta arrastres minúsculos', () => {
  assert.deepEqual(rectanguloDeArrastre({ x: 10.4, y: 20.6 }, { x: 110.2, y: 70.1 }), { x: 10, y: 21, width: 100, height: 49 });
  assert.deepEqual(rectanguloDeArrastre({ x: 110, y: 70 }, { x: 10, y: 20 }), { x: 10, y: 20, width: 100, height: 50 });
  assert.equal(rectanguloDeArrastre({ x: 5, y: 5 }, { x: 8, y: 50 }), null);
});
