// Herramienta de medición (modo ventana): distancia (dos clics), área (clics, doble clic cierra) y calibración.
// Dibuja en un SVG sobre la página; nada se escribe en el PDF. Esc borra y sale.
import { puntosAPdf, distanciaPdf, areaPoligonoPdf, aUnidad, formatear, factorDeCalibracion, escalaEfectiva } from '../comun/medicion.mjs';
import { raizDeCapas } from './capas.mjs';
import { t } from './i18n.mjs';

const NS = 'http://www.w3.org/2000/svg';

export function instalarMedicion({ app, obtenerConfig, guardarPorDocumento, ruta }) {
  const contenedor = document.getElementById('viewerContainer');
  let modo = null; // 'distancia' | 'area' | 'calibrar'
  let svg = null;
  let pagina = null;    // número de página sobre la que se mide
  let puntos = [];      // en píxeles CSS relativos a la página
  let cerrado = false;  // área: el polígono ya se cerró con doble clic
  let userUnit = 1;

  const factor = () => obtenerConfig().porDocumento?.[ruta]?.calibracion ?? 1;
  const unidad = () => obtenerConfig().unidadMedida || 'mm';
  const viewportDe = (n) => {
    const vista = app.pdfViewer.getPageView(n - 1);
    const v = vista?.viewport;
    return v ? { escala: escalaEfectiva(v.scale, vista.pdfPage?.userUnit), rotacion: v.rotation, ancho: v.width, alto: v.height } : null;
  };

  const limpiar = () => { svg?.remove(); svg = null; puntos = []; pagina = null; cerrado = false; };
  const salir = () => { limpiar(); modo = null; contenedor.classList.remove('liberadopdf-midiendo'); };

  const asegurarSvg = (divPagina) => {
    if (svg && svg.parentElement === divPagina) return svg;
    svg?.remove();
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'liberadopdf-medicion');
    divPagina.append(svg);
    return svg;
  };
  const elemento = (tipo, atributos) => {
    const el = document.createElementNS(NS, tipo);
    for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
    return el;
  };
  const etiqueta = (x, y, texto) => {
    const t = elemento('text', { x, y, class: 'etiqueta' });
    t.textContent = texto;
    svg.append(t);
    const caja = t.getBBox();
    const fondo = elemento('rect', { x: caja.x - 4, y: caja.y - 2, width: caja.width + 8, height: caja.height + 4, rx: 3, class: 'fondo' });
    svg.insertBefore(fondo, t);
  };
  const pintar = () => {
    if (!svg) return;
    svg.replaceChildren();
    const vp = viewportDe(pagina);
    if (!vp) return;
    const enPdf = puntos.map(p => puntosAPdf(p, vp));
    if (modo === 'area' && puntos.length > 1) {
      svg.append(elemento('polygon', { points: puntos.map(p => `${p.x},${p.y}`).join(' '), class: 'poligono' }));
    }
    for (let i = 1; i < puntos.length; i++) {
      svg.append(elemento('line', { x1: puntos[i - 1].x, y1: puntos[i - 1].y, x2: puntos[i].x, y2: puntos[i].y, class: 'linea' }));
    }
    for (const p of puntos) svg.append(elemento('circle', { cx: p.x, cy: p.y, r: 4, class: 'punto' }));
    if ((modo === 'distancia' || modo === 'calibrar') && puntos.length === 2) {
      const d = aUnidad(distanciaPdf(enPdf[0], enPdf[1]), unidad(), userUnit, { factor: factor() });
      etiqueta((puntos[0].x + puntos[1].x) / 2 + 8, (puntos[0].y + puntos[1].y) / 2 - 8, formatear(d, unidad()));
    }
    if (modo === 'area' && puntos.length >= 3) {
      const a = aUnidad(areaPoligonoPdf(enPdf), unidad(), userUnit, { factor: factor(), potencia: 2 });
      const cx = puntos.reduce((s, p) => s + p.x, 0) / puntos.length;
      const cy = puntos.reduce((s, p) => s + p.y, 0) / puntos.length;
      etiqueta(cx, cy, formatear(a, unidad(), 2));
    }
  };

  // Caja propia para pedir la longitud real (Electron no admite prompt()).
  const pedirLongitud = (medidaPt) => {
    const capa = document.createElement('div');
    capa.className = 'liberadopdf-dialogo liberadopdf-calibrar';
    const caja = document.createElement('div');
    caja.className = 'caja';
    const titulo = document.createElement('h2');
    titulo.textContent = t('Calibrar escala');
    const texto = document.createElement('p');
    texto.textContent = t('El segmento mide {medida} según el PDF. ¿Cuánto mide en realidad ({unidad})?', { medida: formatear(aUnidad(medidaPt, unidad(), userUnit), unidad()), unidad: unidad() });
    const entrada = document.createElement('input');
    entrada.type = 'number';
    entrada.step = 'any';
    entrada.min = '0';
    const pie = document.createElement('div');
    pie.className = 'pie';
    const cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.textContent = t('Cancelar');
    const aceptar = document.createElement('button'); aceptar.type = 'button'; aceptar.textContent = t('Aceptar');
    pie.append(cancelar, aceptar);
    caja.append(titulo, texto, entrada, pie);
    capa.append(caja);
    const cerrar = () => { capa.remove(); salir(); };
    cancelar.addEventListener('click', cerrar);
    aceptar.addEventListener('click', () => {
      const real = Number(entrada.value);
      if (real > 0) {
        const nuevoFactor = factorDeCalibracion(medidaPt, real, unidad(), userUnit);
        guardarPorDocumento({ calibracion: nuevoFactor });
      }
      cerrar();
    });
    capa.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') aceptar.click(); if (ev.key === 'Escape') cerrar(); });
    raizDeCapas().append(capa);
    entrada.focus();
  };

  const alPulsar = async (ev) => {
    if (!modo) return;
    const divPagina = ev.target.closest?.('.page');
    if (!divPagina) return;
    ev.preventDefault(); ev.stopPropagation();
    const n = Number(divPagina.dataset.pageNumber);
    if (pagina !== n) { limpiar(); pagina = n; userUnit = (await app.pdfDocument.getPage(n)).userUnit || 1; }
    asegurarSvg(divPagina);
    const r = divPagina.getBoundingClientRect();
    const punto = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    if (modo === 'area' && ev.detail >= 2) { cerrado = true; pintar(); return; } // doble clic: cierra el polígono (el vértice ya se añadió en el primer clic)
    if (modo === 'area' && cerrado) { puntos = []; cerrado = false; } // el siguiente clic empieza otro polígono
    if ((modo === 'distancia' || modo === 'calibrar') && puntos.length >= 2) puntos = [];
    puntos.push(punto);
    pintar();
    if (modo === 'calibrar' && puntos.length === 2) {
      const vp = viewportDe(pagina);
      const [a, b] = puntos.map(p => puntosAPdf(p, vp));
      pedirLongitud(distanciaPdf(a, b));
    }
  };
  const alTecla = (ev) => { if (modo && ev.key === 'Escape') { ev.stopImmediatePropagation(); salir(); } };

  contenedor.addEventListener('mousedown', alPulsar, true);
  contenedor.addEventListener('dblclick', (ev) => { if (modo) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  window.addEventListener('keydown', alTecla, true);
  for (const evento of ['pagechanging', 'scalechanging', 'rotationchanging']) app.eventBus.on(evento, limpiar);

  const activar = (nuevo) => { limpiar(); modo = nuevo; contenedor.classList.add('liberadopdf-midiendo'); };
  return {
    distancia: () => activar('distancia'),
    area: () => activar('area'),
    calibrar: () => activar('calibrar'),
    cancelar: salir,
    modo: () => modo,
  };
}
