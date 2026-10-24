import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearNotas, notaDe } from '../src/comun/notas.mjs';

test('cabeceras variadas, BOM y CRLF', () => {
  const n = parsearNotas('﻿## 1\r\nHola\r\n\r\n## 3. La plataforma (0:45)\r\nDos líneas\r\nmás\r\n#4\r\nCuatro');
  assert.equal(n.get('1'), 'Hola');
  assert.equal(n.get('3'), 'Dos líneas\nmás');
  assert.equal(n.get('4'), 'Cuatro');
  assert.equal(n.size, 3);
});
test('sin cabeceras → vacío; notaDe por etiqueta y por índice', () => {
  assert.equal(parsearNotas('texto suelto').size, 0);
  const n = parsearNotas('## 11\nOnce');
  assert.equal(notaDe(n, { etiqueta: '11', lamina: 12 }), 'Once');
  assert.equal(notaDe(n, { etiqueta: 'x', lamina: 11 }), 'Once');
  assert.equal(notaDe(n, { etiqueta: '2', lamina: 2 }), '');
});
