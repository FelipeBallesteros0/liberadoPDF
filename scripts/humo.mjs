// Prueba de humo: lanza liberadoPDF (Electron) por fases con el PDF de ejemplo y agrega los resultados.
// Uso: npm run humo   (necesita pantalla: WSLg o escritorio Linux)
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'test', 'salida');
const carpetaHumo = path.join(salida, 'humo');
// Review Focus 1: ruta con espacios, ñ, # y %
const pdfPrueba = path.join(salida, 'ñandú #2 100%.pdf');
mkdirSync(salida, { recursive: true });
rmSync(carpetaHumo, { recursive: true, force: true });
copyFileSync(path.join(raiz, 'recursos', 'ejemplo_animado.pdf'), pdfPrueba);

const FASES = [
  { nombre: 'basica', env: {} },
  { nombre: 'bucle', env: { LIBERADOPDF_CONFIG_PRUEBA: JSON.stringify({ presentacion: { avanceSegundos: 1, bucle: true } }) } },
  { nombre: 'inexistente', env: { LIBERADOPDF_PDF: path.join(salida, 'no-existe.pdf') } },
  { nombre: 'presentacionAnimada', env: { LIBERADOPDF_HUMO_PAGINA: '2' } },
  { nombre: 'cierre', env: {} },
  { nombre: 'corrupto', env: { LIBERADOPDF_PDF: path.join(salida, 'corrupto.pdf') } },
  { nombre: 'ajustes', env: {} },
  { nombre: 'nocturno', env: {} },
  { nombre: 'instantanea', env: {} },
  { nombre: 'guardar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'guardar', 'guardado.pdf') } },
  { nombre: 'transiciones', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_transiciones.pdf') } },
  { nombre: 'punteros', env: {} },
  { nombre: 'cuadricula', env: {} },
  { nombre: 'medicion', env: {} },
  { nombre: 'presentador', env: {} },
  { nombre: 'notasDerecha', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_notas.pdf'), LIBERADOPDF_CONFIG_PRUEBA: JSON.stringify({ porDocumento: { [path.join(raiz, 'recursos', 'ejemplo_notas.pdf')]: { notasDerecha: true } } }) } },
  { nombre: 'herramientasBase', env: {} },
  { nombre: 'unir', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'unir', 'unido.pdf'), LIBERADOPDF_HUMO_ELEGIR: pdfPrueba } },
  { nombre: 'dividir', env: { LIBERADOPDF_HUMO_CARPETA: path.join(carpetaHumo, 'dividir', 'partes') } },
  { nombre: 'rotar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'rotar', 'rotado.pdf') } },
  { nombre: 'cifrado', env: {} },
  { nombre: 'organizar', env: {} },
  { nombre: 'aImagenes', env: { LIBERADOPDF_HUMO_CARPETA: path.join(carpetaHumo, 'aImagenes', 'imagenes') } },
  { nombre: 'deImagenes', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'deImagenes', 'imagenes.pdf'), LIBERADOPDF_HUMO_ELEGIR: [imagenA, imagenB, imagenFalsa].join(path.delimiter) } },
  { nombre: 'recortar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'recortar', 'recortado.pdf') } },
  { nombre: 'metadatos', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'metadatos', 'metadatos.pdf') } },
  { nombre: 'aplanar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'aplanar', 'aplanado.pdf') } },
  { nombre: 'numerar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'numerar', 'numerado.pdf') } },
  { nombre: 'marcaDeAgua', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'marcaDeAgua', 'marca.pdf') } },
  { nombre: 'notasDerecha43', fase: 'notasDerecha', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_notas_43.pdf'), LIBERADOPDF_CONFIG_PRUEBA: JSON.stringify({ porDocumento: { [path.join(raiz, 'recursos', 'ejemplo_notas_43.pdf')]: { notasDerecha: true } } }) } },
];
writeFileSync(pdfPrueba + '.notas.txt', '## 2\nNota de la dos\n');
// Imágenes para «Imágenes a PDF»: PNG RGBA sin dependencias (filtro 0 por fila, zlib) y un .jpg falso.
function png(ancho, alto, pixel) {
  const filas = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) Buffer.from(pixel(x, y)).copy(filas, y * (ancho * 4 + 1) + 1 + x * 4);
  const trozo = (tipo, datos) => { const len = Buffer.alloc(4); len.writeUInt32BE(datos.length); const td = Buffer.concat([Buffer.from(tipo), datos]); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), trozo('IHDR', ihdr), trozo('IDAT', zlib.deflateSync(filas)), trozo('IEND', Buffer.alloc(0))]);
}
const imagenA = path.join(salida, 'imagen_a.png'), imagenB = path.join(salida, 'imagen_b.png'), imagenFalsa = path.join(salida, 'falsa.jpg');
writeFileSync(imagenA, png(80, 60, () => [220, 30, 30, 255]));
writeFileSync(imagenB, png(60, 90, (x, y) => [30, 30, 220, x < 30 ? 255 : 90])); // mitad transparente
writeFileSync(imagenFalsa, 'esto no es una imagen\n');
writeFileSync(path.join(salida, 'corrupto.pdf'), 'esto no es un PDF\n');

const electron = path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

function lanzar(fase) {
  return new Promise((resolver) => {
    const carpeta = path.join(carpetaHumo, fase.nombre);
    const hijo = spawn(electron, ['.'], {
      cwd: raiz,
      env: { ...process.env, LIBERADOPDF_HUMO: carpeta, LIBERADOPDF_HUMO_FASE: fase.fase ?? fase.nombre, LIBERADOPDF_PDF: pdfPrueba, ...fase.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let registro = '';
    hijo.stdout.on('data', d => { registro += d; });
    hijo.stderr.on('data', d => { registro += d; });
    const temporizador = setTimeout(() => hijo.kill('SIGKILL'), 40_000);
    hijo.on('exit', (codigo) => {
      clearTimeout(temporizador);
      const archivo = path.join(carpeta, 'resultado.json');
      if (!existsSync(archivo)) {
        const lineas = registro.split('\n').filter(l => !/^\[\d+:\d+:\d{4}\/\d+\.\d+:(INFO|WARNING)/.test(l)).slice(-15).join('\n');
        resolver({ ok: false, fase: fase.nombre, errores: [`sin resultado.json (código ${codigo})`, lineas] });
        return;
      }
      resolver(JSON.parse(readFileSync(archivo, 'utf8')));
    });
  });
}

const resultados = {};
for (const fase of FASES) resultados[fase.nombre] = await lanzar(fase);
const ok = Object.values(resultados).every(r => r.ok);
console.log(JSON.stringify({ ok, ...resultados }));
process.exit(ok ? 0 : 1);
