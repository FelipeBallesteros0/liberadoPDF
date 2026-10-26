// Personalización de la barra de pdf.js sin tocar pdf.js: mueve botones entre la barra principal y el
// menú «»» (secondaryToolbar) y oculta los que el usuario no quiera. Los botones conservan sus
// manejadores porque solo cambian de sitio en el DOM.
import { decidirBarra, alternarBarra } from '../comun/barra.mjs';
import { raizDeDialogos } from './capas.mjs';
import { t } from './i18n.mjs';

const ID_GRUPO = 'liberadopdfBotones';
const ID_PERSONALIZAR = 'liberadopdfPersonalizarBarra';
const NO_PERSONALIZABLES = new Set(['secondaryToolbarToggleButton', 'viewsManagerSelectorButton', 'viewsManagerAddFileButton', 'secondaryOpenFile', ID_PERSONALIZAR]);

function unidadDe(boton) {
  // En la barra principal cada botón suele venir envuelto en .toolbarButtonWithContainer (botón + panel).
  const contenedor = boton.parentElement;
  return contenedor?.classList.contains('toolbarButtonWithContainer') ? contenedor : boton;
}

function etiquetaDe(boton) {
  return boton.querySelector('span')?.textContent?.trim() || boton.title || boton.getAttribute('aria-label') || boton.id;
}

export function instalarBarra({ config, guardar, app }) {
  const derecha = document.getElementById('toolbarViewerRight');
  const secundaria = document.getElementById('secondaryToolbarButtonContainer');
  const alternador = document.getElementById('secondaryToolbarToggleButton');
  if (!derecha || !secundaria || !alternador) return { abrirDialogo() {} };

  let barra = { ...config.barra };

  // Grupo propio en la barra principal, justo antes del botón «»».
  const grupo = document.createElement('div');
  grupo.id = ID_GRUPO;
  grupo.className = 'toolbarHorizontalGroup';
  derecha.insertBefore(grupo, unidadDe(alternador));

  // Orden original del menú para poder devolver botones a su sitio.
  const ordenSecundaria = [...secundaria.children];

  const botonesPrincipales = () => [...document.querySelectorAll('#toolbarViewerLeft button.toolbarButton, #toolbarViewerMiddle button.toolbarButton, #toolbarViewerRight button.toolbarButton')]
    .filter(b => b.id && !NO_PERSONALIZABLES.has(b.id) && !grupo.contains(b) && !b.closest('.menuContainer, .editorParamsToolbar'));
  const botonesSecundarios = () => [...ordenSecundaria, ...grupo.children]
    .filter(e => e.tagName === 'BUTTON' && e.id && !NO_PERSONALIZABLES.has(e.id));

  const catalogo = () => [
    ...botonesPrincipales().map(b => ({ id: b.id, origen: 'principal', elemento: b })),
    ...botonesSecundarios().map(b => ({ id: b.id, origen: 'secundaria', elemento: b })),
  ];

  const moverABarra = (boton) => {
    if (grupo.contains(boton)) return;
    // El icono de pdf.js solo está definido dentro del menú: se copia antes de mover el botón.
    const icono = getComputedStyle(boton, '::before').maskImage;
    boton.style.setProperty('--liberadopdf-icono', icono);
    boton.classList.remove('labeled');
    boton.classList.add('liberadopdf-movido');
    boton.title = etiquetaDe(boton);
    grupo.append(boton);
  };
  const devolverAlMenu = (boton) => {
    if (secundaria.contains(boton)) return;
    boton.classList.add('labeled');
    boton.classList.remove('liberadopdf-movido');
    boton.style.removeProperty('--liberadopdf-icono');
    const indice = ordenSecundaria.indexOf(boton);
    const siguiente = ordenSecundaria.slice(indice + 1).find(n => secundaria.contains(n));
    siguiente ? secundaria.insertBefore(boton, siguiente) : secundaria.append(boton);
  };

  const aplicar = () => {
    const cat = catalogo();
    const elementos = new Map(cat.map(f => [f.id, f.elemento]));
    for (const { id, origen, enBarra } of decidirBarra(cat, barra)) {
      const elemento = elementos.get(id);
      if (!elemento) continue;
      if (origen === 'principal') unidadDe(elemento).classList.toggle('liberadopdf-oculto', !enBarra);
      else if (enBarra) moverABarra(elemento);
      else devolverAlMenu(elemento);
    }
  };

  // Entrada «Personalizar barra…» al final del menú «»».
  const personalizar = document.createElement('button');
  personalizar.id = ID_PERSONALIZAR;
  personalizar.type = 'button';
  personalizar.className = 'toolbarButton labeled';
  const etiqueta = document.createElement('span');
  etiqueta.textContent = t('Personalizar barra…');
  personalizar.append(etiqueta);
  personalizar.addEventListener('click', () => { app?.secondaryToolbar?.close?.(); abrirDialogo(); });
  secundaria.append(personalizar);

  let dialogo = null;
  const cerrarDialogo = () => { dialogo?.remove(); dialogo = null; };
  const abrirDialogo = () => {
    if (dialogo) return;
    dialogo = document.createElement('div');
    dialogo.className = 'liberadopdf-barra-dialogo';
    const caja = document.createElement('div');
    caja.className = 'caja';
    const titulo = document.createElement('h2');
    titulo.textContent = t('Personalizar la barra');
    const ayuda = document.createElement('p');
    ayuda.textContent = t('Marca lo que quieres ver en la barra principal. Lo desmarcado del menú «»» se queda en el menú; lo desmarcado de la barra se oculta.');
    caja.append(titulo, ayuda);
    const secciones = [[t('Barra principal'), 'principal'], [t('Menú »'), 'secundaria']];
    const cat = catalogo();
    const elementos = new Map(cat.map(f => [f.id, f.elemento]));
    const plan = decidirBarra(cat, barra).map(f => ({ ...f, elemento: elementos.get(f.id) }));
    for (const [nombre, origen] of secciones) {
      const h3 = document.createElement('h3');
      h3.textContent = t(nombre);
      const lista = document.createElement('div');
      lista.className = 'lista';
      for (const fila of plan.filter(f => f.origen === origen)) {
        if (fila.elemento.hidden || fila.elemento.classList.contains('hidden')) continue; // pdf.js lo tiene oculto
        const label = document.createElement('label');
        const casilla = document.createElement('input');
        casilla.type = 'checkbox';
        casilla.checked = fila.enBarra;
        casilla.addEventListener('change', () => {
          barra = alternarBarra(barra, fila.id, casilla.checked);
          aplicar();
          guardar({ barra });
        });
        label.append(casilla, document.createTextNode(' ' + etiquetaDe(fila.elemento)));
        lista.append(label);
      }
      caja.append(h3, lista);
    }
    const pie = document.createElement('div');
    pie.className = 'pie';
    const restablecer = document.createElement('button');
    restablecer.type = 'button';
    restablecer.textContent = t('Restablecer');
    restablecer.addEventListener('click', () => { barra = { presentationMode: true }; aplicar(); guardar({ barra }); cerrarDialogo(); abrirDialogo(); });
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.textContent = t('Cerrar');
    cerrar.addEventListener('click', cerrarDialogo);
    pie.append(restablecer, cerrar);
    caja.append(pie);
    dialogo.append(caja);
    dialogo.addEventListener('click', (ev) => { if (ev.target === dialogo) cerrarDialogo(); });
    dialogo.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrarDialogo(); } });
    raizDeDialogos().append(dialogo);
    caja.querySelector('input')?.focus();
  };

  // Los «abrir archivo» de pdf.js cargan otro documento en la misma página, al margen de recientes y título.
  for (const id of ['secondaryOpenFile', 'viewsManagerAddFileButton']) {
    const boton = document.getElementById(id);
    if (boton) unidadDe(boton).classList.add('liberadopdf-oculto');
  }
  aplicar();
  return { abrirDialogo, aplicar };
}
