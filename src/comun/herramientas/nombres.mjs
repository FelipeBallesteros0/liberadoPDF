// Nombres de los archivos de resultado. Lógica pura.
function base(ruta) {
  const r = String(ruta ?? '');
  const corte = Math.max(r.lastIndexOf('\\'), r.lastIndexOf('/'));
  return r.slice(corte + 1).replace(/\.pdf$/i, '') || 'documento';
}

export function nombreResultado(ruta, herramienta, extension = 'pdf') {
  return `${base(ruta)} - ${herramienta}.${extension}`;
}

export function nombreParte(ruta, indice, total) {
  const cifras = Math.max(2, String(total).length);
  return `${base(ruta)} - parte ${String(indice).padStart(cifras, '0')}.pdf`;
}

export function nombreImagen(ruta, pagina, total, formato) {
  const cifras = Math.max(2, String(total).length);
  return `${base(ruta)} - página ${String(pagina).padStart(cifras, '0')}.${formato}`;
}
