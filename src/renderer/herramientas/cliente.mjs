// Cliente del worker de herramientas: una operación a la vez, con progreso y cancelación (AbortSignal).
export function crearCliente() {
  let worker = null;
  let siguienteId = 1;
  let cola = Promise.resolve();
  const pendientes = new Map();

  const asegurar = () => {
    if (worker) return worker;
    worker = new Worker('/herramientas/trabajador.mjs', { type: 'module' });
    worker.onmessage = ({ data }) => {
      const p = pendientes.get(data.id);
      if (!p) return;
      if (data.progreso) { p.alProgreso?.(data.progreso); return; }
      pendientes.delete(data.id);
      if (data.error) p.rechazar(new Error(data.error));
      else if (data.cancelado) p.rechazar(Object.assign(new Error('Cancelado'), { cancelado: true }));
      else p.resolver(data.resultado);
    };
    worker.onerror = (e) => { for (const p of pendientes.values()) p.rechazar(new Error(e.message || 'El worker falló')); pendientes.clear(); };
    return worker;
  };

  const ejecutar = (operacion, argumentos, { alProgreso, senal } = {}) => {
    const tarea = () => new Promise((resolver, rechazar) => {
      const id = siguienteId++;
      pendientes.set(id, { resolver, rechazar, alProgreso });
      senal?.addEventListener('abort', () => asegurar().postMessage({ id, cancelar: true }), { once: true });
      asegurar().postMessage({ id, operacion, argumentos });
    });
    const resultado = cola.then(tarea, tarea);
    cola = resultado.catch(() => {});
    return resultado;
  };

  return { ejecutar, terminar: () => { worker?.terminate(); worker = null; pendientes.clear(); } };
}
