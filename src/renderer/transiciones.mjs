// Transiciones entre páginas en presentación: se lee /Trans de cada página con pdf-lib (pdf.js no lo expone)
// y, al cambiar de página, una copia de la página saliente se anima por encima con CSS.
import { transicionDe, estiloDeTransicion, cuadrante } from '../comun/transiciones.mjs';
import { raizDeCapas } from './capas.mjs';

export async function leerTransiciones(urlPdf) {
  try {
    const { PDFDocument, PDFName, PDFNumber, PDFDict } = await import('/lib/pdf-lib/pdf-lib.esm.min.js');
    const bytes = await (await fetch(urlPdf)).arrayBuffer();
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    const valor = (obj) => (obj instanceof PDFName ? obj.asString().slice(1) : obj instanceof PDFNumber ? obj.asNumber() : undefined);
    return doc.getPages().map((pagina) => {
      const trans = pagina.node.lookup(PDFName.of('Trans'));
      if (!(trans instanceof PDFDict)) return null;
      const leer = (clave) => valor(trans.lookup(PDFName.of(clave)));
      return { S: leer('S'), D: leer('D'), Dm: leer('Dm'), M: leer('M'), Di: leer('Di') };
    });
  } catch (e) {
    console.warn('liberadoPDF: sin transiciones (no se pudo leer /Trans):', e?.message ?? e);
    return [];
  }
}

export function instalarTransiciones({ app, obtenerConfig, modoActual }) {
  let transiciones = [];
  let capa = null;
  const contenedor = document.getElementById('viewerContainer');

  const quitar = () => { capa?.remove(); capa = null; };

  app.eventBus.on('pagechanging', ({ pageNumber, previous }) => {
    quitar(); // un cambio de página durante otra transición la cancela
    if (modoActual() !== 'presentacion' || !obtenerConfig().presentacion.transiciones) return;
    const t = transicionDe(transiciones[pageNumber - 1]);
    if (!t || !previous || previous === pageNumber) return;
    const origen = app.pdfViewer.getPageView(previous - 1)?.canvas;
    if (!origen) return;
    const W = contenedor.clientWidth, H = contenedor.clientHeight;
    const lienzo = document.createElement('canvas');
    lienzo.width = W; lienzo.height = H;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = getComputedStyle(contenedor).backgroundColor || '#000';
    ctx.fillRect(0, 0, W, H);
    const escala = Math.min(W / origen.width, H / origen.height); // página ajustada y centrada, como en presentación
    const dw = origen.width * escala, dh = origen.height * escala;
    ctx.drawImage(origen, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const estilo = estiloDeTransicion(t);
    capa = document.createElement('div');
    capa.className = `liberadopdf-transicion ${estilo.clase} liberadopdf-dir-${cuadrante(t.direccion)} liberadopdf-dim-${t.dimension} liberadopdf-mov-${t.movimiento}`;
    for (const [k, v] of Object.entries(estilo.variables)) capa.style.setProperty(k, v);
    capa.style.setProperty('--liberadopdf-trans-dur', `${estilo.duracionMs}ms`);
    capa.append(lienzo);
    capa.addEventListener('animationend', quitar);
    raizDeCapas().append(capa);
    setTimeout(() => { if (capa?.contains(lienzo)) quitar(); }, estilo.duracionMs + 100);
  });
  app.eventBus.on('presentationmodechanged', quitar);

  return {
    async cargar(urlPdf) { transiciones = await leerTransiciones(urlPdf); return transiciones; },
    obtener: () => transiciones,
  };
}
