// Prueba de humo: lanza liberadoPDF (Electron) por fases con el PDF de ejemplo y agrega los resultados.
// Uso: npm run humo   (necesita pantalla: WSLg o escritorio Linux)
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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
];
writeFileSync(pdfPrueba + '.notas.txt', '## 2\nNota de la dos\n');
writeFileSync(path.join(salida, 'corrupto.pdf'), 'esto no es un PDF\n');

const electron = path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

function lanzar(fase) {
  return new Promise((resolver) => {
    const carpeta = path.join(carpetaHumo, fase.nombre);
    const hijo = spawn(electron, ['.'], {
      cwd: raiz,
      env: { ...process.env, LIBERADOPDF_HUMO: carpeta, LIBERADOPDF_HUMO_FASE: fase.nombre, LIBERADOPDF_PDF: pdfPrueba, ...fase.env },
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
