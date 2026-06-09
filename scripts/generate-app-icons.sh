#!/usr/bin/env bash
# Genera icone ottimizzate per tema chiaro/scuro e favicon leggibile.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/icon/market.png"
OUT="${ROOT}/market-quotes-frontend/public"

if [[ ! -f "$SRC" ]]; then
  echo "Manca $SRC" >&2
  exit 1
fi

gen_size() {
  local variant="$1"
  local size="$2"
  local out="$3"
  if [[ "$variant" == "light" ]]; then
    magick "$SRC" \
      -resize $((size * 78 / 100))x$((size * 78 / 100)) \
      -background white \
      -gravity center \
      -extent "${size}x${size}" \
      -bordercolor '#dbe4f0' \
      -border $((size / 32)) \
      -modulate 108,105,100 \
      "$out"
  else
    magick "$SRC" \
      -resize $((size * 84 / 100))x$((size * 84 / 100)) \
      -background '#141b2d' \
      -gravity center \
      -extent "${size}x${size}" \
      -bordercolor '#6366f1' \
      -border $((size / 40)) \
      -modulate 118,115,100 \
      -brightness-contrast 8x12 \
      "$out"
  fi
}

gen_size light 512 "${OUT}/app-icon-light-512.png"
gen_size dark 512 "${OUT}/app-icon-dark-512.png"
gen_size light 192 "${OUT}/app-icon-light-192.png"
gen_size dark 192 "${OUT}/app-icon-dark-192.png"

# Favicon: padding bianco per tab browser
magick "$SRC" \
  -resize 22x22 \
  -background white \
  -gravity center \
  -extent 32x32 \
  -bordercolor '#c7d2e4' \
  -border 1 \
  "${OUT}/favicon.png"

# Legacy / PWA (default = dark, più luminoso su sfondo scuro)
cp "${OUT}/app-icon-dark-512.png" "${OUT}/app-icon-512.png"
cp "${OUT}/app-icon-dark-192.png" "${OUT}/app-icon-192.png"
cp "${OUT}/app-icon-light-512.png" "${OUT}/app-icon.png"
cp "${OUT}/app-icon-dark-512.png" "${OUT}/apple-touch-icon.png"

echo "Icone generate in ${OUT}"
