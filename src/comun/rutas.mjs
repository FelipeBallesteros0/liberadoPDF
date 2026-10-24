// Resolución de rutas del protocolo liberadopdf://app/ y tipos MIME. Lógica pura.
import path from 'node:path';

const MIME = {
  html: 'text/html',
  mjs: 'text/javascript',
  js: 'text/javascript',
  css: 'text/css',
  json: 'application/json',
  map: 'application/json',
  ftl: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  gif: 'image/gif',
  wasm: 'application/wasm',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  traineddata: 'application/octet-stream',
};

export function mimeDe(nombre) {
  const punto = nombre.lastIndexOf('.');
  if (punto < 0) return 'application/octet-stream';
  const ext = nombre.slice(punto + 1).toLowerCase();
  return MIME[ext] ?? 'application/octet-stream';
}

// `raices` es una lista ordenada de { prefijo, carpeta }; gana la primera cuyo prefijo coincide.
// Devuelve null si la ruta decodificada intenta salir de la carpeta.
export function resolverRutaApp(pathname, raices) {
  let decodificada;
  try {
    decodificada = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decodificada === '/') decodificada = '/inicio.html';
  const raiz = raices.find(r => decodificada.startsWith(r.prefijo));
  if (!raiz) return null;
  const relativa = decodificada.slice(raiz.prefijo.length);
  const carpeta = path.resolve(raiz.carpeta);
  const archivo = path.resolve(carpeta, relativa);
  if (archivo !== carpeta && !archivo.startsWith(carpeta + path.sep)) return null;
  return { archivo, mime: mimeDe(archivo) };
}
