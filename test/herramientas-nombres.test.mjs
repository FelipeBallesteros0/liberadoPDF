import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreResultado, nombreParte, nombreImagen } from '../src/comun/herramientas/nombres.mjs';

test('nombres de resultado', () => {
  assert.equal(nombreResultado('C:\\Charlas\\charla.PDF', 'unido'), 'charla - unido.pdf');
  assert.equal(nombreResultado('/d/charla.pdf', 'OCR'), 'charla - OCR.pdf');
  assert.equal(nombreParte('/d/charla.pdf', 2, 12), 'charla - parte 02.pdf');
  assert.equal(nombreParte('/d/charla.pdf', 3, 120), 'charla - parte 003.pdf');
  assert.equal(nombreImagen('/d/charla.pdf', 7, 14, 'png'), 'charla - página 07.png');
});
