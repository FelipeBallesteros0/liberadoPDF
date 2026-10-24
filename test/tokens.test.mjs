import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRegistroDeTokens } from '../src/comun/tokens.mjs';

test('la misma ruta recibe el mismo token; rutas distintas, tokens distintos e imprevisibles', () => {
  const r = crearRegistroDeTokens({ maximo: 100 });
  const a = r.registrar('/a.pdf'), b = r.registrar('/b.pdf');
  assert.equal(r.registrar('/a.pdf'), a);
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.equal(r.rutaDe(a), '/a.pdf');
  assert.equal(r.rutaDe('no existe'), undefined);
});

test('el registro se acota: al pasar del máximo se olvidan los más antiguos', () => {
  const r = crearRegistroDeTokens({ maximo: 3 });
  const t = ['/1', '/2', '/3', '/4'].map(p => r.registrar(p));
  assert.equal(r.rutaDe(t[0]), undefined);
  assert.equal(r.rutaDe(t[3]), '/4');
  assert.equal(r.tamano(), 3);
});

test('volver a registrar una ruta la renueva (no se olvida antes que las recién usadas)', () => {
  const r = crearRegistroDeTokens({ maximo: 2 });
  const a = r.registrar('/a'); r.registrar('/b'); r.registrar('/a'); r.registrar('/c');
  assert.equal(r.rutaDe(a), '/a');
});

test('consultar un token lo renueva: el documento abierto no se expulsa por registrar muchos archivos', () => {
  const r = crearRegistroDeTokens({ maximo: 2 });
  const abierto = r.registrar('/abierto.pdf');
  r.registrar('/b');
  assert.equal(r.rutaDe(abierto), '/abierto.pdf'); // uso → renovado
  r.registrar('/c'); // expulsa /b, no /abierto.pdf
  assert.equal(r.rutaDe(abierto), '/abierto.pdf');
});
