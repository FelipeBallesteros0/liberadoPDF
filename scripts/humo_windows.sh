#!/usr/bin/env bash
# Prueba de humo sobre el ejecutable de Windows, lanzado desde WSL por interop (cmd.exe).
# Uso: scripts/humo_windows.sh [fase] [ruta del PDF] [página animada]   (fase: basica | presentacionAnimada | bucle)
# Requiere haber construido antes con `npm run construir`. Se usa un .cmd intermedio para evitar
# los recortes de comillas de `cmd /c`.
set -euo pipefail
cd "$(dirname "$0")/.."
EXE="dist/liberadoPDF-win32-x64/liberadoPDF.exe"
[ -f "$EXE" ] || { echo "No existe $EXE: ejecuta npm run construir" >&2; exit 1; }
SALIDA="$PWD/test/salida/humo_windows"
rm -rf "$SALIDA"; mkdir -p "$SALIDA"
FASE="${1:-basica}"
PDF="${2:-$PWD/recursos/ejemplo_animado.pdf}"
PAGINA="${3:-2}"
W_SALIDA="$(wslpath -w "$SALIDA")"
W_PDF="$(wslpath -w "$PDF")"
W_EXE="$(wslpath -w "$PWD/$EXE")"
LOTE="$SALIDA/lanzar.cmd"
printf '@echo off\r\nset "LIBERADOPDF_HUMO=%s"\r\nset "LIBERADOPDF_HUMO_FASE=%s"\r\nset "LIBERADOPDF_HUMO_PAGINA=%s"\r\nset "LIBERADOPDF_PDF=%s"\r\n"%s"\r\n' "$W_SALIDA" "$FASE" "$PAGINA" "$W_PDF" "$W_EXE" > "$LOTE"
/mnt/c/Windows/System32/cmd.exe /c "$(wslpath -w "$LOTE")" >/dev/null 2>&1 || true
for i in $(seq 1 60); do [ -f "$SALIDA/resultado.json" ] && break; sleep 1; done
[ -f "$SALIDA/resultado.json" ] || { echo "Sin resultado.json tras 60 s" >&2; exit 1; }
cat "$SALIDA/resultado.json"
python3 -c "import json,sys; sys.exit(0 if json.load(open('$SALIDA/resultado.json'))['ok'] else 1)"
