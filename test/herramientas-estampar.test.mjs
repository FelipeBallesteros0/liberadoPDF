import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textoDeNumero, posicionDeTexto, mosaicoDeMarca, colorHex, origenCentrado, aCoordenadasSinRotar } from '../src/comun/herramientas/estampar.mjs';

test('textoDeNumero sustituye {n} y {total}', () => {
  assert.equal(textoDeNumero('Página {n} / {total}', 2, 4), 'Página 2 / 4');
  assert.equal(textoDeNumero('{n}', 7, 9), '7');
  assert.equal(textoDeNumero('- {n} -', 1, 1), '- 1 -');
});

test('posicionDeTexto: las seis posiciones con margen 24', () => {
  const base = { anchoPagina: 600, altoPagina: 800, anchoTexto: 100, altoTexto: 10 };
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'arriba-izquierda' }), { x: 24, y: 766 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'arriba-centro' }), { x: 250, y: 766 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'arriba-derecha' }), { x: 476, y: 766 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'abajo-izquierda' }), { x: 24, y: 24 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'abajo-centro' }), { x: 250, y: 24 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'abajo-derecha' }), { x: 476, y: 24 });
  assert.deepEqual(posicionDeTexto({ ...base, posicion: 'abajo-centro', margen: 10 }), { x: 250, y: 10 });
});

test('mosaicoDeMarca cubre la página con al menos 4 centros dentro de ella', () => {
  const puntos = mosaicoDeMarca({ anchoPagina: 612, altoPagina: 792, anchoTexto: 200, altoTexto: 30 });
  assert.ok(puntos.length >= 4, `solo ${puntos.length} puntos`);
  for (const p of puntos) { assert.ok(p.x >= 0 && p.x <= 612); assert.ok(p.y >= 0 && p.y <= 792); }
});

test('colorHex convierte #rrggbb a componentes 0–1', () => {
  assert.deepEqual(colorHex('#ff0000'), { r: 1, g: 0, b: 0 });
  assert.deepEqual(colorHex('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepEqual(colorHex('#0080ff'), { r: 0, g: 128 / 255, b: 1 });
  assert.deepEqual(colorHex('no es color'), { r: 0, g: 0, b: 0 });
});

test('origenCentrado: sin giro, el origen es el centro menos la mitad del tamaño; con 90° se desplaza', () => {
  assert.deepEqual(origenCentrado({ cx: 300, cy: 400, ancho: 100, alto: 20, angulo: 0 }), { x: 250, y: 390 });
  const r = origenCentrado({ cx: 300, cy: 400, ancho: 100, alto: 20, angulo: 90 });
  assert.ok(Math.abs(r.x - 310) < 1e-9 && Math.abs(r.y - 350) < 1e-9, JSON.stringify(r));
});

test('aCoordenadasSinRotar deshace la rotación visual de la página (W 600, H 800)', () => {
  const base = { anchoPagina: 600, altoPagina: 800 };
  assert.deepEqual(aCoordenadasSinRotar({ ...base, vx: 10, vy: 20, rotacion: 0 }), { x: 10, y: 20 });
  assert.deepEqual(aCoordenadasSinRotar({ ...base, vx: 10, vy: 20, rotacion: 90 }), { x: 580, y: 10 });
  assert.deepEqual(aCoordenadasSinRotar({ ...base, vx: 10, vy: 20, rotacion: 180 }), { x: 590, y: 780 });
  assert.deepEqual(aCoordenadasSinRotar({ ...base, vx: 10, vy: 20, rotacion: 270 }), { x: 20, y: 790 });
});
