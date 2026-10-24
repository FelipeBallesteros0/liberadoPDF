// Cabecera HTTP Range (un solo rango de bytes) → { inicio, fin } inclusivos dentro de `total`, o null. Lógica pura.
export function rangoDeCabecera(cabecera, total) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(cabecera ?? '').trim());
  if (!m || !(total > 0)) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null;
  let inicio, fin;
  if (a === '') { const n = Number(b); if (!(n > 0)) return null; inicio = Math.max(0, total - n); fin = total - 1; }
  else { inicio = Number(a); fin = b === '' ? total - 1 : Math.min(Number(b), total - 1); }
  if (inicio >= total || fin < inicio) return null;
  return { inicio, fin };
}
