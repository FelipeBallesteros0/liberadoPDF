import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente } from '../src/renderer/herramientas/cliente.mjs';

function workerFalso() {
  const w = { enviados: [], onmessage: null, onerror: null, postMessage(m) { w.enviados.push(m); }, terminate() { w.terminado = true; } };
  return w;
}

test('ejecutar con una señal ya abortada rechaza en el acto, sin tocar el worker', async () => {
  const w = workerFalso();
  const cliente = crearCliente({ crearWorker: () => w });
  await assert.rejects(cliente.ejecutar('eco', { texto: 'x' }, { senal: AbortSignal.abort() }), e => e.cancelado === true);
  assert.equal(w.enviados.length, 0);
});

test('abortar durante la ejecución manda cancelar al worker y la promesa se rechaza como cancelada', async () => {
  const w = workerFalso();
  const cliente = crearCliente({ crearWorker: () => w });
  const controlador = new AbortController();
  const p = cliente.ejecutar('lento', {}, { senal: controlador.signal });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(w.enviados[0].operacion, 'lento');
  controlador.abort();
  assert.deepEqual(w.enviados[1], { id: w.enviados[0].id, cancelar: true });
  w.onmessage({ data: { id: w.enviados[0].id, cancelado: true } });
  await assert.rejects(p, e => e.cancelado === true);
});

test('una operación normal resuelve con el resultado y el progreso llega al oyente', async () => {
  const w = workerFalso();
  const cliente = crearCliente({ crearWorker: () => w });
  const progresos = [];
  const p = cliente.ejecutar('eco', { texto: 'hola' }, { alProgreso: x => progresos.push(x) });
  await new Promise(r => setTimeout(r, 0));
  const { id } = w.enviados[0];
  w.onmessage({ data: { id, progreso: { hecho: 1, total: 2 } } });
  w.onmessage({ data: { id, resultado: 'hola' } });
  assert.equal(await p, 'hola');
  assert.deepEqual(progresos, [{ hecho: 1, total: 2 }]);
});
