// Proceso principal de liberadoPDF.
import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { registrarEsquemaPrivilegiado, instalarProtocolo } from './protocolo.js';
import { crearVentana, ventanaActiva, abrirEnVentana } from './ventanas.js';
import { abrirDesdeArgumentos } from './apertura.js';
import { construirMenu } from './menu.js';
import { instalarIpc } from './ipc.js';
import { carpetaDatos, puedeEscribirCarpeta, cargarConfig, guardarConfig, archivoConfig } from './config.js';
import { ejecutarHumo } from './humo.js';
import { normalizarConfig } from '../comun/config.mjs';

const raiz = app.getAppPath(); // carpeta del proyecto en desarrollo; app.asar empaquetada
const preload = path.join(raiz, 'src', 'preload', 'preload.cjs');
const raices = [
  { prefijo: '/vendor/pdfjs/', carpeta: path.join(raiz, 'vendor', 'pdfjs') },
  { prefijo: '/comun/', carpeta: path.join(raiz, 'src', 'comun') }, // lógica pura compartida con el renderer
  { prefijo: '/', carpeta: path.join(raiz, 'src', 'renderer') },
];

app.setName('liberadoPDF');
app.commandLine.appendSwitch('lang', 'es-ES'); // interfaz de pdf.js (y de Electron) en español
if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox'); // WSLg sin chrome-sandbox setuid
registrarEsquemaPrivilegiado();

if (!app.requestSingleInstanceLock()) {
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
  const guardar = (nueva) => { guardarConfig(archivo, nueva); config = cargarConfig(archivo); };

  const abrirNueva = ruta => crearVentana({ ruta, preload });
  const dialogoAbrir = async (win) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined, { title: 'Abrir PDF', filters: [{ name: 'PDF', extensions: ['pdf'] }], properties: ['openFile'] });
    return canceled || filePaths.length === 0 ? null : filePaths[0];
  };
  const menu = () => construirMenu({
    recientes: obtenerConfig().recientes,
    alAbrir: async (win) => { const r = await dialogoAbrir(win); if (r) { const destino = win ?? ventanaActiva(); destino ? abrirEnVentana(destino, r) : abrirNueva(r); } },
    alAbrirNueva: async () => { const r = await dialogoAbrir(ventanaActiva()); if (r) abrirNueva(r); },
    alReciente: ruta => { const destino = ventanaActiva(); destino ? abrirEnVentana(destino, ruta) : abrirNueva(ruta); },
    alVaciarRecientes: () => { guardar({ ...obtenerConfigBase(), recientes: [] }); menu(); },
    alAccion: (win, nombre) => { (win ?? ventanaActiva())?.webContents.executeJavaScript(`window.liberadopdfAcciones?.${nombre}?.()`, true); },
  });

  app.whenReady().then(() => {
    instalarProtocolo({ raices });
    instalarIpc({ obtenerConfig, obtenerConfigBase, guardar, abrirEnNueva: abrirNueva, alCambiarRecientes: menu });
    menu();
    if (process.env.LIBERADOPDF_HUMO) {
      ejecutarHumo({ ruta: process.env.LIBERADOPDF_PDF, salida: process.env.LIBERADOPDF_HUMO, fase: process.env.LIBERADOPDF_HUMO_FASE || 'basica', preload });
      return;
    }
    abrirDesdeArgumentos({ argv: process.argv, cwd: process.cwd(), empaquetada: app.isPackaged, preload });
  });

  app.on('second-instance', (evento, argv, directorio) => {
    const { ventanas } = abrirDesdeArgumentos({ argv, cwd: directorio, empaquetada: app.isPackaged, preload });
    ventanas[0]?.focus();
  });

  // En modo humo la prueba cierra ventanas a propósito y termina ella misma con app.exit().
  app.on('window-all-closed', () => { if (!process.env.LIBERADOPDF_HUMO) app.quit(); });
}
