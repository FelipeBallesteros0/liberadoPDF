// Puntero láser, foco y dibujo en presentación. Modos excluyentes; la tecla del modo activo lo apaga.
import { raizDeCapas } from './capas.mjs';

const LASER_OCULTAR_MS = 1500;

export function instalarPunteros({ app, modoActual }) {
  const raiz = raizDeCapas();
  let modo = null; // 'laser' | 'foco' | 'dibujo' | null
  let laser = null, foco = null, lienzo = null, ctx = null;
  let temporizadorLaser = null;
  let trazos = []; // Path2D por trazo, para deshacer
  let trazoActual = null;
  let dibujando = false;

  const posicion = (ev) => {
    const r = raiz.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  // --- láser ---------------------------------------------------------------
  const moverLaser = (ev) => {
    if (!laser) return;
    const { x, y } = posicion(ev);
    laser.style.left = `${x}px`;
    laser.style.top = `${y}px`;
    laser.style.opacity = '1';
    clearTimeout(temporizadorLaser);
    temporizadorLaser = setTimeout(() => { if (laser) laser.style.opacity = '0'; }, LASER_OCULTAR_MS);
  };

  // --- foco ----------------------------------------------------------------
  const moverFoco = (ev) => {
    if (!foco) return;
    const { x, y } = posicion(ev);
    foco.style.setProperty('--x', `${x}px`);
    foco.style.setProperty('--y', `${y}px`);
  };

  // --- dibujo --------------------------------------------------------------
  const repintar = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.strokeStyle = '#e02020';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const t of trazos) ctx.stroke(t);
    if (trazoActual) ctx.stroke(trazoActual);
  };
  const empezarTrazo = (ev) => {
    if (modo !== 'dibujo') return;
    ev.preventDefault(); ev.stopPropagation();
    const { x, y } = posicion(ev);
    trazoActual = new Path2D();
    trazoActual.moveTo(x, y);
    trazoActual.lineTo(x + 0.1, y + 0.1);
    dibujando = true;
    repintar();
  };
  const seguirTrazo = (ev) => {
    if (!dibujando || !trazoActual) return;
    const { x, y } = posicion(ev);
    trazoActual.lineTo(x, y);
    repintar();
  };
  const terminarTrazo = (ev) => {
    if (!dibujando) return;
    ev?.preventDefault?.(); ev?.stopPropagation?.();
    dibujando = false;
    if (trazoActual) trazos.push(trazoActual);
    trazoActual = null;
    repintar();
  };
  const limpiar = () => { trazos = []; trazoActual = null; repintar(); };
  const deshacer = () => { trazos.pop(); repintar(); };

  // --- activar / desactivar ---------------------------------------------------
  const desactivarTodo = () => {
    laser?.remove(); laser = null; clearTimeout(temporizadorLaser);
    foco?.remove(); foco = null;
    if (lienzo) { lienzo.remove(); lienzo = null; ctx = null; }
    trazos = []; trazoActual = null; dibujando = false;
    window.removeEventListener('mousemove', moverLaser);
    window.removeEventListener('mousemove', moverFoco);
    modo = null;
  };
  // Mientras un modo está activo, el clic no pasa a pdf.js (no avanza de página).
  const bloquearClics = (capa) => {
    for (const tipo of ['mousedown', 'mouseup', 'click']) capa.addEventListener(tipo, (ev) => { ev.stopPropagation(); if (tipo !== 'click') ev.preventDefault(); });
  };
  const activar = (nuevo) => {
    if (modoActual() !== 'presentacion') return;
    const apagar = modo === nuevo;
    desactivarTodo();
    if (apagar) return;
    modo = nuevo;
    if (nuevo === 'laser') {
      laser = document.createElement('div');
      laser.className = 'liberadopdf-laser';
      raiz.append(laser);
      window.addEventListener('mousemove', moverLaser);
    } else if (nuevo === 'foco') {
      foco = document.createElement('div');
      foco.className = 'liberadopdf-foco';
      foco.style.setProperty('--x', '50%');
      foco.style.setProperty('--y', '50%');
      bloquearClics(foco);
      raiz.append(foco);
      window.addEventListener('mousemove', moverFoco);
    } else if (nuevo === 'dibujo') {
      lienzo = document.createElement('canvas');
      lienzo.className = 'liberadopdf-dibujo';
      const r = raiz.getBoundingClientRect();
      lienzo.width = Math.round(r.width);
      lienzo.height = Math.round(r.height);
      ctx = lienzo.getContext('2d');
      lienzo.addEventListener('mousedown', empezarTrazo);
      lienzo.addEventListener('mousemove', seguirTrazo);
      lienzo.addEventListener('mouseup', terminarTrazo);
      lienzo.addEventListener('mouseleave', terminarTrazo);
      lienzo.addEventListener('click', (ev) => ev.stopPropagation());
      raiz.append(lienzo);
    }
  };

  app.eventBus.on('pagechanging', () => { if (modo === 'dibujo') limpiar(); });
  app.eventBus.on('presentationmodechanged', () => setTimeout(() => { if (modoActual() !== 'presentacion') desactivarTodo(); }, 0));

  return {
    laser: () => activar('laser'),
    foco: () => activar('foco'),
    dibujo: () => activar('dibujo'),
    limpiar,
    deshacer,
    desactivarTodo,
    modo: () => modo,
  };
}
