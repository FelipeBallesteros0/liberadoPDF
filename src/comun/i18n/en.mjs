// Diccionario español → inglés de la interfaz. La clave es el texto exacto en español que aparece en el código.
export const en = {
  // Menú
  'Archivo': 'File', 'Abrir…': 'Open…', 'Abrir en ventana nueva…': 'Open in new window…', 'Guardar': 'Save', 'Guardar como…': 'Save as…',
  'Recientes': 'Recent', 'Vaciar lista': 'Clear list', '(vacío)': '(empty)', 'Salir': 'Quit',
  'Ver': 'View', 'Presentación': 'Presentation', 'Pantalla completa': 'Full screen', 'Vista de presentador': 'Presenter view',
  'Personalizar barra…': 'Customize toolbar…', 'Cuadrícula de láminas': 'Slide grid', 'Instantánea al portapapeles': 'Snapshot to clipboard',
  'Medir distancia': 'Measure distance', 'Medir área': 'Measure area', 'Calibrar escala…': 'Calibrate scale…', 'Ajustes…': 'Settings…',
  'Herramientas': 'Tools', 'Ayuda': 'Help', 'Teclas': 'Keys', 'Acerca de liberadoPDF': 'About liberadoPDF',
  'Visor y presentador de PDF que reproduce las animaciones del paquete animate.': 'PDF viewer and presenter that plays the animations of the animate package.',
  'Licencia MIT.': 'MIT license.',
  'Abre primero un PDF': 'Open a PDF first',
  'Las herramientas trabajan sobre el documento abierto. Para reparar un PDF que no abre, abre cualquier otro PDF y elige el archivo roto en Herramientas ▸ Reparar.': 'The tools work on the open document. To repair a PDF that does not open, open any other PDF and pick the broken file in Tools ▸ Repair.',
  'Abrir PDF': 'Open PDF', 'PDF': 'PDF', 'Elegir archivos': 'Choose files', 'Elegir carpeta': 'Choose folder', 'Guardar resultado': 'Save result', 'Carpeta para los resultados': 'Folder for the results',
  // Herramientas (etiquetas del menú)
  'Unir PDF…': 'Merge PDF…', 'Dividir o extraer páginas…': 'Split or extract pages…', 'Organizar páginas…': 'Organize pages…', 'Rotar páginas…': 'Rotate pages…',
  'Números de página…': 'Page numbers…', 'Marca de agua…': 'Watermark…', 'Recortar páginas…': 'Crop pages…', 'PDF a imágenes…': 'PDF to images…',
  'Imágenes a PDF…': 'Images to PDF…', 'Página web o HTML a PDF…': 'Web page or HTML to PDF…', 'Aplanar formularios y anotaciones…': 'Flatten forms and annotations…',
  'Metadatos…': 'Metadata…', 'Proteger con contraseña…': 'Protect with password…', 'Desbloquear PDF…': 'Unlock PDF…', 'Reparar PDF…': 'Repair PDF…',
  'OCR (texto en PDF escaneado)…': 'OCR (text in scanned PDF)…', 'Comprimir…': 'Compress…',
  // Pantalla de inicio
  'Arrastra un PDF aquí': 'Drop a PDF here', 'F1: teclas · Ctrl+O: abrir · Ctrl+N: ventana nueva': 'F1: keys · Ctrl+O: open · Ctrl+N: new window',
  'Todavía no hay archivos recientes.': 'No recent files yet.', 'No es un PDF: {ruta}': 'Not a PDF: {ruta}',
  // Presentador
  'Vista de presentador · liberadoPDF': 'Presenter view · liberadoPDF', 'Siguiente': 'Next', 'Notas': 'Notes',
  '← → PgUp PgDn: navegar · R: reiniciar cronómetro': '← → PgUp PgDn: navigate · R: reset stopwatch',
  'página {n} / {total}': 'page {n} / {total}', 'página {n}': 'page {n}', 'fin': 'end',
  // Ajustes
  'Ajustes': 'Settings', 'Restablecer': 'Reset', 'Cerrar': 'Close', 'Este documento': 'This document', 'Automático': 'Automatic', 'Pantalla {n}': 'Display {n}',
  'Avanzar automáticamente cada (segundos, 0 = no)': 'Advance automatically every (seconds, 0 = off)', 'Volver a la primera lámina al terminar': 'Go back to the first slide at the end',
  'Transiciones entre páginas (/Trans del PDF)': 'Page transitions (/Trans in the PDF)', 'Color de fondo en presentación': 'Background color in presentation',
  'Ocultar el cursor tras 2 s sin moverlo': 'Hide the cursor after 2 s without moving it', 'Pantalla de la presentación': 'Presentation display',
  'Pantalla de la vista de presentador': 'Presenter view display', 'Unidad de medida': 'Measurement unit', 'milímetros': 'millimeters', 'centímetros': 'centimeters', 'pulgadas': 'inches',
  'Modo nocturno (colores invertidos)': 'Night mode (inverted colors)', 'Tema de la interfaz': 'Interface theme', 'Como el sistema': 'Like the system', 'Claro': 'Light', 'Oscuro': 'Dark',
  'Idioma / Language': 'Language / Idioma', 'Videos del PDF: reproducir solos': 'PDF videos: play automatically', 'Videos del PDF: en bucle': 'PDF videos: loop',
  'Pantallas': 'Displays', 'Apariencia y herramientas': 'Appearance and tools',
  // Ayuda (F1)
  'Teclas de liberadoPDF': 'liberadoPDF keys', 'Esc o clic para cerrar. Los clickers envían PgUp / PgDn.': 'Esc or click to close. Clickers send PgUp / PgDn.',
  'Página siguiente': 'Next page', 'Página anterior': 'Previous page', 'Lámina siguiente / anterior (salta los pasos)': 'Next / previous slide (skips the steps)',
  'Primera / última página': 'First / last page', 'Ir a esa lámina': 'Go to that slide', 'Entrar en presentación': 'Enter presentation',
  'Salir de presentación, cerrar esta ayuda': 'Leave presentation, close this help', 'Reloj y cronómetro (en presentación)': 'Clock and stopwatch (in presentation)',
  'Pantalla en negro / en blanco (en presentación)': 'Black / white screen (in presentation)',
  'Puntero láser / foco / dibujo (en presentación); C limpia, Ctrl+Z deshace': 'Laser pointer / spotlight / drawing (in presentation); C clears, Ctrl+Z undoes',
  'Modo nocturno': 'Night mode', 'Abrir / abrir en una ventana nueva': 'Open / open in a new window', 'Guardar / guardar como': 'Save / save as',
  'Buscar (pdf.js)': 'Find (pdf.js)', 'Imprimir': 'Print', 'Esta ayuda': 'This help', 'número + Enter': 'number + Enter', 'F5 / doble clic': 'F5 / double click',
  'Menú Herramientas': 'Tools menu',
  'Unir (37), dividir (38), organizar (39), rotar (40), numerar (41), marca de agua (42), recortar (43), PDF a imágenes (44), imágenes a PDF (45), HTML a PDF (46), aplanar (47), metadatos (48), proteger (49), desbloquear (50), reparar (51), OCR (52) y comprimir (53): el resultado va siempre a un archivo nuevo': 'Merge (37), split (38), organize (39), rotate (40), page numbers (41), watermark (42), crop (43), PDF to images (44), images to PDF (45), HTML to PDF (46), flatten (47), metadata (48), protect (49), unlock (50), repair (51), OCR (52) and compress (53): the result always goes to a new file',
  // Numerar
  'Números de página': 'Page numbers', 'Escribe {n} para el número y {total} para el total. Fuente Helvetica en negro.': 'Write {n} for the number and {total} for the total. Helvetica font in black.',
  'Texto': 'Text', 'Posición': 'Position', 'Tamaño (pt)': 'Size (pt)', 'Número de la primera página': 'Number of the first page', 'Páginas': 'Pages',
  'Abajo, centro': 'Bottom, center', 'Abajo, derecha': 'Bottom, right', 'Abajo, izquierda': 'Bottom, left', 'Arriba, centro': 'Top, center', 'Arriba, derecha': 'Top, right', 'Arriba, izquierda': 'Top, left',
  'Página {n} / {total}': 'Page {n} / {total}', '{n} páginas numeradas': '{n} pages numbered', 'numerado': 'numbered',
  'Guardado en {ruta}': 'Saved in {ruta}',
};
