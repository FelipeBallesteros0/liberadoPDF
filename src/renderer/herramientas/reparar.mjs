// Reparar: qpdf reescribe el archivo (reconstruye la tabla xref); si no puede, lo intenta pdf-lib con tolerancia.
// Como un PDF roto a menudo ni siquiera abre, el diálogo permite elegir otro archivo en vez del documento abierto.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

export function instalarReparar(H) {
  H.registrar('reparar', ({ ruta, totalPaginas }) => {
    let otro = null; // { nombre, url, ruta }
    const cuerpo = document.createElement('div');
    cuerpo.className = 'fila';
    const etiqueta = document.createElement('span');
    etiqueta.textContent = t('Archivo a reparar');
    const elegir = document.createElement('button');
    elegir.type = 'button';
    elegir.textContent = t('El documento abierto (elegir otro…)');
    elegir.dataset.accion = 'anadir';
    elegir.addEventListener('click', async () => {
      const [e] = await window.liberadopdf.elegirArchivos({ filtros: 'pdf', varios: false });
      if (e) { otro = e; elegir.textContent = e.nombre; }
    });
    cuerpo.append(etiqueta, elegir);
    H.dialogoHerramienta({
      clave: 'reparar',
      titulo: t('Reparar PDF'),
      descripcion: t('Reescribe el archivo con qpdf (reconstruye las tablas internas). Si qpdf no puede, se intenta con pdf-lib. No recupera contenido que ya no está en el archivo. Si el PDF roto no abre, abre cualquier otro y elige aquí el archivo.'),
      totalPaginas,
      cuerpo,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = otro ? new Uint8Array(await (await fetch(otro.url)).arrayBuffer()) : await H.bytesDelDocumento();
        const r = await H.ejecutar('reparar', { bytes }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(otro ? otro.ruta : ruta, t('reparado')), bytes: r.bytes, resumen: r.avisos.length ? t('Reparado con {n} avisos ({motor})', { n: r.avisos.length, motor: r.motor }) : t('Reescrito sin avisos ({motor})', { motor: r.motor }) };
      },
    });
  });
}
