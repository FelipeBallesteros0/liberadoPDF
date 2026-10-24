// Preload de liberadoPDF: puente seguro hacia el proceso principal e inyección de la capa propia
// sobre el visor genérico de pdf.js (que se carga tal cual, sin modificar).
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Preferencias de pdf.js que deben estar fijadas antes de que el visor arranque.
try {
  const actuales = JSON.parse(localStorage.getItem('pdfjs.preferences') || '{}');
  let viewerCssTheme = 0;
  try { viewerCssTheme = ipcRenderer.sendSync('tema-inicial'); } catch { viewerCssTheme = 0; }
  localStorage.setItem('pdfjs.preferences', JSON.stringify({
    ...actuales,
    viewerCssTheme,
    enableScripting: true,
    enableXfa: true,
    enableComment: true,
    enableSignatureEditor: true,
  }));
} catch {
  // sin localStorage no hay preferencias: pdf.js usa las suyas por defecto (scripting activo)
}

contextBridge.exposeInMainWorld('liberadopdf', {
  abrirDialogo: () => ipcRenderer.invoke('abrir-dialogo'),
  abrirEnEstaVentana: ruta => ipcRenderer.invoke('abrir-en-esta', ruta),
  abrirEnVentanaNueva: ruta => ipcRenderer.invoke('abrir-en-nueva', ruta),
  abrirInicio: mensaje => ipcRenderer.invoke('abrir-inicio', mensaje),
  recientes: () => ipcRenderer.invoke('recientes'),
  config: () => ipcRenderer.invoke('config'),
  pantallas: () => ipcRenderer.invoke('pantallas'),
  guardarConfig: parcial => ipcRenderer.invoke('guardar-config', parcial),
  abrirExterno: url => ipcRenderer.invoke('abrir-externo', url),
  rutaDeArchivo: archivo => webUtils.getPathForFile(archivo),
  documentoAbierto: info => ipcRenderer.invoke('documento-abierto', info),
  edicionesUsuario: () => ipcRenderer.send('ediciones-usuario'),
  humoEvento: nombre => ipcRenderer.send('humo-evento', { nombre, t: Date.now() }),
  pedirPresentacion: () => ipcRenderer.invoke('pedir-presentacion'),
});

// Sobre viewer.html de pdf.js se añaden la hoja de estilo y el módulo de liberadoPDF.
window.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('/viewer.html')) return;
  const estilo = document.createElement('link');
  estilo.rel = 'stylesheet';
  estilo.href = '/visor.css';
  document.head.append(estilo);
  const modulo = document.createElement('script');
  modulo.type = 'module';
  modulo.src = '/visor.mjs';
  document.body.append(modulo);
});
