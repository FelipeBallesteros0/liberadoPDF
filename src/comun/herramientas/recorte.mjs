// Caja de recorte a partir de un arrastre sobre la página pintada por pdf.js. Lógica pura.
// `vista` = { escala, rotacion, ancho, alto } del viewport (píxeles CSS); `view` = [x0, y0, x1, y1] del CropBox actual.
import { puntosAPdf } from '../medicion.mjs';

const redondear = v => Math.round(v * 100) / 100;

export function cajaDeArrastre({ inicio, fin, vista, view }) {
  const altoSinGirar = view[3] - view[1];
  const esquinas = [inicio, fin].map(p => {
    const q = puntosAPdf(p, vista); // unidades PDF, origen arriba-izquierda de la página sin girar
    return { x: view[0] + q.x, y: view[1] + (altoSinGirar - q.y) };
  });
  const x = Math.min(esquinas[0].x, esquinas[1].x), y = Math.min(esquinas[0].y, esquinas[1].y);
  return { x: redondear(x), y: redondear(y), ancho: redondear(Math.abs(esquinas[1].x - esquinas[0].x)), alto: redondear(Math.abs(esquinas[1].y - esquinas[0].y)) };
}

// null si la caja sirve; si no, el motivo.
export function cajaValida(caja, view) {
  if (!(caja.ancho >= 1) || !(caja.alto >= 1)) return 'La zona está vacía: marca un rectángulo mayor.';
  const margen = 0.01;
  if (caja.x < view[0] - margen || caja.y < view[1] - margen || caja.x + caja.ancho > view[2] + margen || caja.y + caja.alto > view[3] + margen) return 'La zona queda fuera de la página.';
  return null;
}
