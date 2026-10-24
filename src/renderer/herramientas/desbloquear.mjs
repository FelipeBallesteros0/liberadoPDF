// Desbloquear: quita el cifrado con la contraseña (de apertura o de propietario).
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

export function instalarDesbloquear(H) {
  H.registrar('desbloquear', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'desbloquear',
      titulo: 'Desbloquear PDF',
      descripcion: 'Guarda una copia sin cifrar. Hace falta la contraseña del documento (si abre sin pedirla, puede dejarse vacía).',
      campos: [{ clave: 'contrasena', etiqueta: 'Contraseña', tipo: 'contrasena', valor: '' }],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const bytes = await H.bytesDelDocumento();
        const r = await H.ejecutar('desbloquear', { bytes, contrasena: v.contrasena }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'desbloqueado'), bytes: r.bytes, resumen: 'Cifrado quitado' };
      },
    });
  });
}
