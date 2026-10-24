// Canales IPC entre el renderer (preload) y el proceso principal.
import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { agregarReciente } from '../comun/config.mjs';
import { abrirEnVentana } from './ventanas.js';

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
  ipcMain.handle('abrir-en-esta', (evento, ruta) => { abrirEnVentana(ventanaDe(evento), ruta); });
  ipcMain.handle('abrir-en-nueva', (evento, ruta) => { abrirEnNueva(ruta); });
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
  ipcMain.on('humo-evento', (evento, { nombre, t }) => { eventosHumo.emit(nombre, t); });
}

export function enviarAccion(win, nombre) {
  win?.webContents.send('accion', nombre);
}
