// Deshace los predictores de /DecodeParms (TIFF 2 y PNG 10–15) de una imagen Flate. Lógica pura.
// Devuelve las muestras planas o null si los datos no cuadran con las filas.
export function despredecir({ datos, predictor, colores = 1, bitsPorComponente = 8, columnas }) {
  if (!(predictor >= 2)) return datos;
  const bpp = Math.max(1, Math.ceil((colores * bitsPorComponente) / 8));
  const anchoFila = Math.ceil((columnas * colores * bitsPorComponente) / 8);
  if (predictor === 2) {
    if (bitsPorComponente !== 8 || datos.length % anchoFila !== 0) return null;
    const salida = new Uint8Array(datos);
    for (let f = 0; f < salida.length; f += anchoFila) {
      for (let i = bpp; i < anchoFila; i++) salida[f + i] = (salida[f + i] + salida[f + i - bpp]) & 0xff;
    }
    return salida;
  }
  // PNG: cada fila lleva delante un byte con el filtro (0 None, 1 Sub, 2 Up, 3 Average, 4 Paeth).
  if (datos.length % (anchoFila + 1) !== 0) return null;
  const filas = datos.length / (anchoFila + 1);
  const salida = new Uint8Array(filas * anchoFila);
  let anterior = new Uint8Array(anchoFila);
  for (let r = 0; r < filas; r++) {
    const tipo = datos[r * (anchoFila + 1)];
    const fila = datos.subarray(r * (anchoFila + 1) + 1, (r + 1) * (anchoFila + 1));
    const actual = salida.subarray(r * anchoFila, (r + 1) * anchoFila);
    for (let i = 0; i < anchoFila; i++) {
      const a = i >= bpp ? actual[i - bpp] : 0, b = anterior[i], c = i >= bpp ? anterior[i - bpp] : 0;
      let pred;
      switch (tipo) {
        case 0: pred = 0; break;
        case 1: pred = a; break;
        case 2: pred = b; break;
        case 3: pred = (a + b) >> 1; break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; break; }
        default: return null;
      }
      actual[i] = (fila[i] + pred) & 0xff;
    }
    anterior = actual;
  }
  return salida;
}
