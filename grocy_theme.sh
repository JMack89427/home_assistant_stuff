#!/bin/bash
# Imperial Grocy Theme Installer
# Run from HA terminal: bash /homeassistant/grocy_theme.sh

CSS_SRC="/homeassistant/themes/grocy-imperial.css"
SLUG="a0d7b954_grocy"
TMP="/share/grocy_css_tmp.css"

echo "=== Imperial Grocy Theme Installer ==="

# Stage CSS to /share which is mounted in both terminal and Grocy containers
echo "Staging CSS to /share..."
cp "$CSS_SRC" "$TMP" && echo "OK" || { echo "FAIL: cannot write to /share/"; exit 1; }

# Find Grocy's actual data path
echo ""
echo "--- Grocy container filesystem ---"
ha addons exec "$SLUG" -- sh -c "grep -i datapath /app/config.php /var/www/grocy/config.php 2>/dev/null | head -5; echo '-- /app/ --'; ls /app/ 2>/dev/null; echo '-- /data/ --'; ls /data/ 2>/dev/null; echo '-- /var/www/grocy/ --'; ls /var/www/grocy/ 2>/dev/null"

# Write CSS from /share to all likely locations inside the container
echo ""
echo "--- Writing CSS ---"
for DEST in \
  "/app/data/custom_css/custom.css" \
  "/var/www/grocy/data/custom_css/custom.css" \
  "/data/custom_css/custom.css" \
  "/app/public/custom_js_css/custom.css"; do
  DIR=$(dirname "$DEST")
  ha addons exec "$SLUG" -- sh -c "mkdir -p $DIR && cp /share/grocy_css_tmp.css $DEST && echo 'WRITTEN: $DEST'" 2>/dev/null
done

# Cleanup
rm -f "$TMP"
echo ""
echo "=== Done - reload Grocy in browser ==="
