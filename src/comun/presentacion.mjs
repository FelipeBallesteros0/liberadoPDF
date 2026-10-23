// Lógica pura del modo presentación: avance automático con bucle y texto del reloj.

export function siguientePagina(actual, total, bucle) {
  if (actual < total) return actual + 1;
  return bucle ? 1 : null;
}

const dos = n => String(n).padStart(2, '0');

export function textoReloj(ahoraMs, inicioMs) {
  const ahora = new Date(ahoraMs);
  const hora = `${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;
  const segundos = Math.max(0, Math.floor((ahoraMs - inicioMs) / 1000));
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const transcurrido = h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
  return { hora, transcurrido };
}
