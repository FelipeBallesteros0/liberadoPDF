#!/usr/bin/env bash
# Genera recursos/ejemplo_animado.pdf con pdfLaTeX (TeX Live local con beamer, tikz y animate).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SALIDA="$(mktemp -d)"
python3 "$RAIZ/scripts/generar_escaneado.py"
python3 "$RAIZ/scripts/generar_fotos.py"
bash "$RAIZ/scripts/generar_video.sh"
for NOMBRE in ejemplo_animado ejemplo_transiciones ejemplo_notas ejemplo_notas_43 ejemplo_escaneado ejemplo_escaneado_girado ejemplo_fotos ejemplo_video; do
  for i in 1 2; do
    (cd "$RAIZ/recursos" && pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$SALIDA" "$NOMBRE.tex") > "$SALIDA/log.txt" 2>&1 \
      || { tail -30 "$SALIDA/log.txt"; exit 1; }
  done
  cp "$SALIDA/$NOMBRE.pdf" "$RAIZ/recursos/$NOMBRE.pdf"
  ls -la "$RAIZ/recursos/$NOMBRE.pdf"
done
rm -rf "$SALIDA"
