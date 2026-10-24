// Punto de entrada de la capa de liberadoPDF en la ventana del visor (mundo principal).
// Habla con pdf.js por su global PDFViewerApplication y con el proceso principal por window.liberadopdf.
import { instalarTeclas } from '/teclas.mjs';
import { alternarAyuda } from '/ayuda.mjs';
import { agruparEtiquetas } from '/comun/etiquetas.mjs';
import { instalarContador } from '/contador.mjs';
import { instalarPresentacion } from '/presentacion.mjs';
import { instalarCierre } from '/cierre.mjs';
import { instalarBarra } from '/barra.mjs';
import { instalarAjustes } from '/ajustes.mjs';

const app = window.PDFViewerApplication;
const parametros = new URLSearchParams(location.search);
const ruta = parametros.get('ruta') ?? '';
const nombre = ruta ? ruta.split(/[\\/]/).pop() : '';
window.liberadopdfEstado = { ruta, nombre };

let config = await window.liberadopdf.config();
const obtenerConfig = () => config;
await app.initializedPromise;

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

let grupos = null; // láminas y pasos según /PageLabels (se rellena al cargar el documento)

// Acciones de liberadoPDF: las invocan las teclas (teclas.mjs) y el proceso principal (menú).
const acciones = {
  siguiente() { if (app.page < app.pagesCount) app.page += 1; },
  anterior() { if (app.page > 1) app.page -= 1; },
  siguienteLamina() { const p = grupos?.siguienteLamina(app.page); if (p) app.page = p; else acciones.siguiente(); },
  anteriorLamina() { const p = grupos?.anteriorLamina(app.page); if (p) app.page = p; else acciones.anterior(); },
  primera() { app.page = 1; },
  ultima() { app.page = app.pagesCount; },
  irALamina(n) {
    const p = grupos ? grupos.paginaDeLamina(n) : (Number.isInteger(n) && n >= 1 && n <= app.pagesCount ? n : null);
    if (p) app.page = p;
  },
  presentacion() { app.requestPresentationMode(); },
  ayuda() { alternarAyuda(); },
  reloj() { presentacion.reloj(); },
  negro() { presentacion.negro(); },
  blanco() { presentacion.blanco(); },
  nocturno() {}, // Tarea 3
  ajustes() { ajustes.abrir(); },
  async abrir() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnEstaVentana(r); },
  async abrirNueva() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnVentanaNueva(r); },
};
const presentacion = instalarPresentacion({ app, obtenerConfig, acciones });
const { modoActual } = presentacion;
const contador = instalarContador({ app, obtenerGrupos: () => grupos, modoActual });
instalarCierre({ app });
const barra = instalarBarra({ config, app, guardar: parcial => window.liberadopdf.guardarConfig(parcial) });
// Aplicación en vivo de la configuración (ajustes, nocturno…)
const aplicarTema = (tema) => { document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : tema === 'oscuro' ? 'dark' : ''; };
const aplicarConfig = (nueva) => {
  config = nueva;
  presentacion.actualizarConfig(nueva);
  aplicarTema(nueva.tema);
  window.liberadopdfAplicarExtra?.(nueva); // ganchos de módulos posteriores (nocturno)
};
const ajustes = instalarAjustes({ obtenerConfig, guardar: nueva => window.liberadopdf.guardarConfig(nueva), aplicar: aplicarConfig, pantallas: () => window.liberadopdf.pantallas() });
aplicarTema(config.tema);
instalarTeclas({ acciones, modoActual, interceptor: presentacion.interceptor });

// Arrastrar un PDF sobre la ventana lo abre aquí (pdf.js no llega a ver el drop).
window.addEventListener('dragover', (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true });
window.addEventListener('drop', (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  const archivo = ev.dataTransfer?.files?.[0];
  if (!archivo) return;
  const rutaSoltada = window.liberadopdf.rutaDeArchivo(archivo);
  if (/\.pdf$/i.test(rutaSoltada)) window.liberadopdf.abrirEnEstaVentana(rutaSoltada);
}, { capture: true });
window.liberadopdfAcciones = { presentacion: acciones.presentacion, ayuda: acciones.ayuda, personalizarBarra: () => barra.abrirDialogo(), ajustes: acciones.ajustes };

const ponerTitulo = () => { document.title = nombre ? `${nombre} · liberadoPDF` : 'liberadoPDF'; };
const alCargar = async () => {
  ponerTitulo();
  window.liberadopdf.documentoAbierto({ ruta, nombre });
  const etiquetas = await app.pdfDocument.getPageLabels();
  grupos = agruparEtiquetas(etiquetas, app.pagesCount);
  contador.actualizar();
  // El PDF pide abrirse a pantalla completa (/PageMode /FullScreen)
  const modoPagina = await app.pdfDocument.getPageMode().catch(() => null);
  if (modoPagina === 'FullScreen') window.liberadopdf.pedirPresentacion();
};
if (app.pdfDocument) alCargar(); else app.eventBus.on('documentloaded', alCargar);
// PDF corrupto, cifrado sin contraseña válida o ilegible: pdf.js solo lo registra en consola; aquí se vuelve
// a la pantalla de inicio con el motivo en vez de dejar un visor vacío.
app.eventBus.on('documenterror', ({ message }) => {
  window.liberadopdf.abrirInicio(`No se pudo abrir ${nombre || 'el PDF'}: ${message || 'archivo dañado o no es un PDF'}`);
});
app.eventBus.on('metadataloaded', ponerTitulo); // pdf.js pone su propio título al leer los metadatos

