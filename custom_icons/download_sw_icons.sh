#!/bin/bash
# Download Star Wars SVG icons from FontAwesome 5.x brands
# License: CC BY 4.0 (https://fontawesome.com/license/free)
# Run from /config/custom_icons

RAW_BASE="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.x/svgs/brands"

ICONS=(
  empire
  sith
  rebel
  jedi-order
  first-order
  first-order-alt
  galactic-republic
  galactic-senate
  old-republic
  resistance
  mandalorian
)

DEST="$(cd "$(dirname "$0")" && pwd)"
echo "Destination: $DEST"
echo ""

OK=0
FAIL=0

for name in "${ICONS[@]}"; do
  url="$RAW_BASE/$name.svg"
  dest="$DEST/$name.svg"
  printf "  %-25s ... " "$name.svg"
  if curl -sf -o "$dest" "$url"; then
    echo "OK"
    OK=$((OK + 1))
  else
    echo "not found (skipped)"
    FAIL=$((FAIL + 1))
    rm -f "$dest"
  fi
done

echo ""
echo "Done. $OK downloaded, $FAIL skipped."
echo ""
echo "Reference these in your dashboard as:"
for name in "${ICONS[@]}"; do
  [ -f "$DEST/$name.svg" ] && echo "  local:$name"
done
