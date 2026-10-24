// Canales IPC entre el renderer (preload) y el proceso principal.
import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { agregarReciente } from '../comun/config.mjs';
import { abrirEnVentana, abrirInicioEnVentana } from './ventanas.js';
import { errorDeRutaPdf } from '../comun/argumentos.mjs';

export const eventosHumo = new EventEmitter();
const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

export function instalarIpc({ obtenerConfig, obtenerConfigBase = obtenerConfig, guardar, abrirEnNueva, alCambiarRecientes = () => {} }) {
  const ventanaDe = evento => BrowserWindow.fromWebContents(evento.sender);

  ipcMain.handle('abrir-dialogo', async (evento) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(ventanaDe(evento), {
      title: 'Abrir PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    });
    return canceled || filePaths.length === 0 ? null : filePaths[0];
  });
  // Toda ruta que llega del renderer (arrastre, recientes, diálogo) se valida en el main: un PDF existente o
  // la pantalla de inicio con el motivo. Así un renderer comprometido tampoco puede pedir archivos arbitrarios.
  ipcMain.handle('abrir-en-esta', (evento, ruta) => {
    const error = errorDeRutaPdf(ruta, existsSync);
    if (error) abrirInicioEnVentana(ventanaDe(evento), error); else abrirEnVentana(ventanaDe(evento), ruta);
  });
  ipcMain.handle('abrir-en-nueva', (evento, ruta) => {
    const error = errorDeRutaPdf(ruta, existsSync);
    if (error) abrirInicioEnVentana(ventanaDe(evento), error); else abrirEnNueva(ruta);
  });
  // La pantalla de inicio con un mensaje (p. ej. PDF corrupto detectado por pdf.js en el renderer).
  ipcMain.handle('abrir-inicio', (evento, mensaje) => { abrirInicioEnVentana(ventanaDe(evento), String(mensaje ?? '').slice(0, 300)); });
  ipcMain.handle('recientes', () => obtenerConfig().recientes.filter(r => existsSync(r.ruta)));
  ipcMain.handle('config', () => obtenerConfig());
  ipcMain.handle('guardar-config', (evento, parcial) => {
    const config = obtenerConfigBase();
    guardar({ ...config, ...parcial, presentacion: { ...config.presentacion, ...(parcial?.presentacion ?? {}) } });
  });
  ipcMain.handle('abrir-externo', (evento, url) => {
    if (typeof url === 'string' && ENLACE_EXTERNO.test(url)) shell.openExternal(url);
  });
  ipcMain.handle('documento-abierto', (evento, { ruta, nombre }) => {
    if (typeof ruta !== 'string' || !ruta) return;
    const config = obtenerConfigBase();
    guardar({ ...config, recientes: agregarReciente(config.recientes, { ruta, nombre: nombre || path.basename(ruta), fecha: Date.now() }) });
    alCambiarRecientes();
  });
  // El renderer avisa una vez cuando el usuario anota o rellena campos: la ventana lo recuerda para el cierre.
  ipcMain.on('ediciones-usuario', (evento) => { const win = ventanaDe(evento); if (win) win.liberadopdfEdiciones = true; });
  if (process.env.LIBERADOPDF_HUMO) {
    ipcMain.on('humo-evento', (evento, { nombre, t }) => { if (nombre === 'primera-pagina') eventosHumo.emit(nombre, t); });
  }
  // /PageMode /FullScreen: el renderer no puede pedir pantalla completa sin gesto; el main aporta el gesto.
  ipcMain.handle('pedir-presentacion', (evento) => {
    ventanaDe(evento)?.webContents.executeJavaScript('window.liberadopdfAcciones?.presentacion?.()', true);
  });
}
