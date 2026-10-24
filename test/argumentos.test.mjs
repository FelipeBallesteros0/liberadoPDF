import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { rutasDeArgumentos, errorDeRutaPdf } from '../src/comun/argumentos.mjs';

const existe = r => ['/d/charla.pdf', '/d/notas.txt', '/d/con espacios ñ.PDF'].includes(r);

test('empaquetada: argv[0] es el exe; acepta .pdf en cualquier caja; resuelve relativas', () => {
  const r = rutasDeArgumentos(['C:\\liberadoPDF.exe', '/d/charla.pdf', '--flag', 'con espacios ñ.PDF'], { empaquetada: true, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, ['/d/charla.pdf', path.resolve('/d', 'con espacios ñ.PDF')]);
  assert.deepEqual(r.errores, []);
});

test('desarrollo: salta electron y la ruta del proyecto', () => {
  const r = rutasDeArgumentos(['/n/electron', '.', '/d/charla.pdf'], { empaquetada: false, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, ['/d/charla.pdf']);
});

test('errores: inexistente y no PDF', () => {
  const r = rutasDeArgumentos(['exe', '/d/nada.pdf', '/d/notas.txt'], { empaquetada: true, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, []);
  assert.deepEqual(r.errores, ['No existe el archivo: /d/nada.pdf', 'No es un PDF: /d/notas.txt']);
});

test('errorDeRutaPdf: null si es un PDF existente; mensaje si no', () => {
  assert.equal(errorDeRutaPdf('/d/charla.pdf', existe), null);
  assert.equal(errorDeRutaPdf('/d/con espacios ñ.PDF', existe), null);
  assert.equal(errorDeRutaPdf('/d/nada.pdf', existe), 'No existe el archivo: /d/nada.pdf');
  assert.equal(errorDeRutaPdf('/d/notas.txt', existe), 'No es un PDF: /d/notas.txt');
  assert.equal(errorDeRutaPdf(42, existe), 'Ruta no válida');
});
