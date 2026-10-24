import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidirBarra, alternarBarra } from '../src/comun/barra.mjs';
import { normalizarConfig } from '../src/comun/config.mjs';

const catalogo = [
  { id: 'zoomInButton', origen: 'principal' },
  { id: 'printButton', origen: 'principal' },
  { id: 'presentationMode', origen: 'secundaria' },
  { id: 'pageRotateCw', origen: 'secundaria' },
];

test('por defecto: lo principal visible, lo secundario en el menú, salvo lo que diga la config', () => {
  const plan = decidirBarra(catalogo, { presentationMode: true, printButton: false });
  assert.deepEqual(plan, [
    { id: 'zoomInButton', origen: 'principal', enBarra: true },
    { id: 'printButton', origen: 'principal', enBarra: false },
    { id: 'presentationMode', origen: 'secundaria', enBarra: true },
    { id: 'pageRotateCw', origen: 'secundaria', enBarra: false },
  ]);
});

test('alternar devuelve un mapa nuevo y no muta', () => {
  const barra = { presentationMode: true };
  const nuevo = alternarBarra(barra, 'printButton', false);
  assert.deepEqual(nuevo, { presentationMode: true, printButton: false });
  assert.deepEqual(barra, { presentationMode: true });
});

test('config: barra por defecto trae presentationMode y conserva solo booleanos', () => {
  assert.deepEqual(normalizarConfig(undefined).barra, { presentationMode: true });
  const c = normalizarConfig({ barra: { presentationMode: false, printButton: false, zoomInButton: 'si' } });
  assert.deepEqual(c.barra, { presentationMode: false, printButton: false });
});
