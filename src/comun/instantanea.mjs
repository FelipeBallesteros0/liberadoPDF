// Instantánea: rectángulo de un arrastre con el ratón. Lógica pura.
export function rectanguloDeArrastre(inicio, fin) {
  const x = Math.round(Math.min(inicio.x, fin.x));
  const y = Math.round(Math.min(inicio.y, fin.y));
  const width = Math.round(Math.max(inicio.x, fin.x)) - x;
  const height = Math.round(Math.max(inicio.y, fin.y)) - y;
  if (width < 4 || height < 4) return null;
  return { x, y, width, height };
}
