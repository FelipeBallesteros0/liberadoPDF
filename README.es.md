# liberadoPDF

*English: see [README.md](README.md).*

Visor y presentador de PDF para Windows, Linux y macOS, portable, que reproduce las animaciones del paquete LaTeX `animate` igual que Adobe Acrobat Reader y los videos incrustados o enlazados en el PDF (sin audio). Por dentro lleva el visor de pdf.js, cuyo sandbox de JavaScript ejecuta las animaciones; liberadoPDF le añade la experiencia de presentación: pantalla completa, teclas y clicker, láminas con pasos, pantalla en negro, reloj, avance automático y recientes.

Nació para dar una charla con una presentación de Beamer que lleva un video incrustado con `animate`, que ningún visor instalado reproducía. Desde la entrega 3 trae además un menú «Herramientas» con 17 operaciones de archivo (unir, dividir, OCR, comprimir…) que funcionan sin conexión y sin instalar nada.

## Uso

1. Copia la carpeta `liberadoPDF-win32-x64` (o descomprime el `.zip`) al disco o a un pendrive. No hay que instalar nada.
2. Doble clic en `liberadoPDF.exe` abre la pantalla de inicio: «Abrir PDF», los últimos archivos abiertos y una zona para arrastrar un PDF.
3. También puedes usar «Abrir con…» sobre un PDF, arrastrar un PDF sobre el ejecutable o sobre la ventana, o pasarlo por línea de comandos.
4. `F5` o doble clic entran en presentación; `Esc` sale.
5. **Modo presentación** está en la barra principal (icono de pantalla junto a «»»). Con Ver ▸ «Personalizar barra…» o la última entrada del menú «»» eliges qué botones van en la barra y cuáles no; se recuerda en `config.json` (`barra`).
6. La X cierra la ventana sin preguntar, salvo que hayas anotado o rellenado campos sin guardar: entonces pregunta. (Las animaciones también modifican el PDF por dentro; eso no cuenta.)
7. **Idioma**: la interfaz arranca en inglés. En Ajustes (`Ctrl+,`) ▸ «Idioma / Language» se elige Español; al cambiarlo la aplicación se reinicia sola con el mismo documento (también cambia el idioma del visor pdf.js).

**Primer arranque en un PC nuevo**: Windows y el antivirus analizan el ejecutable la primera vez y puede tardar 10–20 s; después abre en menos de 2 s. Ábrelo una vez antes de la charla. Desde un pendrive USB 2.0 el primer arranque también es lento: conviene copiar la carpeta al disco.

## Linux

Hay un paquete portable para Linux x64 (`liberadoPDF-linux-x64.tar.gz`): descomprímelo y ejecuta `./liberadoPDF.sh`. El lanzador usa el sandbox de Chromium si el sistema lo permite (user namespaces sin privilegios, o `chrome-sandbox` con setuid root: `sudo chown root chrome-sandbox && sudo chmod 4755 chrome-sandbox`) y, si no, arranca sin sandbox avisándolo por la terminal. Los datos van en `data/` junto al programa, igual que en Windows. Para «Abrir con…» desde el escritorio, apunta a `liberadoPDF.sh`.

## macOS

Hay dos zip: `liberadoPDF-darwin-arm64.zip` (Apple Silicon, M1 en adelante) y `liberadoPDF-darwin-x64.zip` (Intel); macOS 12 o posterior. Descomprímelo y arrastra `liberadoPDF.app` a Aplicaciones. La app no está firmada por Apple, así que la primera vez macOS dirá que «está dañada» o que «no se puede verificar». Se arregla una vez en la Terminal:

```bash
xattr -cr /Applications/liberadoPDF.app
codesign --force --deep --sign - /Applications/liberadoPDF.app
```

La primera línea quita la marca de cuarentena; la segunda le pone una firma ad-hoc, necesaria en Apple Silicon (se puede omitir si el paquete se construyó con `rcodesign`). Después abre con doble clic, aparece en «Abrir con…» de los PDF y acepta PDF soltados sobre su icono del Dock. Los atajos van con `Cmd` en lugar de `Ctrl` (`Cmd+S`, `Cmd+,`, `Cmd+Mayús+P`…). Dentro de un `.app` no hay modo portable: los datos van en `~/Library/Application Support/liberadoPDF`.

## Teclas

| Tecla | Ventana | Presentación |
|---|---|---|
| `→` `↓` `PgDn` `Espacio` `Enter` | página siguiente | página siguiente |
| `←` `↑` `PgUp` `Retroceso` | página anterior | página anterior |
| `Mayús+→` / `Mayús+←` | lámina siguiente / anterior (salta los pasos de Beamer) | igual |
| `Inicio` / `Fin` | primera / última | igual |
| número + `Enter` | ir a esa lámina | igual |
| `F5` / doble clic | entrar en presentación | — |
| `Esc` | cerrar la ayuda | salir de presentación |
| `T` | — | reloj y cronómetro |
| `B` / `W` | — | pantalla en negro / en blanco |
| `L` / `S` / `D` | — | puntero láser / foco / dibujo (`C` limpia, `Ctrl+Z` deshace) |
| `G` / `Tab` | cuadrícula de láminas | igual |
| `N` | modo nocturno | igual |
| `Ctrl+O` / `Ctrl+N` | abrir / abrir en ventana nueva | igual |
| `Ctrl+S` / `Ctrl+Mayús+G` | guardar / guardar como | — |
| `Ctrl+Mayús+S` | instantánea al portapapeles (arrastra un rectángulo) | — |
| `Ctrl+Mayús+P` | vista de presentador | igual |
| `Ctrl+,` | ajustes | igual |
| `Ctrl+F`, `Ctrl+P`, `+`, `-`, `r` | buscar, imprimir, zoom, rotar (pdf.js) | `r` anulada |
| `F1` | ayuda de teclas | ayuda de teclas |

Los clickers habituales envían `PgUp`/`PgDn`: funcionan sin configurar nada. En presentación, el contador «lámina X / Y · paso a / b» usa las etiquetas de página del PDF: con Beamer muestra el mismo número que el pie de la lámina (la portada es la 0) y «número + Enter» salta a esa etiqueta; en los pasos de una misma lámina la etiqueta se repite.

## Vista de presentador, notas y monitores

- `Ctrl+Mayús+P` (o Ver ▸ Vista de presentador) abre una segunda ventana con la lámina actual, la siguiente, el reloj, un cronómetro (`R` lo reinicia) y las notas. Las flechas en esa ventana también cambian de lámina.
- **Notas**: un archivo de texto junto al PDF llamado `<nombre>.pdf.notas.txt` con bloques `## N` (N = número de lámina, como lo imprime Beamer al pie), por ejemplo `## 3` seguido del texto.
- **Beamer con notas en la mitad derecha** (`\setbeameroption{show notes on second screen=right}`): en Ajustes ▸ Este documento marca «Páginas con las notas a la derecha»; en presentación se ve solo la mitad izquierda ampliada y el presentador muestra la derecha (limitación: la mitad izquierda se amplía al doble desde el ajuste de página, así que pierde algo de nitidez).
- **Dos pantallas**: al entrar en presentación la ventana se va sola a la pantalla que no es la principal (el proyector) y el presentador a la principal. Se puede fijar en Ajustes ▸ Pantallas.

## Transiciones, medidas e instantánea

- Las transiciones `/Trans` del PDF (`\transfade`, `\transwipe`, `\transsplitverticalin`… de Beamer) se reproducen en presentación; `R` (lo que Beamer escribe por defecto) es cambio instantáneo. Se desactivan en Ajustes.
- Ver ▸ Medir distancia / Medir área dibujan sobre la página en modo ventana con las unidades de Ajustes (mm, cm, in) y respetan `/UserUnit`; «Calibrar escala…» ajusta la escala de ese documento marcando un segmento conocido. `Esc` borra.
- `Ctrl+Mayús+S` copia al portapapeles el rectángulo que arrastres sobre la ventana.
- Guardar (`Ctrl+S`) escribe sobre el archivo abierto tras confirmar; «Guardar como…» abre el diálogo. Los editores de pdf.js (notas, firma, resaltado, texto, dibujo, imagen) están activos en la barra.

## Herramientas

El menú **Herramientas** opera sobre el documento abierto y **nunca lo sobrescribe**: cada herramienta guarda un archivo nuevo (se propone `<nombre> - <herramienta>.pdf` en la carpeta del documento) o pide una carpeta cuando salen varios archivos; después ofrece «Abrir el resultado». Todo corre en el equipo: pdf-lib y qpdf en un worker, tesseract.js para el OCR, el propio Electron para imprimir HTML. Un PDF cifrado hay que desbloquearlo antes de usar las demás herramientas.

| Herramienta | Qué hace | Resultado |
|---|---|---|
| Unir PDF… | Lista reordenable con el documento abierto más los PDF que añadas | un PDF |
| Dividir o extraer páginas… | Rangos (`1-3,5,8-`) a un PDF, cada N páginas, o una página por archivo | uno o varios PDF (`… - parte 01.pdf`) |
| Organizar páginas… | Miniaturas con arrastre; rotar, duplicar, quitar, insertar página en blanco | un PDF |
| Rotar páginas… | 90°, 180° o 270° sobre las páginas elegidas (se suma a la rotación que tengan) | un PDF |
| Números de página… | Texto con `{n}` y `{total}` en seis posiciones, tamaño y número inicial; Helvetica | un PDF |
| Marca de agua… | Texto (color, opacidad, ángulo, mosaico) o imagen PNG/JPG (otros formatos se convierten) | un PDF |
| Recortar páginas… | Marca un rectángulo sobre la página o escribe las medidas; cambia el CropBox | un PDF |
| PDF a imágenes… | PNG o JPEG por página a la resolución elegida; pide la carpeta al empezar y guarda cada imagen al salir | una carpeta (`… - página 01.png`) |
| Imágenes a PDF… | Una página por imagen (A4, Carta o el tamaño de la imagen); el formato se detecta por el contenido, las fotos con orientación EXIF se enderezan y las ilegibles se omiten con aviso | un PDF |
| Página web o HTML a PDF… | Una dirección http(s) (con internet) o un archivo `.html` local, impreso por Electron | un PDF |
| Aplanar formularios y anotaciones… | Los campos pasan a contenido fijo; opcionalmente quita todas las anotaciones | un PDF |
| Metadatos… | Título, autor, asunto, palabras clave y aplicación creadora (precarga los actuales) | un PDF |
| Proteger con contraseña… | AES-256 con contraseña de apertura y de propietario; permisos de imprimir, copiar y modificar | un PDF |
| Desbloquear PDF… | Quita el cifrado con la contraseña | un PDF |
| Reparar PDF… | qpdf reescribe el archivo; si faltan la xref o el trailer (archivo truncado) se reconstruyen, también con object streams (el formato de pdflatex, Word o Chrome); pdf-lib como último recurso. Un PDF cifrado hay que desbloquearlo antes. Permite elegir otro archivo, porque un PDF roto a menudo no abre | un PDF |
| OCR (texto en PDF escaneado)… | Reconoce el texto de cada página (español, inglés o ambos; 200 o 300 ppp) y lo añade como capa invisible (modo de texto invisible, también en páginas giradas o recortadas): el PDF queda buscable y copiable | un PDF |
| Comprimir… | Recodifica las fotos como JPEG (alta, media o baja) y recomprime la estructura con qpdf; si no baja al menos un 2 %, avisa y no guarda | un PDF |

- **OCR**: tarda unos 2–5 s por página a 200 ppp en un PC normal; los idiomas van dentro del programa (`recursos/tessdata`, 6 MB) y no se descarga nada. Un texto girado o muy pegado al borde se reconoce peor.
- **Cancelar** detiene la herramienta sin dejar archivos a medias.
- **Limitaciones**: al unir, dividir u organizar, los campos de formulario (incluidas las animaciones de `animate`, que son campos) se copian sin su formulario y dejan de funcionar en el resultado; «Comprimir» no toca imágenes con máscara, indexadas o de 1 bit, y solo cambia una imagen si el JPEG resultante pesa menos que ella en el archivo; «Reparar» no recupera contenido que ya no esté en el archivo.

## Videos dentro del PDF

liberadoPDF reproduce, **sin audio**, los videos que un PDF lleva incrustados o enlazados: anotaciones *RichMedia* (paquete `media9`, video incrustado), *Screen* (`movie15`) y *Movie* (`\movie` del paquete `multimedia` de Beamer, archivo junto al PDF). pdf.js no los muestra; liberadoPDF superpone un reproductor silenciado exactamente sobre el rectángulo, en ventana y en presentación, y lo sigue al cambiar el zoom.

- Arrancan solos y en bucle (Ajustes ▸ «Videos del PDF: reproducir solos» / «en bucle»); un clic sobre el video lo pausa o reanuda. Si la anotación trae sus propias opciones (`autostart`, `loop`), mandan ellas.
- Formatos: los de Chromium (H.264/MP4, VP9/WebM y AV1); HEVC no. Si no se puede decodificar, aparece un aviso sobre el rectángulo.
- Un video externo solo se busca en la carpeta del PDF o en sus subcarpetas.

Para meter un video en una presentación de Beamer:

```latex
\usepackage{multimedia}   % archivo externo: video.mp4 debe ir junto al PDF
\movie[autostart,loop,width=8cm,height=4.5cm]{\includegraphics[width=8cm]{poster.png}}{video.mp4}

\usepackage{media9}       % video incrustado en el PDF (no hace falta llevar el archivo aparte)
\includemedia[width=8cm,height=4.5cm,activate=pageopen,addresource=video.mp4,
  flashvars={source=video.mp4&autoPlay=true&loop=true}]{\includegraphics[width=8cm]{poster.png}}{VPlayer.swf}
```

Con `ffmpeg -i original.mp4 -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -movflags +faststart video.mp4` el video queda sin audio y en un formato que reproduce cualquier Chromium. Ese PDF seguirá sin moverse en Acrobat o Sumatra: la reproducción es cosa de liberadoPDF.

## Ajustes

`Ctrl+,` o Ver ▸ Ajustes…: avance automático, bucle, transiciones, color de fondo, cursor, pantallas, unidad de medida, modo nocturno, tema, idioma y videos. Se guardan en `data\config.json` junto al ejecutable (modo portable; en `data\` queda también la caché de Chromium). Si esa carpeta no se puede escribir, en `%APPDATA%\liberadoPDF\config.json`.

```json
{
  "presentacion": { "avanceSegundos": 0, "bucle": false, "transiciones": true, "fondo": "#000000", "ocultarCursor": true },
  "unidadMedida": "mm",
  "nocturno": false,
  "tema": "sistema",
  "monitorPresentacion": "auto",
  "monitorPresentador": "auto",
  "barra": { "presentationMode": true },
  "idioma": "en",
  "video": { "autoarranque": true, "bucle": true },
  "porDocumento": { "C:\\Charlas\\charla.pdf": { "notasDerecha": true, "calibracion": 1 } }
}
```

El archivo de notas (`<nombre>.pdf.notas.txt`) debe guardarse en UTF-8 (el Bloc de notas moderno lo hace; uno antiguo en ANSI estropea las tildes).

- `avanceSegundos`: avanzar solo cada N segundos en presentación (0 = no).
- `bucle`: al terminar, volver a la primera lámina (modo quiosco).
- `fondo`: color alrededor de la lámina en presentación.
- `ocultarCursor`: ocultar el cursor tras 2 s sin moverlo.

## Construir desde WSL o Linux

Requisitos: Node 24, una pantalla (WSLg) para la prueba de humo, Python 3 con Pillow (icono y PDF de ejemplo escaneado y de fotos), ffmpeg (video de prueba, `scripts/generar_video.sh`), y para los PDF de ejemplo un TeX Live con `beamer`, `tikz`, `animate`, `graphicx`, `multimedia` y `media9`.

En Linux/WSLg Electron se lanza con `ELECTRON_DISABLE_SANDBOX=1` (lo ponen `npm start`, `npm run humo` y los scripts): no hay sandbox setuid, y añadir `no-sandbox` desde el código rompe la impresión a PDF.

```bash
npm install
npm test            # pruebas unitarias (node --test)
npm run humo        # prueba de humo (39 fases): visor, presentación, presentador, idioma, video y una fase por herramienta; genera sus PDF de prueba
npm run construir   # dist/liberadoPDF-win32-x64(.zip), dist/liberadoPDF-linux-x64(.tar.gz) y dist/liberadoPDF-darwin-{arm64,x64}.zip; scripts/construir.sh win32|linux|darwin para uno solo
scripts/humo_windows.sh                                         # prueba de humo sobre el .exe, lanzado desde WSL
scripts/humo_windows.sh presentacionAnimada "ruta/al/pdf" 11    # ¿la animación de la página 11 corre en presentación?
scripts/humo_windows.sh guardar | cuadricula | presentador | cierre   # otras fases sobre el .exe
scripts/humo_windows.sh unir | proteger | ocr | comprimir               # herramientas sobre el .exe
scripts/humo_linux.sh basica | video | …                                # las mismas fases sobre el paquete de Linux
```

El icono del `.exe` lo pone `wine` (si está instalado) o `rcedit-x64.exe` en `~/tools/rcedit/` ejecutado por interop de WSL ([electron/rcedit](https://github.com/electron/rcedit/releases)). Sin ninguno de los dos, el ejecutable queda con el icono por defecto de Electron.

Los paquetes de macOS también se construyen en Linux (en una carpeta temporal del sistema de archivos de Linux, porque los frameworks de Electron están hechos de enlaces simbólicos que `/mnt/c` rompería). Si [`rcodesign`](https://github.com/indygreg/apple-platform-rs/releases) está en el `PATH`, el script los firma ad-hoc; sin él, cada usuario los firma en su Mac como se explica arriba. No hay notarización de Apple (exige una cuenta de desarrollador de pago).

## Estructura

- `src/main/`: proceso principal de Electron (protocolo `liberadopdf://`, ventanas, menú, IPC, configuración, prueba de humo).
- `src/preload/preload.cjs`: puente seguro hacia el renderer e inyección de la capa propia sobre el visor de pdf.js.
- `src/renderer/`: la capa de liberadoPDF sobre el visor (teclas, presentación, contador, ayuda) y la pantalla de inicio; `herramientas/` tiene un módulo por herramienta, el diálogo base y el worker (`trabajador.mjs`, con pdf-lib y qpdf).
- `src/comun/`: lógica pura, probada con `node --test` (`herramientas/` para rangos, nombres, estampado, recorte, imágenes, reparación, OCR y compresión; `i18n.mjs` + `i18n/en.mjs` para el idioma; `video.mjs` para los videos).
- `recursos/`: PDF de ejemplo (animado, transiciones, notas, escaneado, fotos), icono, `linux/` (lanzador), `macos/` (icono `.icns` y `Info.plist` extra) y `tessdata/` (idiomas del OCR).
- `vendor/pdfjs/`: pdf.js 6.4.299 tal cual (no se modifica).
- `docs/superpowers/`: diseño y planes.

## Pendiente

- Herramientas 54–59 del plan: PDF ↔ Office (Word, Excel, PowerPoint), editar texto, redactar (tachar contenido), comparar PDF, PDF/A y escanear desde cámara.
- Abrir «Herramientas ▸ Reparar» desde la pantalla de inicio (hoy hace falta tener un PDF abierto y elegir el archivo roto desde el diálogo).
- Fuera de alcance: leer en voz alta, audio, video externo por URL, Flash y 3D, validación de firmas digitales.
- macOS: los paquetes se construyen pero aún no se han probado en un Mac real.

## Licencia

MIT. pdf.js se distribuye en `vendor/pdfjs/` bajo Apache 2.0 (ver `vendor/pdfjs/LICENSE`). Las herramientas usan pdf-lib (MIT), qpdf-wasm (Apache 2.0, qpdf) y tesseract.js / tesseract.js-core (Apache 2.0); los datos de idioma `tessdata_fast` son Apache 2.0 (ver `recursos/tessdata/LICENSE.txt`).
