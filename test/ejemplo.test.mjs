import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

test('el PDF de ejemplo existe, es pequeño y trae la animación', () => {
  const bytes = readFileSync('recursos/ejemplo_animado.pdf');
  assert.ok(statSync('recursos/ejemplo_animado.pdf').size < 200_000);
  const texto = bytes.toString('latin1');
  assert.ok(texto.includes('/Count 4'), 'cuatro páginas');
  assert.ok(texto.includes('animation by animate'), 'widget anm0 de animate');
  assert.ok(texto.includes('/PageLabels'));
});
