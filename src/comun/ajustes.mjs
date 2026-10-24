// Campos del diálogo de ajustes (§4.6) y acceso por ruta a la configuración. Lógica pura.
import { normalizarConfig } from './config.mjs';

export const CAMPOS = [
  { clave: 'avance', etiqueta: 'Avanzar automáticamente cada (segundos, 0 = no)', tipo: 'numero', minimo: 0, maximo: 3600, ruta: 'presentacion.avanceSegundos', seccion: 'Presentación' },
  { clave: 'bucle', etiqueta: 'Volver a la primera lámina al terminar', tipo: 'booleano', ruta: 'presentacion.bucle', seccion: 'Presentación' },
  { clave: 'transiciones', etiqueta: 'Transiciones entre páginas (/Trans del PDF)', tipo: 'booleano', ruta: 'presentacion.transiciones', seccion: 'Presentación' },
  { clave: 'fondo', etiqueta: 'Color de fondo en presentación', tipo: 'color', ruta: 'presentacion.fondo', seccion: 'Presentación' },
  { clave: 'cursor', etiqueta: 'Ocultar el cursor tras 2 s sin moverlo', tipo: 'booleano', ruta: 'presentacion.ocultarCursor', seccion: 'Presentación' },
  { clave: 'monitorPresentacion', etiqueta: 'Pantalla de la presentación', tipo: 'pantalla', ruta: 'monitorPresentacion', seccion: 'Pantallas' },
  { clave: 'monitorPresentador', etiqueta: 'Pantalla de la vista de presentador', tipo: 'pantalla', ruta: 'monitorPresentador', seccion: 'Pantallas' },
  { clave: 'unidad', etiqueta: 'Unidad de medida', tipo: 'opcion', opciones: [['mm', 'milímetros'], ['cm', 'centímetros'], ['in', 'pulgadas']], ruta: 'unidadMedida', seccion: 'Apariencia y herramientas' },
  { clave: 'nocturno', etiqueta: 'Modo nocturno (colores invertidos)', tipo: 'booleano', ruta: 'nocturno', seccion: 'Apariencia y herramientas' },
  { clave: 'tema', etiqueta: 'Tema de la interfaz', tipo: 'opcion', opciones: [['sistema', 'Como el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']], ruta: 'tema', seccion: 'Apariencia y herramientas' },
];

export function leerCampo(config, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), config);
}

function convertir(campo, valor) {
  switch (campo.tipo) {
    case 'numero': {
      const n = Number(valor);
      if (!Number.isFinite(n)) return campo.minimo ?? 0;
      return Math.min(campo.maximo ?? Infinity, Math.max(campo.minimo ?? -Infinity, n));
    }
    case 'booleano':
      return valor === true || valor === 'true' || valor === 'on';
    case 'color':
      return /^#[0-9a-f]{6}$/i.test(String(valor)) ? String(valor) : '#000000';
    case 'opcion':
      return campo.opciones.some(([v]) => v === valor) ? valor : null;
    case 'pantalla': {
      if (valor === 'auto' || valor === '' || valor == null) return 'auto';
      const n = Number(valor);
      return Number.isInteger(n) ? n : 'auto';
    }
    default:
      return valor;
  }
}

// Devuelve una configuración nueva (normalizada) con el campo escrito; no muta la entrada.
export function escribirCampo(config, ruta, valor) {
  const campo = CAMPOS.find(c => c.ruta === ruta);
  if (!campo) return normalizarConfig(config);
  const convertido = convertir(campo, valor);
  const copia = structuredClone(config);
  const partes = ruta.split('.');
  let objeto = copia;
  for (const k of partes.slice(0, -1)) objeto = objeto[k];
  if (convertido === null) delete objeto[partes.at(-1)]; // opción inválida: vuelve al valor por defecto
  else objeto[partes.at(-1)] = convertido;
  return normalizarConfig(copia);
}

export function opcionesDePantalla(pantallas) {
  return [
    { valor: 'auto', etiqueta: 'Automático' },
    ...pantallas.map(p => ({ valor: String(p.id), etiqueta: `${p.etiqueta} (${p.ancho}×${p.alto})` })),
  ];
}
