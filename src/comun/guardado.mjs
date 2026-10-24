// Nombres y rutas de guardado. Lógica pura.
const PROHIBIDOS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function nombreSeguro(nombre) {
  let limpio = String(nombre ?? '').replace(PROHIBIDOS, '').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '');
  if (!limpio) return 'documento.pdf';
  if (!/\.pdf$/i.test(limpio)) limpio += '.pdf';
  return limpio;
}

export function rutaDeGuardadoComo(rutaOriginal) {
  const ruta = String(rutaOriginal ?? '');
  const corte = Math.max(ruta.lastIndexOf('\\'), ruta.lastIndexOf('/'));
  const carpeta = ruta.slice(0, corte + 1);
  const base = ruta.slice(corte + 1).replace(/\.pdf$/i, '');
  return `${carpeta}${base} (copia).pdf`;
}
