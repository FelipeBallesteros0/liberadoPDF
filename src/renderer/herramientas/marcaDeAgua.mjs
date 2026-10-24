// Marca de agua de texto o imagen, centrada o en mosaico, con color, opacidad y ángulo.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

// pdf-lib solo incrusta PNG y JPEG: cualquier otro formato se convierte a PNG con un canvas.
export async function imagenParaPdf(url, tipo) {
  const blob = await (await fetch(url)).blob();
  const mime = tipo || blob.type;
  if (mime === 'image/png' || mime === 'image/jpeg') return { bytes: new Uint8Array(await blob.arrayBuffer()), tipoImagen: mime };
  const mapa = await createImageBitmap(blob);
  const lienzo = new OffscreenCanvas(mapa.width, mapa.height);
  lienzo.getContext('2d').drawImage(mapa, 0, 0);
  const png = await lienzo.convertToBlob({ type: 'image/png' });
  return { bytes: new Uint8Array(await png.arrayBuffer()), tipoImagen: 'image/png' };
}

export function instalarMarcaDeAgua(H) {
  H.registrar('marcaDeAgua', ({ ruta, totalPaginas }) => {
    let imagen = null; // { nombre, url }
    const cuerpo = document.createElement('div');
    cuerpo.className = 'fila';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = 'Imagen (modo imagen)';
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.textContent = 'Elegir imagen…';
    elegir.dataset.accion = 'imagen';
    elegir.addEventListener('click', async () => {
      const [e] = await window.liberadopdf.elegirArchivos({ filtros: 'imagenes', varios: false });
      if (e) { imagen = e; elegir.textContent = e.nombre; }
    });
    cuerpo.append(etiqueta, elegir);
    H.dialogoHerramienta({
      clave: 'marcaDeAgua',
      titulo: 'Marca de agua',
      campos: [
        { clave: 'tipo', etiqueta: 'Tipo', tipo: 'opcion', valor: 'texto', opciones: [['texto', 'Texto'], ['imagen', 'Imagen (PNG, JPG…)']] },
        { clave: 'texto', etiqueta: 'Texto', tipo: 'texto', valor: 'BORRADOR' },
        { clave: 'tamano', etiqueta: 'Tamaño del texto (pt)', tipo: 'numero', valor: 60, minimo: 6, maximo: 400 },
        { clave: 'color', etiqueta: 'Color', tipo: 'color', valor: '#ff0000' },
        { clave: 'escala', etiqueta: 'Ancho de la imagen (fracción de la página)', tipo: 'numero', valor: 0.5, minimo: 0.05, maximo: 1, paso: 0.05 },
        { clave: 'opacidad', etiqueta: 'Opacidad', tipo: 'numero', valor: 0.3, minimo: 0.05, maximo: 1, paso: 0.05 },
        { clave: 'angulo', etiqueta: 'Ángulo (°)', tipo: 'numero', valor: 45, minimo: -180, maximo: 180 },
        { clave: 'mosaico', etiqueta: 'Repetir en mosaico', tipo: 'booleano', valor: false },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        const argumentos = { paginas: v.paginas, tamano: v.tamano, color: v.color, opacidad: v.opacidad, angulo: v.angulo, mosaico: v.mosaico, escala: v.escala };
        if (v.tipo === 'imagen') {
          if (!imagen) return { mensaje: 'Elige primero una imagen.' };
          Object.assign(argumentos, await imagenParaPdf(imagen.url));
        } else {
          if (!v.texto.trim()) return { mensaje: 'Escribe el texto de la marca.' };
          argumentos.texto = v.texto;
        }
        argumentos.bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('marcaDeAgua', argumentos, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'marca de agua'), bytes: salida, resumen: `${v.paginas.length} páginas marcadas` };
      },
    });
  });
}
