// Vista de presentador: lámina actual y siguiente (API de pdf.js vendored), reloj, cronómetro y notas.
// Sigue a la ventana del visor por IPC («estado») y le reenvía la navegación por teclado.
import { t, idioma } from './i18n.mjs';
import * as pdfjs from '/vendor/pdfjs/build/pdf.mjs';
import { agruparEtiquetas, textoContador } from '/comun/etiquetas.mjs';
import { parsearNotas, notaDe } from '/comun/notas.mjs';
import { textoReloj } from '/comun/presentacion.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.mjs';
const parametros = new URLSearchParams(location.search);
const urlPdf = parametros.get('file');
const ruta = parametros.get('ruta') ?? '';
const api = window.liberadopdf;
document.documentElement.lang = idioma;
document.title = t('Vista de presentador · liberadoPDF');
document.querySelector('.siguiente h2').textContent = t('Siguiente');
document.querySelector('.notas h2').textContent = t('Notas');
document.querySelector('footer').textContent = t('← → PgUp PgDn: navegar · R: reiniciar cronómetro');

const lienzoActual = document.querySelector('.actual canvas');
const lienzoSiguiente = document.querySelector('.siguiente canvas');
const pieActual = document.getElementById('pie-actual');
const pieSiguiente = document.getElementById('pie-siguiente');
const elNota = document.getElementById('nota');
const elHora = document.getElementById('hora');
const elCronometro = document.getElementById('cronometro');

let inicio = Date.now();
const pintarReloj = () => { const t = textoReloj(Date.now(), inicio); elHora.textContent = t.hora; elCronometro.textContent = t.transcurrido; };
pintarReloj();
setInterval(pintarReloj, 1000);

let documento = null;
let grupos = null;
let notas = new Map();
let estado = { pagina: 1, totalPaginas: 0, etiquetas: null };
let renderizando = Promise.resolve();

// Con notasDerecha (pgfpages) cada página es doble: aquí se pinta solo la mitad derecha (las notas).
async function pintarPagina(numero, lienzo, anchoMaximo) {
  if (!documento || numero < 1 || numero > documento.numPages) { lienzo.width = 0; lienzo.height = 0; return; }
  const pagina = await documento.getPage(numero);
  const base = pagina.getViewport({ scale: 1 });
  const mitad = estado.notasDerecha ? 2 : 1;
  const escala = Math.max(0.1, Math.min(anchoMaximo / (base.width / mitad), 2)) * (window.devicePixelRatio || 1);
  const completo = pagina.getViewport({ scale: escala });
  const viewport = mitad === 2 ? pagina.getViewport({ scale: escala, offsetX: -completo.width / 2 }) : completo;
  lienzo.width = Math.round(completo.width / mitad);
  lienzo.height = Math.round(completo.height);
  await pagina.render({ canvasContext: lienzo.getContext('2d'), viewport }).promise;
}

function actualizar() {
  renderizando = renderizando.then(async () => {
    const anchoActual = Math.max(200, lienzoActual.parentElement.clientWidth);
    await pintarPagina(estado.pagina, lienzoActual, anchoActual);
    await pintarPagina(estado.pagina + 1, lienzoSiguiente, 340);
    const posicion = grupos?.posicion(estado.pagina);
    pieActual.textContent = posicion ? textoContador(posicion, grupos, t) : t('página {n} / {total}', { n: estado.pagina, total: estado.totalPaginas });
    const siguiente = grupos?.posicion(estado.pagina + 1);
    pieSiguiente.textContent = estado.pagina + 1 <= estado.totalPaginas ? (siguiente ? textoContador(siguiente, grupos, t) : t('página {n}', { n: estado.pagina + 1 })) : t('fin');
    elNota.textContent = notaDe(notas, posicion ?? { etiqueta: String(estado.pagina), lamina: estado.pagina });
    document.querySelector('.notas').hidden = Boolean(estado.notasDerecha) && !elNota.textContent;
  }).catch(e => { window.liberadopdfError = String(e?.stack ?? e); console.warn('presentador:', e?.message ?? e); });
}

api.alEstado((nuevo) => {
  estado = { ...estado, ...nuevo };
  if (estado.etiquetas !== undefined && estado.totalPaginas) grupos = agruparEtiquetas(estado.etiquetas, estado.totalPaginas);
  actualizar();
});

window.addEventListener('keydown', (ev) => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(ev.key)) { ev.preventDefault(); api.presentadorNavegar(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(ev.key)) { ev.preventDefault(); api.presentadorNavegar(-1); }
  else if (ev.key.toLowerCase() === 'r') { inicio = Date.now(); pintarReloj(); }
});
window.addEventListener('resize', actualizar);

(async () => {
  if (ruta) notas = parsearNotas(await api.leerNotas(ruta).catch(() => ''));
  if (urlPdf) {
    documento = await pdfjs.getDocument({ url: urlPdf }).promise;
    estado.totalPaginas = estado.totalPaginas || documento.numPages;
    if (!grupos) grupos = agruparEtiquetas(await documento.getPageLabels(), documento.numPages);
  }
  actualizar();
  api.presentadorListo();
})();
