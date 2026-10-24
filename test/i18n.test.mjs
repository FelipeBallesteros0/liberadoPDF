import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import * as i18nModulo from '../src/comun/i18n.mjs';
import { fileURLToPath } from 'node:url';
import { CAMPOS } from '../src/comun/ajustes.mjs';
import { FILAS } from '../src/renderer/ayuda.mjs';
const { crearTraductor, IDIOMAS, claveDeIdioma } = i18nModulo;
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
  assert.equal(crearTraductor('en')('Guardado en {ruta}', { ruta: 'C:\\x.pdf' }), 'Saved to C:\\x.pdf');
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
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
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

// Las tablas de datos cuyas cadenas pasan por t() en tiempo de ejecución (no como literal t('…')) también deben estar.
test('las tablas de datos (ayuda, ajustes, mensajes de ruta) tienen sus claves en en.mjs', () => {
  const claves = [];
  for (const [tecla, que] of FILAS) claves.push(tecla, que);
  for (const campo of CAMPOS) {
    claves.push(campo.etiqueta, campo.seccion);
    if (campo.opciones && campo.clave !== 'idioma') for (const [, etiqueta] of campo.opciones) claves.push(etiqueta); // el selector de idioma muestra endónimos
  }
  claves.push('Ruta no válida', 'No existe el archivo', 'No es un PDF', 'Automático');
  const faltan = claves.filter(c => !(c in en));
  assert.deepEqual(faltan, [], `${faltan.length} claves de tablas sin traducción`);
});

test('crearTraductorDeMensajes traduce el mensaje entero o la parte fija antes de «: »', () => {
  const { crearTraductorDeMensajes } = awaitImport();
  const tm = crearTraductorDeMensajes(crearTraductor('en'));
  assert.equal(tm('Contraseña incorrecta'), 'Wrong password');
  assert.equal(tm('No existe el archivo: C:\\x.pdf'), 'The file does not exist: C:\\x.pdf');
  assert.equal(tm('texto sin traducción: detalle'), 'texto sin traducción: detalle');
  assert.equal(crearTraductorDeMensajes(crearTraductor('es'))('No existe el archivo: /x'), 'No existe el archivo: /x');
});
function awaitImport() { return i18nModulo; }

test('plurales: con n = 1 se usa la forma singular en los dos idiomas', () => {
  assert.equal(crearTraductor('es')('{n} archivos', { n: 1 }), '1 archivo');
  assert.equal(crearTraductor('es')('{n} archivos', { n: 2 }), '2 archivos');
  assert.equal(crearTraductor('en')('{n} archivos', { n: 1 }), '1 file');
  assert.equal(crearTraductor('en')('{n} archivos', { n: 3 }), '3 files');
  assert.equal(crearTraductor('en')('Reparado con {n} avisos ({motor})', { n: 1, motor: 'qpdf' }), 'Repaired with 1 warning (qpdf)');
  assert.equal(crearTraductor('es')(', {n} archivos omitidos', { n: 1 }), ', 1 archivo omitido');
  assert.equal(crearTraductor('en')('{p} palabras reconocidas en {n} páginas', { p: 1, n: 1 }), '1 words recognized in 1 page'); // solo n cuenta
});

test('toda clave plural con {n} del diccionario tiene singular en español e inglés', async () => {
  const { singulares } = await import('../src/comun/i18n/singulares.mjs');
  const plurales = Object.keys(en).filter(k => /\{n\} (archivos|páginas|imágenes|avisos)/.test(k) || /{n} páginas$/.test(k));
  const faltan = plurales.filter(k => !(k in singulares.es) || !(k in singulares.en));
  assert.deepEqual(faltan, [], 'sin singular: ' + faltan.join(' | '));
});
