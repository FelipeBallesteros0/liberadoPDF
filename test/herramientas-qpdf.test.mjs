import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argumentosDeCifrado, argumentosDeDescifrado } from '../src/comun/herramientas/qpdf.mjs';

test('argumentosDeCifrado usa la forma con nombre: una contraseña que empieza por @ no es un archivo de argumentos', () => {
  const args = argumentosDeCifrado({ usuario: '@x', propietario: '@y z', imprimir: true, copiar: false, modificar: false });
  assert.deepEqual(args, ['--encrypt', '--user-password=@x', '--owner-password=@y z', '--bits=256', '--print=full', '--extract=n', '--modify=none', '--', 'entrada.pdf', 'salida.pdf']);
  assert.ok(args.every(a => !a.startsWith('@')));
});

test('argumentosDeCifrado: permisos y contraseña de apertura vacía', () => {
  const args = argumentosDeCifrado({ usuario: '', propietario: 'p', imprimir: false, copiar: true, modificar: true });
  assert.ok(args.includes('--user-password=') && args.includes('--print=none') && args.includes('--extract=y') && args.includes('--modify=all'));
});

test('argumentosDeDescifrado', () => {
  assert.deepEqual(argumentosDeDescifrado('@clave'), ['--password=@clave', '--decrypt', 'entrada.pdf', 'salida.pdf']);
});
