// Rotar páginas: suma 90/180/270 grados a la rotación que ya tenga cada página elegida.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

export function instalarRotar(H) {
  H.registrar('rotar', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'rotar',
      titulo: t('Rotar páginas'),
      campos: [
        { clave: 'grados', etiqueta: t('Giro'), tipo: 'opcion', valor: '90', opciones: [['90', t('90° a la derecha')], ['180', t('180°')], ['270', t('90° a la izquierda')]] },
        { clave: 'paginas', etiqueta: t('Páginas'), tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('rotar', { bytes, paginas: v.paginas, grados: Number(v.grados) }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('rotado')), bytes: salida, resumen: t('{n} páginas rotadas', { n: v.paginas.length }) };
      },
    });
  });
}
