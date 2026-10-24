// Metadatos del documento (título, autor, asunto, palabras clave, creador): se precargan los actuales.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

export function instalarMetadatos(H) {
  H.registrar('metadatos', async ({ ruta, totalPaginas }) => {
    const bytes = await H.bytesDelDocumento();
    let actuales = {};
    try { actuales = await H.ejecutar('leerMetadatos', { bytes }); } catch { actuales = {}; }
    H.dialogoHerramienta({
      clave: 'metadatos',
      titulo: 'Metadatos',
      descripcion: 'Se guarda una copia con los metadatos nuevos; el archivo abierto no cambia.',
      campos: [
        { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', valor: actuales.titulo ?? '' },
        { clave: 'autor', etiqueta: 'Autor', tipo: 'texto', valor: actuales.autor ?? '' },
        { clave: 'asunto', etiqueta: 'Asunto', tipo: 'texto', valor: actuales.asunto ?? '' },
        { clave: 'palabrasClave', etiqueta: 'Palabras clave (separadas por comas)', tipo: 'texto', valor: actuales.palabrasClave ?? '' },
        { clave: 'creador', etiqueta: 'Aplicación creadora', tipo: 'texto', valor: actuales.creador ?? '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const salida = await H.ejecutar('metadatos', { bytes, titulo: v.titulo, autor: v.autor, asunto: v.asunto, palabrasClave: v.palabrasClave, creador: v.creador }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'metadatos'), bytes: salida, resumen: 'Metadatos actualizados' };
      },
    });
  });
}
