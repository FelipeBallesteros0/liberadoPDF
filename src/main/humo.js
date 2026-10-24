// Modo humo: lanza una fase de comprobación sobre el PDF indicado y escribe resultado.json.
// Fases: basica (primera página, animación, teclas, presentación, contador, pantalla negra),
//        bucle (avance automático con bucle, con LIBERADOPDF_CONFIG_PRUEBA).
import { app, BrowserWindow } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crearVentana } from './ventanas.js';
import { eventosHumo } from './ipc.js';
import { abrirDesdeArgumentos } from './apertura.js';

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
  win.show(); win.focus(); win.moveTop(); // la ventana al frente: las capturas deben ver la animación

  await js('PDFViewerApplication.page = 2');
  await espera(1800);
  // Tres capturas separadas 400 ms: basta con que dos difieran (en Windows, justo tras un arranque
  // frío o con el antivirus activo, una captura aislada puede repetir el fotograma anterior).
  const capturas = [];
  for (let i = 0; i < 3; i++) {
    if (i) await espera(400);
    capturas.push(await win.webContents.capturePage());
  }
  writeFileSync(path.join(salida, 't1.png'), capturas[0].toPNG());
  writeFileSync(path.join(salida, 't2.png'), capturas[2].toPNG());
  r.animacion = difieren(capturas[0], capturas[1]) || difieren(capturas[1], capturas[2]);

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

  // «Modo presentación» está en la barra principal por defecto (movido desde el menú «»»).
  r.presentacionEnBarra = await js('Boolean(document.getElementById("presentationMode")?.closest("#toolbarViewerRight"))');
  r.paginaAntesDePresentar = await pagina();
  r.presentacion = await presentar();
  r.paginaTrasPresentar = await pagina();
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
  // Con la pantalla en negro, un clic del ratón la quita y tampoco avanza (pdf.js navega en mousedown).
  tecla('W');
  await espera(200);
  const { width, height } = win.getContentBounds();
  const raton = (type) => win.webContents.sendInputEvent({ type, x: Math.round(width / 2), y: Math.round(height / 2), button: 'left', clickCount: 1 });
  raton('mouseDown'); raton('mouseUp');
  await espera(300);
  r.clicEnPantalla = !(await js('document.querySelector(".liberadopdf-pantalla")')) && (await pagina()) === 2;

  r.ok = r.msPrimeraPagina < 3000 && r.animacion && r.pagina3 && r.flechaEnEntrada && r.presentacionEnBarra && r.presentacion && r.contadorYSaltos && r.pantallaNegra && r.clicEnPantalla;
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

// Una ruta inexistente por argumento abre la pantalla de inicio con el mensaje, sin diálogo ni cierre.
async function faseInexistente({ ruta, preload, salida }) {
  const r = { inicioConMensaje: false };
  const { ventanas, errores } = abrirDesdeArgumentos({ argv: ['exe', ruta], cwd: process.cwd(), empaquetada: true, preload });
  r.errores = errores;
  const win = ventanas[0];
  await new Promise(resolver => win.webContents.once('did-finish-load', resolver));
  await espera(300);
  const estado = await win.webContents.executeJavaScript(`JSON.stringify({
    ruta: location.pathname,
    mensaje: document.querySelector('.liberadopdf-mensaje')?.textContent ?? '',
    oculto: document.querySelector('.liberadopdf-mensaje')?.hidden ?? true,
  })`);
  writeFileSync(path.join(salida, 'inicio.png'), (await win.webContents.capturePage()).toPNG());
  const { ruta: pathname, mensaje, oculto } = JSON.parse(estado);
  r.pathname = pathname;
  r.mensaje = mensaje;
  r.inicioConMensaje = pathname.endsWith('/inicio.html') && !oculto && mensaje.startsWith('No existe el archivo');
  r.ok = r.inicioConMensaje;
  return r;
}

// La animación de la página indicada (LIBERADOPDF_HUMO_PAGINA, por defecto 2) sigue moviéndose
// dentro de la presentación a pantalla completa. Sirve también con un PDF real.
async function fasePresentacionAnimada({ ruta, preload, salida }) {
  const paginaAnimada = Number(process.env.LIBERADOPDF_HUMO_PAGINA || 2);
  const r = { pagina: paginaAnimada, presentacion: false, animacionEnPresentacion: false };
  const { win, js, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  await js(`PDFViewerApplication.page = ${paginaAnimada}`);
  await espera(500);
  r.presentacion = await presentar();
  await espera(1500);
  const a = await win.webContents.capturePage();
  await espera(400);
  const b = await win.webContents.capturePage();
  writeFileSync(path.join(salida, 'p1.png'), a.toPNG());
  writeFileSync(path.join(salida, 'p2.png'), b.toPNG());
  r.animacionEnPresentacion = difieren(a, b);
  r.ok = r.presentacion && r.animacionEnPresentacion;
  return r;
}

// Tras ver la animación (que modifica campos del formulario desde el sandbox), la X debe cerrar la ventana.
async function faseCierre({ ruta, preload, salida }) {
  const r = { animacionVista: false, cerrada: false };
  const { win, js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js('PDFViewerApplication.page = 2');
  await espera(1500);
  r.animacionVista = true;
  win.webContents.on('will-prevent-unload', () => { r.pdfjsIntentoBloquear = true; });
  const cerrada = new Promise(resolver => win.once('closed', () => resolver(true)));
  win.close(); // equivale a la X de la ventana: pasa por beforeunload del renderer
  r.cerrada = await Promise.race([cerrada, espera(2000).then(() => false)]);
  r.ok = r.animacionVista && r.cerrada;
  return r;
}

// Un archivo .pdf que no es un PDF: pdf.js falla al abrirlo y liberadoPDF vuelve al inicio con el motivo.
async function faseCorrupto({ ruta, preload, salida }) {
  const r = { inicioConMensaje: false };
  const { win } = abrirVentanaDePrueba({ ruta, preload, salida });
  const inicio = new Promise((resolver) => {
    const comprobar = async () => {
      const url = win.webContents.getURL();
      if (url.includes('/inicio.html')) { await espera(300); resolver(true); }
    };
    win.webContents.on('did-finish-load', comprobar);
  });
  const llego = await Promise.race([inicio, espera(8000).then(() => false)]);
  if (llego) {
    r.mensaje = await win.webContents.executeJavaScript(`document.querySelector('.liberadopdf-mensaje')?.textContent ?? ''`);
    r.inicioConMensaje = r.mensaje.startsWith('No se pudo abrir');
  }
  r.ok = r.inicioConMensaje;
  return r;
}

const FASES = { basica: faseBasica, bucle: faseBucle, inexistente: faseInexistente, presentacionAnimada: fasePresentacionAnimada, cierre: faseCierre, corrupto: faseCorrupto };

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
