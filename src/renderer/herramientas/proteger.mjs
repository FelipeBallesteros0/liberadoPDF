// Proteger con contraseña (AES-256 con qpdf): contraseña de apertura y de propietario, y permisos.
import { nombreResultado } from '../comun/herramientas/nombres.mjs';
import { t } from '../i18n.mjs';

export function instalarProteger(H) {
  H.registrar('proteger', ({ ruta, totalPaginas }) => {
    H.dialogoHerramienta({
      clave: 'proteger',
      titulo: t('Proteger con contraseña'),
      descripcion: t('Cifrado AES de 256 bits. La contraseña de apertura puede quedar vacía (el PDF abre, pero con los permisos limitados); la de propietario no.'),
      campos: [
        { clave: 'usuario', etiqueta: t('Contraseña de apertura'), tipo: 'contrasena', valor: '' },
        { clave: 'propietario', etiqueta: t('Contraseña de propietario (si se deja vacía, la de apertura)'), tipo: 'contrasena', valor: '' },
        { clave: 'imprimir', etiqueta: t('Permitir imprimir'), tipo: 'booleano', valor: true },
        { clave: 'copiar', etiqueta: t('Permitir copiar texto e imágenes'), tipo: 'booleano', valor: true },
        { clave: 'modificar', etiqueta: t('Permitir modificar'), tipo: 'booleano', valor: false },
      ],
      totalPaginas,
      alEjecutar: async (v, { senal, progreso }) => {
        const propietario = v.propietario || v.usuario;
        if (!propietario) return { mensaje: t('Escribe al menos una contraseña.') };
        const bytes = await H.bytesDelDocumento();
        const r = await H.ejecutar('proteger', { bytes, usuario: v.usuario, propietario, imprimir: v.imprimir, copiar: v.copiar, modificar: v.modificar }, { senal, alProgreso: progreso });
        return { nombre: nombreResultado(ruta, t('protegido')), bytes: r.bytes, resumen: t('PDF cifrado') };
      },
    });
  });
}
