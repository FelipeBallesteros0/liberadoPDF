// Apertura de ventanas a partir de argumentos (arranque, «Abrir con…», segunda instancia).
import { existsSync } from 'node:fs';
import { rutasDeArgumentos } from '../comun/argumentos.mjs';
import { crearVentana } from './ventanas.js';

export function abrirDesdeArgumentos({ argv, cwd, empaquetada, preload }) {
  const { rutas, errores } = rutasDeArgumentos(argv, { empaquetada, existe: existsSync, cwd });
  const ventanas = rutas.map(ruta => crearVentana({ ruta, preload }));
  if (ventanas.length === 0) ventanas.push(crearVentana({ preload, mensaje: errores[0] }));
  return { ventanas, rutas, errores };
}
