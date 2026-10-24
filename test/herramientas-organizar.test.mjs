import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, mover, rotarPagina, borrar, insertarBlanco, duplicar, planDeOrganizacion } from '../src/comun/herramientas/organizar.mjs';

const e4 = () => estadoInicial(4);

test('estadoInicial: una entrada por página, sin rotación', () => {
  assert.deepEqual(e4(), [{ origen: 1, rotacion: 0 }, { origen: 2, rotacion: 0 }, { origen: 3, rotacion: 0 }, { origen: 4, rotacion: 0 }]);
});

test('mover 0→2 reordena sin mutar el original', () => {
  const antes = e4();
  const despues = mover(antes, 0, 2);
  assert.deepEqual(despues.map(p => p.origen), [2, 3, 1, 4]);
  assert.deepEqual(antes.map(p => p.origen), [1, 2, 3, 4]);
  assert.deepEqual(mover(antes, 3, 0).map(p => p.origen), [4, 1, 2, 3]);
  assert.deepEqual(mover(antes, 1, 1).map(p => p.origen), [1, 2, 3, 4]);
});

test('rotarPagina suma 90 y 270→0', () => {
  let e = rotarPagina(e4(), 1);
  assert.equal(e[1].rotacion, 90);
  e = rotarPagina(rotarPagina(rotarPagina(e, 1), 1), 1);
  assert.equal(e[1].rotacion, 0);
  assert.equal(e[0].rotacion, 0);
});

test('borrar en una lista de 1 deja vacía', () => {
  assert.deepEqual(borrar(estadoInicial(1), 0), []);
  assert.deepEqual(borrar(e4(), 2).map(p => p.origen), [1, 2, 4]);
});

test('insertarBlanco añade origen null en la posición dada', () => {
  const e = insertarBlanco(e4(), 4);
  assert.equal(e.length, 5);
  assert.deepEqual(e[4], { origen: null, rotacion: 0 });
  assert.deepEqual(insertarBlanco(e4(), 0)[0], { origen: null, rotacion: 0 });
});

test('duplicar copia la página (con su rotación) justo después', () => {
  const e = duplicar(rotarPagina(e4(), 1), 1);
  assert.deepEqual(e.map(p => p.origen), [1, 2, 2, 3, 4]);
  assert.equal(e[2].rotacion, 90);
  assert.notEqual(e[1], e[2]); // objetos distintos
});

test('planDeOrganizacion devuelve copias planas listas para el worker', () => {
  const plan = planDeOrganizacion(insertarBlanco(mover(e4(), 0, 3), 1));
  assert.deepEqual(plan, [{ origen: 2, rotacion: 0 }, { origen: null, rotacion: 0 }, { origen: 3, rotacion: 0 }, { origen: 4, rotacion: 0 }, { origen: 1, rotacion: 0 }]);
});
