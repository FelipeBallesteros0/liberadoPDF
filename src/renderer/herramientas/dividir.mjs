// Dividir o extraer páginas: rangos a un solo PDF, cada N páginas, o cada página por separado.
import { analizarRangos, dividirCada, formatearRangos } from '../comun/herramientas/rangos.mjs';
import { nombreResultado, nombreParte } from '../comun/herramientas/nombres.mjs';

export function gruposDeDivision({ modo, paginas, cada, total }) {
  if (modo === 'rangos') return [paginas];
  if (modo === 'una') return dividirCada(total, 1);
  return dividirCada(total, Number(cada) || 1);
}

export function instalarDividir(H) {
  H.registrar('dividir', ({ ruta, totalPaginas }) => {
    const aviso = document.createElement('p');
    aviso.className = 'aviso-partes';
    const campos = [
      { clave: 'modo', etiqueta: 'Modo', tipo: 'opcion', valor: 'rangos', opciones: [['rangos', 'Extraer las páginas indicadas a un PDF'], ['cada', 'Dividir cada N páginas'], ['una', 'Una página por archivo']] },
      { clave: 'paginas', etiqueta: 'Páginas (modo extraer)', tipo: 'rangos', valor: '' },
      { clave: 'cada', etiqueta: 'N páginas por archivo', tipo: 'numero', valor: 2, minimo: 1, maximo: Math.max(1, totalPaginas) },
    ];
    const { capa } = H.dialogoHerramienta({
      clave: 'dividir',
      titulo: 'Dividir o extraer páginas',
      descripcion: `El documento tiene ${totalPaginas} páginas. Los resultados se guardan como archivos nuevos.`,
      campos,
      totalPaginas,
      cuerpo: aviso,
      alEjecutar: async (v, { senal, progreso }) => {
        const grupos = gruposDeDivision({ modo: v.modo, paginas: v.paginas, cada: v.cada, total: totalPaginas });
        const bytes = await H.bytesDelDocumento();
        const partes = await H.ejecutar('dividir', { bytes, grupos }, { senal, alProgreso: progreso });
        if (partes.length === 1) return { nombre: nombreResultado(ruta, `páginas ${formatearRangos(grupos[0])}`), bytes: partes[0], resumen: `${grupos[0].length} páginas extraídas` };
        return { archivos: partes.map((b, i) => ({ nombre: nombreParte(ruta, i + 1, partes.length), bytes: b })), resumen: `${partes.length} archivos` };
      },
    });
    const leer = () => {
      const modo = capa.querySelector('[data-clave="modo"]').value;
      const cada = Number(capa.querySelector('[data-clave="cada"]').value) || 1;
      const texto = capa.querySelector('[data-clave="paginas"]').value;
      capa.querySelector('[data-clave="paginas"]').closest('.fila').hidden = modo !== 'rangos';
      capa.querySelector('[data-clave="cada"]').closest('.fila').hidden = modo !== 'cada';
      const r = analizarRangos(texto, totalPaginas);
      const n = modo === 'rangos' ? (r.error ? 0 : 1) : gruposDeDivision({ modo, cada, total: totalPaginas }).length;
      aviso.textContent = r.error && modo === 'rangos' ? r.error : `Saldrán ${n} archivo${n === 1 ? '' : 's'}.`;
    };
    capa.addEventListener('input', leer);
    capa.addEventListener('change', leer);
    leer();
  });
}
