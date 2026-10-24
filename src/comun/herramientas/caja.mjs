// Zona visible de una página: el CropBox (si lo hay) intersecado con el MediaBox. Lógica pura.
export function cajaVisible({ mediaBox, cropBox }) {
  const m = mediaBox;
  if (!cropBox) return { x: m.x, y: m.y, ancho: m.width, alto: m.height };
  const x0 = Math.max(m.x, cropBox.x), y0 = Math.max(m.y, cropBox.y);
  const x1 = Math.min(m.x + m.width, cropBox.x + cropBox.width), y1 = Math.min(m.y + m.height, cropBox.y + cropBox.height);
  if (!(x1 > x0) || !(y1 > y0)) return { x: m.x, y: m.y, ancho: m.width, alto: m.height };
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 };
}
