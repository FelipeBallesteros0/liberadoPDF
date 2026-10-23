// Rutas de PDF a abrir a partir de los argumentos de línea de comandos. Lógica pura.
import path from 'node:path';

export function rutasDeArgumentos(argv, { empaquetada, existe, cwd }) {
  // argv[0] es el ejecutable; en desarrollo argv[1] es la ruta del proyecto ("." con `electron .`)
  const candidatos = argv.slice(empaquetada ? 1 : 2).filter(a => typeof a === 'string' && a.length > 0 && !a.startsWith('-'));
  const rutas = [];
  const errores = [];
  for (const candidato of candidatos) {
    const ruta = path.resolve(cwd, candidato);
    if (!existe(ruta)) { errores.push(`No existe el archivo: ${ruta}`); continue; }
    if (!/\.pdf$/i.test(ruta)) { errores.push(`No es un PDF: ${ruta}`); continue; }
    rutas.push(ruta);
  }
  return { rutas, errores };
}
