# liberadoPDF, entrega 1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un ejecutable portable para Windows que abre un PDF, lo presenta a pantalla completa reproduciendo las animaciones del paquete `animate`, se navega con teclado y clicker, recuerda los recientes y abre archivos por doble clic, «Abrir con…» y arrastre.

**Architecture:** Electron (proceso principal en ESM) sirve por un protocolo propio `liberadopdf://app/` el visor genérico de pdf.js 6.4.299 vendored sin modificar, más una capa propia en el renderer (`visor.mjs` y módulos) que habla con el visor por su global `PDFViewerApplication`. Toda la lógica que no toca el DOM ni Electron vive en `src/comun/` y se prueba con `node --test`; lo que sí los toca se verifica con una prueba de humo que lanza Electron bajo WSLg y, empaquetado, en Windows.

**Tech Stack:** Node 24, Electron 45.0.x, pdf.js 6.4.299 (dist prebuilt), `@electron/packager` 20, `node:test`. Sin frameworks de UI. LaTeX local (TeX Live 2026 con `animate`, `beamer`, `tikz`) para el PDF de ejemplo.

**Spec:** `docs/superpowers/specs/2026-10-23-liberadopdf-design.md` (secciones 2, 3, 4.1·1–12, 4.2·16–17·19–20, 4.4·32–33·36, 4.5, 5).

## Global Constraints

- Idioma de interfaz, comentarios, nombres de archivo, README y mensajes de commit: español; nombres de variables en español sin tildes.
- `vendor/pdfjs/` es la distribución `pdfjs-6.4.299-dist` tal cual, sin parches; solo se añade la capa de liberadoPDF fuera de esa carpeta.
- Electron con `contextIsolation: true`, `nodeIntegration: false`; sin telemetría ni peticiones a internet; enlaces externos siempre por `shell.openExternal`, nunca navegación de la ventana.
- Config y recientes en `data/config.json` junto al ejecutable si es escribible (portable), si no en `app.getPath('userData')`; en desarrollo, `<proyecto>/data/` (ignorado por git).
- Arranque: primera página visible en menos de 3 s desde el lanzamiento (la prueba de humo mide hasta el primer `pagerendered`).
- Antimetas: nada que instalar en el PC destino; el clicker (`PgUp`/`PgDn`) solo cambia de lámina; el visor no reinterpreta el PDF (autoplay, bucle y portada los decide el PDF).
- Licencia MIT; pdf.js conserva su `LICENSE` Apache 2.0 en `vendor/pdfjs/`.

## Review Focus

1. Rutas de PDF con espacios, tildes, `ñ`, `#` o `%`: deben abrir igual. La URL del visor usa un token opaco, nunca la ruta; prueba en Tarea 6 (`urlVisor`) con `C:\Charlas\ñandú #2 100%.pdf`.
2. Ruta inexistente, archivo que no es PDF o PDF corrupto por argumento o arrastre: pantalla de inicio con el mensaje, nunca un diálogo modal ni cierre; prueba en Tarea 10 (`rutasDeArgumentos` y mensaje de `inicio.html`).
3. PDF sin `/PageLabels`, con etiquetas no numéricas («i», «ii», «1») o con etiquetas repetidas: el contador y «número + Enter» deben degradar a páginas; pruebas en Tarea 8.
4. Pulsar teclas mientras el foco está en un `input` de pdf.js (número de página, buscador): no deben cambiar de página; prueba en Tarea 7 (`accionDeTecla` con `enEntrada: true` devuelve `null`).
5. `config.json` corrupto, vacío, con claves desconocidas o de una versión anterior: se cargan valores por defecto sin perder lo válido; pruebas en Tareas 2 y 3.

---

### Task 1: Esqueleto del proyecto y pdf.js vendored

**Files:**
- Create: `package.json`, `.gitignore`, `LICENSE`, `README.md`, `vendor/pdfjs/` (copia de `build/`, `web/` y `LICENSE` del zip `pdfjs-6.4.299-dist.zip`, sin `web/compressed.tracemonkey-pldi-09.pdf`), `test/.gitkeep`
- Test: `test/esqueleto.test.mjs`

**Interfaces:**
- Produces: `package.json` con `"type": "module"`, `"main": "src/main/main.js"`, scripts `start` (`electron .`), `test` (`node --test test/`), `humo` (`node scripts/humo.mjs`), `construir` (`bash scripts/construir.sh`); dependencias exactas: `electron@45.0.0` (dev), `@electron/packager@20.3.0` (dev), `pdfjs-dist@6.4.299` (prod; API para miniaturas en la entrega 2, se instala ya para fijar versión).

- [ ] **Step 1: Escribir la prueba que falla**

```js
// test/esqueleto.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('pdf.js vendored completo y sin PDF de muestra', () => {
  for (const f of ['vendor/pdfjs/build/pdf.mjs', 'vendor/pdfjs/build/pdf.worker.mjs', 'vendor/pdfjs/build/pdf.sandbox.mjs', 'vendor/pdfjs/web/viewer.html', 'vendor/pdfjs/web/viewer.mjs', 'vendor/pdfjs/web/locale/locale.json', 'vendor/pdfjs/LICENSE']) {
    assert.ok(existsSync(f), f);
  }
  assert.ok(!existsSync('vendor/pdfjs/web/compressed.tracemonkey-pldi-09.pdf'));
});

test('package.json fija versiones y módulos ES', () => {
  const p = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(p.type, 'module');
  assert.equal(p.main, 'src/main/main.js');
  assert.equal(p.devDependencies.electron, '45.0.0');
  assert.equal(p.dependencies['pdfjs-dist'], '6.4.299');
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd /mnt/c/Users/Felipe/Desktop/liberadoPDF && npm test`
Expected: FAIL (no existe `package.json` válido ni `vendor/pdfjs`).

- [ ] **Step 3: Crear el esqueleto**

`npm init -y` y editar `package.json` según Interfaces (nombre `liberadopdf`, versión `0.1.0`, `description` «Visor y presentador de PDF que reproduce las animaciones del paquete animate», `license: MIT`, `author`). `.gitignore`: `node_modules/`, `dist/`, `data/`, `*.log`, `test/salida/`. `LICENSE` MIT a nombre de Felipe Ballesteros, 2026. Copiar del zip ya descargado (`/tmp/claude-1000/-home-felipe/28848846-74cb-4005-9b60-94c297b006ec/scratchpad/spike/pdfjs_dist/`, y si no existe, descargar `https://github.com/mozilla/pdf.js/releases/download/v6.4.299/pdfjs-6.4.299-dist.zip`) `build/`, `web/`, `LICENSE` a `vendor/pdfjs/`, borrando el PDF de muestra. `npm install electron@45.0.0 @electron/packager@20.3.0 --save-dev --save-exact` y `npm install pdfjs-dist@6.4.299 --save-exact`. README inicial: nombre, qué es, estado «en construcción», licencia.

- [ ] **Step 4: Ejecutar la prueba y ver que pasa**

Run: `npm test`
Expected: PASS (2 pruebas).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Esqueleto del proyecto y pdf.js 6.4.299 vendored"
```

---

### Task 2: Configuración y recientes (lógica pura)

**Files:**
- Create: `src/comun/config.mjs`
- Test: `test/config.test.mjs`

**Interfaces:**
- Produces:
  - `export const MAX_RECIENTES = 10`
  - `export function valoresPorDefecto()` → `{ version: 1, recientes: [], presentacion: { avanceSegundos: 0, bucle: false, transiciones: true, fondo: '#000000', ocultarCursor: true }, unidadMedida: 'mm', nocturno: false, tema: 'sistema', monitorPresentacion: 'auto', monitorPresentador: 'auto', porDocumento: {} }`
  - `export function normalizarConfig(entrada)` → `Config`: acepta `undefined`, `null`, objetos parciales o con tipos erróneos y devuelve siempre un `Config` completo; conserva claves válidas, descarta las desconocidas, sustituye las de tipo incorrecto por el valor por defecto; `recientes` se filtra a entradas con `ruta` string no vacía.
  - `export function agregarReciente(recientes, { ruta, nombre, fecha })` → nueva lista: la entrada va primero, se elimina cualquier otra con la misma `ruta`, se recorta a `MAX_RECIENTES`; no muta la entrada.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/config.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valoresPorDefecto, normalizarConfig, agregarReciente, MAX_RECIENTES } from '../src/comun/config.mjs';

test('valores por defecto', () => {
  const c = valoresPorDefecto();
  assert.equal(c.presentacion.avanceSegundos, 0);
  assert.equal(c.presentacion.fondo, '#000000');
  assert.deepEqual(c.recientes, []);
});

test('normalizar: entradas rotas vuelven a los valores por defecto sin perder lo válido', () => {
  assert.deepEqual(normalizarConfig(undefined), valoresPorDefecto());
  assert.deepEqual(normalizarConfig(null), valoresPorDefecto());
  const c = normalizarConfig({ presentacion: { bucle: true, fondo: 42 }, nocturno: 'si', desconocida: 1, recientes: [{ ruta: 'a.pdf' }, { sinRuta: true }, { ruta: '' }] });
  assert.equal(c.presentacion.bucle, true);
  assert.equal(c.presentacion.fondo, '#000000');
  assert.equal(c.nocturno, false);
  assert.equal('desconocida' in c, false);
  assert.deepEqual(c.recientes.map(r => r.ruta), ['a.pdf']);
});

test('agregarReciente: primero, sin duplicados, máximo 10', () => {
  let lista = [];
  for (let i = 1; i <= 12; i++) lista = agregarReciente(lista, { ruta: `C:\\\\x\\\\${i}.pdf`, nombre: `${i}.pdf`, fecha: i });
  assert.equal(lista.length, MAX_RECIENTES);
  assert.equal(lista[0].ruta, 'C:\\\\x\\\\12.pdf');
  const otra = agregarReciente(lista, { ruta: 'C:\\\\x\\\\5.pdf', nombre: '5.pdf', fecha: 99 });
  assert.equal(otra[0].ruta, 'C:\\\\x\\\\5.pdf');
  assert.equal(otra.filter(r => r.ruta === 'C:\\\\x\\\\5.pdf').length, 1);
  assert.equal(lista[0].ruta, 'C:\\\\x\\\\12.pdf', 'no muta la entrada');
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL con «Cannot find module '../src/comun/config.mjs'».

- [ ] **Step 3: Implementar `src/comun/config.mjs`** con las tres funciones y la constante de Interfaces. `normalizarConfig` recorre las claves de `valoresPorDefecto()` y copia de la entrada solo valores del mismo `typeof` (objetos anidados, recursivamente; arrays solo para `recientes`).

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/comun/config.mjs test/config.test.mjs && git commit -m "Configuración y recientes: valores por defecto, normalización y lista de recientes"
```

---

### Task 3: Lectura y escritura de `config.json` (modo portable)

**Files:**
- Create: `src/main/config.js`
- Test: `test/config-archivo.test.mjs`

**Interfaces:**
- Consumes: `normalizarConfig`, `valoresPorDefecto` de Tarea 2.
- Produces:
  - `export function carpetaDatos({ ejecutable, empaquetada, raizProyecto, userData, puedeEscribir })` → `string`: si `empaquetada`, `path.join(path.dirname(ejecutable), 'data')` cuando `puedeEscribir(esaCarpeta)` es `true`, si no `userData`; si no `empaquetada`, `path.join(raizProyecto, 'data')`. `puedeEscribir(dir)` crea el directorio si falta y comprueba escritura; se inyecta para poder probar.
  - `export function cargarConfig(archivo)` → `Config` (si el archivo falta, está vacío o no es JSON válido, devuelve `normalizarConfig(undefined)`).
  - `export function guardarConfig(archivo, config)` → escribe `JSON.stringify(normalizarConfig(config), null, 2)` de forma atómica (`archivo + '.tmp'` y `renameSync`), creando la carpeta si falta.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/config-archivo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { carpetaDatos, cargarConfig, guardarConfig } from '../src/main/config.js';

test('carpetaDatos: portable si se puede escribir junto al ejecutable, si no userData, y en desarrollo data/ del proyecto', () => {
  const base = { ejecutable: 'C:\\\\u\\\\liberadoPDF.exe', raizProyecto: '/p', userData: '/ud' };
  assert.equal(carpetaDatos({ ...base, empaquetada: true, puedeEscribir: () => true }), path.join('C:\\\\u', 'data'));
  assert.equal(carpetaDatos({ ...base, empaquetada: true, puedeEscribir: () => false }), '/ud');
  assert.equal(carpetaDatos({ ...base, empaquetada: false, puedeEscribir: () => true }), path.join('/p', 'data'));
});

test('cargar: ausente, vacío o corrupto → valores por defecto; guardar: atómico y relee igual', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'liberadopdf-'));
  const archivo = path.join(dir, 'sub', 'config.json');
  assert.equal(cargarConfig(archivo).presentacion.fondo, '#000000');
  guardarConfig(archivo, { presentacion: { bucle: true } });
  assert.ok(existsSync(archivo));
  assert.ok(!existsSync(archivo + '.tmp'));
  assert.equal(cargarConfig(archivo).presentacion.bucle, true);
  writeFileSync(archivo, '{ esto no es json');
  assert.equal(cargarConfig(archivo).presentacion.bucle, false);
  writeFileSync(archivo, '');
  assert.deepEqual(cargarConfig(archivo).recientes, []);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → `npm test` FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `src/main/config.js`** (ESM, solo `node:fs` y `node:path`; no importa `electron`, para que sea testeable).

- [ ] **Step 4: Ejecutar y ver que pasa** → `npm test` PASS.

- [ ] **Step 5: Commit** → `git commit -m "config.json portable: carpeta de datos, carga tolerante y escritura atómica"`.

---

### Task 4: Resolución de rutas y tipos MIME del protocolo (lógica pura)

**Files:**
- Create: `src/comun/rutas.mjs`
- Test: `test/rutas.test.mjs`

**Interfaces:**
- Produces:
  - `export function mimeDe(nombre)` → string por extensión: `html→text/html; mjs,js→text/javascript; css→text/css; json→application/json; ftl→text/plain; svg→image/svg+xml; png→image/png; ico→image/x-icon; gif→image/gif; wasm→application/wasm; pdf→application/pdf; map→application/json; bcmap,pfb,icc,otf,ttf,woff2→application/octet-stream`; cualquier otra → `application/octet-stream`.
  - `export function resolverRutaApp(pathname, raices)` → `{ archivo, mime } | null`. `raices` es una lista ordenada de `{ prefijo, carpeta }` (p. ej. `[{ prefijo: '/vendor/pdfjs/', carpeta: '/abs/vendor/pdfjs' }, { prefijo: '/', carpeta: '/abs/src/renderer' }]`). Toma la primera raíz cuyo `prefijo` coincide, decodifica `%xx`, une con `path.resolve` y devuelve `null` si el resultado queda fuera de `carpeta` (`..`, rutas absolutas, `%2e%2e`). `pathname` `'/'` → `'/inicio.html'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/rutas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mimeDe, resolverRutaApp } from '../src/comun/rutas.mjs';

const raices = [{ prefijo: '/vendor/pdfjs/', carpeta: path.resolve('/r/vendor/pdfjs') }, { prefijo: '/', carpeta: path.resolve('/r/src/renderer') }];

test('mime por extensión', () => {
  assert.equal(mimeDe('viewer.mjs'), 'text/javascript');
  assert.equal(mimeDe('a.pdf'), 'application/pdf');
  assert.equal(mimeDe('x.bcmap'), 'application/octet-stream');
  assert.equal(mimeDe('sinextension'), 'application/octet-stream');
});

test('resolver dentro de las raíces y rechazar escapes', () => {
  assert.deepEqual(resolverRutaApp('/vendor/pdfjs/web/viewer.mjs', raices), { archivo: path.resolve('/r/vendor/pdfjs/web/viewer.mjs'), mime: 'text/javascript' });
  assert.deepEqual(resolverRutaApp('/visor.html', raices), { archivo: path.resolve('/r/src/renderer/visor.html'), mime: 'text/html' });
  assert.equal(resolverRutaApp('/', raices).archivo, path.resolve('/r/src/renderer/inicio.html'));
  assert.equal(resolverRutaApp('/vendor/pdfjs/../../secreto', raices), null);
  assert.equal(resolverRutaApp('/%2e%2e/%2e%2e/etc/passwd', raices), null);
  assert.equal(resolverRutaApp('/vendor/pdfjs/web/locale/es-ES/viewer.ftl', raices).mime, 'text/plain');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar `src/comun/rutas.mjs`.**
- [ ] **Step 4: Ejecutar y ver que pasa** → PASS.
- [ ] **Step 5: Commit** → `git commit -m "Resolución de rutas del protocolo liberadopdf:// y tipos MIME"`.

---

### Task 5: PDF de ejemplo con animación

**Files:**
- Create: `recursos/ejemplo_animado.tex`, `recursos/ejemplo_animado.pdf`, `scripts/generar_ejemplo.sh`
- Test: `test/ejemplo.test.mjs`

**Interfaces:**
- Produces: `recursos/ejemplo_animado.pdf`: Beamer `aspectratio=169`, 4 páginas: (1) portada «liberadoPDF: PDF de ejemplo»; (2) lámina «Animación» con `\begin{animateinline}[autoplay,loop,poster=first]{12}` y `\multiframe{24}{iAngulo=0+15}{...}` que dibuja con TikZ un cuadrado azul (`#0077B6`) de 3 cm girado `\iAngulo` grados dentro de un lienzo fijo de 6×6 cm (24 fotogramas, 2 s por vuelta); (3) y (4) lámina «Pasos» con `\pause` (dos páginas que comparten etiqueta «3»). Tamaño < 200 KB.

- [ ] **Step 1: Escribir la prueba que falla**

```js
// test/ejemplo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

test('el PDF de ejemplo existe, es pequeño y trae la animación', () => {
  const bytes = readFileSync('recursos/ejemplo_animado.pdf');
  assert.ok(statSync('recursos/ejemplo_animado.pdf').size < 200_000);
  const texto = bytes.toString('latin1');
  assert.ok(texto.includes('/Count 4'), 'cuatro páginas');
  assert.ok(texto.includes('animation by animate'), 'widget anm0 de animate');
  assert.ok(texto.includes('/PageLabels'));
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL (archivo inexistente).

- [ ] **Step 3: Escribir `recursos/ejemplo_animado.tex` y `scripts/generar_ejemplo.sh`** (`pdflatex -interaction=nonstopmode -output-directory=/tmp/… recursos/ejemplo_animado.tex` dos veces con `PATH=$HOME/.local/bin:$PATH`, copia el PDF a `recursos/`). Ejecutarlo.

- [ ] **Step 4: Ejecutar la prueba** → PASS. Comprobar además con `python3 -c "import pymupdf; d=pymupdf.open('recursos/ejemplo_animado.pdf'); print(len(d), d.get_page_labels())"` que hay 4 páginas y etiquetas `1,2,3,3`.

- [ ] **Step 5: Commit** → `git add recursos scripts/generar_ejemplo.sh test/ejemplo.test.mjs && git commit -m "PDF de ejemplo con animación de animate para pruebas"`.

---

### Task 6: Proceso principal, protocolo, ventana del visor y prueba de humo

**Files:**
- Create: `src/main/main.js`, `src/main/protocolo.js`, `src/main/ventanas.js`, `src/main/ipc.js`, `src/main/humo.js`, `src/preload/preload.cjs`, `src/renderer/visor.html`, `src/renderer/visor.css`, `src/renderer/visor.mjs`, `scripts/humo.mjs`, `scripts/humo.sh`
- Test: `scripts/humo.mjs` (prueba de humo; `npm run humo`)

**Interfaces:**
- Consumes: Tareas 2, 3, 4.
- Produces:
  - `src/main/protocolo.js`: `export const ESQUEMA = 'liberadopdf'`, `export const HOST = 'app'`; `export function registrarEsquemaPrivilegiado()` (antes de `app.whenReady`: `protocol.registerSchemesAsPrivileged([{ scheme: ESQUEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: false } }])`); `export function instalarProtocolo({ raices })` (`protocol.handle(ESQUEMA, …)`: `pathname` que empieza por `/pdf/` → bytes del PDF del token con `Content-Type: application/pdf` y `Accept-Ranges: none`; si no, `resolverRutaApp` y `fs.readFile`; 404 si `null`); `export function registrarPdf(ruta)` → token hex de 16 bytes; `export function rutaDeToken(token)`; `export function urlVisor(ruta)` → `liberadopdf://app/visor.html?file=` + `encodeURIComponent('liberadopdf://app/pdf/' + token)`; `export function urlInicio(mensaje)` → `liberadopdf://app/inicio.html` + (`?mensaje=` codificado si hay).
  - `src/main/ventanas.js`: `export function crearVentana({ ruta, config, preload })` → `BrowserWindow` 1280×800, `autoHideMenuBar: false`, `webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true }`; carga `urlVisor(ruta)` o `urlInicio()`; `setWindowOpenHandler` y `will-navigate`: `http(s):`/`mailto:` → `shell.openExternal`, todo lo demás denegado; en `enter-html-full-screen` oculta la barra de menú y en `leave-html-full-screen` la muestra. `export function abrirEnVentana(win, ruta)` → `win.loadURL(urlVisor(ruta))`. `export function ventanaActiva()` → `BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]`.
  - `src/main/ipc.js`: `export function instalarIpc({ obtenerConfig, guardar, abrirEnNueva })` con `ipcMain.handle` para `'abrir-dialogo'` → `string|null` (diálogo `filters: [{ name: 'PDF', extensions: ['pdf'] }]`), `'abrir-en-esta'(ruta)`, `'abrir-en-nueva'(ruta)`, `'recientes'` → lista filtrada por `existsSync`, `'config'` → `Config`, `'guardar-config'(parcial)` (fusiona y guarda), `'abrir-externo'(url)` (solo `http(s)`/`mailto`), `'documento-abierto'({ ruta, nombre })` (añade a recientes y guarda), `'humo-evento'({ nombre, t })`. Canal `main → renderer`: `'accion'(nombre)`.
  - `src/preload/preload.cjs`: antes de nada escribe en `localStorage['pdfjs.preferences']` la fusión de lo existente con `{ enableScripting: true, enableXfa: true, enableComment: true, enableSignatureEditor: true, disablePreferences: false }`; expone `window.liberadopdf = { abrirDialogo(), abrirEnEstaVentana(ruta), abrirEnVentanaNueva(ruta), recientes(), config(), guardarConfig(parcial), abrirExterno(url), rutaDeArchivo(file) /* webUtils.getPathForFile */, documentoAbierto(info), humoEvento(nombre), alAccion(cb) }`.
  - `src/renderer/visor.html`: copia de `vendor/pdfjs/web/viewer.html` con (a) todas las rutas relativas `../build/` → `/vendor/pdfjs/build/` y las locales (`viewer.css`, `viewer.mjs`, `locale/`, `images/`) → `/vendor/pdfjs/web/…`, (b) `<link rel="stylesheet" href="/visor.css">` y `<script type="module" src="/visor.mjs"></script>` al final del `<body>`. (Nota para quien lo haga: pdf.js carga `locale/`, `cmaps/`, `standard_fonts/`, `iccs/`, `wasm/`, `images/` y `build/pdf.sandbox.mjs` desde las opciones `localeProperties`/`cMapUrl`/… que se derivan de la URL de `viewer.mjs`; si alguna carga sale a `/web/…` en vez de `/vendor/pdfjs/web/…`, se corrige añadiendo esa raíz a `raices` en `main.js`, no tocando pdf.js.)
  - `src/renderer/visor.mjs`: `const app = window.PDFViewerApplication; await app.initializedPromise;` luego `app.eventBus.on('documentloaded', …)` → `window.liberadopdf.documentoAbierto({ ruta, nombre })` (la ruta llega por `?ruta=` **no**: llega por IPC `'ruta-documento'` que `main` envía tras `did-finish-load`; el renderer la guarda en `window.liberadopdfEstado.ruta`), `document.title = nombre + ' · liberadoPDF'`; `app.eventBus.on('pagerendered', …, { once: true })` → `humoEvento('primera-pagina')`. Exporta en `window.liberadopdfAcciones = { presentacion() { app.requestPresentationMode(); } }` para que `main` pueda invocarla con `executeJavaScript(…, true)`.
  - `src/main/main.js`: `app.setName('liberadoPDF')`; en Linux `app.commandLine.appendSwitch('no-sandbox')`; `registrarEsquemaPrivilegiado()`; `requestSingleInstanceLock()` (si falla, `app.quit()`); calcula `carpetaDatos` con `puedeEscribir` real y `app.setPath('userData', esaCarpeta)`; carga config; en `whenReady`: `instalarProtocolo`, `instalarIpc`, abre una ventana por cada PDF de `rutasDeArgumentos(process.argv)` (Tarea 10 la define; hasta entonces, `process.argv.slice(app.isPackaged ? 1 : 2)` filtrado por `.pdf`) o la pantalla de inicio si no hay ninguna; `second-instance` → abre ventanas con los argumentos nuevos; `window-all-closed` → `app.quit()`. Si `process.env.LIBERADOPDF_HUMO` está definido, llama a `ejecutarHumo({ ruta: process.env.LIBERADOPDF_PDF, salida: process.env.LIBERADOPDF_HUMO })` en vez del arranque normal.
  - `src/main/humo.js`: `export async function ejecutarHumo({ ruta, salida })`: `t0 = Date.now()`; crea la ventana con `ruta`; espera `'humo-evento' primera-pagina` → `msPrimeraPagina`; `executeJavaScript('PDFViewerApplication.page = 2')`; espera 1500 ms; `capturePage()` → `a`; espera 400 ms; `capturePage()` → `b`; `animacion = difieren(a, b)` (compara `toBitmap()` en el rectángulo central 40 % de la ventana, cuenta píxeles con diferencia > 16 en algún canal; `true` si > 200); `sendInputEvent({ type: 'keyDown', keyCode: 'PageDown' })` + `keyUp`; espera 300 ms; `pagina3 = (await executeJavaScript('PDFViewerApplication.page')) === 3`; `executeJavaScript('window.liberadopdfAcciones.presentacion()', true)`; espera 1000 ms; `presentacion = await executeJavaScript('PDFViewerApplication.pdfPresentationMode.active') && win.isFullScreen()`; escribe `salida/resultado.json` `{ ok, msPrimeraPagina, animacion, pagina3, presentacion, errores: [] }` y `salida/t1.png`, `salida/t2.png`; `app.exit(ok ? 0 : 1)`. `ok = msPrimeraPagina < 3000 && animacion && pagina3 && presentacion`.
  - `scripts/humo.mjs`: copia `recursos/ejemplo_animado.pdf` a `test/salida/ñandú #2 100%.pdf` (Review Focus 1: espacios, ñ, `#`, `%`) y lanza `node_modules/.bin/electron . ` con env `LIBERADOPDF_HUMO=test/salida/humo`, `LIBERADOPDF_PDF=<esa copia, ruta absoluta>`, `DISPLAY`/`WAYLAND_DISPLAY` heredados, timeout 40 s; imprime el JSON; sale con el código de Electron. `scripts/humo.sh` = `npm run humo` con `PATH=$HOME/tools/node/bin:$PATH`.

- [ ] **Step 1: Escribir la prueba de humo que falla** (`scripts/humo.mjs` y `src/main/humo.js` según Interfaces).

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm run humo`
Expected: FAIL (no existe `src/main/main.js`).

- [ ] **Step 3: Implementar** `protocolo.js`, `ventanas.js`, `ipc.js`, `preload.cjs`, `visor.html`, `visor.css` (vacío salvo un comentario), `visor.mjs`, `main.js` según Interfaces. `raices` en `main.js`: `[{ prefijo: '/vendor/pdfjs/', carpeta: <raíz>/vendor/pdfjs }, { prefijo: '/', carpeta: <raíz>/src/renderer }]` donde `<raíz>` es `app.getAppPath()` (funciona dentro de `app.asar`).

- [ ] **Step 4: Ejecutar la prueba de humo y ver que pasa**

Run: `npm run humo`
Expected: `{"ok":true,"msPrimeraPagina":<3000,"animacion":true,"pagina3":true,"presentacion":true,"errores":[]}` y código 0. Abrir `test/salida/humo/t1.png` y `t2.png` para confirmar a ojo que la lámina 2 muestra el cuadrado en dos ángulos distintos.

- [ ] **Step 5: Probar también a mano** `npm start -- recursos/ejemplo_animado.pdf` (WSLg): se ve la ventana con el visor de pdf.js en español, el cuadrado gira solo en la lámina 2, `F11`/`Ctrl+Alt+P` de pdf.js entran en presentación. Cerrar.

- [ ] **Step 6: Commit** → `git add -A && git commit -m "Electron: protocolo liberadopdf://, ventana del visor, preload, IPC y prueba de humo"`.

---

### Task 7: Teclas y ayuda

**Files:**
- Create: `src/comun/teclas.mjs`, `src/renderer/teclas.mjs`, `src/renderer/ayuda.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/main/humo.js`
- Test: `test/teclas.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/teclas.mjs`: `export function accionDeTecla(ev, contexto)` → `{ accion, valor? } | null`. `ev` = `{ key, code, shiftKey, ctrlKey, altKey, metaKey }`; `contexto` = `{ modo: 'ventana' | 'presentacion', enEntrada: boolean }`. Si `enEntrada` → `null` siempre, salvo `Escape` y `F1`/`F5`. Tabla (sin `ctrl`/`alt`/`meta` salvo donde se indica): `ArrowRight, ArrowDown, PageDown, ' ', Enter` → `siguiente` (`Enter` devuelve `irALamina` si `contexto.digitos` no está vacío); `ArrowLeft, ArrowUp, PageUp, Backspace` → `anterior`; con `shiftKey`, `ArrowRight`/`ArrowLeft` → `siguienteLamina`/`anteriorLamina`; `Home` → `primera`; `End` → `ultima`; `0`–`9` → `{ accion: 'digito', valor }`; `F5` → `presentacion` (solo en `ventana`); `F1` → `ayuda`; `t`/`T` → `reloj`, `b`/`B` → `negro`, `w`/`W` → `blanco` (los tres solo en `presentacion`); `n`/`N` → `nocturno` (ambos modos; en esta entrega la acción existe pero no hace nada); `r`, `R`, `h`, `s` en `presentacion` → `{ accion: 'nada' }` (se detienen para que pdf.js no gire ni cambie de herramienta); `Ctrl+O` → `abrir`; `Ctrl+N` → `abrirNueva`; `Escape` → `null` (lo maneja pdf.js). Todo lo que devuelve algo distinto de `null` se detiene (`preventDefault` + `stopImmediatePropagation`).
  - `src/renderer/teclas.mjs`: `export function instalarTeclas({ app, acciones, modoActual })`: `window.addEventListener('keydown', …, { capture: true })`; `enEntrada` = el `event.target` es `input`, `textarea`, `select` o `isContentEditable`; mantiene el búfer de dígitos (se vacía a los 1500 ms o con `Enter`/`Escape`) y lo muestra en un `div.liberadopdf-digitos` abajo a la derecha mientras haya dígitos. `acciones` es un objeto `{ siguiente(), anterior(), siguienteLamina(), anteriorLamina(), primera(), ultima(), irALamina(n), presentacion(), ayuda(), reloj(), negro(), blanco(), nocturno(), abrir(), abrirNueva() }`.
  - `src/renderer/ayuda.mjs`: `export function mostrarAyuda()` / `ocultarAyuda()` / `alternarAyuda()`: capa `div.liberadopdf-ayuda` con la tabla de §4.5 de la especificación (texto fijo en español), `Esc` o clic la cierran.
  - En `visor.mjs`, `acciones.siguiente/anterior/primera/ultima` cambian `app.page`; `irALamina(n)` usa `paginaDeLamina` (Tarea 8; hasta entonces `app.page = n`); `presentacion()` → `app.requestPresentationMode()`; `abrir()` → `liberadopdf.abrirDialogo()` y, si devuelve ruta, `abrirEnEstaVentana`; `abrirNueva()` → diálogo y `abrirEnVentanaNueva`.
  - `humo.js` añade: con el foco en el campo de número de página (`executeJavaScript('document.getElementById("pageNumber").focus()')`), `PageDown` no cambia de página (`enEntrada`), y tras `blur`, `ArrowRight` sí (`flechaEnEntrada: true` en el JSON).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/teclas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionDeTecla } from '../src/comun/teclas.mjs';

const ev = (key, extra = {}) => ({ key, code: key, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...extra });
const ventana = { modo: 'ventana', enEntrada: false, digitos: '' };
const presentacion = { modo: 'presentacion', enEntrada: false, digitos: '' };

test('navegación básica y por lámina', () => {
  for (const k of ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']) assert.equal(accionDeTecla(ev(k), ventana).accion, 'siguiente', k);
  for (const k of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) assert.equal(accionDeTecla(ev(k), presentacion).accion, 'anterior', k);
  assert.equal(accionDeTecla(ev('ArrowRight', { shiftKey: true }), ventana).accion, 'siguienteLamina');
  assert.equal(accionDeTecla(ev('Home'), ventana).accion, 'primera');
  assert.equal(accionDeTecla(ev('End'), ventana).accion, 'ultima');
});

test('dígitos y Enter saltan a la lámina', () => {
  assert.deepEqual(accionDeTecla(ev('7'), ventana), { accion: 'digito', valor: '7' });
  assert.equal(accionDeTecla(ev('Enter'), { ...ventana, digitos: '7' }).accion, 'irALamina');
});

test('teclas de modo: F5 solo en ventana; T, B, W solo en presentación; r/h/s anuladas en presentación', () => {
  assert.equal(accionDeTecla(ev('F5'), ventana).accion, 'presentacion');
  assert.equal(accionDeTecla(ev('F5'), presentacion), null);
  assert.equal(accionDeTecla(ev('t'), presentacion).accion, 'reloj');
  assert.equal(accionDeTecla(ev('t'), ventana), null);
  assert.equal(accionDeTecla(ev('b'), presentacion).accion, 'negro');
  assert.equal(accionDeTecla(ev('w'), presentacion).accion, 'blanco');
  assert.equal(accionDeTecla(ev('r'), presentacion).accion, 'nada');
  assert.equal(accionDeTecla(ev('r'), ventana), null);
  assert.equal(accionDeTecla(ev('n'), ventana).accion, 'nocturno');
});

test('con el foco en un campo de texto no se navega', () => {
  assert.equal(accionDeTecla(ev('PageDown'), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('5'), { ...ventana, enEntrada: true }), null);
  assert.equal(accionDeTecla(ev('F1'), { ...ventana, enEntrada: true }).accion, 'ayuda');
});

test('atajos con Ctrl y Escape', () => {
  assert.equal(accionDeTecla(ev('o', { ctrlKey: true }), ventana).accion, 'abrir');
  assert.equal(accionDeTecla(ev('n', { ctrlKey: true }), ventana).accion, 'abrirNueva');
  assert.equal(accionDeTecla(ev('Escape'), presentacion), null);
  assert.equal(accionDeTecla(ev('ArrowRight', { ctrlKey: true }), ventana), null);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar** `src/comun/teclas.mjs`, `src/renderer/teclas.mjs`, `src/renderer/ayuda.mjs`, cablear en `visor.mjs`, estilos en `visor.css`, ampliar `humo.js`.
- [ ] **Step 4: Ejecutar** `npm test` → PASS y `npm run humo` → `ok: true` con `flechaEnEntrada: true`.
- [ ] **Step 5: Commit** → `git commit -m "Teclas de navegación y presentación con prioridad sobre pdf.js, y ayuda F1"`.

---

### Task 8: Etiquetas de página: láminas y pasos

**Files:**
- Create: `src/comun/etiquetas.mjs`, `src/renderer/contador.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/main/humo.js`
- Test: `test/etiquetas.test.mjs`

**Interfaces:**
- Produces:
  - `export function agruparEtiquetas(etiquetas, totalPaginas)` → `Grupos` con `laminas: [{ etiqueta, primeraPagina, paginas }]` (grupos de páginas consecutivas con la misma etiqueta; si `etiquetas` es `null` o su longitud no es `totalPaginas`, cada página es su propio grupo con `etiqueta = String(pagina)`), `posicion(pagina)` → `{ lamina, totalLaminas, paso, pasos, etiqueta }` (1-based), `paginaDeLamina(n)` → primera página del grupo `n` o, si `n` no es un índice válido pero coincide con alguna `etiqueta`, la primera página de ese grupo; si no, `null`; `siguienteLamina(pagina)` / `anteriorLamina(pagina)` → primera página del grupo siguiente/anterior (o `null` en los extremos).
  - `src/renderer/contador.mjs`: `export function instalarContador({ app, grupos })`: en presentación muestra `div.liberadopdf-contador` abajo a la izquierda, pequeño y semitransparente, con «lámina X / Y» y, si `pasos > 1`, « · paso a / b»; se actualiza en `pagechanging`; oculto en modo ventana (pdf.js ya muestra la página).
  - En `visor.mjs`, tras `documentloaded`: `const etiquetas = await app.pdfDocument.getPageLabels(); grupos = agruparEtiquetas(etiquetas, app.pagesCount)`; `irALamina(n)` → `paginaDeLamina(n)`; `siguienteLamina`/`anteriorLamina` → las del grupo.
  - `humo.js` añade: con el PDF de ejemplo (etiquetas `1,2,3,3`), en página 4 `posicion` del contador dice «lámina 3 / 3 · paso 2 / 2» (`executeJavaScript` lee `document.querySelector('.liberadopdf-contador').textContent`), y `Shift+ArrowLeft` desde la página 4 lleva a la 2 (`contadorYSaltos: true`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/etiquetas.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparEtiquetas } from '../src/comun/etiquetas.mjs';

test('Beamer con pasos: etiquetas repetidas forman láminas', () => {
  const g = agruparEtiquetas(['0', '1', '2', '2', '2', '3'], 6);
  assert.equal(g.laminas.length, 4);
  assert.deepEqual(g.posicion(4), { lamina: 3, totalLaminas: 4, paso: 2, pasos: 3, etiqueta: '2' });
  assert.equal(g.paginaDeLamina(3), 3);
  assert.equal(g.paginaDeLamina(9), null);
  assert.equal(g.siguienteLamina(3), 6);
  assert.equal(g.siguienteLamina(6), null);
  assert.equal(g.anteriorLamina(5), 2);
  assert.equal(g.anteriorLamina(1), null);
});

test('sin etiquetas o con longitud incoherente: una lámina por página', () => {
  for (const etiquetas of [null, undefined, ['1', '2']]) {
    const g = agruparEtiquetas(etiquetas, 3);
    assert.equal(g.laminas.length, 3);
    assert.deepEqual(g.posicion(2), { lamina: 2, totalLaminas: 3, paso: 1, pasos: 1, etiqueta: '2' });
    assert.equal(g.paginaDeLamina(3), 3);
  }
});

test('etiquetas no numéricas: saltar por etiqueta cuando el número no es índice', () => {
  const g = agruparEtiquetas(['i', 'ii', '1', '2', '2'], 5);
  assert.equal(g.laminas.length, 4);
  assert.equal(g.paginaDeLamina(2), 2, 'índice de lámina');
  assert.equal(g.paginaDeLamina(7), null);
  assert.deepEqual(g.posicion(5), { lamina: 4, totalLaminas: 4, paso: 2, pasos: 2, etiqueta: '2' });
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar** `src/comun/etiquetas.mjs`, `src/renderer/contador.mjs`, cablear, ampliar `humo.js`.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → `ok: true`, `contadorYSaltos: true`.
- [ ] **Step 5: Commit** → `git commit -m "Láminas y pasos a partir de /PageLabels: contador y saltos"`.

---

### Task 9: Modo presentación: entrada, fondo, cursor, negro/blanco, reloj, avance automático y bucle

**Files:**
- Create: `src/comun/presentacion.mjs`, `src/renderer/presentacion.mjs`
- Modify: `src/renderer/visor.mjs`, `src/renderer/visor.css`, `src/main/ventanas.js`, `src/main/humo.js`
- Test: `test/presentacion.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/presentacion.mjs`: `export function siguientePagina(actual, total, bucle)` → `actual + 1`, o `1` si `actual === total && bucle`, o `null` si `actual === total && !bucle`; `export function textoReloj(ahoraMs, inicioMs)` → `{ hora: 'HH:MM', transcurrido: 'MM:SS' }` (horas locales; `transcurrido` pasa a `H:MM:SS` desde una hora).
  - `src/renderer/presentacion.mjs`: `export function instalarPresentacion({ app, config, acciones })`: escucha `presentationmodechanged` (`state === 1` → entrando; `state === 0` → saliendo) y mantiene `modoActual()` → `'ventana' | 'presentacion'`; aplica `config.presentacion.fondo` como `--liberadopdf-fondo` sobre `#viewerContainer` en presentación; `ocultarCursor`: añade la clase `liberadopdf-sin-cursor` tras 2 s sin `mousemove` y la quita al mover; `negro()`/`blanco()`: capa `div.liberadopdf-pantalla` a pantalla completa que se cierra con cualquier `keydown` o clic (y ese evento no navega); `reloj()`: alterna `div.liberadopdf-reloj` abajo a la derecha actualizado cada segundo con `textoReloj`; el cronómetro empieza al entrar en presentación; avance automático: si `config.presentacion.avanceSegundos > 0`, un temporizador llama a `siguientePagina` con `bucle`; cualquier acción de navegación lo reinicia; se detiene al salir. Doble clic en modo ventana → `acciones.presentacion()`.
  - `ventanas.js`: ya oculta la barra de menú en pantalla completa (Tarea 6); añade `win.on('leave-html-full-screen', …)` para restaurar el tamaño previo si cambió.
  - `humo.js` añade: con `LIBERADOPDF_CONFIG_PRUEBA='{"presentacion":{"avanceSegundos":1,"bucle":true}}'` (el `main` fusiona ese JSON sobre la config solo en modo humo), tras entrar en presentación en la página 4, a los 1500 ms la página es 1 (`bucle: true` en el JSON); `b` muestra la capa negra (`document.querySelector('.liberadopdf-pantalla')` existe) y `ArrowRight` la quita sin cambiar de página.

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/presentacion.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguientePagina, textoReloj } from '../src/comun/presentacion.mjs';

test('siguientePagina respeta el bucle', () => {
  assert.equal(siguientePagina(1, 4, false), 2);
  assert.equal(siguientePagina(4, 4, false), null);
  assert.equal(siguientePagina(4, 4, true), 1);
});

test('textoReloj', () => {
  const inicio = Date.UTC(2026, 11, 9, 15, 0, 0);
  const t = textoReloj(inicio + 125_000, inicio);
  assert.equal(t.transcurrido, '02:05');
  assert.match(t.hora, /^\d\d:\d\d$/);
  assert.equal(textoReloj(inicio + 3_725_000, inicio).transcurrido, '1:02:05');
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar** según Interfaces.
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → `ok: true`, `bucle: true`, `pantallaNegra: true`.
- [ ] **Step 5: Commit** → `git commit -m "Modo presentación: fondo, cursor, pantalla negra/blanca, reloj, avance automático y bucle"`.

---

### Task 10: Pantalla de inicio, recientes, menú, argumentos, segunda instancia y arrastrar

**Files:**
- Create: `src/comun/argumentos.mjs`, `src/renderer/inicio.html`, `src/renderer/inicio.css`, `src/renderer/inicio.mjs`, `src/main/menu.js`
- Modify: `src/main/main.js`, `src/main/ipc.js`, `src/renderer/visor.mjs`, `src/main/humo.js`
- Test: `test/argumentos.test.mjs`

**Interfaces:**
- Produces:
  - `src/comun/argumentos.mjs`: `export function rutasDeArgumentos(argv, { empaquetada, existe, cwd })` → `{ rutas: string[], errores: string[] }`: descarta el ejecutable (y el `.` o la ruta del proyecto cuando no está empaquetada) y cualquier argumento que empiece por `-`; resuelve relativas contra `cwd`; una ruta que no existe → mensaje «No existe el archivo: <ruta>»; una existente cuya extensión no es `.pdf` (sin distinguir mayúsculas) → «No es un PDF: <ruta>».
  - `src/renderer/inicio.html` + `inicio.mjs`: título «liberadoPDF», botón «Abrir PDF» (→ `abrirDialogo` → `abrirEnEstaVentana`), lista «Recientes» (nombre, carpeta en gris, fecha; clic abre en esta ventana; `Ctrl`+clic en nueva), zona «Arrastra un PDF aquí» (toda la ventana acepta `drop`), y un `p.liberadopdf-mensaje` que muestra `?mensaje=` si viene. Pie: «F1: teclas · Ctrl+O: abrir · Ctrl+N: ventana nueva».
  - En `visor.mjs`: `dragover`/`drop` en `window` (capture) → `rutaDeArchivo(file)`; si termina en `.pdf`, `abrirEnEstaVentana`, si no, nada; pdf.js no recibe el `drop`.
  - `src/main/menu.js`: `export function construirMenu({ recientes, alAbrir, alAbrirNueva, alReciente, alAccion })` → `Menu` en español: **Archivo** (Abrir… `Ctrl+O`, Abrir en ventana nueva… `Ctrl+N`, submenú Recientes con hasta 10 entradas y «Vaciar lista», separador, Salir `Alt+F4`), **Ver** (Presentación `F5`, Pantalla completa `F11`), **Ayuda** (Teclas `F1`, Acerca de liberadoPDF). Los aceleradores se muestran pero los ítems de Ver y Ayuda no llevan `accelerator` (las teclas las maneja el renderer); al hacer clic, `alAccion('presentacion' | 'ayuda')` → `main` ejecuta `webContents.executeJavaScript('window.liberadopdfAcciones.<accion>()', true)`. «Acerca de» → `dialog.showMessageBox` con versión, «pdf.js 6.4.299 (Apache 2.0)», «Electron 45», «MIT».
  - `main.js`: usa `rutasDeArgumentos`; si hay `errores` y ninguna ruta válida, abre la pantalla de inicio con el primer error como `mensaje`; `second-instance` igual; reconstruye el menú cada vez que cambian los recientes (`'documento-abierto'`, «Vaciar lista»).
  - `humo.js` añade: lanzar con `LIBERADOPDF_PDF` apuntando a una ruta inexistente escribe en el JSON `inicioConMensaje: true` si la ventana carga `inicio.html` y el `p.liberadopdf-mensaje` contiene «No existe el archivo» (segunda ejecución de Electron dentro del script, `modo: 'inexistente'`).

- [ ] **Step 1: Escribir las pruebas que fallan**

```js
// test/argumentos.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { rutasDeArgumentos } from '../src/comun/argumentos.mjs';

const existe = r => ['/d/charla.pdf', '/d/notas.txt', '/d/con espacios ñ.PDF'].includes(r);

test('empaquetada: argv[0] es el exe; acepta .pdf en cualquier caja; resuelve relativas', () => {
  const r = rutasDeArgumentos(['C:\\\\liberadoPDF.exe', '/d/charla.pdf', '--flag', 'con espacios ñ.PDF'], { empaquetada: true, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, ['/d/charla.pdf', path.resolve('/d', 'con espacios ñ.PDF')]);
  assert.deepEqual(r.errores, []);
});

test('desarrollo: salta electron y la ruta del proyecto', () => {
  const r = rutasDeArgumentos(['/n/electron', '.', '/d/charla.pdf'], { empaquetada: false, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, ['/d/charla.pdf']);
});

test('errores: inexistente y no PDF', () => {
  const r = rutasDeArgumentos(['exe', '/d/nada.pdf', '/d/notas.txt'], { empaquetada: true, existe, cwd: '/d' });
  assert.deepEqual(r.rutas, []);
  assert.deepEqual(r.errores, ['No existe el archivo: /d/nada.pdf', 'No es un PDF: /d/notas.txt']);
});
```

- [ ] **Step 2: Ejecutar y ver que falla** → FAIL.
- [ ] **Step 3: Implementar** según Interfaces (estilo de `inicio.html`: fondo blanco, tipografía del sistema, acento `#0077B6`, sin dependencias).
- [ ] **Step 4: Ejecutar** `npm test` → PASS; `npm run humo` → `ok: true`, `inicioConMensaje: true`. A mano en WSLg: `npm start` sin argumentos muestra la pantalla de inicio; abrir el ejemplo; cerrar; volver a abrir y verlo en Recientes y en el menú Archivo; arrastrar el PDF sobre la ventana lo abre.
- [ ] **Step 5: Commit** → `git commit -m "Pantalla de inicio, recientes, menú en español, argumentos, instancia única y arrastrar y soltar"`.

---

### Task 11: Ejecutable portable para Windows y README

**Files:**
- Create: `scripts/construir.sh`, `scripts/icono.py`, `recursos/icono.png`, `recursos/icono.ico`, `scripts/humo_windows.sh`
- Modify: `README.md`, `package.json` (script `construir`)
- Test: `scripts/humo_windows.sh` (prueba de humo sobre el ejecutable de Windows, lanzado desde WSL por interop)

**Interfaces:**
- Produces:
  - `scripts/icono.py`: genera con Pillow `recursos/icono.png` (512×512: página blanca con esquina doblada sobre fondo `#0077B6` y un triángulo «play» blanco) y `recursos/icono.ico` (16, 32, 48, 64, 128, 256).
  - `scripts/construir.sh`: `set -euo pipefail`; `PATH=$HOME/tools/node/bin:$PATH`; `npm test`; `npm run humo`; `npx @electron/packager . liberadoPDF --platform=win32 --arch=x64 --out=dist --overwrite --asar --app-version=<package.json> --ignore='^/(dist|test|docs|scripts|data|\.git)(/|$)'` con `--icon=recursos/icono.ico --win32metadata.ProductName=liberadoPDF --win32metadata.FileDescription="Visor y presentador de PDF"` si `command -v wine` existe, y sin esas opciones si no (imprime «Sin wine: el ejecutable queda con el icono por defecto de Electron»); copia `recursos/ejemplo_animado.pdf` y `README.md` a `dist/liberadoPDF-win32-x64/`; crea `dist/liberadoPDF-win32-x64.zip` (`python3 -m zipfile -c` si no hay `zip`); imprime la ruta y el tamaño.
  - `scripts/humo_windows.sh`: ejecuta desde WSL `cmd.exe /c "set LIBERADOPDF_HUMO=C:\...\test\salida\humo_windows&& set LIBERADOPDF_PDF=C:\...\recursos\ejemplo_animado.pdf&& dist\liberadoPDF-win32-x64\liberadoPDF.exe"` (rutas con `wslpath -w`), espera el `resultado.json` y lo imprime; código 0 si `ok`.
  - `README.md`: qué es, descarga/uso (copiar la carpeta o el zip al pendrive, doble clic en `liberadoPDF.exe`, «Abrir con…», arrastrar), teclas (tabla de §4.5), ajustes (`data/config.json`), aviso de arranque desde USB 2.0, cómo construir desde WSL (`npm install`, `npm test`, `npm run humo`, `npm run construir`), cómo poner el icono si no hay wine, licencia (MIT; pdf.js Apache 2.0), sección «Pendiente» con 14, 23, 24, 28, 30 y las funciones de la entrega 2 (13, 15, 18, 21–22, 25–27, 29, 31, 34, 35).

- [ ] **Step 1: Escribir `scripts/humo_windows.sh`** (la prueba) y ejecutarlo → FAIL (no existe `dist/`).
- [ ] **Step 2: Implementar** `scripts/icono.py`, generar los iconos, escribir `scripts/construir.sh`, ejecutarlo.
- [ ] **Step 3: Ejecutar `scripts/humo_windows.sh`** → `resultado.json` con `ok: true`, `msPrimeraPagina < 3000` (ejecutable en disco), `animacion: true`, `presentacion: true`. Abrir `t1.png`/`t2.png` generados en Windows y confirmar el cuadrado en dos ángulos.
- [ ] **Step 4: Probar a mano en Windows** (Felipe o Claude por interop): doble clic en `liberadoPDF.exe` → inicio; «Abrir con…» sobre `presentacion_icaacca2026.pdf` → se abre; `F5` → pantalla completa; ir a la lámina 11 → el video se mueve en bucle; `PgDn`/`PgUp` cambian de lámina; `Esc` sale; `data/config.json` aparece junto al ejecutable con el reciente.
- [ ] **Step 5: Escribir `README.md`** y commit → `git add -A && git commit -m "Empaquetado portable para Windows, icono, prueba de humo en Windows y README"`.

---

## Self-review (hecho al escribir el plan)

- **Cobertura de la especificación (entrega 1)**: §4.1·1–11 vienen con pdf.js (Tarea 6 deja la barra visible); 12 en Tarea 10; §4.2·16–17 en Tarea 6 y 9; 19–20 en Tarea 9; §4.4·32–33 en Tarea 9; 36 en Tarea 8; §4.5 en Tarea 7 (más `ayuda`); §5.1 estructura, protocolo, preload, config, empaquetado y pruebas en Tareas 1, 3, 6, 11; §5.2 en Tarea 10 (`/PageMode /FullScreen` queda para la entrega 2 con las transiciones, porque Beamer no lo usa). Fuera de este plan y dentro de la especificación: 13, 15, 18, 21–22, 25–27, 29, 31, 34, 35, ajustes `Ctrl+,` (§4.6) y «Guardar como» → plan de la entrega 2.
- **Consistencia de nombres**: `urlVisor`, `urlInicio`, `registrarPdf`, `rutaDeToken`, `crearVentana`, `abrirEnVentana`, `instalarIpc`, `window.liberadopdf.*`, `window.liberadopdfAcciones.*`, `accionDeTecla`, `instalarTeclas`, `agruparEtiquetas`, `instalarContador`, `siguientePagina`, `textoReloj`, `instalarPresentacion`, `rutasDeArgumentos`, `construirMenu` se usan con el mismo nombre en todas las tareas.
- **Review Focus**: 1 → Tarea 6 (humo con ruta con espacios y ñ: el script copia el ejemplo a `test/salida/ñandú #2 100%.pdf` y lo usa como `LIBERADOPDF_PDF`); 2 → Tarea 10; 3 → Tarea 8; 4 → Tarea 7; 5 → Tareas 2 y 3.
