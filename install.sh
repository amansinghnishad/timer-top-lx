#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID=$(grep -oP '"uuid":\s*"\K[^"]+' "$SCRIPT_DIR/metadata.json" || echo "focus-timer@github-amansinghnishad")
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "==> Building and compiling schemas..."
"$SCRIPT_DIR/package.sh"

echo "==> Installing to $EXT_DIR..."
mkdir -p "$EXT_DIR"
cp "$SCRIPT_DIR/metadata.json" "$EXT_DIR/"
cp "$SCRIPT_DIR/extension.js" "$EXT_DIR/"
cp "$SCRIPT_DIR/indicator.js" "$EXT_DIR/"
cp "$SCRIPT_DIR/clockWidget.js" "$EXT_DIR/"
cp "$SCRIPT_DIR/utils.js" "$EXT_DIR/"
cp "$SCRIPT_DIR/prefs.js" "$EXT_DIR/"
cp "$SCRIPT_DIR/stylesheet.css" "$EXT_DIR/"
mkdir -p "$EXT_DIR/schemas"
cp "$SCRIPT_DIR/schemas/org.gnome.shell.extensions.focus-timer.gschema.xml" "$EXT_DIR/schemas/"
glib-compile-schemas "$EXT_DIR/schemas"

echo "==> Enabling extension in GSettings..."
gsettings set org.gnome.shell enabled-extensions "$(gsettings get org.gnome.shell enabled-extensions | sed "s/]/, '$UUID']/" | sed "s/', '$UUID', '$UUID'/', '$UUID'/")"

echo "---------------------------------------------------------"
echo "Done! Extension installed to: $EXT_DIR"
echo "Note: If you are using Wayland, please log out and log back in"
echo "to have GNOME Shell load the newly installed extension."
echo "On X11, press Alt + F2, type 'r', and press Enter."
echo "---------------------------------------------------------"
