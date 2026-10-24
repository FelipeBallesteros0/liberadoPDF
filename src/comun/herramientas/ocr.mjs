// OCR: geometría de las palabras reconocidas y texto apto para Helvetica (WinAnsi). Lógica pura.
export function palabrasDeBloques(bloques) {
  const palabras = [];
  for (const b of bloques ?? []) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const w of l.words ?? []) palabras.push(w);
  return palabras;
}

// palabras: [{ text, bbox: { x0, y0, x1, y1 } }] en píxeles de la imagen (origen arriba-izquierda);
// escala = píxeles por unidad PDF; devuelve cajas en unidades PDF con origen abajo-izquierda.
export function palabrasAPdf(palabras, { escala, altoPagina }) {
  const e = escala || 1;
  const salida = [];
  for (const p of palabras ?? []) {
    const texto = String(p.text ?? '').trim();
    const { x0, y0, x1, y1 } = p.bbox ?? {};
    if (!texto || !(x1 > x0) || !(y1 > y0)) continue;
    salida.push({ texto, x: x0 / e, y: altoPagina - y1 / e, ancho: (x1 - x0) / e, alto: (y1 - y0) / e });
  }
  return salida;
}

export function tamanoDeFuente(anchoCaja, anchoTextoA1pt) {
  if (!(anchoTextoA1pt > 0)) return 2;
  return Math.max(2, Math.min(200, anchoCaja / anchoTextoA1pt));
}

// Caracteres que Helvetica (WinAnsiEncoding) puede escribir; el resto se sustituye por «?».
const WINANSI = /[ -~ -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;
export function textoWinAnsi(texto) {
  return Array.from(String(texto ?? ''), c => (WINANSI.test(c) ? c : '?')).join('');
}
