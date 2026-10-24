// Qué botones de pdf.js van en la barra principal. Lógica pura.
// `catalogo`: [{ id, origen: 'principal' | 'secundaria' }]; `barra`: { [id]: boolean } de la config.
// Sin entrada en la config, lo principal se ve y lo secundario se queda en el menú «»».

export function decidirBarra(catalogo, barra = {}) {
  return catalogo.map(({ id, origen }) => ({
    id,
    origen,
    enBarra: typeof barra[id] === 'boolean' ? barra[id] : origen === 'principal',
  }));
}

export function alternarBarra(barra, id, enBarra) {
  return { ...barra, [id]: Boolean(enBarra) };
}
