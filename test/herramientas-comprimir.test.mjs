import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CALIDADES, decidirImagen, informe } from '../src/comun/herramientas/comprimir.mjs';

test('CALIDADES: tres niveles con escala y calidad JPEG', () => {
  assert.deepEqual(CALIDADES.alta, { escala: 1, jpeg: 0.85 });
  assert.deepEqual(CALIDADES.media, { escala: 0.7, jpeg: 0.7 });
  assert.deepEqual(CALIDADES.baja, { escala: 0.5, jpeg: 0.5 });
});

test('decidirImagen recodifica JPEG y Flate RGB/Gris de 8 bits sin máscara, reduciendo según la calidad', () => {
  const jpeg = { filtro: 'DCTDecode', ancho: 2000, alto: 1500, bitsPorComponente: 8, espacioColor: 'DeviceRGB', tieneMascara: false };
  assert.deepEqual(decidirImagen(jpeg, 'baja'), { recodificar: true, anchoNuevo: 1000, altoNuevo: 750, jpeg: 0.5 });
  assert.deepEqual(decidirImagen(jpeg, 'alta'), { recodificar: true, anchoNuevo: 2000, altoNuevo: 1500, jpeg: 0.85 });
  const flate = { filtro: 'FlateDecode', ancho: 800, alto: 600, bitsPorComponente: 8, espacioColor: 'DeviceGray', tieneMascara: false };
  assert.equal(decidirImagen(flate, 'media').recodificar, true);
  assert.deepEqual([decidirImagen(flate, 'media').anchoNuevo, decidirImagen(flate, 'media').altoNuevo], [560, 420]);
});

test('decidirImagen deja en paz lo pequeño, lo enmascarado, lo indexado, lo de 1 bit y otros filtros', () => {
  const base = { filtro: 'DCTDecode', ancho: 2000, alto: 1500, bitsPorComponente: 8, espacioColor: 'DeviceRGB', tieneMascara: false };
  assert.equal(decidirImagen({ ...base, ancho: 199, alto: 199 }, 'baja').recodificar, false);
  assert.equal(decidirImagen({ ...base, tieneMascara: true }, 'baja').recodificar, false);
  assert.equal(decidirImagen({ ...base, filtro: 'FlateDecode', espacioColor: 'Indexed' }, 'baja').recodificar, false);
  assert.equal(decidirImagen({ ...base, filtro: 'FlateDecode', bitsPorComponente: 1 }, 'baja').recodificar, false);
  assert.equal(decidirImagen({ ...base, filtro: 'JPXDecode' }, 'baja').recodificar, false);
  assert.equal(decidirImagen({ ...base, filtro: 'CCITTFaxDecode' }, 'baja').recodificar, false);
});

test('informe muestra tamaños legibles y el porcentaje ahorrado', () => {
  assert.equal(informe(1_800_000, 640_000), '1,8 MB → 640 KB (−64 %)');
  assert.equal(informe(58_000, 58_000), '58 KB → 58 KB (0 %)');
  assert.equal(informe(900, 1200), '900 B → 1,2 KB (+33 %)');
});
