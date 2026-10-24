// Números de página: texto con {n} y {total}, en una de seis posiciones, sobre las páginas elegidas.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

export const POSICIONES = [['abajo-centro', 'Abajo, centro'], ['abajo-derecha', 'Abajo, derecha'], ['abajo-izquierda', 'Abajo, izquierda'], ['arriba-centro', 'Arriba, centro'], ['arriba-derecha', 'Arriba, derecha'], ['arriba-izquierda', 'Arriba, izquierda']];

export function instalarNumerar(H) {
  H.registrar('numerar', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'numerar',
      titulo: 'Números de página',
      descripcion: 'Escribe {n} para el número y {total} para el total. Fuente Helvetica en negro.',
      campos: [
        { clave: 'formato', etiqueta: 'Texto', tipo: 'texto', valor: 'Página {n} / {total}' },
        { clave: 'posicion', etiqueta: 'Posición', tipo: 'opcion', valor: 'abajo-centro', opciones: POSICIONES },
        { clave: 'tamano', etiqueta: 'Tamaño (pt)', tipo: 'numero', valor: 11, minimo: 4, maximo: 72 },
        { clave: 'inicio', etiqueta: 'Número de la primera página', tipo: 'numero', valor: 1, minimo: -999, maximo: 99999 },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('numerar', { bytes, paginas: v.paginas, formato: v.formato, posicion: v.posicion, tamano: v.tamano, inicio: v.inicio }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'numerado'), bytes: salida, resumen: `${v.paginas.length} páginas numeradas` };
      },
    });
  });
}
