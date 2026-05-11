#!/bin/bash
# Imperial Grocy Theme Installer
# Run from HA terminal: bash /homeassistant/grocy_theme.sh

CSS_SRC="/homeassistant/themes/grocy-imperial.css"
SLUG="a0d7b954_grocy"

echo "=== Imperial Grocy Theme Installer ==="

# Try ha CLI exec
if command -v ha &>/dev/null; then
  echo "Trying ha CLI..."
  ha addons exec "$SLUG" -- sh -c "mkdir -p /data/custom_css && cat > /data/custom_css/custom.css" < "$CSS_SRC" && \
    echo "SUCCESS: CSS written via ha CLI" && exit 0
  echo "ha CLI exec failed, trying filesystem..."
fi

# Try addon_configs path
for DIR in \
  "/addon_configs/${SLUG}" \
  "/share/grocy" \
  "/data/addon_configs/${SLUG}"; do
  if [ -d "$DIR" ]; then
    echo "Found addon data at: $DIR"
    mkdir -p "$DIR/data/custom_css"
    cp "$CSS_SRC" "$DIR/data/custom_css/custom.css" && \
      echo "SUCCESS: CSS written to $DIR/data/custom_css/custom.css" && exit 0
  fi
done

echo "FAILED: Could not find Grocy data directory."
echo "Directories checked:"
ls /addon_configs/ 2>/dev/null && echo "(listed /addon_configs/)" || echo "/addon_configs/ not accessible"
ls /share/ 2>/dev/null && echo "(listed /share/)" || echo "/share/ not accessible"
