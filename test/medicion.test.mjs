import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puntosAPdf, distanciaPdf, areaPoligonoPdf, aUnidad, formatear, factorDeCalibracion, escalaEfectiva } from '../src/comun/medicion.mjs';

test('píxeles a unidades PDF, independientes de zoom y rotación', () => {
  const v = { escala: 2, rotacion: 0, ancho: 1000, alto: 600 };
  assert.deepEqual(puntosAPdf({ x: 200, y: 100 }, v), { x: 100, y: 50 });
  const g = { escala: 1, rotacion: 90, ancho: 600, alto: 1000 };
  assert.deepEqual(puntosAPdf({ x: 600, y: 0 }, g), { x: 0, y: 0 });
  assert.deepEqual(puntosAPdf({ x: 0, y: 1000 }, g), { x: 1000, y: 600 });
});
test('distancia, área y unidades', () => {
  assert.equal(distanciaPdf({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(areaPoligonoPdf([{ x: 0, y: 0 }, { x: 72, y: 0 }, { x: 72, y: 72 }, { x: 0, y: 72 }]), 5184);
  assert.equal(aUnidad(72, 'mm'), 25.4);
  assert.equal(aUnidad(72, 'cm'), 2.54);
  assert.equal(aUnidad(72, 'in'), 1);
  assert.equal(aUnidad(72, 'mm', 2), 50.8, 'UserUnit 2');
  assert.equal(aUnidad(5184, 'in', 1, { potencia: 2 }), 1, 'área: 1 in²');
  assert.equal(formatear(25.4, 'mm'), '25,4 mm');
  assert.equal(formatear(1, 'in', 2), '1,00 in²');
});
test('calibración', () => {
  const f = factorDeCalibracion(72, 50.8, 'mm', 1);
  assert.equal(aUnidad(72, 'mm', 1, { factor: f }), 50.8);
});

test('escalaEfectiva: pdf.js pinta a scale × UserUnit, así que los píxeles se deshacen con ambos (I2)', () => {
  assert.equal(escalaEfectiva(1.5, 2), 3);
  assert.equal(escalaEfectiva(1.5, undefined), 1.5);
  // 96 px a zoom 1 (scale 4/3) con UserUnit 2: 96 / (4/3 · 2) = 36 unidades → 36 · 2 / 72 in = 1 in = 25,4 mm
  const unidades = puntosAPdf({ x: 96, y: 0 }, { escala: escalaEfectiva(4 / 3, 2), rotacion: 0, ancho: 100, alto: 100 }).x;
  assert.ok(Math.abs(aUnidad(unidades, 'mm', 2) - 25.4) < 1e-9);
});
