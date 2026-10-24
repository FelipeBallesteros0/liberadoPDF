import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverSeleccion } from '../src/comun/cuadricula.mjs';

test('moverSeleccion por filas y columnas, acotado', () => {
  assert.equal(moverSeleccion(0, 10, 4, 'ArrowRight'), 1);
  assert.equal(moverSeleccion(3, 10, 4, 'ArrowRight'), 4);
  assert.equal(moverSeleccion(9, 10, 4, 'ArrowRight'), 9);
  assert.equal(moverSeleccion(0, 10, 4, 'ArrowLeft'), 0);
  assert.equal(moverSeleccion(1, 10, 4, 'ArrowDown'), 5);
  assert.equal(moverSeleccion(7, 10, 4, 'ArrowDown'), 9, 'última fila incompleta: va al final');
  assert.equal(moverSeleccion(5, 10, 4, 'ArrowUp'), 1);
  assert.equal(moverSeleccion(2, 10, 4, 'ArrowUp'), 2);
  assert.equal(moverSeleccion(5, 10, 4, 'Home'), 0);
  assert.equal(moverSeleccion(5, 10, 4, 'End'), 9);
  assert.equal(moverSeleccion(5, 10, 4, 'x'), 5);
});
