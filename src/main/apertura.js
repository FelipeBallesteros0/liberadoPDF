// Apertura de ventanas a partir de argumentos (arranque, «Abrir con…», segunda instancia).
import { existsSync } from 'node:fs';
import { rutasDeArgumentos, paginaDeArgumentos } from '../comun/argumentos.mjs';
import { crearVentana } from './ventanas.js';

export function abrirDesdeArgumentos({ argv, cwd, empaquetada, preload, traducir = x => x }) {
  const { rutas, errores } = rutasDeArgumentos(argv, { empaquetada, existe: existsSync, cwd });
  const pagina = paginaDeArgumentos(argv); // solo para el primer documento (relanzado por cambio de idioma)
  const ventanas = rutas.map((ruta, i) => crearVentana({ ruta, preload, pagina: i === 0 ? pagina : null }));
  if (ventanas.length === 0) ventanas.push(crearVentana({ preload, mensaje: traducir(errores[0]) }));
  return { ventanas, rutas, errores };
}
