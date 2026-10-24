import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlPermitida, nombreDeHtml } from '../src/comun/herramientas/html.mjs';

test('urlPermitida: solo http y https, con espacios recortados; añade https:// si falta el esquema', () => {
  assert.equal(urlPermitida('https://ejemplo.cl/pagina'), 'https://ejemplo.cl/pagina');
  assert.equal(urlPermitida('  http://ejemplo.cl  '), 'http://ejemplo.cl/');
  assert.equal(urlPermitida('ejemplo.cl/x'), 'https://ejemplo.cl/x');
  assert.equal(urlPermitida('file:///etc/passwd'), null);
  assert.equal(urlPermitida('javascript:alert(1)'), null);
  assert.equal(urlPermitida(''), null);
  assert.equal(urlPermitida('no es una url'), null);
});

test('nombreDeHtml: del host de la URL o del nombre del archivo, siempre .pdf', () => {
  assert.equal(nombreDeHtml('url', 'https://www.ejemplo.cl/ruta/pagina.html'), 'www.ejemplo.cl - página web.pdf');
  assert.equal(nombreDeHtml('archivo', 'C:\\docs\\prueba.html'), 'prueba.pdf');
  assert.equal(nombreDeHtml('archivo', '/tmp/informe.htm'), 'informe.pdf');
});
