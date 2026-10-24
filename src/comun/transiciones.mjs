// Transiciones /Trans del PDF → descripción y estilo. Lógica pura.
// `dict` es null o { S, D, Dm, M, Di } con nombres como texto sin barra (lo produce el lector de pdf-lib).
const TIPOS = new Set(['Fade', 'Dissolve', 'Glitter', 'Blinds', 'Wipe', 'Split', 'Box', 'Push', 'Cover', 'Uncover', 'Fly']);
const DURACION_MAXIMA = 5;

export function transicionDe(dict) {
  if (!dict || typeof dict !== 'object' || typeof dict.S !== 'string' || dict.S === 'R') return null;
  const tipo = TIPOS.has(dict.S) ? dict.S : 'Fade';
  const d = Number(dict.D);
  const duracion = Number.isFinite(d) && d > 0 && d <= DURACION_MAXIMA ? d : 1;
  const dimension = dict.Dm === 'V' ? 'V' : 'H';
  const movimiento = dict.M === 'O' ? 'O' : 'I';
  const di = Number(dict.Di);
  const direccion = Number.isFinite(di) ? ((di % 360) + 360) % 360 : 0;
  return { tipo, duracion, dimension, movimiento, direccion };
}

export function estiloDeTransicion(t) {
  return {
    clase: 'liberadopdf-trans-' + t.tipo.toLowerCase(),
    duracionMs: Math.round(t.duracion * 1000),
  };
}

// Cuadrante de la dirección (0, 90, 180, 270) para elegir la animación CSS.
export function cuadrante(direccion) {
  return (Math.round(direccion / 90) * 90) % 360;
}
