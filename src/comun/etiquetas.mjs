// Láminas y pasos a partir de /PageLabels (Beamer repite la etiqueta en las páginas de una misma lámina).
// Lógica pura. Páginas y láminas son 1-based.
import { crearTraductor } from './i18n.mjs';

export function agruparEtiquetas(etiquetas, totalPaginas) {
  const validas = Array.isArray(etiquetas) && etiquetas.length === totalPaginas;
  const laminas = [];
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    const etiqueta = validas ? String(etiquetas[pagina - 1]) : String(pagina);
    const ultima = laminas[laminas.length - 1];
    if (validas && ultima && ultima.etiqueta === etiqueta) ultima.paginas += 1;
    else laminas.push({ etiqueta, primeraPagina: pagina, paginas: 1 });
  }
  const indiceDe = pagina => laminas.findIndex(l => pagina >= l.primeraPagina && pagina < l.primeraPagina + l.paginas);

  return {
    laminas,
    posicion(pagina) {
      const i = indiceDe(pagina);
      if (i < 0) return null;
      const l = laminas[i];
      return { lamina: i + 1, totalLaminas: laminas.length, paso: pagina - l.primeraPagina + 1, pasos: l.paginas, etiqueta: l.etiqueta };
    },
    // Lo que el usuario teclea es lo que Beamer imprime al pie: primero la etiqueta, luego el índice.
    paginaDeLamina(n) {
      const porEtiqueta = laminas.find(l => l.etiqueta === String(n));
      if (porEtiqueta) return porEtiqueta.primeraPagina;
      if (Number.isInteger(n) && n >= 1 && n <= laminas.length) return laminas[n - 1].primeraPagina;
      return null;
    },
    siguienteLamina(pagina) {
      const i = indiceDe(pagina);
      return i >= 0 && i + 1 < laminas.length ? laminas[i + 1].primeraPagina : null;
    },
    anteriorLamina(pagina) {
      const i = indiceDe(pagina);
      return i > 0 ? laminas[i - 1].primeraPagina : null;
    },
  };
}

// Texto del contador. Con etiquetas numéricas (Beamer) se muestra la etiqueta sobre la mayor, que es lo
// que el propio PDF rotula al pie; si no, el índice de la lámina sobre el total.
export function textoContador(posicion, grupos, t = crearTraductor('es')) {
  if (!posicion) return '';
  const numericas = grupos.laminas.every(l => /^\d+$/.test(l.etiqueta));
  const base = numericas
    ? t('lámina {n} / {total}', { n: posicion.etiqueta, total: Math.max(...grupos.laminas.map(l => Number(l.etiqueta))) })
    : t('lámina {n} / {total}', { n: posicion.lamina, total: posicion.totalLaminas });
  return posicion.pasos > 1 ? `${base} · ${t('paso {a} / {b}', { a: posicion.paso, b: posicion.pasos })}` : base;
}
