// Prueba de humo: lanza liberadoPDF (Electron) con el PDF de ejemplo en modo humo y evalúa el resultado.
// Uso: npm run humo   (necesita pantalla: WSLg o escritorio Linux)
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
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

const electron = path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const hijo = spawn(electron, ['.'], {
  cwd: raiz,
  env: { ...process.env, LIBERADOPDF_HUMO: carpetaHumo, LIBERADOPDF_PDF: pdfPrueba },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let registro = '';
hijo.stdout.on('data', d => { registro += d; });
hijo.stderr.on('data', d => { registro += d; });
const temporizador = setTimeout(() => { hijo.kill('SIGKILL'); }, 40_000);

hijo.on('exit', (codigo) => {
  clearTimeout(temporizador);
  const archivo = path.join(carpetaHumo, 'resultado.json');
  if (!existsSync(archivo)) {
    console.error('Sin resultado.json. Código de salida:', codigo);
    console.error(registro.split('\n').filter(l => !/^\[\d+:\d+:\d{4}\/\d+\.\d+:(INFO|WARNING)/.test(l)).slice(-25).join('\n'));
    process.exit(1);
  }
  const resultado = JSON.parse(readFileSync(archivo, 'utf8'));
  console.log(JSON.stringify(resultado));
  process.exit(resultado.ok ? 0 : 1);
});
