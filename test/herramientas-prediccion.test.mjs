import { test } from 'node:test';
import assert from 'node:assert/strict';
import { despredecir } from '../src/comun/herramientas/prediccion.mjs';

const u8 = a => new Uint8Array(a);
const base = { colores: 3, bitsPorComponente: 8, columnas: 2 };

test('predictor 1 (ninguno) devuelve los datos tal cual', () => {
  assert.deepEqual(despredecir({ datos: u8([1, 2, 3, 4, 5, 6]), predictor: 1, ...base }), u8([1, 2, 3, 4, 5, 6]));
});

test('predictor 2 (TIFF) deshace la diferencia horizontal por componente', () => {
  assert.deepEqual(despredecir({ datos: u8([10, 20, 30, 5, 5, 5]), predictor: 2, ...base }), u8([10, 20, 30, 15, 25, 35]));
});

test('predictores PNG (≥ 10): filtros None, Sub, Up, Average y Paeth por fila', () => {
  const fila0 = [0, 10, 20, 30, 40, 50, 60];
  assert.deepEqual(despredecir({ datos: u8([...fila0, 2, 1, 2, 3, 4, 5, 6]), predictor: 12, ...base }), u8([10, 20, 30, 40, 50, 60, 11, 22, 33, 44, 55, 66]));
  assert.deepEqual(despredecir({ datos: u8([1, 10, 20, 30, 30, 30, 30]), predictor: 11, ...base }), u8([10, 20, 30, 40, 50, 60]));
  assert.deepEqual(despredecir({ datos: u8([...fila0, 3, 10, 20, 30, 10, 10, 10]), predictor: 15, ...base }), u8([10, 20, 30, 40, 50, 60, 15, 30, 45, 37, 50, 62]));
  assert.deepEqual(despredecir({ datos: u8([...fila0, 4, 1, 1, 1, 1, 1, 1]), predictor: 15, ...base }), u8([10, 20, 30, 40, 50, 60, 11, 21, 31, 41, 51, 61]));
});

test('despredecir devuelve null si los datos no cuadran con las filas', () => {
  assert.equal(despredecir({ datos: u8([0, 1, 2]), predictor: 12, ...base }), null);
  assert.equal(despredecir({ datos: u8([0, 1, 2, 3, 4, 5, 6, 9]), predictor: 15, ...base }), null);
});
