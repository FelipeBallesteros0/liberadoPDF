import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mimeDe, resolverRutaApp } from '../src/comun/rutas.mjs';

const raices = [{ prefijo: '/vendor/pdfjs/', carpeta: path.resolve('/r/vendor/pdfjs') }, { prefijo: '/', carpeta: path.resolve('/r/src/renderer') }];

test('mime por extensión', () => {
  assert.equal(mimeDe('viewer.mjs'), 'text/javascript');
  assert.equal(mimeDe('a.pdf'), 'application/pdf');
  assert.equal(mimeDe('x.bcmap'), 'application/octet-stream');
  assert.equal(mimeDe('sinextension'), 'application/octet-stream');
});

test('resolver dentro de las raíces y rechazar escapes', () => {
  assert.deepEqual(resolverRutaApp('/vendor/pdfjs/web/viewer.mjs', raices), { archivo: path.resolve('/r/vendor/pdfjs/web/viewer.mjs'), mime: 'text/javascript' });
  assert.deepEqual(resolverRutaApp('/visor.html', raices), { archivo: path.resolve('/r/src/renderer/visor.html'), mime: 'text/html' });
  assert.equal(resolverRutaApp('/', raices).archivo, path.resolve('/r/src/renderer/inicio.html'));
  assert.equal(resolverRutaApp('/vendor/pdfjs/../../secreto', raices), null);
  assert.equal(resolverRutaApp('/%2e%2e/%2e%2e/etc/passwd', raices), null);
  assert.equal(resolverRutaApp('/vendor/pdfjs/web/locale/es-ES/viewer.ftl', raices).mime, 'text/plain');
});
