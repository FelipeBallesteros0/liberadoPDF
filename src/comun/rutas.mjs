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
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export function mimeDe(nombre) {
  const punto = nombre.lastIndexOf('.');
  if (punto < 0) return 'application/octet-stream';
  const ext = nombre.slice(punto + 1).toLowerCase();
  return MIME[ext] ?? 'application/octet-stream';
}

// ¿Son el mismo archivo? En Windows no distingue mayúsculas ni separadores; en Linux solo normaliza la ruta.
export function mismaRuta(a, b, plataforma = process.platform) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const normalizar = plataforma === 'win32'
    ? r => path.win32.normalize(r.replace(/\//g, '\\')).toLowerCase()
    : r => path.posix.normalize(r);
  return normalizar(a) === normalizar(b);
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
