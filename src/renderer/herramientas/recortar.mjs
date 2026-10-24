// Recortar páginas: se marca un rectángulo sobre la página (o se escriben las medidas) y se aplica como CropBox.
import { cajaDeArrastre, cajaValida } from '../comun/herramientas/recorte.mjs';
import { rectanguloDeArrastre } from '../comun/instantanea.mjs';
import { escalaEfectiva } from '../comun/medicion.mjs';
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { raizDeCapas } from '../capas.mjs';

export function instalarRecortar(H) {
  H.registrar('recortar', ({ app, ruta, totalPaginas }) => {
    const contenedor = document.getElementById('viewerContainer');
    const cuerpo = document.createElement('div');
    cuerpo.className = 'botones';
    const marcar = document.createElement('button');
    marcar.type = 'button';
    marcar.textContent = 'Marcar la zona en la página…';
    marcar.dataset.accion = 'marcar';
    const ayuda = document.createElement('span');
    ayuda.className = 'aviso-partes';
    ayuda.textContent = 'Medidas en unidades PDF (1/72 in) desde la esquina inferior izquierda.';
    cuerpo.append(marcar, ayuda);

    const { capa } = H.dialogoHerramienta({
      clave: 'recortar',
      titulo: 'Recortar páginas',
      descripcion: 'El recorte cambia el CropBox: lo que queda fuera deja de verse pero sigue en el archivo.',
      campos: [
        { clave: 'x', etiqueta: 'X', tipo: 'numero', valor: 0, paso: 0.01 },
        { clave: 'y', etiqueta: 'Y', tipo: 'numero', valor: 0, paso: 0.01 },
        { clave: 'ancho', etiqueta: 'Ancho', tipo: 'numero', valor: 0, paso: 0.01 },
        { clave: 'alto', etiqueta: 'Alto', tipo: 'numero', valor: 0, paso: 0.01 },
        { clave: 'paginas', etiqueta: 'Páginas', tipo: 'rangos', valor: '' },
      ],
      totalPaginas,
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        const caja = { x: v.x, y: v.y, ancho: v.ancho, alto: v.alto };
        const vista = app.pdfViewer.getPageView(app.page - 1);
        const motivo = cajaValida(caja, vista?.pdfPage?.view ?? [0, 0, Infinity, Infinity]);
        if (motivo) return { mensaje: motivo };
        const bytes = await H.bytesDelDocumento();
        const salida = await H.ejecutar('recortar', { bytes, paginas: v.paginas, caja }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'recortado'), bytes: salida, resumen: `${v.paginas.length} páginas recortadas` };
      },
    });
    const poner = (clave, valor) => { const e = capa.querySelector(`[data-clave="${clave}"]`); e.value = String(valor); };

    // Arrastre sobre una página: igual que la instantánea, pero el rectángulo se mide respecto al div .page.
    let inicio = null, divPagina = null, marco = null;
    const terminar = () => {
      inicio = null; divPagina = null; marco?.remove(); marco = null;
      contenedor.classList.remove('liberadopdf-recortando');
      window.removeEventListener('mousedown', alPulsar, true);
      window.removeEventListener('mousemove', alMover, true);
      window.removeEventListener('mouseup', alSoltar, true);
      window.removeEventListener('keydown', alTecla, true);
      capa.hidden = false;
    };
    const alPulsar = (ev) => {
      const p = ev.target.closest?.('.page');
      if (!p) return;
      ev.preventDefault(); ev.stopPropagation();
      divPagina = p; inicio = { x: ev.clientX, y: ev.clientY };
    };
    const alMover = (ev) => {
      if (!inicio) return;
      ev.preventDefault();
      const rect = rectanguloDeArrastre(inicio, { x: ev.clientX, y: ev.clientY });
      if (!rect) return;
      if (!marco) { marco = document.createElement('div'); marco.className = 'liberadopdf-recorte'; raizDeCapas().append(marco); }
      Object.assign(marco.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    };
    const alSoltar = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (inicio && divPagina) {
        const r = divPagina.getBoundingClientRect();
        const n = Number(divPagina.dataset.pageNumber);
        const vista = app.pdfViewer.getPageView(n - 1);
        const v = vista?.viewport;
        if (v && vista.pdfPage) {
          const caja = cajaDeArrastre({
            inicio: { x: inicio.x - r.left, y: inicio.y - r.top }, fin: { x: ev.clientX - r.left, y: ev.clientY - r.top },
            vista: { escala: escalaEfectiva(v.scale, vista.pdfPage.userUnit), rotacion: v.rotation, ancho: v.width, alto: v.height },
            view: vista.pdfPage.view,
          });
          poner('x', caja.x); poner('y', caja.y); poner('ancho', caja.ancho); poner('alto', caja.alto);
        }
      }
      terminar();
    };
    const alTecla = (ev) => { if (ev.key === 'Escape') { ev.stopImmediatePropagation(); terminar(); } };
    marcar.addEventListener('click', () => {
      capa.hidden = true;
      contenedor.classList.add('liberadopdf-recortando');
      window.addEventListener('mousedown', alPulsar, true);
      window.addEventListener('mousemove', alMover, true);
      window.addEventListener('mouseup', alSoltar, true);
      window.addEventListener('keydown', alTecla, true);
    });
  });
}
