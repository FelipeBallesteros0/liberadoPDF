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

test('urlPermitida acepta localhost con puerto e IPv6 entre corchetes', () => {
  assert.equal(urlPermitida('localhost:8080'), 'http://localhost:8080/');
  assert.equal(urlPermitida('localhost:8080/ruta'), 'http://localhost:8080/ruta');
  assert.equal(urlPermitida('http://[::1]:3000/x'), 'http://[::1]:3000/x');
  assert.equal(urlPermitida('[::1]:3000'), 'http://[::1]:3000/');
  assert.equal(urlPermitida('192.168.1.5:8000'), 'http://192.168.1.5:8000/');
  assert.equal(urlPermitida('ejemplo.cl:8443'), 'https://ejemplo.cl:8443/');
});
