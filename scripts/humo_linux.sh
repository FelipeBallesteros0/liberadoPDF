#!/usr/bin/env bash
# Prueba de humo sobre el paquete construido usando el lanzador real: dist/liberadoPDF-linux-x64 en Linux o el .app
# universal en macOS (en GitHub Actions corre sobre el .app de la imagen de disco).
# Uso: scripts/humo_linux.sh [fase] [ruta del PDF] [página animada]   (fases: las de scripts/humo.mjs)
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/tools/node/bin:$PATH"
# LIBERADOPDF_LANZADOR permite apuntar a otro lanzador (p. ej. el tarball extraído en un sistema de archivos de Linux).
if [ "$(uname)" = "Darwin" ]; then
  LANZADOR="${LIBERADOPDF_LANZADOR:-dist/liberadoPDF-darwin-universal/liberadoPDF.app/Contents/MacOS/liberadoPDF}"
else
  LANZADOR="${LIBERADOPDF_LANZADOR:-dist/liberadoPDF-linux-x64/liberadoPDF.sh}"
fi
[ -x "$LANZADOR" ] || { echo "No existe $LANZADOR: ejecuta scripts/construir.sh" >&2; exit 1; }
TIMEOUT="$(command -v timeout || command -v gtimeout || true)" # macOS no trae timeout: brew install coreutils
[ -n "$TIMEOUT" ] || { echo "Falta timeout (en macOS: brew install coreutils)" >&2; exit 1; }
SALIDA="$PWD/test/salida/humo_linux"
rm -rf "$SALIDA"; mkdir -p "$SALIDA"
FASE="${1:-basica}"
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
  deImagenes) ELEGIR="$(fx imagenA):$(fx imagenB):$(fx pngComoJpg):$(fx fotoExif):$(fx imagenFalsa)" ;;
  reparar) ELEGIR="$(fx truncadoPrueba)" ;;
  *) ELEGIR="$SALIDA/prueba.pdf" ;;
esac
# idiomaEs es la fase idioma arrancada con la config en español (como en scripts/humo.mjs).
FASE_REAL="$FASE"; ESPERADO=""
case "$FASE" in idioma) IDIOMA="" ;; idiomaEs) IDIOMA=""; FASE_REAL="idioma"; ESPERADO="es" ;; *) IDIOMA="es" ;; esac
case "$FASE" in video) CONFIG='{"video":{"autoarranque":false}}' ;; idiomaEs) CONFIG='{"idioma":"es"}' ;; *) CONFIG='' ;; esac
cp "$PDF" "$SALIDA/prueba.pdf"
cp "$PWD/recursos/video.mp4" "$SALIDA/"
printf '## 2\nNota de la dos\n' > "$SALIDA/prueba.pdf.notas.txt"
LIBERADOPDF_HUMO="$SALIDA" LIBERADOPDF_HUMO_FASE="$FASE_REAL" LIBERADOPDF_HUMO_IDIOMA_ESPERADO="$ESPERADO" LIBERADOPDF_HUMO_PAGINA="$PAGINA" LIBERADOPDF_PDF="$SALIDA/prueba.pdf" \
LIBERADOPDF_HUMO_GUARDAR="$SALIDA/guardado.pdf" LIBERADOPDF_HUMO_CARPETA="$SALIDA/carpeta" LIBERADOPDF_HUMO_ELEGIR="$ELEGIR" \
LIBERADOPDF_HUMO_ANIMADO="$PWD/recursos/ejemplo_animado.pdf" LIBERADOPDF_HUMO_OPTIMIZADO="$(fx optimizadoPrueba)" LIBERADOPDF_HUMO_GIRADO="$(fx escaneadoGirado)" \
LIBERADOPDF_HUMO_OBJSTM="$(fx truncadoObjstm)" LIBERADOPDF_HUMO_VIDEO_SCREEN="$(fx videoScreen)" LIBERADOPDF_IDIOMA="$IDIOMA" LIBERADOPDF_CONFIG_PRUEBA="$CONFIG" \
"$TIMEOUT" 300 "$LANZADOR" >/dev/null 2>"$SALIDA/stderr.txt" || true
[ -f "$SALIDA/resultado.json" ] || { echo "Sin resultado.json; stderr:" >&2; tail -5 "$SALIDA/stderr.txt" >&2; exit 1; }
cat "$SALIDA/resultado.json"
python3 -c "import json,sys; sys.exit(0 if json.load(open('$SALIDA/resultado.json'))['ok'] else 1)"
