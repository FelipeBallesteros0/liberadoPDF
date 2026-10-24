// OCR local con tesseract.js: cada página se pinta con pdf.js, se reconoce y las palabras se escriben invisibles
// (opacidad 0) encima de la imagen, así el PDF queda buscable y con texto copiable.
import { palabrasAPdf, palabrasDeBloques } from '../comun/herramientas/ocr.mjs';
import { escalaParaPpp } from '../comun/herramientas/imagenes.mjs';
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

const OPCIONES_TESSERACT = {
  workerPath: '/lib/tesseract-core/worker.min.js', // servido junto al núcleo para que el .wasm se resuelva en la misma carpeta
  corePath: '/lib/tesseract-core',
  langPath: '/tessdata',
  gzip: false,
  cacheMethod: 'none',
  workerBlobURL: false,
};

export async function reconocerPaginas({ app, paginas, idiomas, ppp, senal, progreso }) {
  const modulo = await import('/lib/tesseract/tesseract.esm.min.js');
  const createWorker = modulo.createWorker ?? modulo.default?.createWorker; // el bundle ESM exporta el objeto Tesseract por defecto
  if (typeof createWorker !== 'function') throw new Error('No se pudo cargar tesseract.js');
  const trabajador = await createWorker(idiomas, 1, OPCIONES_TESSERACT);
  const cancelar = () => trabajador.terminate();
  senal?.addEventListener('abort', cancelar, { once: true });
  // tesseract.js no rechaza sus promesas al terminar el worker: se compite contra la señal para que la espera termine.
  const abortado = new Promise((_, rechazar) => senal?.addEventListener('abort', () => rechazar(Object.assign(new Error('Cancelado'), { cancelado: true })), { once: true }));
  const resultado = [];
  try {
    for (const [i, n] of paginas.entries()) {
      if (senal?.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true });
      progreso({ hecho: i, total: paginas.length, texto: `Reconociendo la página ${n}…` });
      const page = await app.pdfDocument.getPage(n);
      const escala = escalaParaPpp(ppp);
      const viewport = page.getViewport({ scale: escala });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imagen = await new Promise(res => canvas.toBlob(res, 'image/png')); // tesseract.js lee PNG/JPEG; ImageData crudo no
      canvas.width = canvas.height = 0;
      const { data } = await Promise.race([trabajador.recognize(imagen, {}, { text: false, blocks: true }), abortado]);
      if (senal?.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true });
      // convertToPdfPoint deshace escala, /Rotate y el origen del CropBox; el texto se escribirá girado como la página.
      const aPdf = (x, y) => viewport.convertToPdfPoint(x, y);
      resultado.push({ numero: n, rotacion: viewport.rotation, palabras: palabrasAPdf(palabrasDeBloques(data.blocks), { escala, altoPagina: viewport.height / escala, aPdf }) });
    }
  } catch (e) {
    if (senal?.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true });
    throw e;
  } finally {
    senal?.removeEventListener('abort', cancelar);
    await trabajador.terminate().catch(() => {});
  }
  return resultado;
}

export function instalarOcr(H) {
  H.registrar('ocr', ({ app, ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'ocr',
      titulo: 'OCR (texto en PDF escaneado)',
      descripcion: 'Reconoce el texto de las páginas (todo en este equipo, sin red) y lo añade como capa invisible: el PDF queda buscable. Tarda unos segundos por página.',
      campos: [
        { clave: 'idioma', etiqueta: 'Idioma', tipo: 'opcion', valor: 'spa', opciones: [['spa', 'Español'], ['eng', 'Inglés'], ['spa+eng', 'Español e inglés']] },
        { clave: 'ppp', etiqueta: 'Resolución de reconocimiento (ppp)', tipo: 'opcion', valor: '200', opciones: [['200', '200 (rápido)'], ['300', '300 (más preciso)']] },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const paginas = await reconocerPaginas({ app, paginas: v.paginas, idiomas: v.idioma, ppp: Number(v.ppp), senal, progreso });
        const palabras = paginas.reduce((n, p) => n + p.palabras.length, 0);
        progreso({ hecho: v.paginas.length, total: v.paginas.length, texto: 'Escribiendo la capa de texto…' });
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('ocrEscribir', { bytes, paginas }, { senal });
        return { nombre: nombreResultado(ruta, 'OCR'), bytes: salida, resumen: `${palabras} palabras reconocidas en ${paginas.length} páginas` };
      },
    });
  });
}
