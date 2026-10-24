// Rangos de páginas escritos por el usuario («1-3, 5, 8-»). Lógica pura. Páginas 1-based.
export function analizarRangos(texto, total) {
  const limpio = String(texto ?? '').trim();
  if (limpio === '') return { paginas: Array.from({ length: total }, (_, i) => i + 1) };
  const paginas = new Set();
  const trozos = limpio.split(',').map(t => t.trim()).filter(t => t.length > 0);
  if (trozos.length === 0) return { error: 'Rango vacío' };
  for (const trozo of trozos) {
    const m = trozo.match(/^(\d+)?\s*(-)?\s*(\d+)?$/);
    if (!m || (!m[1] && !m[3]) || (m[1] && m[3] && !m[2])) return { error: `No entiendo: ${trozo}` }; // «1 3» sin guion no es un rango
    const desde = m[1] ? Number(m[1]) : 1;
    const hasta = m[2] ? (m[3] ? Number(m[3]) : total) : desde;
    for (const n of [desde, hasta]) if (n < 1 || n > total) return { error: `Página fuera del documento: ${n}` };
    if (hasta < desde) return { error: `Rango inválido: ${trozo}` };
    for (let n = desde; n <= hasta; n++) paginas.add(n);
  }
  return { paginas: [...paginas].sort((a, b) => a - b) };
}

export function dividirCada(total, n) {
  const paso = Math.max(1, Math.floor(n));
  const grupos = [];
  for (let inicio = 1; inicio <= total; inicio += paso) {
    grupos.push(Array.from({ length: Math.min(paso, total - inicio + 1) }, (_, i) => inicio + i));
  }
  return grupos;
}

export function formatearRangos(paginas) {
  const ordenadas = [...new Set(paginas)].sort((a, b) => a - b);
  const partes = [];
  let inicio = null, anterior = null;
  for (const p of ordenadas) {
    if (inicio === null) { inicio = anterior = p; continue; }
    if (p === anterior + 1) { anterior = p; continue; }
    partes.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
    inicio = anterior = p;
  }
  if (inicio !== null) partes.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
  return partes.join(',');
}
