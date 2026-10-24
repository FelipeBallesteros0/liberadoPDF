// Aplanar: convierte los campos de formulario en contenido fijo y, si se pide, quita todas las anotaciones.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

export function instalarAplanar(H) {
  H.registrar('aplanar', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'aplanar',
      titulo: t('Aplanar formularios y anotaciones'),
      descripcion: t('Los campos rellenados pasan a ser texto fijo. Las animaciones de «animate» son campos: al aplanar dejan de moverse.'),
      campos: [
        { clave: 'formularios', etiqueta: t('Aplanar los campos de formulario'), tipo: 'booleano', valor: true },
        { clave: 'quitarAnotaciones', etiqueta: t('Quitar todas las anotaciones (notas, resaltados, enlaces…)'), tipo: 'booleano', valor: false },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        if (!v.formularios && !v.quitarAnotaciones) return { mensaje: t('Marca al menos una opción.') };
        const bytes = await H.bytesDelDocumento();
        const r = await H.ejecutar('aplanar', { bytes, formularios: v.formularios, quitarAnotaciones: v.quitarAnotaciones }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('aplanado')), bytes: r.bytes, resumen: t('{a} campos aplanados, {b} anotaciones quitadas', { a: r.camposAplanados, b: r.anotacionesQuitadas }) };
      },
    });
  });
}
