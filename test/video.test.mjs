import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectanguloEnPagina, opcionesDeReproduccion, mimeDeVideo } from '../src/comun/video.mjs';
import { rutaDeVideoPermitida } from '../src/comun/rutasVideo.mjs';

test('rutaDeVideoPermitida: solo archivos dentro de la carpeta del PDF (o subcarpetas)', () => {
  assert.equal(rutaDeVideoPermitida('C:\\docs', 'video.mp4', 'win32'), 'C:\\docs\\video.mp4');
  assert.equal(rutaDeVideoPermitida('C:\\docs', 'sub/video.mp4', 'win32'), 'C:\\docs\\sub\\video.mp4');
  assert.equal(rutaDeVideoPermitida('/home/f', 'sub/v.mp4', 'linux'), '/home/f/sub/v.mp4');
  assert.equal(rutaDeVideoPermitida('/home/f', '../v.mp4', 'linux'), null);
  assert.equal(rutaDeVideoPermitida('/home/f', '/etc/v.mp4', 'linux'), null);
  assert.equal(rutaDeVideoPermitida('C:\\docs', 'D:\\otro\\v.mp4', 'win32'), null);
  assert.equal(rutaDeVideoPermitida('C:\\docs', 'sub\\..\\..\\v.mp4', 'win32'), null);
  assert.equal(rutaDeVideoPermitida('/home/f', '', 'linux'), null);
});

test('rectanguloEnPagina convierte las dos esquinas con convertToViewportPoint (pdf.js 6) y normaliza', () => {
  // Página de 200 pt de alto a escala 2: (x, y) del PDF → (2x, 2·(200 − y)) en pantalla.
  const viewport = { convertToViewportPoint: (x, y) => [2 * x, 2 * (200 - y)] };
  assert.deepEqual(rectanguloEnPagina([5, 10, 55, 25], viewport), { left: 10, top: 350, width: 100, height: 30 });
  assert.deepEqual(rectanguloEnPagina([55, 25, 5, 10], viewport), { left: 10, top: 350, width: 100, height: 30 });
});

test('opcionesDeReproduccion: la anotación manda si lo dice; si no, la configuración', () => {
  const config = { video: { autoarranque: true, bucle: false } };
  assert.deepEqual(opcionesDeReproduccion({}, config), { autoarranque: true, bucle: false });
  assert.deepEqual(opcionesDeReproduccion({ autoarranque: false, bucle: true }, config), { autoarranque: false, bucle: true });
  assert.deepEqual(opcionesDeReproduccion({ bucle: null }, { video: { autoarranque: false, bucle: true } }), { autoarranque: false, bucle: true });
});

test('mimeDeVideo por bytes mágicos: mp4 (ftyp), webm (EBML) o nada', () => {
  assert.equal(mimeDeVideo(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])), 'video/mp4');
  assert.equal(mimeDeVideo(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4])), 'video/webm');
  assert.equal(mimeDeVideo(new Uint8Array([0x46, 0x4c, 0x56, 1])), null);
  assert.equal(mimeDeVideo(new Uint8Array(3)), null);
});
