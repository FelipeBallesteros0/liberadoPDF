import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPOS, leerCampo, escribirCampo, opcionesDePantalla } from '../src/comun/ajustes.mjs';
import { valoresPorDefecto } from '../src/comun/config.mjs';

test('campos cubren la sección 4.6 y leen/escriben por ruta sin mutar', () => {
  const rutas = CAMPOS.map(c => c.ruta);
  for (const r of ['presentacion.avanceSegundos', 'presentacion.bucle', 'presentacion.transiciones', 'presentacion.fondo', 'presentacion.ocultarCursor', 'unidadMedida', 'nocturno', 'tema', 'monitorPresentacion', 'monitorPresentador']) assert.ok(rutas.includes(r), r);
  const c = valoresPorDefecto();
  const d = escribirCampo(c, 'presentacion.avanceSegundos', '15');
  assert.equal(leerCampo(d, 'presentacion.avanceSegundos'), 15);
  assert.equal(leerCampo(c, 'presentacion.avanceSegundos'), 0, 'no muta');
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.avanceSegundos', '-5'), 'presentacion.avanceSegundos'), 0, 'acotado');
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.avanceSegundos', '99999'), 'presentacion.avanceSegundos'), 3600);
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.bucle', 'true'), 'presentacion.bucle'), true);
  assert.equal(leerCampo(escribirCampo(c, 'unidadMedida', 'pulgadas'), 'unidadMedida'), 'mm', 'opción inválida → defecto');
});

test('opciones de pantalla: automático más una por pantalla', () => {
  const o = opcionesDePantalla([{ id: 7, etiqueta: 'DELL', ancho: 1920, alto: 1080, principal: true }]);
  assert.deepEqual(o, [{ valor: 'auto', etiqueta: 'Automático' }, { valor: '7', etiqueta: 'DELL (1920×1080)' }]);
});

test('elegir una pantalla concreta se escribe como id entero (C1)', () => {
  const c = valoresPorDefecto();
  assert.equal(leerCampo(escribirCampo(c, 'monitorPresentacion', '2528732444'), 'monitorPresentacion'), 2528732444);
  assert.equal(leerCampo(escribirCampo(c, 'monitorPresentador', 'auto'), 'monitorPresentador'), 'auto');
});
