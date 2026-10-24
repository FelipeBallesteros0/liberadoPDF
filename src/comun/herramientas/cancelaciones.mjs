// Qué operaciones del worker están en curso y cuáles se pidieron cancelar; nada queda tras terminar. Lógica pura.
export function crearRegistroDeCancelaciones() {
  const enCurso = new Set();
  const canceladas = new Set();
  return {
    empezar: id => { enCurso.add(id); },
    cancelar: id => { if (enCurso.has(id)) canceladas.add(id); },
    cancelada: id => canceladas.has(id),
    terminar: id => { enCurso.delete(id); canceladas.delete(id); },
    pendientes: () => enCurso.size + canceladas.size,
  };
}
