// Marca de agua de texto o imagen, centrada o en mosaico, con color, opacidad y ángulo.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

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
    etiqueta.textContent = t('Imagen (modo imagen)');
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.textContent = t('Elegir imagen…');
    elegir.dataset.accion = 'imagen';
    elegir.addEventListener('click', async () => {
      const [e] = await window.liberadopdf.elegirArchivos({ filtros: 'imagenes', varios: false });
      if (e) { imagen = e; elegir.textContent = e.nombre; }
    });
    cuerpo.append(etiqueta, elegir);
    const { capa } = H.dialogoHerramienta({
      clave: 'marcaDeAgua',
      titulo: t('Marca de agua'),
      campos: [
        { clave: 'tipo', etiqueta: t('Tipo'), tipo: 'opcion', valor: 'texto', opciones: [['texto', t('Texto')], ['imagen', t('Imagen (PNG, JPG…)')]] },
        { clave: 'texto', etiqueta: t('Texto'), tipo: 'texto', valor: t('BORRADOR') },
        { clave: 'tamano', etiqueta: t('Tamaño del texto (pt)'), tipo: 'numero', valor: 60, minimo: 6, maximo: 400 },
        { clave: 'color', etiqueta: t('Color'), tipo: 'color', valor: '#ff0000' },
        { clave: 'escala', etiqueta: t('Ancho de la imagen (fracción de la página)'), tipo: 'numero', valor: 0.5, minimo: 0.05, maximo: 1, paso: 0.05 },
        { clave: 'opacidad', etiqueta: t('Opacidad'), tipo: 'numero', valor: 0.3, minimo: 0.05, maximo: 1, paso: 0.05 },
        { clave: 'angulo', etiqueta: t('Ángulo (°)'), tipo: 'numero', valor: 45, minimo: -180, maximo: 180 },
        { clave: 'mosaico', etiqueta: t('Repetir en mosaico'), tipo: 'booleano', valor: false },
        { clave: 'paginas', etiqueta: t('Páginas'), tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        const argumentos = { paginas: v.paginas, tamano: v.tamano, color: v.color, opacidad: v.opacidad, angulo: v.angulo, mosaico: v.mosaico, escala: v.escala };
        if (v.tipo === 'imagen') {
          if (!imagen) return { mensaje: t('Elige primero una imagen.') };
          Object.assign(argumentos, await imagenParaPdf(imagen.url));
        } else {
          if (!v.texto.trim()) return { mensaje: t('Escribe el texto de la marca.') };
          argumentos.texto = v.texto;
        }
        argumentos.bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('marcaDeAgua', argumentos, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('marca de agua')), bytes: salida, resumen: t('{n} páginas marcadas', { n: v.paginas.length }) };
      },
    });
    // Solo se muestran los campos del tipo elegido (texto: texto, tamaño, color; imagen: elegir imagen, escala).
    const ajustarFilas = () => {
      const tipo = capa.querySelector('[data-clave="tipo"]').value;
      for (const clave of ['texto', 'tamano', 'color']) capa.querySelector(`[data-clave="${clave}"]`).closest('.fila').hidden = tipo !== 'texto';
      capa.querySelector('[data-clave="escala"]').closest('.fila').hidden = tipo !== 'imagen';
      cuerpo.hidden = tipo !== 'imagen';
    };
    capa.addEventListener('change', ajustarFilas);
    ajustarFilas();
  });
}
