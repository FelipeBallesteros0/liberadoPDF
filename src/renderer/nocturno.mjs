// Modo nocturno: invierte los colores de las páginas (no de la interfaz). Tecla N y ajuste `nocturno`.
export function instalarNocturno({ obtenerConfig, guardar }) {
  const contenedor = document.getElementById('viewerContainer');
  const aplicar = (activo) => contenedor.classList.toggle('liberadopdf-nocturno', Boolean(activo));
  const alternar = () => {
    const nuevo = !contenedor.classList.contains('liberadopdf-nocturno');
    aplicar(nuevo);
    guardar({ ...obtenerConfig(), nocturno: nuevo });
  };
  aplicar(obtenerConfig().nocturno);
  return { alternar, aplicar };
}
