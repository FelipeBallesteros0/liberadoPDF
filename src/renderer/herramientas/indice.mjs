// Registra todas las herramientas de archivo en window.liberadopdfHerramientas (una por tarea de la entrega 3).
import { instalarUnir } from './unir.mjs';
import { instalarDividir } from './dividir.mjs';
import { instalarRotar } from './rotar.mjs';

export function instalarHerramientas(H) {
  instalarUnir(H);
  instalarDividir(H);
  instalarRotar(H);
}
