// Menú de la aplicación (textos por t(): español o inglés). Las teclas de Ver y Ayuda se muestran pero las maneja el renderer.
import { Menu, app, dialog } from 'electron';

const VERSION_PDFJS = '6.4.299';

// Herramientas de archivo (entrega 3): clave que recibe el renderer y texto del menú.
export const HERRAMIENTAS = [
  ['unir', 'Unir PDF…'], ['dividir', 'Dividir o extraer páginas…'], ['organizar', 'Organizar páginas…'], ['rotar', 'Rotar páginas…'],
  ['numerar', 'Números de página…'], ['marcaDeAgua', 'Marca de agua…'], ['recortar', 'Recortar páginas…'],
  ['aImagenes', 'PDF a imágenes…'], ['deImagenes', 'Imágenes a PDF…'], ['htmlAPdf', 'Página web o HTML a PDF…'],
  ['aplanar', 'Aplanar formularios y anotaciones…'], ['metadatos', 'Metadatos…'],
  ['proteger', 'Proteger con contraseña…'], ['desbloquear', 'Desbloquear PDF…'], ['reparar', 'Reparar PDF…'],
  ['ocr', 'OCR (texto en PDF escaneado)…'], ['comprimir', 'Comprimir…'],
];

export function construirMenu({ t = x => x, recientes, alAbrir, alAbrirNueva, alReciente, alVaciarRecientes, alAccion, alHerramienta = () => {}, plataforma = process.platform }) {
  // En macOS el primer menú es el de la aplicación (Acerca de, Ajustes, Salir) y hace falta Edición: sin sus roles
  // Cmd+C/Cmd+V/Cmd+A no funcionan en los campos de texto.
  const mac = plataforma === 'darwin';
  const acercaDe = {
    label: t('Acerca de liberadoPDF'),
    click: (item, win) => dialog.showMessageBox(win ?? undefined, {
      type: 'info',
      title: t('Acerca de liberadoPDF'),
      message: `liberadoPDF ${app.getVersion()}`,
      detail: `${t('Visor y presentador de PDF que reproduce las animaciones del paquete animate.')}\n\npdf.js ${VERSION_PDFJS} (Apache 2.0) · Electron ${process.versions.electron}\n${t('Licencia MIT.')}`,
    }),
  };
  const ajustes = { label: t('Ajustes…'), accelerator: 'CmdOrCtrl+,', registerAccelerator: false, click: (item, win) => alAccion(win, 'ajustes') };
  const submenuRecientes = recientes.map(r => ({ label: r.nombre, sublabel: r.ruta, click: () => alReciente(r.ruta) }));
  const plantilla = [
    ...(mac ? [{
      label: 'liberadoPDF',
      submenu: [
        acercaDe,
        { type: 'separator' },
        ajustes,
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: t('Archivo'),
      submenu: [
        { label: t('Abrir…'), accelerator: 'CmdOrCtrl+O', click: (item, win) => alAbrir(win) },
        { label: t('Abrir en ventana nueva…'), accelerator: 'CmdOrCtrl+N', click: () => alAbrirNueva() },
        { type: 'separator' },
        { label: t('Guardar'), accelerator: 'CmdOrCtrl+S', registerAccelerator: false, click: (item, win) => alAccion(win, 'guardar') },
        { label: t('Guardar como…'), accelerator: 'CmdOrCtrl+Shift+G', registerAccelerator: false, click: (item, win) => alAccion(win, 'guardarComo') },
        {
          label: t('Recientes'),
          submenu: submenuRecientes.length
            ? [...submenuRecientes, { type: 'separator' }, { label: t('Vaciar lista'), click: () => alVaciarRecientes() }]
            : [{ label: t('(vacío)'), enabled: false }],
        },
        ...(mac ? [{ type: 'separator' }, { role: 'close' }] : [{ type: 'separator' }, { label: t('Salir'), role: 'quit' }]),
      ],
    },
    ...(mac ? [{ role: 'editMenu' }] : []),
    {
      label: t('Ver'),
      submenu: [
        { label: t('Presentación'), accelerator: 'F5', registerAccelerator: false, click: (item, win) => alAccion(win, 'presentacion') },
        { label: t('Pantalla completa'), role: 'togglefullscreen' },
        { label: t('Vista de presentador'), accelerator: 'CmdOrCtrl+Shift+P', registerAccelerator: false, click: (item, win) => alAccion(win, 'presentador') },
        { type: 'separator' },
        { label: t('Personalizar barra…'), click: (item, win) => alAccion(win, 'personalizarBarra') },
        { label: t('Cuadrícula de láminas'), accelerator: 'G', registerAccelerator: false, click: (item, win) => alAccion(win, 'cuadricula') },
        { label: t('Instantánea al portapapeles'), accelerator: 'CmdOrCtrl+Shift+S', registerAccelerator: false, click: (item, win) => alAccion(win, 'instantanea') },
        { type: 'separator' },
        { label: t('Medir distancia'), click: (item, win) => alAccion(win, 'medirDistancia') },
        { label: t('Medir área'), click: (item, win) => alAccion(win, 'medirArea') },
        { label: t('Calibrar escala…'), click: (item, win) => alAccion(win, 'calibrar') },
        ...(mac ? [] : [ajustes]),
      ],
    },
    {
      label: t('Herramientas'),
      submenu: HERRAMIENTAS.map(([clave, etiqueta]) => ({ label: t(etiqueta), click: (item, win) => alHerramienta(win, clave) })),
    },
    ...(mac ? [{ role: 'windowMenu' }] : []),
    {
      label: t('Ayuda'),
      submenu: [
        { label: t('Teclas'), accelerator: 'F1', registerAccelerator: false, click: (item, win) => alAccion(win, 'ayuda') },
        ...(mac ? [] : [acercaDe]),
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(plantilla);
  Menu.setApplicationMenu(menu);
  return menu;
}
