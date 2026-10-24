// Videos dentro del PDF: rectángulo en pantalla, opciones de reproducción y formato. Lógica pura, sin Node (la usan el worker y el renderer).

// /Rect del PDF → caja CSS dentro del .page de pdf.js: se convierten las dos esquinas con convertToViewportPoint
// (el viewport ya sabe de escala, rotación y origen del CropBox) y se normalizan.
export function rectanguloEnPagina(rect, viewport) {
  const [ax, ay] = viewport.convertToViewportPoint(rect[0], rect[1]);
  const [bx, by] = viewport.convertToViewportPoint(rect[2], rect[3]);
  return { left: Math.min(ax, bx), top: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
}

export function opcionesDeReproduccion(anotacion, config) {
  const defecto = config?.video ?? { autoarranque: true, bucle: true };
  const elegir = (propio, porDefecto) => (typeof propio === 'boolean' ? propio : porDefecto);
  return { autoarranque: elegir(anotacion?.autoarranque, defecto.autoarranque !== false), bucle: elegir(anotacion?.bucle, defecto.bucle !== false) };
}

export function mimeDeVideo(bytes) {
  const b = bytes;
  if (!b || b.length < 8) return null;
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'video/mp4';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  return null;
}
