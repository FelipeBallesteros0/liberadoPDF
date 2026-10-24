// Videos del PDF: el worker lista las anotaciones Movie / Screen / RichMedia con su video; aquí se superpone un <video>
// silenciado sobre el rectángulo de cada una, dentro del .page de pdf.js (así sigue a la página con el zoom y en presentación).
import { rectanguloEnPagina, opcionesDeReproduccion, mimeDeVideo } from '../comun/video.mjs';
import { t } from './i18n.mjs';

const LIMITE_ANALISIS = 50 * 1024 * 1024;

export function instalarVideos({ app, obtenerConfig, herramientas }) {
  let porPagina = new Map(); // nº de página → [{ anotacion, url, error, elemento }]
  let urls = [];
  let generacion = 0;

  const limpiar = () => {
    for (const u of urls) URL.revokeObjectURL(u);
    urls = [];
    for (const lista of porPagina.values()) for (const v of lista) v.elemento?.remove();
    porPagina = new Map();
  };

  const crearElemento = (v) => {
    const capa = document.createElement('div');
    capa.className = 'liberadopdf-video mediaAnnotation'; // pdf.js no pasa de página al pulsar sobre .mediaAnnotation en presentación
    capa.dataset.pagina = String(v.anotacion.pagina);
    capa.dataset.tipo = v.anotacion.tipo;
    if (!v.url) { capa.classList.add('aviso'); capa.textContent = v.error; return capa; }
    const video = document.createElement('video');
    video.muted = true; // nunca audio
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const opciones = opcionesDeReproduccion(v.anotacion, obtenerConfig());
    v.opciones = opciones;
    video.loop = opciones.bucle;
    video.autoplay = opciones.autoarranque;
    video.src = v.url;
    video.addEventListener('error', () => { capa.classList.add('aviso'); capa.textContent = t('Video en un formato que no se puede reproducir'); video.remove(); });
    for (const tipo of ['mousedown', 'mouseup']) capa.addEventListener(tipo, ev => ev.stopPropagation()); // ni pasa de página ni dispara el doble clic de presentación
    video.addEventListener('click', (ev) => { ev.stopPropagation(); if (video.paused) { v.pausadoPorUsuario = false; video.play().catch(() => {}); } else { v.pausadoPorUsuario = true; video.pause(); } });
    capa.append(video);
    if (opciones.autoarranque) video.play().catch(() => {});
    return capa;
  };

  const colocar = (n) => {
    const lista = porPagina.get(n);
    if (!lista?.length) return;
    const vista = app.pdfViewer.getPageView(n - 1);
    if (!vista?.div || !vista.viewport) return;
    for (const v of lista) {
      if (!v.elemento) v.elemento = crearElemento(v);
      const caja = rectanguloEnPagina(v.anotacion.rect, vista.viewport);
      Object.assign(v.elemento.style, { left: `${caja.left}px`, top: `${caja.top}px`, width: `${caja.width}px`, height: `${caja.height}px` });
      if (v.elemento.parentElement !== vista.div) {
        vista.div.append(v.elemento);
        const video = v.elemento.querySelector('video');
        if (video && v.opciones?.autoarranque && video.paused && !v.pausadoPorUsuario) video.play().catch(() => {}); // al salir del DOM se pausa (salvo que lo pausara el usuario)
      }
    }
  };

  const cargar = async () => {
    limpiar();
    if (!app.pdfDocument) return;
    const mia = ++generacion;
    let lista;
    try {
      const { length } = await app.pdfDocument.getDownloadInfo();
      if (length > LIMITE_ANALISIS) { console.warn('liberadoPDF: PDF de más de 50 MB, no se buscan videos'); return; } // pdf-lib analiza todo el archivo
      const bytes = await herramientas.bytesDelDocumento();
      lista = await herramientas.ejecutar('listarVideos', { bytes });
    } catch { return; } // cifrado, dañado o sin worker: simplemente no hay videos
    if (mia !== generacion || !Array.isArray(lista)) return;
    for (const a of lista) {
      let url = null, error = null, blob = null;
      if (a.bytes) blob = new Blob([a.bytes]);
      else if (a.archivo) {
        // Un archivo externo también se trae por token y se reproduce como Blob: Chromium rechaza <video src> con un
        // esquema propio («Media load rejected by URL safety check»). response.blob() evita copiar los bytes.
        const urlToken = await window.liberadopdf.videoJuntoAlPdf(a.archivo);
        if (!urlToken) error = t('No se encontró el video «{archivo}» junto al PDF', { archivo: a.archivo });
        else { try { blob = await (await fetch(urlToken)).blob(); } catch { error = t('No se encontró el video «{archivo}» junto al PDF', { archivo: a.archivo }); } }
      }
      if (blob) {
        const mime = mimeDeVideo(new Uint8Array(await blob.slice(0, 16).arrayBuffer()));
        if (!mime) error = t('Video en un formato que no se puede reproducir');
        else { url = URL.createObjectURL(blob.slice(0, blob.size, mime)); urls.push(url); }
      } else if (!error) error = t('Video en un formato que no se puede reproducir');
      if (mia !== generacion) return;
      if (!porPagina.has(a.pagina)) porPagina.set(a.pagina, []);
      porPagina.get(a.pagina).push({ anotacion: a, url, error, elemento: null });
    }
    for (const n of porPagina.keys()) colocar(n);
  };

  app.eventBus.on('documentloaded', () => { cargar(); });
  app.eventBus.on('pagerendered', ({ pageNumber }) => colocar(pageNumber));
  app.eventBus.on('pagesdestroy', limpiar);
  if (app.pdfDocument) cargar();
  return { recargar: cargar, videosDe: n => porPagina.get(n) ?? [], limpiar };
}
