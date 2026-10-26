#!/usr/bin/env bash
# Construye los paquetes portables desde WSL/Linux con @electron/packager: scripts/construir.sh [win32|linux|darwin|all] (all por defecto).
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
if [ "$PLATAFORMAS" = "darwin" ] || [ "$PLATAFORMAS" = "all" ]; then
  # Se empaqueta en el sistema de archivos de Linux: los .framework de Electron están hechos de enlaces simbólicos y
  # en /mnt/c se convertirían en copias (el .app dejaría de ser válido). Un zip por arquitectura (Apple Silicon e Intel).
  ESCENARIO="$(mktemp -d)"
  for ARQ in arm64 x64; do
    npx @electron/packager . "$NOMBRE" --platform=darwin --arch="$ARQ" --out="$ESCENARIO" --overwrite --asar \
      --app-version="$VERSION" --app-copyright="MIT · liberadoPDF" --app-bundle-id=io.github.felipeballesteros0.liberadopdf \
      --app-category-type=public.app-category.productivity --icon=recursos/macos/icono.icns \
      --extend-info=recursos/macos/Info-extra.plist "${IGNORAR[@]}"
    APP="$ESCENARIO/${NOMBRE}-darwin-$ARQ/$NOMBRE.app"
    verificar_asar "$APP/Contents/Resources/app.asar"
    # Sin firma de Apple: firma ad-hoc con rcodesign si está (en Apple Silicon un binario modificado sin firmar no
    # arranca); si no, el README explica cómo firmarla en el propio Mac con `codesign --sign -`.
    if command -v rcodesign >/dev/null 2>&1; then
      rcodesign sign "$APP" >/dev/null && echo "Firma ad-hoc ($ARQ) hecha con rcodesign."
    else
      echo "AVISO: sin rcodesign; la app ($ARQ) queda sin firma ad-hoc (ver README)."
    fi
    cp recursos/ejemplo_animado.pdf README.md README.es.md "$ESCENARIO/${NOMBRE}-darwin-$ARQ/"
    chmod 644 "$ESCENARIO/${NOMBRE}-darwin-$ARQ"/{ejemplo_animado.pdf,README.md,README.es.md}
    rm -f "dist/${NOMBRE}-darwin-$ARQ.zip"
    # zip que conserva enlaces simbólicos y permisos (lo que hace `ditto -c -k` en un Mac).
    python3 - "$ESCENARIO/${NOMBRE}-darwin-$ARQ" "dist/${NOMBRE}-darwin-$ARQ.zip" <<'PY'
import sys, zipfile, os, stat
origen, destino = sys.argv[1], sys.argv[2]
base = os.path.dirname(origen)
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    for raiz, dirs, archivos in os.walk(origen):
        for nombre in sorted(dirs + archivos):
            ruta = os.path.join(raiz, nombre)
            rel = os.path.relpath(ruta, base)
            modo = os.lstat(ruta).st_mode
            if stat.S_ISLNK(modo):
                info = zipfile.ZipInfo(rel)
                info.create_system = 3
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(info, os.readlink(ruta))
            elif stat.S_ISDIR(modo):
                continue
            else:
                info = zipfile.ZipInfo.from_file(ruta, rel)
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | (0o755 if modo & 0o111 else 0o644)) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                with open(ruta, 'rb') as f:
                    z.writestr(info, f.read())
PY
    echo "Listo: dist/${NOMBRE}-darwin-$ARQ.zip ($(du -sh "dist/${NOMBRE}-darwin-$ARQ.zip" | cut -f1))"
  done
  rm -rf "$ESCENARIO"
fi
if [ "$PLATAFORMAS" = "linux" ] || [ "$PLATAFORMAS" = "darwin" ]; then exit 0; fi

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
