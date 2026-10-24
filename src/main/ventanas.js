// Ventanas de liberadoPDF: visor (un PDF por ventana) o pantalla de inicio.
import { BrowserWindow, dialog, shell, session } from 'electron';
import { rutaDeGuardadoComo } from '../comun/guardado.mjs';
import { ESQUEMA, urlVisor, urlInicio } from './protocolo.js';

const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

export function crearVentana({ ruta, preload, mensaje }) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'liberadoPDF',
    autoHideMenuBar: false,
    backgroundColor: '#ffffff',
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
      title: 'Cambios sin guardar',
      message: 'Hay anotaciones o campos modificados sin guardar.',
      detail: 'Si cierras ahora se perderán. Pulsa Cancelar y usa Guardar (Ctrl+S) para conservarlos.',
      buttons: ['Cerrar sin guardar', 'Cancelar'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    });
    if (respuesta === 0) evento.preventDefault();
  });
  // Si el renderer cae en plena charla, se recarga la ventana en vez de dejarla vacía.
  win.webContents.on('render-process-gone', (evento, detalles) => {
    console.warn('El renderer terminó:', detalles.reason);
    if (detalles.reason !== 'clean-exit' && !win.isDestroyed()) win.reload();
  });
  win.on('enter-html-full-screen', () => win.setMenuBarVisibility(false));
  win.on('leave-html-full-screen', () => win.setMenuBarVisibility(true));
  win.liberadopdfRuta = ruta ?? null;
  win.loadURL(ruta ? urlVisor(ruta) : urlInicio(mensaje));
  return win;
}

// Guardar / guardar como: pdf.js descarga el PDF con sus cambios por un <a download>; aquí se decide la ruta.
// Modo 'sobrescribir' (Ctrl+S) → confirma y escribe sobre el archivo abierto; cualquier otro → diálogo «Guardar como».
export function instalarGuardado() {
  session.defaultSession.on('will-download', (evento, item, contenido) => {
    const win = BrowserWindow.fromWebContents(contenido);
    if (!win) return;
    const modo = win.liberadopdfGuardado ?? 'como';
    win.liberadopdfGuardado = null;
    const original = win.liberadopdfRuta;
    const forzada = process.env.LIBERADOPDF_HUMO_GUARDAR; // prueba de humo: sin diálogos
    if (forzada) {
      item.setSavePath(forzada);
    } else if (modo === 'sobrescribir' && original) {
      const respuesta = dialog.showMessageBoxSync(win, {
        type: 'question', title: 'Guardar', message: `¿Sobrescribir ${original.split(/[\\/]/).pop()}?`,
        detail: original, buttons: ['Sobrescribir', 'Cancelar'], defaultId: 0, cancelId: 1, noLink: true,
      });
      if (respuesta !== 0) { item.cancel(); return; }
      item.setSavePath(original);
    } else {
      item.setSaveDialogOptions({
        title: 'Guardar como',
        defaultPath: original ? rutaDeGuardadoComo(original) : undefined,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
    }
    item.once('done', (e, estado) => {
      if (estado === 'completed') {
        win.liberadopdfEdiciones = false;
        if (!win.isDestroyed()) win.webContents.send('guardado', { ruta: item.getSavePath() });
      } else if (estado === 'interrupted') {
        dialog.showMessageBox(win, { type: 'error', title: 'Guardar', message: 'No se pudo guardar el archivo.', detail: item.getSavePath() || original || '' });
      }
    });
  });
}

export function abrirEnVentana(win, ruta) {
  win.liberadopdfEdiciones = false;
  win.liberadopdfRuta = ruta;
  win.loadURL(urlVisor(ruta));
}

// Vista de presentador: segunda ventana ligada a la del visor; sigue su página por IPC.
export function crearVentanaPresentador({ win, preload, pantalla }) {
  if (win.liberadopdfPresentador && !win.liberadopdfPresentador.isDestroyed()) {
    win.liberadopdfPresentador.focus();
    return win.liberadopdfPresentador;
  }
  const opciones = {
    width: 1100, height: 700, title: 'Vista de presentador · liberadoPDF', autoHideMenuBar: true, backgroundColor: '#141414',
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
  presentador.on('closed', () => { if (!win.isDestroyed()) win.liberadopdfPresentador = null; });
  win.on('closed', () => { if (!presentador.isDestroyed()) presentador.close(); });
  return presentador;
}

export function abrirInicioEnVentana(win, mensaje) {
  win.liberadopdfEdiciones = false;
  win.loadURL(urlInicio(mensaje));
}

export function ventanaActiva() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}
