// Proceso principal de liberadoPDF.
import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { registrarEsquemaPrivilegiado, instalarProtocolo } from './protocolo.js';
import { crearVentana, ventanaActiva, abrirEnVentana, instalarGuardado, usarTraductor } from './ventanas.js';
import { abrirDesdeArgumentos } from './apertura.js';
import { errorDeRutaPdf } from '../comun/argumentos.mjs';
import { construirMenu } from './menu.js';
import { instalarIpc } from './ipc.js';
import { carpetaDatos, puedeEscribirCarpeta, cargarConfig, guardarConfig, archivoConfig } from './config.js';
import { ejecutarHumo } from './humo.js';
import { normalizarConfig } from '../comun/config.mjs';
import { crearTraductor, claveDeIdioma, crearTraductorDeMensajes } from '../comun/i18n.mjs';

const raiz = app.getAppPath(); // carpeta del proyecto en desarrollo; app.asar empaquetada
const preload = path.join(raiz, 'src', 'preload', 'preload.cjs');
const raices = [
  { prefijo: '/vendor/pdfjs/', carpeta: path.join(raiz, 'vendor', 'pdfjs') },
  { prefijo: '/comun/', carpeta: path.join(raiz, 'src', 'comun') }, // lógica pura compartida con el renderer
  { prefijo: '/lib/pdf-lib/', carpeta: path.join(raiz, 'node_modules', 'pdf-lib', 'dist') }, // lectura de /Trans y herramientas
  { prefijo: '/lib/qpdf/', carpeta: path.join(raiz, 'node_modules', '@neslinesli93', 'qpdf-wasm', 'dist') },
  { prefijo: '/lib/tesseract/', carpeta: path.join(raiz, 'node_modules', 'tesseract.js', 'dist') },
  { prefijo: '/lib/tesseract-core/worker.min.js', carpeta: path.join(raiz, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js') }, // el worker junto al núcleo: así importScripts y el .wasm se resuelven en la misma carpeta
  { prefijo: '/lib/tesseract-core/', carpeta: path.join(raiz, 'node_modules', 'tesseract.js-core') },
  { prefijo: '/tessdata/', carpeta: path.join(raiz, 'recursos', 'tessdata') },
  { prefijo: '/', carpeta: path.join(raiz, 'src', 'renderer') },
];

app.setName('liberadoPDF');
// En Linux (WSLg, sin chrome-sandbox setuid) el lanzador pone ELECTRON_DISABLE_SANDBOX=1: añadir «no-sandbox» con
// appendSwitch en tiempo de ejecución rompe printToPDF (el proceso de impresión no puede crear memoria compartida).
registrarEsquemaPrivilegiado();

// En modo humo no se pide el lock: la prueba debe poder correr aunque haya un liberadoPDF abierto.
if (!process.env.LIBERADOPDF_HUMO && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // En modo humo los datos van a la carpeta de salida de la prueba: nunca se toca el config.json real.
  const datos = process.env.LIBERADOPDF_HUMO
    ? path.join(process.env.LIBERADOPDF_HUMO, 'datos')
    : carpetaDatos({
      ejecutable: process.execPath,
      empaquetada: app.isPackaged,
      raizProyecto: raiz,
      userData: app.getPath('userData'),
      puedeEscribir: puedeEscribirCarpeta,
    });
  app.setPath('userData', datos);
  const archivo = archivoConfig(datos);
  let config = cargarConfig(archivo);
  // En modo humo se puede superponer una configuración de prueba (JSON) sin tocar config.json.
  let configPrueba = null;
  if (process.env.LIBERADOPDF_CONFIG_PRUEBA) {
    try { configPrueba = JSON.parse(process.env.LIBERADOPDF_CONFIG_PRUEBA); } catch { configPrueba = null; }
  }
  const obtenerConfigBase = () => config; // lo que se persiste
  const obtenerConfig = () => (configPrueba // lo que ve el renderer
    ? normalizarConfig({ ...config, ...configPrueba, presentacion: { ...config.presentacion, ...(configPrueba.presentacion ?? {}) } })
    : config);
  // Idioma efectivo (configuración, o LIBERADOPDF_IDIOMA en humo); el de pdf.js y Electron se fija aquí, antes de `ready`.
  const idioma = claveDeIdioma(obtenerConfig(), process.env);
  const t = crearTraductor(idioma);
  const traducirMensaje = crearTraductorDeMensajes(t);
  usarTraductor(t);
  app.commandLine.appendSwitch('lang', idioma === 'es' ? 'es-ES' : 'en-US');
  const guardar = (nueva) => {
    try {
      guardarConfig(archivo, nueva);
      config = cargarConfig(archivo);
    } catch (e) {
      console.warn('No se pudo guardar config.json:', e.message); // p. ej. pendrive retirado
      config = normalizarConfig(nueva);
    }
  };

  const abrirNueva = ruta => crearVentana({ ruta, preload });
  const dialogoAbrir = async (win) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined, { title: t('Abrir PDF'), filters: [{ name: 'PDF', extensions: ['pdf'] }], properties: ['openFile'] });
    return canceled || filePaths.length === 0 ? null : filePaths[0];
  };
  const menu = () => construirMenu({
    t,
    recientes: obtenerConfig().recientes.filter(r => existsSync(r.ruta)),
    alAbrir: async (win) => { const r = await dialogoAbrir(win); if (r) { const destino = win ?? ventanaActiva(); destino ? abrirEnVentana(destino, r) : abrirNueva(r); } },
    alAbrirNueva: async () => { const r = await dialogoAbrir(ventanaActiva()); if (r) abrirNueva(r); },
    alReciente: ruta => { const destino = ventanaActiva(); destino ? abrirEnVentana(destino, ruta) : abrirNueva(ruta); },
    alVaciarRecientes: () => { guardar({ ...obtenerConfigBase(), recientes: [] }); menu(); },
    alAccion: (win, nombre) => { (win ?? ventanaActiva())?.webContents.executeJavaScript(`window.liberadopdfAcciones?.${nombre}?.()`, true); },
    alHerramienta: (win, clave) => {
      const destino = win ?? ventanaActiva();
      if (!destino) return;
      if (!destino.liberadopdfRuta) { dialog.showMessageBox(destino, { type: 'info', title: t('Herramientas'), message: t('Abre primero un PDF'), detail: t('Las herramientas trabajan sobre el documento abierto. Para reparar un PDF que no abre, abre cualquier otro PDF y elige el archivo roto en Herramientas ▸ Reparar.') }); return; }
      destino.webContents.executeJavaScript(`window.liberadopdfAcciones?.herramienta?.(${JSON.stringify(clave)})`, true);
    },
  });

  // macOS no pasa los archivos por argv: Finder («Abrir con», doble clic, arrastrar al Dock) emite open-file, a veces
  // antes de `ready`. Esos se guardan y se abren al arrancar en lugar de la pantalla de inicio.
  let listo = false;
  const pendientes = [];
  const abrirDesdeFinder = ruta => {
    const error = errorDeRutaPdf(ruta, existsSync);
    return crearVentana({ preload, ...(error ? { mensaje: traducirMensaje(error) } : { ruta }) });
  };
  app.on('open-file', (evento, ruta) => {
    evento.preventDefault();
    if (listo) abrirDesdeFinder(ruta).focus(); else pendientes.push(ruta);
  });

  app.whenReady().then(() => {
    instalarProtocolo({ raices });
    instalarGuardado();
    instalarIpc({ idioma, t, traducirMensaje, obtenerConfig, obtenerConfigBase, guardar, abrirEnNueva: abrirNueva, alCambiarRecientes: menu, preload });
    menu();
    if (process.env.LIBERADOPDF_HUMO) {
      ejecutarHumo({ ruta: process.env.LIBERADOPDF_PDF, salida: process.env.LIBERADOPDF_HUMO, fase: process.env.LIBERADOPDF_HUMO_FASE || 'basica', preload });
      return;
    }
    listo = true;
    if (pendientes.length) pendientes.splice(0).forEach(abrirDesdeFinder);
    else abrirDesdeArgumentos({ argv: process.argv, cwd: process.cwd(), empaquetada: app.isPackaged, preload, traducir: traducirMensaje });
  });

  // En macOS la aplicación sigue viva sin ventanas (convención del sistema); el clic en el Dock abre la de inicio.
  app.on('activate', () => { if (listo && BrowserWindow.getAllWindows().length === 0) crearVentana({ preload }); });

  app.on('second-instance', (evento, argv, directorio) => {
    const { ventanas } = abrirDesdeArgumentos({ argv, cwd: directorio, empaquetada: app.isPackaged, preload, traducir: traducirMensaje });
    ventanas[0]?.focus();
  });

  // En modo humo la prueba cierra ventanas a propósito y termina ella misma con app.exit().
  app.on('window-all-closed', () => { if (!process.env.LIBERADOPDF_HUMO && process.platform !== 'darwin') app.quit(); });
}
