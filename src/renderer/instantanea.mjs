// Instantánea: se arrastra un rectángulo sobre la ventana y el main lo copia al portapapeles como imagen.
import { rectanguloDeArrastre } from '../comun/instantanea.mjs';
import { raizDeCapas } from './capas.mjs';
import { t } from './i18n.mjs';

export function mostrarToast(texto) {
  const toast = document.createElement('div');
  toast.className = 'liberadopdf-toast';
  toast.textContent = texto;
  raizDeCapas().append(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function instalarInstantanea() {
  const contenedor = document.getElementById('viewerContainer');
  let activo = false;
  let inicio = null;
  let marco = null;

  const terminar = () => {
    activo = false;
    inicio = null;
    marco?.remove();
    marco = null;
    contenedor.classList.remove('liberadopdf-recortando');
    window.removeEventListener('mousedown', alPulsar, true);
    window.removeEventListener('mousemove', alMover, true);
    window.removeEventListener('mouseup', alSoltar, true);
    window.removeEventListener('keydown', alTecla, true);
  };
  const pintar = (rect) => {
    if (!marco) { marco = document.createElement('div'); marco.className = 'liberadopdf-recorte'; raizDeCapas().append(marco); }
    Object.assign(marco.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  };
  const alPulsar = (ev) => { ev.preventDefault(); ev.stopPropagation(); inicio = { x: ev.clientX, y: ev.clientY }; };
  const alMover = (ev) => {
    if (!inicio) return;
    ev.preventDefault();
    const rect = rectanguloDeArrastre(inicio, { x: ev.clientX, y: ev.clientY });
    if (rect) pintar(rect);
  };
  const alSoltar = async (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const rect = inicio ? rectanguloDeArrastre(inicio, { x: ev.clientX, y: ev.clientY }) : null;
    terminar();
    if (!rect) return;
    const ok = await window.liberadopdf.instantanea(rect);
    mostrarToast(ok ? t('Copiado al portapapeles') : t('No se pudo copiar'));
  };
  const alTecla = (ev) => { if (ev.key === 'Escape') { ev.stopImmediatePropagation(); terminar(); } };

  const iniciar = () => {
    if (activo) return;
    activo = true;
    contenedor.classList.add('liberadopdf-recortando');
    window.addEventListener('mousedown', alPulsar, true);
    window.addEventListener('mousemove', alMover, true);
    window.addEventListener('mouseup', alSoltar, true);
    window.addEventListener('keydown', alTecla, true);
  };
  return { iniciar, activa: () => activo };
}
