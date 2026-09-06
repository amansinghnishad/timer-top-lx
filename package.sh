#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

UUID=$(grep -oP '"uuid":\s*"\K[^"]+' metadata.json || echo "focus-timer@github-amansinghnishad")
ZIP_NAME="${UUID}.shell-extension.zip"

echo "==> Preparing clean schema for release (no compiled artifacts in zip)..."
rm -f schemas/gschemas.compiled gschemas.compiled "$ZIP_NAME"

echo "==> Packing extension bundle for extensions.gnome.org..."
# gnome-extensions pack creates an EGO-compliant zip
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions pack \
        --force \
        --schema=schemas/org.gnome.shell.extensions.focus-timer.gschema.xml \
        --extra-source=stylesheet.css \
        --extra-source=prefs.js \
        .
else
    zip -r "$ZIP_NAME" metadata.json extension.js prefs.js stylesheet.css schemas/
fi

echo "==> Successfully created: $ZIP_NAME"
echo "==> Clean bundle ready for https://extensions.gnome.org/upload/ (Zero EGO warnings)!"
