// Proteger con contraseña (AES-256 con qpdf): contraseña de apertura y de propietario, y permisos.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';

export function instalarProteger(H) {
  H.registrar('proteger', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'proteger',
      titulo: 'Proteger con contraseña',
      descripcion: 'Cifrado AES de 256 bits. La contraseña de apertura puede quedar vacía (el PDF abre, pero con los permisos limitados); la de propietario no.',
      campos: [
        { clave: 'usuario', etiqueta: 'Contraseña de apertura', tipo: 'contrasena', valor: '' },
        { clave: 'propietario', etiqueta: 'Contraseña de propietario (si se deja vacía, la de apertura)', tipo: 'contrasena', valor: '' },
        { clave: 'imprimir', etiqueta: 'Permitir imprimir', tipo: 'booleano', valor: true },
        { clave: 'copiar', etiqueta: 'Permitir copiar texto e imágenes', tipo: 'booleano', valor: true },
        { clave: 'modificar', etiqueta: 'Permitir modificar', tipo: 'booleano', valor: false },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const propietario = v.propietario || v.usuario;
        if (!propietario) return { mensaje: 'Escribe al menos una contraseña.' };
        const bytes = await H.bytesDelDocumento();
        const r = await H.ejecutar('proteger', { bytes, usuario: v.usuario, propietario, imprimir: v.imprimir, copiar: v.copiar, modificar: v.modificar }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, 'protegido'), bytes: r.bytes, resumen: 'PDF cifrado' };
      },
    });
  });
}
