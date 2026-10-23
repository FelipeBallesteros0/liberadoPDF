import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparEtiquetas } from '../src/comun/etiquetas.mjs';

test('Beamer con pasos: etiquetas repetidas forman láminas', () => {
  const g = agruparEtiquetas(['0', '1', '2', '2', '2', '3'], 6);
  assert.equal(g.laminas.length, 4);
  assert.deepEqual(g.posicion(4), { lamina: 3, totalLaminas: 4, paso: 2, pasos: 3, etiqueta: '2' });
  assert.equal(g.paginaDeLamina(3), 3);
  assert.equal(g.paginaDeLamina(9), null);
  assert.equal(g.siguienteLamina(3), 6);
  assert.equal(g.siguienteLamina(6), null);
  assert.equal(g.anteriorLamina(5), 2);
  assert.equal(g.anteriorLamina(1), null);
});

test('sin etiquetas o con longitud incoherente: una lámina por página', () => {
  for (const etiquetas of [null, undefined, ['1', '2']]) {
    const g = agruparEtiquetas(etiquetas, 3);
    assert.equal(g.laminas.length, 3);
    assert.deepEqual(g.posicion(2), { lamina: 2, totalLaminas: 3, paso: 1, pasos: 1, etiqueta: '2' });
    assert.equal(g.paginaDeLamina(3), 3);
  }
});

test('etiquetas no numéricas: saltar por etiqueta cuando el número no es índice', () => {
  const g = agruparEtiquetas(['i', 'ii', '1', '2', '2'], 5);
  assert.equal(g.laminas.length, 4);
  assert.equal(g.paginaDeLamina(2), 2, 'índice de lámina');
  assert.equal(g.paginaDeLamina(7), null);
  assert.deepEqual(g.posicion(5), { lamina: 4, totalLaminas: 4, paso: 2, pasos: 2, etiqueta: '2' });
});
