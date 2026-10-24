// Canales IPC entre el renderer (preload) y el proceso principal.
import { ipcMain, dialog, shell, BrowserWindow, screen, clipboard, ClipboardItem } from 'electron';
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { agregarReciente, fusionarConfigGuardada } from '../comun/config.mjs';
import { abrirEnVentana, abrirInicioEnVentana, crearVentanaPresentador } from './ventanas.js';
import { errorDeRutaPdf } from '../comun/argumentos.mjs';
import { elegirPantallas } from '../comun/pantallas.mjs';

export const eventosHumo = new EventEmitter();
const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

export function instalarIpc({ obtenerConfig, obtenerConfigBase = obtenerConfig, guardar, abrirEnNueva, alCambiarRecientes = () => {}, preload }) {
  const ventanaDe = evento => BrowserWindow.fromWebContents(evento.sender);
  const pantallasSimples = () => { const principal = screen.getPrimaryDisplay().id; return screen.getAllDisplays().map(d => ({ id: d.id, principal: d.id === principal })); };
  const pantallaPorId = id => screen.getAllDisplays().find(d => d.id === id);
  const pantallaDelPresentador = () => { const { presentador } = elegirPantallas(pantallasSimples(), obtenerConfig()); return presentador === null ? undefined : pantallaPorId(presentador); };

  // Antes de pedir pantalla completa: con dos o más pantallas, la ventana del visor va a la del proyector.
  ipcMain.handle('antes-de-presentar', (evento) => {
    const win = ventanaDe(evento);
    if (!win) return false;
    const { presentacion } = elegirPantallas(pantallasSimples(), obtenerConfig());
    const destino = presentacion === null ? null : pantallaPorId(presentacion);
    if (!destino) return false;
    if (screen.getDisplayMatching(win.getBounds()).id !== destino.id) { if (win.isMaximized()) win.unmaximize(); win.setBounds(destino.workArea); }
    return true;
  });

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
  // Modo del próximo guardado que pedirá pdf.js (Ctrl+S → sobrescribir; botón o Guardar como → diálogo)
  ipcMain.handle('modo-guardado', (evento, modo) => {
    const win = ventanaDe(evento);
    if (win) { win.liberadopdfGuardado = modo === 'sobrescribir' ? 'sobrescribir' : 'como'; win.liberadopdfGuardadoEn = Date.now(); }
  });
  // Vista de presentador
  ipcMain.handle('presentador-abrir', (evento) => {
    const win = ventanaDe(evento);
    if (!win) return false;
    crearVentanaPresentador({ win, preload, pantalla: pantallaDelPresentador() });
    return true;
  });
  ipcMain.handle('presentador-cerrar', (evento) => { const p = ventanaDe(evento)?.liberadopdfPresentador; if (p && !p.isDestroyed()) p.close(); });
  ipcMain.on('presentador-estado', (evento, estado) => {
    const p = ventanaDe(evento)?.liberadopdfPresentador;
    if (p && !p.isDestroyed()) p.webContents.send('estado', estado);
  });
  // El presentador avisa que está listo: el visor reenvía su estado actual
  ipcMain.on('presentador-listo', (evento) => {
    const visor = ventanaDe(evento)?.liberadopdfVisor;
    if (visor && !visor.isDestroyed()) visor.webContents.executeJavaScript('window.liberadopdfAcciones?.enviarEstado?.()').catch(() => {});
  });
  ipcMain.on('presentador-navegar', (evento, delta) => {
    const visor = ventanaDe(evento)?.liberadopdfVisor;
    if (visor && !visor.isDestroyed()) visor.webContents.executeJavaScript(`window.liberadopdfAcciones?.${delta > 0 ? 'siguiente' : 'anterior'}?.()`).catch(() => {});
  });
  // Notas: solo el archivo <ruta del pdf>.notas.txt
  ipcMain.handle('leer-notas', (evento) => {
    const rutaPdf = ventanaDe(evento)?.liberadopdfVisor?.liberadopdfRuta; // solo el documento de la ventana emparejada
    if (typeof rutaPdf !== 'string' || !/\.pdf$/i.test(rutaPdf)) return '';
    try { return readFileSync(rutaPdf + '.notas.txt', 'utf8'); } catch { return ''; }
  });
  // La pantalla de inicio con un mensaje (p. ej. PDF corrupto detectado por pdf.js en el renderer).
  ipcMain.handle('abrir-inicio', (evento, mensaje) => { abrirInicioEnVentana(ventanaDe(evento), String(mensaje ?? '').slice(0, 300)); });
  ipcMain.handle('recientes', () => obtenerConfig().recientes.filter(r => existsSync(r.ruta)));
  ipcMain.handle('config', () => obtenerConfig());
  // Instantánea: captura un rectángulo de la ventana (coordenadas CSS) al portapapeles.
  ipcMain.handle('instantanea', async (evento, rect) => {
    const win = ventanaDe(evento);
    if (!win || !rect) return false;
    const { width: anchoVentana, height: altoVentana } = win.getContentBounds();
    const entero = v => Number.isInteger(v) && v >= 0;
    if (![rect.x, rect.y, rect.width, rect.height].every(entero) || rect.width === 0 || rect.height === 0) return false;
    if (rect.x + rect.width > anchoVentana || rect.y + rect.height > altoVentana) return false;
    const imagen = await win.webContents.capturePage({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    if (imagen.isEmpty()) return false;
    // Electron 45: API de portapapeles al estilo web (ClipboardItem con un Blob PNG)
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([imagen.toPNG()], { type: 'image/png' }) })]);
    return true;
  });
  ipcMain.handle('pantallas', () => screen.getAllDisplays().map((d, i) => ({
    id: d.id, etiqueta: d.label || `Pantalla ${i + 1}`, ancho: d.size.width, alto: d.size.height, principal: d.id === screen.getPrimaryDisplay().id,
  })));
  // El preload lo pide de forma síncrona antes de que arranque pdf.js (viewerCssTheme: 0 sistema, 1 claro, 2 oscuro).
  ipcMain.on('tema-inicial', (evento) => {
    const tema = obtenerConfig().tema;
    evento.returnValue = tema === 'claro' ? 1 : tema === 'oscuro' ? 2 : 0;
  });
  ipcMain.handle('guardar-config', (evento, parcial) => {
    guardar(fusionarConfigGuardada(obtenerConfigBase(), parcial));
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
