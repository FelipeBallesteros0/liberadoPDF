import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { expandirObjectStreams, reconstruirXref } from '../src/comun/herramientas/reparacion.mjs';

const inflar = async b => new Uint8Array(zlib.inflateSync(b));
// Catálogo, Pages y Page viven dentro del object stream 4; el archivo está truncado (sin xref ni trailer).
function pdfConObjStm() {
  const objetos = [[1, '<< /Type /Catalog /Pages 2 0 R >>'], [2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'], [3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] >>']];
  let cuerpo = '', cabecera = '';
  for (const [n, texto] of objetos) { cabecera += `${n} ${cuerpo.length} `; cuerpo += texto + '\n'; }
  const datos = zlib.deflateSync(Buffer.from(cabecera + cuerpo, 'latin1'));
  const texto = `%PDF-1.5\n4 0 obj\n<< /Type /ObjStm /N 3 /First ${cabecera.length} /Length ${datos.length} /Filter /FlateDecode >>\nstream\n`;
  return new Uint8Array(Buffer.concat([Buffer.from(texto, 'latin1'), datos, Buffer.from('\nendstream\nendobj\n', 'latin1')]));
}

test('expandirObjectStreams saca los objetos de un /ObjStm como objetos normales al final del archivo', async () => {
  const r = await expandirObjectStreams(pdfConObjStm(), inflar);
  const texto = Buffer.from(r).toString('latin1');
  assert.match(texto, /1 0 obj\n<< \/Type \/Catalog \/Pages 2 0 R >>\nendobj/);
  assert.match(texto, /3 0 obj\n<< \/Type \/Page/);
});

test('expandirObjectStreams no cambia un archivo sin object streams', async () => {
  const sin = new Uint8Array(Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n', 'latin1'));
  assert.deepEqual(await expandirObjectStreams(sin, inflar), sin);
});

test('expandir + reconstruirXref deja legible un PDF con object streams truncado (pdf-lib lo carga, 1 página)', async () => {
  const r = reconstruirXref(await expandirObjectStreams(pdfConObjStm(), inflar));
  assert.ok(r, 'reconstruirXref devolvió null');
  const doc = await PDFDocument.load(r);
  assert.equal(doc.getPageCount(), 1);
});
