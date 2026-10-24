import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cajaDeArrastre, cajaValida } from '../src/comun/herramientas/recorte.mjs';

// Página 600×800 pt sin rotación, a escala 2 (1 pt = 2 px); el arrastre va en píxeles desde la esquina superior izquierda de la página.
test('cajaDeArrastre: sin rotación, convierte píxeles a unidades PDF con origen abajo-izquierda', () => {
  const caja = cajaDeArrastre({ inicio: { x: 20, y: 40 }, fin: { x: 220, y: 240 }, vista: { escala: 2, rotacion: 0, ancho: 1200, alto: 1600 }, view: [0, 0, 600, 800] });
  assert.deepEqual(caja, { x: 10, y: 680, ancho: 100, alto: 100 });
});

test('cajaDeArrastre: respeta el origen del CropBox actual', () => {
  const caja = cajaDeArrastre({ inicio: { x: 0, y: 0 }, fin: { x: 200, y: 100 }, vista: { escala: 1, rotacion: 0, ancho: 500, alto: 700 }, view: [50, 50, 550, 750] });
  assert.deepEqual(caja, { x: 50, y: 650, ancho: 200, alto: 100 });
});

test('cajaDeArrastre: con la página girada 90° el rectángulo se deshace a coordenadas sin girar', () => {
  // Página 600 de ancho × 800 de alto, mostrada girada: el viewport mide 800×600. Esquina superior izquierda del
  // viewport = esquina inferior izquierda de la página sin girar.
  const caja = cajaDeArrastre({ inicio: { x: 0, y: 0 }, fin: { x: 100, y: 50 }, vista: { escala: 1, rotacion: 90, ancho: 800, alto: 600 }, view: [0, 0, 600, 800] });
  assert.deepEqual(caja, { x: 0, y: 0, ancho: 50, alto: 100 });
});

test('cajaDeArrastre: el orden de las esquinas no importa', () => {
  const a = cajaDeArrastre({ inicio: { x: 220, y: 240 }, fin: { x: 20, y: 40 }, vista: { escala: 2, rotacion: 0, ancho: 1200, alto: 1600 }, view: [0, 0, 600, 800] });
  assert.deepEqual(a, { x: 10, y: 680, ancho: 100, alto: 100 });
});

test('cajaValida rechaza cajas vacías o fuera de la página', () => {
  assert.equal(cajaValida({ x: 10, y: 10, ancho: 100, alto: 100 }, [0, 0, 600, 800]), null);
  assert.match(cajaValida({ x: 10, y: 10, ancho: 0, alto: 100 }, [0, 0, 600, 800]), /vac/i);
  assert.match(cajaValida({ x: 550, y: 10, ancho: 100, alto: 100 }, [0, 0, 600, 800]), /fuera/i);
});
