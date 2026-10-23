// Modo humo: abre un PDF, comprueba primera página, animación, PgDn y presentación, y escribe resultado.json.
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

export async function ejecutarHumo({ ruta, salida, preload }) {
  mkdirSync(salida, { recursive: true });
  const resultado = { ok: false, msPrimeraPagina: null, animacion: false, pagina3: false, flechaEnEntrada: false, presentacion: false, errores: [] };
  const terminar = () => {
    resultado.ok = resultado.errores.length === 0 && resultado.msPrimeraPagina < 3000 && resultado.animacion && resultado.pagina3 && resultado.flechaEnEntrada && resultado.presentacion;
    writeFileSync(path.join(salida, 'resultado.json'), JSON.stringify(resultado, null, 2));
    app.exit(resultado.ok ? 0 : 1);
  };
  try {
    const win = crearVentana({ ruta, preload });
    // Consola del renderer → consola.txt (errores de carga de módulos, excepciones de la capa propia)
    const consola = [];
    win.webContents.on('console-message', (evento) => {
      consola.push(`[${evento.level}] ${evento.message} (${evento.sourceId}:${evento.lineNumber})`);
      writeFileSync(path.join(salida, 'consola.txt'), consola.join('\n'));
    });
    const js = (codigo, gesto = false) => win.webContents.executeJavaScript(codigo, gesto);
    await esperarEvento('primera-pagina', 10_000);
    resultado.msPrimeraPagina = Date.now() - process.getCreationTime();
    await js('PDFViewerApplication.page = 2');
    await espera(1500);
    const a = await win.webContents.capturePage();
    await espera(400);
    const b = await win.webContents.capturePage();
    writeFileSync(path.join(salida, 't1.png'), a.toPNG());
    writeFileSync(path.join(salida, 't2.png'), b.toPNG());
    resultado.animacion = difieren(a, b);
    const tecla = (codigo) => {
      win.webContents.sendInputEvent({ type: 'keyDown', keyCode: codigo });
      win.webContents.sendInputEvent({ type: 'keyUp', keyCode: codigo });
    };
    tecla('PageDown');
    await espera(300);
    resultado.pagina3 = (await js('PDFViewerApplication.page')) === 3;
    // Con el foco en el campo de número de página, PgDn no navega; tras quitar el foco, → sí.
    await js('document.getElementById("pageNumber").focus()');
    tecla('PageDown');
    await espera(300);
    const sigueEn3 = (await js('PDFViewerApplication.page')) === 3;
    await js('document.getElementById("pageNumber").blur(); document.body.focus()');
    tecla('Right');
    await espera(300);
    resultado.flechaEnEntrada = sigueEn3 && (await js('PDFViewerApplication.page')) === 4;
    await js('window.liberadopdfAcciones.presentacion()', true);
    await espera(1000);
    const activa = await js('PDFViewerApplication.pdfPresentationMode.active');
    resultado.presentacion = Boolean(activa) && win.isFullScreen();
  } catch (e) {
    resultado.errores.push(String(e?.stack || e));
    // Diagnóstico del estado del renderer para entender el fallo
    try {
      const win = BrowserWindow.getAllWindows()[0];
      resultado.diagnostico = await win.webContents.executeJavaScript(`JSON.stringify({
        acciones: typeof window.liberadopdfAcciones,
        estado: window.liberadopdfEstado ?? null,
        script: Boolean(document.querySelector('script[src="/visor.mjs"]')),
        render: PDFViewerApplication.pdfViewer?.getPageView?.(0)?.renderingState ?? null,
        pagina: PDFViewerApplication.page,
        documento: Boolean(PDFViewerApplication.pdfDocument),
      })`);
      resultado.diagnosticoImport = await win.webContents.executeJavaScript(`Promise.all([
        import('/teclas.mjs').then(() => 'teclas ok', e => 'teclas: ' + e),
        import('/ayuda.mjs').then(() => 'ayuda ok', e => 'ayuda: ' + e),
        import('/visor.mjs').then(() => 'visor ok', e => 'visor: ' + e),
        fetch('/visor.mjs').then(r => 'visor.mjs HTTP ' + r.status + ' ' + r.headers.get('content-type')),
      ])`);
    } catch (e2) {
      resultado.diagnostico = String(e2);
    }
  }
  terminar();
}
