#!/usr/bin/env bash
# Prueba de humo sobre el ejecutable de Windows, lanzado desde WSL por interop (cmd.exe).
# Uso: scripts/humo_windows.sh [fase] [ruta del PDF] [página animada]
# Fases: las de scripts/humo.mjs (basica, presentacionAnimada, guardar, cuadricula, presentador, unir, proteger, ocr, comprimir…).
# Para ocr y comprimir el PDF por defecto es el ejemplo escaneado / el de fotos; las fases de archivos usan
# LIBERADOPDF_HUMO_GUARDAR, _CARPETA, _ELEGIR (el mismo PDF) y _ANIMADO.
# Requiere haber construido antes con `npm run construir`. Se usa un .cmd intermedio para evitar
# los recortes de comillas de `cmd /c`.
set -euo pipefail
cd "$(dirname "$0")/.."
EXE="dist/liberadoPDF-win32-x64/liberadoPDF.exe"
[ -f "$EXE" ] || { echo "No existe $EXE: ejecuta npm run construir" >&2; exit 1; }
SALIDA="$PWD/test/salida/humo_windows"
rm -rf "$SALIDA"; mkdir -p "$SALIDA"
FASE="${1:-basica}"
case "$FASE" in
  ocr) PDF_DEFECTO="$PWD/recursos/ejemplo_escaneado.pdf" ;;
  comprimir) PDF_DEFECTO="$PWD/recursos/ejemplo_fotos.pdf" ;;
  *) PDF_DEFECTO="$PWD/recursos/ejemplo_animado.pdf" ;;
esac
PDF="${2:-$PDF_DEFECTO}"
PAGINA="${3:-2}"
# El PDF se copia a la carpeta de salida (con un archivo de notas al lado para la fase del presentador).
cp "$PDF" "$SALIDA/prueba.pdf"
printf '## 2\nNota de la dos\n' > "$SALIDA/prueba.pdf.notas.txt"
W_SALIDA="$(wslpath -w "$SALIDA")"
W_PDF="$(wslpath -w "$SALIDA/prueba.pdf")"
W_GUARDAR="$(wslpath -w "$SALIDA/guardado.pdf")"
W_CARPETA="$(wslpath -w "$SALIDA/carpeta")"
W_ANIMADO="$(wslpath -w "$PWD/recursos/ejemplo_animado.pdf")"
W_EXE="$(wslpath -w "$PWD/$EXE")"
LOTE="$SALIDA/lanzar.cmd"
printf '@echo off\r\nset "LIBERADOPDF_HUMO=%s"\r\nset "LIBERADOPDF_HUMO_FASE=%s"\r\nset "LIBERADOPDF_HUMO_PAGINA=%s"\r\nset "LIBERADOPDF_PDF=%s"\r\nset "LIBERADOPDF_HUMO_GUARDAR=%s"\r\nset "LIBERADOPDF_HUMO_CARPETA=%s"\r\nset "LIBERADOPDF_HUMO_ELEGIR=%s"\r\nset "LIBERADOPDF_HUMO_ANIMADO=%s"\r\n"%s"\r\n' "$W_SALIDA" "$FASE" "$PAGINA" "$W_PDF" "$W_GUARDAR" "$W_CARPETA" "$W_PDF" "$W_ANIMADO" "$W_EXE" > "$LOTE"
/mnt/c/Windows/System32/cmd.exe /c "$(wslpath -w "$LOTE")" >/dev/null 2>&1 || true
for i in $(seq 1 240); do [ -f "$SALIDA/resultado.json" ] && break; sleep 1; done
[ -f "$SALIDA/resultado.json" ] || { echo "Sin resultado.json tras 240 s" >&2; exit 1; }
cat "$SALIDA/resultado.json"
python3 -c "import json,sys; sys.exit(0 if json.load(open('$SALIDA/resultado.json'))['ok'] else 1)"
