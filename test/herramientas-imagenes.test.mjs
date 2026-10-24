import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escalaParaPpp, ajustarEnPagina, TAMANOS, tamanoDePagina } from '../src/comun/herramientas/imagenes.mjs';

const cerca = (a, b) => Math.abs(a - b) < 0.01;

test('escalaParaPpp: 72 ppp es escala 1', () => {
  assert.equal(escalaParaPpp(72), 1);
  assert.equal(escalaParaPpp(144), 2);
  assert.ok(cerca(escalaParaPpp(100), 100 / 72));
});

test('ajustarEnPagina: imagen apaisada limitada por el ancho, centrada en vertical', () => {
  const r = ajustarEnPagina({ anchoImagen: 200, altoImagen: 100, anchoPagina: 595.28, altoPagina: 841.89, margen: 20 });
  assert.ok(cerca(r.ancho, 555.28) && cerca(r.alto, 277.64), JSON.stringify(r));
  assert.ok(cerca(r.x, 20) && cerca(r.y, (841.89 - 277.64) / 2), JSON.stringify(r));
});

test('ajustarEnPagina: imagen alta limitada por el alto, centrada en horizontal', () => {
  const r = ajustarEnPagina({ anchoImagen: 100, altoImagen: 400, anchoPagina: 595.28, altoPagina: 841.89, margen: 20 });
  assert.ok(cerca(r.alto, 801.89) && cerca(r.ancho, 200.4725), JSON.stringify(r));
  assert.ok(cerca(r.y, 20) && cerca(r.x, (595.28 - 200.4725) / 2), JSON.stringify(r));
});

test('TAMANOS y tamanoDePagina', () => {
  assert.deepEqual(TAMANOS.A4, [595.28, 841.89]);
  assert.deepEqual(TAMANOS.Carta, [612, 792]);
  assert.deepEqual(tamanoDePagina('A4', 'vertical'), [595.28, 841.89]);
  assert.deepEqual(tamanoDePagina('A4', 'horizontal'), [841.89, 595.28]);
  assert.deepEqual(tamanoDePagina('Carta', 'auto', { ancho: 100, alto: 300 }), [612, 792]);
  assert.deepEqual(tamanoDePagina('Carta', 'auto', { ancho: 300, alto: 100 }), [792, 612]);
  assert.deepEqual(tamanoDePagina('imagen', 'auto', { ancho: 300, alto: 200 }), [300, 200]);
  assert.deepEqual(tamanoDePagina('imagen', 'vertical', { ancho: 300, alto: 200 }), [300, 200]); // la orientación no cambia la imagen
});

test('tipoPorBytes reconoce el formato por los bytes mágicos, no por la extensión', async () => {
  const { tipoPorBytes } = await import('../src/comun/herramientas/imagenes.mjs');
  assert.equal(tipoPorBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), 'image/jpeg');
  assert.equal(tipoPorBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(tipoPorBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), 'image/gif');
  assert.equal(tipoPorBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])), 'image/webp');
  assert.equal(tipoPorBytes(new Uint8Array([0x42, 0x4d, 1, 2])), 'image/bmp');
  assert.equal(tipoPorBytes(new Uint8Array(Buffer.from('esto no es una imagen'))), null);
  assert.equal(tipoPorBytes(new Uint8Array(2)), null);
});

test('orientacionExif lee el tag Orientation de un JPEG (little y big endian) y vale 1 si no hay EXIF', async () => {
  const { orientacionExif } = await import('../src/comun/herramientas/imagenes.mjs');
  const jpegCon = (orden, valor) => {
    const be = orden === 'MM';
    const u16 = v => (be ? [v >> 8, v & 0xff] : [v & 0xff, v >> 8]);
    const u32 = v => (be ? [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff] : [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24]);
    const tiff = [...Buffer.from(orden), ...u16(42), ...u32(8), ...u16(1), ...u16(0x0112), ...u16(3), ...u32(1), ...u16(valor), 0, 0, ...u32(0)];
    const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    const len = app1.length + 2;
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...app1, 0xff, 0xd9]);
  };
  assert.equal(orientacionExif(jpegCon('II', 6)), 6);
  assert.equal(orientacionExif(jpegCon('MM', 3)), 3);
  assert.equal(orientacionExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9])), 1);
  assert.equal(orientacionExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), 1);
});
