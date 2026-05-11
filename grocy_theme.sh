#!/bin/bash
# Imperial Grocy Theme Installer
# Run from HA terminal: bash /homeassistant/grocy_theme.sh

CSS_SRC="/homeassistant/themes/grocy-imperial.css"
SLUG="a0d7b954_grocy"

echo "=== Imperial Grocy Theme Installer ==="

# Find where Grocy's data path is configured
echo "--- Locating Grocy data path ---"
ha addons exec "$SLUG" -- sh -c "grep -r 'GROCY_DATAPATH\|data_path\|custom_css' /var/www/grocy/config.php /app/config.php /data/config.php 2>/dev/null | head -10"

echo "--- Contents of /data/ ---"
ha addons exec "$SLUG" -- ls /data/ 2>/dev/null

echo "--- Searching for custom_css references in Grocy PHP ---"
ha addons exec "$SLUG" -- sh -c "grep -r 'custom_css' /var/www/ /app/ 2>/dev/null | head -10"

echo "--- Writing CSS to all likely locations ---"
for PATH_ in \
  "/data/custom_css" \
  "/data/grocy/custom_css" \
  "/var/www/grocy/data/custom_css" \
  "/app/data/custom_css"; do
  ha addons exec "$SLUG" -- sh -c "mkdir -p '$PATH_'" 2>/dev/null && \
    ha addons exec -i "$SLUG" -- sh -c "cat > '$PATH_/custom.css'" < "$CSS_SRC" && \
    echo "  Written: $PATH_/custom.css" || echo "  Skipped: $PATH_"
done

echo "=== Done — reload Grocy in browser ==="
