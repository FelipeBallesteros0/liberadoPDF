// Diálogo de ajustes (Ctrl+,): un control por campo de CAMPOS; cada cambio se guarda y se aplica en vivo.
import { CAMPOS, leerCampo, escribirCampo, opcionesDePantalla } from '../comun/ajustes.mjs';
import { valoresPorDefecto } from '../comun/config.mjs';
import { raizDeDialogos } from './capas.mjs';
import { t } from './i18n.mjs';

export function instalarAjustes({ obtenerConfig, guardar, aplicar, pantallas, documento = null }) {
  let dialogo = null;

  const control = (campo, config, listaPantallas) => {
    const valor = leerCampo(config, campo.ruta);
    let entrada;
    if (campo.tipo === 'booleano') {
      entrada = document.createElement('input');
      entrada.type = 'checkbox';
      entrada.checked = Boolean(valor);
    } else if (campo.tipo === 'numero') {
      entrada = document.createElement('input');
      entrada.type = 'number';
      entrada.min = String(campo.minimo ?? '');
      entrada.max = String(campo.maximo ?? '');
      entrada.value = String(valor ?? 0);
    } else if (campo.tipo === 'color') {
      entrada = document.createElement('input');
      entrada.type = 'color';
      entrada.value = String(valor ?? '#000000');
    } else {
      entrada = document.createElement('select');
      const opciones = campo.tipo === 'pantalla'
        ? opcionesDePantalla(listaPantallas).map(o => [o.valor, o.etiqueta])
        : campo.opciones;
      for (const [v, etiqueta] of opciones) {
        const opcion = document.createElement('option');
        opcion.value = v;
        opcion.textContent = campo.clave === 'idioma' ? etiqueta : t(etiqueta); // el selector de idioma muestra endónimos
        entrada.append(opcion);
      }
      entrada.value = String(valor ?? 'auto');
    }
    entrada.addEventListener('change', () => {
      const nuevo = entrada.type === 'checkbox' ? entrada.checked : entrada.value;
      if (campo.ruta === 'idioma') { // guarda y relanza con el mismo documento y la misma página; si se cancela, el selector vuelve atrás
        window.liberadopdf.cambiarIdioma(nuevo, globalThis.PDFViewerApplication?.page ?? null).then(ok => { if (!ok) entrada.value = obtenerConfig().idioma; });
        return;
      }
      const config = escribirCampo(obtenerConfig(), campo.ruta, nuevo);
      guardar(config);
      aplicar(config);
    });
    return entrada;
  };

  const cerrar = () => { dialogo?.remove(); dialogo = null; };
  const abrir = async () => {
    if (dialogo) return;
    const listaPantallas = await pantallas().catch(() => []);
    const config = obtenerConfig();
    dialogo = document.createElement('div');
    dialogo.className = 'liberadopdf-dialogo liberadopdf-ajustes';
    const caja = document.createElement('div');
    caja.className = 'caja';
    const titulo = document.createElement('h2');
    titulo.textContent = t('Ajustes');
    caja.append(titulo);
    let seccionActual = null;
    for (const campo of CAMPOS) {
      if (campo.seccion !== seccionActual) {
        seccionActual = campo.seccion;
        const h3 = document.createElement('h3');
        h3.textContent = t(seccionActual);
        caja.append(h3);
      }
      const fila = document.createElement('label');
      fila.className = 'fila';
      const texto = document.createElement('span');
      texto.textContent = t(campo.etiqueta);
      fila.append(texto, control(campo, config, listaPantallas));
      caja.append(fila);
    }
    if (documento) {
      const h3 = document.createElement('h3');
      h3.textContent = t('Este documento');
      const fila = document.createElement('label');
      fila.className = 'fila';
      const texto = document.createElement('span');
      texto.textContent = t(documento.etiqueta);
      const casilla = document.createElement('input');
      casilla.type = 'checkbox';
      casilla.checked = documento.obtener();
      casilla.addEventListener('change', () => documento.poner(casilla.checked));
      fila.append(texto, casilla);
      caja.append(h3, fila);
    }
    const pie = document.createElement('div');
    pie.className = 'pie';
    const restablecer = document.createElement('button');
    restablecer.type = 'button';
    restablecer.textContent = t('Restablecer');
    restablecer.addEventListener('click', () => {
      const actual = obtenerConfig();
      const config = { ...valoresPorDefecto(), recientes: actual.recientes, barra: actual.barra, porDocumento: actual.porDocumento, idioma: actual.idioma }; // el idioma solo cambia relanzando
      guardar(config);
      aplicar(config);
      cerrar();
      abrir();
    });
    const botonCerrar = document.createElement('button');
    botonCerrar.type = 'button';
    botonCerrar.textContent = t('Cerrar');
    botonCerrar.addEventListener('click', cerrar);
    pie.append(restablecer, botonCerrar);
    caja.append(pie);
    dialogo.append(caja);
    dialogo.addEventListener('click', (ev) => { if (ev.target === dialogo) cerrar(); });
    dialogo.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } });
    raizDeDialogos().append(dialogo);
    caja.querySelector('input, select')?.focus();
  };

  return { abrir, cerrar };
}
