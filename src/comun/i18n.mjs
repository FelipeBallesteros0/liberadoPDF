// Traducción de la interfaz: la clave es el texto en español y el diccionario da el inglés. Lógica pura.
// Una clave sin traducción se muestra en español (nunca en blanco); `{clave}` se sustituye por el parámetro.
import { en } from './i18n/en.mjs';

export const IDIOMAS = ['en', 'es'];
const DICCIONARIOS = { en, es: null };

export function crearTraductor(idioma, diccionarios = DICCIONARIOS) {
  const clave = IDIOMAS.includes(idioma) ? idioma : 'en';
  const dic = diccionarios[clave] ?? null;
  return (texto, params = {}) => {
    const base = dic && Object.hasOwn(dic, texto) ? dic[texto] : texto;
    return String(base).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
  };
}

// Mensajes que vienen del worker o del main en español: se traduce entero o, si llevan detalle tras «: », solo la parte fija.
export function crearTraductorDeMensajes(t) {
  return (mensaje) => {
    const m = String(mensaje ?? '');
    const traducido = t(m);
    if (traducido !== m) return traducido;
    const i = m.indexOf(': ');
    return i > 0 ? `${t(m.slice(0, i))}: ${m.slice(i + 2)}` : m;
  };
}

// El idioma efectivo: en modo humo manda LIBERADOPDF_IDIOMA (para probar en español sin tocar la configuración).
export function claveDeIdioma(config, env = {}) {
  const forzado = env.LIBERADOPDF_HUMO ? env.LIBERADOPDF_IDIOMA : null;
  const idioma = forzado || config?.idioma;
  return IDIOMAS.includes(idioma) ? idioma : 'en';
}
