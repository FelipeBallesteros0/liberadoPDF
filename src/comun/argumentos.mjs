// Rutas de PDF a abrir a partir de los argumentos de línea de comandos. Lógica pura.
import path from 'node:path';

// null si `ruta` es un PDF existente; si no, el mensaje para la pantalla de inicio.
export function errorDeRutaPdf(ruta, existe) {
  if (typeof ruta !== 'string' || ruta.length === 0) return 'Ruta no válida';
  if (!existe(ruta)) return `No existe el archivo: ${ruta}`;
  if (!/\.pdf$/i.test(ruta)) return `No es un PDF: ${ruta}`;
  return null;
}

export function rutasDeArgumentos(argv, { empaquetada, existe, cwd }) {
  // argv[0] es el ejecutable; en desarrollo argv[1] es la ruta del proyecto ("." con `electron .`)
  const candidatos = argv.slice(empaquetada ? 1 : 2).filter(a => typeof a === 'string' && a.length > 0 && !a.startsWith('-'));
  const rutas = [];
  const errores = [];
  for (const candidato of candidatos) {
    const ruta = path.resolve(cwd, candidato);
    const error = errorDeRutaPdf(ruta, existe);
    if (error) errores.push(error); else rutas.push(ruta);
  }
  return { rutas, errores };
}
