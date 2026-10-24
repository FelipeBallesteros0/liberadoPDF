// Miniaturas de páginas con la API de pdf.js del propio visor (PDFDocumentProxy), con caché y cola de a una.
export function crearMiniaturas({ app, ancho = 160 }) {
  let cache = new Map();
  let cola = Promise.resolve();
  const obtener = (pagina) => {
    if (cache.has(pagina)) return cache.get(pagina);
    const promesa = (cola = cola.then(async () => {
      const doc = app.pdfDocument;
      if (!doc) throw new Error('sin documento');
      const page = await doc.getPage(pagina);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: ancho / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas;
    }));
    cache.set(pagina, promesa);
    promesa.catch(() => cache.delete(pagina));
    return promesa;
  };
  const invalidar = () => { cache = new Map(); };
  app.eventBus.on('documentloaded', invalidar);
  return { obtener, invalidar };
}
