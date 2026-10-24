// Notas del presentador: archivo <pdf>.notas.txt con bloques «## N» (N = etiqueta de lámina). Lógica pura.
const CABECERA = /^#{1,3}\s*(\d+)\b.*$/;

export function parsearNotas(texto) {
  const notas = new Map();
  if (typeof texto !== 'string') return notas;
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/);
  let actual = null;
  let acumulado = [];
  const cerrar = () => { if (actual !== null) notas.set(actual, acumulado.join('\n').trim()); };
  for (const linea of lineas) {
    const m = linea.match(CABECERA);
    if (m) { cerrar(); actual = m[1]; acumulado = []; }
    else if (actual !== null) acumulado.push(linea);
  }
  cerrar();
  return notas;
}

export function notaDe(notas, posicion) {
  if (!notas || !posicion) return '';
  return notas.get(String(posicion.etiqueta)) ?? notas.get(String(posicion.lamina)) ?? '';
}
