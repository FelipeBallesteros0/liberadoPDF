import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreSeguro, rutaDeGuardadoComo } from '../src/comun/guardado.mjs';

test('nombreSeguro', () => {
  assert.equal(nombreSeguro('charla: final?.pdf'), 'charla final.pdf');
  assert.equal(nombreSeguro('../x/y'), 'xy.pdf');
  assert.equal(nombreSeguro(''), 'documento.pdf');
});
test('rutaDeGuardadoComo añade (copia) en la misma carpeta', () => {
  assert.equal(rutaDeGuardadoComo('C:\\Charlas\\inmoov.pdf'), 'C:\\Charlas\\inmoov (copia).pdf');
  assert.equal(rutaDeGuardadoComo('/d/inmoov.PDF'), '/d/inmoov (copia).pdf');
});
