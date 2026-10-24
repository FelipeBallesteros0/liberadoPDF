// PDF a imágenes: cada página elegida se pinta con el pdf.js del visor a los ppp pedidos y se guarda como PNG o JPEG.
import { escalaParaPpp } from '../comun/herramientas/imagenes.mjs';
import { nombreImagen } from '../comun/herramientas/nombres.mjs';

export function instalarAImagenes(H) {
  H.registrar('aImagenes', ({ app, ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'aImagenes',
      titulo: 'PDF a imágenes',
      descripcion: 'Se guarda una imagen por página en la carpeta que elijas.',
      campos: [
        { clave: 'formato', etiqueta: 'Formato', tipo: 'opcion', valor: 'png', opciones: [['png', 'PNG'], ['jpeg', 'JPEG']] },
        { clave: 'ppp', etiqueta: 'Resolución (ppp)', tipo: 'numero', valor: 150, minimo: 36, maximo: 600 },
        { clave: 'calidad', etiqueta: 'Calidad JPEG (0–1)', tipo: 'numero', valor: 0.9, minimo: 0.1, maximo: 1, paso: 0.05 },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const archivos = [];
        const extension = v.formato === 'jpeg' ? 'jpg' : 'png';
        for (const [i, n] of v.paginas.entries()) {
          if (senal.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true });
          progreso({ hecho: i, total: v.paginas.length, texto: `Página ${n}…` });
          const page = await app.pdfDocument.getPage(n);
          const viewport = page.getViewport({ scale: escalaParaPpp(v.ppp) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          if (v.formato === 'jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
          await page.render({ canvasContext: ctx, viewport }).promise;
          const blob = await new Promise(res => canvas.toBlob(res, `image/${v.formato}`, v.calidad));
          archivos.push({ nombre: nombreImagen(ruta, n, totalPaginas, extension), bytes: new Uint8Array(await blob.arrayBuffer()) });
          canvas.width = canvas.height = 0;
        }
        return { archivos, resumen: `${archivos.length} imágenes` };
      },
    });
  });
}
