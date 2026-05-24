#!/usr/bin/env node
/**
 * generate-app-banners.mjs
 * ───────────────────────────────────────────────────────────────
 * Generates OG (1200×630) and Landing-Page thumbnail (1600×1200) images
 * for each app in the APPS list, in the Headroom Studio house style:
 * dark radial-gradient background, horizontal icon+name lockup, periwinkle
 * accent underline, muted subtitle, centered footer tagline.
 *
 * Files are written at 2× the logical size so they stay crisp on Retina.
 *
 * Setup:
 *   brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman
 *   npm install
 *   # Drop Inter Tight's variable TTF at ./fonts/InterTight[wght].ttf
 *   # (download from https://fonts.google.com/specimen/Inter+Tight)
 *
 * Usage:
 *   node generate-app-banners.mjs
 *
 * Adjust the APPS array below to point at your icon PNGs and change copy.
 * Defaults assume a repo layout like:
 *
 *     <repo>/
 *       <this-folder>/generate-app-banners.mjs
 *       <slug>/icon.png             ← input (1024×1024)
 *       <slug>/og.png               ← output (overwritten)
 *       <slug>/ls-thumbnail.png     ← output (overwritten)
 *
 * Tested on Node 22+ with canvas@^3. (canvas v2 silently no-ops on Node 25.)
 */

import { createCanvas, loadImage, registerFont } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── CONFIG ────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));

// Both default to the repo root (one level up from this script). Override
// to point elsewhere — anything resolved here is treated as a base for the
// per-app `icon` / output paths below.
const ICONS_DIR = resolve(__dirname, '..');
const OUT_DIR   = resolve(__dirname, '..');

const APPS = [
  {
    slug: 'audita',
    name: 'Audita',
    icon: join(ICONS_DIR, 'audita/icon.png'),
    subtitle: 'Real-time SPL meter & hearing dose tracker',
    tagline: 'Headroom Studio · Precision audio tools for macOS',
  },
  {
    slug: 'lyra',
    name: 'Lyra',
    icon: join(ICONS_DIR, 'lyra/icon.png'),
    subtitle: 'F-key volume control for Universal Audio Apollo',
    tagline: 'Headroom Studio · Precision audio tools for macOS',
  },
  {
    slug: 'specula',
    name: 'Specula',
    icon: join(ICONS_DIR, 'specula/icon.png'),
    subtitle: 'Pro audio analysis — loudness, FFT, compare & edit',
    tagline: 'Headroom Studio · Precision audio tools for macOS',
  },
];

// Inter Tight is required — node-canvas does NOT resolve system fonts via
// fontconfig on macOS, and the previous CSS-style fallback stack triggered
// a parse failure on canvas v3 (silently reverting to 10px sans-serif).
// Ship the variable font in ./fonts/ and register it under the two weights
// we use. Grab it from https://fonts.google.com/specimen/Inter+Tight
// (the file is named InterTight[wght].ttf).
const FONT_PATH = resolve(__dirname, 'fonts/InterTight[wght].ttf');
registerFont(FONT_PATH, { family: 'Inter Tight', weight: '400' });
registerFont(FONT_PATH, { family: 'Inter Tight', weight: '600' });

// Canvas v3's font parser rejects CSS UA-keywords like `-apple-system` and
// silently falls back to 10px sans-serif. Keep this to a single quoted family.
const FONT_STACK = '"Inter Tight"';

// ─── RENDER ────────────────────────────────────────────────────
async function render(logicalW, logicalH, app, scale = 2) {
  const W = logicalW * scale;
  const H = logicalH * scale;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.quality = 'best';
  ctx.scale(scale, scale);

  // Background: radial highlight, slight right-side vignette
  const bg = ctx.createRadialGradient(
    logicalW * 0.35, logicalH * 0.5, 0,
    logicalW * 0.35, logicalH * 0.5, logicalW * 0.85
  );
  bg.addColorStop(0,    '#1a1c2a');
  bg.addColorStop(0.45, '#0e0f17');
  bg.addColorStop(1,    '#06070c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, logicalW, logicalH);

  const vg = ctx.createLinearGradient(logicalW * 0.5, 0, logicalW, 0);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, logicalW, logicalH);

  // Load icon
  const icon = await loadImage(app.icon);

  // Sizing (all in logical units, relative to height)
  const iconSize    = Math.round(logicalH * 0.28);
  const nameFont    = Math.round(logicalH * 0.155);
  const subFont     = Math.round(logicalH * 0.045);
  const taglineFont = Math.round(logicalH * 0.028);

  // Measure widths
  ctx.font = `600 ${nameFont}px ${FONT_STACK}`;
  const nameWidth = ctx.measureText(app.name).width;
  ctx.font = `400 ${subFont}px ${FONT_STACK}`;
  const subWidth = ctx.measureText(app.subtitle).width;

  // Layout (centered horizontal lockup)
  const textBlockWidth = Math.max(nameWidth, subWidth);
  const gap = Math.round(logicalH * 0.06);
  const totalWidth = iconSize + gap + textBlockWidth;
  const startX = Math.round((logicalW - totalWidth) / 2);
  const centerY = Math.round(logicalH * 0.48);

  // Icon with soft drop shadow.
  //
  // canvas v3 has two interacting quirks here:
  //   (a) drawImage(canvas, …, dw, dh) with active shadowBlur paints the
  //       destination *rectangle* as the shadow region (ignores alpha).
  //   (b) drawImage(image,  …, dw, dh) with active shadowBlur follows alpha
  //       normally.
  //
  // And we also want to avoid the icon going through a downsample-then-
  // upsample cycle (1024 → logical iconSize → physical iconSize*scale) which
  // visibly softens the OG card.
  //
  // Strategy:
  //   1. Bake the shadow once on a physical-pixel-sized offscreen, using the
  //      Image source + dst dims path → alpha-following shadow, single clean
  //      downsample.
  //   2. Pad the offscreen so the soft-edged shadow halo doesn't get clipped.
  //   3. Composite that offscreen onto the main canvas with NO shadow state →
  //      the canvas → canvas + dst-dims path is shadow-free, so quirk (a)
  //      can't fire.
  const physIconSize = iconSize * scale;
  const physBlur     = Math.round(logicalH * 0.04) * scale;
  const physOffsetY  = Math.round(logicalH * 0.012) * scale;
  const margin       = Math.ceil(physBlur * 2 + physOffsetY); // halo room
  const offSize      = physIconSize + margin * 2;

  const offscreen = createCanvas(offSize, offSize);
  const offCtx    = offscreen.getContext('2d');
  offCtx.shadowColor   = 'rgba(0,0,0,0.55)';
  offCtx.shadowBlur    = physBlur;
  offCtx.shadowOffsetY = physOffsetY;
  offCtx.drawImage(icon, margin, margin, physIconSize, physIconSize);

  // Main composite. No shadow state here — canvas→canvas with dst dims is a
  // plain pixel copy in that case. dstMargin is the halo padding in logical
  // units so the icon's visual position stays where the layout expects it.
  const dstMargin = margin / scale;
  ctx.drawImage(
    offscreen,
    startX - dstMargin,
    centerY - iconSize / 2 - dstMargin,
    iconSize + dstMargin * 2,
    iconSize + dstMargin * 2,
  );

  // Name
  const textX = startX + iconSize + gap;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${nameFont}px ${FONT_STACK}`;
  ctx.fillStyle = '#f4f3ff';
  const nameBaseline = centerY + Math.round(nameFont * 0.18);
  ctx.fillText(app.name, textX, nameBaseline);

  // Periwinkle underline accent
  const underlineY = nameBaseline + Math.round(nameFont * 0.12);
  const underlineW = Math.round(nameWidth * 0.18);
  ctx.fillStyle = '#9d9be8';
  ctx.fillRect(textX, underlineY, underlineW, Math.max(2, Math.round(logicalH * 0.005)));

  // Subtitle
  ctx.font = `400 ${subFont}px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(180,178,220,0.78)';
  const subY = underlineY + Math.round(subFont * 1.6);
  ctx.fillText(app.subtitle, textX, subY);

  // Footer tagline
  ctx.font = `400 ${taglineFont}px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(160,158,200,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(app.tagline, logicalW / 2, logicalH - Math.round(logicalH * 0.075));

  return canvas;
}

async function writePng(canvas, path) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, canvas.toBuffer('image/png'));
  console.log('wrote', path);
}

// ─── MAIN ──────────────────────────────────────────────────────
for (const app of APPS) {
  const og = await render(1200, 630,  app, 2); // → 2400×1260
  const ls = await render(1600, 1200, app, 2); // → 3200×2400
  await writePng(og, join(OUT_DIR, app.slug, 'og.png'));
  await writePng(ls, join(OUT_DIR, app.slug, 'ls-thumbnail.png'));
}
console.log('done');
