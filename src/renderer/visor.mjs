// Punto de entrada de la capa de liberadoPDF en la ventana del visor (mundo principal).
// Habla con pdf.js por su global PDFViewerApplication y con el proceso principal por window.liberadopdf.
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

// Acciones invocables desde el proceso principal (menú, prueba de humo).
window.liberadopdfAcciones = {
  presentacion() { app.requestPresentationMode(); },
};
