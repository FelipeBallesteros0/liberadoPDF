// Ventanas de liberadoPDF: visor (un PDF por ventana) o pantalla de inicio.
import { BrowserWindow, dialog, shell } from 'electron';
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
  win.on('enter-html-full-screen', () => win.setMenuBarVisibility(false));
  win.on('leave-html-full-screen', () => win.setMenuBarVisibility(true));
  win.loadURL(ruta ? urlVisor(ruta) : urlInicio(mensaje));
  return win;
}

export function abrirEnVentana(win, ruta) {
  win.liberadopdfEdiciones = false;
  win.loadURL(urlVisor(ruta));
}

export function ventanaActiva() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}
