// Qué pantalla recibe la presentación y cuál la vista de presentador. Lógica pura.
// `pantallas`: [{ id, principal }]; config: monitorPresentacion / monitorPresentador = 'auto' | id.
export function elegirPantallas(pantallas, { monitorPresentacion, monitorPresentador }) {
  if (!Array.isArray(pantallas) || pantallas.length < 2) return { presentacion: null, presentador: null };
  const ids = pantallas.map(p => p.id);
  const principal = (pantallas.find(p => p.principal) ?? pantallas[0]).id;
  const secundaria = (pantallas.find(p => p.id !== principal) ?? pantallas[1]).id;
  const presentacion = ids.includes(monitorPresentacion) ? monitorPresentacion : secundaria;
  let presentador = ids.includes(monitorPresentador) ? monitorPresentador : principal;
  if (presentador === presentacion) presentador = ids.find(id => id !== presentacion) ?? null;
  return { presentacion, presentador };
}
