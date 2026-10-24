// `npm start`: lanza Electron con el proyecto. En Linux (WSLg) sin sandbox setuid, por variable de entorno
// y no por appendSwitch (eso rompe printToPDF).
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electron = path.join(raiz, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');
const env = { ...process.env, ...(process.platform === 'linux' ? { ELECTRON_DISABLE_SANDBOX: '1' } : {}) };
const hijo = spawn(electron, ['.', ...process.argv.slice(2)], { cwd: raiz, env, stdio: 'inherit', shell: process.platform === 'win32' });
hijo.on('exit', codigo => process.exit(codigo ?? 0));
