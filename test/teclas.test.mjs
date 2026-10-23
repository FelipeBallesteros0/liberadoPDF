import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionDeTecla } from '../src/comun/teclas.mjs';

const ev = (key, extra = {}) => ({ key, code: key, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...extra });
const ventana = { modo: 'ventana', enEntrada: false, digitos: '' };
const presentacion = { modo: 'presentacion', enEntrada: false, digitos: '' };

test('navegación básica y por lámina', () => {
  for (const k of ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']) assert.equal(accionDeTecla(ev(k), ventana).accion, 'siguiente', k);
  for (const k of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) assert.equal(accionDeTecla(ev(k), presentacion).accion, 'anterior', k);
  assert.equal(accionDeTecla(ev('ArrowRight', { shiftKey: true }), ventana).accion, 'siguienteLamina');
  assert.equal(accionDeTecla(ev('Home'), ventana).accion, 'primera');
  assert.equal(accionDeTecla(ev('End'), ventana).accion, 'ultima');
});

test('dígitos y Enter saltan a la lámina', () => {
  assert.deepEqual(accionDeTecla(ev('7'), ventana), { accion: 'digito', valor: '7' });
  assert.equal(accionDeTecla(ev('Enter'), { ...ventana, digitos: '7' }).accion, 'irALamina');
});

test('teclas de modo: F5 solo en ventana; T, B, W solo en presentación; r/h/s anuladas en presentación', () => {
  assert.equal(accionDeTecla(ev('F5'), ventana).accion, 'presentacion');
  assert.equal(accionDeTecla(ev('F5'), presentacion), null);
  assert.equal(accionDeTecla(ev('t'), presentacion).accion, 'reloj');
  assert.equal(accionDeTecla(ev('t'), ventana), null);
  assert.equal(accionDeTecla(ev('b'), presentacion).accion, 'negro');
  assert.equal(accionDeTecla(ev('w'), presentacion).accion, 'blanco');
  assert.equal(accionDeTecla(ev('r'), presentacion).accion, 'nada');
  assert.equal(accionDeTecla(ev('r'), ventana), null);
  assert.equal(accionDeTecla(ev('n'), ventana).accion, 'nocturno');
});

test('con el foco en un campo de texto no se navega', () => {
  assert.equal(accionDeTecla(ev('PageDown'), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('5'), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('F1'), { ...ventana, enEntrada: true }).accion, 'ayuda');
});

test('atajos con Ctrl y Escape', () => {
  assert.equal(accionDeTecla(ev('o', { ctrlKey: true }), ventana).accion, 'abrir');
  assert.equal(accionDeTecla(ev('n', { ctrlKey: true }), ventana).accion, 'abrirNueva');
  assert.equal(accionDeTecla(ev('Escape'), presentacion), null);
  assert.equal(accionDeTecla(ev('ArrowRight', { ctrlKey: true }), ventana), null);
});
