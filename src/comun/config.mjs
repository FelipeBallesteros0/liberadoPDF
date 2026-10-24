// Configuración de liberadoPDF: valores por defecto, normalización tolerante y lista de recientes.
// Lógica pura: sin Electron ni sistema de archivos (eso vive en src/main/config.js).

export const MAX_RECIENTES = 10;

export function valoresPorDefecto() {
  return {
    version: 1,
    recientes: [],
    presentacion: {
      avanceSegundos: 0,
      bucle: false,
      transiciones: true,
      fondo: '#000000',
      ocultarCursor: true,
    },
    unidadMedida: 'mm',
    nocturno: false,
    tema: 'sistema',
    monitorPresentacion: 'auto',
    monitorPresentador: 'auto',
    porDocumento: {},
    barra: { presentationMode: true }, // id de botón de pdf.js → ¿en la barra principal?
  };
}

function esObjetoPlano(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// Copia de `entrada` solo lo que tenga el mismo tipo que `defecto`; lo demás se descarta.
function fusionar(defecto, entrada) {
  const salida = {};
  for (const clave of Object.keys(defecto)) {
    const valorDefecto = defecto[clave];
    const valorEntrada = esObjetoPlano(entrada) ? entrada[clave] : undefined;
    if (esObjetoPlano(valorDefecto)) {
      salida[clave] = fusionar(valorDefecto, valorEntrada);
    } else if (Array.isArray(valorDefecto)) {
      salida[clave] = Array.isArray(valorEntrada) ? valorEntrada.slice() : [];
    } else if (typeof valorEntrada === typeof valorDefecto) {
      salida[clave] = valorEntrada;
    } else {
      salida[clave] = valorDefecto;
    }
  }
  return salida;
}

function recienteValido(entrada) {
  return esObjetoPlano(entrada) && typeof entrada.ruta === 'string' && entrada.ruta.length > 0;
}

export function normalizarConfig(entrada) {
  const config = fusionar(valoresPorDefecto(), entrada);
  config.recientes = config.recientes.filter(recienteValido).map(r => ({
    ruta: r.ruta,
    nombre: typeof r.nombre === 'string' ? r.nombre : r.ruta,
    fecha: typeof r.fecha === 'number' ? r.fecha : 0,
  }));
  // porDocumento solo admite objetos planos por ruta
  config.porDocumento = Object.fromEntries(
    Object.entries(config.porDocumento).filter(([, v]) => esObjetoPlano(v)),
  );
  // barra: mapa libre id → booleano (fusionar solo conserva las claves por defecto)
  const barraEntrada = esObjetoPlano(entrada) && esObjetoPlano(entrada.barra) ? entrada.barra : null;
  config.barra = barraEntrada
    ? Object.fromEntries(Object.entries(barraEntrada).filter(([, v]) => typeof v === 'boolean'))
    : valoresPorDefecto().barra;
  return config;
}

export function agregarReciente(recientes, { ruta, nombre, fecha }) {
  const resto = recientes.filter(r => r.ruta !== ruta);
  return [{ ruta, nombre, fecha }, ...resto].slice(0, MAX_RECIENTES);
}
