# Headroom Studio · banner generator

A standalone Node.js script that produces the OG (1200×630) and landing‑page
thumbnail (1600×1200) images for each app, in the house style used on
headroomstudio.dev.

Output is rendered at 2× (2400×1260 / 3200×2400) so the PNGs stay crisp on
Retina displays.

## Install

```bash
# REQUIRED system deps for node-canvas v3 on macOS. Without them, `npm install`
# fails with a confusing native-build error.
brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman

# In this folder (the one containing generate-app-banners.mjs):
npm install
```

> The script is plain ESM (`.mjs`) — run with `node generate-app-banners.mjs`.
> Tested on Node 22+ with `canvas@^3` (canvas v2 silently no-ops on Node 25).

## Default layout

Both `ICONS_DIR` and `OUT_DIR` default to **the repo root** (one level up
from this script). The expected layout is:

```
<repo>/
  <this-folder>/
    generate-app-banners.mjs
    package.json
    README.md
    fonts/InterTight[wght].ttf
  audita/
    icon.png            ← input (1024×1024, transparent PNG)
    og.png              ← output (overwritten)
    ls-thumbnail.png    ← output (overwritten)
  lyra/
    icon.png
    og.png
    ls-thumbnail.png
  specula/
    ...
```

So a single `node generate-app-banners.mjs` reads each `<slug>/icon.png`
and writes `<slug>/og.png` + `<slug>/ls-thumbnail.png` in place — no copy /
rename step.

## Configure

Edit the `APPS` array at the top of `generate-app-banners.mjs` to add /
rename apps or change subtitles:

```js
const APPS = [
  {
    slug: 'audita',
    name: 'Audita',
    icon: join(ICONS_DIR, 'audita/icon.png'),
    subtitle: 'Real-time SPL meter & hearing dose tracker',
    tagline: 'Headroom Studio · Precision audio tools for macOS',
  },
  // ...
];
```

If your icons or outputs live elsewhere, change `ICONS_DIR` / `OUT_DIR`
near the top of the script — both resolve relative to the script's own
folder.

## Fonts — REQUIRED

node-canvas does **not** resolve system fonts via fontconfig on macOS, so
Inter Tight must be supplied in‑tree:

1. Download Inter Tight from https://fonts.google.com/specimen/Inter+Tight
   (you get a zip containing `InterTight[wght].ttf` — a single variable file).
2. Drop it into `fonts/InterTight[wght].ttf` next to this script.

The script registers the same variable file twice (weights 400 and 600) at
startup. If the file is missing you'll get a "Could not load font" error
from `registerFont`.

## Icons

Each app needs a transparent 1024×1024 PNG with a squircle alpha mask. The
script rasterizes the icon at physical pixel size onto an offscreen canvas
before drawing it, so the drop shadow follows the alpha (not the bounding
box) **and** the icon doesn't go through a downsample‑then‑upsample cycle
that would soften it.

## Run

```bash
node generate-app-banners.mjs
```

Default output:

```
../audita/og.png
../audita/ls-thumbnail.png
../lyra/og.png
../lyra/ls-thumbnail.png
../specula/og.png
../specula/ls-thumbnail.png
```

## Customising the design

All design constants are inside the `render()` function and are expressed
as fractions of the logical height — change once, both 1200×630 and
1600×1200 outputs stay in proportion:

| Knob              | Where                                       |
|-------------------|---------------------------------------------|
| Background colors | `bg.addColorStop(...)` calls                |
| Icon size         | `iconSize = Math.round(logicalH * 0.28)`    |
| Name size         | `nameFont = Math.round(logicalH * 0.155)`   |
| Accent color      | `ctx.fillStyle = '#9d9be8'` (underline)     |
| Subtitle color    | `rgba(180,178,220,0.78)`                    |
| Vertical centering| `centerY = Math.round(logicalH * 0.48)`     |

The 2× retina factor is the last argument to `render()`. Bump it to 3 if
you need 3× output for App Store screenshots etc.
