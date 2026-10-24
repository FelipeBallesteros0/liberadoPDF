import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palabrasAPdf, tamanoDeFuente, textoWinAnsi, palabrasDeBloques } from '../src/comun/herramientas/ocr.mjs';

test('palabrasAPdf pasa de píxeles de la imagen (origen arriba) a unidades PDF (origen abajo)', () => {
  // Imagen a 144 ppp (escala 2): 1 unidad PDF = 2 px; página de 400 pt de alto.
  const r = palabrasAPdf([{ text: 'Hola', bbox: { x0: 20, y0: 40, x1: 120, y1: 80 } }], { escala: 2, altoPagina: 400 });
  assert.deepEqual(r, [{ texto: 'Hola', x: 10, y: 360, ancho: 50, alto: 20 }]);
});

test('palabrasAPdf descarta palabras vacías o cajas degeneradas', () => {
  const r = palabrasAPdf([{ text: '  ', bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } }, { text: 'x', bbox: { x0: 5, y0: 5, x1: 5, y1: 9 } }], { escala: 1, altoPagina: 100 });
  assert.deepEqual(r, []);
});

test('tamanoDeFuente: el texto ocupa el ancho de la caja, acotado entre 2 y 200', () => {
  assert.equal(tamanoDeFuente(50, 5), 10); // 5 pt de ancho a 1 pt → 10 pt para 50
  assert.equal(tamanoDeFuente(1, 5), 2);
  assert.equal(tamanoDeFuente(5000, 5), 200);
  assert.equal(tamanoDeFuente(50, 0), 2);
});

test('textoWinAnsi sustituye lo que Helvetica no puede escribir', () => {
  assert.equal(textoWinAnsi('Año: ñandú — ok'), 'Año: ñandú — ok');
  assert.equal(textoWinAnsi('中文 ok'), '?? ok');
  assert.equal(textoWinAnsi('fi x'), 'fi?x');
});

test('palabrasDeBloques aplana la jerarquía blocks → paragraphs → lines → words de tesseract.js', () => {
  const bloques = [{ paragraphs: [{ lines: [{ words: [{ text: 'a', bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } }, { text: 'b', bbox: { x0: 2, y0: 0, x1: 3, y1: 1 } }] }] }, { lines: [{ words: [{ text: 'c', bbox: { x0: 0, y0: 2, x1: 1, y1: 3 } }] }] }] }];
  assert.deepEqual(palabrasDeBloques(bloques).map(p => p.text), ['a', 'b', 'c']);
  assert.deepEqual(palabrasDeBloques(null), []);
});
