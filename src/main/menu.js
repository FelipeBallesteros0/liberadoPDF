// Menú de la aplicación en español. Las teclas de Ver y Ayuda se muestran pero las maneja el renderer.
import { Menu, app, dialog } from 'electron';

const VERSION_PDFJS = '6.4.299';

export function construirMenu({ recientes, alAbrir, alAbrirNueva, alReciente, alVaciarRecientes, alAccion }) {
  const submenuRecientes = recientes.map(r => ({ label: r.nombre, sublabel: r.ruta, click: () => alReciente(r.ruta) }));
  const plantilla = [
    {
      label: 'Archivo',
      submenu: [
        { label: 'Abrir…', accelerator: 'CmdOrCtrl+O', click: (item, win) => alAbrir(win) },
        { label: 'Abrir en ventana nueva…', accelerator: 'CmdOrCtrl+N', click: () => alAbrirNueva() },
        {
          label: 'Recientes',
          submenu: submenuRecientes.length
            ? [...submenuRecientes, { type: 'separator' }, { label: 'Vaciar lista', click: () => alVaciarRecientes() }]
            : [{ label: '(vacío)', enabled: false }],
        },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Presentación', accelerator: 'F5', registerAccelerator: false, click: (item, win) => alAccion(win, 'presentacion') },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Personalizar barra…', click: (item, win) => alAccion(win, 'personalizarBarra') },
        { label: 'Ajustes…', accelerator: 'CmdOrCtrl+,', registerAccelerator: false, click: (item, win) => alAccion(win, 'ajustes') },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        { label: 'Teclas', accelerator: 'F1', registerAccelerator: false, click: (item, win) => alAccion(win, 'ayuda') },
        {
          label: 'Acerca de liberadoPDF',
          click: (item, win) => dialog.showMessageBox(win ?? undefined, {
            type: 'info',
            title: 'Acerca de liberadoPDF',
            message: `liberadoPDF ${app.getVersion()}`,
            detail: `Visor y presentador de PDF que reproduce las animaciones del paquete animate.\n\npdf.js ${VERSION_PDFJS} (Apache 2.0) · Electron ${process.versions.electron}\nLicencia MIT.`,
          }),
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(plantilla);
  Menu.setApplicationMenu(menu);
  return menu;
}
