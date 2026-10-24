import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escalaParaPpp, ajustarEnPagina, TAMANOS, tamanoDePagina } from '../src/comun/herramientas/imagenes.mjs';

const cerca = (a, b) => Math.abs(a - b) < 0.01;

test('escalaParaPpp: 72 ppp es escala 1', () => {
  assert.equal(escalaParaPpp(72), 1);
  assert.equal(escalaParaPpp(144), 2);
  assert.ok(cerca(escalaParaPpp(100), 100 / 72));
});

test('ajustarEnPagina: imagen apaisada limitada por el ancho, centrada en vertical', () => {
  const r = ajustarEnPagina({ anchoImagen: 200, altoImagen: 100, anchoPagina: 595.28, altoPagina: 841.89, margen: 20 });
  assert.ok(cerca(r.ancho, 555.28) && cerca(r.alto, 277.64), JSON.stringify(r));
  assert.ok(cerca(r.x, 20) && cerca(r.y, (841.89 - 277.64) / 2), JSON.stringify(r));
});

test('ajustarEnPagina: imagen alta limitada por el alto, centrada en horizontal', () => {
  const r = ajustarEnPagina({ anchoImagen: 100, altoImagen: 400, anchoPagina: 595.28, altoPagina: 841.89, margen: 20 });
  assert.ok(cerca(r.alto, 801.89) && cerca(r.ancho, 200.4725), JSON.stringify(r));
  assert.ok(cerca(r.y, 20) && cerca(r.x, (595.28 - 200.4725) / 2), JSON.stringify(r));
});

test('TAMANOS y tamanoDePagina', () => {
  assert.deepEqual(TAMANOS.A4, [595.28, 841.89]);
  assert.deepEqual(TAMANOS.Carta, [612, 792]);
  assert.deepEqual(tamanoDePagina('A4', 'vertical'), [595.28, 841.89]);
  assert.deepEqual(tamanoDePagina('A4', 'horizontal'), [841.89, 595.28]);
  assert.deepEqual(tamanoDePagina('Carta', 'auto', { ancho: 100, alto: 300 }), [612, 792]);
  assert.deepEqual(tamanoDePagina('Carta', 'auto', { ancho: 300, alto: 100 }), [792, 612]);
  assert.deepEqual(tamanoDePagina('imagen', 'auto', { ancho: 300, alto: 200 }), [300, 200]);
  assert.deepEqual(tamanoDePagina('imagen', 'vertical', { ancho: 300, alto: 200 }), [300, 200]); // la orientación no cambia la imagen
});
