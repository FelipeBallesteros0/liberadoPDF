// Ayuda de teclas (F1): tabla fija en español según §4.5 del diseño.
import { raizDeCapas } from './capas.mjs';
const FILAS = [
  ['→ ↓ PgDn Espacio Enter', 'Página siguiente'],
  ['← ↑ PgUp Retroceso', 'Página anterior'],
  ['Mayús + → / ←', 'Lámina siguiente / anterior (salta los pasos)'],
  ['Inicio / Fin', 'Primera / última página'],
  ['número + Enter', 'Ir a esa lámina'],
  ['F5 / doble clic', 'Entrar en presentación'],
  ['Esc', 'Salir de presentación, cerrar esta ayuda'],
  ['T', 'Reloj y cronómetro (en presentación)'],
  ['B / W', 'Pantalla en negro / en blanco (en presentación)'],
  ['N', 'Modo nocturno'],
  ['Ctrl + O / Ctrl + N', 'Abrir / abrir en una ventana nueva'],
  ['Ctrl + F', 'Buscar (pdf.js)'],
  ['Ctrl + P', 'Imprimir'],
  ['F1', 'Esta ayuda'],
];

let capa = null;

export function mostrarAyuda() {
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'liberadopdf-ayuda';
  const tabla = document.createElement('table');
  for (const [tecla, que] of FILAS) {
    const fila = tabla.insertRow();
    fila.insertCell().textContent = tecla;
    fila.insertCell().textContent = que;
  }
  const titulo = document.createElement('h2');
  titulo.textContent = 'Teclas de liberadoPDF';
  const pie = document.createElement('p');
  pie.textContent = 'Esc o clic para cerrar. Los clickers envían PgUp / PgDn.';
  capa.append(titulo, tabla, pie);
  capa.addEventListener('click', ocultarAyuda);
  raizDeCapas().append(capa);
  window.addEventListener('keydown', cerrarConEscape, { capture: true });
}

function cerrarConEscape(ev) {
  if (ev.key === 'Escape') { ev.stopImmediatePropagation(); ocultarAyuda(); }
}

export function ocultarAyuda() {
  if (!capa) return;
  capa.remove();
  capa = null;
  window.removeEventListener('keydown', cerrarConEscape, { capture: true });
}

export function alternarAyuda() {
  if (capa) ocultarAyuda(); else mostrarAyuda();
}
