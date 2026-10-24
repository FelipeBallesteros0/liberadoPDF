#!/usr/bin/env bash
# Construye los paquetes portables desde WSL/Linux con @electron/packager: scripts/construir.sh [win32|linux|all] (all por defecto).
# Icono: con wine lo pone el packager; sin wine, se usa rcedit-x64.exe por interop de WSL si está
# en ~/tools/rcedit/; si no hay ninguno, queda el icono por defecto de Electron (ver README).
set -euo pipefail
export PATH="$HOME/tools/node/bin:$PATH"
cd "$(dirname "$0")/.."
VERSION="$(node -p "require('./package.json').version")"
NOMBRE="liberadoPDF"
DESTINO="dist/${NOMBRE}-win32-x64"
DESTINO_LINUX="dist/${NOMBRE}-linux-x64"
PLATAFORMAS="${1:-all}"
IGNORAR=(
  --ignore='^/(dist|test|docs|scripts|data|\.git|\.superpowers|\.gitignore)(/|$)'
  --ignore='^/node_modules/@napi-rs(/|$)'
  --ignore='\.map$'
  --ignore='^/node_modules/tesseract\.js-core/tesseract-core(-simd|-relaxedsimd)?\.(js|wasm|wasm\.js)$'
  --ignore='^/node_modules/pdf-lib/(es|dist/pdf-lib\.(js|min\.js|esm\.js))(/|$)'
  --ignore='^/recursos/(foto_.*\.jpg|escaneado.*\.jpg|grad\.png|ejemplo_fotos\.pdf|ejemplo_video\.pdf|video\.mp4|.*\.tex)$'
)

npm test
npm run humo

# Lo que necesitan las herramientas (worker y main en modo humo) debe ir en el asar; el núcleo de tesseract solo en sus variantes LSTM.
verificar_asar() {
  local LISTA_ASAR
  LISTA_ASAR="$(npx @electron/asar list "$1")"
  for ARCHIVO in pdf-lib/dist/pdf-lib.esm.min.js pdf-lib/cjs/index.js qpdf-wasm/dist/qpdf.wasm qpdf-wasm/dist/qpdf.js tesseract.js/dist/worker.min.js tesseract.js/dist/tesseract.esm.min.js tesseract-core-simd-lstm.wasm tesseract-core-simd-lstm.wasm.js tesseract-core-relaxedsimd-lstm.wasm.js tesseract-core-lstm.wasm.js tessdata/spa.traineddata tessdata/eng.traineddata; do
    grep -q "$ARCHIVO" <<< "$LISTA_ASAR" || { echo "ERROR: $ARCHIVO no está en el paquete" >&2; exit 1; }
  done
  grep -q "tesseract-core-simd.wasm$" <<< "$LISTA_ASAR" && { echo "ERROR: variante no-LSTM de tesseract en el paquete" >&2; exit 1; }
  return 0
}

if [ "$PLATAFORMAS" = "linux" ] || [ "$PLATAFORMAS" = "all" ]; then
  npx @electron/packager . "$NOMBRE" --platform=linux --arch=x64 --out=dist --overwrite --asar \
    --app-version="$VERSION" --app-copyright="MIT · liberadoPDF" "${IGNORAR[@]}"
  verificar_asar "$DESTINO_LINUX/resources/app.asar"
  cp recursos/linux/liberadoPDF.sh recursos/ejemplo_animado.pdf README.md README.es.md "$DESTINO_LINUX/"
  chmod +x "$DESTINO_LINUX/liberadoPDF.sh"
  # El tar se arma desde una copia en el sistema de archivos de Linux: en /mnt/c todo aparece como 777 y el paquete
  # quedaría con permisos absurdos; aquí van 755 los ejecutables y 644 el resto, propietario root.
  ESCENARIO="$(mktemp -d)"
  cp -r "$DESTINO_LINUX" "$ESCENARIO/"
  find "$ESCENARIO/${NOMBRE}-linux-x64" -type d -exec chmod 755 {} +
  find "$ESCENARIO/${NOMBRE}-linux-x64" -type f -exec chmod 644 {} +
  chmod 755 "$ESCENARIO/${NOMBRE}-linux-x64"/{liberadoPDF,liberadoPDF.sh,chrome-sandbox,chrome_crashpad_handler,*.so,*.so.*}
  rm -f "dist/${NOMBRE}-linux-x64.tar.gz"
  tar --owner=0 --group=0 --numeric-owner -czf "dist/${NOMBRE}-linux-x64.tar.gz" -C "$ESCENARIO" "${NOMBRE}-linux-x64"
  rm -rf "$ESCENARIO"
  echo "Listo: $DESTINO_LINUX ($(du -sh "$DESTINO_LINUX" | cut -f1)) y dist/${NOMBRE}-linux-x64.tar.gz ($(du -sh "dist/${NOMBRE}-linux-x64.tar.gz" | cut -f1))"
fi
if [ "$PLATAFORMAS" = "linux" ]; then exit 0; fi

OPCIONES_ICONO=()
if command -v wine >/dev/null 2>&1; then
  OPCIONES_ICONO=(--icon=recursos/icono.ico --win32metadata.ProductName="$NOMBRE" --win32metadata.FileDescription="Visor y presentador de PDF" --win32metadata.CompanyName="liberadoPDF")
else
  echo "Sin wine: el icono se intentará con rcedit por interop tras empaquetar."
fi

npx @electron/packager . "$NOMBRE" \
  --platform=win32 --arch=x64 --out=dist --overwrite --asar \
  --app-version="$VERSION" --app-copyright="MIT · liberadoPDF" "${IGNORAR[@]}" \
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

verificar_asar "$DESTINO/resources/app.asar"
cp recursos/ejemplo_animado.pdf README.md README.es.md "$DESTINO/"
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
