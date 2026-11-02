// Clic y doble clic en presentación. Lógica pura (el renderer pone el reloj y las acciones).
// Un clic navega recién cuando pasa la espera del doble clic sin otro clic; un doble clic sale de la presentación sin
// navegar. «Doble» lo decide el sistema (`detalle` = MouseEvent.detail, que usa su tiempo y su distancia de doble clic),
// pero solo cuenta si el primer clic sigue esperando: pasada la espera, el segundo es un clic más.
// Dos clics que el sistema no junta (detalle 1) navegan dos veces: el primero en cuanto llega el segundo.
export function crearClics({ esperaMs = 500, navegar, salir, programar = setTimeout, cancelar = clearTimeout }) {
  let pendiente = null; // { atras, temporizador }
  const soltar = () => {
    if (!pendiente) return null;
    cancelar(pendiente.temporizador);
    const anterior = pendiente;
    pendiente = null;
    return anterior;
  };
  return {
    presionar({ detalle = 1, atras = false } = {}) {
      if (pendiente && detalle >= 2) { soltar(); salir(); return; }
      const anterior = soltar();
      if (anterior) navegar(anterior.atras);
      pendiente = { atras, temporizador: programar(() => { pendiente = null; navegar(atras); }, esperaMs) };
    },
    cancelar() { soltar(); },
    get pendiente() { return pendiente !== null; },
  };
}
