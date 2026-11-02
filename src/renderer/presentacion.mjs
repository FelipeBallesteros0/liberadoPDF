// Modo presentación: fondo, cursor, pantalla en negro/blanco, reloj, avance automático y bucle.
// pdf.js gestiona la pantalla completa; aquí se escucha presentationmodechanged y se añaden las capas.
import { siguientePagina, textoReloj } from '../comun/presentacion.mjs';
import { crearClics } from '../comun/dobleClic.mjs';
import { raizDeCapas } from './capas.mjs';

const CURSOR_MS = 2000;
const DOBLE_CLIC_MS = 500; // lo que espera un clic antes de navegar, por si viene el segundo (el doble clic por defecto de Windows)

export function instalarPresentacion({ app, obtenerConfig, acciones }) {
  let config = obtenerConfig();
  const contenedor = document.getElementById('viewerContainer');
  const raiz = raizDeCapas();
  let pantalla = null;     // capa negra o blanca
  let reloj = null;        // capa del reloj
  let relojVisible = false;
  let temporizadorReloj = null;
  let inicio = 0;          // arranque del cronómetro
  let temporizadorAvance = null;
  let temporizadorCursor = null;

  const modoActual = () => (app.pdfPresentationMode?.active ? 'presentacion' : 'ventana');

  // --- fondo y cursor -------------------------------------------------------
  contenedor.style.setProperty('--liberadopdf-fondo', config.presentacion.fondo);
  contenedor.classList.toggle('liberadopdf-cursor-visible', !config.presentacion.ocultarCursor);
  const mostrarCursor = () => {
    contenedor.classList.remove('liberadopdf-sin-cursor');
    clearTimeout(temporizadorCursor);
    if (config.presentacion.ocultarCursor && modoActual() === 'presentacion') {
      temporizadorCursor = setTimeout(() => contenedor.classList.add('liberadopdf-sin-cursor'), CURSOR_MS);
    }
  };
  window.addEventListener('mousemove', mostrarCursor);

  // --- pantalla en negro / blanco ----------------------------------------------
  const quitarPantalla = () => { pantalla?.remove(); pantalla = null; };
  const ponerPantalla = (color) => {
    if (modoActual() !== 'presentacion') return;
    quitarPantalla();
    pantalla = document.createElement('div');
    pantalla.className = 'liberadopdf-pantalla';
    pantalla.style.background = color;
    // pdf.js pasa de página en mousedown sobre window en presentación: se corta aquí, además del click.
    for (const tipo of ['mousedown', 'mouseup', 'click']) {
      pantalla.addEventListener(tipo, (ev) => { ev.preventDefault(); ev.stopPropagation(); if (tipo === 'click') quitarPantalla(); });
    }
    raiz.append(pantalla);
  };
  // Cualquier tecla quita la pantalla y no hace nada más (lo consulta teclas.mjs antes de actuar).
  const interceptor = () => { if (!pantalla) return false; quitarPantalla(); return true; };

  // --- reloj y cronómetro -------------------------------------------------------
  const pintarReloj = () => {
    if (!reloj) return;
    const t = textoReloj(Date.now(), inicio);
    reloj.textContent = `${t.hora} · ${t.transcurrido}`;
  };
  const mostrarReloj = () => {
    if (reloj) return;
    reloj = document.createElement('div');
    reloj.className = 'liberadopdf-reloj';
    raiz.append(reloj);
    pintarReloj();
    temporizadorReloj = setInterval(pintarReloj, 1000);
  };
  const ocultarReloj = () => { clearInterval(temporizadorReloj); reloj?.remove(); reloj = null; };
  const alternarReloj = () => {
    if (modoActual() !== 'presentacion') return;
    relojVisible = !relojVisible;
    if (relojVisible) mostrarReloj(); else ocultarReloj();
  };

  // --- avance automático y bucle ------------------------------------------------
  const detenerAvance = () => { clearInterval(temporizadorAvance); temporizadorAvance = null; };
  const reiniciarAvance = () => {
    detenerAvance();
    const segundos = config.presentacion.avanceSegundos;
    if (modoActual() !== 'presentacion' || !(segundos > 0)) return;
    temporizadorAvance = setInterval(() => {
      const siguiente = siguientePagina(app.page, app.pagesCount, config.presentacion.bucle);
      if (siguiente === null) detenerAvance(); else app.page = siguiente;
    }, segundos * 1000);
  };

  // --- clic y doble clic en presentación -------------------------------------------
  // pdf.js navega en el mousedown de window y registra ese oyente al entrar en presentación; este se registra antes, en
  // el mismo sitio, y se queda con los clics que pdf.js usaría para navegar: un clic navega pasada la espera del doble
  // clic y un doble clic sale de la presentación. Lo que cortan sus capas (video, foco, dibujo, pantalla en negro) no llega.
  let saliendo = false;          // tras el doble clic, hasta que pdf.js suelte la pantalla completa
  let ignorarDobleClicHasta = 0; // el dblclick del mismo gesto no debe volver a entrar en presentación
  let menuContextual = false;    // como en pdf.js: el clic que cierra el menú contextual no navega
  const clics = crearClics({
    esperaMs: DOBLE_CLIC_MS,
    navegar: (atras) => {
      if (modoActual() !== 'presentacion') return;
      if (atras) app.pdfViewer.previousPage(); else app.pdfViewer.nextPage();
    },
    salir: () => {
      saliendo = true;
      ignorarDobleClicHasta = Date.now() + 1000;
      Promise.resolve(document.exitFullscreen?.()).catch(() => { saliendo = false; });
    },
  });
  window.addEventListener('contextmenu', () => { if (modoActual() === 'presentacion') menuContextual = true; });
  window.addEventListener('mousedown', (ev) => {
    if (modoActual() !== 'presentacion' || ev.button !== 0) return;
    if (ev.target.href && ev.target.parentNode?.hasAttribute('data-internal-link')) return; // enlace interno: lo sigue pdf.js
    if (ev.target.closest?.('.mediaAnnotation')) return;
    ev.preventDefault();
    ev.stopImmediatePropagation(); // pdf.js no navega: lo decide liberadoPDF
    if (menuContextual) { menuContextual = false; return; }
    if (saliendo) return; // el tercer clic de un triple no cuenta
    clics.presionar({ detalle: ev.detail, atras: ev.shiftKey });
  });

  // --- entrada y salida del modo ------------------------------------------------
  app.eventBus.on('presentationmodechanged', () => setTimeout(() => {
    clics.cancelar(); // un clic pendiente no navega en el otro modo (p. ej. al salir con Esc)
    saliendo = false;
    menuContextual = false;
    if (modoActual() === 'presentacion') {
      inicio = Date.now();
      if (relojVisible) mostrarReloj();
      mostrarCursor();
      reiniciarAvance();
    } else {
      quitarPantalla();
      ocultarReloj();
      detenerAvance();
      clearTimeout(temporizadorCursor);
      contenedor.classList.remove('liberadopdf-sin-cursor');
    }
  }, 0));

  // Cualquier cambio de página (tecla, clic, rueda) reinicia la cuenta del avance automático.
  app.eventBus.on('pagechanging', () => { if (temporizadorAvance) reiniciarAvance(); });

  // Doble clic en modo ventana: entrar en presentación (no con el dblclick del doble clic que acaba de salir).
  contenedor.addEventListener('dblclick', () => { if (modoActual() === 'ventana' && Date.now() >= ignorarDobleClicHasta) acciones.presentacion(); });

  const actualizarConfig = (nueva) => {
    config = nueva;
    contenedor.style.setProperty('--liberadopdf-fondo', config.presentacion.fondo);
    contenedor.classList.toggle('liberadopdf-cursor-visible', !config.presentacion.ocultarCursor);
    if (modoActual() === 'presentacion') { mostrarCursor(); reiniciarAvance(); }
  };

  return {
    modoActual,
    actualizarConfig,
    interceptor,
    negro: () => ponerPantalla('#000'),
    blanco: () => ponerPantalla('#fff'),
    reloj: alternarReloj,
    reiniciarAvance,
  };
}
