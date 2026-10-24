// Modo humo: lanza una fase de comprobación sobre el PDF indicado y escribe resultado.json.
// Fases: basica (primera página, animación, teclas, presentación, contador, pantalla negra),
//        bucle (avance automático con bucle, con LIBERADOPDF_CONFIG_PRUEBA).
import { app, BrowserWindow, clipboard, screen, nativeImage, Menu } from 'electron';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { crearVentana } from './ventanas.js';
import { registrarPdf, urlDeToken } from './protocolo.js';
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
  // Sin ediciones del usuario (la animación sí toca el almacén de pdf.js): Ctrl+S no escribe nada y avisa
  await js('PDFViewerApplication.page = 2');
  await espera(1200);
  await js('window.liberadopdfAcciones.guardar()');
  await espera(800);
  r.sinEdicionesNoGuarda = !existsSync(destino) && Boolean(await js('document.querySelector(".liberadopdf-toast")'));
  await js('PDFViewerApplication.page = 1');
  await espera(300);
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
  r.hayEdiciones = await js('window.liberadopdfEstado.hayEdiciones?.() ?? null');
  const { session } = await import('electron');
  session.defaultSession.once('will-download', (e, item) => { r.descarga = { nombre: item.getFilename(), mime: item.getMimeType(), pedidoHace: Date.now() - (win.liberadopdfGuardadoEn ?? 0) }; });
  await js('window.liberadopdfAcciones.guardar()');
  await espera(300);
  r.toastTrasGuardar = await js('document.querySelector(".liberadopdf-toast")?.textContent ?? null');
  for (let i = 0; i < 40 && !existsSync(destino); i++) await espera(250);
  await espera(500);
  r.archivo = existsSync(destino) && statSync(destino).size > 0;
  if (r.archivo) {
    const bytes = readFileSync(destino).toString('latin1');
    r.contieneTexto = bytes.includes('/FreeText') || bytes.includes('hola');
  }
  r.sinEdiciones = win.liberadopdfEdiciones === false;
  r.ok = r.editoresVisibles && r.sinEdicionesNoGuarda && r.archivo && r.contieneTexto && r.sinEdiciones;
  return r;
}

// Transiciones (ejemplo_transiciones.pdf): la página 2 (Fade) muestra la capa un segundo; la 5 (/S /R) no.
async function faseTransiciones({ ruta, preload, salida }) {
  const r = { leidas: null, capaFundido: false, capaRetirada: false, capaBarrido: false, instantanea: false };
  const { js, tecla, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.antesDePresentar = JSON.parse(await js('JSON.stringify(window.liberadopdfEstado.transiciones ?? null)')); // null: no se ha leído aún
  r.presentacion = await presentar();
  await espera(800);
  r.leidas = JSON.parse(await js('JSON.stringify((window.liberadopdfEstado.transiciones || []).map(t => t && t.S))'));
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
  r.ok = r.presentacion && r.antesDePresentar === null && r.capaFundido && r.capaRetirada && r.capaBarrido && r.instantanea && JSON.stringify(r.leidas) === JSON.stringify(['R', 'Fade', 'Wipe', 'Split', 'R']);
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
  // Con el dibujo activo, G abre la cuadrícula y apaga el dibujo (la rejilla queda por encima y recibe los clics)
  tecla('G');
  await espera(600);
  r.cuadriculaApagaPunteros = Boolean(await js('document.querySelector(".liberadopdf-cuadricula")')) && !(await js('document.querySelector("canvas.liberadopdf-dibujo")'));
  tecla('Escape');
  await espera(200);
  r.ok = r.presentacion && r.laser && r.laserSigue && r.dibujo && r.trazo && r.borradoAlCambiar && r.cuadriculaApagaPunteros;
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
  // Abrir otro documento en la misma ventana cierra el presentador (mostraría el PDF anterior)
  const cerrado = new Promise(resolver => presentador.once('closed', () => resolver(true)));
  await js(`window.liberadopdf.abrirEnEstaVentana(${JSON.stringify(ruta)})`);
  r.presentadorCerradoAlCambiar = await Promise.race([cerrado, espera(3000).then(() => false)]);
  r.ok = r.ventana && r.actual && r.notaVacia && r.nota2 === 'Nota de la dos' && r.siguiente && r.navegacion && r.presentadorCerradoAlCambiar;
  return r;
}

// Notas a la derecha (ejemplo_notas.pdf + config de prueba): en presentación la mitad derecha de la pantalla cambia
// al quitar la clase (ampliación de la mitad izquierda frente a la nota), y el presentador pinta la mitad derecha en 16:9.
async function faseNotasDerecha({ ruta, preload, salida }) {
  const r = { clase: false, mitadDerechaDistinta: false, presentador16x9: false };
  const { win, js, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus(); win.moveTop();
  r.presentacion = await presentar();
  await espera(1500);
  r.clase = await js('document.getElementById("viewerContainer").classList.contains("liberadopdf-notas-derecha")');
  // Escala: hasta ×2, limitada por la altura (láminas 4:3 no se recortan); comparada con la geometría real
  r.escala = Number(await js('getComputedStyle(document.getElementById("viewerContainer")).getPropertyValue("--liberadopdf-notas-escala")'));
  const geometria = JSON.parse(await js(`JSON.stringify((() => { const c = document.getElementById('viewerContainer'); const p = document.querySelector('.pdfViewer .page[data-page-number="' + PDFViewerApplication.page + '"]'); return { ch: c.clientHeight, ph: p.offsetHeight, pw: p.offsetWidth }; })())`));
  r.escalaEsperada = Math.min(2, geometria.ch / geometria.ph);
  r.escalaCorrecta = Math.abs(r.escala - r.escalaEsperada) < 0.02;
  const con = await win.webContents.capturePage();
  await js('document.getElementById("viewerContainer").classList.remove("liberadopdf-notas-derecha")');
  await espera(600);
  const sin = await win.webContents.capturePage();
  writeFileSync(path.join(salida, 'con.png'), con.toPNG());
  writeFileSync(path.join(salida, 'sin.png'), sin.toPNG());
  const { width, height } = con.getSize();
  const derechaCon = con.crop({ x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height });
  const derechaSin = sin.crop({ x: Math.floor(width / 2), y: 0, width: Math.floor(width / 2), height });
  r.mitadDerechaDistinta = difieren(derechaCon, derechaSin);
  await js('document.getElementById("viewerContainer").classList.add("liberadopdf-notas-derecha")');
  await js('window.liberadopdfAcciones.presentador()');
  await espera(2500);
  const presentador = BrowserWindow.getAllWindows().find(w => w !== win && w.webContents.getURL().includes('presentador.html'));
  if (presentador) {
    const t = JSON.parse(await presentador.webContents.executeJavaScript('JSON.stringify((c => ({ w: c.width, h: c.height }))(document.querySelector(".actual canvas")))'));
    r.aspecto = t.h ? t.w / t.h : 0;
    // La mitad derecha tiene el aspecto de media página (16:9 → 1,78; 4:3 → 1,33)
    r.aspectoEsperado = geometria.pw / 2 / geometria.ph;
    r.presentador16x9 = Math.abs(r.aspecto - r.aspectoEsperado) < 0.08 * r.aspectoEsperado && (await presentador.webContents.executeJavaScript(`(${NO_EN_BLANCO})('.actual canvas')`));
  }
  r.ok = r.presentacion && r.clase && r.escalaCorrecta && r.mitadDerechaDistinta && r.presentador16x9;
  return r;
}

// Herramientas: el worker responde (eco) y lee el documento con pdf-lib (cargar).
async function faseHerramientasBase({ ruta, preload, salida }) {
  const r = { eco: null, cargar: null, qpdf: null, menu: false };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.eco = await js(`window.liberadopdfHerramientas.ejecutar('eco', { texto: 'hola' })`);
  r.cargar = JSON.parse(await js(`window.liberadopdfHerramientas.bytesDelDocumento().then(bytes => window.liberadopdfHerramientas.ejecutar('cargar', { bytes })).then(JSON.stringify)`));
  r.qpdf = await js(`window.liberadopdfHerramientas.ejecutar('qpdfVersion')`);
  r.menu = Boolean(Menu.getApplicationMenu()?.items.find(i => i.label === 'Herramientas')?.submenu?.items.length >= 17);
  r.ok = r.eco === 'hola' && r.cargar?.paginas === 4 && r.cargar?.cifrado === false && r.menu && / version \d+\.\d+/.test(r.qpdf) // qpdf-wasm ignora thisProgram en el navegador: imprime «this.program version …»;
  return r;
}

// --- Herramientas de archivo: cada fase abre el diálogo real, rellena los campos y pulsa Ejecutar. ---
async function pdfLibMain() {
  const m = await import('pdf-lib');
  return m.PDFDocument ? m : m.default;
}
async function esperarArchivo(ruta, ms = 20_000) {
  const limite = Date.now() + ms;
  while (Date.now() < limite) { if (existsSync(ruta) && readFileSync(ruta).length > 0) return true; await espera(200); }
  return false;
}
async function abrirYEjecutarHerramienta(js, clave, ajustes = {}, clics = []) {
  await js(`window.liberadopdfAcciones.herramienta(${JSON.stringify(clave)})`, true);
  await espera(400);
  const abierto = await js(`Boolean(document.querySelector('.liberadopdf-herramienta[data-herramienta=${JSON.stringify(clave)}]'))`);
  if (!abierto) return false;
  for (const [clave2, valor] of Object.entries(ajustes)) {
    await js(`(e => { if (e.type === 'checkbox') e.checked = ${valor === true}; else e.value = ${JSON.stringify(String(valor))}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('.liberadopdf-herramienta [data-clave=${JSON.stringify(clave2)}]'))`);
  }
  for (const selector of clics) { await js(`document.querySelector(${JSON.stringify(selector)}).click()`, true); await espera(600); }
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="ejecutar"]').click()`, true);
  return true;
}
async function paginasDe(ruta) {
  const { PDFDocument } = await pdfLibMain();
  const doc = await PDFDocument.load(readFileSync(ruta), { ignoreEncryption: true, updateMetadata: false });
  return { paginas: doc.getPageCount(), rotaciones: doc.getPages().map(p => p.getRotation().angle), cifrado: doc.isEncrypted };
}

// Unir: el documento abierto + él mismo (elegido por LIBERADOPDF_HUMO_ELEGIR) → 8 páginas.
async function faseUnir({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, paginas: 0, filas: 0 };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'unir', {}, ['.liberadopdf-herramienta [data-accion="anadir"]']);
  r.filas = Number(await js(`document.querySelectorAll('.liberadopdf-herramienta .lista .elemento').length`)) || 0;
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) r.paginas = (await paginasDe(destino)).paginas;
  r.ok = r.dialogo && r.archivo && r.paginas === 8;
  return r;
}

// Dividir cada 2 páginas → carpeta con «… - parte 01.pdf» y «… - parte 02.pdf» de 2 páginas.
async function faseDividir({ ruta, preload, salida }) {
  const r = { dialogo: false, archivos: [], paginas: [], aviso: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'dividir', { modo: 'cada', cada: 2 });
  r.aviso = await js(`document.querySelector('.liberadopdf-herramienta .aviso-partes')?.textContent ?? null`);
  const carpeta = process.env.LIBERADOPDF_HUMO_CARPETA;
  const base = path.basename(ruta, '.pdf');
  const esperados = [1, 2].map(i => path.join(carpeta, `${base} - parte 0${i}.pdf`));
  for (const e of esperados) if (await esperarArchivo(e)) r.archivos.push(path.basename(e));
  for (const e of esperados) if (existsSync(e)) r.paginas.push((await paginasDe(e)).paginas);
  r.ok = r.dialogo && r.archivos.length === 2 && r.paginas.every(p => p === 2) && /2 archivos/.test(r.aviso ?? '');
  return r;
}

// Rotar 90° todas las páginas → /Rotate 90 en las 4.
async function faseRotar({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, rotaciones: [] };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'rotar', { grados: 90, paginas: '' });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) r.rotaciones = (await paginasDe(destino)).rotaciones;
  r.ok = r.dialogo && r.archivo && r.rotaciones.length === 4 && r.rotaciones.every(g => g === 90);
  return r;
}

// Organizar: plan [4, 1 rotada 90°, en blanco] por el worker → 3 páginas, la 2.ª /Rotate 90, la 3.ª sin contenido; y el diálogo con 4 celdas (+1 en blanco).
async function faseOrganizar({ ruta, preload, salida }) {
  const r = { dialogo: false, celdas: 0, celdasTrasBlanco: 0, paginas: 0, rotaciones: [], terceraEnBlanco: false, mismoTamano: false };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js(`window.liberadopdfAcciones.herramienta('organizar')`, true);
  await espera(800);
  r.dialogo = Boolean(await js(`document.querySelector('.liberadopdf-herramienta[data-herramienta="organizar"]')`));
  r.celdas = Number(await js(`document.querySelectorAll('.rejilla-organizar .celda').length`));
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="blanco"]').click()`, true);
  r.celdasTrasBlanco = Number(await js(`document.querySelectorAll('.rejilla-organizar .celda').length`));
  r.miniaturas = Number(await js(`document.querySelectorAll('.rejilla-organizar .marco img').length`));
  const plan = [{ origen: 4, rotacion: 0 }, { origen: 1, rotacion: 90 }, { origen: null, rotacion: 0 }];
  const bytes = await js(`window.liberadopdfHerramientas.bytesDelDocumento().then(b => window.liberadopdfHerramientas.ejecutar('organizar', { bytes: b, plan: ${JSON.stringify(plan)} })).then(b => Array.from(b))`);
  const destino = path.join(salida, 'organizado.pdf');
  writeFileSync(destino, Buffer.from(bytes));
  const { PDFDocument } = await pdfLibMain();
  const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
  r.paginas = doc.getPageCount();
  r.rotaciones = doc.getPages().map(p => p.getRotation().angle);
  const tercera = doc.getPage(2);
  r.terceraEnBlanco = tercera.node.Contents() === undefined;
  const t1 = doc.getPage(0).getSize(); const t3 = tercera.getSize();
  r.mismoTamano = Math.abs(t1.width - t3.width) < 0.01 && Math.abs(t1.height - t3.height) < 0.01;
  r.ok = r.dialogo && r.celdas === 4 && r.celdasTrasBlanco === 5 && r.miniaturas >= 4 && r.paginas === 3 && r.rotaciones[1] === 90 && r.rotaciones[0] === 0 && r.terceraEnBlanco && r.mismoTamano;
  return r;
}

// Texto de una página de un PDF en disco, leído con el pdf.js del propio visor (pdfjsLib es global en viewer.html).
async function textoDePagina(js, ruta, pagina) {
  const url = urlDeToken(registrarPdf(ruta));
  return js(`pdfjsLib.getDocument({ url: ${JSON.stringify(url)} }).promise.then(d => d.getPage(${pagina})).then(p => p.getTextContent()).then(t => t.items.map(i => i.str).join(' '))`);
}
// Ítems de texto de una página de un PDF en disco con su posición (transform de pdf.js: [a b c d x y] en unidades PDF).
async function itemsDePagina(js, ruta, pagina) {
  const url = urlDeToken(registrarPdf(ruta));
  return JSON.parse(await js(`pdfjsLib.getDocument({ url: ${JSON.stringify(url)} }).promise.then(d => d.getPage(${pagina})).then(p => p.getTextContent()).then(t => JSON.stringify(t.items.filter(i => i.str && i.str.trim()).map(i => ({ str: i.str, a: i.transform[0], b: i.transform[1], x: i.transform[4], y: i.transform[5] }))))`));
}
// Fracción de píxeles (0–1) que difieren más de `umbral` entre la página N del documento abierto y la del PDF en disco.
async function fraccionDistinta(js, ruta, pagina, umbral) {
  const url = urlDeToken(registrarPdf(ruta));
  return Number(await js(`(async () => {
    const pintar = async (doc) => { const p = await doc.getPage(${pagina}); const vp = p.getViewport({ scale: 1 }); const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
    const a = await pintar(PDFViewerApplication.pdfDocument);
    const b = await pintar(await pdfjsLib.getDocument({ url: ${JSON.stringify(url)} }).promise);
    let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > ${umbral} || Math.abs(a[i + 1] - b[i + 1]) > ${umbral} || Math.abs(a[i + 2] - b[i + 2]) > ${umbral}) n++;
    return n / (a.length / 4);
  })()`));
}
// Píxeles distintos entre la página 1 del documento abierto y la del PDF en disco, ambos renderizados por pdf.js a escala 1.
async function pixelesDistintos(js, ruta) {
  const url = urlDeToken(registrarPdf(ruta));
  return js(`(async () => {
    const pintar = async (doc) => { const p = await doc.getPage(1); const vp = p.getViewport({ scale: 1 }); const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
    const a = await pintar(PDFViewerApplication.pdfDocument);
    const b = await pintar(await pdfjsLib.getDocument({ url: ${JSON.stringify(url)} }).promise);
    let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 16 || Math.abs(a[i + 1] - b[i + 1]) > 16 || Math.abs(a[i + 2] - b[i + 2]) > 16) n++;
    return n;
  })()`);
}

// Numerar: «Página {n} / {total}» abajo-centro → la página 2 del resultado contiene «Página 2 / 4».
async function faseNumerar({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, texto: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'numerar', {});
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    r.texto = await textoDePagina(js, destino, 2);
    // El PDF de prueba lleva CropBox (60, 40, 300×150): el número debe caer dentro de la zona visible, no del MediaBox.
    const items = await itemsDePagina(js, destino, 2);
    const numero = items.find(i => /Página|2 \/ 4/.test(i.str));
    r.posicion = numero ? { x: Math.round(numero.x), y: Math.round(numero.y) } : null;
    r.dentroDelCropBox = Boolean(numero) && numero.x >= 60 && numero.x <= 360 && numero.y >= 40 && numero.y <= 190;
  }
  r.ok = r.dialogo && r.archivo && /Página 2 \/ 4/.test(r.texto ?? '') && r.dentroDelCropBox;
  return r;
}

// Marca de agua: «BORRADOR» al 30 % → el texto aparece y el render de la página 1 cambia.
async function faseMarcaDeAgua({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, texto: null, pixeles: 0 };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'marcaDeAgua', { opacidad: 0.3 });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) { r.texto = await textoDePagina(js, destino, 1); r.pixeles = Number(await pixelesDistintos(js, destino)); }
  // getTextContent de pdf.js pierde la primera letra de un texto girado 45° (PyMuPDF devuelve «BORRADOR» entero): se comprueba el resto.
  r.ok = r.dialogo && r.archivo && /ORRADOR/.test(r.texto ?? '') && r.pixeles > 500;
  return r;
}

// Recortar: medidas escritas → CropBox en las 4 páginas; y un arrastre real sobre la página rellena las medidas.
async function faseRecortar({ ruta, preload, salida }) {
  const r = { dialogo: false, arrastre: null, archivo: false, cajas: [] };
  const { win, js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  win.show(); win.focus();
  await js(`window.liberadopdfAcciones.herramienta('recortar')`, true);
  await espera(400);
  r.dialogo = Boolean(await js(`document.querySelector('.liberadopdf-herramienta[data-herramienta="recortar"]')`));
  // Arrastre: desde (10,10) hasta (110,60) píxeles dentro de la página 1.
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="marcar"]').click()`, true);
  await espera(200);
  const rect = JSON.parse(await js(`JSON.stringify((r => ({ x: r.x, y: r.y }))(document.querySelector('.page[data-page-number="1"]').getBoundingClientRect()))`));
  const escala = Number(await js(`PDFViewerApplication.pdfViewer.getPageView(0).viewport.scale`));
  const raton = (type, x, y, extra = {}) => win.webContents.sendInputEvent({ type, x: Math.round(rect.x + x), y: Math.round(rect.y + y), button: 'left', clickCount: 1, ...extra });
  raton('mouseDown', 10, 10); await espera(100); raton('mouseMove', 60, 35); await espera(100); raton('mouseMove', 110, 60); await espera(100); raton('mouseUp', 110, 60); await espera(300);
  r.arrastre = JSON.parse(await js(`JSON.stringify(Object.fromEntries(['x','y','ancho','alto'].map(k => [k, Number(document.querySelector('.liberadopdf-herramienta [data-clave="' + k + '"]').value)])))`));
  r.arrastreEsperado = { ancho: 100 / escala, alto: 50 / escala };
  r.arrastreOk = Math.abs(r.arrastre.ancho - r.arrastreEsperado.ancho) < 1.5 && Math.abs(r.arrastre.alto - r.arrastreEsperado.alto) < 1.5 && !(await js(`document.querySelector('.liberadopdf-herramienta').hidden`));
  // Medidas fijas → resultado
  for (const [k, v] of Object.entries({ x: 10, y: 20, ancho: 200, alto: 100 })) await js(`(e => { e.value = '${v}'; e.dispatchEvent(new Event('input', { bubbles: true })); })(document.querySelector('.liberadopdf-herramienta [data-clave="${k}"]'))`);
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="ejecutar"]').click()`, true);
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    const { PDFDocument } = await pdfLibMain();
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.cajas = doc.getPages().map(p => p.getCropBox());
  }
  r.ok = r.dialogo && r.arrastreOk && r.archivo && r.cajas.length === 4 && r.cajas.every(c => c.x === 10 && c.y === 20 && c.width === 200 && c.height === 100);
  return r;
}

// Metadatos: precarga los actuales; con título y autor nuevos el resultado los lleva.
async function faseMetadatos({ ruta, preload, salida }) {
  const r = { dialogo: false, precarga: null, archivo: false, titulo: null, autor: null, palabrasClave: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js(`window.liberadopdfAcciones.herramienta('metadatos')`, true);
  await espera(1500); // la precarga lee el documento en el worker
  r.dialogo = Boolean(await js(`document.querySelector('.liberadopdf-herramienta[data-herramienta="metadatos"]')`));
  r.precarga = await js(`document.querySelector('.liberadopdf-herramienta [data-clave="titulo"]')?.value ?? null`);
  for (const [k, v] of Object.entries({ titulo: 'Título de prueba', autor: 'Humo', palabrasClave: 'uno, dos' })) await js(`(e => { e.value = ${JSON.stringify(v)}; })(document.querySelector('.liberadopdf-herramienta [data-clave="${k}"]'))`);
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="ejecutar"]').click()`, true);
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    const { PDFDocument } = await pdfLibMain();
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.titulo = doc.getTitle(); r.autor = doc.getAuthor(); r.palabrasClave = doc.getKeywords();
  }
  r.ok = r.dialogo && r.archivo && r.titulo === 'Título de prueba' && r.autor === 'Humo' && r.palabrasClave === 'uno dos';
  return r;
}

// Aplanar con «quitar anotaciones»: el ejemplo tiene los widgets de animate; el resultado no tiene /Annots.
async function faseAplanar({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, anotacionesAntes: 0, anotacionesDespues: null, resumen: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  const { PDFDocument } = await pdfLibMain();
  const antes = await PDFDocument.load(readFileSync(ruta), { updateMetadata: false });
  r.anotacionesAntes = antes.getPages().reduce((n, p) => n + (p.node.Annots()?.size() ?? 0), 0);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'aplanar', { quitarAnotaciones: true });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.anotacionesDespues = doc.getPages().reduce((n, p) => n + (p.node.Annots()?.size() ?? 0), 0);
  }
  r.ok = r.dialogo && r.archivo && r.anotacionesAntes > 0 && r.anotacionesDespues === 0;
  return r;
}

function tamanoPng(ruta) {
  const b = readFileSync(ruta);
  return b.length > 24 && b.toString('latin1', 1, 4) === 'PNG' ? { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) } : null;
}

// PDF a imágenes: 4 PNG a 100 ppp en la carpeta, de ≈ 454×255 pt × 100/72.
async function faseAImagenes({ ruta, preload, salida }) {
  const r = { dialogo: false, archivos: [], tamanos: [], esperado: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'aImagenes', { formato: 'png', ppp: 100 });
  const carpeta = process.env.LIBERADOPDF_HUMO_CARPETA;
  const base = path.basename(ruta, '.pdf');
  const esperados = [1, 2, 3, 4].map(i => path.join(carpeta, `${base} - página 0${i}.png`));
  for (const e of esperados) if (await esperarArchivo(e)) r.archivos.push(path.basename(e));
  r.tamanos = esperados.filter(existsSync).map(tamanoPng);
  const { PDFDocument } = await pdfLibMain();
  const { width, height } = (await PDFDocument.load(readFileSync(ruta), { updateMetadata: false })).getPage(0).getSize();
  r.esperado = { ancho: Math.round(width * 100 / 72), alto: Math.round(height * 100 / 72) };
  r.ok = r.dialogo && r.archivos.length === 4 && r.tamanos.every(t => t && Math.abs(t.ancho - r.esperado.ancho) <= 1 && Math.abs(t.alto - r.esperado.alto) <= 1);
  return r;
}

// Imágenes a PDF: dos PNG (uno con transparencia) y un «.jpg» que es texto (se omite) → PDF de 2 páginas A4.
async function faseDeImagenes({ ruta, preload, salida }) {
  const r = { dialogo: false, filas: 0, omitidas: 0, archivo: false, paginas: 0, tamanos: [] };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  await js(`window.liberadopdfAcciones.herramienta('deImagenes')`, true);
  await espera(400);
  r.dialogo = Boolean(await js(`document.querySelector('.liberadopdf-herramienta[data-herramienta="deImagenes"]')`));
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="anadir"]').click()`, true);
  await espera(1500);
  r.filas = Number(await js(`document.querySelectorAll('.liberadopdf-herramienta .lista .elemento').length`));
  r.omitidas = Number(await js(`document.querySelectorAll('.liberadopdf-herramienta .lista .elemento.omitida').length`));
  await js(`document.querySelector('.liberadopdf-herramienta [data-accion="ejecutar"]').click()`, true);
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    const { PDFDocument } = await pdfLibMain();
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.paginas = doc.getPageCount();
    r.tamanos = doc.getPages().map(p => { const s = p.getSize(); return [Math.round(s.width), Math.round(s.height)]; });
  }
  // Orientación «según la imagen»: A (80×60) apaisada, B (60×90) vertical, la PNG llamada .jpg (80×60) apaisada y el
  // JPEG con EXIF 6 (200×100 girado → 100×200) vertical; el .jpg que es texto se omite.
  r.ok = r.dialogo && r.filas === 5 && r.omitidas === 1 && r.archivo && r.paginas === 4 && JSON.stringify(r.tamanos) === JSON.stringify([[842, 595], [595, 842], [842, 595], [595, 842]]);
  return r;
}

// HTML a PDF: un prueba.html elegido por el diálogo → PDF cuyo texto contiene «Hola liberadoPDF».
async function faseHtmlAPdf({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, texto: null, urlRechazada: null, presentacionDespues: null };
  const { win, js, presentar } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'htmlAPdf', { origen: 'archivo' }, ['.liberadopdf-herramienta [data-accion="anadir"]']);
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino, 40_000);
  // Tras convertir, la presentación (pantalla completa) debe seguir funcionando en esta misma instancia.
  win.show(); win.focus();
  r.presentacionDespues = await presentar();
  if (!r.archivo) r.mensajeDialogo = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`);
  if (r.archivo) r.texto = await textoDePagina(js, destino, 1);
  // Una URL que no es http(s) se rechaza en el main sin abrir ventana.
  r.urlRechazada = JSON.parse(await js(`window.liberadopdf.htmlAPdf({ origen: 'url', valor: 'file:///etc/passwd' }).then(JSON.stringify)`));
  r.ok = r.dialogo && r.archivo && /Hola liberadoPDF/.test(r.texto ?? '') && Boolean(r.urlRechazada?.error) && r.presentacionDespues === true;
  return r;
}

// Proteger: usuario «clave», propietario «dueño» → /Encrypt; pdf.js lo abre con la contraseña y lo rechaza sin ella.
async function faseProteger({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, cifrado: null, conClave: null, sinClave: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'proteger', { usuario: 'clave', propietario: 'dueño' });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) {
    r.cifrado = (await paginasDe(destino)).cifrado;
    const url = urlDeToken(registrarPdf(destino));
    r.conClave = await js(`pdfjsLib.getDocument({ url: ${JSON.stringify(url)}, password: 'clave' }).promise.then(d => d.numPages)`);
    r.sinClave = await js(`pdfjsLib.getDocument({ url: ${JSON.stringify(url)} }).promise.then(() => 'abrió', e => e.name)`);
  }
  r.ok = r.dialogo && r.archivo && r.cifrado === true && r.conClave === 4 && r.sinClave === 'PasswordException';
  return r;
}

// Desbloquear: se abre el PDF cifrado (pdf.js pide la contraseña), «rotar» avisa de que está cifrado, y desbloquear
// con la contraseña da un PDF sin /Encrypt; con una contraseña mala el worker responde «Contraseña incorrecta».
async function faseDesbloquear({ ruta, preload, salida }) {
  const r = { contrasenaPedida: false, avisoCifrado: null, dialogo: false, archivo: false, cifrado: null, paginas: 0, mala: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  for (let i = 0; i < 40 && !r.contrasenaPedida; i++) { await espera(250); r.contrasenaPedida = Boolean(await js(`document.getElementById('passwordDialog')?.open`)); }
  await js(`document.getElementById('password').value = 'clave'; document.getElementById('passwordSubmit').click();`, true);
  await esperarEvento('primera-pagina', 10_000);
  await abrirYEjecutarHerramienta(js, 'rotar', {});
  await espera(1500);
  r.avisoCifrado = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`);
  await js(`document.querySelector('.liberadopdf-herramienta .pie button').click()`, true); // Cancelar
  r.mala = await js(`window.liberadopdfHerramientas.bytesDelDocumento().then(b => window.liberadopdfHerramientas.ejecutar('desbloquear', { bytes: b, contrasena: 'mala' })).then(() => 'descifró', e => e.message)`);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'desbloquear', { contrasena: 'clave' });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) { const p = await paginasDe(destino); r.cifrado = p.cifrado; r.paginas = p.paginas; }
  r.ok = r.contrasenaPedida && /cifrado/.test(r.avisoCifrado ?? '') && r.mala === 'Contraseña incorrecta' && r.dialogo && r.archivo && r.cifrado === false && r.paginas === 4;
  return r;
}

// Reparar: pdf.js no abre el ejemplo truncado (sin los últimos 300 bytes), así que se abre el ejemplo sano y se elige
// el truncado en el diálogo → el resultado carga con pdf-lib y tiene 4 páginas.
async function faseReparar({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, paginas: 0, resumen: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 15_000);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'reparar', {}, ['.liberadopdf-herramienta [data-accion="anadir"]']);
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino);
  if (r.archivo) { r.paginas = (await paginasDe(destino)).paginas; r.nombre = path.basename(destino); }
  else r.mensaje = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`);
  // Segundo archivo: el ejemplo con object streams (formato por defecto de pdflatex, Word, Chrome) truncado.
  process.env.LIBERADOPDF_HUMO_ELEGIR = process.env.LIBERADOPDF_HUMO_OBJSTM;
  const destino2 = destino + '.objstm.pdf';
  process.env.LIBERADOPDF_HUMO_GUARDAR = destino2;
  await abrirYEjecutarHerramienta(js, 'reparar', {}, ['.liberadopdf-herramienta [data-accion="anadir"]']);
  r.archivoObjstm = await esperarArchivo(destino2);
  if (r.archivoObjstm) r.paginasObjstm = (await paginasDe(destino2)).paginas;
  else r.mensajeObjstm = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`);
  r.ok = r.dialogo && r.archivo && r.paginas === 4 && r.archivoObjstm && r.paginasObjstm === 4;
  return r;
}

// OCR: el ejemplo escaneado (una imagen, sin texto) → el resultado tiene «LIBERADO» en su capa de texto; y cancelar
// a los 300 ms sobre el ejemplo animado deja el diálogo en «Cancelado» y no escribe archivo.
async function faseOcr({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, textoAntes: null, texto: null, cancelado: null, archivoTrasCancelar: null, resumen: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  r.textoAntes = await js(`PDFViewerApplication.pdfDocument.getPage(1).then(p => p.getTextContent()).then(t => t.items.map(i => i.str).join(' '))`);
  r.dialogo = await abrirYEjecutarHerramienta(js, 'ocr', { idioma: 'spa', ppp: '200' });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino, 120_000);
  if (r.archivo) {
    r.texto = await textoDePagina(js, destino, 1);
    // Capa invisible por modo de texto (3 Tr), sin un ExtGState por palabra.
    const { PDFDocument, PDFDict, PDFName } = await pdfLibMain();
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.extGStates = [...doc.context.enumerateIndirectObjects()].filter(([, o]) => o instanceof PDFDict && o.get(PDFName.of('Type')) === PDFName.of('ExtGState')).length;
    const { decodePDFRawStream, PDFRawStream: PRS, PDFArray } = await pdfLibMain();
    const contenidos = [];
    for (const pagina of doc.getPages()) { const c = pagina.node.Contents(); const refs = c instanceof PDFArray ? c.asArray() : c ? [c] : []; for (const ref of refs) { const s = doc.context.lookup(ref); if (s instanceof PRS) contenidos.push(Buffer.from(decodePDFRawStream(s).decode()).toString('latin1')); } }
    r.textoInvisible = contenidos.some(t => /\b3 Tr\b/.test(t));
  } else r.mensaje = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`);
  // Cancelación (Review Focus 3): sobre el ejemplo animado de 4 páginas, Cancelar en plena recognición (2,5 s) y
  // comprobar que la ejecución se asienta como «cancelada» (tesseract no rechaza sus promesas al terminar el worker).
  const { js: js2 } = abrirVentanaDePrueba({ ruta: process.env.LIBERADOPDF_HUMO_ANIMADO, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  const destino2 = destino + '.cancelado.pdf';
  process.env.LIBERADOPDF_HUMO_GUARDAR = destino2;
  await abrirYEjecutarHerramienta(js2, 'ocr', { idioma: 'spa', ppp: '300' });
  // Esperar a que esté reconociendo la página 2 (o 3): entonces Cancelar cae en plena recognición.
  for (let i = 0; i < 400 && !/página [23]/.test(r.progresoAlCancelar ?? ''); i++) { await espera(30); r.progresoAlCancelar = await js2(`document.querySelector('.liberadopdf-herramienta .progreso span')?.textContent ?? null`); }
  await js2(`document.querySelector('.liberadopdf-herramienta .pie button')?.click()`, true); // Cancelar
  for (let i = 0; i < 60 && r.estadoTrasCancelar !== 'cancelada'; i++) { await espera(250); r.estadoTrasCancelar = await js2(`window.liberadopdfHerramientas.ultimaEjecucion?.estado ?? null`); }
  r.cancelado = !(await js2(`Boolean(document.querySelector('.liberadopdf-herramienta'))`));
  r.archivoTrasCancelar = existsSync(destino2);
  // Página escaneada girada 90° (/Rotate): el texto invisible debe ir girado con ella y seguir siendo buscable.
  const { js: js3 } = abrirVentanaDePrueba({ ruta: process.env.LIBERADOPDF_HUMO_GIRADO, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  const destino3 = destino + '.girado.pdf';
  process.env.LIBERADOPDF_HUMO_GUARDAR = destino3;
  await abrirYEjecutarHerramienta(js3, 'ocr', { idioma: 'spa', ppp: '200' });
  r.archivoGirado = await esperarArchivo(destino3, 120_000);
  if (r.archivoGirado) {
    const items = await itemsDePagina(js3, destino3, 1);
    const liberado = items.find(i => /LIBERADO/.test(i.str));
    r.textoGirado = items.map(i => i.str).join(' ');
    r.itemGirado = liberado ? { a: Math.round(liberado.a * 1000) / 1000, b: Math.round(liberado.b * 1000) / 1000, x: Math.round(liberado.x), y: Math.round(liberado.y) } : null;
    // Página sin girar de 70×160 mm (198×454 pt) con /Rotate 90: el texto va girado (a ≈ 0, b ≠ 0) y dentro de ella.
    r.giradoOk = Boolean(liberado) && Math.abs(liberado.a) < 1e-3 && Math.abs(liberado.b) > 0.5 && liberado.x >= 0 && liberado.x <= 200 && liberado.y >= 0 && liberado.y <= 460;
  }
  r.ok = r.dialogo && r.archivo && r.textoAntes === '' && /LIBERADO/.test(r.texto ?? '') && r.textoInvisible && r.extGStates < 10
    && r.estadoTrasCancelar === 'cancelada' && r.cancelado && !r.archivoTrasCancelar && r.giradoOk === true;
  return r;
}

// Comprimir: ejemplo_fotos (dos JPEG 2000×1500) con calidad baja → menos de la mitad y 2 páginas; comprimir ese
// resultado otra vez con calidad «alta» no reduce → mensaje y sin archivo; cancelar nada más empezar → sin archivo.
async function faseComprimir({ ruta, preload, salida }) {
  const r = { dialogo: false, archivo: false, antes: 0, despues: 0, paginas: 0, mensajeSegundaPasada: null, archivoSegundaPasada: null, cancelado: null, archivoTrasCancelar: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 15_000);
  r.antes = statSync(ruta).size;
  r.dialogo = await abrirYEjecutarHerramienta(js, 'comprimir', { calidad: 'baja' });
  const destino = process.env.LIBERADOPDF_HUMO_GUARDAR;
  r.archivo = await esperarArchivo(destino, 90_000);
  if (r.archivo) {
    r.despues = statSync(destino).size; r.paginas = (await paginasDe(destino)).paginas;
    // La página 3 es una PNG con predictor: debe haberse recodificado a JPEG y parecerse a la original (con basura
    // difiere casi al 100 %).
    r.fraccionDistintaPng = await fraccionDistinta(js, destino, 3, 40);
    const { PDFDocument, PDFRawStream, PDFName } = await pdfLibMain();
    const doc = await PDFDocument.load(readFileSync(destino), { updateMetadata: false });
    r.filtrosResultado = [...doc.context.enumerateIndirectObjects()].filter(([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')).map(([, o]) => String(o.dict.get(PDFName.of('Filter'))));
  }
  else { r.mensaje = await js(`document.querySelector('.liberadopdf-herramienta .mensaje')?.textContent ?? null`); r.ok = false; return r; }
  // No reducible: el ejemplo animado sin imágenes y ya recomprimido por qpdf con las mismas opciones.
  const { js: js2 } = abrirVentanaDePrueba({ ruta: process.env.LIBERADOPDF_HUMO_OPTIMIZADO, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  const destino2 = destino + '.segunda_pasada.pdf';
  process.env.LIBERADOPDF_HUMO_GUARDAR = destino2;
  await abrirYEjecutarHerramienta(js2, 'comprimir', { calidad: 'baja' });
  for (let i = 0; i < 60 && !r.mensajeSegundaPasada; i++) { await espera(500); r.mensajeSegundaPasada = await js2(`document.querySelector('.liberadopdf-herramienta .mensaje:not([hidden])')?.textContent ?? null`); }
  r.archivoSegundaPasada = existsSync(destino2);
  // Cancelar: fotos otra vez; Ejecutar y Cancelar en el mismo tick (la segunda pasada tarda menos de 400 ms).
  const { js: js3 } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 15_000);
  const destino3 = destino + '.cancelado.pdf';
  process.env.LIBERADOPDF_HUMO_GUARDAR = destino3;
  await js3(`window.liberadopdfAcciones.herramienta('comprimir')`, true);
  await espera(400);
  r.dialogo3 = Boolean(await js3(`document.querySelector('.liberadopdf-herramienta[data-herramienta="comprimir"]')`));
  await js3(`(d => { d.querySelector('[data-accion="ejecutar"]').click(); d.querySelector('.pie button').click(); })(document.querySelector('.liberadopdf-herramienta'))`, true);
  await espera(6000);
  r.cancelado = !(await js3(`Boolean(document.querySelector('.liberadopdf-herramienta'))`));
  r.archivoTrasCancelar = existsSync(destino3);
  r.ok = r.dialogo && r.archivo && r.despues < r.antes / 2 && r.paginas === 3 && r.fraccionDistintaPng < 0.15 && JSON.stringify(r.filtrosResultado) === JSON.stringify(['/DCTDecode', '/DCTDecode', '/DCTDecode']) && /No se pudo reducir/.test(r.mensajeSegundaPasada ?? '') && !r.archivoSegundaPasada && r.dialogo3 && r.cancelado && !r.archivoTrasCancelar;
  return r;
}

// Cifrado: las herramientas rechazan un PDF cifrado con el mensaje acordado. Hasta que exista la operación
// «proteger» (Tarea 8) no hay con qué generar el PDF cifrado: la fase queda pendiente y no cuenta.
async function faseCifrado({ ruta, preload, salida }) {
  const r = { pendiente: false, mensaje: null };
  const { js } = abrirVentanaDePrueba({ ruta, preload, salida });
  await esperarEvento('primera-pagina', 10_000);
  const cifrado = await js(`window.liberadopdfHerramientas.bytesDelDocumento().then(bytes => window.liberadopdfHerramientas.ejecutar('proteger', { bytes, usuario: 'clave', propietario: 'clave' })).then(r => r.bytes).then(b => Array.from(b)).catch(e => e.message)`);
  if (typeof cifrado === 'string') { r.pendiente = true; r.ok = true; r.motivo = cifrado; return r; }
  const rutaCifrado = path.join(salida, 'cifrado.pdf');
  writeFileSync(rutaCifrado, Buffer.from(cifrado));
  r.cifrado = (await paginasDe(rutaCifrado)).cifrado;
  await js(`window.liberadopdfHerramientas.ejecutar('rotar', { bytes: new Uint8Array(${JSON.stringify(cifrado)}), paginas: [1], grados: 90 }).catch(e => { window.__errorCifrado = e.message; })`);
  r.mensaje = await js('window.__errorCifrado ?? null');
  r.ok = r.cifrado === true && r.mensaje === 'cifrado';
  return r;
}

const FASES = { comprimir: faseComprimir, ocr: faseOcr, proteger: faseProteger, desbloquear: faseDesbloquear, reparar: faseReparar, htmlAPdf: faseHtmlAPdf, aImagenes: faseAImagenes, deImagenes: faseDeImagenes, recortar: faseRecortar, metadatos: faseMetadatos, aplanar: faseAplanar, numerar: faseNumerar, marcaDeAgua: faseMarcaDeAgua, organizar: faseOrganizar, unir: faseUnir, dividir: faseDividir, rotar: faseRotar, cifrado: faseCifrado, herramientasBase: faseHerramientasBase, basica: faseBasica, bucle: faseBucle, inexistente: faseInexistente, presentacionAnimada: fasePresentacionAnimada, cierre: faseCierre, corrupto: faseCorrupto, ajustes: faseAjustes, nocturno: faseNocturno, instantanea: faseInstantanea, guardar: faseGuardar, transiciones: faseTransiciones, punteros: fasePunteros, cuadricula: faseCuadricula, medicion: faseMedicion, presentador: fasePresentador, notasDerecha: faseNotasDerecha };

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
