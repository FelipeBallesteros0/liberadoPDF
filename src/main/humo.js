// Modo humo: lanza una fase de comprobación sobre el PDF indicado y escribe resultado.json.
// Fases: basica (primera página, animación, teclas, presentación, contador, pantalla negra),
//        bucle (avance automático con bucle, con LIBERADOPDF_CONFIG_PRUEBA).
import { app, BrowserWindow, clipboard, screen, nativeImage } from 'electron';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
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
  await espera(2000); // pdf.js vuelve a pintar la página a la escala de pantalla completa
  const capturas = [];
  for (let i = 0; i < 3; i++) {
    if (i) await espera(400);
    capturas.push(await win.webContents.capturePage());
  }
  writeFileSync(path.join(salida, 'p1.png'), capturas[0].toPNG());
  writeFileSync(path.join(salida, 'p2.png'), capturas[2].toPNG());
  r.animacionEnPresentacion = difieren(capturas[0], capturas[1]) || difieren(capturas[1], capturas[2]);
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

// Ajustes: cambiar el color de fondo en el diálogo lo guarda en config.json y lo aplica en vivo.
async function faseAjustes({ ruta, preload, salida }) {
  const r = { dialogo: false, guardado: false, aplicado: false };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js('window.liberadopdfAcciones.ajustes()');
  await espera(500);
  r.dialogo = Boolean(await js('document.querySelector(".liberadopdf-ajustes")'));
  await js(`(() => { const e = document.querySelector('.liberadopdf-ajustes input[type=color]'); e.value = '#102030'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await espera(600);
  const config = JSON.parse(readFileSync(path.join(salida, 'datos', 'config.json'), 'utf8'));
  r.guardado = config.presentacion?.fondo === '#102030';
  r.aplicado = (await js('getComputedStyle(document.getElementById("viewerContainer")).getPropertyValue("--liberadopdf-fondo").trim()')) === '#102030';
  r.ok = r.dialogo && r.guardado && r.aplicado;
  return r;
}

// Nocturno: N pone la clase y guarda nocturno: true; otra N lo quita.
async function faseNocturno({ ruta, preload, salida }) {
  const r = { activado: false, guardado: false, desactivado: false };
  const { js, tecla } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js('document.body.focus()');
  tecla('N');
  await espera(400);
  r.activado = await js('document.getElementById("viewerContainer").classList.contains("liberadopdf-nocturno")');
  r.guardado = JSON.parse(readFileSync(path.join(salida, 'datos', 'config.json'), 'utf8')).nocturno === true;
  tecla('N');
  await espera(300);
  r.desactivado = !(await js('document.getElementById("viewerContainer").classList.contains("liberadopdf-nocturno")'));
  r.ok = r.activado && r.guardado && r.desactivado;
  return r;
}

// Instantánea: un arrastre de 400×300 deja en el portapapeles una imagen de ese tamaño (por el factor de escala).
async function faseInstantanea({ ruta, preload, salida }) {
  const r = { imagen: null, toast: false };
  const { win, js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  clipboard.clear();
  await js('window.liberadopdfAcciones.instantanea()');
  await espera(200);
  const raton = (type, x, y) => win.webContents.sendInputEvent({ type, x, y, button: 'left', clickCount: 1 });
  raton('mouseDown', 300, 200); await espera(50);
  raton('mouseMove', 500, 350); await espera(50);
  raton('mouseMove', 700, 500); await espera(50);
  raton('mouseUp', 700, 500);
  await espera(800);
  const elementos = await clipboard.read();
  const conPng = elementos.find(e => e.types.includes('image/png'));
  const imagen = conPng ? nativeImage.createFromBuffer(Buffer.from(await (await conPng.getType('image/png')).arrayBuffer())) : nativeImage.createEmpty();
  const factor = screen.getPrimaryDisplay().scaleFactor;
  const t = imagen.getSize();
  r.imagen = t;
  r.tamanoEsperado = { width: Math.round(400 * factor), height: Math.round(300 * factor) };
  r.toast = Boolean(await js('document.querySelector(".liberadopdf-toast")'));
  r.ok = !imagen.isEmpty() && Math.abs(t.width - r.tamanoEsperado.width) <= 2 && Math.abs(t.height - r.tamanoEsperado.height) <= 2 && r.toast;
  return r;
}

// Guardar: un texto libre añadido con el editor de pdf.js se guarda en la ruta forzada (LIBERADOPDF_HUMO_GUARDAR).
async function faseGuardar({ ruta, preload, salida }) {
  const r = { editoresVisibles: false, archivo: false, contieneTexto: false, sinEdiciones: false };
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  const { win, js, tecla } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  await espera(500);
  r.editoresVisibles = await js('window.liberadopdfEstado.editoresVisibles');
  // Texto libre: modo FreeText (3), clic en la página, escribir y confirmar con Escape
  await js('PDFViewerApplication.pdfViewer.annotationEditorMode = { mode: 3 }');
  await espera(300);
  const { width, height } = win.getContentBounds();
  const x = Math.round(width * 0.55), y = Math.round(height * 0.45);
  win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
  win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
  await espera(400);
  for (const ch of 'hola') win.webContents.sendInputEvent({ type: 'char', keyCode: ch });
  await espera(200);
  tecla('Escape');
  await espera(400);
  r.anotaciones = await js('PDFViewerApplication.pdfDocument.annotationStorage.size');
  await js('window.liberadopdfAcciones.guardar()');
  for (let i = 0; i < 40 && !existsSync(destino); i++) await espera(250);
  await espera(500);
  r.archivo = existsSync(destino) && statSync(destino).size > 0;
  if (r.archivo) {
    const bytes = readFileSync(destino).toString('latin1');
    r.contieneTexto = bytes.includes('/FreeText') || bytes.includes('hola');
  }
  r.sinEdiciones = win.liberadopdfEdiciones === false;
  r.ok = r.editoresVisibles && r.archivo && r.contieneTexto && r.sinEdiciones;
  return r;
}

// Transiciones (ejemplo_transiciones.pdf): la página 2 (Fade) muestra la capa un segundo; la 5 (/S /R) no.
async function faseTransiciones({ ruta, preload, salida }) {
  const r = { leidas: null, capaFundido: false, capaRetirada: false, capaBarrido: false, instantanea: false };
  const { js, tecla, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await espera(800);
  r.leidas = JSON.parse(await js('JSON.stringify((window.liberadopdfEstado.transiciones || []).map(t => t && t.S))'));
  r.presentacion = await presentar();
  tecla('Right');
  await espera(300);
  r.capaFundido = Boolean(await js('document.querySelector(".liberadopdf-transicion.liberadopdf-trans-fade")'));
  await espera(1100);
  r.capaRetirada = !(await js('document.querySelector(".liberadopdf-transicion")'));
  tecla('Right');
  await espera(300);
  r.capaBarrido = Boolean(await js('document.querySelector(".liberadopdf-transicion.liberadopdf-trans-wipe.liberadopdf-dir-90")'));
  await espera(1100);
  await js('PDFViewerApplication.page = 5');
  await espera(150);
  r.instantanea = !(await js('document.querySelector(".liberadopdf-transicion")')) && (await js('PDFViewerApplication.page')) === 5;
  r.ok = r.presentacion && r.capaFundido && r.capaRetirada && r.capaBarrido && r.instantanea && JSON.stringify(r.leidas) === JSON.stringify(['R', 'Fade', 'Wipe', 'Split', 'R']);
  return r;
}

// Punteros: L sigue al ratón; D dibuja y el trazo se borra al cambiar de página.
async function fasePunteros({ ruta, preload, salida }) {
  const r = { laser: false, laserSigue: false, dibujo: false, trazo: false, borradoAlCambiar: false };
  const { win, js, tecla, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  r.presentacion = await presentar();
  const raton = (type, x, y) => win.webContents.sendInputEvent({ type, x, y, button: 'left', clickCount: 1 });
  tecla('L');
  await espera(200);
  r.laser = Boolean(await js('document.querySelector(".liberadopdf-laser")'));
  raton('mouseMove', 400, 300);
  await espera(200);
  const pos = JSON.parse(await js('JSON.stringify({ l: parseFloat(document.querySelector(".liberadopdf-laser")?.style.left), t: parseFloat(document.querySelector(".liberadopdf-laser")?.style.top) })'));
  r.laserSigue = Math.abs(pos.l - 400) <= 2 && Math.abs(pos.t - 300) <= 2;
  tecla('D');
  await espera(200);
  r.dibujo = Boolean(await js('document.querySelector("canvas.liberadopdf-dibujo")')) && !(await js('document.querySelector(".liberadopdf-laser")'));
  raton('mouseDown', 200, 200); await espera(50);
  raton('mouseMove', 250, 230); await espera(50);
  raton('mouseMove', 300, 260); await espera(50);
  raton('mouseUp', 300, 260);
  await espera(200);
  const pixel = () => js('(() => { const c = document.querySelector("canvas.liberadopdf-dibujo"); return c ? c.getContext("2d").getImageData(250, 230, 1, 1).data[3] : -1; })()');
  r.trazo = (await pixel()) > 0;
  const paginaAntes = await js('PDFViewerApplication.page');
  tecla('Right');
  await espera(400);
  r.borradoAlCambiar = (await js('PDFViewerApplication.page')) === paginaAntes + 1 && (await pixel()) === 0;
  r.ok = r.presentacion && r.laser && r.laserSigue && r.dibujo && r.trazo && r.borradoAlCambiar;
  return r;
}

// Cuadrícula: G la abre con 4 celdas, las flechas mueven la selección, Enter salta, Tab abre y Esc cierra.
async function faseCuadricula({ ruta, preload, salida }) {
  const r = { abierta: false, celdas: 0, actual: false, seleccion3: false, salto: false, tabEsc: false, miniaturas: false };
  const { win, js, tecla } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  await js('document.body.focus()');
  tecla('G');
  await espera(1200);
  r.abierta = Boolean(await js('document.querySelector(".liberadopdf-cuadricula")'));
  r.celdas = await js('document.querySelectorAll(".liberadopdf-cuadricula .celda").length');
  r.actual = await js('document.querySelector(".liberadopdf-cuadricula .celda:nth-child(1)")?.classList.contains("actual") ?? false');
  r.miniaturas = (await js('document.querySelectorAll(".liberadopdf-cuadricula .celda canvas").length')) === 4;
  tecla('Right'); await espera(100); tecla('Right'); await espera(150);
  r.seleccion3 = await js('document.querySelector(".liberadopdf-cuadricula .celda:nth-child(3)")?.classList.contains("seleccionada") ?? false');
  tecla('Return'); await espera(400);
  r.salto = (await js('PDFViewerApplication.page')) === 3 && !(await js('document.querySelector(".liberadopdf-cuadricula")'));
  tecla('Tab'); await espera(500);
  const conTab = Boolean(await js('document.querySelector(".liberadopdf-cuadricula")'));
  tecla('Escape'); await espera(300);
  r.tabEsc = conTab && !(await js('document.querySelector(".liberadopdf-cuadricula")')) && (await js('PDFViewerApplication.page')) === 3;
  r.ok = r.abierta && r.celdas === 4 && r.actual && r.miniaturas && r.seleccion3 && r.salto && r.tabEsc;
  return r;
}

// Medición: a zoom 1 pdf.js usa 96 px por pulgada (CSS), así que 96 px (y 192 px a zoom 2) son 25,4 mm.
async function faseMedicion({ ruta, preload, salida }) {
  const r = { escala1: null, escala2: null };
  const { win, js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  const clic = (x, y) => {
    win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
    win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
  };
  const medir = async (escala, px) => {
    await js(`PDFViewerApplication.pdfViewer.currentScaleValue = ${escala}`);
    await espera(700);
    await js('window.liberadopdfAcciones.medirDistancia()');
    const rect = JSON.parse(await js("JSON.stringify(document.querySelector(\".page[data-page-number='1']\").getBoundingClientRect())"));
    clic(rect.left + 60, rect.top + 60); await espera(150);
    clic(rect.left + 60 + px, rect.top + 60); await espera(400);
    return js('document.querySelector(".liberadopdf-medicion .etiqueta")?.textContent ?? null');
  };
  r.escala1 = await medir(1, 96);
  r.escala2 = await medir(2, 192);
  r.ok = r.escala1 === '25,4 mm' && r.escala2 === '25,4 mm';
  return r;
}

// Vista de presentador: segunda ventana con la lámina actual, la siguiente, y la nota de la lámina 2 tras avanzar.
// Un canvas «no en blanco» tiene al menos 30 píxeles no blancos en una muestra de uno de cada 7 (páginas con poco texto incluidas).
const NO_EN_BLANCO = `(sel) => { const c = document.querySelector(sel); if (!c || !c.width) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 7) { if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) n++; } return n > 30; }`;
async function fasePresentador({ ruta, preload, salida }) {
  const r = { ventana: false, actual: false, notaVacia: false, nota2: null, siguiente: false, navegacion: false };
  const { win, js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js('window.liberadopdfAcciones.presentador()');
  await espera(2500);
  const presentador = BrowserWindow.getAllWindows().find(w => w !== win && w.webContents.getURL().includes('presentador.html'));
  r.ventana = Boolean(presentador);
  if (!presentador) { r.ok = false; return r; }
  const jsP = (codigo) => presentador.webContents.executeJavaScript(codigo);
  r.actual = await jsP(`(${NO_EN_BLANCO})('.actual canvas')`);
  r.notaVacia = (await jsP('document.getElementById("nota").textContent')) === '';
  await js('PDFViewerApplication.page = 2');
  await espera(1500); // actual y siguiente se pintan en cola
  r.nota2 = await jsP('document.getElementById("nota").textContent');
  r.diag = await jsP(`(async () => { const ruta = new URLSearchParams(location.search).get('ruta'); const texto = await window.liberadopdf.leerNotas(ruta); return JSON.stringify({ ruta, texto, pie: document.getElementById('pie-actual').textContent, error: window.liberadopdfError ?? null }); })()`);
  r.siguiente = await jsP(`(${NO_EN_BLANCO})('.siguiente canvas')`);
  // Navegación desde el presentador: → en su ventana avanza el visor
  presentador.focus();
  presentador.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Right' });
  presentador.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Right' });
  await espera(500);
  r.navegacion = (await js('PDFViewerApplication.page')) === 3;
  r.ok = r.ventana && r.actual && r.notaVacia && r.nota2 === 'Nota de la dos' && r.siguiente && r.navegacion;
  return r;
}

const FASES = { basica: faseBasica, bucle: faseBucle, inexistente: faseInexistente, presentacionAnimada: fasePresentacionAnimada, cierre: faseCierre, corrupto: faseCorrupto, ajustes: faseAjustes, nocturno: faseNocturno, instantanea: faseInstantanea, guardar: faseGuardar, transiciones: faseTransiciones, punteros: fasePunteros, cuadricula: faseCuadricula, medicion: faseMedicion, presentador: fasePresentador };

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
