# Focus Timer & Stopwatch (GNOME Shell Extension)

A top-bar Pomodoro timer and precision stopwatch for Ubuntu and GNOME Shell, built specifically for focused study sessions, deep work, and productivity tracking.

Compatible with **GNOME 45, 46, 47, 48, 49, and 50** (Ubuntu 23.10 through Ubuntu 26.04+).

---

## Features

- **Top Bar Indicator**:
  - Live countdown / countup timer in the GNOME status bar.
  - Contextual status styling (Study session, Break time, Paused, Finished).
  - **Middle-Click shortcut**: Start or pause directly without opening the menu.
  - **Scroll shortcut**: Scroll up/down on the panel icon to adjust timer minutes.
- **Focus Timer**:
  - **Editable Clock Display**: Click directly on the Minutes or Seconds digits to type any time (e.g. `25`, `45`, `90`).
  - **Steppers & Scroll**: Use the `▲` / `▼` arrow buttons or scroll mouse wheel directly on the digits to adjust time with ease.
  - Audio completion chime (`alarm-clock-elapsed` / system sounds via Canberra / PipeWire).
  - Native GNOME desktop notification alerts.
- **Precision Stopwatch**:
  - Millisecond-accurate counting (`MM:SS` and `HH:MM:SS`).
  - **Lap Recording**: Save and review lap split times.
- **Preferences (Libadwaita)**:
  - Native Adwaita settings dialog to configure Pomodoro duration, Break intervals, Sound toggle, and Top bar appearance.

---

## Project Structure

```
├── extension.js         # Core GNOME Shell extension logic (ESM)
├── prefs.js             # Libadwaita Preferences window
├── stylesheet.css       # Adwaita-compliant UI styles
├── metadata.json        # Extension metadata & supported shell versions
├── schemas/             # GSettings schema for configurable preferences
│   ├── org.gnome.shell.extensions.focus-timer.gschema.xml
│   └── gschemas.compiled
├── package.sh           # Builds the release zip for extensions.gnome.org
├── install.sh           # Installs the extension locally for testing
├── PUBLISHING_GUIDE.md  # Step-by-step guide to publish on Ubuntu Extension Manager
└── README.md
```

---

## Quick Start: Test Locally on Your Machine

1. **Install and compile the extension locally**:
   ```bash
   ./install.sh
   ```
2. **Reload GNOME Shell**:
   - **On Wayland (Default on Ubuntu)**: Log out and log back in.
   - **On X11**: Press `Alt` + `F2`, type `r`, and press `Enter`.
3. Open **Extension Manager** or run:
   ```bash
   gnome-extensions enable focus-timer@asn.dev
   ```

