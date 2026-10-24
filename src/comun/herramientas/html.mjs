// Página web o HTML a PDF: validación de la URL y nombre del resultado. Lógica pura.
export function urlPermitida(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(limpio) ? limpio : `https://${limpio}`;
  let url;
  try { url = new URL(conEsquema); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes('.') && url.hostname !== 'localhost') return null;
  return url.href;
}

export function nombreDeHtml(origen, valor) {
  if (origen === 'url') {
    try { return `${new URL(valor).hostname} - página web.pdf`; } catch { return 'página web.pdf'; }
  }
  const nombre = String(valor ?? '').split(/[\\/]/).pop() || 'documento';
  return `${nombre.replace(/\.[^.]+$/, '')}.pdf`;
}
