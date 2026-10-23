// Mapa de teclas de liberadoPDF (§4.5 del diseño). Lógica pura: recibe un evento simplificado y el contexto.
// Devuelve { accion, valor? } cuando la tecla es de liberadoPDF (y hay que detenerla) o null si no lo es.

const SIGUIENTE = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const ANTERIOR = new Set(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']);
const ANULADAS_EN_PRESENTACION = new Set(['r', 'h', 's']); // rotar, mano y selección de pdf.js

export function accionDeTecla(ev, { modo, enEntrada, digitos = '' }) {
  const { key, shiftKey, ctrlKey, altKey, metaKey } = ev;
  const minuscula = typeof key === 'string' ? key.toLowerCase() : '';

  if (ctrlKey && !altKey && !metaKey && !shiftKey) {
    if (minuscula === 'o') return { accion: 'abrir' };
    if (minuscula === 'n') return { accion: 'abrirNueva' };
    return null;
  }
  if (altKey || metaKey || ctrlKey) return null;
  if (key === 'F1') return { accion: 'ayuda' };
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
  if (modo === 'presentacion') {
    if (minuscula === 't') return { accion: 'reloj' };
    if (minuscula === 'b') return { accion: 'negro' };
    if (minuscula === 'w') return { accion: 'blanco' };
    if (ANULADAS_EN_PRESENTACION.has(minuscula)) return { accion: 'nada' };
  }
  return null;
}
