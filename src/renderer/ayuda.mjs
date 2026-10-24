// Ayuda de teclas (F1): tabla fija en español según §4.5 del diseño.
import { raizDeCapas } from './capas.mjs';
import { t } from './i18n.mjs';
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
  ['L / S / D', 'Puntero láser / foco / dibujo (en presentación); C limpia, Ctrl+Z deshace'],
  ['G / Tab', 'Cuadrícula de láminas'],
  ['N', 'Modo nocturno'],
  ['Ctrl + O / Ctrl + N', 'Abrir / abrir en una ventana nueva'],
  ['Ctrl + S / Ctrl + Mayús + G', 'Guardar / guardar como'],
  ['Ctrl + Mayús + S', 'Instantánea al portapapeles'],
  ['Ctrl + Mayús + P', 'Vista de presentador'],
  ['Ctrl + ,', 'Ajustes'],
  ['Ctrl + F', 'Buscar (pdf.js)'],
  ['Ctrl + P', 'Imprimir'],
  ['F1', 'Esta ayuda'],
  ['Videos del PDF', 'Se reproducen solos, sin audio, sobre su rectángulo (Movie, Screen y RichMedia/media9); clic para pausar o reanudar; opciones en Ajustes'],
  ['Menú Herramientas', 'Unir (37), dividir (38), organizar (39), rotar (40), numerar (41), marca de agua (42), recortar (43), PDF a imágenes (44), imágenes a PDF (45), HTML a PDF (46), aplanar (47), metadatos (48), proteger (49), desbloquear (50), reparar (51), OCR (52) y comprimir (53): el resultado va siempre a un archivo nuevo'],
];

let capa = null;

export function mostrarAyuda() {
  if (capa) return;
  capa = document.createElement('div');
  capa.className = 'liberadopdf-ayuda';
  const tabla = document.createElement('table');
  for (const [tecla, que] of FILAS) {
    const fila = tabla.insertRow();
    fila.insertCell().textContent = t(tecla);
    fila.insertCell().textContent = t(que);
  }
  const titulo = document.createElement('h2');
  titulo.textContent = t('Teclas de liberadoPDF');
  const pie = document.createElement('p');
  pie.textContent = t('Esc o clic para cerrar. Los clickers envían PgUp / PgDn.');
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
