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
import { crearCliente } from '/herramientas/cliente.mjs';
import { bytesDelDocumento, dialogoHerramienta } from '/herramientas/base.mjs';
import { instalarHerramientas } from '/herramientas/indice.mjs';
import { instalarVideos } from '/videos.mjs';
import { t } from '/i18n.mjs';

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
  async presentacion() { await window.liberadopdf.antesDePresentar().catch(() => {}); app.requestPresentationMode(); },
  ayuda() { punteros.desactivarTodo(); alternarAyuda(); },
  reloj() { presentacion.reloj(); },
  negro() { presentacion.negro(); },
  blanco() { presentacion.blanco(); },
  nocturno() { nocturno.alternar(); },
  instantanea() { if (modoActual() === 'ventana') instantanea.iniciar(); },
  ajustes() { ajustes.abrir(); },
  cuadricula() { punteros.desactivarTodo(); cuadricula.alternar(); },
  presentador() { window.liberadopdf.presentadorAbrir(); },
  medirDistancia() { if (modoActual() === 'ventana') medicion.distancia(); },
  medirArea() { if (modoActual() === 'ventana') medicion.area(); },
  calibrar() { if (modoActual() === 'ventana') medicion.calibrar(); },
  laser() { punteros.laser(); },
  foco() { punteros.foco(); },
  dibujo() { punteros.dibujo(); },
  limpiarDibujo() { punteros.limpiar(); },
  deshacerDibujo() { punteros.deshacer(); },
  async guardar() {
    // Sin ediciones del usuario no hay nada que guardar: las animaciones también escriben en el almacén de
    // anotaciones de pdf.js y save() dejaría grabado el fotograma del momento (antimeta: no «mejorar» el PDF).
    if (!cierre.hayEdiciones()) { mostrarToast(t('No hay cambios que guardar')); return; }
    await window.liberadopdf.modoGuardado('sobrescribir');
    await guardarConPdfjs();
  },
  async guardarComo() { await window.liberadopdf.modoGuardado('como'); await guardarConPdfjs(); },
  async abrir() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnEstaVentana(r); },
  async abrirNueva() { const r = await window.liberadopdf.abrirDialogo(); if (r) window.liberadopdf.abrirEnVentanaNueva(r); },
};
const presentacion = instalarPresentacion({ app, obtenerConfig, acciones });
const { modoActual } = presentacion;
const contador = instalarContador({ app, obtenerGrupos: () => grupos, modoActual });
const miniaturas = crearMiniaturas({ app });
const cuadricula = instalarCuadricula({ app, miniaturas, obtenerGrupos: () => grupos });
const cierre = instalarCierre({ app });
window.liberadopdfEstado.hayEdiciones = () => cierre.hayEdiciones();
// Herramientas de archivo (entrega 3): cada una se registra con su clave del menú; el trabajo pesado va al worker.
const clienteHerramientas = crearCliente();
const herramientas = {};
window.liberadopdfHerramientas = {
  cliente: clienteHerramientas,
  ejecutar: (operacion, argumentos, opciones) => clienteHerramientas.ejecutar(operacion, argumentos, opciones),
  registrar: (clave, abrir) => { herramientas[clave] = abrir; },
  bytesDelDocumento,
  dialogoHerramienta,
  contexto: () => ({ app, ruta, nombre, obtenerConfig, totalPaginas: app.pagesCount }),
};
instalarHerramientas(window.liberadopdfHerramientas);
// Videos incrustados o enlazados en el PDF (Movie, Screen, RichMedia): <video> silenciado sobre su rectángulo.
window.liberadopdfVideos = instalarVideos({ app, obtenerConfig, herramientas: window.liberadopdfHerramientas });
const abrirHerramienta = (clave) => {
  if (herramientas[clave]) { herramientas[clave](window.liberadopdfHerramientas.contexto()); return; }
  mostrarToast(t('Herramienta «{clave}»: próximamente', { clave }));
};
const barra = instalarBarra({ config, app, guardar: parcial => window.liberadopdf.guardarConfig(parcial) });
// Aplicación en vivo de la configuración (ajustes, nocturno…)
const aplicarTema = (tema) => { document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : tema === 'oscuro' ? 'dark' : ''; };
const aplicarConfig = (nueva) => {
  config = nueva;
  presentacion.actualizarConfig(nueva);
  aplicarTema(nueva.tema);
  window.liberadopdfAplicarExtra?.(nueva); // ganchos de módulos posteriores (nocturno)
  window.liberadopdfAplicarDocumento?.();
};
const ajustes = instalarAjustes({
  obtenerConfig, guardar: nueva => window.liberadopdf.guardarConfig(nueva), aplicar: aplicarConfig, pantallas: () => window.liberadopdf.pantallas(),
  documento: ruta ? {
    etiqueta: t('Páginas con las notas a la derecha (Beamer, pgfpages)'),
    obtener: () => Boolean(obtenerConfig().porDocumento?.[ruta]?.notasDerecha),
    poner: (valor) => {
      const actual = obtenerConfig();
      const porDocumento = { ...actual.porDocumento, [ruta]: { ...(actual.porDocumento[ruta] ?? {}), notasDerecha: Boolean(valor) } };
      aplicarConfig({ ...actual, porDocumento });
      window.liberadopdf.guardarConfig({ porDocumento });
    },
  } : null,
});
aplicarTema(config.tema);
const nocturno = instalarNocturno({ obtenerConfig, guardar: nueva => { config = nueva; window.liberadopdf.guardarConfig(nueva); } });
const instantanea = instalarInstantanea();
const transiciones = instalarTransiciones({ app, obtenerConfig, modoActual });
const punteros = instalarPunteros({ app, modoActual });
// Páginas de Beamer con las notas en la mitad derecha (pgfpages): en presentación se muestra solo la izquierda.
const notasDerecha = () => Boolean(obtenerConfig().porDocumento?.[ruta]?.notasDerecha);
const aplicarNotasDerecha = () => {
  const contenedor = document.getElementById('viewerContainer');
  const activo = notasDerecha();
  contenedor.classList.toggle('liberadopdf-notas-derecha', activo);
  if (!activo || modoActual() !== 'presentacion') return;
  // La mitad izquierda se amplía hasta llenar la altura (máximo ×2) y se centra; con láminas 4:3 no se recorta nada.
  const pagina = contenedor.querySelector('.pdfViewer .page[data-page-number="' + app.page + '"]');
  if (!pagina) return;
  // Se mide sin transformación (getBoundingClientRect la incluiría y realimentaría el cálculo)
  contenedor.style.setProperty('--liberadopdf-notas-escala', '1');
  contenedor.style.setProperty('--liberadopdf-notas-dx', '0px');
  const r = pagina.getBoundingClientRect();
  const c = contenedor.getBoundingClientRect();
  const escala = Math.min(2, c.height / r.height);
  const dx = (c.width - escala * r.width / 2) / 2 - (r.left - c.left);
  contenedor.style.setProperty('--liberadopdf-notas-escala', String(escala));
  contenedor.style.setProperty('--liberadopdf-notas-dx', `${dx}px`);
};
app.eventBus.on('presentationmodechanged', () => setTimeout(aplicarNotasDerecha, 50));
app.eventBus.on('pagerendered', () => aplicarNotasDerecha());
window.addEventListener('resize', () => aplicarNotasDerecha());
// Estado para la vista de presentador
let etiquetasDocumento = null;
const enviarEstado = () => window.liberadopdf.presentadorEstado({ pagina: app.page, totalPaginas: app.pagesCount, etiquetas: etiquetasDocumento, notasDerecha: notasDerecha() });
app.eventBus.on('pagechanging', enviarEstado);
window.liberadopdfAplicarDocumento = () => { aplicarNotasDerecha(); enviarEstado(); };
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
  if (cierre.hayEdiciones()) await app.save(); else await app.download(); // sin ediciones, los bytes originales
};
window.liberadopdf.alGuardado(({ ruta }) => { cierre.marcarGuardado(); mostrarToast(t('Guardado: {nombre}', { nombre: ruta.split(/[\\/]/).pop() })); });
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
window.liberadopdfAcciones = { presentacion: acciones.presentacion, ayuda: acciones.ayuda, personalizarBarra: () => barra.abrirDialogo(), ajustes: acciones.ajustes, instantanea: acciones.instantanea, guardar: acciones.guardar, guardarComo: acciones.guardarComo, cuadricula: acciones.cuadricula, medirDistancia: acciones.medirDistancia, medirArea: acciones.medirArea, calibrar: acciones.calibrar, presentador: acciones.presentador, siguiente: acciones.siguiente, anterior: acciones.anterior, enviarEstado, herramienta: abrirHerramienta };

const ponerTitulo = () => { document.title = nombre ? `${nombre} · liberadoPDF` : 'liberadoPDF'; };
const alCargar = async () => {
  ponerTitulo();
  window.liberadopdf.documentoAbierto({ ruta, nombre });
  const etiquetas = await app.pdfDocument.getPageLabels();
  etiquetasDocumento = etiquetas;
  grupos = agruparEtiquetas(etiquetas, app.pagesCount);
  contador.actualizar();
  // El PDF pide abrirse a pantalla completa (/PageMode /FullScreen)
  const modoPagina = await app.pdfDocument.getPageMode().catch(() => null);
  if (modoPagina === 'FullScreen') window.liberadopdf.pedirPresentacion();
  enviarEstado();
  // /Trans de cada página (pdf-lib) se lee al entrar por primera vez en presentación, solo si las transiciones
  // están activas y el PDF no es enorme (pdf-lib analiza todo el archivo en este hilo).
  const urlPdf = parametros.get('file');
  const LIMITE_TRANSICIONES = 50 * 1024 * 1024;
  let transicionesCargadas = false;
  const cargarTransiciones = async () => {
    if (transicionesCargadas || !urlPdf || !obtenerConfig().presentacion.transiciones) return;
    transicionesCargadas = true;
    const { length } = await app.pdfDocument.getDownloadInfo();
    if (length > LIMITE_TRANSICIONES) { console.warn('liberadoPDF: PDF de más de 50 MB, sin transiciones'); return; }
    await transiciones.cargar(urlPdf);
    window.liberadopdfEstado.transiciones = transiciones.obtener();
  };
  app.eventBus.on('presentationmodechanged', () => { if (modoActual() === 'presentacion') cargarTransiciones(); });
  if (modoPagina === 'FullScreen') cargarTransiciones();
};
if (app.pdfDocument) alCargar(); else app.eventBus.on('documentloaded', alCargar);
// PDF corrupto, cifrado sin contraseña válida o ilegible: pdf.js solo lo registra en consola; aquí se vuelve
// a la pantalla de inicio con el motivo en vez de dejar un visor vacío.
app.eventBus.on('documenterror', ({ message }) => {
  window.liberadopdf.abrirInicio(t('No se pudo abrir {nombre}: {detalle}', { nombre: nombre || t('el PDF'), detalle: message || t('archivo dañado o no es un PDF') }));
});
app.eventBus.on('metadataloaded', ponerTitulo); // pdf.js pone su propio título al leer los metadatos

