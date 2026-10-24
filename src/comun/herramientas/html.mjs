// Página web o HTML a PDF: validación de la URL y nombre del resultado. Lógica pura.
export function urlPermitida(texto) {
  const limpio = String(texto ?? '').trim();
  if (!limpio) return null;
  // «localhost:8080» o «192.168.1.5:8000» no son esquemas: lo que va antes de «:» seguido de dígitos es un host.
  const tieneEsquema = /^[a-z][a-z0-9+.-]*:/i.test(limpio) && !/^[a-z0-9.-]+:\d+(\/|$)/i.test(limpio);
  const esLocal = /^(localhost|127\.0\.0\.1|\[[0-9a-f:]+\]|(\d{1,3}\.){3}\d{1,3})(:|\/|$)/i.test(limpio);
  const conEsquema = tieneEsquema ? limpio : `${esLocal ? 'http' : 'https'}://${limpio}`;
  let url;
  try { url = new URL(conEsquema); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname;
  const ipv6 = /^\[[0-9a-f:.]+\]$/i.test(host);
  if (!ipv6 && (!/^[a-z0-9.-]+$/i.test(host) || (!host.includes('.') && host !== 'localhost'))) return null;
  return url.href;
}

export function nombreDeHtml(origen, valor, palabra = 'página web') {
  if (origen === 'url') {
    try { return `${new URL(valor).hostname} - ${palabra}.pdf`; } catch { return `${palabra}.pdf`; }
  }
  const nombre = String(valor ?? '').split(/[\\/]/).pop() || 'documento';
  return `${nombre.replace(/\.[^.]+$/, '')}.pdf`;
}
