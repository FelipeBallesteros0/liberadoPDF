// Qué pantalla recibe la presentación y cuál la vista de presentador. Lógica pura.
// `pantallas`: [{ id, principal }]; config: monitorPresentacion / monitorPresentador = 'auto' | id.
// En automático la presentación solo se va a la otra pantalla (el proyector) si la vista de presentador está abierta;
// si no, se queda en la pantalla donde está la ventana (presentacion: null). Una segunda pantalla que nadie mira
// (un transmisor o capturador HDMI) se llevaba la presentación y la ventana parecía minimizada.
// Una pantalla elegida en Ajustes se usa siempre; un id que ya no está conectado cuenta como automático.
export function elegirPantallas(pantallas, { monitorPresentacion, monitorPresentador }, { presentadorAbierto = false } = {}) {
  if (!Array.isArray(pantallas) || pantallas.length < 2) return { presentacion: null, presentador: null };
  const ids = pantallas.map(p => p.id);
  const principal = (pantallas.find(p => p.principal) ?? pantallas[0]).id;
  const secundaria = (pantallas.find(p => p.id !== principal) ?? pantallas[1]).id;
  const elegida = ids.includes(monitorPresentacion);
  const proyector = elegida ? monitorPresentacion : secundaria;
  let presentador = ids.includes(monitorPresentador) ? monitorPresentador : principal;
  if (presentador === proyector) presentador = ids.find(id => id !== proyector) ?? null;
  return { presentacion: elegida || presentadorAbierto ? proyector : null, presentador };
}
