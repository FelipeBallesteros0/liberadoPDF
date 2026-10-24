# liberadoPDF, entrega 2: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar las funciones acordadas en la especificación que la entrega 1 dejó fuera: ajustes, modo nocturno, instantánea, guardar y guardar como, transiciones, puntero láser/foco/dibujo, cuadrícula de láminas, medición, vista de presentador con notas y segundo monitor, entrada automática por `/PageMode /FullScreen`, más la limpieza de los menores de la revisión.

**Architecture:** Igual que la entrega 1: pdf.js vendored sin tocar, servido por `liberadopdf://app/`; cada función es un módulo del renderer (`src/renderer/*.mjs`) con su lógica pura en `src/comun/*.mjs` probada con `node --test`, y lo que necesita Electron (portapapeles, pantallas, guardado, segunda ventana) va por IPC a `src/main/`. Las comprobaciones de interfaz se añaden como fases de la prueba de humo (`src/main/humo.js`), una instancia de Electron por fase.

**Tech Stack:** Node 24, Electron 45, pdf.js 6.4.299 (visor y su API `build/pdf.mjs` para la vista de presentador y las miniaturas), `pdf-lib` 1.17.1 (solo para leer `/Trans`), `node:test`, TeX Live local (PDFs de prueba con transiciones y notas).

**Spec:** `docs/superpowers/specs/2026-10-23-liberadopdf-design.md` (§4.1·13·15, §4.2·18·21·22, §4.3·25–27·29, §4.4·31·34·35, §4.6, §5.2·2, §5.3).

## Global Constraints

- Las de la entrega 1 (idioma español, pdf.js sin modificar, Electron con `contextIsolation`/`sandbox`, sin red, config portable en `data/config.json`, antimetas de §2) siguen vigentes.
- `pdfjs-dist` se elimina del proyecto: la API de pdf.js que necesitan la vista de presentador y las miniaturas es `vendor/pdfjs/build/pdf.mjs` (misma versión 6.4.299). Ruling frente a §5.1, que nombraba `pdfjs-dist`: misma API, sin duplicar 35 MB.
- Toda ruta que entra por IPC se valida en el main (`errorDeRutaPdf`); todo lo que el renderer pide al main lleva su argumento acotado (rectángulos en enteros, nombres de archivo sin separadores, mensajes recortados a 300 caracteres).
- Cada función nueva se puede desactivar o no interfiere cuando no se usa: sin `/Trans`, sin notas, sin segundo monitor, el comportamiento es el de la entrega 1.
- Nada nuevo en el renderer cuelga de `<body>`: las capas van en `raizDeCapas()` (dentro de `#viewerContainer`).

## Review Focus

1. Entrar en presentación con dos pantallas cuando la ventana del visor está en la principal: debe moverse a la secundaria antes de pedir pantalla completa, y con una sola pantalla no moverse; prueba en Tarea 10 (`elegirPantallas`).
2. Guardar sobre un PDF que ya no existe o está en una carpeta de solo lectura (pendrive retirado): mensaje, nunca pérdida silenciosa; prueba en Tarea 4 (`will-download` con `item.setSavePath` a una ruta no escribible → estado `interrupted` → diálogo «No se pudo guardar»).
3. Un `/Trans` con tipo desconocido, sin `/D`, o con `/D` negativo o enorme: transición por defecto (fundido, 1 s) acotada a 5 s, nunca una lámina que no llega; pruebas en Tarea 5 (`transicionDe`).
4. Archivo de notas con cabeceras distintas (`## 3`, `## 3. Título (0:45)`, `#3`, sin cabeceras, codificación con BOM): bloque correcto o vacío, nunca excepción; pruebas en Tarea 9 (`parsearNotas`).
5. La medición con un PDF cuyo `/UserUnit` no es 1, con zoom distinto de 100 % y con rotación: los milímetros no cambian con el zoom ni la rotación; pruebas en Tarea 8 (`longitudEnUnidades` recibe la escala del viewport y el `userUnit`).

---

### Task 1: Limpieza de la revisión y base de la entrega 2

**Files:**
- Modify: `package.json`, `test/esqueleto.test.mjs`, `scripts/construir.sh`, `src/main/main.js`, `src/main/ipc.js`, `src/preload/preload.cjs`, `src/renderer/visor.mjs`, `src/comun/config.mjs`, `src/main/ventanas.js`, `test/config.test.mjs`, `test/config-archivo.test.mjs`
- Test: `test/config.test.mjs`, `npm run humo`

**Interfaces:**
- Produces:
  - `package.json`: sin `pdfjs-dist`; `dependencies: { "pdf-lib": "1.17.1" }`. `test/esqueleto.test.mjs` deja de exigir `pdfjs-dist` y exige `node_modules/pdf-lib/dist/pdf-lib.esm.min.js`.
  - `main.js`: raíz nueva `{ prefijo: '/lib/pdf-lib/', carpeta: <raiz>/node_modules/pdf-lib/dist }`; `construir.sh` deja de ignorar `pdfjs-dist` (ya no existe) y sigue ignorando `@napi-rs`.
  - `config.mjs`: `fondo` se valida con `/^#[0-9a-f]{6}$/i` (si no, `#000000`); nuevas claves por defecto: `tema: 'sistema'` (ya existe), `notasDerecha: false` dentro de `porDocumento[ruta]` (no es global), y `presentador: { pantalla: 'auto' }` **no**: se mantiene `monitorPresentacion` y `monitorPresentador` (`'auto'` o un número = `display.id`).
  - `ipc.js`: `humo-evento` solo se registra cuando `process.env.LIBERADOPDF_HUMO` está definido; se elimina `enviarAccion`; `guardar` en `main.js` se envuelve en `try/catch` con `console.warn('No se pudo guardar config.json:', e.message)`.
  - `preload.cjs` y `visor.mjs`: se elimina el canal `accion`/`alAccion` (el menú ya va por `executeJavaScript`).
  - `main.js`: en modo humo no se pide el lock de instancia única.
  - `visor.mjs`: el avance automático se reinicia en `pagechanging` (en `presentacion.mjs`, `app.eventBus.on('pagechanging', reiniciarAvance)`) y desaparece el envoltorio de acciones.
  - `ventanas.js`: `win.webContents.on('render-process-gone', () => win.reload())` con un aviso en consola.
  - `visor.mjs`: tras `documentloaded`, `const modo = await app.pdfDocument.getPageMode(); if (modo === 'FullScreen') window.liberadopdf.pedirPresentacion()`; `ipc.js` canal `'pedir-presentacion'` → `win.webContents.executeJavaScript('window.liberadopdfAcciones.presentacion()', true)` (el gesto de usuario lo aporta el main).
  - `test/config-archivo.test.mjs`: borra su `mkdtemp` al terminar (`rmSync(dir, { recursive: true, force: true })`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// añadir a test/config.test.mjs
test('fondo: solo colores #rrggbb', () => {
  assert.equal(normalizarConfig({ presentacion: { fondo: 'rojo' } }).presentacion.fondo, '#000000');
  assert.equal(normalizarConfig({ presentacion: { fondo: '#1A2b3C' } }).presentacion.fondo, '#1A2b3C');
});
```
```js
// test/esqueleto.test.mjs: cambiar la aserción de pdfjs-dist por
assert.equal(p.dependencies['pdf-lib'], '1.17.1');
assert.equal('pdfjs-dist' in (p.dependencies ?? {}), false);
assert.ok(existsSync('node_modules/pdf-lib/dist/pdf-lib.esm.min.js'));
```

- [ ] **Step 2: Ejecutar y ver que falla** → `npm test` FAIL (fondo inválido aceptado; pdfjs-dist presente).
- [ ] **Step 3: Implementar** todo lo de Interfaces (`npm uninstall pdfjs-dist`).
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → `ok: true` (las fases existentes siguen verdes).
- [ ] **Step 5: Commit** → `git commit -m "Entrega 2: limpieza de la revisión, pdf-lib servido, reinicio del avance en pagechanging, PageMode FullScreen"`.

---

### Task 2: Diálogo de ajustes (Ctrl+,)

**Files:**
- Create: `src/comun/ajustes.mjs`, `src/renderer/ajustes.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/renderer/teclas.mjs`, `src/comun/teclas.mjs`, `src/main/menu.js`, `src/main/ipc.js`, `src/preload/preload.cjs`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/ajustes.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/ajustes.mjs`: `export const CAMPOS` = lista ordenada de `{ clave, etiqueta, tipo: 'numero'|'booleano'|'color'|'opcion', opciones?, minimo?, maximo?, ruta }` donde `ruta` es el camino en la config (`'presentacion.avanceSegundos'`, `'presentacion.bucle'`, `'presentacion.transiciones'`, `'presentacion.fondo'`, `'presentacion.ocultarCursor'`, `'unidadMedida'` (mm/cm/in), `'nocturno'`, `'tema'` (sistema/claro/oscuro), `'monitorPresentacion'`, `'monitorPresentador'`) con etiquetas en español; `export function leerCampo(config, ruta)`; `export function escribirCampo(config, ruta, valor)` → config nueva (sin mutar) con el valor convertido al tipo del campo (números acotados a `[minimo, maximo]`; `avanceSegundos` 0–3600); `export function opcionesDePantalla(pantallas)` → `[{ valor: 'auto', etiqueta: 'Automático' }, ...pantallas.map(p => ({ valor: String(p.id), etiqueta: `${p.etiqueta} (${p.ancho}×${p.alto})` }))]`.
  - `src/renderer/ajustes.mjs`: `export function instalarAjustes({ config, guardar, aplicar, pantallas })` → `{ abrir(), cerrar() }`: diálogo `div.liberadopdf-ajustes` (misma estética que el de la barra) con un control por campo; cada cambio llama a `guardar(configNueva)` y a `aplicar(configNueva)`; `Esc`/Cerrar cierran; «Restablecer» vuelve a `valoresPorDefecto()` conservando `recientes`, `barra` y `porDocumento`.
  - `visor.mjs`: `aplicar(config)` propaga en vivo: fondo y cursor a `presentacion.mjs` (nuevo método `actualizarConfig(config)`), nocturno (Tarea 3), tema → `document.documentElement.style.colorScheme = tema === 'claro' ? 'light' : tema === 'oscuro' ? 'dark' : ''`; `config` se mantiene como variable viva en `visor.mjs` (los módulos reciben `obtenerConfig()`).
  - `preload.cjs`: `pantallas: () => ipcRenderer.invoke('pantallas')` → `[{ id, etiqueta, ancho, alto, principal }]` (`screen.getAllDisplays()`; `etiqueta` = `display.label || 'Pantalla ' + (i + 1)`); y al cargar seed de `viewerCssTheme` en `pdfjs.preferences` a partir de `ipcRenderer.sendSync('tema-inicial')` (`0` sistema, `1` claro, `2` oscuro) para que pdf.js arranque con el tema elegido.
  - Teclas: `Ctrl+,` → `{ accion: 'ajustes' }` en ambos modos (`accionDeTecla`); menú Ver → «Ajustes…» (`alAccion(win, 'ajustes')`), `window.liberadopdfAcciones.ajustes`.
  - Humo, fase `ajustes`: abre el diálogo por `window.liberadopdfAcciones.ajustes()`, cambia el color de fondo a `#102030` escribiendo en el `input[type=color]` y disparando `change`, espera 300 ms y comprueba que `datos/config.json` de la fase contiene `"fondo": "#102030"` y que `getComputedStyle(viewerContainer).getPropertyValue('--liberadopdf-fondo').trim() === '#102030'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/ajustes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPOS, leerCampo, escribirCampo, opcionesDePantalla } from '../src/comun/ajustes.mjs';
import { valoresPorDefecto } from '../src/comun/config.mjs';

test('campos cubren la sección 4.6 y leen/escriben por ruta sin mutar', () => {
  const rutas = CAMPOS.map(c => c.ruta);
  for (const r of ['presentacion.avanceSegundos', 'presentacion.bucle', 'presentacion.transiciones', 'presentacion.fondo', 'presentacion.ocultarCursor', 'unidadMedida', 'nocturno', 'tema', 'monitorPresentacion', 'monitorPresentador']) assert.ok(rutas.includes(r), r);
  const c = valoresPorDefecto();
  const d = escribirCampo(c, 'presentacion.avanceSegundos', '15');
  assert.equal(leerCampo(d, 'presentacion.avanceSegundos'), 15);
  assert.equal(leerCampo(c, 'presentacion.avanceSegundos'), 0, 'no muta');
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.avanceSegundos', '-5'), 'presentacion.avanceSegundos'), 0, 'acotado');
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.avanceSegundos', '99999'), 'presentacion.avanceSegundos'), 3600);
  assert.equal(leerCampo(escribirCampo(c, 'presentacion.bucle', 'true'), 'presentacion.bucle'), true);
  assert.equal(leerCampo(escribirCampo(c, 'unidadMedida', 'pulgadas'), 'unidadMedida'), 'mm', 'opción inválida → defecto');
});

test('opciones de pantalla: automático más una por pantalla', () => {
  const o = opcionesDePantalla([{ id: 7, etiqueta: 'DELL', ancho: 1920, alto: 1080, principal: true }]);
  assert.deepEqual(o, [{ valor: 'auto', etiqueta: 'Automático' }, { valor: '7', etiqueta: 'DELL (1920×1080)' }]);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar** según Interfaces; fase `ajustes` en humo.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `ajustes` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Diálogo de ajustes (Ctrl+,) con aplicación en vivo y tema de pdf.js"`.

---

### Task 3: Modo nocturno e instantánea

**Files:**
- Create: `src/renderer/nocturno.mjs`, `src/renderer/instantanea.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/comun/teclas.mjs`, `src/main/ipc.js`, `src/preload/preload.cjs`, `src/main/menu.js`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/teclas.test.mjs` (añadir), `test/instantanea.test.mjs`

**Interfaces:**
- Produces:
  - `src/renderer/nocturno.mjs`: `export function instalarNocturno({ obtenerConfig, guardar })` → `{ alternar(), aplicar(activo) }`: clase `liberadopdf-nocturno` en `#viewerContainer` con CSS `filter: invert(1) hue-rotate(180deg)` sobre `.pdfViewer .page canvas, .pdfViewer .page img`; `N` alterna y guarda `nocturno`; la clase se aplica al arrancar según la config.
  - `src/comun/instantanea.mjs`: `export function rectanguloDeArrastre(inicio, fin)` → `{ x, y, width, height }` enteros, normalizado (fin a cualquier lado de inicio), `null` si `width < 4 || height < 4`.
  - `src/renderer/instantanea.mjs`: `export function instalarInstantanea()` → `{ iniciar() }`: `Ctrl+Shift+S` o menú → cursor cruz (`liberadopdf-recortando` en `#viewerContainer`), capa `div.liberadopdf-recorte` que sigue el arrastre; al soltar, `window.liberadopdf.instantanea(rect)` con coordenadas relativas a la ventana (`clientX/Y`) y toast `div.liberadopdf-toast` «Copiado al portapapeles» 2 s; `Esc` cancela.
  - `ipc.js`: `'instantanea'(rect)` → valida enteros ≥ 0 y tamaño ≤ ventana → `const img = await win.webContents.capturePage(rect); clipboard.writeImage(img); return !img.isEmpty()`.
  - Teclas: `Ctrl+Shift+S` → `{ accion: 'instantanea' }` solo en ventana (y no choca con `Ctrl+S`, que es `guardar` en Tarea 4); menú Ver → «Instantánea al portapapeles  Ctrl+Mayús+S» (`registerAccelerator: false`).
  - Humo, fase `nocturno`: `N` → `#viewerContainer` tiene la clase y `datos/config.json` tiene `"nocturno": true`; `N` otra vez la quita. Fase `instantanea`: `js('window.liberadopdfAcciones.instantanea()')`, luego `sendInputEvent` mouseDown en (300,200), mouseMove a (700,500), mouseUp → `clipboard.readImage().getSize()` ≈ `{ width: 400·factor, height: 300·factor }` (±2 px tras dividir por `win.webContents.getZoomFactor()` y el `scaleFactor` de la pantalla) y el toast existe.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/instantanea.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectanguloDeArrastre } from '../src/comun/instantanea.mjs';

test('rectángulo normalizado y entero; descarta arrastres minúsculos', () => {
  assert.deepEqual(rectanguloDeArrastre({ x: 10.4, y: 20.6 }, { x: 110.2, y: 70.1 }), { x: 10, y: 21, width: 100, height: 49 });
  assert.deepEqual(rectanguloDeArrastre({ x: 110, y: 70 }, { x: 10, y: 20 }), { x: 10, y: 20, width: 100, height: 50 });
  assert.equal(rectanguloDeArrastre({ x: 5, y: 5 }, { x: 8, y: 50 }), null);
});
```
```js
// añadir a test/teclas.test.mjs
test('N alterna nocturno; Ctrl+Mayús+S es instantánea solo en ventana; Ctrl+, abre ajustes', () => {
  assert.equal(accionDeTecla(ev('n'), presentacion).accion, 'nocturno');
  assert.equal(accionDeTecla(ev('S', { ctrlKey: true, shiftKey: true }), ventana).accion, 'instantanea');
  assert.equal(accionDeTecla(ev('S', { ctrlKey: true, shiftKey: true }), presentacion), null);
  assert.equal(accionDeTecla(ev(',', { ctrlKey: true }), ventana).accion, 'ajustes');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fases `nocturno` e `instantanea` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Modo nocturno (N) e instantánea al portapapeles (Ctrl+Mayús+S)"`.

---

### Task 4: Guardar, guardar como y editores de pdf.js

**Files:**
- Create: `src/comun/guardado.mjs`
- Modify: `src/main/ventanas.js`, `src/main/ipc.js`, `src/preload/preload.cjs`, `src/renderer/visor.mjs`, `src/comun/teclas.mjs`, `src/main/menu.js`, `src/main/humo.js`, `scripts/humo.mjs`, `README.md`
- Test: `test/guardado.test.mjs`, `test/teclas.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/guardado.mjs`: `export function nombreSeguro(nombre)` → el nombre sin separadores ni caracteres `<>:"/\|?*`, acabado en `.pdf`, `'documento.pdf'` si queda vacío; `export function rutaDeGuardadoComo(rutaOriginal)` → misma carpeta y `nombre (copia).pdf`.
  - Flujo: `Ctrl+S` → `acciones.guardar()` → `await window.liberadopdf.modoGuardado('sobrescribir')` → `app.save()` (si `app.pdfDocument.annotationStorage.size === 0`, `app.download()`); «Guardar como…» (menú Archivo, `Ctrl+Mayús+G`) → `modoGuardado('como')` → `app.save()`. El botón «Guardar» de pdf.js (`#downloadButton`/`#secondaryDownload`) se comporta como «Guardar como» (sin flag → `'como'`).
  - `ventanas.js`: `session.defaultSession.on('will-download', (evento, item, contenido))` instalado una vez en `main.js`: `const win = BrowserWindow.fromWebContents(contenido)`; modo = `win.liberadopdfGuardado ?? 'como'`; `'sobrescribir'` → si `dialog.showMessageBoxSync` «Sobrescribir <nombre>?» (Sobrescribir / Cancelar) → `item.setSavePath(win.liberadopdfRuta)`, si cancela `item.cancel()`; `'como'` → `item.setSaveDialogOptions({ title: 'Guardar como', defaultPath: rutaDeGuardadoComo(win.liberadopdfRuta), filters: [{ name: 'PDF', extensions: ['pdf'] }] })`; `item.once('done', (e, estado))` → `completed` → `win.liberadopdfEdiciones = false` y toast en el renderer (`webContents.send('guardado', { ruta })`); `interrupted`/`cancelled` con error → `dialog.showMessageBox` «No se pudo guardar: <ruta>» (no para cancelaciones del usuario). `win.liberadopdfRuta` se fija en `abrirEnVentana`/`crearVentana`. En modo humo, `LIBERADOPDF_HUMO_GUARDAR=<ruta>` fuerza `item.setSavePath(ruta)` sin diálogos.
  - `ipc.js`: `'modo-guardado'(modo)` → `win.liberadopdfGuardado = modo` (solo `'sobrescribir' | 'como'`), se borra tras `done`.
  - Editores 25–27: en `visor.mjs`, tras `initializedPromise`, comprobar que `#editorCommentButton`, `#editorSignatureButton`, `#editorHighlightButton`, `#editorFreeTextButton`, `#editorInkButton`, `#editorStampButton` existen y no están `hidden`; si `enableComment`/`enableSignatureEditor` no se aplicaron, se registra un aviso en consola (el humo lo comprueba).
  - Teclas: `Ctrl+S` → `guardar` (ventana); `Ctrl+Shift+G` → `guardarComo` (ventana).
  - Humo, fase `guardar`: con `LIBERADOPDF_HUMO_GUARDAR=<salida>/guardado.pdf`: escribe en el campo de formulario… el PDF de ejemplo no tiene campos: la fase usa el editor de texto libre: `js('PDFViewerApplication.pdfViewer.annotationEditorMode = { mode: 3 }')` (FreeText), clic en la página, teclea «hola» con `sendInputEvent` `char`, `Esc`, luego `window.liberadopdfAcciones.guardar()`; espera a que `guardado.pdf` exista y sea > 0 bytes y contenga la cadena `hola` o `/FreeText` (bytes), y a que `win.liberadopdfEdiciones === false`. Comprueba además que los seis botones de editor están visibles (`editoresVisibles: true`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/guardado.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nombreSeguro, rutaDeGuardadoComo } from '../src/comun/guardado.mjs';

test('nombreSeguro', () => {
  assert.equal(nombreSeguro('charla: final?.pdf'), 'charla final.pdf');
  assert.equal(nombreSeguro('../x/y'), 'xy.pdf');
  assert.equal(nombreSeguro(''), 'documento.pdf');
});
test('rutaDeGuardadoComo añade (copia) en la misma carpeta', () => {
  assert.equal(rutaDeGuardadoComo('C:\\\\Charlas\\\\inmoov.pdf'), 'C:\\\\Charlas\\\\inmoov (copia).pdf');
  assert.equal(rutaDeGuardadoComo('/d/inmoov.PDF'), '/d/inmoov (copia).pdf');
});
```
```js
// añadir a test/teclas.test.mjs
test('Ctrl+S guarda y Ctrl+Mayús+G guarda como, solo en ventana', () => {
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), ventana).accion, 'guardar');
  assert.equal(accionDeTecla(ev('G', { ctrlKey: true, shiftKey: true }), ventana).accion, 'guardarComo');
  assert.equal(accionDeTecla(ev('s', { ctrlKey: true }), presentacion), null);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `guardar` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Guardar (Ctrl+S), guardar como y editores de pdf.js verificados"`.

---

### Task 5: Transiciones entre páginas

**Files:**
- Create: `src/comun/transiciones.mjs`, `src/renderer/transiciones.mjs`, `recursos/ejemplo_transiciones.tex`, `recursos/ejemplo_transiciones.pdf`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/renderer/presentacion.mjs`, `scripts/generar_ejemplo.sh`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/transiciones.test.mjs`

**Interfaces:**
- Produces:
  - `recursos/ejemplo_transiciones.pdf`: Beamer 16:9 de 5 páginas con `\transfade` (p. 2), `\transwipe[direction=90]` (p. 3), `\transsplitverticalin` (p. 4) y sin orden (p. 5, que Beamer escribe como `/S /R`); PDF 1.4 sin flujos de objetos como el ejemplo animado.
  - `src/comun/transiciones.mjs`: `export function transicionDe(dict)` donde `dict` es `null` o un objeto plano `{ S, D, Dm, M, Di }` con nombres sin barra (lo produce el lector de pdf-lib) → `null` para `null`, para `S === 'R'` o para `S` ausente; si no, `{ tipo, duracion, dimension: 'H'|'V', movimiento: 'I'|'O', direccion: number }` con `tipo ∈ {'Fade','Dissolve','Glitter','Blinds','Wipe','Split','Box','Push','Cover','Uncover','Fly'}` (desconocido → `'Fade'`), `duracion` = `D` si es número finito en `(0, 5]`, si no `1`; `dimension` por defecto `'H'`, `movimiento` `'I'`, `direccion` `0` (`Di` `/None` → `0`). `export function estiloDeTransicion(t)` → `{ clase: 'liberadopdf-trans-' + tipo.toLowerCase(), duracionMs: Math.round(duracion * 1000), variables: { '--liberadopdf-trans-dir': `${direccion}deg`, '--liberadopdf-trans-dim': dimension, '--liberadopdf-trans-mov': movimiento } }`.
  - Lector: `src/renderer/transiciones.mjs` `export async function leerTransiciones(urlPdf)` → `Array<dict|null>` por página: `fetch(urlPdf)` → `PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })` (import desde `/lib/pdf-lib/pdf-lib.esm.min.js`) → por página `page.node.get(PDFName.of('Trans'))` → si es `PDFDict`, objeto con `S`, `D`, `Dm`, `M`, `Di` (nombres como texto sin barra, números como número); si pdf-lib falla (cifrado) → todas `null` y aviso en consola.
  - `export function instalarTransiciones({ app, obtenerConfig, modoActual })`: en `pagechanging` dentro de presentación, si `config.presentacion.transiciones` y `transicionDe(trans[evt.pageNumber - 1])` no es `null`: toma el canvas de la página anterior (`app.pdfViewer.getPageView(evt.previous - 1)?.canvas`), lo copia a un `canvas` propio del tamaño de `#viewerContainer` (`drawImage` centrado respetando el ajuste de página), lo cuelga en `raizDeCapas()` como `div.liberadopdf-transicion` con la clase y variables de `estiloDeTransicion`, y lo retira al acabar la animación (`animationend` o `duracionMs + 100`). Animaciones CSS en `visor.css`: `fade`/`dissolve`/`glitter`/`blinds` → opacidad 1→0; `wipe` → `clip-path: inset(...)` según `--liberadopdf-trans-dir` (0: de izquierda a derecha, 90: de abajo arriba, 180, 270); `split` → `inset` desde el centro (`I`) o hacia el centro (`O`), horizontal o vertical según `--liberadopdf-trans-dim`; `box` → `inset` concéntrico; `push`/`uncover`/`fly` → `translate` fuera de pantalla según la dirección; `cover` → opacidad. Un cambio de página mientras otra transición corre la cancela.
  - Humo, fase `transiciones` (con `ejemplo_transiciones.pdf`): entra en presentación en la página 1, `Right`, a los 300 ms existe `div.liberadopdf-transicion` (p. 2, fundido 1 s), a los 1400 ms ya no; `Right` dos veces hasta la p. 4 y luego a la p. 5 (`/S /R`): a los 150 ms **no** existe la capa (`instantanea: true`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/transiciones.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transicionDe, estiloDeTransicion } from '../src/comun/transiciones.mjs';

test('R, ausente o null → sin transición', () => {
  assert.equal(transicionDe(null), null);
  assert.equal(transicionDe({ S: 'R', D: 1 }), null);
  assert.equal(transicionDe({}), null);
});
test('valores por defecto y acotados', () => {
  assert.deepEqual(transicionDe({ S: 'Fade' }), { tipo: 'Fade', duracion: 1, dimension: 'H', movimiento: 'I', direccion: 0 });
  assert.equal(transicionDe({ S: 'Wipe', D: -3 }).duracion, 1);
  assert.equal(transicionDe({ S: 'Wipe', D: 99 }).duracion, 1);
  assert.equal(transicionDe({ S: 'Wipe', D: 2.5, Di: 90 }).direccion, 90);
  assert.equal(transicionDe({ S: 'Loquesea' }).tipo, 'Fade');
  assert.deepEqual(transicionDe({ S: 'Split', Dm: 'V', M: 'O' }), { tipo: 'Split', duracion: 1, dimension: 'V', movimiento: 'O', direccion: 0 });
});
test('estilo', () => {
  assert.deepEqual(estiloDeTransicion({ tipo: 'Wipe', duracion: 0.5, dimension: 'H', movimiento: 'I', direccion: 90 }),
    { clase: 'liberadopdf-trans-wipe', duracionMs: 500, variables: { '--liberadopdf-trans-dir': '90deg', '--liberadopdf-trans-dim': 'H', '--liberadopdf-trans-mov': 'I' } });
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar**; generar `ejemplo_transiciones.pdf` (añadir al `generar_ejemplo.sh`) y comprobar con `python3 -c "import pymupdf; d=pymupdf.open('recursos/ejemplo_transiciones.pdf'); print([d[i].get_transition() if hasattr(d[i],'get_transition') else d.xref_get_key(d[i].xref,'Trans') for i in range(5)])"` que las páginas 2–4 llevan `/Trans` con `Fade`, `Wipe`, `Split` y la 5 `R`.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `transiciones` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Transiciones /Trans en presentación (pdf-lib + CSS), con R instantáneo"`.

---

### Task 6: Puntero láser, foco y dibujo

**Files:**
- Create: `src/renderer/punteros.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/comun/teclas.mjs`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/teclas.test.mjs`

**Interfaces:**
- Produces:
  - Teclas (solo presentación): `l`/`L` → `laser`, `s`/`S` → `foco` (ya estaba como `nada`; ahora `foco`), `d`/`D` → `dibujo`, `c`/`C` → `limpiarDibujo`, `Ctrl+Z` → `deshacerDibujo` (en presentación; en ventana `Ctrl+Z` queda para pdf.js).
  - `src/renderer/punteros.mjs`: `export function instalarPunteros({ app, modoActual })` → `{ laser(), foco(), dibujo(), limpiar(), deshacer(), desactivarTodo() }`. Láser: `div.liberadopdf-laser` (círculo rojo 14 px, sombra, `pointer-events: none`) que sigue `mousemove`; se oculta sin movimiento 1,5 s. Foco: `div.liberadopdf-foco` a pantalla completa con `background: radial-gradient(circle 120px at var(--x) var(--y), transparent 0, transparent 110px, rgba(0,0,0,0.75) 130px)` que sigue el ratón. Dibujo: `canvas.liberadopdf-dibujo` del tamaño del contenedor (`pointer-events: auto` solo mientras está activo), trazos rojos de 3 px con `mousedown/mousemove/mouseup`, pila de trazos para deshacer (cada trazo es un `Path2D`), `limpiar()` vacía; **el canvas se vacía al cambiar de página** (`pagechanging`) y se desactiva al salir de presentación. Los tres modos son excluyentes (activar uno apaga los otros) y la tecla del modo activo lo apaga. Mientras un modo está activo, el clic no pasa a pdf.js (se detiene en `mousedown` de la capa para que no avance de página).
  - Humo, fase `punteros`: en presentación, `L` → existe `.liberadopdf-laser`; `sendInputEvent` mouseMove a (400,300) → su `style.left/top` ≈ 400/300; `D` → existe `canvas.liberadopdf-dibujo` y el láser desapareció; mouseDown (200,200) → mouseMove (300,260) → mouseUp → el píxel (250,230) del canvas no es transparente (`getImageData`); `Right` → página +1 y el canvas vuelve a estar vacío (píxel transparente).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// añadir a test/teclas.test.mjs
test('L, S, D, C y Ctrl+Z solo en presentación', () => {
  assert.equal(accionDeTecla(ev('l'), presentacion).accion, 'laser');
  assert.equal(accionDeTecla(ev('s'), presentacion).accion, 'foco');
  assert.equal(accionDeTecla(ev('d'), presentacion).accion, 'dibujo');
  assert.equal(accionDeTecla(ev('c'), presentacion).accion, 'limpiarDibujo');
  assert.equal(accionDeTecla(ev('z', { ctrlKey: true }), presentacion).accion, 'deshacerDibujo');
  for (const k of ['l', 'd', 'c']) assert.equal(accionDeTecla(ev(k), ventana), null, k);
  assert.equal(accionDeTecla(ev('z', { ctrlKey: true }), ventana), null);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `punteros` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Puntero láser, foco y dibujo en presentación"`.

---

### Task 7: Cuadrícula de láminas

**Files:**
- Create: `src/comun/cuadricula.mjs`, `src/renderer/miniaturas.mjs`, `src/renderer/cuadricula.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/comun/teclas.mjs`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/cuadricula.test.mjs`, `test/teclas.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/cuadricula.mjs`: `export function moverSeleccion(indice, total, columnas, tecla)` → nuevo índice (0-based) para `ArrowLeft/Right/Up/Down/Home/End`, acotado a `[0, total-1]`, sin envolver.
  - `src/renderer/miniaturas.mjs`: `export function crearMiniaturas({ app, ancho = 160 })` → `{ obtener(pagina) → Promise<HTMLCanvasElement>, invalidar() }`: renderiza con `app.pdfDocument.getPage(n)` y `page.render({ canvasContext, viewport: page.getViewport({ scale: ancho / page.getViewport({ scale: 1 }).width }) })`, caché por página, cola de uno en uno; `invalidar()` al cambiar de documento.
  - `src/renderer/cuadricula.mjs`: `export function instalarCuadricula({ app, miniaturas, obtenerGrupos })` → `{ alternar(), abrir(), cerrar() }`: capa `div.liberadopdf-cuadricula` (fondo oscuro, rejilla `grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))`), una celda por página con la miniatura y la etiqueta «lámina X · paso a» (de `grupos.posicion`); la celda de la página actual lleva `.actual` y el foco de teclado (`.seleccionada`); clic o `Enter` → `app.page = n` y cierra; flechas mueven la selección (`moverSeleccion` con las columnas reales medidas por `getBoundingClientRect`); `Esc`, `G` y `Tab` cierran. Mientras está abierta, intercepta las teclas (teclas.mjs consulta `interceptores` en orden: pantalla negra, cuadrícula).
  - Teclas: `g`/`G` y `Tab` → `cuadricula` en ambos modos (`Tab` con `preventDefault`).
  - Humo, fase `cuadricula`: `G` → existe la capa con 4 celdas (`.liberadopdf-cuadricula .celda` = 4) y la 1.ª tiene `.actual`; `Right` ×2 → la 3.ª tiene `.seleccionada`; `Enter` → página 3 y la capa desapareció; `Tab` → abre y `Esc` cierra sin cambiar de página.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/cuadricula.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moverSeleccion } from '../src/comun/cuadricula.mjs';

test('moverSeleccion por filas y columnas, acotado', () => {
  assert.equal(moverSeleccion(0, 10, 4, 'ArrowRight'), 1);
  assert.equal(moverSeleccion(3, 10, 4, 'ArrowRight'), 4);
  assert.equal(moverSeleccion(9, 10, 4, 'ArrowRight'), 9);
  assert.equal(moverSeleccion(0, 10, 4, 'ArrowLeft'), 0);
  assert.equal(moverSeleccion(1, 10, 4, 'ArrowDown'), 5);
  assert.equal(moverSeleccion(7, 10, 4, 'ArrowDown'), 9, 'última fila incompleta: va al final');
  assert.equal(moverSeleccion(5, 10, 4, 'ArrowUp'), 1);
  assert.equal(moverSeleccion(2, 10, 4, 'ArrowUp'), 2);
  assert.equal(moverSeleccion(5, 10, 4, 'Home'), 0);
  assert.equal(moverSeleccion(5, 10, 4, 'End'), 9);
  assert.equal(moverSeleccion(5, 10, 4, 'x'), 5);
});
```
```js
// añadir a test/teclas.test.mjs
test('G y Tab abren la cuadrícula en ambos modos', () => {
  assert.equal(accionDeTecla(ev('g'), ventana).accion, 'cuadricula');
  assert.equal(accionDeTecla(ev('Tab'), presentacion).accion, 'cuadricula');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `cuadricula` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Cuadrícula de láminas (G / Tab) con miniaturas propias"`.

---

### Task 8: Medición de distancias y áreas

**Files:**
- Create: `src/comun/medicion.mjs`, `src/renderer/medicion.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/main/menu.js`, `src/comun/teclas.mjs`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/medicion.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/medicion.mjs`: `export function puntosAPdf(puntoPx, { escala, rotacion, alto, ancho })` → punto en unidades de usuario del PDF (deshace `escala` del viewport y la `rotacion` 0/90/180/270 con el alto/ancho del viewport); `export function distanciaPdf(a, b)` → unidades de usuario; `export function areaPoligonoPdf(puntos)` → unidades² (fórmula del cordón, valor absoluto); `export function aUnidad(valorPt, unidad, userUnit = 1, { factor = 1, potencia = 1 } = {})` → número en `mm`/`cm`/`in` (1 pt = 1/72 in; `userUnit` multiplica; `factor` es la calibración del usuario; `potencia` 2 para áreas); `export function formatear(valor, unidad, potencia = 1)` → `'12,3 mm'` / `'4,56 cm²'` (coma decimal, 1 decimal en mm, 2 en cm/in); `export function factorDeCalibracion(medidaPt, realEnUnidad, unidad, userUnit)` → factor tal que `aUnidad(medidaPt, unidad, userUnit, { factor })` = `realEnUnidad`.
  - `src/renderer/medicion.mjs`: `export function instalarMedicion({ app, obtenerConfig, guardarPorDocumento })` → `{ distancia(), area(), calibrar(), cancelar() }`: capa `svg.liberadopdf-medicion` sobre la `.page` actual (modo ventana; se recoloca en `pagechanging`/`scalechanging`/`rotationchanging` recalculando con `app.pdfViewer.getPageView(n).viewport`); distancia: dos clics → línea y etiqueta; área: clics sucesivos, doble clic cierra → polígono y etiqueta; calibrar: dos clics + `prompt` nativo «Longitud real en <unidad>» → `guardarPorDocumento({ calibracion: factor })`; `Esc` borra y sale; `userUnit` = `(await app.pdfDocument.getPage(n)).userUnit`.
  - Menú Ver → «Medir distancia», «Medir área», «Calibrar escala…» (`alAccion`: `medirDistancia`, `medirArea`, `calibrar`); sin teclas nuevas.
  - Humo, fase `medicion` (con el ejemplo animado, página 1, zoom 100 % forzado con `PDFViewerApplication.pdfViewer.currentScaleValue = 1`): `medirDistancia()`, clic en (x,y) y (x+72·k, y) donde `k = devicePixelRatio`-independiente (72 px CSS a escala 1 = 1 in = 25,4 mm): la etiqueta dice `'25,4 mm'`; cambiar a zoom 2 (`currentScaleValue = 2`) y repetir con 144 px → `'25,4 mm'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/medicion.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puntosAPdf, distanciaPdf, areaPoligonoPdf, aUnidad, formatear, factorDeCalibracion } from '../src/comun/medicion.mjs';

test('píxeles a unidades PDF, independientes de zoom y rotación', () => {
  const v = { escala: 2, rotacion: 0, ancho: 1000, alto: 600 };
  assert.deepEqual(puntosAPdf({ x: 200, y: 100 }, v), { x: 100, y: 50 });
  const g = { escala: 1, rotacion: 90, ancho: 600, alto: 1000 };
  assert.deepEqual(puntosAPdf({ x: 600, y: 0 }, g), { x: 0, y: 0 });
  assert.deepEqual(puntosAPdf({ x: 0, y: 1000 }, g), { x: 1000, y: 600 });
});
test('distancia, área y unidades', () => {
  assert.equal(distanciaPdf({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(areaPoligonoPdf([{ x: 0, y: 0 }, { x: 72, y: 0 }, { x: 72, y: 72 }, { x: 0, y: 72 }]), 5184);
  assert.equal(aUnidad(72, 'mm'), 25.4);
  assert.equal(aUnidad(72, 'cm'), 2.54);
  assert.equal(aUnidad(72, 'in'), 1);
  assert.equal(aUnidad(72, 'mm', 2), 50.8, 'UserUnit 2');
  assert.equal(aUnidad(5184, 'in', 1, { potencia: 2 }), 1, 'área: 1 in²');
  assert.equal(formatear(25.4, 'mm'), '25,4 mm');
  assert.equal(formatear(1, 'in', 2), '1,00 in²');
});
test('calibración', () => {
  const f = factorDeCalibracion(72, 50.8, 'mm', 1);
  assert.equal(aUnidad(72, 'mm', 1, { factor: f }), 50.8);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `medicion` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Medición de distancias y áreas con calibración por documento"`.

---

### Task 9: Vista de presentador: ventana, notas, reloj y sincronización

**Files:**
- Create: `src/comun/notas.mjs`, `src/renderer/presentador.html`, `src/renderer/presentador.css`, `src/renderer/presentador.mjs`
- Modify: `src/main/ventanas.js`, `src/main/ipc.js`, `src/preload/preload.cjs`, `src/renderer/visor.mjs`, `src/comun/teclas.mjs`, `src/main/menu.js`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/notas.test.mjs`, `test/teclas.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/notas.mjs`: `export function parsearNotas(texto)` → `Map<string, string>` de etiqueta de lámina → texto: cabeceras `^#{1,3}\s*(\d+)` (admite `## 3`, `#3`, `## 3. Título (0:45)`); el texto es lo que sigue hasta la próxima cabecera, recortado; sin cabeceras → `Map` vacío; BOM y `\r\n` tolerados; `export function notaDe(notas, posicion)` → la nota de `posicion.etiqueta` o, si no hay, de `String(posicion.lamina)`, o `''`.
  - Archivo de notas: `<ruta del pdf>.notas.txt` (p. ej. `charla.pdf.notas.txt`); `ipc.js` `'leer-notas'(rutaPdf)` → texto o `''` (solo lee ese nombre exacto junto al PDF).
  - `src/main/ventanas.js`: `export function crearVentanaPresentador({ win, preload, pantalla })` → `BrowserWindow` 1100×700 sin menú, carga `liberadopdf://app/presentador.html?file=<url del pdf del visor>&ruta=<ruta>`; si `pantalla` (un `Display`) se le pasa, se abre con `bounds` dentro de esa pantalla; se cierra con la ventana del visor (`win.on('closed')`); referencia `win.liberadopdfPresentador`.
  - `ipc.js`: `'presentador-abrir'` → crea o enfoca; `'presentador-estado'({ pagina, totalPaginas, etiquetas })` desde el visor → `win.liberadopdfPresentador?.webContents.send('estado', …)`; `'presentador-cerrar'`.
  - `src/renderer/presentador.mjs`: importa `/vendor/pdfjs/build/pdf.mjs` (`GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/build/pdf.worker.mjs'`), carga el PDF de `?file=`, renderiza la página actual (grande, izquierda) y la siguiente (pequeña, derecha) en `canvas`; reloj, cronómetro (empieza al abrir; `R` lo reinicia) y la nota (`notaDe`) debajo; sigue `estado`; `←/→/PgUp/PgDn` en el presentador reenvían `'presentador-navegar'(delta)` al visor (`win.webContents.executeJavaScript('window.liberadopdfAcciones.siguiente()')`…).
  - `visor.mjs`: envía `'presentador-estado'` en cada `pagechanging` y al cargar; `Ctrl+Shift+P` → `presentador` (ambos modos); menú Ver → «Vista de presentador  Ctrl+Mayús+P».
  - Humo, fase `presentador` (con `ejemplo_animado.pdf` y un `ejemplo_animado.pdf.notas.txt` escrito por `scripts/humo.mjs` con `## 2\nNota de la dos`): `window.liberadopdfAcciones.presentador()` → existe una 2.ª `BrowserWindow`; a los 2 s, en ella `document.querySelector('.actual canvas')` no está en blanco (muestreo de píxeles) y `.nota` está vacía; en el visor `page = 2`; a los 500 ms la nota dice `Nota de la dos` y `.siguiente canvas` no está en blanco.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/notas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearNotas, notaDe } from '../src/comun/notas.mjs';

test('cabeceras variadas, BOM y CRLF', () => {
  const n = parsearNotas('\uFEFF## 1\r\nHola\r\n\r\n## 3. La plataforma (0:45)\r\nDos líneas\r\nmás\r\n#4\r\nCuatro');
  assert.equal(n.get('1'), 'Hola');
  assert.equal(n.get('3'), 'Dos líneas\nmás');
  assert.equal(n.get('4'), 'Cuatro');
  assert.equal(n.size, 3);
});
test('sin cabeceras → vacío; notaDe por etiqueta y por índice', () => {
  assert.equal(parsearNotas('texto suelto').size, 0);
  const n = parsearNotas('## 11\nOnce');
  assert.equal(notaDe(n, { etiqueta: '11', lamina: 12 }), 'Once');
  assert.equal(notaDe(n, { etiqueta: 'x', lamina: 11 }), 'Once');
  assert.equal(notaDe(n, { etiqueta: '2', lamina: 2 }), '');
});
```
```js
// añadir a test/teclas.test.mjs
test('Ctrl+Mayús+P abre la vista de presentador', () => {
  assert.equal(accionDeTecla(ev('P', { ctrlKey: true, shiftKey: true }), ventana).accion, 'presentador');
  assert.equal(accionDeTecla(ev('P', { ctrlKey: true, shiftKey: true }), presentacion).accion, 'presentador');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `presentador` `ok: true`.
- [ ] **Step 5: Commit** → `git commit -m "Vista de presentador: lámina actual y siguiente, reloj, cronómetro y notas"`.

---

### Task 10: Monitores y páginas con notas a la derecha (pgfpages)

**Files:**
- Create: `src/comun/pantallas.mjs`, `recursos/ejemplo_notas.tex`, `recursos/ejemplo_notas.pdf`
- Modify: `src/main/ipc.js`, `src/main/ventanas.js`, `src/renderer/visor.mjs`, `src/renderer/presentacion.mjs`, `src/renderer/presentador.mjs`, `src/renderer/ajustes.mjs`, `src/renderer/visor.css`, `scripts/generar_ejemplo.sh`, `src/main/humo.js`, `scripts/humo.mjs`
- Test: `test/pantallas.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/pantallas.mjs`: `export function elegirPantallas(pantallas, { monitorPresentacion, monitorPresentador })` → `{ presentacion: id|null, presentador: id|null }`: con una pantalla, ambos `null` (no mover); con dos o más y `'auto'`: presentación = la primera no principal, presentador = la principal; un número selecciona esa pantalla si existe (si no, `'auto'`); si ambas caen en la misma pantalla con dos disponibles, el presentador va a la otra.
  - Flujo de entrada en presentación: `acciones.presentacion()` → `await window.liberadopdf.antesDePresentar()` → `ipc` `'antes-de-presentar'`: calcula `elegirPantallas(screen.getAllDisplays(), config)`; si `presentacion` no es `null` y la ventana no está en esa pantalla (`screen.getDisplayMatching(win.getBounds()).id`), `win.setBounds(display.workArea)`; devuelve; el renderer llama entonces a `app.requestPresentationMode()` (la activación transitoria del gesto dura más que la ida y vuelta). La ventana de presentador se abre con `pantalla` = la elegida.
  - `recursos/ejemplo_notas.pdf`: Beamer 16:9, 3 láminas con `\note{…}` y `\setbeameroption{show notes on second screen=right}` (pgfpages), es decir páginas de doble ancho; PDF 1.4 sin flujos de objetos.
  - `notasDerecha` por documento (`config.porDocumento[ruta].notasDerecha`, ajuste en el diálogo de ajustes, sección «Este documento»): en el visor, en presentación, `.pdfViewer .page` recibe `clip-path: inset(0 50% 0 0)` y el contenedor `transform: scale(2) translateX(-25%)` con `transform-origin: left center` (el constructor afina para que la mitad izquierda llene la pantalla con el ajuste de página; si no logra que quede centrado verticalmente en 16:9, documenta la limitación); en el presentador, la página actual y la siguiente se dibujan recortando la mitad derecha (`viewport` con `offsetX = -ancho/2` y `canvas` de ancho mitad), y la nota del archivo `.notas.txt` se oculta si existe la mitad derecha.
  - Humo, fase `notasDerecha` (con `ejemplo_notas.pdf` y `LIBERADOPDF_CONFIG_PRUEBA` = `{ porDocumento: { [ruta]: { notasDerecha: true } } }`): en presentación, captura: la mitad derecha de la pantalla **no** contiene el texto de la nota (se comprueba comparando con una captura sin `notasDerecha`: deben diferir en la mitad derecha); el presentador muestra `.actual canvas` cuyo ancho/alto ≈ 16/9 (mitad derecha recortada) y no está en blanco.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/pantallas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirPantallas } from '../src/comun/pantallas.mjs';

const una = [{ id: 1, principal: true }];
const dos = [{ id: 1, principal: true }, { id: 2, principal: false }];
test('una pantalla: nada se mueve', () => {
  assert.deepEqual(elegirPantallas(una, { monitorPresentacion: 'auto', monitorPresentador: 'auto' }), { presentacion: null, presentador: null });
});
test('dos pantallas: presentación en la secundaria, presentador en la principal', () => {
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 'auto', monitorPresentador: 'auto' }), { presentacion: 2, presentador: 1 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 1, monitorPresentador: 'auto' }), { presentacion: 1, presentador: 2 });
  assert.deepEqual(elegirPantallas(dos, { monitorPresentacion: 9, monitorPresentador: 'auto' }), { presentacion: 2, presentador: 1 }, 'id inexistente → auto');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar**; generar `ejemplo_notas.pdf` y comprobar con pymupdf que sus páginas miden el doble de ancho que las del ejemplo animado.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → fase `notasDerecha` `ok: true` (WSLg tiene una sola pantalla: `antes-de-presentar` no mueve nada y se comprueba solo que no falla).
- [ ] **Step 5: Commit** → `git commit -m "Monitores (presentación al proyector, presentador al portátil) y notas de Beamer a la derecha"`.

---

### Task 11: Empaquetado, README y verificación en Windows

**Files:**
- Modify: `README.md`, `scripts/construir.sh`, `scripts/humo_windows.sh`, `src/renderer/ayuda.mjs`
- Test: `scripts/humo_windows.sh` en las fases `basica`, `cierre`, `guardar`, `cuadricula`, `presentador`, y `presentacionAnimada` con el PDF del congreso.

**Interfaces:**
- Produces: README con las funciones nuevas (teclas `N`, `G`/`Tab`, `L`/`S`/`D`/`C`, `Ctrl+,`, `Ctrl+S`, `Ctrl+Mayús+G`, `Ctrl+Mayús+S`, `Ctrl+Mayús+P`), el archivo de notas, la calibración de medidas, los monitores y la sección «Pendiente» reducida a 14, 23, 24, 28, 30 y macOS/Linux; `ayuda.mjs` con la tabla completa; `construir.sh` sin cambios de fondo (comprueba que `node_modules/pdf-lib` entra en el paquete: `npx asar list dist/…/resources/app.asar | grep pdf-lib.esm.min.js`).

- [ ] **Step 1:** `scripts/humo_windows.sh` acepta las fases nuevas (ya es genérico); ejecutar `npm run construir`.
- [ ] **Step 2:** En Windows: `scripts/humo_windows.sh basica`, `cierre`, `guardar`, `cuadricula`, `presentador`, y `presentacionAnimada "<PDF del congreso>" 11` → todos `ok: true` (la primera ejecución tras construir puede tardar por el antivirus; repetir).
- [ ] **Step 3:** README y ayuda; commit → `git commit -m "Entrega 2: README, ayuda de teclas y verificación en Windows"`.

---

## Self-review

- **Cobertura**: 13 (T3), 15 (T3), 18 (T5), 21 (pdf.js, verificado en T4), 22 (T4), 25–27 (T4), 29 (T8), 31 (T9 + T10), 34 (T6), 35 (T7), §4.6 (T2), §5.2·2 `/PageMode /FullScreen` (T1), menores de la revisión (T1), recomendaciones del revisor (avance en `pagechanging`, `render-process-gone`: T1). Fuera: 14, 23, 24, 28, 30.
- **Nombres consistentes**: `obtenerConfig`, `guardar`, `raizDeCapas`, `modoActual`, `interceptores` (T7 amplía el `interceptor` de la entrega 1 a una lista), `window.liberadopdfAcciones.{ajustes, instantanea, guardar, guardarComo, presentador, medirDistancia, medirArea, calibrar, cuadricula}`.
- **Review Focus**: 1 → T10; 2 → T4; 3 → T5; 4 → T9; 5 → T8.
- **Proporción**: once tareas, cada una con su prueba pura y su fase de humo; los cuerpos de función quedan al constructor.
