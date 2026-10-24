// Detección de ediciones del usuario para decidir el cierre. pdf.js instala un `beforeunload` cuando su
// almacén de anotaciones cambia; en un navegador eso muestra «¿salir sin guardar?», pero en Electron
// bloquea el cierre en silencio, y el almacén cambia también por el JavaScript de las animaciones
// (campos ocultos/visibles), así que la X dejaba de funcionar con cualquier PDF animado. El proceso
// principal (ventanas.js, `will-prevent-unload`) decide: si el usuario anotó o rellenó campos,
// pregunta; si solo cambió la animación, cierra.
export function instalarCierre({ app }) {
  let avisado = false;
  const marcar = () => {
    if (avisado) return;
    avisado = true;
    window.liberadopdf.edicionesUsuario();
  };
  app.eventBus.on('annotationeditorstateschanged', ({ details }) => {
    if (details?.hasSomethingToUndo) marcar();
  });
  document.addEventListener('change', (ev) => {
    if (ev.target instanceof Element && ev.target.closest('.annotationLayer')) marcar();
  }, { capture: true });
}
