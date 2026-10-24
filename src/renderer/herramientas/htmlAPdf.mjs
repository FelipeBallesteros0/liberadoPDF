// Página web o HTML a PDF: el main carga la página en una ventana oculta y la imprime a PDF (printToPDF).
import { urlPermitida, nombreDeHtml } from '../comun/herramientas/html.mjs';
import { t } from '../i18n.mjs';

export function instalarHtmlAPdf(H) {
  H.registrar('htmlAPdf', () => {
    let archivo = null; // { nombre, url (token) }
    const cuerpo = document.createElement('div');
    cuerpo.className = 'fila';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = t('Archivo HTML (origen archivo)');
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.textContent = t('Elegir archivo HTML…');
    elegir.dataset.accion = 'anadir';
    elegir.addEventListener('click', async () => {
      const [e] = await window.liberadopdf.elegirArchivos({ filtros: 'html', varios: false });
      if (e) { archivo = e; elegir.textContent = e.nombre; }
    });
    cuerpo.append(etiqueta, elegir);
    H.dialogoHerramienta({
      clave: 'htmlAPdf',
      titulo: t('Página web o HTML a PDF'),
      descripcion: t('Las páginas web se cargan con conexión a internet; un archivo HTML local se imprime tal cual. Hasta 30 s.'),
      campos: [
        { clave: 'origen', etiqueta: t('Origen'), tipo: 'opcion', valor: 'url', opciones: [['url', t('Dirección web (http/https)')], ['archivo', t('Archivo HTML')]] },
        { clave: 'url', etiqueta: t('Dirección'), tipo: 'texto', valor: '' },
        { clave: 'tamano', etiqueta: t('Tamaño de página'), tipo: 'opcion', valor: 'A4', opciones: [['A4', t('A4')], ['Letter', t('Carta')]] },
        { clave: 'apaisado', etiqueta: t('Apaisado'), tipo: 'booleano', valor: false },
        { clave: 'fondos', etiqueta: t('Imprimir fondos y colores'), tipo: 'booleano', valor: true },
      ],
      cuerpo,
      alEjecutar: async (v, { progreso, senal }) => {
        let valor;
        if (v.origen === 'url') {
          valor = urlPermitida(v.url);
          if (!valor) return { mensaje: t('Escribe una dirección http:// o https:// válida.') };
        } else {
          if (!archivo) return { mensaje: t('Elige primero un archivo HTML.') };
          valor = archivo.url;
        }
        progreso({ hecho: 0, total: 1, texto: t('Cargando la página…') });
        const r = await window.liberadopdf.htmlAPdf({ origen: v.origen, valor, tamano: v.tamano, apaisado: v.apaisado, fondos: v.fondos });
        if (senal?.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true });
        if (r?.error) return { mensaje: r.error };
        return { nombre: nombreDeHtml(v.origen, v.origen === 'url' ? valor : archivo.nombre, t('página web')), bytes: new Uint8Array(r.bytes), resumen: t('Página convertida') };
      },
    });
  });
}
