// Punto de entrada de la capa de liberadoPDF en la ventana del visor (mundo principal).
// Habla con pdf.js por su global PDFViewerApplication y con el proceso principal por window.liberadopdf.
import { instalarTeclas } from '/teclas.mjs';
import { alternarAyuda } from '/ayuda.mjs';

const app = window.PDFViewerApplication;
const parametros = new URLSearchParams(location.search);
const ruta = parametros.get('ruta') ?? '';
const nombre = ruta ? ruta.split(/[\\/]/).pop() : '';
window.liberadopdfEstado = { ruta, nombre };

await app.initializedPromise;

const ponerTitulo = () => { document.title = nombre ? `${nombre} · liberadoPDF` : 'liberadoPDF'; };
const alCargar = () => {
  ponerTitulo();
  window.liberadopdf.documentoAbierto({ ruta, nombre });
};
if (app.pdfDocument) alCargar(); else app.eventBus.on('documentloaded', alCargar);
app.eventBus.on('metadataloaded', ponerTitulo); // pdf.js pone su propio título al leer los metadatos

// Primera página pintada (para medir el arranque en la prueba de humo).
const RENDER_TERMINADO = 3;
if (app.pdfViewer?.getPageView?.(0)?.renderingState === RENDER_TERMINADO) {
  window.liberadopdf.humoEvento('primera-pagina');
} else {
  app.eventBus.on('pagerendered', function primera() {
    app.eventBus.off('pagerendered', primera);
    window.liberadopdf.humoEvento('primera-pagina');
  });
}

// Acciones de liberadoPDF: las invocan las teclas (teclas.mjs) y el proceso principal (menú).
const modoActual = () => (app.pdfPresentationMode?.active ? 'presentacion' : 'ventana'); // provisional hasta presentacion.mjs
const acciones = {
  siguiente() { if (app.page < app.pagesCount) app.page += 1; },
  anterior() { if (app.page > 1) app.page -= 1; },
  siguienteLamina() { acciones.siguiente(); }, // provisional hasta etiquetas.mjs
  anteriorLamina() { acciones.anterior(); },
  primera() { app.page = 1; },
  ultima() { app.page = app.pagesCount; },
  irALamina(n) { if (Number.isInteger(n) && n >= 1 && n <= app.pagesCount) app.page = n; }, // provisional
  presentacion() { app.requestPresentationMode(); },
  ayuda() { alternarAyuda(); },
  reloj() {},
  negro() {},
  blanco() {},
  nocturno() {},
  async abrir() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnEstaVentana(r); },
  async abrirNueva() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnVentanaNueva(r); },
};
instalarTeclas({ acciones, modoActual });
window.liberadopdf.alAccion(nombre => acciones[nombre]?.());
window.liberadopdfAcciones = { presentacion: acciones.presentacion, ayuda: acciones.ayuda };
