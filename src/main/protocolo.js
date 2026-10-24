// Protocolo liberadopdf://app/: sirve la capa propia (src/renderer), pdf.js vendored y los PDF abiertos.
import { protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolverRutaApp, mimeDe } from '../comun/rutas.mjs';

export const ESQUEMA = 'liberadopdf';
export const HOST = 'app';
const pdfs = new Map(); // token → ruta en disco

export function registrarEsquemaPrivilegiado() {
  protocol.registerSchemesAsPrivileged([
    { scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);
}

function noEncontrado() {
  return new Response('No encontrado', { status: 404, headers: { 'Content-Type': 'text/plain' } });
}

export function instalarProtocolo({ raices }) {
  protocol.handle(ESQUEMA, async (peticion) => {
    const url = new URL(peticion.url);
    if (url.host !== HOST) return noEncontrado();
    if (url.pathname.startsWith('/pdf/')) {
      const ruta = pdfs.get(url.pathname.slice('/pdf/'.length));
      if (!ruta) return noEncontrado();
      try {
        const bytes = await readFile(ruta);
        const nombre = encodeURIComponent(ruta.split(/[\\/]/).pop());
        return new Response(bytes, { headers: {
          'Content-Type': mimeDe(ruta), // también imágenes y otros PDF elegidos para las herramientas
          'Content-Length': String(bytes.length),
          'Accept-Ranges': 'none',
          'Content-Disposition': `inline; filename*=UTF-8''${nombre}`, // pdf.js propone este nombre al guardar
        } });
      } catch (e) {
        return new Response(`No se pudo leer el PDF: ${e.message}`, { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
    }
    const recurso = resolverRutaApp(url.pathname, raices);
    if (!recurso) return noEncontrado();
    try {
      const bytes = await readFile(recurso.archivo);
      return new Response(bytes, { headers: { 'Content-Type': recurso.mime } });
    } catch {
      return noEncontrado();
    }
  });
}

export function registrarPdf(ruta) {
  const token = randomBytes(16).toString('hex');
  pdfs.set(token, ruta);
  return token;
}

export function rutaDeToken(token) {
  return pdfs.get(token);
}

// Cualquier archivo que el usuario eligió con un diálogo (imágenes, otros PDF) se sirve igual, por token.
export const registrarArchivo = registrarPdf;
export function urlDeToken(token) { return `${ESQUEMA}://${HOST}/pdf/${token}`; }

// El visor es el viewer.html de pdf.js tal cual: sus rutas relativas (../build, locale/, ../web/cmaps)
// se resuelven contra esta URL. La ruta real viaja en `ruta` (pdf.js ignora los parámetros que no conoce).
export function urlVisor(ruta) {
  const token = registrarPdf(ruta);
  const archivo = encodeURIComponent(`${ESQUEMA}://${HOST}/pdf/${token}`);
  return `${ESQUEMA}://${HOST}/vendor/pdfjs/web/viewer.html?file=${archivo}&ruta=${encodeURIComponent(ruta)}#zoom=page-fit`;
}

export function urlInicio(mensaje) {
  return `${ESQUEMA}://${HOST}/inicio.html` + (mensaje ? `?mensaje=${encodeURIComponent(mensaje)}` : '');
}
