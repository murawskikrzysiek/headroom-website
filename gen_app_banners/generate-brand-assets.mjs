#!/usr/bin/env node
/**
 * generate-brand-assets.mjs
 * ───────────────────────────────────────────────────────────────
 * Generates every raster brand asset for Headroom Studio from a single
 * source of truth (the mark geometry embedded below + the design constants
 * at the top of this file):
 *
 *   - App icon          PNGs at 16, 32, 64, 128, 256, 512, 1024
 *   - Favicons          PNGs at 16, 32, 48
 *   - Apple touch icon  180×180
 *   - Menubar templates 1×/2×/3× (pure black on transparent — macOS
 *                       template image; macOS recolors automatically)
 *   - Social avatars    square 400 and 1024
 *   - OG image          1200×630 hero card with full lockup
 *
 * All output is rendered at the target physical pixel size (no double
 * resample), with the same canvas-v3 fixes as the app banner script:
 *
 *   1. canvas@^3                              (canvas v2 silently no-ops on Node 25)
 *   2. registerFont(InterTight[wght].ttf)     (system fonts don't resolve
 *                                              through fontconfig on macOS)
 *   3. FONT_STACK = '"Inter Tight"'           (CSS UA-keywords like
 *                                              -apple-system trip canvas v3's
 *                                              parser; we use one quoted family)
 *   4. drop-shadow workaround                 (not needed here — the mark is
 *                                              drawn as vector paths, so
 *                                              ctx.shadowBlur on the path
 *                                              already follows alpha. Kept
 *                                              consistent with the app script
 *                                              by drawing into an offscreen
 *                                              and compositing without shadow
 *                                              state when we have to scale.)
 *
 * Setup:
 *   brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
 *   npm install
 *   # Drop Inter Tight's variable TTF at ./fonts/InterTight[wght].ttf
 *   # (download from https://fonts.google.com/specimen/Inter+Tight)
 *
 * Usage:
 *   node generate-brand-assets.mjs
 *
 * Tested on Node 22+ with canvas@^3.
 */

import { createCanvas, registerFont } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── CONFIG ────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

// Output base — defaults to repo root (one level up from this script).
const OUT_DIR = resolve(__dirname, '..');

// Inter Tight (variable). Same setup as the app banner script.
const FONT_PATH = resolve(__dirname, 'fonts/InterTight[wght].ttf');
registerFont(FONT_PATH, { family: 'Inter Tight', weight: '400' });
registerFont(FONT_PATH, { family: 'Inter Tight', weight: '500' });
registerFont(FONT_PATH, { family: 'Inter Tight', weight: '600' });
const FONT_STACK = '"Inter Tight"';

// Design tokens — single source of truth. Tweak once, all assets update.
const C = {
  // Page / OG background gradient
  bgInner:  '#1a1c2a',
  bgMid:    '#0e0f17',
  bgOuter:  '#06070c',

  // App icon background (squircle): top-left → bottom-right
  iconBgTop: '#2b2c3e',
  iconBgBot: '#0a0b13',

  // Mark fill (light periwinkle)
  mark: '#d0cef0',

  // Wordmark typography
  textHead: '#e6e3ff',   // "Head"
  textRoom: '#7a78a8',   // "room"
  textTagSubline: '#7a78a8',  // "STUDIO" caps
  textTaglineFooter: 'rgba(160,158,200,0.55)', // bottom strap
};

// ─── MARK GEOMETRY ─────────────────────────────────────────────
// 64-unit viewbox; matches brand/headroom-mark.svg exactly.
// All shapes are rounded rectangles.
const MARK_RECTS = [
  // horizontal top "ceiling" bar with two endcaps
  { x: 10,    y: 11.25, w: 44,   h: 1.5,  r: 0.75 },
  { x: 9.25,  y: 10,    w: 1.5,  h: 4,    r: 0.75 },
  { x: 53.25, y: 10,    w: 1.5,  h: 4,    r: 0.75 },
  // bars (peaked spectrum)
  { x: 9,     y: 30,    w: 7,    h: 22,   r: 3.5  },
  { x: 18.5,  y: 20,    w: 6,    h: 32,   r: 3    },
  { x: 27,    y: 12,    w: 5,    h: 40,   r: 2.5  },
  { x: 34.5,  y: 8,     w: 4,    h: 44,   r: 2    },
  { x: 41,    y: 14,    w: 3.5,  h: 38,   r: 1.75 },
  { x: 47,    y: 24,    w: 3,    h: 28,   r: 1.5  },
  { x: 52.5,  y: 32,    w: 2.5,  h: 20,   r: 1.25 },
];

function drawMark(ctx, size, { fill = C.mark, glow = null } = {}) {
  // Draws the mark filling a `size × size` square at the current origin.
  // `glow` is an optional { color, blur, offsetY } for the soft halo.
  const k = size / 64;
  ctx.save();
  ctx.scale(k, k);
  if (glow) {
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.blur / k;
    ctx.shadowOffsetY = (glow.offsetY ?? 0) / k;
  }
  ctx.fillStyle = fill;
  for (const r of MARK_RECTS) {
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, r.r);
    ctx.fill();
  }
  ctx.restore();
}

// ─── COMMON HELPERS ────────────────────────────────────────────
async function writePng(canvas, path) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, canvas.toBuffer('image/png'));
  console.log('wrote', path);
}

function squirclePath(ctx, x, y, w, h, r) {
  // iOS-style squircle approximated by a rounded rectangle. For our sizes
  // (icons at 16–1024) a roundRect with r ≈ 0.22w is visually indistinguishable.
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ─── APP ICON ──────────────────────────────────────────────────
function renderAppIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.quality = 'best';

  const r = Math.round(size * 0.224); // iOS-ish corner radius

  // Squircle background with a diagonal gradient (top-left → bottom-right)
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, C.iconBgTop);
  bg.addColorStop(1, C.iconBgBot);
  squirclePath(ctx, 0, 0, size, size, r);
  ctx.fillStyle = bg;
  ctx.fill();

  // Subtle top-left highlight rim
  ctx.save();
  squirclePath(ctx, 0, 0, size, size, r);
  ctx.clip();
  const hl = ctx.createRadialGradient(
    size * 0.25, size * 0.2, 0,
    size * 0.25, size * 0.2, size * 0.7
  );
  hl.addColorStop(0, 'rgba(255,255,255,0.06)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Mark — centered, ~62% of icon size, with a soft periwinkle glow
  const markSize = Math.round(size * 0.62);
  const markX = (size - markSize) / 2;
  const markY = (size - markSize) / 2;
  ctx.save();
  ctx.translate(markX, markY);
  drawMark(ctx, markSize, {
    fill: C.mark,
    glow: {
      color: 'rgba(208,206,240,0.35)',
      blur: size * 0.04,
      offsetY: 0,
    },
  });
  ctx.restore();

  return canvas;
}

// ─── AVATAR (full-bleed square, no rounded corners) ───────────
function renderAvatar(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(
    size * 0.35, size * 0.4, 0,
    size * 0.5, size * 0.5, size * 0.8
  );
  bg.addColorStop(0, C.bgInner);
  bg.addColorStop(0.5, C.bgMid);
  bg.addColorStop(1, C.bgOuter);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const markSize = Math.round(size * 0.62);
  const markX = (size - markSize) / 2;
  const markY = (size - markSize) / 2;
  ctx.save();
  ctx.translate(markX, markY);
  drawMark(ctx, markSize, {
    fill: C.mark,
    glow: { color: 'rgba(208,206,240,0.28)', blur: size * 0.04 },
  });
  ctx.restore();
  return canvas;
}

// ─── MENUBAR TEMPLATE (pure black on transparent) ─────────────
// macOS template images: black mark with alpha, system inverts/recolors.
function renderMenubarTemplate(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  // No background fill — keep the canvas transparent.
  // Inset the mark slightly so the heaviest stroke isn't pressed against
  // the canvas edge in 18px renderings.
  const inset = Math.round(size * 0.06);
  const markSize = size - inset * 2;
  ctx.save();
  ctx.translate(inset, inset);
  drawMark(ctx, markSize, { fill: '#000000' });
  ctx.restore();
  return canvas;
}

// ─── OG IMAGE (1200×630) ───────────────────────────────────────
function renderOG(logicalW = 1200, logicalH = 630, scale = 2) {
  const W = logicalW * scale;
  const H = logicalH * scale;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.quality = 'best';
  ctx.scale(scale, scale);

  // Background: radial highlight, right-side vignette (matches the apps
  // banners exactly so the visual family is consistent).
  const bg = ctx.createRadialGradient(
    logicalW * 0.35, logicalH * 0.5, 0,
    logicalW * 0.35, logicalH * 0.5, logicalW * 0.85
  );
  bg.addColorStop(0,    C.bgInner);
  bg.addColorStop(0.45, C.bgMid);
  bg.addColorStop(1,    C.bgOuter);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, logicalW, logicalH);

  const vg = ctx.createLinearGradient(logicalW * 0.5, 0, logicalW, 0);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, logicalW, logicalH);

  // ── Lockup geometry ──
  // Mark sits to the left of the wordmark. "Headroom" sits above tracked
  // "STUDIO". All sizes are fractions of logical height so the same code
  // could render an 800×420 or 2400×1260 card cleanly.
  const markSize    = Math.round(logicalH * 0.32);
  const headFont    = Math.round(logicalH * 0.155);
  const studioFont  = Math.round(logicalH * 0.045);
  const taglineFont = Math.round(logicalH * 0.038);

  // Measure wordmark width: "Head" + "room" concatenated, no kerning gap
  ctx.font = `600 ${headFont}px ${FONT_STACK}`;
  const headW = ctx.measureText('Head').width;
  const roomW = ctx.measureText('room').width;
  const wordW = headW + roomW;

  // Measure "STUDIO" with letter-spacing baked in (simulate tracking by
  // measuring each char and adding the spacing manually)
  const tracking = studioFont * 0.32;
  const studioChars = 'STUDIO'.split('');
  ctx.font = `500 ${studioFont}px ${FONT_STACK}`;
  const studioCharWidths = studioChars.map(c => ctx.measureText(c).width);
  const studioW = studioCharWidths.reduce((a, b) => a + b, 0) +
                  tracking * (studioChars.length - 1);

  const textW = Math.max(wordW, studioW);
  const gap = Math.round(logicalH * 0.06);
  const totalW = markSize + gap + textW;
  const startX = Math.round((logicalW - totalW) / 2);
  const centerY = Math.round(logicalH * 0.46);

  // ── Mark ──
  // Drawn directly as vectors — no PNG-source resample, no
  // canvas-v3-shadow quirks to negotiate.
  ctx.save();
  ctx.translate(startX, centerY - markSize / 2);
  drawMark(ctx, markSize, {
    fill: C.mark,
    glow: { color: 'rgba(208,206,240,0.18)', blur: logicalH * 0.025 },
  });
  ctx.restore();

  // ── Wordmark: "Head" (bright) + "room" (muted) ──
  const textX = startX + markSize + gap;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${headFont}px ${FONT_STACK}`;
  const wordBaseline = centerY + Math.round(headFont * 0.18);
  ctx.fillStyle = C.textHead;
  ctx.fillText('Head', textX, wordBaseline);
  ctx.fillStyle = C.textRoom;
  ctx.fillText('room', textX + headW, wordBaseline);

  // ── "STUDIO" subline, tracked, under the wordmark ──
  ctx.font = `500 ${studioFont}px ${FONT_STACK}`;
  ctx.fillStyle = C.textTagSubline;
  const studioY = wordBaseline + Math.round(studioFont * 1.7);
  let sx = textX;
  for (let i = 0; i < studioChars.length; i++) {
    ctx.fillText(studioChars[i], sx, studioY);
    sx += studioCharWidths[i] + tracking;
  }

  // ── Footer tagline ──
  ctx.font = `400 ${taglineFont}px ${FONT_STACK}`;
  ctx.fillStyle = C.textTaglineFooter;
  ctx.textAlign = 'center';
  ctx.fillText('Precision audio tools for macOS', logicalW / 2, logicalH - Math.round(logicalH * 0.105));

  return canvas;
}

// ─── MAIN ──────────────────────────────────────────────────────
// App icons
for (const size of [16, 32, 64, 128, 256, 512, 1024]) {
  await writePng(renderAppIcon(size), join(OUT_DIR, `app-icon/AppIcon-${size}.png`));
}

// Favicons (small app icons)
for (const size of [16, 32, 48]) {
  await writePng(renderAppIcon(size), join(OUT_DIR, `favicon/favicon-${size}.png`));
}
// Apple touch icon
await writePng(renderAppIcon(180), join(OUT_DIR, 'favicon/apple-touch-icon.png'));

// Menubar template images (1× = 18pt base)
const MB_BASE = 18;
for (const [label, scale] of [['1x', 1], ['2x', 2], ['3x', 3]]) {
  await writePng(
    renderMenubarTemplate(MB_BASE * scale),
    join(OUT_DIR, `menubar/menubar-icon-template_${label}.png`),
  );
}

// Social avatars
await writePng(renderAvatar(400),  join(OUT_DIR, 'social/avatar-square-400.png'));
await writePng(renderAvatar(1024), join(OUT_DIR, 'social/avatar-square-1024.png'));

// OG image (rendered at 2× → 2400×1260 for Retina crispness)
await writePng(renderOG(1200, 630, 2), join(OUT_DIR, 'social/og-image-1200x630.png'));

console.log('done');
