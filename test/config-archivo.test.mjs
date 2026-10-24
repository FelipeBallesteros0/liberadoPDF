import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { carpetaDatos, cargarConfig, guardarConfig } from '../src/main/config.js';

test('carpetaDatos: portable si se puede escribir junto al ejecutable, si no userData, y en desarrollo data/ del proyecto', () => {
  const base = { ejecutable: 'C:\\u\\liberadoPDF.exe', raizProyecto: '/p', userData: '/ud' };
  assert.equal(carpetaDatos({ ...base, empaquetada: true, puedeEscribir: () => true }), path.win32.join('C:\\u', 'data'));
  assert.equal(carpetaDatos({ ...base, empaquetada: true, puedeEscribir: () => false }), '/ud');
  assert.equal(carpetaDatos({ ...base, empaquetada: false, puedeEscribir: () => true }), path.join('/p', 'data'));
});

test('cargar: ausente, vacío o corrupto → valores por defecto; guardar: atómico y relee igual', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'liberadopdf-'));
  const archivo = path.join(dir, 'sub', 'config.json');
  assert.equal(cargarConfig(archivo).presentacion.fondo, '#000000');
  guardarConfig(archivo, { presentacion: { bucle: true } });
  assert.ok(existsSync(archivo));
  assert.ok(!existsSync(archivo + '.tmp'));
  assert.equal(cargarConfig(archivo).presentacion.bucle, true);
  writeFileSync(archivo, '{ esto no es json');
  assert.equal(cargarConfig(archivo).presentacion.bucle, false);
  writeFileSync(archivo, '');
  assert.deepEqual(cargarConfig(archivo).recientes, []);
  rmSync(dir, { recursive: true, force: true });
});
