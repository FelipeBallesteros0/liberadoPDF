// Medición de distancias y áreas sobre la página. Lógica pura.
// Unidades del PDF: 1 unidad = 1/72 in × UserUnit. Las medidas se toman en píxeles CSS del viewport de pdf.js
// (escala y rotación conocidas) y se deshacen aquí, así no dependen del zoom ni de la rotación.

export function puntosAPdf(punto, { escala, rotacion, ancho, alto }) {
  const e = escala || 1;
  switch (((rotacion % 360) + 360) % 360) {
    case 90: return { x: punto.y / e, y: (ancho - punto.x) / e };
    case 180: return { x: (ancho - punto.x) / e, y: (alto - punto.y) / e };
    case 270: return { x: (alto - punto.y) / e, y: punto.x / e };
    default: return { x: punto.x / e, y: punto.y / e };
  }
}

export function distanciaPdf(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Fórmula del cordón (shoelace), valor absoluto.
export function areaPoligonoPdf(puntos) {
  let suma = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i], b = puntos[(i + 1) % puntos.length];
    suma += a.x * b.y - b.x * a.y;
  }
  return Math.abs(suma) / 2;
}

const POR_PULGADA = { mm: 25.4, cm: 2.54, in: 1 };

export function aUnidad(valorPt, unidad, userUnit = 1, { factor = 1, potencia = 1 } = {}) {
  const porPulgada = POR_PULGADA[unidad] ?? POR_PULGADA.mm;
  const lineal = (userUnit * factor * porPulgada) / 72; // unidades PDF → unidad elegida (por eje)
  return valorPt * lineal ** potencia;
}

export function formatear(valor, unidad, potencia = 1) {
  const decimales = unidad === 'mm' ? 1 : 2;
  const texto = valor.toFixed(decimales).replace('.', ',');
  return `${texto} ${unidad}${potencia === 2 ? '²' : ''}`;
}

export function factorDeCalibracion(medidaPt, realEnUnidad, unidad, userUnit = 1) {
  const sinCalibrar = aUnidad(medidaPt, unidad, userUnit);
  return sinCalibrar > 0 ? realEnUnidad / sinCalibrar : 1;
}
