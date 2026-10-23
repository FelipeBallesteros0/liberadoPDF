# liberadoPDF: diseño

Fecha: 2026-10-23. Autor: Felipe Ballesteros con Claude. Estado: revisado por un constructor independiente el 2026-10-23; pendiente de aprobación de Felipe.

## 1. Intención

liberadoPDF es un visor y presentador de PDF para Windows, portable (una carpeta con `liberadoPDF.exe` que corre desde un pendrive sin instalar nada), que reproduce las animaciones del paquete LaTeX `animate` igual que Adobe Acrobat Reader. Nace porque la presentación del paper InMoov para IEEE ICA-ACCA 2026 (Concepción, 9–11 de diciembre de 2026) lleva un video incrustado con `animate`, y ninguno de los visores instalados en el PC de Felipe (Chrome, SumatraPDF) ni, previsiblemente, el del congreso, lo reproduce.

**Por qué no basta con instalar Acrobat**: en el PC del congreso no se puede instalar nada, y Felipe quiere una herramienta propia, libre y reutilizable para sus charlas (Beamer) y las de su equipo.

**Datos del PDF del congreso** (`Desktop\inmoov\presentacion_icaacca2026.pdf`, 5 MB, 14 páginas, Beamer Metropolis 16:9): la animación va en la página 11 (`\animategraphics[autoplay,loop,poster=96]{8}{...}{0}{171}`, 172 widgets ocultos más el widget `anm0` con acciones `/PO /PC /PV /PI /D /U`); todas las páginas traen `/Trans << /S /R >>`; `/PageMode /UseOutlines`; `/PageLabels` «0»…«12» (las dos últimas páginas comparten «12»); sin OCG. El repositorio público llevará un PDF de ejemplo pequeño generado con `animate`, no la presentación del congreso.

**Hecho verificado el 2026-10-23**: el visor genérico de pdf.js 6.4.299 cargado dentro de Electron 45 reproduce las animaciones de `animate` sin ningún código extra (su sandbox de JavaScript implementa `app.setInterval`, `getField`, `display`, y dispara las acciones de apertura y cierre de página). Por tanto, liberadoPDF no implementa un motor de animaciones ni de JavaScript: envuelve ese visor y le añade la experiencia de presentación y las funciones listadas abajo.

## 2. Metas, no-metas y antimetas

**Metas (éxito)**

1. La presentación `presentacion_icaacca2026.pdf` corre a pantalla completa, en bucle, en un PC Windows 10/11 cualquiera, desde el pendrive, sin instalar nada, y se navega con flechas, PgUp/PgDn y clicker.
2. Abre un PDF en menos de 3 s en un portátil normal, medidos desde el doble clic en el ejecutable (en disco o en un pendrive USB 3) hasta que se ve la primera página. Desde un pendrive USB 2.0 el primer arranque de Electron (~200 MB) puede tardar más: el README lo advierte y recomienda copiar la carpeta al disco. La prueba de humo cronometra desde el lanzamiento hasta el primer `pagerendered`.
3. Ofrece lo que trae Acrobat Reader gratuito para ver, navegar, presentar, rellenar y anotar (lista en §4), más herramientas de presentador que Acrobat no tiene.
4. Código libre (MIT), en español, mantenible por Felipe sin Claude.

**No-metas (v1, quedan documentadas como «Pendiente» en el README)**

- Leer en voz alta (14).
- Video y audio incrustados con media9 / RichMedia (23) y 3D (24).
- Validar firmas digitales con certificado (28).
- Comparar dos PDF (30).
- Editar el contenido del PDF (texto, imágenes), organizar o combinar páginas, exportar a otros formatos, OCR, nube, revisión compartida, IA.
- Empaquetado para macOS o Linux (el código corre en ambos, pero solo se construye y prueba el ejecutable de Windows x64).
- Una vista de presentador «perfecta»: v1 muestra lámina actual, siguiente, reloj, cronómetro y notas; nada más.

**Antimetas (si pasa esto, el proyecto fracasó aunque «funcione»)**

- Que haya que instalar algo en el PC destino (runtime, fuentes, VC++ redistributable).
- Que la animación se vea a tirones por debajo de la tasa de fotogramas del PDF (8 fps en el caso de uso) o que no arranque sola al llegar a la lámina.
- Que una tecla del clicker (PgUp/PgDn) haga algo distinto de cambiar de lámina.
- Que el visor «mejore» el PDF por su cuenta: no reinterpreta nada; lo que el PDF dice (autoplay, bucle, fotograma de portada, transiciones) se respeta.
- Que el proyecto dependa de una copia modificada de pdf.js: pdf.js va tal cual (vendored, sin parches), para poder actualizarlo.

## 3. Restricciones

- Carpeta del proyecto: `C:\Users\Felipe\Desktop\liberadoPDF` (en WSL, `/mnt/c/Users/Felipe/Desktop/liberadoPDF`). Repositorio git ahí; publicable en GitHub.
- Desarrollo desde WSL2 (Ubuntu 26.04) con Node 24 (`~/tools/node`); hay pantalla WSLg, así que Electron corre en Linux para probar. El ejecutable final es Windows x64, construido desde WSL.
- Electron 45.x, pdf.js 6.4.299 (visor genérico prebuilt, `pdfjs-6.4.299-dist.zip`), `pdf-lib` 1.17 para leer diccionarios que pdf.js no expone (`/Trans`). Sin frameworks de UI: HTML, CSS y JavaScript (módulos ES) a mano.
- Idioma de la interfaz, del código (comentarios, nombres de archivo), del README y de los commits: español. Nombres de variables en español sin tildes.
- No hay `wine` en WSL. Si poner el icono al `.exe` exige wine, el ejecutable queda con el icono por defecto de Electron y se documenta cómo ponerlo.
- La configuración y los recientes se guardan en `data/config.json` junto al ejecutable cuando esa carpeta es escribible (modo portable); si no (p. ej. ejecutable en `Program Files`), en `%APPDATA%\liberadoPDF\config.json`.
- Sin telemetría, sin red: la aplicación no hace ninguna petición a internet. Los enlaces externos se abren en el navegador del sistema, nunca dentro de la aplicación.

## 4. Funcionalidades (alcance v1)

La numeración es la de la lista acordada con Felipe el 2026-10-23. «pdf.js» = la trae el visor genérico y liberadoPDF solo la deja a la vista; «propia» = la escribe liberadoPDF.

### 4.1 Ver y navegar (ventana normal)

| # | Función | Origen | Notas |
|---|---|---|---|
| 1 | Ir a página, siguiente/anterior, inicio/fin | pdf.js | Barra de pdf.js visible en modo ventana. |
| 2 | Zoom: ajustar página, ancho, tamaño real, porcentaje | pdf.js | |
| 3 | Modos de página: una, continua, dos páginas | pdf.js | Menú de pdf.js (scroll y spread modes). |
| 4 | Rotar la vista | pdf.js | Teclas `r` / `Shift+r` de pdf.js. |
| 5 | Buscar texto | pdf.js | `Ctrl+F`. |
| 6 | Panel lateral: miniaturas, índice, adjuntos, capas | pdf.js | `F4` o botón. |
| 7 | Enlaces internos y externos, historial atrás/adelante | pdf.js + propia | Los externos se abren con `shell.openExternal`; nunca navega la ventana. `Alt+←/→` historial. |
| 8 | Seleccionar y copiar texto | pdf.js | |
| 9 | PDF con contraseña | pdf.js | Diálogo de pdf.js. |
| 10 | Propiedades del documento | pdf.js | |
| 11 | Imprimir | pdf.js + Electron | `Ctrl+P` usa el diálogo de impresión de Electron. |
| 12 | Recientes y varias ventanas | propia | Pantalla de inicio con «Abrir PDF», arrastrar y soltar, y los últimos 10 abiertos (ruta, nombre, fecha; se descartan los que ya no existen). Cada PDF abre en su ventana; `Ctrl+O` abre en la misma ventana, `Ctrl+N` en una nueva. Doble clic, «Abrir con…» y argumentos de línea de comandos abren ventanas nuevas; una segunda instancia se reenvía a la primera (`requestSingleInstanceLock`). |
| 13 | Modo nocturno | propia | Tecla `N` y menú: `filter: invert(1) hue-rotate(180deg)` sobre el contenedor de páginas; la interfaz de pdf.js pasa a su tema oscuro. Se recuerda en config. |
| 15 | Instantánea | propia | Menú o `Ctrl+Shift+S`: el cursor pasa a cruz, se arrastra un rectángulo sobre la página, la zona se copia al portapapeles como PNG (`clipboard.writeImage`) a la resolución renderizada, y se avisa con un toast de 2 s. |

### 4.2 Presentar e interactuar

| # | Función | Origen | Notas |
|---|---|---|---|
| 16 | Pantalla completa, una lámina por pantalla, fondo negro | pdf.js | Modo presentación de pdf.js (`requestPresentationMode`), activado con `F5`, doble clic o menú; `Esc` sale. |
| 17 | Animaciones `animate` y JavaScript de formularios | pdf.js | Verificado. `enableScripting` queda forzado a `true`. Al cambiar de lámina el propio PDF pausa y vuelve al fotograma de portada; liberadoPDF no interfiere. Un clic sobre la animación pausa/reanuda (lo hace el PDF). |
| 18 | Transiciones entre páginas | propia | Se leen los diccionarios `/Trans` de cada página con `pdf-lib` al abrir el documento (si el PDF está cifrado y pdf-lib no lo abre, no hay transiciones). En modo presentación, al cambiar de página se superpone una imagen de la página saliente (del canvas ya renderizado) y se anima con CSS según `/S`: `Fade` y `Dissolve` → opacidad; `Wipe`, `Split`, `Box`, `Blinds` → `clip-path` con la dirección `/Di` y `/Dm`; `Push`, `Cover`, `Uncover`, `Fly` → `transform`; `Glitter` → como `Fade`; **`R` (Replace) → cambio instantáneo, sin efecto y sin esperar `/D`**, como manda la norma PDF y hace Acrobat. Esto importa porque Beamer escribe `/Trans << /S /R >>` en todas sus páginas: un Beamer normal no tiene transiciones y la lámina animada arranca al instante. Duración `/D` (por defecto 1 s) solo para los demás tipos. Un ajuste permite desactivarlas. Este módulo no forma parte de la primera entrega (§6). |
| 19 | Avance automático y bucle | propia | Ajustes (§4.4): «Avanzar cada N segundos» (0 = no) y «Volver a la primera lámina al terminar». Solo actúan en modo presentación. Cualquier tecla de navegación reinicia la cuenta. |
| 20 | Color de fondo y cursor | propia | Ajustes: color de fondo del modo presentación (negro por defecto; variable CSS sobre el contenedor de pdf.js) y «ocultar el cursor tras 2 s sin moverlo» (activo por defecto). |
| 21 | Rellenar formularios (AcroForm y XFA) | pdf.js | `enableXfa: true`. |
| 22 | Guardar con lo rellenado o anotado | pdf.js + propia | Botón «Guardar» de pdf.js y `Ctrl+S`. Electron intercepta la descarga (`session.on('will-download')`) y guarda sobre la misma ruta del archivo abierto previa confirmación; «Guardar como…» (menú) abre el diálogo de guardado. |

### 4.3 Comentar, firmar, medir

| # | Función | Origen | Notas |
|---|---|---|---|
| 25 | Resaltar, texto libre, dibujo a mano, sellos/imágenes | pdf.js | Editores de pdf.js en la barra (modo ventana). |
| 26 | Notas adhesivas y respuestas en hilo | pdf.js | Opción `enableComment: true` de pdf.js 6.4 (existe en el visor vendored). Se verifica al construir; las notas existentes se ven y responden con los popups de pdf.js. |
| 27 | Firma dibujada, escrita o con imagen | pdf.js | Opción `enableSignatureEditor: true`. No es firma criptográfica. |
| 29 | Medición: distancia y área | propia | Herramienta en el menú: capa SVG sobre la página actual. Escala por defecto: unidades de usuario del PDF (1/72 in, por `/UserUnit` si existe) mostradas en mm, cm o in (ajuste). «Calibrar»: se marca un segmento y se escribe su longitud real; la escala se guarda por documento en config (por ruta). Distancia: dos clics; área: polígono cerrado con doble clic. Las medidas no se escriben en el PDF (solo se muestran; `Esc` las borra). |

### 4.4 Presentador (propias; Acrobat no las tiene)

| # | Función | Notas |
|---|---|---|
| 31 | Vista de presentador | Menú o `Ctrl+Shift+P`: segunda ventana (en el otro monitor si lo hay) con lámina actual, lámina siguiente, reloj, cronómetro (empieza al activarla; `R` lo reinicia) y notas. Renderiza con `pdfjs-dist` (API, no el visor) a escala de miniatura y sigue a la ventana principal por IPC. **Monitores**: con dos o más pantallas, al entrar en presentación `ventanas.js` mueve la ventana del visor a la pantalla que no es la principal (el proyector) antes de pedir pantalla completa, y la vista de presentador va a la principal (el portátil), como hacen pdfpc y PowerPoint; con una sola pantalla todo queda donde está. Un ajuste «monitor de la presentación» (automático / elegir) permite forzarlo, por ejemplo cuando Windows tiene el proyector como pantalla principal. Notas: (a) si el PDF es de Beamer con `show notes on second screen` (páginas de doble ancho), ajuste «páginas con notas a la derecha»: la ventana principal muestra la mitad izquierda y la vista de presentador la mitad derecha; (b) si existe `nombre.pdf.notas.txt` junto al PDF, con bloques `## 3` (número de lámina por etiqueta, §4.4·36) seguidos de texto, se muestra el bloque de la lámina actual. |
| 32 | Reloj y cronómetro en pantalla | Tecla `T` en modo presentación: muestra u oculta, en la esquina inferior derecha, hora y tiempo transcurrido, pequeño y semitransparente. |
| 33 | Pantalla en negro o blanco | `B` y `W` en modo presentación; cualquier tecla o clic vuelve. |
| 34 | Puntero láser, foco y dibujo | En modo presentación: `L` punto rojo que sigue al ratón; `S` foco (oscurece todo salvo un círculo alrededor del cursor); `D` dibujo libre con el ratón sobre una capa propia (rojo, 3 px; `Ctrl+Z` deshace, `C` limpia; se borra al cambiar de lámina y no se guarda en el PDF). El editor de tinta de pdf.js sigue disponible en modo ventana para anotar de verdad. |
| 35 | Cuadrícula de láminas | `G` o `Tab`: rejilla de miniaturas de todas las páginas (render propio con pdfjs-dist, caché por documento); clic o `Enter` salta; `Esc` cierra. Disponible en ambos modos. |
| 36 | Láminas de Beamer con pasos | Si el PDF trae `/PageLabels`, el contador muestra «lámina 10 / 12 · paso 2 / 3» y «escribir un número + Enter» salta a la primera página con esa etiqueta. `→` avanza una página (un paso); `Shift+→` / `Shift+←` saltan al siguiente/anterior grupo de etiqueta. Sin etiquetas, todo es por página. |

### 4.5 Teclas (resumen; las de pdf.js se mantienen)

| Tecla | Ventana | Presentación |
|---|---|---|
| `→` `↓` `PgDn` `Espacio` `Enter` | página siguiente | página siguiente |
| `←` `↑` `PgUp` `Retroceso` | página anterior | página anterior |
| `Shift+→` / `Shift+←` | siguiente / anterior lámina (por etiqueta) | igual |
| `Home` / `End` | primera / última | igual |
| número + `Enter` | ir a lámina | igual (se muestra el número tecleado 1 s) |
| `F5` / doble clic | entrar en presentación | — |
| `Esc` | cerrar cuadrícula / cancelar herramienta | salir de presentación |
| `G` / `Tab` | cuadrícula | cuadrícula |
| `N` | modo nocturno | modo nocturno |
| `T` | — | reloj y cronómetro |
| `B` / `W` | — | pantalla negra / blanca |
| `L` / `S` / `D` | — (en ventana `s` sigue siendo «selección» de pdf.js) | láser / foco / dibujo |
| `C` / `Ctrl+Z` | — | limpiar / deshacer dibujo |
| `Ctrl+O` / `Ctrl+N` | abrir / abrir en ventana nueva | igual |
| `Ctrl+S` | guardar | — |
| `Ctrl+Shift+S` | instantánea | — |
| `Ctrl+Shift+P` | vista de presentador | igual |
| `Ctrl+,` | ajustes | — |
| `F1` | ayuda de teclas | ayuda de teclas |

Los clickers habituales envían `PgUp`/`PgDn` (algunos `F5`/`Esc` y `b`): todos quedan cubiertos.

**Prioridad de teclas.** Las de liberadoPDF mandan: `teclas.mjs` escucha `keydown` en fase de captura y detiene la propagación de las teclas que define, antes de que las vea pdf.js. pdf.js usa por su cuenta `n`/`j` (siguiente), `p`/`k` (anterior), `s` (selección), `h` (mano) y `r`/`Shift+r` (rotar). Resolución: en **ambos modos** `n` pasa a ser modo nocturno (pdf.js pierde ese atajo; `→` y `PgDn` cubren «siguiente»); en **presentación** se anulan además `r`, `Shift+r`, `h` y `s` de pdf.js (girar la lámina en plena charla es un accidente, no una función) y `s` pasa a ser foco; en **ventana** `s`, `h` y `r` conservan su significado de pdf.js y el foco no existe. `j`, `k`, `p` siguen siendo de pdf.js. La ayuda `F1` muestra exactamente esta tabla.

### 4.6 Ajustes (`Ctrl+,`, diálogo propio; se guardan en `config.json`)

Avance automático (segundos, 0 = no) · bucle al terminar · transiciones (sí/no) · color de fondo de presentación · ocultar cursor · unidad de medida (mm/cm/in) · páginas con notas a la derecha (por documento) · modo nocturno · tema de la interfaz (sistema/claro/oscuro) · monitor de la presentación y de la vista de presentador (automático/elegir).

## 5. Cómo se hace (decisiones tomadas)

### 5.1 Arquitectura

```
liberadoPDF/
├── package.json              # electron, @electron/packager, pdf-lib, pdfjs-dist (solo API para miniaturas)
├── src/
│   ├── main/                 # proceso principal de Electron
│   │   ├── main.js           # ciclo de vida, ventanas, instancia única, argumentos, menú
│   │   ├── ventanas.js       # crear ventana de visor / de presentador / de inicio
│   │   ├── config.js         # lectura/escritura de config.json (portable o AppData)
│   │   ├── recientes.js      # lista de recientes
│   │   └── ipc.js            # canales IPC (abrir, guardar, portapapeles, enlaces externos, pantallas)
│   ├── preload/
│   │   └── preload.js        # contextBridge: window.liberadopdf.{abrir, guardar, ...}
│   ├── renderer/
│   │   ├── visor.html        # copia de vendor/pdfjs/web/viewer.html con rutas a ../../vendor y <script> propio
│   │   ├── visor.css         # capa de liberadoPDF sobre el visor (ocultar barra en presentación, overlays)
│   │   ├── visor.mjs         # punto de entrada: espera a PDFViewerApplication, instala módulos
│   │   ├── teclas.mjs        # mapa de teclas de §4.5
│   │   ├── presentacion.mjs  # autoavance, bucle, fondo, cursor, reloj, negro/blanco
│   │   ├── transiciones.mjs  # lectura de /Trans (pdf-lib) y animación CSS
│   │   ├── punteros.mjs      # láser, foco, dibujo
│   │   ├── cuadricula.mjs    # rejilla de miniaturas
│   │   ├── etiquetas.mjs     # /PageLabels → láminas y pasos
│   │   ├── medicion.mjs      # distancia y área
│   │   ├── instantanea.mjs   # recorte al portapapeles
│   │   ├── ajustes.mjs       # diálogo de ajustes
│   │   ├── inicio.html/.mjs  # pantalla de inicio (abrir, recientes, arrastrar)
│   │   └── presentador.html/.mjs # vista de presentador
│   └── comun/                # lógica pura y testeable (sin DOM): etiquetas, notas, transiciones, config
├── vendor/pdfjs/             # pdfjs-6.4.299-dist tal cual (build/ y web/), con su LICENSE
├── test/                     # node:test para src/comun + prueba de humo con Electron
├── recursos/                 # icono (png, ico), PDF de ejemplo con animación
├── scripts/                  # construir.sh (empaquetado Windows), humo.sh
├── README.md
└── LICENSE                   # MIT
```

- **Un proceso principal, una ventana por PDF**. La ventana de visor carga `src/renderer/visor.html`, que es el `viewer.html` de pdf.js con dos cambios: rutas a `vendor/pdfjs/` y una etiqueta `<script type="module" src="visor.mjs">` al final. `vendor/pdfjs` no se toca.
- **Acceso a pdf.js**: por el global `PDFViewerApplication` y `AppOptions` del visor genérico (mundo principal). `visor.mjs` espera a `PDFViewerApplication.initializedPromise`, fija opciones (`enableScripting`, `enableXfa`, `enableComment`, `enableSignatureEditor`, `locale: es-ES`, `disablePreferences: true` para que mande nuestro config) y abre el archivo recibido por IPC con `PDFViewerApplication.open({url})`. Se escucha el `eventBus` (`pagechanging`, `pagerendered`, `presentationmodechanged`, `documentloaded`).
- **Seguridad de Electron**: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` solo si pdf.js lo exige (verificar), `webSecurity` activo; el visor se sirve con un protocolo propio `liberadopdf://` registrado como estándar y seguro, que mapea a `src/renderer` y `vendor/pdfjs`; los PDF se sirven por el mismo protocolo (`liberadopdf://archivo/<ruta codificada>`) para evitar problemas de origen `file://`. Navegación y `window.open` bloqueadas; los enlaces `http(s)`, `mailto` van a `shell.openExternal`.
- **Transiciones y etiquetas**: `pdf-lib` carga el archivo en el renderer (bytes vía IPC) solo para leer `/Trans` por página; `/PageLabels` se obtiene de `pdfDocument.getPageLabels()` de pdf.js.
- **Vista de presentador**: segunda `BrowserWindow` con `presentador.html`; recibe por IPC `{ruta, pagina, totalPaginas, etiquetas, notas}` y renderiza con `pdfjs-dist` (API `getDocument`) a escala reducida, con caché de canvases.
- **Config**: `config.js` elige la carpeta (portable si `data/` junto a `process.execPath` es escribible; si no, `app.getPath('userData')`), escribe de forma atómica (archivo temporal + rename) y valida con valores por defecto.
- **Empaquetado**: `@electron/packager --platform=win32 --arch=x64 --asar` genera `dist/liberadoPDF-win32-x64/`; `scripts/construir.sh` además comprime a `dist/liberadoPDF-win32-x64.zip`. El icono `.ico` se aplica si hay `wine`; si no, se documenta. El PDF de ejemplo con animación se copia a `dist/` para probar en Windows.
- **Pruebas**: `npm test` corre `node --test test/` sobre `src/comun` (etiquetas → láminas/pasos, parser de notas, mapeo de `/Trans` a animaciones, config con valores por defecto y rutas, recientes). `npm run humo` lanza Electron en WSLg con `recursos/ejemplo_animado.pdf`, entra en presentación, captura pantallazos separados 1 s y comprueba que la zona de la animación cambia; comprueba también que `PgDn` cambia de página. La prueba de humo es la puerta antes de cada empaquetado.

### 5.2 Comportamiento al abrir

1. Sin argumentos: pantalla de inicio (recientes, «Abrir PDF», zona de arrastre).
2. Con ruta de PDF (doble clic, «Abrir con…», arrastre sobre el `.exe`): ventana de visor con ese PDF, ajustado a la página, en modo ventana. Si el PDF trae `/PageMode /FullScreen` (Beamer no lo pone), entra en presentación directamente.
3. Si el archivo no existe o no es PDF: mensaje en la pantalla de inicio, no un diálogo modal.
4. Al cerrar la última ventana la aplicación termina (Windows).

### 5.3 Rendimiento

- Precarga de la página siguiente (pdf.js ya lo hace en presentación).
- Miniaturas de la cuadrícula y del presentador se generan en segundo plano tras abrir, a 160 px de ancho, y se cachean en memoria por documento.
- La imagen de la página saliente para transiciones se toma con `canvas.toDataURL` solo si las transiciones están activas y el PDF tiene `/Trans`.

## 6. Lo que queda al constructor

- Estructura exacta de `config.json`, nombres de canales IPC, estilo visual de los overlays (discretos, tipografía del sistema, acento azul `#0077B6`).
- Cómo detectar si pdf.js necesita `sandbox: false` en el renderer y la forma concreta del protocolo `liberadopdf://`.
- Orden de construcción, siempre que la primera entrega funcional sea: abrir PDF + presentación + animación + teclas + recientes + empaquetado Windows (eso es lo que Felipe necesita para el congreso); el resto se añade después, función por función, cada una con su prueba.
- Elegir cómo pintar cada transición exótica mientras respete la duración.
- Decidir si la vista de presentador usa una segunda instancia del visor genérico o la API de pdfjs-dist (la API es la sugerida).

## 7. Pendiente (fuera de v1, documentado en el README)

14 leer en voz alta · 23 video y audio incrustados · 24 3D · 28 validación de firmas digitales · 30 comparar PDF · empaquetado macOS/Linux · icono del `.exe` si no hay wine.
