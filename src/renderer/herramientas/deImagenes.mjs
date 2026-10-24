// Imágenes a PDF: una página por imagen; PNG y JPEG se incrustan tal cual, el resto se vuelve a codificar como PNG.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { tipoPorBytes, orientacionExif } from '../comun/herramientas/imagenes.mjs';

// Decodifica la imagen para validarla y medirla; devuelve null si no es una imagen legible. El formato se decide por
// los bytes (una PNG llamada .jpg es PNG); un JPEG con orientación EXIF distinta de 1 se pasa por canvas ya girado.
export async function prepararImagen(url, nombre) {
  try {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const tipo = tipoPorBytes(bytes);
    const blob = new Blob([bytes], { type: tipo ?? 'application/octet-stream' });
    const mapa = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const medidas = { ancho: mapa.width, alto: mapa.height };
    const talCual = tipo === 'image/png' || (tipo === 'image/jpeg' && orientacionExif(bytes) === 1);
    if (talCual) { mapa.close(); return { nombre, tipo, bytes, ...medidas }; }
    const lienzo = new OffscreenCanvas(mapa.width, mapa.height);
    lienzo.getContext('2d').drawImage(mapa, 0, 0);
    mapa.close();
    const salida = tipo === 'image/jpeg' ? await lienzo.convertToBlob({ type: 'image/jpeg', quality: 0.92 }) : await lienzo.convertToBlob({ type: 'image/png' });
    return { nombre, tipo: salida.type, bytes: new Uint8Array(await salida.arrayBuffer()), ...medidas };
  } catch {
    return null;
  }
}

export function instalarDeImagenes(H) {
  H.registrar('deImagenes', ({ ruta }) => {
    const imagenes = []; // { nombre, tipo, bytes, ancho, alto } o { nombre, error }
    const cuerpo = document.createElement('div');
    const lista = document.createElement('div');
    lista.className = 'lista';
    const botones = document.createElement('div');
    botones.className = 'botones';
    const anadir = document.createElement('button');
    anadir.type = 'button';
    anadir.textContent = 'Añadir imágenes…';
    anadir.dataset.accion = 'anadir';
    botones.append(anadir);
    cuerpo.append(lista, botones);
    const pintar = () => {
      lista.replaceChildren(...imagenes.map((img, i) => {
        const fila = document.createElement('div');
        fila.className = 'elemento' + (img.error ? ' omitida' : '');
        const texto = document.createElement('span');
        texto.textContent = img.error ? `${img.nombre} — ${img.error}` : `${i + 1}. ${img.nombre} (${img.ancho}×${img.alto})`;
        const quitar = document.createElement('button'); quitar.type = 'button'; quitar.textContent = '✕'; quitar.title = 'Quitar';
        quitar.addEventListener('click', () => { imagenes.splice(i, 1); pintar(); });
        fila.append(texto, quitar);
        return fila;
      }));
    };
    anadir.addEventListener('click', async () => {
      const elegidas = await window.liberadopdf.elegirArchivos({ filtros: 'imagenes', varios: true });
      for (const e of elegidas) {
        const img = await prepararImagen(e.url, e.nombre);
        imagenes.push(img ?? { nombre: e.nombre, error: 'no se pudo leer como imagen, se omite' });
      }
      pintar();
    });
    H.dialogoHerramienta({
      clave: 'deImagenes',
      titulo: 'Imágenes a PDF',
      descripcion: 'Una página por imagen, en este orden.',
      campos: [
        { clave: 'tamano', etiqueta: 'Tamaño de página', tipo: 'opcion', valor: 'A4', opciones: [['A4', 'A4'], ['Carta', 'Carta'], ['imagen', 'El de cada imagen']] },
        { clave: 'orientacion', etiqueta: 'Orientación', tipo: 'opcion', valor: 'auto', opciones: [['auto', 'Según la imagen'], ['vertical', 'Vertical'], ['horizontal', 'Horizontal']] },
        { clave: 'margen', etiqueta: 'Margen (pt)', tipo: 'numero', valor: 20, minimo: 0, maximo: 200 },
      ],
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        const validas = imagenes.filter(i => !i.error);
        if (!validas.length) return { mensaje: 'Añade al menos una imagen legible.' };
        const r = await H.ejecutar('deImagenes', { imagenes: validas.map(i => ({ bytes: i.bytes, tipo: i.tipo })), tamano: v.tamano, orientacion: v.orientacion, margen: v.margen }, { senal, alProgreso: progreso });
        const omitidas = imagenes.length - validas.length + r.omitidas;
        return { nombre: nombreResultado(ruta || validas[0].nombre, 'imágenes'), bytes: r.bytes, resumen: `${r.paginas} páginas${omitidas ? `, ${omitidas} archivos omitidos` : ''}` };
      },
    });
  });
}
