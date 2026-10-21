#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
salida=$(mktemp /tmp/porton-reglas.XXXXXX)
trap 'rm -f "$salida"' EXIT
g++ -std=c++17 -Wall -Wextra -Werror -I wokwi pruebas/reglas_test.cpp -o "$salida"
"$salida"
