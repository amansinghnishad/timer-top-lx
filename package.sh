#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

UUID="focus-timer@asn.dev"
ZIP_NAME="${UUID}.shell-extension.zip"

echo "==> Compiling GSettings schemas..."
glib-compile-schemas schemas/

echo "==> Packing extension bundle..."
rm -f "$ZIP_NAME"

# Check if gnome-extensions CLI is available
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions pack \
        --force \
        --schema=schemas/org.gnome.shell.extensions.focus-timer.gschema.xml \
        --extra-source=schemas/gschemas.compiled \
        --extra-source=stylesheet.css \
        --extra-source=prefs.js \
        .
else
    zip -r "$ZIP_NAME" metadata.json extension.js prefs.js stylesheet.css schemas/
fi

echo "==> Successfully created: $ZIP_NAME"
echo "==> Ready to publish to https://extensions.gnome.org/upload/ !"
