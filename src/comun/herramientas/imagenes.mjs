// PDF ↔ imágenes: escalas, tamaños de página y encaje proporcional. Unidades PDF (1/72 in). Lógica pura.
export const TAMANOS = { A4: [595.28, 841.89], Carta: [612, 792] };

export function escalaParaPpp(ppp) {
  return (Number(ppp) || 72) / 72;
}

// Encaja la imagen en la página menos los márgenes, proporcional y centrada.
export function ajustarEnPagina({ anchoImagen, altoImagen, anchoPagina, altoPagina, margen = 0 }) {
  const disponibleAncho = Math.max(1, anchoPagina - 2 * margen);
  const disponibleAlto = Math.max(1, altoPagina - 2 * margen);
  const factor = Math.min(disponibleAncho / anchoImagen, disponibleAlto / altoImagen);
  const ancho = anchoImagen * factor, alto = altoImagen * factor;
  return { x: (anchoPagina - ancho) / 2, y: (altoPagina - alto) / 2, ancho, alto };
}

// nombre: 'A4' | 'Carta' | 'imagen' (tamaño de la imagen en puntos a 72 ppp); orientacion: 'vertical' | 'horizontal' | 'auto'.
export function tamanoDePagina(nombre, orientacion, imagen = { ancho: 595.28, alto: 841.89 }) {
  if (nombre === 'imagen') return [imagen.ancho, imagen.alto];
  const [a, b] = TAMANOS[nombre] ?? TAMANOS.A4;
  const apaisada = orientacion === 'horizontal' || (orientacion === 'auto' && imagen.ancho > imagen.alto);
  return apaisada ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
}
