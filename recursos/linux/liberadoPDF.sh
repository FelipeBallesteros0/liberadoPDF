#!/usr/bin/env bash
# Lanza liberadoPDF en Linux. El sandbox de Chromium necesita o bien `chrome-sandbox` con setuid root (sudo chown root
# chrome-sandbox && sudo chmod 4755 chrome-sandbox) o bien user namespaces sin privilegios; si no hay ninguna de las
# dos cosas, se arranca sin sandbox (como en WSL). Los datos quedan en data/ junto al programa (modo portable).
DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
BIN="$DIR/liberadoPDF"
if [ -u "$DIR/chrome-sandbox" ] && [ "$(stat -c %u "$DIR/chrome-sandbox" 2>/dev/null)" = "0" ]; then exec "$BIN" "$@"; fi
if unshare -U true 2>/dev/null; then exec "$BIN" "$@"; fi
echo "liberadoPDF: sin sandbox de Chromium (ni chrome-sandbox setuid ni user namespaces); arrancando sin él." >&2
ELECTRON_DISABLE_SANDBOX=1 exec "$BIN" "$@"
