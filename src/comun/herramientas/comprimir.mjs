// Comprimir: qué imágenes recodificar y cómo informar del resultado. Lógica pura.
export const CALIDADES = {
  alta: { escala: 1, jpeg: 0.85 },
  media: { escala: 0.7, jpeg: 0.7 },
  baja: { escala: 0.5, jpeg: 0.5 },
};

const MINIMO_PX = 200;

// Solo JPEG (DCTDecode) o Flate RGB/Gris de 8 bits sin máscara; lo demás (indexadas, 1 bit, JPX, CCITT, con SMask…) se deja igual.
export function decidirImagen({ filtro, ancho, alto, bitsPorComponente, espacioColor, tieneMascara }, calidad) {
  const c = CALIDADES[calidad] ?? CALIDADES.media;
  const no = { recodificar: false, anchoNuevo: ancho, altoNuevo: alto, jpeg: c.jpeg };
  if (tieneMascara || ancho < MINIMO_PX || alto < MINIMO_PX) return no;
  const rgbOGris = espacioColor === 'DeviceRGB' || espacioColor === 'DeviceGray';
  if (filtro === 'DCTDecode') { /* JPEG: siempre recodificable */ }
  else if (filtro === 'FlateDecode' && bitsPorComponente === 8 && rgbOGris) { /* mapa de bits sin comprimir con pérdida */ }
  else return no;
  return { recodificar: true, anchoNuevo: Math.max(1, Math.round(ancho * c.escala)), altoNuevo: Math.max(1, Math.round(alto * c.escala)), jpeg: c.jpeg };
}

function legible(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 10_000) return `${(bytes / 1000).toFixed(1).replace('.', ',')} KB`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} MB`;
}

export function informe(antes, despues) {
  const cambio = antes > 0 ? Math.round(((despues - antes) / antes) * 100) : 0;
  const signo = cambio < 0 ? '−' : cambio > 0 ? '+' : '';
  return `${legible(antes)} → ${legible(despues)} (${signo}${Math.abs(cambio)} %)`;
}
