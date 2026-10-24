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
import { instalarNocturno } from '/nocturno.mjs';
import { instalarInstantanea, mostrarToast } from '/instantanea.mjs';
import { instalarTransiciones } from '/transiciones.mjs';
import { instalarPunteros } from '/punteros.mjs';
import { crearMiniaturas } from '/miniaturas.mjs';
import { instalarCuadricula } from '/cuadricula.mjs';
import { instalarMedicion } from '/medicion.mjs';

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
  nocturno() { nocturno.alternar(); },
  instantanea() { if (modoActual() === 'ventana') instantanea.iniciar(); },
  ajustes() { ajustes.abrir(); },
  cuadricula() { cuadricula.alternar(); },
  medirDistancia() { if (modoActual() === 'ventana') medicion.distancia(); },
  medirArea() { if (modoActual() === 'ventana') medicion.area(); },
  calibrar() { if (modoActual() === 'ventana') medicion.calibrar(); },
  laser() { punteros.laser(); },
  foco() { punteros.foco(); },
  dibujo() { punteros.dibujo(); },
  limpiarDibujo() { punteros.limpiar(); },
  deshacerDibujo() { punteros.deshacer(); },
  async guardar() { await window.liberadopdf.modoGuardado('sobrescribir'); await guardarConPdfjs(); },
  async guardarComo() { await window.liberadopdf.modoGuardado('como'); await guardarConPdfjs(); },
  async abrir() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnEstaVentana(r); },
  async abrirNueva() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnVentanaNueva(r); },
};
const presentacion = instalarPresentacion({ app, obtenerConfig, acciones });
const { modoActual } = presentacion;
const contador = instalarContador({ app, obtenerGrupos: () => grupos, modoActual });
const miniaturas = crearMiniaturas({ app });
const cuadricula = instalarCuadricula({ app, miniaturas, obtenerGrupos: () => grupos });
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
const nocturno = instalarNocturno({ obtenerConfig, guardar: nueva => { config = nueva; window.liberadopdf.guardarConfig(nueva); } });
const instantanea = instalarInstantanea();
const transiciones = instalarTransiciones({ app, obtenerConfig, modoActual });
const punteros = instalarPunteros({ app, modoActual });
const medicion = instalarMedicion({
  app, obtenerConfig, ruta,
  guardarPorDocumento: (parcial) => {
    const actual = obtenerConfig();
    const porDocumento = { ...actual.porDocumento, [ruta]: { ...(actual.porDocumento[ruta] ?? {}), ...parcial } };
    const nueva = { ...actual, porDocumento };
    config = nueva;
    window.liberadopdf.guardarConfig({ porDocumento });
  },
});
window.liberadopdfAplicarExtra = (nueva) => nocturno.aplicar(nueva.nocturno);
// pdf.js: save() incorpora formularios y anotaciones; download() baja el original si no hay cambios.
const guardarConPdfjs = async () => {
  if (!app.pdfDocument) return;
  if (app.pdfDocument.annotationStorage.size > 0) await app.save(); else await app.download();
};
window.liberadopdf.alGuardado(({ ruta }) => mostrarToast(`Guardado: ${ruta.split(/[\\/]/).pop()}`));
// Editores de pdf.js (notas, firma, resaltado, texto, dibujo, imagen): deben estar activos (funciones 25–27).
const EDITORES = ['editorCommentButton', 'editorSignatureButton', 'editorHighlightButton', 'editorFreeTextButton', 'editorInkButton', 'editorStampButton'];
window.liberadopdfEstado.editoresVisibles = EDITORES.every(id => { const b = document.getElementById(id); return b && !b.hidden && !b.closest('.liberadopdf-oculto'); });
if (!window.liberadopdfEstado.editoresVisibles) console.warn('liberadoPDF: algún editor de pdf.js no está disponible', EDITORES.filter(id => !document.getElementById(id)));
instalarTeclas({ acciones, modoActual, interceptores: [presentacion.interceptor, cuadricula.interceptor] });

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
window.liberadopdfAcciones = { presentacion: acciones.presentacion, ayuda: acciones.ayuda, personalizarBarra: () => barra.abrirDialogo(), ajustes: acciones.ajustes, instantanea: acciones.instantanea, guardar: acciones.guardar, guardarComo: acciones.guardarComo, cuadricula: acciones.cuadricula, medirDistancia: acciones.medirDistancia, medirArea: acciones.medirArea, calibrar: acciones.calibrar };

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
  // /Trans de cada página (pdf-lib), para las transiciones en presentación
  const urlPdf = parametros.get('file');
  if (urlPdf) await transiciones.cargar(urlPdf);
  window.liberadopdfEstado.transiciones = transiciones.obtener();
};
if (app.pdfDocument) alCargar(); else app.eventBus.on('documentloaded', alCargar);
// PDF corrupto, cifrado sin contraseña válida o ilegible: pdf.js solo lo registra en consola; aquí se vuelve
// a la pantalla de inicio con el motivo en vez de dejar un visor vacío.
app.eventBus.on('documenterror', ({ message }) => {
  window.liberadopdf.abrirInicio(`No se pudo abrir ${nombre || 'el PDF'}: ${message || 'archivo dañado o no es un PDF'}`);
});
app.eventBus.on('metadataloaded', ponerTitulo); // pdf.js pone su propio título al leer los metadatos

