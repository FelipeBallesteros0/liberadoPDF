import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginaDeArgumentos, rutasDeArgumentos } from '../src/comun/argumentos.mjs';

test('paginaDeArgumentos lee --pagina=N y rutasDeArgumentos lo ignora como ruta', () => {
  assert.equal(paginaDeArgumentos(['exe', '.', 'C:\\x y.pdf', '--pagina=7']), 7);
  assert.equal(paginaDeArgumentos(['exe', 'a.pdf']), null);
  assert.equal(paginaDeArgumentos(['exe', '--pagina=0']), null);
  assert.equal(paginaDeArgumentos(['exe', '--pagina=abc']), null);
  const r = rutasDeArgumentos(['exe', '/x/ñandú #2.pdf', '--pagina=3'], { empaquetada: true, existe: () => true, cwd: '/' });
  assert.deepEqual(r.rutas, ['/x/ñandú #2.pdf']);
});
