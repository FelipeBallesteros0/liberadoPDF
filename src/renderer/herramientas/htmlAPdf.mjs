// Página web o HTML a PDF: el main carga la página en una ventana oculta y la imprime a PDF (printToPDF).
import { urlPermitida, nombreDeHtml } from '../comun/herramientas/html.mjs';

export function instalarHtmlAPdf(H) {
  H.registrar('htmlAPdf', () => {
    let archivo = null; // { nombre, url (token) }
    const cuerpo = document.createElement('div');
    cuerpo.className = 'fila';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = 'Archivo HTML (origen archivo)';
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.textContent = 'Elegir archivo HTML…';
    elegir.dataset.accion = 'anadir';
    elegir.addEventListener('click', async () => {
      const [e] = await window.liberadopdf.elegirArchivos({ filtros: 'html', varios: false });
      if (e) { archivo = e; elegir.textContent = e.nombre; }
    });
    cuerpo.append(etiqueta, elegir);
    H.dialogoHerramienta({
      clave: 'htmlAPdf',
      titulo: 'Página web o HTML a PDF',
      descripcion: 'Las páginas web se cargan con conexión a internet; un archivo HTML local se imprime tal cual. Hasta 30 s.',
      campos: [
        { clave: 'origen', etiqueta: 'Origen', tipo: 'opcion', valor: 'url', opciones: [['url', 'Dirección web (http/https)'], ['archivo', 'Archivo HTML']] },
        { clave: 'url', etiqueta: 'Dirección', tipo: 'texto', valor: '' },
        { clave: 'tamano', etiqueta: 'Tamaño de página', tipo: 'opcion', valor: 'A4', opciones: [['A4', 'A4'], ['Letter', 'Carta']] },
        { clave: 'apaisado', etiqueta: 'Apaisado', tipo: 'booleano', valor: false },
        { clave: 'fondos', etiqueta: 'Imprimir fondos y colores', tipo: 'booleano', valor: true },
      ],
      cuerpo,
      alEjecutar: async (v, { progreso }) => {
        let valor;
        if (v.origen === 'url') {
          valor = urlPermitida(v.url);
          if (!valor) return { mensaje: 'Escribe una dirección http:// o https:// válida.' };
        } else {
          if (!archivo) return { mensaje: 'Elige primero un archivo HTML.' };
          valor = archivo.url;
        }
        progreso({ hecho: 0, total: 1, texto: 'Cargando la página…' });
        const r = await window.liberadopdf.htmlAPdf({ origen: v.origen, valor, tamano: v.tamano, apaisado: v.apaisado, fondos: v.fondos });
        if (r?.error) return { mensaje: r.error };
        return { nombre: nombreDeHtml(v.origen, v.origen === 'url' ? valor : archivo.nombre), bytes: new Uint8Array(r.bytes), resumen: 'Página convertida' };
      },
    });
  });
}
