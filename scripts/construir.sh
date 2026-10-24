#!/usr/bin/env bash
# Construye el ejecutable portable de Windows (x64) desde WSL/Linux con @electron/packager.
# Icono: con wine lo pone el packager; sin wine, se usa rcedit-x64.exe por interop de WSL si está
# en ~/tools/rcedit/; si no hay ninguno, queda el icono por defecto de Electron (ver README).
set -euo pipefail
export PATH="$HOME/tools/node/bin:$PATH"
cd "$(dirname "$0")/.."
VERSION="$(node -p "require('./package.json').version")"
NOMBRE="liberadoPDF"
DESTINO="dist/${NOMBRE}-win32-x64"

npm test
npm run humo

OPCIONES_ICONO=()
if command -v wine >/dev/null 2>&1; then
  OPCIONES_ICONO=(--icon=recursos/icono.ico --win32metadata.ProductName="$NOMBRE" --win32metadata.FileDescription="Visor y presentador de PDF" --win32metadata.CompanyName="liberadoPDF")
else
  echo "Sin wine: el icono se intentará con rcedit por interop tras empaquetar."
fi

npx @electron/packager . "$NOMBRE" \
  --platform=win32 --arch=x64 --out=dist --overwrite --asar \
  --app-version="$VERSION" --app-copyright="MIT · liberadoPDF" \
  --ignore='^/(dist|test|docs|scripts|data|\.git|\.superpowers|\.gitignore)(/|$)' \
  --ignore='^/node_modules/@napi-rs(/|$)' \
  --ignore='\.map$' \
  --ignore='^/node_modules/tesseract\.js-core/tesseract-core(-simd|-relaxedsimd)?\.(js|wasm|wasm\.js)$' \
  --ignore='^/node_modules/pdf-lib/(es|dist/pdf-lib\.(js|min\.js|esm\.js))(/|$)' \
  --ignore='^/recursos/(foto_.*\.jpg|escaneado.*\.jpg|grad\.png|ejemplo_fotos\.pdf|.*\.tex)$' \
  "${OPCIONES_ICONO[@]}"

if ! command -v wine >/dev/null 2>&1; then
  RCEDIT="$HOME/tools/rcedit/rcedit-x64.exe"
  if [ -x "$RCEDIT" ] && [ -x /mnt/c/Windows/System32/cmd.exe ]; then
    W_EXE="$(wslpath -w "$PWD/$DESTINO/$NOMBRE.exe")"
    W_ICO="$(wslpath -w "$PWD/recursos/icono.ico")"
    "$RCEDIT" "$W_EXE" --set-icon "$W_ICO" --set-version-string ProductName "$NOMBRE" \
      --set-version-string FileDescription "Visor y presentador de PDF" --set-file-version "$VERSION" --set-product-version "$VERSION" \
      && echo "Icono y metadatos puestos con rcedit." || echo "AVISO: rcedit falló; el ejecutable queda con el icono por defecto."
  else
    echo "AVISO: sin wine ni rcedit; el ejecutable queda con el icono por defecto de Electron."
  fi
fi

# Lo que necesitan las herramientas (worker y main en modo humo) debe ir en el asar; el núcleo de tesseract solo en sus variantes LSTM.
LISTA_ASAR="$(npx @electron/asar list "$DESTINO/resources/app.asar")"
for ARCHIVO in pdf-lib/dist/pdf-lib.esm.min.js pdf-lib/cjs/index.js qpdf-wasm/dist/qpdf.wasm qpdf-wasm/dist/qpdf.js tesseract.js/dist/worker.min.js tesseract.js/dist/tesseract.esm.min.js tesseract-core-simd-lstm.wasm tesseract-core-simd-lstm.wasm.js tesseract-core-relaxedsimd-lstm.wasm.js tesseract-core-lstm.wasm.js tessdata/spa.traineddata tessdata/eng.traineddata; do
  grep -q "$ARCHIVO" <<< "$LISTA_ASAR" || { echo "ERROR: $ARCHIVO no está en el paquete" >&2; exit 1; }
done
grep -q "tesseract-core-simd.wasm$" <<< "$LISTA_ASAR" && { echo "ERROR: variante no-LSTM de tesseract en el paquete" >&2; exit 1; }
cp recursos/ejemplo_animado.pdf README.md "$DESTINO/"
rm -f "dist/${NOMBRE}-win32-x64.zip"
python3 - "$DESTINO" "dist/${NOMBRE}-win32-x64.zip" <<'PY'
import sys, zipfile, os
origen, destino = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, _, archivos in os.walk(origen):
        for a in archivos:
            ruta = os.path.join(raiz, a)
            z.write(ruta, os.path.relpath(ruta, os.path.dirname(origen)))
PY
echo "Listo: $DESTINO ($(du -sh "$DESTINO" | cut -f1)) y dist/${NOMBRE}-win32-x64.zip ($(du -sh "dist/${NOMBRE}-win32-x64.zip" | cut -f1))"
