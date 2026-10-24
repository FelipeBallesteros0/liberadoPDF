// Organizar páginas: rejilla de miniaturas con arrastre, rotar, borrar, duplicar e insertar en blanco.
import { estadoInicial, mover, rotarPagina, borrar, insertarBlanco, duplicar, planDeOrganizacion } from '../comun/herramientas/organizar.mjs';
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { crearMiniaturas } from '../miniaturas.mjs';
import { t } from '../i18n.mjs';

export function instalarOrganizar(H) {
  H.registrar('organizar', ({ app, ruta, totalPaginas }) => {
    let estado = estadoInicial(totalPaginas);
    const miniaturas = crearMiniaturas({ app, ancho: 120 });
    const cuerpo = document.createElement('div');
    const rejilla = document.createElement('div');
    rejilla.className = 'rejilla-organizar';
    const botones = document.createElement('div');
    botones.className = 'botones';
    const blanco = document.createElement('button');
    blanco.type = 'button';
    blanco.textContent = t('Insertar página en blanco al final');
    blanco.dataset.accion = 'blanco';
    blanco.addEventListener('click', () => { estado = insertarBlanco(estado, estado.length); pintar(); });
    botones.append(blanco);
    cuerpo.append(rejilla, botones);

    let arrastrando = null;
    const pintar = () => {
      rejilla.replaceChildren(...estado.map((p, i) => {
        const celda = document.createElement('div');
        celda.className = 'celda';
        celda.draggable = true;
        celda.dataset.indice = String(i);
        celda.addEventListener('dragstart', (ev) => { arrastrando = i; ev.dataTransfer.effectAllowed = 'move'; });
        celda.addEventListener('dragover', (ev) => { ev.preventDefault(); celda.classList.add('destino'); });
        celda.addEventListener('dragleave', () => celda.classList.remove('destino'));
        celda.addEventListener('drop', (ev) => { ev.preventDefault(); if (arrastrando !== null) { estado = mover(estado, arrastrando, i); arrastrando = null; pintar(); } });
        const marco = document.createElement('div');
        marco.className = 'marco';
        marco.style.transform = `rotate(${p.rotacion}deg)`;
        if (p.origen === null) { marco.classList.add('blanco'); marco.textContent = t('en blanco'); }
        else miniaturas.obtener(p.origen).then(canvas => { const img = new Image(); img.src = canvas.toDataURL(); marco.append(img); }).catch(() => {});
        const pie = document.createElement('div');
        pie.className = 'pie-celda';
        const etiqueta = document.createElement('span');
        etiqueta.textContent = p.origen === null ? t('{i} (blanco)', { i: i + 1 }) : t('{i} ← pág. {origen}', { i: i + 1, origen: p.origen });
        const b = (texto, titulo, accion, fn) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = texto; x.title = titulo; x.dataset.accion = accion; x.addEventListener('click', fn); return x; };
        pie.append(etiqueta,
          b('↻', t('Rotar 90°'), 'rotar', () => { estado = rotarPagina(estado, i); pintar(); }),
          b('⧉', t('Duplicar'), 'duplicar', () => { estado = duplicar(estado, i); pintar(); }),
          b('✕', t('Quitar'), 'quitar', () => { estado = borrar(estado, i); pintar(); }));
        celda.append(marco, pie);
        return celda;
      }));
    };
    pintar();

    H.dialogoHerramienta({
      clave: 'organizar',
      titulo: t('Organizar páginas'),
      descripcion: t('Arrastra las páginas para reordenarlas. El resultado se guarda como un PDF nuevo.'),
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        if (estado.length === 0) return { mensaje: t('No queda ninguna página.') };
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('organizar', { bytes, plan: planDeOrganizacion(estado) }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('organizado')), bytes: salida, resumen: t('{n} páginas', { n: estado.length }) };
      },
    });
  });
}
