// Comprimir: las imágenes grandes se vuelven a codificar como JPEG (reducidas según la calidad) y qpdf recomprime la
// estructura. Si el resultado no es claramente menor, no se guarda nada.
import { decidirImagen, informe } from '../comun/herramientas/comprimir.mjs';
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

const cancelacion = () => Object.assign(new Error('Cancelado'), { cancelado: true });

// Decodifica la imagen tal como viene del PDF: JPEG por el navegador, Flate reconstruyendo un ImageData.
async function mapaDeBits(img) {
  if (img.filtro === 'DCTDecode') return createImageBitmap(new Blob([img.bytes], { type: 'image/jpeg' }));
  const n = img.ancho * img.alto;
  const rgba = new Uint8ClampedArray(n * 4);
  const canales = img.espacioColor === 'DeviceGray' ? 1 : 3;
  if (img.bytes.length < n * canales) throw new Error('datos de imagen incompletos');
  for (let i = 0; i < n; i++) {
    const o = i * canales;
    rgba[i * 4] = img.bytes[o]; rgba[i * 4 + 1] = img.bytes[canales === 1 ? o : o + 1]; rgba[i * 4 + 2] = img.bytes[canales === 1 ? o : o + 2]; rgba[i * 4 + 3] = 255;
  }
  return createImageBitmap(new ImageData(rgba, img.ancho, img.alto));
}

export async function recodificarImagenes(imagenes, calidad, { senal, progreso }) {
  const reemplazos = [];
  for (const [i, img] of imagenes.entries()) {
    if (senal?.aborted) throw cancelacion();
    progreso({ hecho: i, total: imagenes.length, texto: `Imagen ${i + 1} de ${imagenes.length} (${img.ancho}×${img.alto})…` });
    const decision = decidirImagen(img, calidad);
    if (!decision.recodificar) continue;
    let mapa;
    try { mapa = await mapaDeBits(img); } catch { continue; } // una imagen rara se deja como está
    const lienzo = new OffscreenCanvas(decision.anchoNuevo, decision.altoNuevo);
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
    mapa.close();
    const jpeg = new Uint8Array(await (await lienzo.convertToBlob({ type: 'image/jpeg', quality: decision.jpeg })).arrayBuffer());
    if (senal?.aborted) throw cancelacion();
    if (jpeg.length < img.bytes.length) reemplazos.push({ objeto: img.objeto, generacion: img.generacion, jpeg, ancho: lienzo.width, alto: lienzo.height });
  }
  return reemplazos;
}

export function instalarComprimir(H) {
  H.registrar('comprimir', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'comprimir',
      titulo: 'Comprimir',
      descripcion: 'Reduce las fotos (JPEG) y recomprime la estructura con qpdf. El texto y los dibujos no cambian. Si no se consigue reducir, no se guarda nada.',
      campos: [
        { clave: 'calidad', etiqueta: 'Calidad de las imágenes', tipo: 'opcion', valor: 'media', opciones: [['alta', 'Alta (mismo tamaño, JPEG 85 %)'], ['media', 'Media (70 % del tamaño, JPEG 70 %)'], ['baja', 'Baja (mitad del tamaño, JPEG 50 %)']] },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = await H.bytesDelDocumento();
        progreso({ hecho: 0, total: 1, texto: 'Buscando imágenes…' });
        const imagenes = await H.ejecutar('listarImagenes', { bytes }, { senal });
        const reemplazos = await recodificarImagenes(imagenes, v.calidad, { senal, progreso });
        progreso({ hecho: imagenes.length, total: imagenes.length + 1, texto: 'Reescribiendo el PDF…' });
        const r = await H.ejecutar('reemplazarImagenes', { bytes, reemplazos }, { senal });
        if (r.bytes.length >= bytes.length * 0.98) return { mensaje: `No se pudo reducir (${informe(bytes.length, r.bytes.length)}).` };
        return { nombre: nombreResultado(ruta, 'comprimido'), bytes: r.bytes, resumen: `${informe(bytes.length, r.bytes.length)} · ${reemplazos.length} imágenes recodificadas` };
      },
    });
  });
}
