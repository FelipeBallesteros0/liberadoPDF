// Prueba de humo: lanza liberadoPDF (Electron) por fases con el PDF de ejemplo y agrega los resultados.
// Uso: npm run humo   (necesita pantalla: WSLg o escritorio Linux)
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { generarFixtures } from './fixtures.mjs';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(raiz, 'test', 'salida');
const carpetaHumo = path.join(salida, 'humo');
const { pdfPrueba, imagenA, imagenB, imagenFalsa, pngComoJpg, fotoExif, htmlPrueba, cifradoPrueba, truncadoPrueba, truncadoObjstm, optimizadoPrueba, recortadoPrueba, escaneadoGirado, videoScreen } = await generarFixtures({ raiz, salida });

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
  { nombre: 'video', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_video.pdf'), LIBERADOPDF_HUMO_VIDEO_SCREEN: videoScreen } },
  { nombre: 'idioma', env: { LIBERADOPDF_IDIOMA: '', LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'idioma', 'rotado.pdf') } },
  { nombre: 'idiomaEs', fase: 'idioma', env: { LIBERADOPDF_IDIOMA: '', LIBERADOPDF_HUMO_IDIOMA_ESPERADO: 'es', LIBERADOPDF_CONFIG_PRUEBA: JSON.stringify({ idioma: 'es' }), LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'idiomaEs', 'rotado.pdf') } },
  { nombre: 'comprimir', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_fotos.pdf'), LIBERADOPDF_HUMO_OPTIMIZADO: optimizadoPrueba, LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'comprimir', 'comprimido.pdf') } },
  { nombre: 'ocr', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_escaneado.pdf'), LIBERADOPDF_HUMO_ANIMADO: path.join(raiz, 'recursos', 'ejemplo_animado.pdf'), LIBERADOPDF_HUMO_GIRADO: escaneadoGirado, LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'ocr', 'ocr.pdf') } },
  { nombre: 'proteger', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'proteger', 'protegido.pdf') } },
  { nombre: 'desbloquear', env: { LIBERADOPDF_PDF: cifradoPrueba, LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'desbloquear', 'desbloqueado.pdf') } },
  { nombre: 'reparar', env: { LIBERADOPDF_HUMO_ELEGIR: truncadoPrueba, LIBERADOPDF_HUMO_OBJSTM: truncadoObjstm, LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'reparar', 'reparado.pdf') } },
  { nombre: 'htmlAPdf', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'htmlAPdf', 'pagina.pdf'), LIBERADOPDF_HUMO_ELEGIR: htmlPrueba } },
  { nombre: 'aImagenes', env: { LIBERADOPDF_HUMO_CARPETA: path.join(carpetaHumo, 'aImagenes', 'imagenes') } },
  { nombre: 'deImagenes', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'deImagenes', 'imagenes.pdf'), LIBERADOPDF_HUMO_ELEGIR: [imagenA, imagenB, pngComoJpg, fotoExif, imagenFalsa].join(path.delimiter) } },
  { nombre: 'recortar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'recortar', 'recortado.pdf') } },
  { nombre: 'metadatos', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'metadatos', 'metadatos.pdf') } },
  { nombre: 'aplanar', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'aplanar', 'aplanado.pdf') } },
  { nombre: 'numerar', env: { LIBERADOPDF_PDF: recortadoPrueba, LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'numerar', 'numerado.pdf') } },
  { nombre: 'marcaDeAgua', env: { LIBERADOPDF_HUMO_GUARDAR: path.join(carpetaHumo, 'marcaDeAgua', 'marca.pdf') } },
  { nombre: 'notasDerecha43', fase: 'notasDerecha', env: { LIBERADOPDF_PDF: path.join(raiz, 'recursos', 'ejemplo_notas_43.pdf'), LIBERADOPDF_CONFIG_PRUEBA: JSON.stringify({ porDocumento: { [path.join(raiz, 'recursos', 'ejemplo_notas_43.pdf')]: { notasDerecha: true } } }) } },
];
writeFileSync(pdfPrueba + '.notas.txt', '## 2\nNota de la dos\n');
writeFileSync(path.join(salida, 'corrupto.pdf'), 'esto no es un PDF\n');

const electron = path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

function lanzar(fase) {
  return new Promise((resolver) => {
    const carpeta = path.join(carpetaHumo, fase.nombre);
    const hijo = spawn(electron, ['.'], {
      cwd: raiz,
      // Las fases corren en español (sus comprobaciones leen textos); las de idioma prueban el inglés por defecto.
      env: { ...(process.platform === 'linux' ? { ELECTRON_DISABLE_SANDBOX: '1' } : {}), ...process.env, LIBERADOPDF_IDIOMA: 'es', LIBERADOPDF_HUMO: carpeta, LIBERADOPDF_HUMO_FASE: fase.fase ?? fase.nombre, LIBERADOPDF_PDF: pdfPrueba, ...fase.env },
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
