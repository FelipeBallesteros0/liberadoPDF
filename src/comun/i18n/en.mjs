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

  // Ventanas nativas
  'Cambios sin guardar': 'Unsaved changes', 'Hay anotaciones o campos modificados sin guardar.': 'There are unsaved annotations or modified fields.',
  'Si cierras ahora se perderán. Pulsa Cancelar y usa Guardar (Ctrl+S) para conservarlos.': 'If you close now they will be lost. Press Cancel and use Save (Ctrl+S) to keep them.',
  'Cerrar sin guardar': 'Close without saving', 'Cancelar': 'Cancel', 'Guardar adjunto': 'Save attachment', '¿Sobrescribir {nombre}?': 'Overwrite {nombre}?', 'Sobrescribir': 'Overwrite',
  'Guardar como': 'Save as', 'No se pudo guardar el archivo.': 'The file could not be saved.',
  'Dirección no permitida': 'Address not allowed', 'Archivo HTML no válido': 'Invalid HTML file', 'No se puede sobrescribir el documento abierto: elige otro nombre.': 'The open document cannot be overwritten: choose another name.',
  'No se pudo cargar ({detalle})': 'Could not load ({detalle})', 'Tiempo agotado (30 s)': 'Timed out (30 s)',
  // Contador, cuadrícula, barra, visor
  'lámina {n} / {total}': 'slide {n} / {total}', 'paso {a} / {b}': 'step {a} / {b}', 'lámina {n}': 'slide {n}', 'paso {a}': 'step {a}',
  'Personalizar la barra': 'Customize the toolbar', 'Marca lo que quieres ver en la barra principal. Lo desmarcado del menú «»» se queda en el menú; lo desmarcado de la barra se oculta.': 'Check what you want in the main toolbar. Unchecked items of the «»» menu stay in the menu; unchecked toolbar items are hidden.',
  'Barra principal': 'Main toolbar', 'Menú »': '» menu', 'Copiado al portapapeles': 'Copied to the clipboard', 'No se pudo copiar': 'Could not copy',
  'Calibrar escala': 'Calibrate scale', 'El segmento mide {medida} según el PDF. ¿Cuánto mide en realidad ({unidad})?': 'The segment measures {medida} according to the PDF. How long is it really ({unidad})?', 'Aceptar': 'OK',
  'No hay cambios que guardar': 'No changes to save', 'Herramienta «{clave}»: próximamente': 'Tool «{clave}»: coming soon', 'Páginas con las notas a la derecha (Beamer, pgfpages)': 'Pages with the notes on the right (Beamer, pgfpages)',
  'Guardado: {nombre}': 'Saved: {nombre}', 'No se pudo abrir {nombre}: {detalle}': 'Could not open {nombre}: {detalle}', 'el PDF': 'the PDF', 'archivo dañado o no es un PDF': 'damaged file or not a PDF',
  // Diálogo base
  'No hay documento abierto': 'No document is open', 'todas (1-{n}); p. ej. 1-3,5,8-': 'all (1-{n}); e.g. 1-3,5,8-', 'Ejecutar': 'Run', 'Trabajando…': 'Working…', 'Listo': 'Done', 'Guardar…': 'Save…',
  'Cancelado': 'Cancelled', 'Error: {detalle}': 'Error: {detalle}', 'Abrir el resultado': 'Open the result', 'No se pudo guardar': 'Could not save', 'El worker falló': 'The worker failed',
  'Este PDF está cifrado: primero desbloquéalo (Herramientas ▸ Desbloquear). Si abrió sin pedir contraseña, deja la contraseña vacía.': 'This PDF is encrypted: unlock it first (Tools ▸ Unlock). If it opened without asking for a password, leave the password empty.',
  'Rango vacío': 'Empty range', 'No entiendo': 'I do not understand', 'Página fuera del documento': 'Page outside the document', 'Rango inválido': 'Invalid range',
  'La zona está vacía: marca un rectángulo mayor.': 'The area is empty: mark a bigger rectangle.', 'La zona queda fuera de la página.': 'The area falls outside the page.',
  // Mensajes del worker
  'Contraseña incorrecta': 'Wrong password', 'Filtro no admitido': 'Unsupported filter', 'Predictor que no se pudo deshacer': 'Predictor that could not be undone', 'Imagen desconocida': 'Unknown image',
  'La lista de imágenes caducó: vuelve a ejecutar la herramienta': 'The image list expired: run the tool again', 'Ninguna imagen se pudo incrustar': 'No image could be embedded', 'No se reconoció ninguna palabra': 'No word was recognized',
  'El texto tiene caracteres que la fuente Helvetica no admite': 'The text has characters the Helvetica font does not support', 'No se pudieron aplanar los formularios': 'The forms could not be flattened',
  'No se pudo reparar': 'Could not repair', 'el archivo no tiene objetos reconocibles': 'the file has no recognizable objects', 'Operación desconocida': 'Unknown operation', 'qpdf no pudo cifrar': 'qpdf could not encrypt', 'qpdf no pudo descifrar': 'qpdf could not decrypt',
  'Uniendo {i} de {n}…': 'Merging {i} of {n}…', 'Parte {i} de {n}…': 'Part {i} of {n}…', 'Imagen {i} de {n}…': 'Image {i} of {n}…', 'Recomprimiendo con qpdf…': 'Recompressing with qpdf…', 'Cifrando…': 'Encrypting…', 'Descifrando…': 'Decrypting…',
  'Reescribiendo con qpdf…': 'Rewriting with qpdf…', 'Reconstruyendo la tabla de objetos…': 'Rebuilding the object table…', 'Intentando con pdf-lib…': 'Trying with pdf-lib…',
  // Sufijos de resultado
  'unido': 'merged', 'parte': 'part', 'página': 'page', 'páginas {r}': 'pages {r}', 'organizado': 'organized', 'rotado': 'rotated', 'marca de agua': 'watermark', 'recortado': 'cropped', 'imágenes': 'images', 'página web': 'web page',
  'aplanado': 'flattened', 'metadatos': 'metadata', 'protegido': 'protected', 'desbloqueado': 'unlocked', 'reparado': 'repaired', 'comprimido': 'compressed',
  // Unir
  'Añadir PDF…': 'Add PDF…', '↑': '↑', 'Subir': 'Move up', '↓': '↓', 'Bajar': 'Move down', '✕': '✕', 'Quitar': 'Remove', 'Unir PDF': 'Merge PDF',
  'Los archivos se unen en este orden. El resultado se guarda como un PDF nuevo.': 'The files are merged in this order. The result is saved as a new PDF.', 'Leyendo {nombre}…': 'Reading {nombre}…', '{n} archivos unidos': '{n} files merged',
  // Dividir
  'Modo': 'Mode', 'Extraer las páginas indicadas a un PDF': 'Extract the given pages to one PDF', 'Dividir cada N páginas': 'Split every N pages', 'Una página por archivo': 'One page per file',
  'Páginas (modo extraer)': 'Pages (extract mode)', 'N páginas por archivo': 'N pages per file', 'Dividir o extraer páginas': 'Split or extract pages',
  'El documento tiene {n} páginas. Los resultados se guardan como archivos nuevos.': 'The document has {n} pages. The results are saved as new files.', '{n} páginas extraídas': '{n} pages extracted', '{n} archivos': '{n} files',
  'Saldrá 1 archivo.': '1 file will be produced.', 'Saldrán {n} archivos.': '{n} files will be produced.',
  // Organizar
  'Insertar página en blanco al final': 'Insert a blank page at the end', 'en blanco': 'blank', '{i} (blanco)': '{i} (blank)', '{i} ← pág. {origen}': '{i} ← p. {origen}', 'Rotar 90°': 'Rotate 90°', 'Duplicar': 'Duplicate',
  'Organizar páginas': 'Organize pages', 'Arrastra las páginas para reordenarlas. El resultado se guarda como un PDF nuevo.': 'Drag the pages to reorder them. The result is saved as a new PDF.', 'No queda ninguna página.': 'No pages left.', '{n} páginas': '{n} pages',
  // Rotar
  'Rotar páginas': 'Rotate pages', 'Giro': 'Turn', '90° a la derecha': '90° clockwise', '180°': '180°', '90° a la izquierda': '90° counterclockwise', '{n} páginas rotadas': '{n} pages rotated',
  // Marca de agua
  'Imagen (modo imagen)': 'Image (image mode)', 'Elegir imagen…': 'Choose image…', 'Marca de agua': 'Watermark', 'Tipo': 'Type', 'Imagen (PNG, JPG…)': 'Image (PNG, JPG…)', 'BORRADOR': 'DRAFT',
  'Tamaño del texto (pt)': 'Text size (pt)', 'Color': 'Color', 'Ancho de la imagen (fracción de la página)': 'Image width (fraction of the page)', 'Opacidad': 'Opacity', 'Ángulo (°)': 'Angle (°)', 'Repetir en mosaico': 'Tile',
  'Elige primero una imagen.': 'Choose an image first.', 'Escribe el texto de la marca.': 'Write the watermark text.', '{n} páginas marcadas': '{n} pages watermarked',
  // Recortar
  'Marcar la zona en la página…': 'Mark the area on the page…', 'Medidas en unidades PDF (1/72 in) desde la esquina inferior izquierda.': 'Measurements in PDF units (1/72 in) from the bottom-left corner.', 'Recortar páginas': 'Crop pages',
  'El recorte cambia el CropBox: lo que queda fuera deja de verse pero sigue en el archivo.': 'Cropping changes the CropBox: what is left outside is no longer shown but stays in the file.', 'X': 'X', 'Y': 'Y', 'Ancho': 'Width', 'Alto': 'Height', '{n} páginas recortadas': '{n} pages cropped',
  // PDF a imágenes
  'PDF a imágenes': 'PDF to images', 'Se guarda una imagen por página en la carpeta que elijas.': 'One image per page is saved in the folder you choose.', 'Formato': 'Format', 'PNG': 'PNG', 'JPEG': 'JPEG',
  'Resolución (ppp)': 'Resolution (dpi)', 'Calidad JPEG (0–1)': 'JPEG quality (0–1)', 'Elige una carpeta para las imágenes.': 'Choose a folder for the images.', 'Página {n}…': 'Page {n}…',
  'No se pudo guardar en la carpeta': 'Could not save into the folder', '{n} imágenes': '{n} images',
  // Imágenes a PDF
  'Añadir imágenes…': 'Add images…', 'no se pudo leer como imagen, se omite': 'could not be read as an image, skipped', 'Imágenes a PDF': 'Images to PDF', 'Una página por imagen, en este orden.': 'One page per image, in this order.',
  'Tamaño de página': 'Page size', 'A4': 'A4', 'Carta': 'Letter', 'El de cada imagen': 'That of each image', 'Orientación': 'Orientation', 'Según la imagen': 'According to the image', 'Vertical': 'Portrait', 'Horizontal': 'Landscape',
  'Margen (pt)': 'Margin (pt)', 'Añade al menos una imagen legible.': 'Add at least one readable image.', ', {n} archivos omitidos': ', {n} files skipped',
  // HTML a PDF
  'Archivo HTML (origen archivo)': 'HTML file (file source)', 'Elegir archivo HTML…': 'Choose HTML file…', 'Página web o HTML a PDF': 'Web page or HTML to PDF',
  'Las páginas web se cargan con conexión a internet; un archivo HTML local se imprime tal cual. Hasta 30 s.': 'Web pages are loaded with an internet connection; a local HTML file is printed as is. Up to 30 s.',
  'Origen': 'Source', 'Dirección web (http/https)': 'Web address (http/https)', 'Archivo HTML': 'HTML file', 'Dirección': 'Address', 'Apaisado': 'Landscape', 'Imprimir fondos y colores': 'Print backgrounds and colors',
  'Escribe una dirección http:// o https:// válida.': 'Write a valid http:// or https:// address.', 'Elige primero un archivo HTML.': 'Choose an HTML file first.', 'Cargando la página…': 'Loading the page…', 'Página convertida': 'Page converted',
  // Aplanar
  'Aplanar formularios y anotaciones': 'Flatten forms and annotations', 'Los campos rellenados pasan a ser texto fijo. Las animaciones de «animate» son campos: al aplanar dejan de moverse.': 'Filled fields become fixed text. The «animate» animations are fields: after flattening they stop moving.',
  'Aplanar los campos de formulario': 'Flatten the form fields', 'Quitar todas las anotaciones (notas, resaltados, enlaces…)': 'Remove all annotations (notes, highlights, links…)', 'Marca al menos una opción.': 'Check at least one option.',
  '{a} campos aplanados, {b} anotaciones quitadas': '{a} fields flattened, {b} annotations removed',
  // Metadatos
  'Metadatos': 'Metadata', 'Se guarda una copia con los metadatos nuevos; el archivo abierto no cambia.': 'A copy with the new metadata is saved; the open file does not change.', 'Título': 'Title', 'Autor': 'Author', 'Asunto': 'Subject',
  'Palabras clave (separadas por comas)': 'Keywords (comma-separated)', 'Aplicación creadora': 'Creator application', 'Metadatos actualizados': 'Metadata updated',
  // Proteger / desbloquear / reparar
  'Proteger con contraseña': 'Protect with password', 'Cifrado AES de 256 bits. La contraseña de apertura puede quedar vacía (el PDF abre, pero con los permisos limitados); la de propietario no.': '256-bit AES encryption. The open password may be empty (the PDF opens, but with limited permissions); the owner password may not.',
  'Contraseña de apertura': 'Open password', 'Contraseña de propietario (si se deja vacía, la de apertura)': 'Owner password (if left empty, the open password)', 'Permitir imprimir': 'Allow printing', 'Permitir copiar texto e imágenes': 'Allow copying text and images',
  'Permitir modificar': 'Allow modifying', 'Escribe al menos una contraseña.': 'Write at least one password.', 'PDF cifrado': 'PDF encrypted',
  'Desbloquear PDF': 'Unlock PDF', 'Guarda una copia sin cifrar. Hace falta la contraseña del documento (si abre sin pedirla, puede dejarse vacía).': 'Saves an unencrypted copy. The document password is needed (if it opens without asking, it can be left empty).', 'Contraseña': 'Password', 'Cifrado quitado': 'Encryption removed',
  'Archivo a reparar': 'File to repair', 'El documento abierto (elegir otro…)': 'The open document (choose another…)', 'Reparar PDF': 'Repair PDF',
  'Reescribe el archivo con qpdf (reconstruye las tablas internas). Si qpdf no puede, se intenta con pdf-lib. No recupera contenido que ya no está en el archivo. Si el PDF roto no abre, abre cualquier otro y elige aquí el archivo.': 'Rewrites the file with qpdf (rebuilds the internal tables). If qpdf cannot, pdf-lib is tried. It does not recover content that is no longer in the file. If the broken PDF does not open, open any other and choose the file here.',
  'Reparado con {n} avisos ({motor})': 'Repaired with {n} warnings ({motor})', 'Reescrito sin avisos ({motor})': 'Rewritten without warnings ({motor})',
  // OCR
  'No se pudo cargar tesseract.js': 'Could not load tesseract.js', 'Reconociendo la página {n}…': 'Recognizing page {n}…', 'OCR (texto en PDF escaneado)': 'OCR (text in scanned PDF)',
  'Reconoce el texto de las páginas (todo en este equipo, sin red) y lo añade como capa invisible: el PDF queda buscable. Tarda unos segundos por página.': 'Recognizes the text of the pages (all on this computer, no network) and adds it as an invisible layer: the PDF becomes searchable. It takes a few seconds per page.',
  'Idioma': 'Language', 'Español': 'Spanish', 'Inglés': 'English', 'Español e inglés': 'Spanish and English', 'Resolución de reconocimiento (ppp)': 'Recognition resolution (dpi)', '200 (rápido)': '200 (fast)', '300 (más preciso)': '300 (more accurate)',
  'Escribiendo la capa de texto…': 'Writing the text layer…', '{p} palabras reconocidas en {n} páginas': '{p} words recognized in {n} pages',
  // Comprimir
  'Imagen {i} de {n} ({ancho}×{alto})…': 'Image {i} of {n} ({ancho}×{alto})…', 'Comprimir': 'Compress', 'Reduce las fotos (JPEG) y recomprime la estructura con qpdf. El texto y los dibujos no cambian. Si no se consigue reducir, no se guarda nada.': 'Shrinks the photos (JPEG) and recompresses the structure with qpdf. Text and drawings do not change. If it cannot be reduced, nothing is saved.',
  'Calidad de las imágenes': 'Image quality', 'Alta (mismo tamaño, JPEG 85 %)': 'High (same size, JPEG 85 %)', 'Media (70 % del tamaño, JPEG 70 %)': 'Medium (70 % of the size, JPEG 70 %)', 'Baja (mitad del tamaño, JPEG 50 %)': 'Low (half the size, JPEG 50 %)',
  'Buscando imágenes…': 'Looking for images…',
  // Video
  'Video en un formato que no se puede reproducir': 'Video in a format that cannot be played', 'No se encontró el video «{archivo}» junto al PDF': 'The video «{archivo}» was not found next to the PDF', 'Reescribiendo el PDF…': 'Rewriting the PDF…', 'No se pudo reducir ({informe}).': 'Could not reduce ({informe}).', '{n} imágenes recodificadas': '{n} images re-encoded',
};
