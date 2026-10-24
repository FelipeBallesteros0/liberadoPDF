// Metadatos del documento (título, autor, asunto, palabras clave, creador): se precargan los actuales.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

export function instalarMetadatos(H) {
  H.registrar('metadatos', async ({ ruta, totalPaginas }) => {
    const bytes = await H.bytesDelDocumento();
    let actuales = {};
    try { actuales = await H.ejecutar('leerMetadatos', { bytes }); } catch { actuales = {}; }
    H.dialogoHerramienta({
      clave: 'metadatos',
      titulo: t('Metadatos'),
      descripcion: t('Se guarda una copia con los metadatos nuevos; el archivo abierto no cambia.'),
      campos: [
        { clave: 'titulo', etiqueta: t('Título'), tipo: 'texto', valor: actuales.titulo ?? '' },
        { clave: 'autor', etiqueta: t('Autor'), tipo: 'texto', valor: actuales.autor ?? '' },
        { clave: 'asunto', etiqueta: t('Asunto'), tipo: 'texto', valor: actuales.asunto ?? '' },
        { clave: 'palabrasClave', etiqueta: t('Palabras clave (separadas por comas)'), tipo: 'texto', valor: actuales.palabrasClave ?? '' },
        { clave: 'creador', etiqueta: t('Aplicación creadora'), tipo: 'texto', valor: actuales.creador ?? '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const salida = await H.ejecutar('metadatos', { bytes, titulo: v.titulo, autor: v.autor, asunto: v.asunto, palabrasClave: v.palabrasClave, creador: v.creador }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('metadatos')), bytes: salida, resumen: t('Metadatos actualizados') };
      },
    });
  });
}
