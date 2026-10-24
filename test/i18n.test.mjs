import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { crearTraductor, IDIOMAS, claveDeIdioma } from '../src/comun/i18n.mjs';
import { en } from '../src/comun/i18n/en.mjs';

test('crearTraductor: en inglés traduce, en español devuelve el texto, y una clave ausente queda en español', () => {
  const tEn = crearTraductor('en');
  assert.equal(tEn('Unir PDF…'), 'Merge PDF…');
  assert.equal(tEn('Texto que no existe en el diccionario'), 'Texto que no existe en el diccionario');
  assert.equal(crearTraductor('es')('Unir PDF…'), 'Unir PDF…');
  assert.equal(crearTraductor('xx')('Unir PDF…'), 'Merge PDF…'); // idioma raro → inglés (el por defecto)
});

test('t sustituye parámetros {clave} en los dos idiomas', () => {
  assert.equal(crearTraductor('en')('Página {n} / {total}', { n: 2, total: 4 }), 'Page 2 / 4');
  assert.equal(crearTraductor('es')('Página {n} / {total}', { n: 2, total: 4 }), 'Página 2 / 4');
  assert.equal(crearTraductor('en')('Guardado en {ruta}', { ruta: 'C:\\x.pdf' }), 'Saved in C:\\x.pdf');
});

test('IDIOMAS y claveDeIdioma (la variable de entorno solo manda en modo humo)', () => {
  assert.deepEqual(IDIOMAS, ['en', 'es']);
  assert.equal(claveDeIdioma({ idioma: 'es' }, {}), 'es');
  assert.equal(claveDeIdioma({ idioma: 'en' }, { LIBERADOPDF_HUMO: '/x', LIBERADOPDF_IDIOMA: 'es' }), 'es');
  assert.equal(claveDeIdioma({ idioma: 'en' }, { LIBERADOPDF_IDIOMA: 'es' }), 'en');
  assert.equal(claveDeIdioma({}, {}), 'en');
});

// Cobertura: toda clave literal usada con t('…') en el código tiene traducción al inglés.
function archivosDe(carpeta) {
  const salida = [];
  for (const nombre of readdirSync(carpeta)) {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta));
    else if (/\.(mjs|js|cjs|html)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}
test('toda clave t(\'…\') del código tiene entrada en en.mjs', () => {
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'src');
  const faltan = new Set();
  let usadas = 0;
  for (const archivo of archivosDe(raiz)) {
    const texto = readFileSync(archivo, 'utf8');
    for (const m of texto.matchAll(/\bt\((?:'((?:[^'\\]|\\.)*)'|`([^`$]*)`)/g)) {
      const clave = (m[1] ?? m[2]).replace(/\\'/g, "'");
      usadas++;
      if (!(clave in en)) faltan.add(clave);
    }
  }
  assert.deepEqual([...faltan], [], `${faltan.size} claves sin traducción (de ${usadas})`);
});
