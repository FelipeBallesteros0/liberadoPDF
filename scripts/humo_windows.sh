#!/usr/bin/env bash
# Prueba de humo sobre el ejecutable de Windows, lanzado desde WSL por interop (cmd.exe).
# Uso: scripts/humo_windows.sh [fase] [ruta del PDF] [página animada]
# Fases: las de scripts/humo.mjs (basica, presentacionAnimada, guardar, cuadricula, presentador, unir, proteger, ocr, comprimir…).
# Los archivos de prueba (cifrado, truncado, object streams, optimizado, escaneado girado, imágenes, HTML) se generan
# con scripts/fixtures.mjs en la carpeta de salida, igual que en Linux; cada fase recibe las mismas variables que en humo.mjs.
# Requiere haber construido antes con `npm run construir`. Se usa un .cmd intermedio para evitar
# los recortes de comillas de `cmd /c`.
set -euo pipefail
cd "$(dirname "$0")/.."
EXE="dist/liberadoPDF-win32-x64/liberadoPDF.exe"
[ -f "$EXE" ] || { echo "No existe $EXE: ejecuta npm run construir" >&2; exit 1; }
SALIDA="$PWD/test/salida/humo_windows"
rm -rf "$SALIDA"; mkdir -p "$SALIDA"
FASE="${1:-basica}"
export PATH="$HOME/tools/node/bin:$PATH"
FIX="$(node scripts/fixtures.mjs "$SALIDA")"
fx() { python3 -c "import json,sys; print(json.loads(sys.argv[1])['$1'])" "$FIX"; }
case "$FASE" in
  ocr) PDF_DEFECTO="$PWD/recursos/ejemplo_escaneado.pdf" ;;
  comprimir) PDF_DEFECTO="$PWD/recursos/ejemplo_fotos.pdf" ;;
  video) PDF_DEFECTO="$PWD/recursos/ejemplo_video.pdf" ;;
  numerar) PDF_DEFECTO="$(fx recortadoPrueba)" ;;
  desbloquear) PDF_DEFECTO="$(fx cifradoPrueba)" ;;
  transiciones) PDF_DEFECTO="$PWD/recursos/ejemplo_transiciones.pdf" ;;
  *) PDF_DEFECTO="$PWD/recursos/ejemplo_animado.pdf" ;;
esac
PDF="${2:-$PDF_DEFECTO}"
PAGINA="${3:-2}"
case "$FASE" in
  htmlAPdf) ELEGIR="$(fx htmlPrueba)" ;;
  deImagenes) ELEGIR="$(fx imagenA);$(fx imagenB);$(fx pngComoJpg);$(fx fotoExif);$(fx imagenFalsa)" ;;
  reparar) ELEGIR="$(fx truncadoPrueba)" ;;
  *) ELEGIR="" ;;
esac
# El PDF se copia a la carpeta de salida (con un archivo de notas al lado para la fase del presentador).
cp "$PDF" "$SALIDA/prueba.pdf"
cp "$PWD/recursos/video.mp4" "$SALIDA/"   # el video externo de ejemplo_video.pdf debe ir junto al PDF
printf '## 2\nNota de la dos\n' > "$SALIDA/prueba.pdf.notas.txt"
W_SALIDA="$(wslpath -w "$SALIDA")"
W_PDF="$(wslpath -w "$SALIDA/prueba.pdf")"
W_GUARDAR="$(wslpath -w "$SALIDA/guardado.pdf")"
W_CARPETA="$(wslpath -w "$SALIDA/carpeta")"
W_ANIMADO="$(wslpath -w "$PWD/recursos/ejemplo_animado.pdf")"
W_EXE="$(wslpath -w "$PWD/$EXE")"
# Rutas de Windows separadas por «;» (path.delimiter en Windows) para _ELEGIR; el PDF abierto si la fase no indica otra cosa.
W_ELEGIR=""
if [ -n "$ELEGIR" ]; then IFS=';' read -ra PARTES <<< "$ELEGIR"; for P in "${PARTES[@]}"; do W_ELEGIR="${W_ELEGIR:+$W_ELEGIR;}$(wslpath -w "$P")"; done; else W_ELEGIR="$W_PDF"; fi
W_OPTIMIZADO="$(wslpath -w "$(fx optimizadoPrueba)")"
W_GIRADO="$(wslpath -w "$(fx escaneadoGirado)")"
W_OBJSTM="$(wslpath -w "$(fx truncadoObjstm)")"
W_VIDEO_SCREEN="$(wslpath -w "$(fx videoScreen)")"
# Las fases leen textos en español; la fase idioma comprueba el inglés por defecto (sin forzar idioma).
case "$FASE" in idioma) IDIOMA="" ;; *) IDIOMA="es" ;; esac
# Configuración de prueba por fase (la misma que en humo.mjs): video apaga el autoarranque para probar la precedencia de la anotación.
case "$FASE" in video) CONFIG='{"video":{"autoarranque":false}}' ;; *) CONFIG='' ;; esac
LOTE="$SALIDA/lanzar.cmd"
printf '@echo off\r\nset "LIBERADOPDF_HUMO=%s"\r\nset "LIBERADOPDF_HUMO_FASE=%s"\r\nset "LIBERADOPDF_HUMO_PAGINA=%s"\r\nset "LIBERADOPDF_PDF=%s"\r\nset "LIBERADOPDF_HUMO_GUARDAR=%s"\r\nset "LIBERADOPDF_HUMO_CARPETA=%s"\r\nset "LIBERADOPDF_HUMO_ELEGIR=%s"\r\nset "LIBERADOPDF_HUMO_ANIMADO=%s"\r\nset "LIBERADOPDF_HUMO_OPTIMIZADO=%s"\r\nset "LIBERADOPDF_HUMO_GIRADO=%s"\r\nset "LIBERADOPDF_HUMO_OBJSTM=%s"\r\nset "LIBERADOPDF_HUMO_VIDEO_SCREEN=%s"\r\nset "LIBERADOPDF_IDIOMA=%s"\r\nset "LIBERADOPDF_CONFIG_PRUEBA=%s"\r\n"%s"\r\n' "$W_SALIDA" "$FASE" "$PAGINA" "$W_PDF" "$W_GUARDAR" "$W_CARPETA" "$W_ELEGIR" "$W_ANIMADO" "$W_OPTIMIZADO" "$W_GIRADO" "$W_OBJSTM" "$W_VIDEO_SCREEN" "$IDIOMA" "$CONFIG" "$W_EXE" > "$LOTE"
/mnt/c/Windows/System32/cmd.exe /c "$(wslpath -w "$LOTE")" >/dev/null 2>&1 || true
for i in $(seq 1 240); do [ -f "$SALIDA/resultado.json" ] && break; sleep 1; done
[ -f "$SALIDA/resultado.json" ] || { echo "Sin resultado.json tras 240 s" >&2; exit 1; }
cat "$SALIDA/resultado.json"
python3 -c "import json,sys; sys.exit(0 if json.load(open('$SALIDA/resultado.json'))['ok'] else 1)"
