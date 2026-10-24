import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearRegistroDeCancelaciones } from '../src/comun/herramientas/cancelaciones.mjs';

test('cancelar una operación en curso la marca; terminarla la olvida', () => {
  const c = crearRegistroDeCancelaciones();
  c.empezar(1);
  assert.equal(c.cancelada(1), false);
  c.cancelar(1);
  assert.equal(c.cancelada(1), true);
  c.terminar(1);
  assert.equal(c.cancelada(1), false);
  assert.equal(c.pendientes(), 0);
});

test('cancelar una operación desconocida o ya terminada no deja rastro', () => {
  const c = crearRegistroDeCancelaciones();
  c.cancelar(7);
  c.empezar(8); c.terminar(8); c.cancelar(8);
  assert.equal(c.pendientes(), 0);
  assert.equal(c.cancelada(7), false);
});
