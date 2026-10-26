// Dónde colgar las capas de liberadoPDF: dentro de #viewerContainer, porque en pantalla completa
// solo se ve ese elemento (pdf.js le pide requestFullscreen) y lo que cuelga de <body> queda detrás.
export function raizDeCapas() {
  return document.getElementById('viewerContainer') ?? document.body;
}

// Diálogos y capas modales: en pantalla completa van en #viewerContainer (lo único visible); en ventana, en <body>,
// porque dentro de #viewerContainer el panel de miniaturas de pdf.js queda por encima y en una ventana angosta
// tapaba parte del diálogo.
export function raizDeDialogos() {
  return document.fullscreenElement ? raizDeCapas() : document.body;
}
