// Modo humo: lanza una fase de comprobación sobre el PDF indicado y escribe resultado.json.
// Fases: basica (primera página, animación, teclas, presentación, contador, pantalla negra),
//        bucle (avance automático con bucle, con LIBERADOPDF_CONFIG_PRUEBA).
import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crearVentana } from './ventanas.js';
import { eventosHumo } from './ipc.js';

const espera = ms => new Promise(r => setTimeout(r, ms));

function esperarEvento(nombre, ms) {
  return new Promise((resolver, rechazar) => {
    const t = setTimeout(() => rechazar(new Error(`sin evento ${nombre} en ${ms} ms`)), ms);
    eventosHumo.once(nombre, () => { clearTimeout(t); resolver(); });
  });
}

// Compara el 40 % central de dos capturas: true si más de 200 píxeles cambian en más de 16 niveles.
export function difieren(a, b) {
  const ta = a.getSize(); const tb = b.getSize();
  if (ta.width !== tb.width || ta.height !== tb.height) return true;
  const ba = a.toBitmap(); const bb = b.toBitmap();
  const x0 = Math.floor(ta.width * 0.3), x1 = Math.floor(ta.width * 0.7);
  const y0 = Math.floor(ta.height * 0.3), y1 = Math.floor(ta.height * 0.7);
  let distintos = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * ta.width + x) * 4;
      if (Math.abs(ba[i] - bb[i]) > 16 || Math.abs(ba[i + 1] - bb[i + 1]) > 16 || Math.abs(ba[i + 2] - bb[i + 2]) > 16) distintos++;
    }
  }
  return distintos > 200;
}

function abrirVentanaDePrueba({ ruta, preload, salida }) {
  const win = crearVentana({ ruta, preload });
  const consola = [];
  win.webContents.on('console-message', (evento) => {
    consola.push(`[${evento.level}] ${evento.message} (${evento.sourceId}:${evento.lineNumber})`);
    writeFileSync(path.join(salida, 'consola.txt'), consola.join('\n'));
  });
  const js = (codigo, gesto = false) => win.webContents.executeJavaScript(codigo, gesto);
  const tecla = (codigo, modifiers = []) => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: codigo, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: codigo, modifiers });
  };
  const pagina = async () => js('PDFViewerApplication.page');
  const presentar = async () => {
    await js('window.liberadopdfAcciones.presentacion()', true);
    await espera(1000);
    return Boolean(await js('PDFViewerApplication.pdfPresentationMode.active')) && win.isFullScreen();
  };
  return { win, js, tecla, pagina, presentar };
}

async function faseBasica({ ruta, preload, salida }) {
  const r = { msPrimeraPagina: null, animacion: false, pagina3: false, flechaEnEntrada: false, presentacion: false, contadorYSaltos: false, pantallaNegra: false };
  const { win, js, tecla, pagina, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.msPrimeraPagina = Date.now() - process.getCreationTime();

  await js('PDFViewerApplication.page = 2');
  await espera(1500);
  const a = await win.webContents.capturePage();
  await espera(400);
  const b = await win.webContents.capturePage();
  writeFileSync(path.join(salida, 't1.png'), a.toPNG());
  writeFileSync(path.join(salida, 't2.png'), b.toPNG());
  r.animacion = difieren(a, b);

  tecla('PageDown');
  await espera(300);
  r.pagina3 = (await pagina()) === 3;

  // Con el foco en el campo de número de página, PgDn no navega; tras quitar el foco, → sí.
  await js('document.getElementById("pageNumber").focus()');
  tecla('PageDown');
  await espera(300);
  const sigueEn3 = (await pagina()) === 3;
  await js('document.getElementById("pageNumber").blur(); document.body.focus()');
  tecla('Right');
  await espera(300);
  r.flechaEnEntrada = sigueEn3 && (await pagina()) === 4;

  r.presentacion = await presentar();

  // En la página 4 (etiquetas 1,2,3,3) el contador dice «lámina 3 / 3 · paso 2 / 2» y Mayús+← lleva a la 2.
  await espera(300);
  r.textoContador = await js('document.querySelector(".liberadopdf-contador")?.textContent ?? ""');
  tecla('Left', ['shift']);
  await espera(300);
  r.contadorYSaltos = r.textoContador === 'lámina 3 / 3 · paso 2 / 2' && (await pagina()) === 2;

  // B pone la pantalla en negro; la siguiente tecla la quita sin navegar.
  tecla('B');
  await espera(200);
  const conPantalla = Boolean(await js('document.querySelector(".liberadopdf-pantalla")'));
  tecla('Right');
  await espera(300);
  const sinPantalla = !(await js('document.querySelector(".liberadopdf-pantalla")'));
  r.pantallaNegra = conPantalla && sinPantalla && (await pagina()) === 2;

  r.ok = r.msPrimeraPagina < 3000 && r.animacion && r.pagina3 && r.flechaEnEntrada && r.presentacion && r.contadorYSaltos && r.pantallaNegra;
  return r;
}

// Con avanceSegundos: 1 y bucle: true, desde la página 4 en presentación se vuelve a la 1.
async function faseBucle({ ruta, preload, salida }) {
  const r = { presentacion: false, bucle: false };
  const { js, pagina, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js('PDFViewerApplication.page = 4');
  await espera(300);
  r.presentacion = await presentar();
  await espera(700); // 1000 ms de presentar + 700 > 1 s de avance
  r.bucle = (await pagina()) === 1;
  r.ok = r.presentacion && r.bucle;
  return r;
}

const FASES = { basica: faseBasica, bucle: faseBucle };

export async function ejecutarHumo({ ruta, salida, fase, preload }) {
  mkdirSync(salida, { recursive: true });
  let resultado = { ok: false, fase, errores: [] };
  try {
    const ejecutar = FASES[fase];
    if (!ejecutar) throw new Error(`fase desconocida: ${fase}`);
    resultado = { fase, errores: [], ...(await ejecutar({ ruta, preload, salida })) };
  } catch (e) {
    resultado.errores.push(String(e?.stack || e));
    try {
      const win = BrowserWindow.getAllWindows()[0];
      resultado.diagnostico = await win.webContents.executeJavaScript(`JSON.stringify({
        acciones: typeof window.liberadopdfAcciones,
        estado: window.liberadopdfEstado ?? null,
        render: PDFViewerApplication.pdfViewer?.getPageView?.(0)?.renderingState ?? null,
        pagina: PDFViewerApplication.page,
        documento: Boolean(PDFViewerApplication.pdfDocument),
      })`);
    } catch (e2) {
      resultado.diagnostico = String(e2);
    }
    resultado.ok = false;
  }
  writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify(resultado, null, 2));
  app.exit(resultado.ok ? 0 : 1);
}
