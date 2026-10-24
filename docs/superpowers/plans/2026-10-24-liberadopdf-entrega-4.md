# liberadoPDF Entrega 4 Implementation Plan (inglés por defecto y video)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interfaz en inglés por defecto con español como opción (relanzando la app al cambiar) y reproducción silenciada de los videos incrustados o enlazados en el PDF (RichMedia, Screen, Movie), en ventana y en presentación.

**Architecture:** Diccionario español→inglés (`src/comun/i18n/en.mjs`) y traductor puro (`src/comun/i18n.mjs`); el idioma viaja en la configuración y llega al renderer por el preload; el main fija `--lang` y relanza al cambiar. Los videos los lista el worker con pdf-lib (`listarVideos`) y `src/renderer/videos.mjs` superpone `<video>` sobre el rectángulo de cada anotación dentro del `.page` de pdf.js, reposicionándolo en cada `pagerendered`.

**Tech Stack:** Electron 45, pdf.js 6.4.299 (sin modificar), pdf-lib 1.17.1, ffmpeg (solo para generar el fixture).

**Spec:** `docs/superpowers/specs/2026-10-23-liberadopdf-design.md` §9.

## Global Constraints

- Las restricciones de la entrega 3 siguen (nunca sobrescribir, resultados a archivo nuevo, sin red salvo la URL de 46, raíces del protocolo acotadas).
- Código y commits en español; interfaz por `t()`; sin texto en blanco: clave sin traducción → español.
- La prueba de humo corre con `LIBERADOPDF_IDIOMA=es` (solo humo) salvo la fase `idioma`.
- Video siempre silenciado (`muted`), nunca audio.

## Review Focus

1. Clave sin traducción: `t('x')` devuelve `'x'`; prueba unitaria que recorre `src/` y exige entrada en `en.mjs` para cada literal usado con `t(`.
2. Cambio de idioma con un documento abierto: la app se relanza y vuelve a abrir el mismo PDF (ruta con espacios/ñ) en la misma página; fase `idioma`.
3. Video externo fuera de la carpeta del PDF (`../x.mp4` o ruta absoluta): se rechaza; prueba unitaria de `rutaDeVideoPermitida`.
4. Códec no reproducible (HEVC) o archivo ausente: aviso sobre el rectángulo, nunca una excepción que rompa la página; fase `video` con un archivo externo inexistente.
5. Zoom y presentación: el video sigue pegado a su rectángulo tras cambiar de zoom y al entrar en presentación; fase `video`.

---

### Task 1: Traductor, diccionario y configuración de idioma

**Files:**
- Create: `src/comun/i18n.mjs`, `src/comun/i18n/en.mjs`, `test/i18n.test.mjs`
- Modify: `src/comun/config.mjs`, `test/config.test.mjs`

**Interfaces:**
- Produces: `crearTraductor(idioma, diccionarios = { en })` → `t(texto, params = {})` (sustituye `{clave}`; `'es'` devuelve el texto tal cual; clave ausente → texto español); `IDIOMAS = ['en', 'es']`; `normalizarConfig` acepta `idioma` (por defecto `'en'`, cualquier otro valor → `'en'`); `claveDeIdioma(config, env)` → `env.LIBERADOPDF_IDIOMA` si está (solo humo) y si no `config.idioma`.

- [ ] Pruebas: `t('Unir PDF…')` → `'Merge PDF…'` en `en`; `'es'` devuelve igual; clave ausente igual; `t('Página {n} / {total}', { n: 2, total: 4 })` → `'Page 2 / 4'`; `normalizarConfig({})` → `idioma: 'en'`; `normalizarConfig({ idioma: 'xx' })` → `'en'`; `claveDeIdioma`.
- [ ] Prueba «cobertura»: recorre `src/**/*.mjs|js|cjs|html`, extrae `t('…')` y `t(\`…\`)` sin interpolación, y falla con la lista de claves sin entrada en `en.mjs` (se mantiene verde al final de la Tarea 3).
- [ ] Implementar; `npm test`; commit `"Idioma: traductor y diccionario inglés"`.

### Task 2: Main en dos idiomas y relanzado

**Files:**
- Modify: `src/main/main.js` (`--lang` desde la configuración efectiva), `src/main/menu.js` (todas las etiquetas por `t`), `src/main/ipc.js` (`config-inicial` síncrono con `{ tema, idioma }`; `cambiar-idioma` → guarda y `app.relaunch({ args: [ruta] })` + `app.exit()`), `src/preload/preload.cjs` (`window.liberadopdf.idioma`, `cambiarIdioma`), `src/renderer/ajustes.mjs` (select Idioma: English / Español), `src/renderer/inicio.html|mjs` y `src/renderer/presentador.html|mjs` (textos por `t`).
- Humo: fase `idioma` (sin `LIBERADOPDF_IDIOMA`): menú `File/View/Tools/Help`, `#previous.title` de pdf.js en inglés, ayuda F1 con «Keys», diálogo de numerar con «Page numbers» y texto por defecto `Page {n} / {total}`; con `LIBERADOPDF_CONFIG_PRUEBA={"idioma":"es"}` todo en español. El cambio de idioma desde Ajustes no se prueba relanzando (el humo no sobrevive al relanzado): se comprueba que `cambiar-idioma` guarda `idioma` en config.json y que el main llamó a `relaunch` (en humo, `app.relaunch` se sustituye por un registro en `resultado.json`).

- [ ] Fase `idioma` RED; implementar; `npm test`, `npm run humo` (con `LIBERADOPDF_IDIOMA=es` en las demás fases); commit `"Idioma: menú, inicio, presentador y relanzado"`.

### Task 3: Renderer en dos idiomas

**Files:**
- Modify: todos los módulos de `src/renderer/` y `src/renderer/herramientas/` con texto visible (ayuda, contador, barra, toasts, ajustes, cuadrícula, medición, base y las 17 herramientas), `src/comun/herramientas/nombres.mjs` (sufijos traducibles), `src/renderer/herramientas/trabajador.mjs` (los mensajes de error se traducen al mostrarlos: `avisar(t(e.message))`).
- Test: `test/i18n.test.mjs` (cobertura) en verde; fase `idioma` ampliada (sufijo de resultado `- merged.pdf`, toast «Saved in …»).

- [ ] Implementar módulo a módulo manteniendo `npm test` verde; `npm run humo`; commit `"Idioma: renderer y herramientas en inglés"`.

### Task 4: Video en el PDF

**Files:**
- Create: `src/comun/video.mjs` (puro: `rutaDeVideoPermitida(carpetaPdf, relativa)`, `rectanguloEnPagina(rect, viewport)`, `opcionesDeReproduccion(anotacion, config)`, `mimeDeVideo(bytes)` por bytes mágicos: `ftyp` → mp4, `1A 45 DF A3` → webm), `src/renderer/videos.mjs`, `recursos/ejemplo_video.tex`, `recursos/video.mp4`, `scripts/generar_video.sh`, `test/video.test.mjs`
- Modify: `src/renderer/herramientas/trabajador.mjs` (`listarVideos({ bytes })` → `[{ pagina, rect, tipo, bytes?, archivo?, autoarranque, bucle }]`), `src/main/ipc.js` (`archivo-junto-al-pdf` → token o null, solo dentro de la carpeta del PDF), `src/preload/preload.cjs`, `src/comun/config.mjs` (`video: { autoarranque: true, bucle: true }`), `src/renderer/ajustes.mjs`, `src/renderer/visor.mjs`, `src/renderer/visor.css`, `scripts/fixtures.mjs` (anotación Screen con pdf-lib), `src/main/humo.js`, `scripts/humo.mjs`, `scripts/generar_ejemplo.sh`.
- Humo `video`: `ejemplo_video.pdf` (lámina 1 `\movie` externo, lámina 2 media9 incrustado) + fixture con Screen incrustado + lámina con externo inexistente: en cada caso `video` dentro del `.page` con `readyState ≥ 2`, `paused === false`, `currentTime` que avanza, rectángulo dentro del de la página (±2 px) tras cambiar el zoom y en presentación; el inexistente muestra el aviso y no rompe la página.

- [ ] Pruebas unitarias RED → GREEN; fase `video` RED → GREEN; commit `"Video: reproducción silenciada de RichMedia, Screen y Movie"`.

### Task 5: README, ayuda, empaquetado y Windows

- [ ] `README.md` (idioma, video, cómo meter un video con Beamer: `\movie` o `media9`), `README.en.md`, ayuda F1 (fila de video), `construir.sh` (ignorar `video.mp4` no: es fixture de 50 KB, se queda), construir, `humo_windows.sh` en `idioma` y `video`, basica, presentacionAnimada con el PDF de la presentación real. Commit `"Entrega 4: documentación y verificación en Windows"`.
