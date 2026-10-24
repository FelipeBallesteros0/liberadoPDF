// Traductor del renderer: el idioma llega por el preload (sincrónico, antes de que arranque pdf.js).
import { crearTraductor } from '../comun/i18n.mjs';

export const idioma = globalThis.window?.liberadopdf?.idioma ?? 'en'; // sin window (pruebas en Node) → inglés
export const t = crearTraductor(idioma);
