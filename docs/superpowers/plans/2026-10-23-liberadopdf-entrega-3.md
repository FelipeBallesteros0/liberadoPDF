# liberadoPDF, entrega 3: herramientas de archivo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las 17 herramientas de §8 de la especificación (37–53): unir, dividir, organizar, rotar, numerar, marca de agua, recortar, PDF ↔ imágenes, HTML → PDF, aplanar, metadatos, proteger, desbloquear, reparar, OCR y comprimir; todo en local, siempre a un archivo nuevo.

**Architecture:** Un menú «Herramientas» abre diálogos propios (`src/renderer/herramientas/*.mjs`) que recogen opciones y delegan en un Web Worker (`src/renderer/herramientas/trabajador.mjs`) que carga pdf-lib y qpdf-wasm desde el protocolo y devuelve bytes y progreso; OCR usa tesseract.js con su propio worker; PDF → imágenes y HTML → PDF usan pdf.js y Electron. La lógica sin DOM (rangos, nombres, formatos, colocación de texto OCR, decisiones de compresión) vive en `src/comun/herramientas/` y se prueba con `node --test`. Cada herramienta tiene una fase de humo con un PDF generado.

**Tech Stack:** pdf-lib 1.17.1, `@neslinesli93/qpdf-wasm` 0.3.0, tesseract.js 7.0.0 + tesseract.js-core, tessdata_fast (spa, eng), pdf.js vendored, Electron `printToPDF`, PIL (generación de PDFs de prueba).

**Spec:** `docs/superpowers/specs/2026-10-23-liberadopdf-design.md` §8.

## Global Constraints

- Nunca se sobrescribe el documento abierto: resultado a archivo nuevo (`guardar-resultado`) o carpeta (`guardar-resultados`); en modo humo, `LIBERADOPDF_HUMO_GUARDAR` (archivo) y `LIBERADOPDF_HUMO_CARPETA` (carpeta) sin diálogos.
- Nada pesado en el hilo principal del renderer: pdf-lib y qpdf en `trabajador.mjs` (Web Worker), tesseract en su worker; progreso y cancelación en todas las operaciones por página.
- Sin red: motores y datos de idioma empaquetados; `46` carga la URL que escribe el usuario y nada más.
- Las raíces nuevas del protocolo (`/lib/qpdf/`, `/lib/tesseract/`, `/lib/tesseract-core/`, `/tessdata/`) solo sirven esas carpetas; `registrarArchivo` solo registra rutas que el usuario eligió con un diálogo o el documento abierto.
- Nombres de resultado: `<nombre sin .pdf> - <herramienta>.pdf` (`nombreResultado`), partes `… - parte 01.pdf`, imágenes `… - página 001.png`.
- Idioma español en interfaz, código y commits; las entradas del menú llevan el número de la herramienta en su etiqueta de ayuda (F1) para rastrear la especificación.

## Review Focus

1. Rangos de páginas escritos mal («0», «5-2», «a», «1-999», vacío): `analizarRangos` devuelve páginas válidas o un error legible; nunca una operación con páginas fuera del documento; pruebas en Tarea 1.
2. Un PDF cifrado abierto con contraseña en pdf.js y luego pasado a pdf-lib: pdf-lib no descifra; las herramientas que lo necesiten avisan «Primero desbloquéalo (herramienta 50)» en vez de fallar en silencio; prueba en Tarea 2 (`faseCifrado`).
3. Cancelar a mitad de OCR o compresión: no queda archivo a medias ni worker colgado; pruebas en Tareas 9 y 10 (`cancelar` → el worker termina y no se guarda nada).
4. Imágenes con nombre `.jpg` que no son JPEG (o PNG con transparencia, o formatos BMP/WebP): 45 las pasa por canvas; si no se pueden decodificar se omiten con aviso; prueba en Tarea 6.
5. Comprimir un PDF sin imágenes o ya comprimido: el resultado no debe ser mayor; si no baja, no se guarda y se avisa; prueba en Tarea 10.

---

### Task 1: Infraestructura de herramientas

**Files:**
- Create: `src/comun/herramientas/rangos.mjs`, `src/comun/herramientas/nombres.mjs`, `src/renderer/herramientas/base.mjs`, `src/renderer/herramientas/trabajador.mjs`, `src/renderer/herramientas/cliente.mjs`
- Modify: `src/main/main.js` (raíces), `src/main/protocolo.js` (`registrarArchivo`, MIME por extensión en `/pdf/<token>`), `src/main/ipc.js`, `src/preload/preload.cjs`, `src/main/menu.js`, `src/renderer/visor.mjs`, `src/renderer/visor.css`, `scripts/construir.sh`, `package.json`
- Test: `test/herramientas-rangos.test.mjs`, `test/herramientas-nombres.test.mjs`

**Interfaces:**
- Produces:
  - `rangos.mjs`: `export function analizarRangos(texto, total)` → `{ paginas: number[] }` (1-based, ordenadas, sin repetidos) o `{ error: string }`; admite `"1-3,5,8-"` (abierto = hasta el final), espacios, y vacío = todas; errores: «Rango vacío», «Página fuera del documento: 999», «Rango inválido: 5-2», «No entiendo: a». `export function dividirCada(total, n)` → `number[][]` (bloques de n páginas). `export function formatearRangos(paginas)` → `"1-3,5"`.
  - `nombres.mjs`: `export function nombreResultado(ruta, herramienta, extension = 'pdf')` → `<base> - <herramienta>.<ext>` (sin carpeta); `export function nombreParte(ruta, indice, total)` → `<base> - parte 01.pdf` (ceros según `total`); `export function nombreImagen(ruta, pagina, total, formato)` → `<base> - página 001.png`.
  - `protocolo.js`: `export function registrarArchivo(ruta)` → token (mismo mapa que los PDF; `/pdf/<token>` responde con `mimeDe(ruta)`); `urlDeToken(token)` → `liberadopdf://app/pdf/<token>`.
  - `ipc.js`: `'elegir-archivos'({ filtros, varios })` → `[{ ruta, nombre, url }]` (diálogo del sistema; se registran tokens); `'elegir-carpeta'()` → ruta o null; `'guardar-resultado'({ nombre, bytes })` → ruta guardada o null (diálogo «Guardar como» con `defaultPath` junto al documento; `Buffer.from(bytes)`); `'guardar-resultados'({ archivos: [{ nombre, bytes }] })` → carpeta o null (diálogo de carpeta; escribe todos; si alguno existe, añade ` (2)`); `'abrir-resultado'(ruta)` → ventana nueva. En modo humo, `LIBERADOPDF_HUMO_GUARDAR` y `LIBERADOPDF_HUMO_CARPETA` sustituyen a los diálogos.
  - `preload.cjs`: `elegirArchivos`, `elegirCarpeta`, `guardarResultado`, `guardarResultados`, `abrirResultado`, `urlDocumento` (ya está en `?file=`).
  - `trabajador.mjs` (Web Worker ES module): `onmessage({ id, operacion, argumentos })` → `postMessage({ id, progreso: { hecho, total, texto } })` repetidas y al final `{ id, resultado }` o `{ id, error }`; carga pdf-lib con `import('/lib/pdf-lib/pdf-lib.esm.min.js')` y qpdf bajo demanda (`import('/lib/qpdf/qpdf.js')` + `locateFile` → `/lib/qpdf/qpdf.wasm`). Operaciones de esta tarea: `'eco'` (prueba) y `'cargar'` (devuelve `{ paginas, cifrado }` de un PDF: `PDFDocument.load(bytes, { ignoreEncryption: true })`, `cifrado = doc.isEncrypted`). Un mensaje `{ id, cancelar: true }` marca la operación para que el bucle por páginas se detenga y responda `{ id, cancelado: true }`.
  - `cliente.mjs`: `export function crearCliente()` → `{ ejecutar(operacion, argumentos, { alProgreso, senal }) → Promise<resultado> }` (un worker por ventana, cola de una operación; `senal` es un `AbortSignal`).
  - `base.mjs`: `export function dialogoHerramienta({ titulo, descripcion, campos, alEjecutar })` → abre un diálogo (`div.liberadopdf-dialogo.liberadopdf-herramienta`) con los campos (`texto`, `numero`, `booleano`, `opcion`, `color`, `archivo(s)`, `lista ordenable`, `rangos`), botones «Ejecutar» y «Cancelar», barra de progreso y mensajes; `alEjecutar(valores, { progreso, senal })` devuelve `{ bytes, nombre } | { archivos } | { mensaje }`; al terminar ofrece «Guardar» (llama a `guardarResultado`/`guardarResultados`) y «Abrir el resultado». `export async function bytesDelDocumento()` → `Uint8Array` del PDF abierto (`fetch` de `?file=`).
  - Menú «Herramientas» (entre Ver y Ayuda) con las 17 entradas (las no implementadas aún abren un aviso «próximamente» hasta su tarea); `alAccion(win, 'herramienta:<clave>')` → `window.liberadopdfAcciones.herramienta('<clave>')`.
  - `main.js` raíces: `/lib/qpdf/` → `node_modules/@neslinesli93/qpdf-wasm/dist`, `/lib/tesseract/` → `node_modules/tesseract.js/dist`, `/lib/tesseract-core/` → `node_modules/tesseract.js-core`, `/tessdata/` → `recursos/tessdata`. `construir.sh` deja de ignorar nada de eso y excluye `*.map` de tesseract.
  - `package.json`: dependencias exactas `@neslinesli93/qpdf-wasm@0.3.0`, `tesseract.js@7.0.0` (arrastra `tesseract.js-core`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/herramientas-rangos.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarRangos, dividirCada, formatearRangos } from '../src/comun/herramientas/rangos.mjs';

test('rangos válidos', () => {
  assert.deepEqual(analizarRangos('1-3, 5, 8-', 10), { paginas: [1, 2, 3, 5, 8, 9, 10] });
  assert.deepEqual(analizarRangos('', 4), { paginas: [1, 2, 3, 4] });
  assert.deepEqual(analizarRangos('3,1,3', 4), { paginas: [1, 3] });
});
test('rangos inválidos', () => {
  assert.equal(analizarRangos('0', 4).error, 'Página fuera del documento: 0');
  assert.equal(analizarRangos('1-999', 4).error, 'Página fuera del documento: 999');
  assert.equal(analizarRangos('5-2', 10).error, 'Rango inválido: 5-2');
  assert.equal(analizarRangos('a', 4).error, 'No entiendo: a');
  assert.equal(analizarRangos(',', 4).error, 'Rango vacío');
});
test('dividirCada y formatearRangos', () => {
  assert.deepEqual(dividirCada(7, 3), [[1, 2, 3], [4, 5, 6], [7]]);
  assert.equal(formatearRangos([1, 2, 3, 5, 8, 9]), '1-3,5,8-9');
});
```
```js
// test/herramientas-nombres.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreResultado, nombreParte, nombreImagen } from '../src/comun/herramientas/nombres.mjs';

test('nombres de resultado', () => {
  assert.equal(nombreResultado('C:\Charlas\charla.PDF', 'unido'), 'charla - unido.pdf');
  assert.equal(nombreResultado('/d/charla.pdf', 'OCR'), 'charla - OCR.pdf');
  assert.equal(nombreParte('/d/charla.pdf', 2, 12), 'charla - parte 02.pdf');
  assert.equal(nombreParte('/d/charla.pdf', 3, 120), 'charla - parte 003.pdf');
  assert.equal(nombreImagen('/d/charla.pdf', 7, 14, 'png'), 'charla - página 07.png');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar** según Interfaces; fase de humo `herramientasBase`: `window.liberadopdfAcciones.herramienta('eco')` no existe como menú, así que la fase usa `window.liberadopdfHerramientas.cliente.ejecutar('eco', { texto: 'hola' })` → `'hola'` y `ejecutar('cargar', { bytes })` sobre el documento → `{ paginas: 4, cifrado: false }`.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `herramientasBase` `ok: true` y todas las anteriores siguen verdes.
- [ ] **Step 5: Commit** → `git commit -m "Herramientas: infraestructura (menú, diálogo base, worker con pdf-lib y qpdf, guardado de resultados)"`.

---

### Task 2: Unir, dividir/extraer y rotar (37, 38, 40)

**Files:**
- Create: `src/renderer/herramientas/unir.mjs`, `src/renderer/herramientas/dividir.mjs`, `src/renderer/herramientas/rotar.mjs`, `recursos/ejemplo_cifrado.pdf` (generado en el humo con qpdf desde el ejemplo animado; no se versiona)
- Modify: `src/renderer/herramientas/trabajador.mjs`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: fases de humo `unir`, `dividir`, `rotar`, `cifrado`

**Interfaces:**
- Produces (worker): `'unir'({ documentos: Uint8Array[] })` → bytes; `'dividir'({ bytes, grupos: number[][] })` → `Uint8Array[]` (un PDF por grupo, páginas copiadas con `copyPages`); `'rotar'({ bytes, paginas, grados })` → bytes (`page.setRotation(degrees((page.getRotation().angle + grados) % 360))`). Todas rechazan con `error: 'cifrado'` si `doc.isEncrypted` (Review Focus 2); el diálogo muestra «Este PDF está cifrado: primero desbloquéalo (Herramientas ▸ Desbloquear)».
- Diálogos: unir (lista ordenable con el documento abierto primero + «Añadir PDF…»), dividir (modo: rangos a un PDF / cada N páginas / cada página; muestra cuántos archivos saldrán), rotar (grados, rangos).
- Humo `unir`: une el ejemplo animado consigo mismo → `LIBERADOPDF_HUMO_GUARDAR` → el archivo tiene 8 páginas (pdf-lib en el main del humo o `/Count 8` en bytes). `dividir`: «cada 2 páginas» → carpeta `LIBERADOPDF_HUMO_CARPETA` con `… - parte 01.pdf` y `… - parte 02.pdf` de 2 páginas. `rotar`: 90° todas → `/Rotate 90` en las 4 páginas. `cifrado`: el humo genera un PDF cifrado con qpdf (vía el worker, operación `'proteger'` llega en la Tarea 8; hasta entonces esta fase se marca `pendiente: true` y no cuenta) — **Ruling previsto**: la fase `cifrado` se activa en la Tarea 8.

- [ ] **Step 1: Escribir las fases de humo** (`unir`, `dividir`, `rotar`) y ejecutar → FAIL (operaciones inexistentes).
- [ ] **Step 2: Implementar.**
- [ ] **Step 3: Ejecutar** `npm run humo` → las tres `ok: true`.
- [ ] **Step 4: Commit** → `git commit -m "Herramientas: unir, dividir/extraer y rotar"`.

---

### Task 3: Organizar páginas (39)

**Files:**
- Create: `src/comun/herramientas/organizar.mjs`, `src/renderer/herramientas/organizar.mjs`
- Modify: `trabajador.mjs`, `visor.css`, `humo.js`, `scripts/humo.mjs`
- Test: `test/herramientas-organizar.test.mjs`, fase `organizar`

**Interfaces:**
- `organizar.mjs` (puro): estado = `[{ origen: number|null, rotacion: 0|90|180|270 }]` (`origen` null = página en blanco); `export function mover(estado, desde, hasta)`, `rotarPagina(estado, i)`, `borrar(estado, i)`, `insertarBlanco(estado, i)`, `duplicar(estado, i)` → estados nuevos sin mutar; `export function planDeOrganizacion(estado)` → `[{ origen, rotacion }]` listo para el worker.
- Worker: `'organizar'({ bytes, plan })` → bytes (nuevo documento: `copyPages` para los `origen` no nulos, `addPage` con el tamaño de la primera página para los nulos, rotación acumulada).
- Diálogo: rejilla de miniaturas (reutiliza `miniaturas.mjs`) con arrastre nativo (`draggable`, `dragstart/dragover/drop`), botones por celda (rotar, borrar, duplicar), «Insertar página en blanco al final».
- Humo `organizar`: plan `[{origen:4,rotacion:0},{origen:1,rotacion:90},{origen:null,rotacion:0}]` por `window.liberadopdfHerramientas.ejecutar('organizar', …)` → el resultado tiene 3 páginas, la 2.ª con `/Rotate 90`, y la 3.ª sin contenido (`page.getContentStream` vacío o tamaño de página igual a la 1.ª).

- [ ] **Step 1: Pruebas unitarias** (mover 0→2 reordena; borrar en lista de 1 deja vacía; rotarPagina 270→0; insertarBlanco; duplicar) → FAIL.
- [ ] **Step 2: Implementar.** **Step 3: Ejecutar** `npm test` y `npm run humo` → PASS. **Step 4: Commit** → `git commit -m "Herramientas: organizar páginas"`.

---

### Task 4: Números de página y marca de agua (41, 42)

**Files:**
- Create: `src/comun/herramientas/estampar.mjs`, `src/renderer/herramientas/numerar.mjs`, `src/renderer/herramientas/marcaDeAgua.mjs`
- Modify: `trabajador.mjs`, `humo.js`, `scripts/humo.mjs`
- Test: `test/herramientas-estampar.test.mjs`, fases `numerar`, `marcaDeAgua`

**Interfaces:**
- `estampar.mjs` (puro): `export function textoDeNumero(formato, n, total)` (`{n}`, `{total}`); `export function posicionDeTexto({ posicion, anchoPagina, altoPagina, anchoTexto, altoTexto, margen = 24 })` → `{ x, y }` para `posicion ∈ { 'arriba-izquierda', 'arriba-centro', 'arriba-derecha', 'abajo-izquierda', 'abajo-centro', 'abajo-derecha' }`; `export function mosaicoDeMarca({ anchoPagina, altoPagina, anchoTexto, altoTexto, paso = 1.5 })` → `[{ x, y }]` centros de un mosaico diagonal; `export function colorHex(hex)` → `{ r, g, b }` en 0–1.
- Worker: `'numerar'({ bytes, paginas, formato, posicion, tamano, inicio })` → bytes (Helvetica, negro); `'marcaDeAgua'({ bytes, paginas, texto?, imagen?: Uint8Array, tipoImagen?, tamano, color, opacidad, angulo, mosaico, escala })` → bytes (texto con `opacity`, `rotate: degrees(angulo)`, centrado o en mosaico; imagen con `drawImage` centrada y `opacity`).
- Humo `numerar`: «Página {n} / {total}» abajo-centro → el resultado, abierto con pdf.js en el humo (`getTextContent` de la página 2) contiene «Página 2 / 4». `marcaDeAgua`: texto «BORRADOR» opacidad 0,3 → `getTextContent` contiene «BORRADOR» y el render de la página 1 difiere del original.

- [ ] **Step 1: Pruebas unitarias** (`textoDeNumero('Página {n} / {total}', 2, 4)`; posiciones de las 6 esquinas/centros; mosaico ≥ 4 puntos; `colorHex('#ff0000')`) → FAIL. **Step 2–4** como arriba; commit `"Herramientas: números de página y marca de agua"`.

---

### Task 5: Recortar, metadatos y aplanar (43, 48, 47)

**Files:**
- Create: `src/renderer/herramientas/recortar.mjs`, `src/renderer/herramientas/metadatos.mjs`, `src/renderer/herramientas/aplanar.mjs`
- Modify: `trabajador.mjs`, `src/comun/medicion.mjs` (reutiliza `puntosAPdf`), `humo.js`, `scripts/humo.mjs`
- Test: fases `recortar`, `metadatos`, `aplanar`

**Interfaces:**
- Recortar: el diálogo pide arrastrar un rectángulo sobre la página actual (misma mecánica que instantánea pero sobre `.page`); convierte con `puntosAPdf` a unidades PDF (origen abajo-izquierda: `y = altoPagina - y`); opción «todas las páginas»; worker `'recortar'({ bytes, paginas, caja: { x, y, ancho, alto } })` → `page.setCropBox(x, y, ancho, alto)`.
- Metadatos: worker `'metadatos'({ bytes, titulo, autor, asunto, palabrasClave, creador })` → `setTitle`…; el diálogo precarga los actuales (`'leerMetadatos'`).
- Aplanar: worker `'aplanar'({ bytes, formularios: true, quitarAnotaciones: false })` → `doc.getForm().flatten()` (si hay formulario) y, si se pide, borra `/Annots` de cada página.
- Humo: `recortar` → `page.getCropBox()` del resultado = la caja; `metadatos` → `getTitle() === 'Título de prueba'`; `aplanar` con el PDF guardado por la fase `guardar` (tiene un FreeText) y `quitarAnotaciones: true` → sin `/Annots`.

- [ ] Steps 1–4 como arriba (las comprobaciones se hacen en el humo con pdf-lib en el main: `import('pdf-lib')` desde `node_modules`); commit `"Herramientas: recortar, metadatos y aplanar"`.

---

### Task 6: PDF → imágenes e imágenes → PDF (44, 45)

**Files:**
- Create: `src/comun/herramientas/imagenes.mjs`, `src/renderer/herramientas/aImagenes.mjs`, `src/renderer/herramientas/deImagenes.mjs`
- Modify: `trabajador.mjs`, `humo.js`, `scripts/humo.mjs`
- Test: `test/herramientas-imagenes.test.mjs`, fases `aImagenes`, `deImagenes`

**Interfaces:**
- `imagenes.mjs` (puro): `export function escalaParaPpp(ppp)` → `ppp / 72`; `export function ajustarEnPagina({ anchoImagen, altoImagen, anchoPagina, altoPagina, margen })` → `{ x, y, ancho, alto }` centrado y proporcional; `export const TAMANOS = { A4: [595.28, 841.89], Carta: [612, 792] }`; `export function tamanoDePagina(nombre, orientacion, imagen)` → `[ancho, alto]` (`'imagen'` usa la de la imagen en puntos a 72 ppp).
- 44: en el renderer (hilo principal, con `await` entre páginas): `app.pdfDocument.getPage(n).render` a `canvas` con `scale = escalaParaPpp(ppp)`, `canvas.toBlob('image/png' | 'image/jpeg', calidad)` → `archivos: [{ nombre: nombreImagen(...), bytes }]` → `guardarResultados`.
- 45: el diálogo elige imágenes (`elegirArchivos({ filtros: imágenes, varios: true })`), las carga por su URL de token; JPEG/PNG se pasan tal cual al worker; el resto se decodifica con `createImageBitmap` y se vuelve a codificar como PNG (si falla, se omite con aviso); worker `'deImagenes'({ imagenes: [{ bytes, tipo }], tamano, orientacion, margen })` → bytes (una página por imagen).
- Humo `aImagenes`: 4 PNG a 100 ppp en la carpeta, tamaño ≈ 454×255 × 100/72; `deImagenes`: con dos PNG generados en el humo (uno con transparencia) y un archivo `.jpg` que en realidad es texto (se omite) → PDF de 2 páginas (Review Focus 4).

- [ ] Steps 1–4; commit `"Herramientas: PDF a imágenes e imágenes a PDF"`.

---

### Task 7: Página web / HTML → PDF (46)

**Files:**
- Create: `src/renderer/herramientas/htmlAPdf.mjs`
- Modify: `src/main/ipc.js` (`'html-a-pdf'`), `src/preload/preload.cjs`, `humo.js`, `scripts/humo.mjs`
- Test: fase `htmlAPdf`

**Interfaces:**
- `ipc.js` `'html-a-pdf'({ origen: 'url' | 'archivo', valor, tamano: 'A4' | 'Letter', apaisado, fondos })` → bytes: `BrowserWindow` oculta (`show: false`, `webPreferences: { sandbox: true, contextIsolation: true }`), `loadURL`/`loadFile`, espera `did-finish-load` + 500 ms, `printToPDF({ pageSize, landscape, printBackground })`, cierra. Solo `http(s)://` o `.html/.htm` elegido con diálogo; tiempo máximo 30 s.
- Humo `htmlAPdf`: un `prueba.html` escrito por el humo con «Hola liberadoPDF» → PDF cuyo texto (pdf.js en el main del humo) contiene esa frase.

- [ ] Steps 1–4; commit `"Herramientas: página web o HTML a PDF"`.

---

### Task 8: Proteger, desbloquear y reparar con qpdf (49, 50, 51)

**Files:**
- Create: `src/renderer/herramientas/proteger.mjs`, `src/renderer/herramientas/desbloquear.mjs`, `src/renderer/herramientas/reparar.mjs`
- Modify: `trabajador.mjs` (`qpdf(args, { entradas: { nombre: bytes } })` → `{ salida: Uint8Array, avisos: string[] }` sobre el FS virtual, capturando `print`/`printErr`), `humo.js`, `scripts/humo.mjs`
- Test: fases `proteger`, `desbloquear`, `reparar`, y `cifrado` (de la Tarea 2)

**Interfaces:**
- Worker: `'proteger'({ bytes, usuario, propietario, imprimir, copiar, modificar })` → qpdf `--encrypt <usuario> <propietario> 256 --print=<full|none> --extract=<y|n> --modify=<all|none> -- in out`; `'desbloquear'({ bytes, contrasena })` → `--password=<c> --decrypt in out` (error legible si la contraseña es incorrecta: qpdf devuelve código ≠ 0 e «invalid password»); `'reparar'({ bytes })` → `qpdf --warning-exit-0 in out`; si qpdf falla, `PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false })` + `save()`; devuelve `{ bytes, avisos }`.
- Humo: `proteger` → el resultado tiene `/Encrypt` y pdf.js lo abre con la contraseña; `desbloquear` sobre ese resultado → sin `/Encrypt`; `reparar` sobre el ejemplo truncado (últimos 300 bytes quitados) → el resultado se abre con pdf-lib y tiene 4 páginas; `cifrado` (Tarea 2) → `unir` sobre el PDF cifrado responde `error: 'cifrado'` con el mensaje.

- [ ] Steps 1–4; commit `"Herramientas: proteger, desbloquear y reparar (qpdf)"`.

---

### Task 9: OCR (52)

**Files:**
- Create: `src/comun/herramientas/ocr.mjs`, `src/renderer/herramientas/ocr.mjs`, `recursos/ejemplo_escaneado.pdf` + `scripts/generar_escaneado.py`
- Modify: `trabajador.mjs` (`'ocrEscribir'`), `humo.js`, `scripts/humo.mjs`, `scripts/generar_ejemplo.sh`
- Test: `test/herramientas-ocr.test.mjs`, fase `ocr`

**Interfaces:**
- `ocr.mjs` (puro): `export function palabrasAPdf(palabras, { escala, altoPagina })` donde `palabras = [{ text, bbox: { x0, y0, x1, y1 } }]` (píxeles de la imagen OCR) → `[{ texto, x, y, ancho, alto }]` en unidades PDF (origen abajo-izquierda); `export function tamanoDeFuente(anchoCaja, anchoTextoA1pt)` → tamaño tal que el texto ocupe la caja (acotado 2–200); `export function textoWinAnsi(texto)` → caracteres fuera de WinAnsi sustituidos por `?`.
- Renderer: por página del rango: render con pdf.js a `ppp` (200/300) → `canvas` → `tesseract.createWorker(idiomas, 1, { workerPath: '/lib/tesseract/worker.min.js', corePath: '/lib/tesseract-core', langPath: '/tessdata', gzip: false, cachePath: null, workerBlobURL: false })` → `recognize(canvas)` → `data.words`; progreso por página; cancelable (`worker.terminate()`).
- Worker pdf-lib: `'ocrEscribir'({ bytes, paginas: [{ numero, palabras }] })` → bytes: por palabra `page.drawText(textoWinAnsi(texto), { x, y, size, font: Helvetica, opacity: 0 })`.
- `scripts/generar_escaneado.py`: con PIL dibuja «HOLA MUNDO LIBERADO» en una imagen 1600×500 y la mete en un PDF de una página con pdf-lib (vía `node -e`) o con `img2pdf`… **decisión**: se genera con PIL un JPEG y `recursos/ejemplo_escaneado.tex` lo incluye con `\includegraphics` (LaTeX ya está).
- Humo `ocr`: sobre `ejemplo_escaneado.pdf` con idioma `spa` → el resultado, abierto con pdf.js en el main del humo, tiene `getTextContent` con «LIBERADO»; y cancelar a los 300 ms de empezar sobre el ejemplo animado (4 páginas) deja `cancelado: true` y ningún archivo (Review Focus 3).

- [ ] Steps 1–4; commit `"Herramientas: OCR local con tesseract.js"`.

---

### Task 10: Comprimir (53)

**Files:**
- Create: `src/comun/herramientas/comprimir.mjs`, `src/renderer/herramientas/comprimir.mjs`, `recursos/ejemplo_fotos.tex` + fotos generadas por PIL
- Modify: `trabajador.mjs`, `humo.js`, `scripts/humo.mjs`, `scripts/generar_ejemplo.sh`
- Test: `test/herramientas-comprimir.test.mjs`, fase `comprimir`

**Interfaces:**
- `comprimir.mjs` (puro): `export const CALIDADES = { alta: { escala: 1, jpeg: 0.85 }, media: { escala: 0.7, jpeg: 0.7 }, baja: { escala: 0.5, jpeg: 0.5 } }`; `export function decidirImagen({ filtro, ancho, alto, bitsPorComponente, espacioColor, tieneMascara }, calidad)` → `{ recodificar: boolean, anchoNuevo, altoNuevo, jpeg }` (solo DCTDecode, o FlateDecode RGB/Gray de 8 bits sin SMask; imágenes < 200 px no se tocan); `export function informe(antes, despues)` → `'1,8 MB → 640 KB (−65 %)'`.
- Renderer: lista las imágenes del documento con pdf-lib en el worker (`'listarImagenes'` → `[{ ref, filtro, ancho, alto, … , bytes }]`), decodifica cada una con `createImageBitmap(new Blob([bytes], { type }))` (DCT) o reconstruyendo un `ImageData` (Flate RGB/Gray), la dibuja escalada en un canvas y la codifica JPEG; worker `'reemplazarImagenes'({ bytes, reemplazos: [{ ref, jpeg, ancho, alto }] })` → bytes (nuevo stream DCTDecode, `/Width`, `/Height`, `/ColorSpace /DeviceRGB`, `/BitsPerComponent 8`, sin `/SMask`); después qpdf `--object-streams=generate --recompress-flate --compression-level=9 in out`. Si el resultado no es menor, se devuelve `{ mensaje: 'No se pudo reducir' }` y no se guarda (Review Focus 5).
- Humo `comprimir`: `ejemplo_fotos.pdf` (dos JPEG de 2000×1500 generados con ruido por PIL) con calidad «baja» → el resultado pesa menos de la mitad y se abre con 2 páginas; sobre `ejemplo_animado.pdf` (sin imágenes) → mensaje y sin archivo; cancelar a mitad → sin archivo.

- [ ] Steps 1–4; commit `"Herramientas: comprimir imágenes y estructura"`.

---

### Task 11: Empaquetado, README, ayuda y verificación en Windows

**Files:**
- Modify: `README.md`, `src/renderer/ayuda.mjs`, `scripts/construir.sh`, `scripts/humo_windows.sh`
- Test: `scripts/humo_windows.sh` en `basica`, `unir`, `proteger`, `ocr`, `comprimir` y `presentacionAnimada` con el PDF de la presentación real.

- [ ] **Step 1:** `construir.sh` comprueba en el asar `qpdf.wasm`, `worker.min.js`, `tesseract-core-simd-lstm.wasm` y `spa.traineddata`; ignora `*.map` de node_modules. Construir.
- [ ] **Step 2:** Windows: las fases indicadas `ok: true` (repetir tras el primer arranque).
- [ ] **Step 3:** README con la sección «Herramientas» (qué hace cada una, dónde deja el resultado, tamaños y tiempos del OCR) y «Pendiente» = 54–59; `ayuda.mjs` añade «Herramientas: menú Herramientas». Commit `"Entrega 3: README, ayuda y verificación en Windows"`.

---

## Self-review

- **Cobertura §8**: 37/38/40 (T2), 39 (T3), 41/42 (T4), 43/47/48 (T5), 44/45 (T6), 46 (T7), 49/50/51 (T8), 52 (T9), 53 (T10); infraestructura y antimetas (T1); empaquetado (T11).
- **Nombres**: `crearCliente().ejecutar`, `dialogoHerramienta`, `bytesDelDocumento`, `registrarArchivo`, `guardarResultado(s)`, `nombreResultado/nombreParte/nombreImagen`, `analizarRangos`, operaciones del worker (`unir`, `dividir`, `rotar`, `organizar`, `numerar`, `marcaDeAgua`, `recortar`, `metadatos`, `leerMetadatos`, `aplanar`, `deImagenes`, `proteger`, `desbloquear`, `reparar`, `ocrEscribir`, `listarImagenes`, `reemplazarImagenes`, `eco`, `cargar`) coinciden entre tareas.
- **Review Focus**: 1 → T1; 2 → T2/T8; 3 → T9/T10; 4 → T6; 5 → T10.
