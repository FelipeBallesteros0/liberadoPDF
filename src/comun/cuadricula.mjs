// Movimiento de la selección en la cuadrícula de láminas (índices 0-based, sin envolver). Lógica pura.
export function moverSeleccion(indice, total, columnas, tecla) {
  const ultimo = Math.max(0, total - 1);
  const cols = Math.max(1, columnas);
  switch (tecla) {
    case 'ArrowRight': return Math.min(indice + 1, ultimo);
    case 'ArrowLeft': return Math.max(indice - 1, 0);
    case 'ArrowDown': return indice + cols <= ultimo ? indice + cols : (indice === ultimo ? ultimo : ultimo);
    case 'ArrowUp': return indice - cols >= 0 ? indice - cols : indice;
    case 'Home': return 0;
    case 'End': return ultimo;
    default: return indice;
  }
}
