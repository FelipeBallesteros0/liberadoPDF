// Ventanas de liberadoPDF: visor (un PDF por ventana) o pantalla de inicio.
import { BrowserWindow, dialog, shell, session, screen, nativeTheme } from 'electron';
import { rutaDeGuardadoComo } from '../comun/guardado.mjs';
import { conTeclasDeMac } from '../comun/teclas.mjs';
import { ESQUEMA, urlVisor, urlInicio } from './protocolo.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

let t = x => x;
export function usarTraductor(fn) { t = fn; }

const ICONO_LINUX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'recursos', 'icono.png');

// Tamaño inicial: 1280×800 como máximo, pero sin pasar del 85 % del área útil de la pantalla donde está el cursor
// (en un portátil de 13" la ventana fija llenaba la pantalla y parecía pantalla completa).
function tamanoInicial() {
  const { width, height } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize;
  return { width: Math.min(1280, Math.round(width * 0.85)), height: Math.min(800, Math.round(height * 0.85)) };
}

export function crearVentana({ ruta, preload, mensaje, pagina = null }) {
  const win = new BrowserWindow({
    ...(process.platform === 'linux' ? { icon: ICONO_LINUX } : {}), // en Windows el icono va en el .exe
    ...tamanoInicial(),
    minWidth: 480,
    minHeight: 360,
    title: 'liberadoPDF',
    autoHideMenuBar: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#2a2a2e' : '#ffffff',
    // backgroundThrottling: false → las animaciones (temporizadores del sandbox de pdf.js) no se frenan
    // si la ventana queda tapada un momento (un diálogo, otra ventana) durante una presentación.
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  // Nunca se navega la ventana: los enlaces externos van al navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (ENLACE_EXTERNO.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (evento, url) => {
    if (url.startsWith(`${ESQUEMA}://`)) return;
    evento.preventDefault();
    if (ENLACE_EXTERNO.test(url)) shell.openExternal(url);
  });
  // pdf.js bloquea el cierre (beforeunload) en cuanto su almacén de anotaciones cambia, y las animaciones
  // lo cambian solas. Aquí se decide de verdad: sin ediciones del usuario se cierra; con ellas se pregunta.
  win.webContents.on('will-prevent-unload', (evento) => {
    if (!win.liberadopdfEdiciones) { evento.preventDefault(); return; }
    const respuesta = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: t('Cambios sin guardar'),
      message: t('Hay anotaciones o campos modificados sin guardar.'),
      detail: conTeclasDeMac(t('Si cierras ahora se perderán. Pulsa Cancelar y usa Guardar (Ctrl+S) para conservarlos.'), process.platform === 'darwin'),
      buttons: [t('Cerrar sin guardar'), t('Cancelar')],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (respuesta === 0) evento.preventDefault();
  });
  // Si el renderer cae en plena charla, se recarga la ventana en vez de dejarla vacía.
  // Si el renderer muere (sin memoria, fallo de GPU…) se recarga, pero no más de 3 veces seguidas: a la cuarta, la
  // pantalla de inicio con el motivo, para no quedar en un bucle de recargas.
  win.webContents.on('render-process-gone', (evento, detalles) => {
    console.warn('El renderer terminó:', detalles.reason);
    if (detalles.reason === 'clean-exit' || win.isDestroyed()) return;
    win.liberadopdfRecargas = (win.liberadopdfRecargas ?? 0) + 1;
    if (win.liberadopdfRecargas <= 3) win.reload();
    else { win.liberadopdfRuta = null; win.loadURL(urlInicio(t('El visor falló varias veces seguidas ({motivo}); vuelve a abrir el documento.', { motivo: detalles.reason }))); }
  });
  win.webContents.on('did-finish-load', () => { if (win.liberadopdfRecargas) setTimeout(() => { if (!win.isDestroyed()) win.liberadopdfRecargas = 0; }, 30_000); }); // 30 s estable = contador a cero
  win.on('enter-html-full-screen', () => win.setMenuBarVisibility(false));
  win.on('leave-html-full-screen', () => win.setMenuBarVisibility(true));
  win.liberadopdfRuta = ruta ?? null;
  win.loadURL(ruta ? urlVisor(ruta, pagina) : urlInicio(mensaje));
  return win;
}

// Guardar / guardar como: pdf.js descarga el PDF con sus cambios por un <a download>; aquí se decide la ruta.
// Modo 'sobrescribir' (Ctrl+S) → confirma y escribe sobre el archivo abierto; cualquier otro → diálogo «Guardar como».
export function instalarGuardado() {
  session.defaultSession.on('will-download', (evento, item, contenido) => {
    const win = BrowserWindow.fromWebContents(contenido);
    if (!win) return;
    const original = win.liberadopdfRuta;
    const nombreDoc = original ? original.split(/[\\/]/).pop() : null;
    // Solo es «guardar el documento» si liberadoPDF lo pidió hace poco o pdf.js descarga el propio PDF;
    // los adjuntos del panel lateral (otros nombres o tipos) van al diálogo normal sin tocar nada más.
    const pedidoReciente = Date.now() - (win.liberadopdfGuardadoEn ?? 0) < 5000;
    const esElDocumento = item.getMimeType() === 'application/pdf' && item.getFilename() === nombreDoc;
    if (!pedidoReciente && !esElDocumento) {
      item.setSaveDialogOptions({ title: t('Guardar adjunto'), defaultPath: item.getFilename() });
      return;
    }
    const modo = win.liberadopdfGuardado ?? 'como';
    win.liberadopdfGuardado = null;
    win.liberadopdfGuardadoEn = 0;
    const forzada = process.env.LIBERADOPDF_HUMO ? process.env.LIBERADOPDF_HUMO_GUARDAR : null; // prueba de humo: sin diálogos
    if (forzada) {
      item.setSavePath(forzada);
    } else if (modo === 'sobrescribir' && original) {
      const respuesta = dialog.showMessageBoxSync(win, {
        type: 'question', title: t('Guardar'), message: t('¿Sobrescribir {nombre}?', { nombre: original.split(/[\\/]/).pop() }),
        detail: original, buttons: [t('Sobrescribir'), t('Cancelar')], defaultId: 0, cancelId: 1, noLink: true,
      });
      if (respuesta !== 0) { item.cancel(); return; }
      item.setSavePath(original);
    } else {
      item.setSaveDialogOptions({
        title: t('Guardar como'),
        defaultPath: original ? rutaDeGuardadoComo(original) : undefined,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
    }
    item.once('done', (e, estado) => {
      if (estado === 'completed') {
        win.liberadopdfEdiciones = false;
        if (!win.isDestroyed()) win.webContents.send('guardado', { ruta: item.getSavePath() });
      } else if (estado === 'interrupted') {
        dialog.showMessageBox(win, { type: 'error', title: t('Guardar'), message: t('No se pudo guardar el archivo.'), detail: item.getSavePath() || original || '' });
      }
    });
  });
}

// Al cambiar de documento se olvidan las ediciones y se cierra la vista de presentador (mostraba el PDF anterior).
function alCambiarDocumento(win, ruta) {
  win.liberadopdfEdiciones = false;
  win.liberadopdfGuardado = null;
  win.liberadopdfRuta = ruta;
  const presentador = win.liberadopdfPresentador;
  if (presentador && !presentador.isDestroyed()) presentador.close();
  win.liberadopdfPresentador = null;
}

export function abrirEnVentana(win, ruta) {
  alCambiarDocumento(win, ruta);
  win.loadURL(urlVisor(ruta));
}

// Vista de presentador: segunda ventana ligada a la del visor; sigue su página por IPC.
export function crearVentanaPresentador({ win, preload, pantalla }) {
  if (win.liberadopdfPresentador && !win.liberadopdfPresentador.isDestroyed()) {
    win.liberadopdfPresentador.focus();
    return win.liberadopdfPresentador;
  }
  const opciones = {
    ...(process.platform === 'linux' ? { icon: ICONO_LINUX } : {}),
    width: 1100, height: 700, title: t('Vista de presentador · liberadoPDF'), autoHideMenuBar: true, backgroundColor: '#141414',
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  };
  if (pantalla) {
    const { x, y, width, height } = pantalla.workArea;
    Object.assign(opciones, { x: x + 40, y: y + 40, width: Math.min(1100, width - 80), height: Math.min(700, height - 80) });
  }
  const presentador = new BrowserWindow(opciones);
  presentador.setMenuBarVisibility(false);
  presentador.liberadopdfVisor = win;
  win.liberadopdfPresentador = presentador;
  const url = win.webContents.getURL();
  const parametros = new URL(url).searchParams;
  const archivo = parametros.get('file');
  const ruta = parametros.get('ruta') ?? '';
  presentador.loadURL(`${ESQUEMA}://app/presentador.html?file=${encodeURIComponent(archivo ?? '')}&ruta=${encodeURIComponent(ruta)}`);
  presentador.on('closed', () => { if (!win.isDestroyed() && win.liberadopdfPresentador === presentador) win.liberadopdfPresentador = null; });
  if (!win.liberadopdfCierraPresentador) { // un solo oyente por ventana del visor
    win.liberadopdfCierraPresentador = true;
    win.on('closed', () => { const p = win.liberadopdfPresentador; if (p && !p.isDestroyed()) p.close(); });
  }
  return presentador;
}

export function abrirInicioEnVentana(win, mensaje) {
  alCambiarDocumento(win, null);
  win.loadURL(urlInicio(mensaje));
}

export function ventanaActiva() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}
