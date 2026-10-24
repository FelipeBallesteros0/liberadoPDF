// Modo presentación: fondo, cursor, pantalla en negro/blanco, reloj, avance automático y bucle.
// pdf.js gestiona la pantalla completa; aquí se escucha presentationmodechanged y se añaden las capas.
import { siguientePagina, textoReloj } from '../comun/presentacion.mjs';
import { raizDeCapas } from './capas.mjs';

const CURSOR_MS = 2000;

export function instalarPresentacion({ app, config, acciones }) {
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

  // --- entrada y salida del modo ------------------------------------------------
  app.eventBus.on('presentationmodechanged', () => setTimeout(() => {
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

  // Doble clic en modo ventana: entrar en presentación.
  contenedor.addEventListener('dblclick', () => { if (modoActual() === 'ventana') acciones.presentacion(); });

  return {
    modoActual,
    interceptor,
    negro: () => ponerPantalla('#000'),
    blanco: () => ponerPantalla('#fff'),
    reloj: alternarReloj,
    reiniciarAvance,
  };
}
