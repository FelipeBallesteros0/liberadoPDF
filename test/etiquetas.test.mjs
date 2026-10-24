import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparEtiquetas, textoContador } from '../src/comun/etiquetas.mjs';

test('Beamer con pasos: etiquetas repetidas forman láminas', () => {
  const g = agruparEtiquetas(['0', '1', '2', '2', '2', '3'], 6);
  assert.equal(g.laminas.length, 4);
  assert.deepEqual(g.posicion(4), { lamina: 3, totalLaminas: 4, paso: 2, pasos: 3, etiqueta: '2' });
  assert.equal(g.paginaDeLamina(3), 6, 'la etiqueta «3» (página 6) manda sobre el índice 3');
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
  assert.equal(g.paginaDeLamina(2), 4, 'la etiqueta «2» manda sobre el índice 2');
  assert.equal(g.paginaDeLamina(1), 3, 'etiqueta «1»');
  assert.equal(g.paginaDeLamina(7), null);
  assert.deepEqual(g.posicion(5), { lamina: 4, totalLaminas: 4, paso: 2, pasos: 2, etiqueta: '2' });
});

test('Beamer Metropolis: portada «0», teclear 11 va a la lámina rotulada 11 y el contador dice 11 / 12', () => {
  const etiquetas = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '12'];
  const g = agruparEtiquetas(etiquetas, 14);
  assert.equal(g.paginaDeLamina(11), 12);
  assert.equal(g.paginaDeLamina(0), 1);
  assert.equal(textoContador(g.posicion(12), g), 'lámina 11 / 12');
  assert.equal(textoContador(g.posicion(14), g), 'lámina 12 / 12 · paso 2 / 2');
});

test('contador sin etiquetas numéricas: índice de lámina sobre el total', () => {
  const g = agruparEtiquetas(['i', 'ii', '1', '2', '2'], 5);
  assert.equal(textoContador(g.posicion(2), g), 'lámina 2 / 4');
  const sin = agruparEtiquetas(null, 3);
  assert.equal(textoContador(sin.posicion(3), sin), 'lámina 3 / 3');
});
