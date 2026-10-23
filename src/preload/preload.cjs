// Preload de liberadoPDF: puente seguro hacia el proceso principal e inyección de la capa propia
// sobre el visor genérico de pdf.js (que se carga tal cual, sin modificar).
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Preferencias de pdf.js que deben estar fijadas antes de que el visor arranque.
try {
  const actuales = JSON.parse(localStorage.getItem('pdfjs.preferences') || '{}');
  localStorage.setItem('pdfjs.preferences', JSON.stringify({
    ...actuales,
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
  recientes: () => ipcRenderer.invoke('recientes'),
  config: () => ipcRenderer.invoke('config'),
  guardarConfig: parcial => ipcRenderer.invoke('guardar-config', parcial),
  abrirExterno: url => ipcRenderer.invoke('abrir-externo', url),
  rutaDeArchivo: archivo => webUtils.getPathForFile(archivo),
  documentoAbierto: info => ipcRenderer.invoke('documento-abierto', info),
  humoEvento: nombre => ipcRenderer.send('humo-evento', { nombre, t: Date.now() }),
  alAccion: cb => { ipcRenderer.on('accion', (evento, nombre) => cb(nombre)); },
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
