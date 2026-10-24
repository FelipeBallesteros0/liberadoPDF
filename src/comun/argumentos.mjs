// Rutas de PDF a abrir a partir de los argumentos de línea de comandos. Lógica pura.
import path from 'node:path';

// null si `ruta` es un PDF existente; si no, el mensaje para la pantalla de inicio.
export function errorDeRutaPdf(ruta, existe) {
  if (typeof ruta !== 'string' || ruta.length === 0) return 'Ruta no válida';
  if (!existe(ruta)) return `No existe el archivo: ${ruta}`;
  if (!/\.pdf$/i.test(ruta)) return `No es un PDF: ${ruta}`;
  return null;
}

// `--pagina=N` (lo pone el relanzado por cambio de idioma): página en la que abrir el primer documento.
export function paginaDeArgumentos(argv) {
  const m = (argv ?? []).map(String).find(a => /^--pagina=\d+$/.test(a));
  const n = m ? Number(m.split('=')[1]) : 0;
  return n > 0 ? n : null;
}

export function rutasDeArgumentos(argv, { empaquetada, existe, cwd }) {
  // argv[0] es el ejecutable; en desarrollo argv[1] es la ruta del proyecto ("." con `electron .`)
  const candidatos = argv.slice(empaquetada ? 1 : 2).filter(a => typeof a === 'string' && a.length > 0 && !a.startsWith('-'));
  const rutas = [];
  const errores = [];
  for (const candidato of candidatos) {
    const ruta = path.resolve(cwd, candidato); // path de la plataforma: en Windows resuelve «C:\\…» y en Linux rutas POSIX
    const error = errorDeRutaPdf(ruta, existe);
    if (error) errores.push(error); else rutas.push(ruta);
  }
  return { rutas, errores };
}
