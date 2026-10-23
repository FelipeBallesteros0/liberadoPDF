// Contador «lámina X / Y · paso a / b» visible solo en presentación.
import { raizDeCapas } from './capas.mjs';

export function instalarContador({ app, obtenerGrupos, modoActual }) {
  const capa = document.createElement('div');
  capa.className = 'liberadopdf-contador';
  capa.hidden = true;
  raizDeCapas().append(capa);

  const actualizar = () => {
    const grupos = obtenerGrupos();
    const posicion = grupos?.posicion(app.page);
    if (!posicion || modoActual() !== 'presentacion') { capa.hidden = true; return; }
    capa.textContent = `lámina ${posicion.lamina} / ${posicion.totalLaminas}` + (posicion.pasos > 1 ? ` · paso ${posicion.paso} / ${posicion.pasos}` : '');
    capa.hidden = false;
  };
  app.eventBus.on('pagechanging', actualizar);
  app.eventBus.on('presentationmodechanged', () => setTimeout(actualizar, 0));
  return { actualizar };
}
