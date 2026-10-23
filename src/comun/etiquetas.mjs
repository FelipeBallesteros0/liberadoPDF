// Láminas y pasos a partir de /PageLabels (Beamer repite la etiqueta en las páginas de una misma lámina).
// Lógica pura. Páginas y láminas son 1-based.

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
    paginaDeLamina(n) {
      if (Number.isInteger(n) && n >= 1 && n <= laminas.length) return laminas[n - 1].primeraPagina;
      const porEtiqueta = laminas.find(l => l.etiqueta === String(n));
      return porEtiqueta ? porEtiqueta.primeraPagina : null;
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
