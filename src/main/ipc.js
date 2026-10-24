// Canales IPC entre el renderer (preload) y el proceso principal.
import { app, ipcMain, dialog, shell, BrowserWindow, screen, clipboard, ClipboardItem } from 'electron';
import { EventEmitter } from 'node:events';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { agregarReciente, fusionarConfigGuardada } from '../comun/config.mjs';
import { abrirEnVentana, abrirInicioEnVentana, crearVentanaPresentador } from './ventanas.js';
import { registrarArchivo, urlDeToken, rutaDeToken } from './protocolo.js';
import { urlPermitida } from '../comun/herramientas/html.mjs';
import { mismaRuta } from '../comun/rutas.mjs';
import { rutaDeVideoPermitida } from '../comun/rutasVideo.mjs';
import { errorDeRutaPdf } from '../comun/argumentos.mjs';
import { elegirPantallas } from '../comun/pantallas.mjs';

export const eventosHumo = new EventEmitter();
const ENLACE_EXTERNO = /^(https?:|mailto:)/i;

export function instalarIpc({ idioma = 'en', t = x => x, traducirMensaje = x => x, obtenerConfig, obtenerConfigBase = obtenerConfig, guardar, abrirEnNueva, alCambiarRecientes = () => {}, preload }) {
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
      title: t('Abrir PDF'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    });
    return canceled || filePaths.length === 0 ? null : filePaths[0];
  });
  // Toda ruta que llega del renderer (arrastre, recientes, diálogo) se valida en el main: un PDF existente o
  // la pantalla de inicio con el motivo. Así un renderer comprometido tampoco puede pedir archivos arbitrarios.
  ipcMain.handle('abrir-en-esta', (evento, ruta) => {
    const error = errorDeRutaPdf(ruta, existsSync);
    if (error) abrirInicioEnVentana(ventanaDe(evento), traducirMensaje(error)); else abrirEnVentana(ventanaDe(evento), ruta);
  });
  ipcMain.handle('abrir-en-nueva', (evento, ruta) => {
    const error = errorDeRutaPdf(ruta, existsSync);
    if (error) abrirInicioEnVentana(ventanaDe(evento), traducirMensaje(error)); else abrirEnNueva(ruta);
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
  // Herramientas: archivos de entrada (servidos por token) y resultados (siempre a un archivo o carpeta nuevos).
  const FILTROS = {
    pdf: [{ name: 'PDF', extensions: ['pdf'] }],
    imagenes: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
    html: [{ name: 'HTML', extensions: ['html', 'htm'] }],
  };
  ipcMain.handle('elegir-archivos', async (evento, { filtros = 'pdf', varios = true } = {}) => {
    if (process.env.LIBERADOPDF_HUMO && process.env.LIBERADOPDF_HUMO_ELEGIR) { // la prueba de humo no puede pulsar el diálogo nativo
      return process.env.LIBERADOPDF_HUMO_ELEGIR.split(path.delimiter).map(ruta => ({ ruta, nombre: path.basename(ruta), url: urlDeToken(registrarArchivo(ruta)) }));
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(ventanaDe(evento), {
      title: t('Elegir archivos'), filters: FILTROS[filtros] ?? FILTROS.pdf, properties: varios ? ['openFile', 'multiSelections'] : ['openFile'],
    });
    if (canceled) return [];
    return filePaths.map(ruta => ({ ruta, nombre: path.basename(ruta), url: urlDeToken(registrarArchivo(ruta)) }));
  });
  // Carpetas que el usuario eligió con un diálogo en esta ventana: solo a esas se puede guardar sin volver a preguntar.
  const carpetasElegidas = win => (win.liberadopdfCarpetas ??= new Set());
  ipcMain.handle('elegir-carpeta', async (evento) => {
    const win = ventanaDe(evento);
    let carpeta = process.env.LIBERADOPDF_HUMO ? process.env.LIBERADOPDF_HUMO_CARPETA : null;
    if (!carpeta) {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: t('Elegir carpeta'), defaultPath: carpetaDelDocumento(win), properties: ['openDirectory', 'createDirectory'] });
      if (canceled || !filePaths.length) return null;
      carpeta = filePaths[0];
    }
    mkdirSync(carpeta, { recursive: true });
    if (win) carpetasElegidas(win).add(carpeta);
    return carpeta;
  });
  const carpetaDelDocumento = win => (win?.liberadopdfRuta ? path.dirname(win.liberadopdfRuta) : undefined);
  const nombreSeguro = nombre => path.basename(String(nombre)).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'resultado';
  ipcMain.handle('guardar-resultado', async (evento, { nombre, bytes }) => {
    const win = ventanaDe(evento);
    if (!(bytes instanceof Uint8Array) || typeof nombre !== 'string') return null;
    const propuesto = nombreSeguro(nombre);
    let destino = process.env.LIBERADOPDF_HUMO ? process.env.LIBERADOPDF_HUMO_GUARDAR : null;
    if (!destino) {
      const carpeta = carpetaDelDocumento(win);
      const ext = propuesto.includes('.') ? propuesto.split('.').pop() : '';
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: t('Guardar resultado'), defaultPath: carpeta ? path.join(carpeta, propuesto) : propuesto,
        filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [],
      });
      if (canceled || !filePath) return null;
      destino = filePath;
    }
    if (win?.liberadopdfRuta && mismaRuta(destino, win.liberadopdfRuta)) return { error: t('No se puede sobrescribir el documento abierto: elige otro nombre.') };
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, Buffer.from(bytes));
    return destino;
  });
  // `carpeta` solo se acepta si salió de elegir-carpeta en esta misma ventana (así se guarda página a página sin preguntar).
  ipcMain.handle('guardar-resultados', async (evento, { archivos, carpeta: carpetaPrevia }) => {
    const win = ventanaDe(evento);
    if (!Array.isArray(archivos)) return null;
    let carpeta = typeof carpetaPrevia === 'string' && win && carpetasElegidas(win).has(carpetaPrevia) ? carpetaPrevia : null;
    if (!carpeta) carpeta = process.env.LIBERADOPDF_HUMO ? process.env.LIBERADOPDF_HUMO_CARPETA : null;
    if (!carpeta) {
      const { canceled, filePaths } = await dialog.showOpenDialog(win, { title: t('Carpeta para los resultados'), defaultPath: carpetaDelDocumento(win), properties: ['openDirectory', 'createDirectory'] });
      if (canceled || !filePaths.length) return null;
      carpeta = filePaths[0];
      if (win) carpetasElegidas(win).add(carpeta);
    }
    mkdirSync(carpeta, { recursive: true });
    for (const { nombre, bytes } of archivos) {
      if (!(bytes instanceof Uint8Array) || typeof nombre !== 'string') continue;
      const base = nombreSeguro(nombre);
      let destino = path.join(carpeta, base);
      for (let n = 2; existsSync(destino); n++) destino = path.join(carpeta, base.replace(/(\.[^.]+)?$/, ` (${n})$1`)); // nunca sobrescribir
      writeFileSync(destino, Buffer.from(bytes));
    }
    return carpeta;
  });
  ipcMain.handle('abrir-resultado', (evento, ruta) => { if (!errorDeRutaPdf(ruta, existsSync)) abrirEnNueva(ruta); });
  // Video externo referenciado por el PDF: solo dentro de la carpeta del documento (o subcarpetas); se sirve por token.
  ipcMain.handle('archivo-junto-al-pdf', (evento, relativa) => {
    const win = ventanaDe(evento);
    if (!win?.liberadopdfRuta || typeof relativa !== 'string') return null;
    const ruta = rutaDeVideoPermitida(path.dirname(win.liberadopdfRuta), relativa);
    if (!ruta || !existsSync(ruta)) return null;
    return urlDeToken(registrarArchivo(ruta));
  });
  // Página web o HTML a PDF: ventana oculta y aislada; solo http(s) o un archivo .html elegido con el diálogo (token).
  ipcMain.handle('html-a-pdf', async (evento, { origen, valor, tamano, apaisado, fondos } = {}) => {
    let destino;
    if (origen === 'url') { destino = urlPermitida(valor); if (!destino) return { error: t('Dirección no permitida') }; }
    else {
      const token = String(valor ?? '').split('/pdf/')[1];
      const ruta = token ? rutaDeToken(token) : null;
      if (!ruta || !/\.html?$/i.test(ruta) || !existsSync(ruta)) return { error: t('Archivo HTML no válido') };
      destino = ruta;
    }
    // Sesión propia (partition en memoria): el bloqueo de permisos de esta ventana no debe tocar la sesión del visor,
    // que necesita el permiso «fullscreen» para la presentación.
    const oculta = new BrowserWindow({ show: false, width: 1024, height: 768, webPreferences: { partition: 'htmlapdf', sandbox: true, contextIsolation: true, nodeIntegration: false, images: true } });
    oculta.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    oculta.webContents.session.setPermissionRequestHandler((wc, permiso, cb) => cb(false));
    oculta.webContents.on('will-navigate', (ev, url) => { if (!/^https?:/.test(url)) ev.preventDefault(); });
    const cerrar = () => { if (!oculta.isDestroyed()) oculta.destroy(); };
    let temporizador = null;
    try {
      const cargada = new Promise((resolver, rechazar) => {
        oculta.webContents.once('did-finish-load', resolver);
        // Solo el marco principal cuenta; un iframe roto o una carga abortada (-3) no invalidan la página.
        oculta.webContents.on('did-fail-load', (ev, codigo, descripcion, url, esMarcoPrincipal) => { if (esMarcoPrincipal && codigo !== -3) rechazar(new Error(t('No se pudo cargar ({detalle})', { detalle: descripcion || codigo }))); });
      });
      const tiempo = new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new Error(t('Tiempo agotado (30 s)'))), 30_000); });
      if (origen === 'url') oculta.loadURL(destino).catch(() => {}); else oculta.loadFile(destino).catch(() => {});
      await Promise.race([cargada, tiempo]);
      await new Promise(r => setTimeout(r, 500));
      const pdf = await Promise.race([oculta.webContents.printToPDF({ pageSize: tamano === 'Letter' ? 'Letter' : 'A4', landscape: Boolean(apaisado), printBackground: Boolean(fondos) }), tiempo]);
      return { bytes: new Uint8Array(pdf) };
    } catch (e) {
      return { error: e.message };
    } finally {
      clearTimeout(temporizador);
      cerrar();
    }
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
    id: d.id, etiqueta: d.label || t('Pantalla {n}', { n: i + 1 }), ancho: d.size.width, alto: d.size.height, principal: d.id === screen.getPrimaryDisplay().id,
  })));
  // El preload lo pide de forma síncrona antes de que arranque pdf.js (viewerCssTheme: 0 sistema, 1 claro, 2 oscuro) y
  // para el idioma de la capa propia.
  ipcMain.on('config-inicial', (evento) => {
    const tema = obtenerConfig().tema;
    evento.returnValue = { tema: tema === 'claro' ? 1 : tema === 'oscuro' ? 2 : 0, idioma };
  });
  // Cambiar de idioma: se guarda y la app se relanza con el mismo documento (pdf.js solo cambia de idioma al arrancar).
  ipcMain.handle('cambiar-idioma', async (evento, nuevo, pagina) => {
    if (!['en', 'es'].includes(nuevo)) return false;
    const win = ventanaDe(evento);
    // Todas las ventanas con documento se reabren tras el relanzado; la que pidió el cambio va primera y en su página.
    const conDocumento = BrowserWindow.getAllWindows().filter(w => w.liberadopdfRuta && !w.liberadopdfVisor);
    const conEdiciones = conDocumento.some(w => w.liberadopdfEdiciones);
    if (conEdiciones && !process.env.LIBERADOPDF_HUMO) {
      const { response } = await dialog.showMessageBox(win, {
        type: 'warning', title: t('Cambios sin guardar'), message: t('Hay anotaciones o campos modificados sin guardar.'),
        detail: t('Si cambias el idioma ahora se perderán. Pulsa Cancelar y usa Guardar (Ctrl+S) para conservarlos.'),
        buttons: [t('Cambiar de idioma'), t('Cancelar')], defaultId: 1, cancelId: 1, noLink: true,
      });
      if (response !== 0) return false;
    }
    guardar(fusionarConfigGuardada(obtenerConfigBase(), { idioma: nuevo }));
    const rutas = [...new Set([win?.liberadopdfRuta, ...conDocumento.map(w => w.liberadopdfRuta)].filter(Boolean))];
    const paginaValida = Number.isInteger(pagina) && pagina > 0 && win?.liberadopdfRuta ? pagina : null;
    const args = [...process.argv.slice(1).filter(a => !/\.pdf$/i.test(a) && !/^--pagina=/.test(a)), ...rutas, ...(paginaValida ? [`--pagina=${paginaValida}`] : [])];
    if (process.env.LIBERADOPDF_HUMO) { eventosHumo.emit('relanzar', { args, conEdiciones }); return true; }
    app.relaunch({ args });
    app.exit(0);
    return true;
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
