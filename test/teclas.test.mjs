import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionDeTecla, conTeclasDeMac } from '../src/comun/teclas.mjs';

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

test('N alterna nocturno; Ctrl+Mayús+S es instantánea solo en ventana; Ctrl+, abre ajustes', () => {
  assert.equal(accionDeTecla(ev('n'), presentacion).accion, 'nocturno');
  assert.equal(accionDeTecla(ev('S', { ctrlKey: true, shiftKey: true }), ventana).accion, 'instantanea');
  assert.equal(accionDeTecla(ev('S', { ctrlKey: true, shiftKey: true }), presentacion), null);
  assert.equal(accionDeTecla(ev(',', { ctrlKey: true }), ventana).accion, 'ajustes');
});

test('Ctrl+S guarda y Ctrl+Mayús+G guarda como, solo en ventana', () => {
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), ventana).accion, 'guardar');
  assert.equal(accionDeTecla(ev('G', { ctrlKey: true, shiftKey: true }), ventana).accion, 'guardarComo');
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), presentacion).accion, 'nada');
});

test('L, S, D, C y Ctrl+Z solo en presentación', () => {
  assert.equal(accionDeTecla(ev('l'), presentacion).accion, 'laser');
  assert.equal(accionDeTecla(ev('s'), presentacion).accion, 'foco');
  assert.equal(accionDeTecla(ev('d'), presentacion).accion, 'dibujo');
  assert.equal(accionDeTecla(ev('c'), presentacion).accion, 'limpiarDibujo');
  assert.equal(accionDeTecla(ev('z', { ctrlKey: true }), presentacion).accion, 'deshacerDibujo');
  for (const k of ['l', 'd', 'c']) assert.equal(accionDeTecla(ev(k), ventana), null, k);
  assert.equal(accionDeTecla(ev('z', { ctrlKey: true }), ventana), null);
});

test('G y Tab abren la cuadrícula en ambos modos', () => {
  assert.equal(accionDeTecla(ev('g'), ventana).accion, 'cuadricula');
  assert.equal(accionDeTecla(ev('Tab'), presentacion).accion, 'cuadricula');
});

test('Ctrl+Mayús+P abre la vista de presentador', () => {
  assert.equal(accionDeTecla(ev('P', { ctrlKey: true, shiftKey: true }), ventana).accion, 'presentador');
  assert.equal(accionDeTecla(ev('P', { ctrlKey: true, shiftKey: true }), presentacion).accion, 'presentador');
});

test('Tab en un campo de texto no abre la cuadrícula (I1) y Ctrl+S en presentación no llega a pdf.js (M5)', () => {
  assert.equal(accionDeTecla(ev('Tab'), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('Tab', { shiftKey: true }), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), presentacion).accion, 'nada');
});

test('macOS: los atajos van con Cmd (metaKey) y Ctrl deja de servir', () => {
  const mac = { modo: 'ventana', enEntrada: false, mac: true };
  assert.equal(accionDeTecla(ev('s', { metaKey: true }), mac).accion, 'guardar');
  assert.equal(accionDeTecla(ev(',', { metaKey: true }), mac).accion, 'ajustes');
  assert.equal(accionDeTecla(ev('p', { metaKey: true, shiftKey: true }), mac).accion, 'presentador');
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), mac), null);
  assert.equal(accionDeTecla(ev('s', { metaKey: true }), { modo: 'ventana', enEntrada: false }), null);
});

test('conTeclasDeMac: Ctrl → Cmd solo en macOS, sin tocar palabras que contienen «Ctrl»', () => {
  assert.equal(conTeclasDeMac('Ctrl + Mayús + P', true), 'Cmd + Mayús + P');
  assert.equal(conTeclasDeMac('F1: keys · Ctrl+O: open · Ctrl+N: new window', true), 'F1: keys · Cmd+O: open · Cmd+N: new window');
  assert.equal(conTeclasDeMac('Ctrl + S', false), 'Ctrl + S');
  assert.equal(conTeclasDeMac('CtrlAlt', true), 'CtrlAlt');
});
