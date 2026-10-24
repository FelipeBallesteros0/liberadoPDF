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

// Formato real por los bytes mágicos (la extensión miente a veces): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/bmp' | null.
export function tipoPorBytes(bytes) {
  const b = bytes;
  if (!b || b.length < 4) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  return null;
}

// Tag Orientation (0x0112) del EXIF de un JPEG: 1–8; 1 si no hay EXIF o no se puede leer.
export function orientacionExif(bytes) {
  const b = bytes;
  if (!b || b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marcador = b[i + 1];
    const largo = (b[i + 2] << 8) | b[i + 3];
    if (marcador === 0xda || marcador === 0xd9) break; // empieza la imagen: ya no hay EXIF
    if (marcador === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // cabecera TIFF
      const be = b[t] === 0x4d && b[t + 1] === 0x4d;
      const u16 = o => (be ? (b[o] << 8) | b[o + 1] : b[o] | (b[o + 1] << 8));
      const u32 = o => (be ? ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0 : (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0);
      const ifd = t + u32(t + 4);
      if (ifd + 2 > b.length) return 1;
      const n = u16(ifd);
      for (let k = 0; k < n; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > b.length) return 1;
        if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : 1; }
      }
      return 1;
    }
    i += 2 + largo;
  }
  return 1;
}

// nombre: 'A4' | 'Carta' | 'imagen' (tamaño de la imagen en puntos a 72 ppp); orientacion: 'vertical' | 'horizontal' | 'auto'.
export function tamanoDePagina(nombre, orientacion, imagen = { ancho: 595.28, alto: 841.89 }) {
  if (nombre === 'imagen') return [imagen.ancho, imagen.alto];
  const [a, b] = TAMANOS[nombre] ?? TAMANOS.A4;
  const apaisada = orientacion === 'horizontal' || (orientacion === 'auto' && imagen.ancho > imagen.alto);
  return apaisada ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
}
