"""
make_ls_audita.py
Lemon Squeezy store thumbnail for Audita — 1600×1200.

Design: Dark Instrument (green variant)
A monitoring-desk-at-night aesthetic. Icon as primary object, centred.
SPL / dose / peak shown as sculpted feature pills. Minimal type system.
"""

from PIL import Image, ImageDraw, ImageFont
import math, os

HERE  = os.path.dirname(os.path.abspath(__file__))
FONTS = "/sessions/intelligent-hopeful-brown/mnt/.claude/skills/canvas-design/canvas-fonts"

W, H = 1600, 1200

# ── Palette ────────────────────────────────────────────────────────────────────
BG     = (11,  11,  15)
ACCENT = (62,  207, 124)   # brand green
TEXT   = (238, 238, 246)
TEXT2  = (110, 110, 144)
TEXT3  = (45,  45,  65)

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

# ── Canvas ─────────────────────────────────────────────────────────────────────
img  = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")

# ── Layered radial glow — centred behind icon ──────────────────────────────────
cx, cy = W // 2, 480
for r in range(520, 0, -1):
    t  = r / 520
    a  = int(26 * (1 - t) ** 2.2)
    col = (
        min(255, BG[0] + int((ACCENT[0] - BG[0]) * (1 - t) * 0.55) + a),
        min(255, BG[1] + int((ACCENT[1] - BG[1]) * (1 - t) * 0.55) + a),
        min(255, BG[2] + int((ACCENT[2] - BG[2]) * (1 - t) * 0.55) + a),
    )
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

# ── Subtle concentric ring decorations around icon area ───────────────────────
for r, alpha in [(210, 28), (290, 16), (380, 9)]:
    ring_col = ACCENT + (alpha,)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                 outline=ring_col, width=1)

# ── App icon — large, centred ──────────────────────────────────────────────────
ICON_SIZE = 320
icon_raw  = Image.open(os.path.join(HERE, "audita/icon.png")).convert("RGBA")
icon_raw  = icon_raw.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS)
icon_x    = (W - ICON_SIZE) // 2
icon_y    = cy - ICON_SIZE // 2
img.paste(icon_raw, (icon_x, icon_y), icon_raw)

# ── App name ──────────────────────────────────────────────────────────────────
f_title = font("BricolageGrotesque-Bold.ttf", 112)
title   = "Audita"
tb      = draw.textbbox((0, 0), title, font=f_title)
title_w = tb[2] - tb[0]
title_x = (W - title_w) // 2
title_y = icon_y + ICON_SIZE + 36
draw.text((title_x, title_y), title, font=f_title, fill=TEXT)

# ── Thin separator ────────────────────────────────────────────────────────────
sep_w  = 360
title_h = draw.textbbox((0, 0), title, font=f_title)[3] - draw.textbbox((0, 0), title, font=f_title)[1]
sep_y  = title_y + title_h + 36
sep_x  = (W - sep_w) // 2
draw.line([(sep_x, sep_y), (sep_x + sep_w, sep_y)],
          fill=TEXT3 + (220,), width=1)

# ── Subtitle ──────────────────────────────────────────────────────────────────
f_sub = font("InstrumentSans-Regular.ttf", 30)
sub   = "Real-time SPL & hearing dose tracker"
sb    = draw.textbbox((0, 0), sub, font=f_sub)
sub_x = (W - (sb[2] - sb[0])) // 2
draw.text((sub_x, sep_y + 20), sub, font=f_sub, fill=TEXT2)

# ── Feature pill row — dB SPL / NIOSH Dose / dBC Peak ─────────────────────────
f_key    = font("GeistMono-Bold.ttf", 22)
f_keylbl = font("Jura-Light.ttf",     17)

features = [
    ("dB SPL",     "A-weighted level"),
    ("NIOSH Dose", "Hearing exposure"),
    ("dBC Peak",   "Impulse monitoring"),
]

key_w, key_h = 160, 66
gap          = 28
total_keys_w = len(features) * key_w + (len(features) - 1) * gap
keys_x0      = (W - total_keys_w) // 2
keys_y       = sep_y + 100

for i, (label, action) in enumerate(features):
    kx = keys_x0 + i * (key_w + gap)
    ky = keys_y

    # Pill background
    draw.rounded_rectangle(
        [kx, ky, kx + key_w, ky + key_h],
        radius=10,
        fill=(22, 22, 32),
        outline=TEXT3 + (255,),
        width=1
    )

    # Feature label
    kb  = draw.textbbox((0, 0), label, font=f_key)
    klx = kx + (key_w - (kb[2] - kb[0])) // 2
    kly = ky + 10
    draw.text((klx, kly), label, font=f_key, fill=ACCENT)

    # Description label below pill
    ab  = draw.textbbox((0, 0), action, font=f_keylbl)
    alx = kx + (key_w - (ab[2] - ab[0])) // 2
    draw.text((alx, ky + key_h + 12), action, font=f_keylbl, fill=TEXT2)

# ── macOS badge ───────────────────────────────────────────────────────────────
f_badge   = font("InstrumentSans-Regular.ttf", 18)
badge_lbl = "macOS 14+"
bb        = draw.textbbox((0, 0), badge_lbl, font=f_badge)
bw        = (bb[2] - bb[0]) + 28
bh        = 30
bx        = (W - bw) // 2
by        = keys_y + key_h + 60
draw.rounded_rectangle([bx, by, bx + bw, by + bh],
                        radius=6,
                        fill=(22, 22, 32),
                        outline=TEXT3 + (200,),
                        width=1)
draw.text((bx + 14, by + 5), badge_lbl, font=f_badge, fill=TEXT2)

# ── Bottom rule ───────────────────────────────────────────────────────────────
draw.line([(60, H - 68), (W - 60, H - 68)],
          fill=TEXT3 + (80,), width=1)

# ── Domain — bottom-right ─────────────────────────────────────────────────────
f_domain = font("Jura-Light.ttf", 22)
domain   = "headroomstudio.dev"
db       = draw.textbbox((0, 0), domain, font=f_domain)
draw.text((W - (db[2] - db[0]) - 60, H - 52),
          domain, font=f_domain, fill=TEXT3)

# ── Studio wordmark — bottom-left ─────────────────────────────────────────────
f_wm = font("Jura-Light.ttf", 22)
wm   = "Headroom Studio"
draw.text((60, H - 52), wm, font=f_wm, fill=TEXT3)

# ── Save ──────────────────────────────────────────────────────────────────────
out = os.path.join(HERE, "audita/ls-thumbnail.png")
img.save(out, "PNG")
print(f"Saved {out}  ({W}×{H})")
