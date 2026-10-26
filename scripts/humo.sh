#!/usr/bin/env bash
# Prueba de humo bajo WSLg / Linux con el Node local.
set -euo pipefail
export PATH="$HOME/tools/node/bin:$PATH"
cd "$(dirname "$0")/.."
npm run humo
