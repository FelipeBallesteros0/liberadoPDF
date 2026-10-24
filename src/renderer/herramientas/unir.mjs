// Unir PDF: el documento abierto primero, más los que el usuario añada; lista reordenable.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

const nombreDe = ruta => String(ruta ?? '').split(/[\\/]/).pop() || 'documento.pdf';

export function instalarUnir(H) {
  H.registrar('unir', ({ ruta }) => {
    const archivos = [{ nombre: nombreDe(ruta), cargar: () => H.bytesDelDocumento() }];
    const cuerpo = document.createElement('div');
    const lista = document.createElement('div');
    lista.className = 'lista';
    const botones = document.createElement('div');
    botones.className = 'botones';
    const anadir = document.createElement('button');
    anadir.type = 'button';
    anadir.textContent = t('Añadir PDF…');
    anadir.dataset.accion = 'anadir';
    botones.append(anadir);
    cuerpo.append(lista, botones);

    const pintar = () => {
      lista.replaceChildren(...archivos.map((a, i) => {
        const fila = document.createElement('div');
        fila.className = 'elemento';
        const texto = document.createElement('span');
        texto.textContent = `${i + 1}. ${a.nombre}`;
        const subir = document.createElement('button'); subir.type = 'button'; subir.textContent = t('↑'); subir.title = t('Subir'); subir.disabled = i === 0;
        subir.addEventListener('click', () => { [archivos[i - 1], archivos[i]] = [archivos[i], archivos[i - 1]]; pintar(); });
        const bajar = document.createElement('button'); bajar.type = 'button'; bajar.textContent = t('↓'); bajar.title = t('Bajar'); bajar.disabled = i === archivos.length - 1;
        bajar.addEventListener('click', () => { [archivos[i + 1], archivos[i]] = [archivos[i], archivos[i + 1]]; pintar(); });
        const quitar = document.createElement('button'); quitar.type = 'button'; quitar.textContent = t('✕'); quitar.title = t('Quitar'); quitar.disabled = archivos.length === 1;
        quitar.addEventListener('click', () => { archivos.splice(i, 1); pintar(); });
        fila.append(texto, subir, bajar, quitar);
        return fila;
      }));
    };
    anadir.addEventListener('click', async () => {
      const elegidos = await window.liberadopdf.elegirArchivos({ filtros: 'pdf', varios: true });
      for (const e of elegidos) archivos.push({ nombre: e.nombre, cargar: () => fetch(e.url).then(r => r.arrayBuffer()).then(b => new Uint8Array(b)) });
      pintar();
    });
    pintar();

    H.dialogoHerramienta({
      clave: 'unir',
      titulo: t('Unir PDF'),
      descripcion: t('Los archivos se unen en este orden. El resultado se guarda como un PDF nuevo.'),
      cuerpo,
      alEjecutar: async (valores, { senal, progreso }) => {
        const documentos = [];
        for (const [i, a] of archivos.entries()) { progreso({ hecho: i, total: archivos.length, texto: t('Leyendo {nombre}…', { nombre: a.nombre }) }); documentos.push(await a.cargar()); }
        const bytes = await H.ejecutar('unir', { documentos }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('unido')), bytes, resumen: t('{n} archivos unidos', { n: archivos.length }) };
      },
    });
  });
}
