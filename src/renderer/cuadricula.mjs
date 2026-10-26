// Cuadrícula de láminas (G / Tab): rejilla de miniaturas para saltar a una página; teclado y ratón.
import { moverSeleccion } from '../comun/cuadricula.mjs';
import { raizDeDialogos } from './capas.mjs';
import { t } from './i18n.mjs';

export function instalarCuadricula({ app, miniaturas, obtenerGrupos }) {
  let capa = null;
  let celdas = [];
  let seleccion = 0;

  const columnas = () => {
    if (celdas.length < 2) return 1;
    const y0 = celdas[0].getBoundingClientRect().top;
    const n = celdas.findIndex((c, i) => i > 0 && c.getBoundingClientRect().top > y0 + 1);
    return n === -1 ? celdas.length : n;
  };
  const marcar = () => {
    celdas.forEach((c, i) => c.classList.toggle('seleccionada', i === seleccion));
    celdas[seleccion]?.scrollIntoView({ block: 'nearest' });
  };
  const cerrar = () => { capa?.remove(); capa = null; celdas = []; };
  const ir = (pagina) => { cerrar(); app.page = pagina; };

  const abrir = () => {
    if (capa || !app.pdfDocument) return;
    capa = document.createElement('div');
    capa.className = 'liberadopdf-cuadricula';
    const rejilla = document.createElement('div');
    rejilla.className = 'rejilla';
    const grupos = obtenerGrupos();
    celdas = [];
    for (let n = 1; n <= app.pagesCount; n++) {
      const celda = document.createElement('div');
      celda.className = 'celda' + (n === app.page ? ' actual' : '');
      const marco = document.createElement('div');
      marco.className = 'marco';
      const pie = document.createElement('div');
      pie.className = 'pie';
      const p = grupos?.posicion(n);
      pie.textContent = p ? `${t('lámina {n}', { n: p.etiqueta })}${p.pasos > 1 ? ` · ${t('paso {a}', { a: p.paso })}` : ''}` : t('página {n}', { n });
      celda.append(marco, pie);
      celda.addEventListener('click', () => ir(n));
      rejilla.append(celda);
      celdas.push(celda);
      miniaturas.obtener(n).then(c => marco.append(c)).catch(() => {});
    }
    capa.append(rejilla);
    capa.addEventListener('click', (ev) => { if (ev.target === capa) cerrar(); });
    raizDeDialogos().append(capa);
    seleccion = app.page - 1;
    marcar();
  };
  const alternar = () => (capa ? cerrar() : abrir());

  // Mientras está abierta, consume las teclas (lo consulta teclas.mjs antes de actuar).
  const interceptor = (ev) => {
    if (!capa) return false;
    const k = ev.key;
    if (k === 'Escape' || k === 'Tab' || k.toLowerCase() === 'g') { cerrar(); return true; }
    if (k === 'Enter' || k === ' ') { ir(seleccion + 1); return true; }
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(k)) {
      seleccion = moverSeleccion(seleccion, celdas.length, columnas(), k);
      marcar();
      return true;
    }
    return true; // cualquier otra tecla no llega a pdf.js con la cuadrícula abierta
  };

  app.eventBus.on('presentationmodechanged', cerrar);
  return { abrir, cerrar, alternar, interceptor, abierta: () => Boolean(capa) };
}
