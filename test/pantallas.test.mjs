import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirPantallas } from '../src/comun/pantallas.mjs';

const una = [{ id: 1, principal: true }];
const dos = [{ id: 1, principal: true }, { id: 2, principal: false }];
test('una pantalla: nada se mueve', () => {
  assert.deepEqual(elegirPantallas(una, { monitorPresentacion: 'auto', monitorPresentador: 'auto' }), { presentacion: null, presentador: null });
});
test('dos pantallas: presentación en la secundaria, presentador en la principal', () => {
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 'auto', monitorPresentador: 'auto' }), { presentacion: 2, presentador: 1 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 1, monitorPresentador: 'auto' }), { presentacion: 1, presentador: 2 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 9, monitorPresentador: 'auto' }), { presentacion: 2, presentador: 1 }, 'id inexistente → auto');
});
