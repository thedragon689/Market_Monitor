#!/usr/bin/env bash
# Genera icone PWA/favicon dal logo SVG (coerente con AppLogoMark).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/market-quotes-frontend/public"
DARK_SVG="${OUT}/app-icon-dark.svg"
LIGHT_SVG="${OUT}/app-icon-light.svg"

if [[ ! -f "$DARK_SVG" ]] || [[ ! -f "$LIGHT_SVG" ]]; then
  echo "Mancano app-icon-dark.svg / app-icon-light.svg in public/" >&2
  exit 1
fi

export_png() {
  local variant="$1"
  local size="$2"
  local out="$3"
  local src="$DARK_SVG"
  [[ "$variant" == "light" ]] && src="$LIGHT_SVG"
  magick -density 384 -background none "$src" -resize "${size}x${size}" "$out"
}

export_png dark 512 "${OUT}/app-icon-dark-512.png"
export_png dark 192 "${OUT}/app-icon-dark-192.png"
export_png light 512 "${OUT}/app-icon-light-512.png"
export_png light 192 "${OUT}/app-icon-light-192.png"

# Favicon da logo dark ridotto
magick -density 384 -background none "$DARK_SVG" -resize 28x28 -extent 32x32 -gravity center "${OUT}/favicon.png"

cp "${OUT}/app-icon-dark-512.png" "${OUT}/app-icon-512.png"
cp "${OUT}/app-icon-dark-192.png" "${OUT}/app-icon-192.png"
cp "${OUT}/app-icon-light-512.png" "${OUT}/app-icon.png"
cp "${OUT}/app-icon-dark-512.png" "${OUT}/apple-touch-icon.png"

echo "Icone generate da SVG in ${OUT}"
