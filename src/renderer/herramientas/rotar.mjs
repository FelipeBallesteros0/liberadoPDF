// Rotar páginas: suma 90/180/270 grados a la rotación que ya tenga cada página elegida.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

export function instalarRotar(H) {
  H.registrar('rotar', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'rotar',
      titulo: 'Rotar páginas',
      campos: [
        { clave: 'grados', etiqueta: 'Giro', tipo: 'opcion', valor: '90', opciones: [['90', '90° a la derecha'], ['180', '180°'], ['270', '90° a la izquierda']] },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('rotar', { bytes, paginas: v.paginas, grados: Number(v.grados) }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'rotado'), bytes: salida, resumen: `${v.paginas.length} páginas rotadas` };
      },
    });
  });
}
