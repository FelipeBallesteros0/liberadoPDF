# liberadoPDF

Visor y presentador de PDF para Windows, portable, que reproduce las animaciones del paquete LaTeX `animate` igual que Adobe Acrobat Reader. Por dentro lleva el visor de pdf.js, cuyo sandbox de JavaScript ejecuta las animaciones; liberadoPDF le añade la experiencia de presentación: pantalla completa, teclas y clicker, láminas con pasos, pantalla en negro, reloj, avance automático y recientes.

Nació para presentar un paper en IEEE ICA-ACCA 2026 cuya lámina 11 lleva un video incrustado con `animate`, que ningún visor instalado reproducía.

## Uso

1. Copia la carpeta `liberadoPDF-win32-x64` (o descomprime el `.zip`) al disco o a un pendrive. No hay que instalar nada.
2. Doble clic en `liberadoPDF.exe` abre la pantalla de inicio: «Abrir PDF», los últimos archivos abiertos y una zona para arrastrar un PDF.
3. También puedes usar «Abrir con…» sobre un PDF, arrastrar un PDF sobre el ejecutable o sobre la ventana, o pasarlo por línea de comandos.
4. `F5` o doble clic entran en presentación; `Esc` sale.
5. **Modo presentación** está en la barra principal (icono de pantalla junto a «»»). Con Ver ▸ «Personalizar barra…» o la última entrada del menú «»» eliges qué botones van en la barra y cuáles no; se recuerda en `config.json` (`barra`).
6. La X cierra la ventana sin preguntar, salvo que hayas anotado o rellenado campos sin guardar: entonces pregunta. (Las animaciones también modifican el PDF por dentro; eso no cuenta.)

**Primer arranque en un PC nuevo**: Windows y el antivirus analizan el ejecutable la primera vez y puede tardar 10–20 s; después abre en menos de 2 s. Ábrelo una vez antes de la charla. Desde un pendrive USB 2.0 el primer arranque también es lento: conviene copiar la carpeta al disco.

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

## Ajustes

`Ctrl+,` o Ver ▸ Ajustes…: avance automático, bucle, transiciones, color de fondo, cursor, pantallas, unidad de medida, modo nocturno y tema. Se guardan en `data\config.json` junto al ejecutable (modo portable; en `data\` queda también la caché de Chromium). Si esa carpeta no se puede escribir, en `%APPDATA%\liberadoPDF\config.json`.

```json
{
  "presentacion": {
    "avanceSegundos": 0,
    "bucle": false,
    "fondo": "#000000",
    "ocultarCursor": true
  }
}
```

- `avanceSegundos`: avanzar solo cada N segundos en presentación (0 = no).
- `bucle`: al terminar, volver a la primera lámina (modo quiosco).
- `fondo`: color alrededor de la lámina en presentación.
- `ocultarCursor`: ocultar el cursor tras 2 s sin moverlo.

## Construir desde WSL o Linux

Requisitos: Node 24, una pantalla (WSLg) para la prueba de humo, Python 3 con Pillow para el icono, y para el PDF de ejemplo un TeX Live con `beamer`, `tikz` y `animate`.

```bash
npm install
npm test            # pruebas unitarias (node --test)
npm run humo        # prueba de humo: lanza Electron, comprueba animación, teclas, presentación, contador, bucle, inicio
npm run construir   # dist/liberadoPDF-win32-x64/ y dist/liberadoPDF-win32-x64.zip
scripts/humo_windows.sh                                         # prueba de humo sobre el .exe, lanzado desde WSL
scripts/humo_windows.sh presentacionAnimada "ruta/al/pdf" 11    # ¿la animación de la página 11 corre en presentación?
scripts/humo_windows.sh guardar | cuadricula | presentador | cierre   # otras fases sobre el .exe
```

El icono del `.exe` lo pone `wine` (si está instalado) o `rcedit-x64.exe` en `~/tools/rcedit/` ejecutado por interop de WSL ([electron/rcedit](https://github.com/electron/rcedit/releases)). Sin ninguno de los dos, el ejecutable queda con el icono por defecto de Electron.

## Estructura

- `src/main/`: proceso principal de Electron (protocolo `liberadopdf://`, ventanas, menú, IPC, configuración, prueba de humo).
- `src/preload/preload.cjs`: puente seguro hacia el renderer e inyección de la capa propia sobre el visor de pdf.js.
- `src/renderer/`: la capa de liberadoPDF sobre el visor (teclas, presentación, contador, ayuda) y la pantalla de inicio.
- `src/comun/`: lógica pura, probada con `node --test`.
- `vendor/pdfjs/`: pdf.js 6.4.299 tal cual (no se modifica).
- `docs/superpowers/`: diseño y planes.

## Pendiente

Fuera de alcance: leer en voz alta, video y audio incrustados (media9), 3D, validación de firmas digitales, comparar PDF, empaquetado para macOS y Linux.

## Licencia

MIT. pdf.js se distribuye en `vendor/pdfjs/` bajo Apache 2.0 (ver `vendor/pdfjs/LICENSE`).
