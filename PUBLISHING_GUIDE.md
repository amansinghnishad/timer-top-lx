# How to Publish to Ubuntu Extension Manager

Ubuntu's **Extension Manager** application queries [extensions.gnome.org](https://extensions.gnome.org) (often called **EGO**). To make your extension discoverable and installable in Extension Manager for everyone, you submit the packaged zip file to extensions.gnome.org.

---

## 1. Customize Your Extension Info (Optional)

Before uploading, you may customize the author information and UUID:

1. Open `metadata.json`:
   ```json
   {
     "name": "Focus Timer & Stopwatch",
     "description": "A sleek top-bar Pomodoro focus timer and precision stopwatch designed for focused study and deep work.",
     "uuid": "focus-timer@asn.dev",
     "shell-version": ["45", "46", "47", "48", "49", "50"],
     "settings-schema": "org.gnome.shell.extensions.focus-timer",
     "url": "https://github.com/your-username/focus-timer",
     "version": 1
   }
   ```
   - Change `focus-timer@asn.dev` to your desired UUID (format: `name@domain` or `name@github-username`).
   - Change the `url` to your GitHub repo or project webpage.

2. If you change the UUID, also update the `UUID` variable in `package.sh` and `install.sh`.

---

## 2. Generate the Extension Bundle

Run the build script:

```bash
./package.sh
```

This generates `focus-timer@asn.dev.shell-extension.zip`.

---

## 3. Upload to Extensions.gnome.org

1. Go to [https://extensions.gnome.org](https://extensions.gnome.org).
2. Click **Register** (or **Log In**) in the top-right corner.
3. Once logged in, go to the upload page:
   👉 **[https://extensions.gnome.org/upload/](https://extensions.gnome.org/upload/)**
4. Click **Browse...** (or Drag & Drop) and select your generated file:
   `focus-timer@asn.dev.shell-extension.zip`
5. Click **Upload**.

---

## 4. Review & Approval Process

- **Automated Validation**:
  The system automatically verifies:
  - Correct ESM syntax.
  - Presence of required `metadata.json` keys.
  - Compatibility with target GNOME versions (45 through 50).
- **Human Review**:
  A GNOME Extension reviewer will inspect the code (usually within 1–3 business days).
  Because this extension strictly adheres to GNOME guidelines:
  - Clean lifecycle (`enable()` / `disable()`).
  - No global variables.
  - Safe timeouts (`GLib.Source.remove` on destroy).
  - Native Libadwaita preferences (`prefs.js`).
  - Native schema compilation.
  It is already optimized for review approval.

---

## 5. Instant Availability on Ubuntu Extension Manager

As soon as the review is approved:
1. Anyone on Ubuntu can launch **Extension Manager**.
2. Go to the **Browse** tab.
3. Search for **"Focus Timer & Stopwatch"**.
4. Click **Install** — it will immediately appear in their top bar!
