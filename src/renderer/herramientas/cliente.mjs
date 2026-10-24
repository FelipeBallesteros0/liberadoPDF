// Cliente del worker de herramientas: una operación a la vez, con progreso y cancelación (AbortSignal).
export function crearCliente({ crearWorker = () => new Worker('/herramientas/trabajador.mjs', { type: 'module' }) } = {}) {
  let worker = null;
  let siguienteId = 1;
  let cola = Promise.resolve();
  const pendientes = new Map();

  const asegurar = () => {
    if (worker) return worker;
    worker = crearWorker();
    worker.onmessage = ({ data }) => {
      const p = pendientes.get(data.id);
      if (!p) return;
      if (data.progreso) { p.alProgreso?.(data.progreso); return; }
      pendientes.delete(data.id);
      if (data.error) p.rechazar(new Error(data.error));
      else if (data.cancelado) p.rechazar(cancelacion());
      else p.resolver(data.resultado);
    };
    worker.onerror = (e) => { for (const p of pendientes.values()) p.rechazar(new Error(e.message || 'El worker falló')); pendientes.clear(); worker = null; }; // la próxima operación crea otro
    return worker;
  };

  const cancelacion = () => Object.assign(new Error('Cancelado'), { cancelado: true });
  const ejecutar = (operacion, argumentos, { alProgreso, senal } = {}) => {
    const tarea = () => new Promise((resolver, rechazar) => {
      if (senal?.aborted) { rechazar(cancelacion()); return; } // cancelado antes de empezar: ni se manda al worker
      const id = siguienteId++;
      const alAbortar = () => asegurar().postMessage({ id, cancelar: true });
      senal?.addEventListener('abort', alAbortar, { once: true });
      const limpiar = () => senal?.removeEventListener('abort', alAbortar);
      pendientes.set(id, { resolver: v => { limpiar(); resolver(v); }, rechazar: e => { limpiar(); rechazar(e); }, alProgreso });
      asegurar().postMessage({ id, operacion, argumentos });
    });
    const resultado = cola.then(tarea, tarea);
    cola = resultado.catch(() => {});
    return resultado;
  };

  return { ejecutar, terminar: () => { worker?.terminate(); worker = null; pendientes.clear(); }, worker: () => worker };
}
