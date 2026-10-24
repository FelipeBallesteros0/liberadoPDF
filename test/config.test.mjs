import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valoresPorDefecto, normalizarConfig, agregarReciente, fusionarConfigGuardada, MAX_RECIENTES } from '../src/comun/config.mjs';

test('valores por defecto', () => {
  const c = valoresPorDefecto();
  assert.equal(c.presentacion.avanceSegundos, 0);
  assert.equal(c.presentacion.fondo, '#000000');
  assert.deepEqual(c.recientes, []);
});

test('normalizar: entradas rotas vuelven a los valores por defecto sin perder lo válido', () => {
  assert.deepEqual(normalizarConfig(undefined), valoresPorDefecto());
  assert.deepEqual(normalizarConfig(null), valoresPorDefecto());
  const c = normalizarConfig({ presentacion: { bucle: true, fondo: 42 }, nocturno: 'si', desconocida: 1, recientes: [{ ruta: 'a.pdf' }, { sinRuta: true }, { ruta: '' }] });
  assert.equal(c.presentacion.bucle, true);
  assert.equal(c.presentacion.fondo, '#000000');
  assert.equal(c.nocturno, false);
  assert.equal('desconocida' in c, false);
  assert.deepEqual(c.recientes.map(r => r.ruta), ['a.pdf']);
});

test('agregarReciente: primero, sin duplicados, máximo 10', () => {
  let lista = [];
  for (let i = 1; i <= 12; i++) lista = agregarReciente(lista, { ruta: `C:\\x\\${i}.pdf`, nombre: `${i}.pdf`, fecha: i });
  assert.equal(lista.length, MAX_RECIENTES);
  assert.equal(lista[0].ruta, 'C:\\x\\12.pdf');
  const otra = agregarReciente(lista, { ruta: 'C:\\x\\5.pdf', nombre: '5.pdf', fecha: 99 });
  assert.equal(otra[0].ruta, 'C:\\x\\5.pdf');
  assert.equal(otra.filter(r => r.ruta === 'C:\\x\\5.pdf').length, 1);
  assert.equal(lista[0].ruta, 'C:\\x\\12.pdf', 'no muta la entrada');
});

test('fondo: solo colores #rrggbb', () => {
  assert.equal(normalizarConfig({ presentacion: { fondo: 'rojo' } }).presentacion.fondo, '#000000');
  assert.equal(normalizarConfig({ presentacion: { fondo: '#1A2b3C' } }).presentacion.fondo, '#1A2b3C');
});

test('porDocumento conserva los objetos por ruta (calibración, notas a la derecha) y descarta lo demás', () => {
  const c = normalizarConfig({ porDocumento: { 'a.pdf': { notasDerecha: true, calibracion: 2 }, 'b.pdf': 5 } });
  assert.deepEqual(c.porDocumento, { 'a.pdf': { notasDerecha: true, calibracion: 2 } });
});

test('monitorPresentacion y monitorPresentador admiten "auto" o un id entero (C1 de la revisión)', () => {
  assert.equal(normalizarConfig({ monitorPresentacion: 7, monitorPresentador: 'auto' }).monitorPresentacion, 7);
  assert.equal(normalizarConfig({ monitorPresentacion: 'x' }).monitorPresentacion, 'auto');
  assert.equal(normalizarConfig({ monitorPresentador: 2.5 }).monitorPresentador, 'auto');
});

test('fusionarConfigGuardada: los recientes son del main y porDocumento se fusiona por clave (I3)', () => {
  const base = normalizarConfig({ recientes: [{ ruta: 'nuevo.pdf', nombre: 'nuevo.pdf', fecha: 2 }], porDocumento: { 'a.pdf': { calibracion: 2 } }, nocturno: false });
  const parcial = { recientes: [], porDocumento: { 'b.pdf': { notasDerecha: true } }, nocturno: true };
  const r = fusionarConfigGuardada(base, parcial);
  assert.deepEqual(r.recientes.map(x => x.ruta), ['nuevo.pdf']);
  assert.deepEqual(r.porDocumento, { 'a.pdf': { calibracion: 2 }, 'b.pdf': { notasDerecha: true } });
  assert.equal(r.nocturno, true);
  assert.equal(fusionarConfigGuardada(base, { presentacion: { bucle: true } }).presentacion.fondo, '#000000');
});

test('idioma: inglés por defecto, español si se pide, cualquier otra cosa vuelve a inglés', () => {
  assert.equal(normalizarConfig({}).idioma, 'en');
  assert.equal(normalizarConfig({ idioma: 'es' }).idioma, 'es');
  assert.equal(normalizarConfig({ idioma: 'fr' }).idioma, 'en');
  assert.equal(normalizarConfig({ idioma: 7 }).idioma, 'en');
});
