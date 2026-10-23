// Instala el manejo de teclas de liberadoPDF por delante de pdf.js (fase de captura).
import { accionDeTecla } from '../comun/teclas.mjs';
import { raizDeCapas } from './capas.mjs';

const ESPERA_DIGITOS_MS = 1500;

function enCampoDeTexto(objetivo) {
  return objetivo instanceof HTMLElement && (objetivo.matches('input, textarea, select') || objetivo.isContentEditable);
}

export function instalarTeclas({ acciones, modoActual }) {
  let digitos = '';
  let temporizador = null;
  const indicador = document.createElement('div');
  indicador.className = 'liberadopdf-digitos';
  indicador.hidden = true;
  raizDeCapas().append(indicador);

  const limpiar = () => { digitos = ''; indicador.hidden = true; clearTimeout(temporizador); };
  const mostrar = () => {
    indicador.textContent = digitos;
    indicador.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(limpiar, ESPERA_DIGITOS_MS);
  };

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { limpiar(); return; }
    const resultado = accionDeTecla(ev, { modo: modoActual(), enEntrada: enCampoDeTexto(ev.target), digitos });
    if (!resultado) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    switch (resultado.accion) {
      case 'digito':
        digitos += resultado.valor;
        mostrar();
        break;
      case 'irALamina': {
        const numero = parseInt(digitos, 10);
        limpiar();
        acciones.irALamina(numero);
        break;
      }
      case 'nada':
        break;
      default:
        acciones[resultado.accion]?.();
    }
  }, { capture: true });
}
