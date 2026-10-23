// Ventanas de liberadoPDF: visor (un PDF por ventana) o pantalla de inicio.
import { BrowserWindow, shell } from 'electron';
import { ESQUEMA, urlVisor, urlInicio } from './protocolo.js';

const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

export function crearVentana({ ruta, preload, mensaje }) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'liberadoPDF',
    autoHideMenuBar: false,
    backgroundColor: '#ffffff',
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
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
  win.on('enter-html-full-screen', () => win.setMenuBarVisibility(false));
  win.on('leave-html-full-screen', () => win.setMenuBarVisibility(true));
  win.loadURL(ruta ? urlVisor(ruta) : urlInicio(mensaje));
  return win;
}

export function abrirEnVentana(win, ruta) {
  win.loadURL(urlVisor(ruta));
}

export function ventanaActiva() {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}
