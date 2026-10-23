import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguientePagina, textoReloj } from '../src/comun/presentacion.mjs';

test('siguientePagina respeta el bucle', () => {
  assert.equal(siguientePagina(1, 4, false), 2);
  assert.equal(siguientePagina(4, 4, false), null);
  assert.equal(siguientePagina(4, 4, true), 1);
});

test('textoReloj', () => {
  const inicio = Date.UTC(2026, 11, 9, 15, 0, 0);
  const t = textoReloj(inicio + 125_000, inicio);
  assert.equal(t.transcurrido, '02:05');
  assert.match(t.hora, /^\d\d:\d\d$/);
  assert.equal(textoReloj(inicio + 3_725_000, inicio).transcurrido, '1:02:05');
});
