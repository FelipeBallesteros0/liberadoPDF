// Estado del organizador de páginas: [{ origen: número de página 1-based | null (en blanco), rotacion: 0|90|180|270 }].
// Todas las funciones devuelven un estado nuevo sin mutar el recibido. Lógica pura.
const copia = estado => estado.map(p => ({ ...p }));

export function estadoInicial(total) {
  return Array.from({ length: total }, (_, i) => ({ origen: i + 1, rotacion: 0 }));
}

export function mover(estado, desde, hasta) {
  const e = copia(estado);
  if (desde === hasta || desde < 0 || hasta < 0 || desde >= e.length || hasta >= e.length) return e;
  const [p] = e.splice(desde, 1);
  e.splice(hasta, 0, p);
  return e;
}

export function rotarPagina(estado, i) {
  const e = copia(estado);
  if (e[i]) e[i].rotacion = (e[i].rotacion + 90) % 360;
  return e;
}

export function borrar(estado, i) {
  const e = copia(estado);
  e.splice(i, 1);
  return e;
}

export function insertarBlanco(estado, i) {
  const e = copia(estado);
  e.splice(Math.max(0, Math.min(i, e.length)), 0, { origen: null, rotacion: 0 });
  return e;
}

export function duplicar(estado, i) {
  const e = copia(estado);
  if (e[i]) e.splice(i + 1, 0, { ...e[i] });
  return e;
}

export function planDeOrganizacion(estado) {
  return estado.map(p => ({ origen: p.origen, rotacion: p.rotacion }));
}
