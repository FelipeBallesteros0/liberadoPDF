// Árbol de nombres de PDF (/Names planos o anidados con /Kids, como escribe Acrobat) → pares [nombre, valor] en orden.
// `util` trae lookup y las clases de pdf-lib para no depender del bundle desde aquí. Lógica pura.
export function paresDelArbolDeNombres(nodo, { lookup, PDFName, PDFArray, PDFDict }, profundidad = 0) {
  const d = lookup(nodo);
  if (!(d instanceof PDFDict) || profundidad > 32) return [];
  const salida = [];
  const kids = lookup(d.get(PDFName.of('Kids')));
  if (kids instanceof PDFArray) for (const kid of kids.asArray()) salida.push(...paresDelArbolDeNombres(kid, { lookup, PDFName, PDFArray, PDFDict }, profundidad + 1));
  const names = lookup(d.get(PDFName.of('Names')));
  if (names instanceof PDFArray) { const lista = names.asArray(); for (let k = 0; k + 1 < lista.length; k += 2) salida.push([lista[k], lista[k + 1]]); }
  return salida;
}
