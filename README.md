# liberadoPDF

Visor y presentador de PDF para Windows, portable, que reproduce las animaciones del paquete LaTeX `animate` igual que Adobe Acrobat Reader. Por dentro lleva el visor de pdf.js, cuyo sandbox de JavaScript ejecuta las animaciones; liberadoPDF le añade la experiencia de presentación: pantalla completa, teclas y clicker, láminas con pasos, pantalla en negro, reloj, avance automático y recientes.

Nació para presentar un paper en IEEE ICA-ACCA 2026 cuya lámina 11 lleva un video incrustado con `animate`, que ningún visor instalado reproducía.

## Uso

1. Copia la carpeta `liberadoPDF-win32-x64` (o descomprime el `.zip`) al disco o a un pendrive. No hay que instalar nada.
2. Doble clic en `liberadoPDF.exe` abre la pantalla de inicio: «Abrir PDF», los últimos archivos abiertos y una zona para arrastrar un PDF.
3. También puedes usar «Abrir con…» sobre un PDF, arrastrar un PDF sobre el ejecutable o sobre la ventana, o pasarlo por línea de comandos.
4. `F5` o doble clic entran en presentación; `Esc` sale.
5. La X cierra la ventana sin preguntar, salvo que hayas anotado o rellenado campos sin guardar: entonces pregunta. (Las animaciones también modifican el PDF por dentro; eso no cuenta.)

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
| `N` | modo nocturno (próxima entrega) | igual |
| `Ctrl+O` / `Ctrl+N` | abrir / abrir en ventana nueva | igual |
| `Ctrl+F`, `Ctrl+P`, `+`, `-`, `r` | buscar, imprimir, zoom, rotar (pdf.js) | `r` anulada |
| `F1` | ayuda de teclas | ayuda de teclas |

Los clickers habituales envían `PgUp`/`PgDn`: funcionan sin configurar nada. En presentación, el contador «lámina X / Y · paso a / b» usa las etiquetas de página del PDF (Beamer repite la etiqueta en los pasos de una misma lámina).

## Ajustes

Se guardan en `data\config.json` junto al ejecutable (modo portable). Si esa carpeta no se puede escribir, en `%APPDATA%\liberadoPDF\config.json`.

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

El diálogo de ajustes (`Ctrl+,`) llega en la próxima entrega; por ahora se edita el archivo.

## Construir desde WSL o Linux

Requisitos: Node 24, una pantalla (WSLg) para la prueba de humo, y para el PDF de ejemplo un TeX Live con `beamer`, `tikz` y `animate`.

```bash
npm install
npm test            # pruebas unitarias (node --test)
npm run humo        # prueba de humo: lanza Electron, comprueba animación, teclas, presentación, contador, bucle, inicio
npm run construir   # dist/liberadoPDF-win32-x64/ y dist/liberadoPDF-win32-x64.zip
scripts/humo_windows.sh                                         # prueba de humo sobre el .exe, lanzado desde WSL
scripts/humo_windows.sh presentacionAnimada "ruta/al/pdf" 11    # ¿la animación de la página 11 corre en presentación?
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

Entrega 2: modo nocturno, instantánea al portapapeles, transiciones `/Trans`, guardar formularios y anotaciones, notas adhesivas y firma (editores de pdf.js), medición, vista de presentador con notas y segundo monitor, puntero láser, foco y dibujo, cuadrícula de láminas, diálogo de ajustes.

Fuera de alcance: leer en voz alta, video y audio incrustados (media9), 3D, validación de firmas digitales, comparar PDF, empaquetado para macOS y Linux.

## Licencia

MIT. pdf.js se distribuye en `vendor/pdfjs/` bajo Apache 2.0 (ver `vendor/pdfjs/LICENSE`).
