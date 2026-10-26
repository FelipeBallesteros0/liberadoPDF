// Carpeta de datos (modo portable o userData) y lectura/escritura de config.json.
// Solo usa node:fs y node:path para poder probarse sin Electron.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import { normalizarConfig } from '../comun/config.mjs';

// Las rutas de Windows (C:\\...) se manejan con path.win32 aunque el código corra en WSL/Linux.
function sabor(ruta) {
  return /^[A-Za-z]:[\\/]/.test(ruta) ? path.win32 : path;
}

// En macOS el ejecutable vive dentro de liberadoPDF.app: escribir ahí rompe la firma del paquete (y con la «traslocación»
// de Gatekeeper ni siquiera se puede), así que allí se usa siempre userData (~/Library/Application Support/liberadoPDF).
export function carpetaDatos({ ejecutable, empaquetada, raizProyecto, userData, puedeEscribir, plataforma = process.platform }) {
  if (!empaquetada) return path.join(raizProyecto, 'data');
  if (plataforma === 'darwin') return userData;
  const p = sabor(ejecutable);
  const portable = p.join(p.dirname(ejecutable), 'data');
  return puedeEscribir(portable) ? portable : userData;
}

// Comprobación real de escritura: crea la carpeta si falta y prueba a escribir un archivo.
export function puedeEscribirCarpeta(dir) {
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    const prueba = path.join(dir, '.escritura');
    writeFileSync(prueba, '');
    unlinkSync(prueba);
    return true;
  } catch {
    return false;
  }
}

export function cargarConfig(archivo) {
  let datos;
  try {
    datos = JSON.parse(readFileSync(archivo, 'utf8'));
  } catch {
    datos = undefined;
  }
  return normalizarConfig(datos);
}

export function guardarConfig(archivo, config) {
  mkdirSync(path.dirname(archivo), { recursive: true });
  const temporal = archivo + '.tmp';
  writeFileSync(temporal, JSON.stringify(normalizarConfig(config), null, 2) + '\n');
  renameSync(temporal, archivo);
}

export function archivoConfig(carpeta) {
  return path.join(carpeta, 'config.json');
}

export { existsSync };
