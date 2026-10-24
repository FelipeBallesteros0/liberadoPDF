#!/usr/bin/env bash
# Genera recursos/ejemplo_animado.pdf con pdfLaTeX (TeX Live local con beamer, tikz y animate).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SALIDA="$(mktemp -d)"
for NOMBRE in ejemplo_animado ejemplo_transiciones ejemplo_notas ejemplo_notas_43; do
  for i in 1 2; do
    pdflatex -interaction=nonstopmode -halt-on-error -output-directory="$SALIDA" "$RAIZ/recursos/$NOMBRE.tex" > "$SALIDA/log.txt" 2>&1 \
      || { tail -30 "$SALIDA/log.txt"; exit 1; }
  done
  cp "$SALIDA/$NOMBRE.pdf" "$RAIZ/recursos/$NOMBRE.pdf"
  ls -la "$RAIZ/recursos/$NOMBRE.pdf"
done
rm -rf "$SALIDA"
