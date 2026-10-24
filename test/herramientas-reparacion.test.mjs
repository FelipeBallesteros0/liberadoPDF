import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { numeroDeCatalogo, objetosDe, reconstruirXref } from '../src/comun/herramientas/reparacion.mjs';

const latin1 = s => new Uint8Array(Buffer.from(s, 'latin1'));
const CUERPO = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] >>\nendobj\n';
const SIN_XREF = '%PDF-1.4\n' + CUERPO; // objetos sanos, sin xref ni trailer (archivo truncado)
const SIN_CATALOGO = '%PDF-1.4\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] >>\nendobj\n';

test('numeroDeCatalogo encuentra el objeto /Type /Catalog aunque falte la xref', () => {
  assert.equal(numeroDeCatalogo(latin1(SIN_XREF)), 1);
  assert.equal(numeroDeCatalogo(latin1('%PDF-1.4\n7 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n')), 7);
  assert.equal(numeroDeCatalogo(latin1(SIN_CATALOGO)), null);
});

test('numeroDeCatalogo recurre al /Root de un trailer o de un XRef stream anterior', () => {
  assert.equal(numeroDeCatalogo(latin1('%PDF-1.5\n9 0 obj\n<< /Type /XRef /Root 12 0 R /Size 20 >>\nstream\nxx\nendstream\nendobj\n')), 12);
  assert.equal(numeroDeCatalogo(latin1('%PDF-1.4\ntrailer\n<< /Size 5 /Root 3 0 R >>\nstartxref\n100\n%%EOF\n%% basura')), 3);
});

test('objetosDe lista número, generación y desplazamiento de cada «N G obj»', () => {
  const objetos = objetosDe(latin1(SIN_XREF));
  assert.deepEqual([...objetos.keys()], [1, 2, 3]);
  assert.equal(objetos.get(1).desplazamiento, 9);
  assert.equal(objetos.get(2).generacion, 0);
  assert.equal(objetosDe(latin1('%PDF-1.4\nnada\n')).size, 0);
});

test('reconstruirXref: un PDF sin xref ni trailer vuelve a ser legible (pdf-lib lo carga, 1 página)', async () => {
  const r = reconstruirXref(latin1(SIN_XREF));
  const texto = Buffer.from(r).toString('latin1');
  assert.ok(texto.startsWith(SIN_XREF));
  assert.match(texto, /xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n/);
  assert.match(texto, /trailer\n<< \/Root 1 0 R \/Size 4 >>\nstartxref\n\d+\n%%EOF/);
  const doc = await PDFDocument.load(r);
  assert.equal(doc.getPageCount(), 1);
});

test('reconstruirXref: sin catálogo lo sintetiza a partir del árbol /Pages raíz', async () => {
  const r = reconstruirXref(latin1(SIN_CATALOGO));
  assert.match(Buffer.from(r).toString('latin1'), /4 0 obj\n<< \/Type \/Catalog \/Pages 2 0 R >>\nendobj/);
  const doc = await PDFDocument.load(r);
  assert.equal(doc.getPageCount(), 1);
});

test('reconstruirXref: null si no hay objetos ni árbol de páginas', () => {
  assert.equal(reconstruirXref(latin1('%PDF-1.4\nnada\n')), null);
  assert.equal(reconstruirXref(latin1('%PDF-1.4\n5 0 obj\n<< /Type /Font >>\nendobj\n')), null);
});
