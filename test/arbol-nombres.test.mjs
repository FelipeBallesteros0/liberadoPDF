import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFName, PDFArray, PDFDict, PDFString } from 'pdf-lib';
import { paresDelArbolDeNombres } from '../src/comun/herramientas/arbolNombres.mjs';

test('recorre un árbol de nombres plano y uno con /Kids (como escribe Acrobat), en orden', async () => {
  const doc = await PDFDocument.create();
  const ctx = doc.context;
  const plano = ctx.obj({ Names: [PDFString.of('a'), 1, PDFString.of('b'), 2] });
  const hoja1 = ctx.register(ctx.obj({ Names: [PDFString.of('c'), 3] }));
  const hoja2 = ctx.register(ctx.obj({ Names: [PDFString.of('d'), 4, PDFString.of('e'), 5] }));
  const conKids = ctx.obj({ Kids: [hoja1, ctx.obj({ Kids: [hoja2] })] });
  const util = { lookup: r => ctx.lookup(r), PDFName, PDFArray, PDFDict };
  const nombres = pares => pares.map(([n]) => ctx.lookup(n).decodeText());
  assert.deepEqual(nombres(paresDelArbolDeNombres(plano, util)), ['a', 'b']);
  assert.deepEqual(nombres(paresDelArbolDeNombres(conKids, util)), ['c', 'd', 'e']);
  assert.deepEqual(paresDelArbolDeNombres(null, util), []);
});
