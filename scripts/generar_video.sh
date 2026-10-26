#!/usr/bin/env bash
# Genera recursos/video.mp4 (2 s, 320×180, H.264 baseline, sin audio): patrón de prueba en movimiento para los fixtures de video.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ffmpeg -y -loglevel error -f lavfi -i "testsrc=size=320x180:rate=15:duration=2" -an -c:v libx264 -profile:v baseline -pix_fmt yuv420p -movflags +faststart "$RAIZ/recursos/video.mp4"
ls -la "$RAIZ/recursos/video.mp4"
