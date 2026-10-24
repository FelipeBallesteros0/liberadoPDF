// Mapa de teclas de liberadoPDF (§4.5 del diseño). Lógica pura: recibe un evento simplificado y el contexto.
// Devuelve { accion, valor? } cuando la tecla es de liberadoPDF (y hay que detenerla) o null si no lo es.

const SIGUIENTE = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const ANTERIOR = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']);
const ANULADAS_EN_PRESENTACION = new Set(['r', 'h']); // rotar y mano de pdf.js (s pasa a ser foco)

export function accionDeTecla(ev, { modo, enEntrada, digitos = '' }) {
  const { key, shiftKey, ctrlKey, altKey, metaKey } = ev;
  const minuscula = typeof key === 'string' ? key.toLowerCase() : '';

  if (ctrlKey && shiftKey && !altKey && !metaKey) {
    if (minuscula === 's') return modo === 'ventana' ? { accion: 'instantanea' } : null;
    if (minuscula === 'g') return modo === 'ventana' ? { accion: 'guardarComo' } : null;
    return null;
  }
  if (ctrlKey && !altKey && !metaKey && !shiftKey) {
    if (minuscula === 'z' && modo === 'presentacion') return { accion: 'deshacerDibujo' };
    if (minuscula === 'o') return { accion: 'abrir' };
    if (minuscula === 's') return modo === 'ventana' ? { accion: 'guardar' } : null;
    if (minuscula === 'n') return { accion: 'abrirNueva' };
    if (key === ',') return { accion: 'ajustes' };
    return null;
  }
  if (altKey || metaKey || ctrlKey) return null;
  if (key === 'F1') return { accion: 'ayuda' };
  if (key === 'Tab') return { accion: 'cuadricula' };
  if (key === 'Escape') return null; // lo maneja pdf.js (salir de presentación)
  if (key === 'F5') return modo === 'ventana' ? { accion: 'presentacion' } : null;
  if (enEntrada) return null; // el foco está en un campo de texto: pdf.js lo necesita

  if (shiftKey) {
    if (key === 'ArrowRight') return { accion: 'siguienteLamina' };
    if (key === 'ArrowLeft') return { accion: 'anteriorLamina' };
    if (modo === 'presentacion' && minuscula === 'r') return { accion: 'nada' };
    return null;
  }
  if (SIGUIENTE.has(key)) return { accion: 'siguiente' };
  if (key === 'Enter') return digitos ? { accion: 'irALamina' } : { accion: 'siguiente' };
  if (ANTERIOR.has(key)) return { accion: 'anterior' };
  if (key === 'Home') return { accion: 'primera' };
  if (key === 'End') return { accion: 'ultima' };
  if (/^[0-9]$/.test(key)) return { accion: 'digito', valor: key };
  if (minuscula === 'n') return { accion: 'nocturno' };
  if (minuscula === 'g') return { accion: 'cuadricula' };
  if (modo === 'presentacion') {
    if (minuscula === 't') return { accion: 'reloj' };
    if (minuscula === 'b') return { accion: 'negro' };
    if (minuscula === 'w') return { accion: 'blanco' };
    if (minuscula === 'l') return { accion: 'laser' };
    if (minuscula === 's') return { accion: 'foco' };
    if (minuscula === 'd') return { accion: 'dibujo' };
    if (minuscula === 'c') return { accion: 'limpiarDibujo' };
    if (ANULADAS_EN_PRESENTACION.has(minuscula)) return { accion: 'nada' };
  }
  return null;
}
