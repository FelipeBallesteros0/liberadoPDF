// Diálogo genérico de herramienta: campos, botón Ejecutar, progreso, cancelación y guardado del resultado.
import { raizDeCapas } from '../capas.mjs';
import { mostrarToast } from '../instantanea.mjs';
import { analizarRangos } from '../comun/herramientas/rangos.mjs';

// Última ejecución de cada herramienta (para la prueba de humo: demuestra que una cancelación asienta la promesa).
const anotarEjecucion = (clave, estado) => { if (window.liberadopdfHerramientas) window.liberadopdfHerramientas.ultimaEjecucion = { clave, estado, cuando: Date.now() }; };

export const MENSAJE_CIFRADO = 'Este PDF está cifrado: primero desbloquéalo (Herramientas ▸ Desbloquear).';

export async function bytesDelDocumento() {
  const url = new URLSearchParams(location.search).get('file');
  if (!url) throw new Error('No hay documento abierto');
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

function crearCampo(campo, valores, totalPaginas) {
  const fila = document.createElement('label');
  fila.className = 'fila';
  const texto = document.createElement('span');
  texto.textContent = campo.etiqueta;
  fila.append(texto);
  let entrada;
  switch (campo.tipo) {
    case 'booleano':
      entrada = document.createElement('input'); entrada.type = 'checkbox'; entrada.checked = Boolean(campo.valor);
      break;
    case 'numero':
      entrada = document.createElement('input'); entrada.type = 'number'; entrada.value = String(campo.valor ?? 0);
      if (campo.minimo !== undefined) entrada.min = String(campo.minimo);
      if (campo.maximo !== undefined) entrada.max = String(campo.maximo);
      if (campo.paso !== undefined) entrada.step = String(campo.paso);
      break;
    case 'color':
      entrada = document.createElement('input'); entrada.type = 'color'; entrada.value = campo.valor ?? '#000000';
      break;
    case 'opcion':
      entrada = document.createElement('select');
      for (const [v, etiqueta] of campo.opciones) { const o = document.createElement('option'); o.value = v; o.textContent = etiqueta; entrada.append(o); }
      entrada.value = campo.valor ?? campo.opciones[0][0];
      break;
    case 'contrasena':
      entrada = document.createElement('input'); entrada.type = 'password'; entrada.value = campo.valor ?? '';
      break;
    case 'rangos':
      entrada = document.createElement('input'); entrada.type = 'text'; entrada.placeholder = `todas (1-${totalPaginas}); p. ej. 1-3,5,8-`; entrada.value = campo.valor ?? '';
      break;
    default: // texto
      entrada = document.createElement('input'); entrada.type = 'text'; entrada.value = campo.valor ?? ''; if (campo.ancho) entrada.style.width = campo.ancho;
  }
  entrada.dataset.clave = campo.clave;
  fila.append(entrada);
  valores[campo.clave] = () => {
    if (campo.tipo === 'booleano') return entrada.checked;
    if (campo.tipo === 'numero') return Number(entrada.value);
    return entrada.value;
  };
  return fila;
}

export function dialogoHerramienta({ clave, titulo, descripcion, campos = [], totalPaginas = 0, cuerpo = null, alEjecutar }) {
  const capa = document.createElement('div');
  capa.className = 'liberadopdf-dialogo liberadopdf-herramienta';
  capa.dataset.herramienta = clave;
  const caja = document.createElement('div');
  caja.className = 'caja';
  const h2 = document.createElement('h2');
  h2.textContent = titulo;
  caja.append(h2);
  if (descripcion) { const p = document.createElement('p'); p.textContent = descripcion; caja.append(p); }
  const valores = {};
  for (const campo of campos) caja.append(crearCampo(campo, valores, totalPaginas));
  if (cuerpo) caja.append(cuerpo);
  const progreso = document.createElement('div');
  progreso.className = 'progreso';
  progreso.hidden = true;
  const barra = document.createElement('div');
  barra.className = 'barra';
  const textoProgreso = document.createElement('span');
  progreso.append(barra, textoProgreso);
  const mensaje = document.createElement('p');
  mensaje.className = 'mensaje';
  mensaje.hidden = true;
  const pie = document.createElement('div');
  pie.className = 'pie';
  const cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.textContent = 'Cancelar';
  const ejecutar = document.createElement('button'); ejecutar.type = 'button'; ejecutar.textContent = 'Ejecutar'; ejecutar.dataset.accion = 'ejecutar';
  pie.append(cancelar, ejecutar);
  caja.append(progreso, mensaje, pie);
  capa.append(caja);

  let controlador = null;
  let resultado = null;
  const cerrar = () => { controlador?.abort(); capa.remove(); };
  const avisar = (texto, error = false) => { mensaje.textContent = texto; mensaje.hidden = false; mensaje.classList.toggle('error', error); };
  const leerValores = () => Object.fromEntries(Object.entries(valores).map(([k, f]) => [k, f()]));

  cancelar.addEventListener('click', cerrar);
  capa.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') cerrar(); });

  ejecutar.addEventListener('click', async () => {
    if (resultado) { await guardar(); return; }
    const v = leerValores();
    for (const campo of campos) {
      if (campo.tipo === 'rangos') {
        const r = analizarRangos(v[campo.clave], totalPaginas);
        if (r.error) { avisar(r.error, true); return; }
        v[campo.clave] = r.paginas;
      }
    }
    controlador = new AbortController();
    ejecutar.disabled = true;
    progreso.hidden = false;
    mensaje.hidden = true;
    barra.style.width = '0%';
    textoProgreso.textContent = 'Trabajando…';
    try {
      resultado = await alEjecutar(v, {
        senal: controlador.signal,
        progreso: ({ hecho, total, texto }) => { barra.style.width = total ? `${Math.round(100 * hecho / total)}%` : '0%'; textoProgreso.textContent = texto ?? `${hecho} / ${total}`; },
      });
      if (controlador.signal.aborted) throw Object.assign(new Error('Cancelado'), { cancelado: true }); // terminó, pero el usuario ya canceló: no se guarda nada
      if (resultado?.guardadoEn) { // la herramienta fue guardando sobre la marcha (p. ej. una imagen por página)
        anotarEjecucion(clave, 'ok');
        mostrarToast(`Guardado en ${resultado.guardadoEn}`);
        cerrar();
        return;
      }
      if (resultado?.mensaje && !resultado.bytes && !resultado.archivos) { anotarEjecucion(clave, 'mensaje'); avisar(resultado.mensaje); resultado = null; ejecutar.disabled = false; progreso.hidden = true; return; }
      anotarEjecucion(clave, 'ok');
      barra.style.width = '100%';
      textoProgreso.textContent = resultado.resumen ?? 'Listo';
      ejecutar.textContent = 'Guardar…';
      ejecutar.disabled = false;
      await guardar();
    } catch (e) {
      anotarEjecucion(clave, e?.cancelado ? 'cancelada' : 'error');
      if (e?.cancelado) avisar('Cancelado');
      else if (e?.message === 'cifrado') avisar(MENSAJE_CIFRADO, true);
      else avisar(`Error: ${e.message}`, true);
      resultado = null;
      ejecutar.disabled = false;
      progreso.hidden = true;
    }
  });

  async function guardar() {
    if (!resultado || controlador?.signal.aborted) return;
    let destino = null;
    if (resultado.archivos) destino = await window.liberadopdf.guardarResultados({ archivos: resultado.archivos });
    else destino = await window.liberadopdf.guardarResultado({ nombre: resultado.nombre, bytes: resultado.bytes });
    if (!destino) return; // el usuario canceló el diálogo
    mostrarToast(`Guardado en ${destino}`);
    const ofrecerAbrir = resultado.bytes && /\.pdf$/i.test(destino);
    cerrar();
    if (ofrecerAbrir) {
      const abrir = document.createElement('div');
      abrir.className = 'liberadopdf-toast liberadopdf-toast-accion';
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Abrir el resultado';
      b.addEventListener('click', () => { window.liberadopdf.abrirResultado(destino); abrir.remove(); });
      const c = document.createElement('button'); c.type = 'button'; c.textContent = '×';
      c.addEventListener('click', () => abrir.remove());
      abrir.append(b, c);
      raizDeCapas().append(abrir);
      setTimeout(() => abrir.remove(), 15000);
    }
  }

  raizDeCapas().append(capa);
  caja.querySelector('input, select, button')?.focus();
  return { cerrar, capa };
}
