// Dónde colgar las capas de liberadoPDF: dentro de #viewerContainer, porque en pantalla completa
// solo se ve ese elemento (pdf.js le pide requestFullscreen) y lo que cuelga de <body> queda detrás.
export function raizDeCapas() {
  return document.getElementById('viewerContainer') ?? document.body;
}
