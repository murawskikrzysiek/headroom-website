# Audita website - screenshot needs

Every screenshot referenced by `audita/*.html` is tracked here. Use the suggested filename and path so existing `<img src="...">` references resolve.

This is the website-side companion to `Audita/docs/screenshot-needs.md` in the app repo. The two files cover different surfaces (in-app docs vs marketing site) and may overlap in setup but not in target path.

> **Capture method.** macOS `Shift+Cmd+5` (Capture Selection) on a Retina display. Save as **PNG**. The site renders dark only, so use **dark mode** for app windows where the system theme is visible (Settings windows). Free-floating popovers and the menu bar item itself don't need a particular system theme. Headroom site CSS displays screenshots at most ~1200 px wide; the raw 2x Retina capture (~2400 px wide) is fine, do not pre-resize.
>
> **Anonymisation.** No real DAW project names, no client names in any visible field. The Mic Location field can carry generic placeholder text ("Earthworks M30 at LP, Apollo ch 7").
>
> **v1.2 reminder.** The menu bar canvas grew from 18 pt to 22 pt in v1.2. Any reshot menu bar capture must show the new larger glyph. Frame the shot so a neighbouring icon (Lyra's headphone, the system battery, the clock) is visible for scale.

---

## Status legend

- **outdated** - a current file exists but shows the v1.1 SF Symbol ear; needs replacement with the Pressure Bloom.
- **pending** - referenced by `<img src="...">` but no file is in the repo yet.
- **verify** - file exists, content may or may not still be accurate; the next reshoot should explicitly check whether the Pressure Bloom or the legacy ear is visible.
- **current** - file matches the page copy as of the v1.2 update.

---

## index.html

### 1. `audita-hero.png` - status: verify

**Where it appears.** Top of `audita/index.html`, first image in the screenshot row.

**Target file.** `audita/audita-hero.png` (full-width hero composite). Existing file present.

**What to capture.** A "glance" hero composite that communicates monitoring discipline + live SPL + NIOSH dose + Send-to-Lyra in one image. If the composite currently includes the menu bar item, that menu bar capture must show the Pressure Bloom at 22 pt, not the v1.1 ear.

**Resolution.** 2x retina, no fixed bounds; full-width hero (renders at 720 px on the site).

**Theme.** Dark mode for any Settings or popover surfaces visible in the composite.

**Setup.**
- Pressure Bloom toggle: default (off, so the Bloom shows).
- A session is running, dose around 50 % (caution / yellow tier).
- Live SPL in the 70 dBA band so the menu bar Bloom shows 2 arcs, yellow.

---

### 2. `menu_bloom_green.png` / `menu_bloom_yellow.png` / `menu_bloom_red.png` - status: pending

**Where they appear.** `audita/index.html`, the three-column row right under the hero. Replaces the v1.1 `menu_dose_green.png` / `menu_dose_yellow.png` / `menu_dose_red.png` (which can be deleted once the Bloom variants land).

**Target files.**
- `audita/menu_bloom_green.png` - safe / green dose tier
- `audita/menu_bloom_yellow.png` - caution / yellow dose tier
- `audita/menu_bloom_red.png` - danger / red dose tier

**What to capture.** The menu bar popover with the dose tier driving the colour and the **44 pt Pressure Bloom** visible in the popover header next to the accumulated dose number. Three captures matching the three tier colours.

**Resolution.** 2x retina, ~360 x 540 px logical each (popover ~320 px wide plus drop-shadow margin).

**Theme.** No particular system theme needed (the popover paints its own translucent background).

**Setup per capture.**
- Pressure Bloom toggle: default (off / Bloom on).
- A session is running with a meaningful Monitoring Discipline number (~75 % on-target is a good story).
- **Green:** dose ~20 %. Use the DEBUG `simulateDoseLevel(.safe)` button if available.
- **Yellow:** dose ~55 %. `simulateDoseLevel(.caution)`.
- **Red:** dose ~95 %. `simulateDoseLevel(.danger)`.
- Live SPL value visible (any plausible studio level - the live SPL doesn't drive the popover glyph arcs, but the on-screen number should still read sensibly).
- `Shift+Cmd+5 -> Capture Selection`, rectangle just larger than the popover.

---

## guide.html

### 3. `images/screenshots/menubar-display-modes.png` - status: pending

**Where it appears.** `audita/guide.html` section 3 (Menu bar display).

**Target file.** `audita/images/screenshots/menubar-display-modes.png`.

**What to capture.** All five `MenuBarDisplayMode` variants side by side, each showing the **Pressure Bloom** (not the SF Symbol ear): icon only / dBA only / dBC only / icon+dBA / icon+dBC. Build the composite by capturing five separate menu bar items or by using a mockup strip that puts them in a row.

**Resolution.** 2x retina, ~1200 x 80 px logical for a horizontal strip.

**Theme.** Menu bar background neutral (no specific desktop wallpaper showing).

**Setup.**
- Pressure Bloom toggle: default (off / Bloom on).
- Mid-range tier so the colour cue reads: dose in the **caution band** (yellow) **and** live SPL in the **55-80 dBA** band (so the Bloom shows 2 arcs in yellow). That captures "Audita is monitoring, the level is normal, today's budget is partly used".
- One-decimal toggle: off (cleaner 2-digit numbers).
- Show the Bloom flanked by enough menu bar space that the 22 pt size reads.

---

### 4. `images/screenshots/menubar-popover-main.png` - status: pending

**Where it appears.** `audita/guide.html` section 4 (The dropdown menu).

**Target file.** `audita/images/screenshots/menubar-popover-main.png`.

**What to capture.** The main popover panel during an **active session** at a meaningful SPL. The popover header must show the **44 pt Pressure Bloom** to the left of the accumulated dose readout. Live dBA / dBC numbers, the dBC-dBA gap indicator if applicable, the monitoring discipline gauge with a real on-target %, and the pin + history footer buttons.

**Resolution.** 2x retina, ~360 x 720 px logical (popover is 320 px wide; the header through the footer fits within ~720 px tall).

**Theme.** No system theme dependency.

**Setup.**
- Pressure Bloom toggle: default (off / Bloom on).
- A session is running.
- Live SPL ~70 dBA. **Both surfaces follow live SPL for arc count and dose tier for colour**, so at ~70 dBA the menu bar Bloom (22 pt) and the popover header Bloom (44 pt) **both show 2 arcs in the same dose-tier colour**. Pick a dose around caution / yellow ~55 % so the colour reads as yellow on both glyphs.
- Frame the capture so both the menu bar Bloom (above the popover, at the menu bar item) and the popover header Bloom are visible. They must agree on arc count and colour.
- Monitoring discipline ON, with a calibrated target (e.g. `K-14 / 79 dBA +/- 3`), on-target ~75 %.
- License row: "Licensed" (not trial) for a clean look.

---

### 5. `images/screenshots/floating-panel.png` - status: pending (verify if exists)

**Where it appears.** `audita/guide.html` section 5 (Floating measurement panel).

**Target file.** `audita/images/screenshots/floating-panel.png`.

**What to capture.** The detached floating panel translucent over a DAW window. All sections visible: hearing dose, current SPL (dBA + dBC), monitoring discipline, Leq / Ln, active session, today's summary. The panel is borderless and translucent; on macOS 26+ the Liquid Glass effect should be visible.

**Resolution.** 2x retina, panel size at whatever the user has resized to (typically ~320 x 600 px logical), plus enough surrounding DAW window context to show the translucency.

**Theme.** Whatever the user's system theme is. The panel paints its own material.

**Setup.**
- macOS 26+ for the Liquid Glass effect (fall back to macOS 14-25 if 26 not available, note in alt text).
- A session is running.
- All Panel section toggles on (Settings -> Panel).
- A DAW window (Reaper / Ableton / generic dark waveform) visible behind the panel for translucency context.

**Note on Bloom.** The floating panel doesn't show the Bloom glyph - the dose section uses its own visual treatment. The Bloom appears only in the menu bar and the menu bar popover header.

---

### 6. `calibration-wizard.png` - status: verify

**Where it appears.** `audita/guide.html` section 6 (Calibration, Step 3) and `audita/index.html` (calibration row).

**Target file.** `audita/calibration-wizard.png`. Existing file present.

**What to capture.** Settings -> Audio -> Step 3 -> the target-level calibration wizard in the **captured** state (pink noise stopped, position held, save button visible). The capture window shows live SPL at target, the controller-position note field, and the save action.

**Resolution.** Existing file is currently 2x retina; verify dimensions when next captured.

**Theme.** Dark mode for the Settings window.

**Bloom or ear?** The wizard view does not include the menu bar icon or the popover header, so the Bloom doesn't appear here. The file is most likely unaffected by v1.2; flag for reshoot only if the wizard UI itself changed.

---

### 7. `send-to-lyra.png` - status: verify

**Where it appears.** `audita/index.html` (Lyra integration row) and `audita/api.html` (Send-to-Lyra worked example).

**Target file.** `audita/send-to-lyra.png`. Existing file present.

**What to capture.** The Send to Lyra sheet: segmented slot picker (1 / 2 / 3), name field defaulted to a K-System target ("K-14" for 79 dBA), the read-only SPL display showing the just-captured calibration.

**Theme.** Dark mode for the parent Settings window.

**Bloom or ear?** This sheet doesn't include the menu bar icon. File is most likely unaffected by v1.2; flag for reshoot only if the sheet UI itself changed.

---

### 8. `history.png` - status: verify

**Where it appears.** `audita/index.html` (history row, full width).

**Target file.** `audita/history.png`. Existing file present.

**What to capture.** The standalone history window: 7-day bar chart at top (with the EU L_EX,w header), 30-day session list below, calendar navigation. Bars colour-coded by daily dose tier.

**Theme.** Dark mode.

**Bloom or ear?** The history window doesn't include the menu bar icon. File is most likely unaffected by v1.2; flag for reshoot only if the history UI itself changed.

---

### 9. `images/screenshots/settings-audio-three-steps.png` - status: pending

**Where it appears.** `audita/guide.html` section 6 (Calibration).

**Target file.** `audita/images/screenshots/settings-audio-three-steps.png`.

**What to capture.** Settings -> Audio with Step 1, Step 2, and Step 3 cards all visible. Step 1 = Active (FIR engaged), Step 2 = offset around 94 with descriptive Mic Location text, Step 3 = a saved record with a captured controller-position note.

**Resolution.** 2x retina at the default Settings window size (~720 x 540 px logical).

**Theme.** Dark mode.

**Bloom or ear?** No menu bar visible. Unaffected by v1.2.

---

### 10. `images/screenshots/settings-reference-tab.png` - status: pending

**Where it appears.** `audita/guide.html` section 7 (Monitoring discipline).

**Target file.** `audita/images/screenshots/settings-reference-tab.png`.

**What to capture.** Settings -> Reference with a real target dBA selected (e.g. 79 dBA / K-14 with +/- 3 dB band), drift and off-target detectors visible, snooze controls.

**Theme.** Dark mode.

**Bloom or ear?** No menu bar visible. Unaffected by v1.2.

---

## api.html

### 11. `images/screenshots/shortcut-studio-on-ritual.png` - status: pending

**Where it appears.** `audita/api.html` cross-app worked example (studio-on ritual). Optional but desirable - the section reads cleanly as text-only reference if the screenshot isn't ready.

**Target file.** `audita/images/screenshots/shortcut-studio-on-ritual.png`. (Renamed from the earlier `shortcut-send-to-lyra-chain.png` slug - the Shortcut is no longer a Send-to-Lyra chain.)

**What to capture.** The Shortcuts.app editor showing the three-step "Dial in the studio" Shortcut, with all three action cards expanded so the parameters are readable:

1. **Open App**: Logic Pro (built-in Shortcuts action - not an Audita intent)
2. **Start Mixing Session in Audita** with DAW set to "Logic Pro"
3. **Switch to Reference Level in Lyra** with Slot set to 2

**Resolution.** 2x retina, target 1280 x 800 px logical final (Shortcuts editor at default window size).

**Theme.** Dark mode. macOS 26 Liquid Glass aesthetic if shooting on macOS 26+.

**Bloom or ear?** No menu bar visible. Independent of v1.2 menu bar changes.

**Note.** Pushing a calibrated SPL into a Lyra reference slot is a one-off setup-time action and stays in Audita Settings -> Audio -> "Send to Lyra...". This Shortcut is the *daily* ritual; the slot it recalls was populated earlier from inside Audita.
