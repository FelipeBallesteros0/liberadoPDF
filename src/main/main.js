// Proceso principal de liberadoPDF.
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registrarEsquemaPrivilegiado, instalarProtocolo } from './protocolo.js';
import { crearVentana } from './ventanas.js';
import { instalarIpc } from './ipc.js';
import { carpetaDatos, puedeEscribirCarpeta, cargarConfig, guardarConfig, archivoConfig } from './config.js';
import { ejecutarHumo } from './humo.js';

const raiz = app.getAppPath(); // carpeta del proyecto en desarrollo; app.asar empaquetada
const preload = path.join(raiz, 'src', 'preload', 'preload.cjs');
const raices = [
  { prefijo: '/vendor/pdfjs/', carpeta: path.join(raiz, 'vendor', 'pdfjs') },
  { prefijo: '/', carpeta: path.join(raiz, 'src', 'renderer') },
];

app.setName('liberadoPDF');
app.commandLine.appendSwitch('lang', 'es-ES'); // interfaz de pdf.js (y de Electron) en español
if (process.platform === 'linux') app.commandLine.appendSwitch('no-sandbox'); // WSLg sin chrome-sandbox setuid
registrarEsquemaPrivilegiado();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  const datos = carpetaDatos({
    ejecutable: process.execPath,
    empaquetada: app.isPackaged,
    raizProyecto: raiz,
    userData: app.getPath('userData'),
    puedeEscribir: puedeEscribirCarpeta,
  });
  app.setPath('userData', datos);
  const archivo = archivoConfig(datos);
  let config = cargarConfig(archivo);
  const obtenerConfig = () => config;
  const guardar = (nueva) => { guardarConfig(archivo, nueva); config = cargarConfig(archivo); };

  // Provisional hasta la Tarea 10 (rutasDeArgumentos): argumentos que terminan en .pdf
  const rutasDeArgv = argv => argv.slice(app.isPackaged ? 1 : 2).filter(a => /\.pdf$/i.test(a)).map(a => path.resolve(a));

  app.whenReady().then(() => {
    instalarProtocolo({ raices });
    instalarIpc({ obtenerConfig, guardar, abrirEnNueva: ruta => crearVentana({ ruta, preload }) });
    if (process.env.LIBERADOPDF_HUMO) {
      ejecutarHumo({ ruta: process.env.LIBERADOPDF_PDF, salida: process.env.LIBERADOPDF_HUMO, preload });
      return;
    }
    const rutas = rutasDeArgv(process.argv);
    if (rutas.length === 0) crearVentana({ preload });
    for (const ruta of rutas) crearVentana({ ruta, preload });
  });

  app.on('second-instance', (evento, argv) => {
    for (const ruta of rutasDeArgv(argv)) crearVentana({ ruta, preload });
    BrowserWindow.getAllWindows()[0]?.focus();
  });

  app.on('window-all-closed', () => app.quit());
}
