import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirPantallas } from '../src/comun/pantallas.mjs';

const una = [{ id: 1, principal: true }];
const dos = [{ id: 1, principal: true }, { id: 2, principal: false }];
const auto = { monitorPresentacion: 'auto', monitorPresentador: 'auto' };
test('una pantalla: nada se mueve', () => {
  assert.deepEqual(elegirPantallas(una, auto), { presentacion: null, presentador: null });
  assert.deepEqual(elegirPantallas(una, auto, { presentadorAbierto: true }), { presentacion: null, presentador: null });
});
test('dos pantallas en automático sin vista de presentador: la presentación se queda donde está la ventana', () => {
  // Una segunda pantalla que nadie mira (un transmisor HDMI, un capturador) se llevaba la presentación.
  assert.deepEqual(elegirPantallas(dos, auto), { presentacion: null, presentador: 1 });
  assert.deepEqual(elegirPantallas(dos, auto, { presentadorAbierto: false }), { presentacion: null, presentador: 1 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 9, monitorPresentador: 'auto' }), { presentacion: null, presentador: 1 }, 'id inexistente → automático');
});
test('dos pantallas en automático con la vista de presentador abierta: presentación en la secundaria, presentador en la principal', () => {
  assert.deepEqual(elegirPantallas(dos, auto, { presentadorAbierto: true }), { presentacion: 2, presentador: 1 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 9, monitorPresentador: 'auto' }, { presentadorAbierto: true }), { presentacion: 2, presentador: 1 }, 'id inexistente → automático');
});
test('pantalla de la presentación elegida en Ajustes: se usa siempre', () => {
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 1, monitorPresentador: 'auto' }), { presentacion: 1, presentador: 2 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 1, monitorPresentador: 'auto' }, { presentadorAbierto: true }), { presentacion: 1, presentador: 2 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 2, monitorPresentador: 'auto' }), { presentacion: 2, presentador: 1 });
});
test('pantalla del presentador elegida en Ajustes', () => {
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 'auto', monitorPresentador: 2 }, { presentadorAbierto: true }), { presentacion: 2, presentador: 1 }, 'si choca con la presentación, va a la otra');
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 1, monitorPresentador: 2 }), { presentacion: 1, presentador: 2 });
});
