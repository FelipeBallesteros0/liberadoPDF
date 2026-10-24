// Geometría y texto para numerar páginas y poner marcas de agua. Coordenadas de PDF (origen abajo-izquierda, puntos). Lógica pura.

export function textoDeNumero(formato, n, total) {
  return String(formato ?? '').replaceAll('{n}', String(n)).replaceAll('{total}', String(total));
}

// Origen (esquina inferior izquierda) de una caja de texto en una de las seis posiciones.
export function posicionDeTexto({ posicion, anchoPagina, altoPagina, anchoTexto, altoTexto, margen = 24 }) {
  const [vertical, horizontal] = String(posicion).split('-');
  const x = horizontal === 'izquierda' ? margen : horizontal === 'derecha' ? anchoPagina - margen - anchoTexto : (anchoPagina - anchoTexto) / 2;
  const y = vertical === 'arriba' ? altoPagina - margen - altoTexto : margen;
  return { x, y };
}

// Centros de un mosaico en filas alternadas que cubre la página; `paso` separa las columnas en anchos de texto.
export function mosaicoDeMarca({ anchoPagina, altoPagina, anchoTexto, altoTexto, paso = 1.5 }) {
  const dx = Math.max(1, anchoTexto * paso);
  const dy = Math.max(1, Math.max(altoTexto * 4, anchoTexto * paso * 0.6));
  const puntos = [];
  for (let fila = 0, y = dy / 2; y <= altoPagina; fila++, y += dy) {
    for (let x = (fila % 2 ? dx : dx / 2); x <= anchoPagina; x += dx) puntos.push({ x, y });
  }
  return puntos;
}

export function colorHex(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex ?? '').trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

// Origen de una caja ancho×alto girada `angulo` grados (antihorario, como pdf-lib) para que su centro quede en (cx, cy).
export function origenCentrado({ cx, cy, ancho, alto, angulo }) {
  const a = (angulo * Math.PI) / 180;
  const cos = Math.cos(a), sen = Math.sin(a);
  const ox = (ancho / 2) * cos - (alto / 2) * sen;
  const oy = (ancho / 2) * sen + (alto / 2) * cos;
  return { x: cx - ox, y: cy - oy };
}

// Una página con /Rotate se muestra girada: (vx, vy) son coordenadas en la página tal como se ve (ancho visual =
// alto real si gira 90/270); devuelve el punto en las coordenadas sin rotar donde hay que dibujar.
export function aCoordenadasSinRotar({ vx, vy, rotacion, anchoPagina, altoPagina }) {
  switch (((rotacion % 360) + 360) % 360) {
    case 90: return { x: anchoPagina - vy, y: vx };
    case 180: return { x: anchoPagina - vx, y: altoPagina - vy };
    case 270: return { x: vy, y: altoPagina - vx };
    default: return { x: vx, y: vy };
  }
}

// Tamaño de la página tal como se ve (intercambia ancho y alto si gira 90/270).
export function tamanoVisual({ anchoPagina, altoPagina, rotacion }) {
  const r = ((rotacion % 360) + 360) % 360;
  return r === 90 || r === 270 ? { ancho: altoPagina, alto: anchoPagina } : { ancho: anchoPagina, alto: altoPagina };
}
