"""
generate_og_images.py
Generates og:image social sharing cards for headroomstudio.dev.

Usage:
    python generate_og_images.py

Output:
    og-lyra.png      — 1200×630, used by lyra.html
    og-headroom.png  — 1200×630, used by index.html

Requirements:
    pip install Pillow

Fonts are loaded from a local canvas-fonts directory (see FONTS_DIR below).
If you move this script, update FONTS_DIR to point to your font folder,
or replace the font() calls with system fonts / your own .ttf files.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ── Paths ────────────────────────────────────────────────────────────────────
HERE      = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(HERE, "..", ".skills", "skills", "canvas-design", "canvas-fonts")

# ── Canvas size ───────────────────────────────────────────────────────────────
W, H = 1200, 630

# ── Brand colours (match headroomstudio.dev CSS variables exactly) ────────────
BG     = (11,  11,  15)     # --bg
ACCENT = (124, 132, 246)    # --accent  (#7c84f6)
TEXT   = (238, 238, 246)    # --text    (#eeeef6)
TEXT2  = (110, 110, 144)    # --text-2  (#6e6e90)
TEXT3  = (58,  58,  82)     # --text-3  (#3a3a52)


# ── Helpers ───────────────────────────────────────────────────────────────────

def font(filename, size):
    return ImageFont.truetype(os.path.join(FONTS_DIR, filename), size)


def make_base():
    """Dark background with a subtle top-left accent glow."""
    img = Image.new("RGB", (W, H), BG)
    d   = ImageDraw.Draw(img)
    for r in range(320, 0, -1):
        a = int(12 * (r / 320) ** 2)
        d.ellipse([-r + 60, -r + 60, r + 60, r + 60],
                  fill=tuple(min(255, c + a) for c in BG))
    return img


# ── og-lyra.png ───────────────────────────────────────────────────────────────

def make_og_lyra():
    img  = make_base()
    draw = ImageDraw.Draw(img)

    # App icon — left-aligned, vertically centred
    icon_size = 200
    icon_raw  = Image.open(os.path.join(HERE, "lyra/icon.png")).convert("RGBA")
    icon_raw  = icon_raw.resize((icon_size, icon_size), Image.LANCZOS)
    icon_x    = 90
    icon_y    = (H - icon_size) // 2
    img.paste(icon_raw, (icon_x, icon_y), icon_raw)

    # Text column
    tx       = icon_x + icon_size + 58
    ty_start = H // 2 - 90

    # App name
    f_title = font("BricolageGrotesque-Bold.ttf", 96)
    draw.text((tx, ty_start), "Lyra", font=f_title, fill=TEXT)

    # Thin separator line
    div_y = ty_start + 108
    draw.line([(tx, div_y), (tx + 440, div_y)], fill=TEXT3 + (180,), width=1)

    # Subtitle
    f_sub = font("InstrumentSans-Regular.ttf", 26)
    draw.text((tx, div_y + 18),
              "F-key volume control for Universal Audio Apollo",
              font=f_sub, fill=TEXT2)

    # Domain — bottom-right, quiet
    f_domain = font("Jura-Light.ttf", 20)
    domain   = "headroomstudio.dev"
    bbox     = draw.textbbox((0, 0), domain, font=f_domain)
    draw.text((W - (bbox[2] - bbox[0]) - 44, H - 44),
              domain, font=f_domain, fill=TEXT3)

    # Bottom rule
    draw.line([(44, H - 56), (W - 44, H - 56)], fill=TEXT3 + (60,), width=1)

    out = os.path.join(HERE, "lyra/og.png")
    img.save(out, "PNG")
    print(f"Saved {out}")


# ── og-headroom.png ───────────────────────────────────────────────────────────

def make_og_headroom():
    img  = make_base()
    draw = ImageDraw.Draw(img)

    # "Headroom" logotype — "Head" white, "room" accent
    f_logo    = font("BricolageGrotesque-Bold.ttf", 110)
    head_w    = draw.textbbox((0, 0), "Head", font=f_logo)[2]
    total_w   = head_w + draw.textbbox((0, 0), "room", font=f_logo)[2]
    logo_y    = H // 2 - 90
    logo_x    = (W - total_w) // 2

    draw.text((logo_x,          logo_y), "Head", font=f_logo, fill=TEXT)
    draw.text((logo_x + head_w, logo_y), "room", font=f_logo, fill=ACCENT)

    # Tagline
    f_tag  = font("InstrumentSans-Regular.ttf", 27)
    tag    = "Small tools.  Serious work."
    tag_bb = draw.textbbox((0, 0), tag, font=f_tag)
    tag_w  = tag_bb[2] - tag_bb[0]
    tag_x  = (W - tag_w) // 2
    tag_y  = logo_y + 128

    # Thin separator above tagline
    draw.line([(tag_x, tag_y - 16), (tag_x + tag_w, tag_y - 16)],
              fill=TEXT3 + (120,), width=1)
    draw.text((tag_x, tag_y), tag, font=f_tag, fill=TEXT2)

    # Domain — bottom-right, quiet
    f_domain = font("Jura-Light.ttf", 20)
    domain   = "headroomstudio.dev"
    bbox     = draw.textbbox((0, 0), domain, font=f_domain)
    draw.text((W - (bbox[2] - bbox[0]) - 44, H - 44),
              domain, font=f_domain, fill=TEXT3)

    # Bottom rule
    draw.line([(44, H - 56), (W - 44, H - 56)], fill=TEXT3 + (60,), width=1)

    out = os.path.join(HERE, "og-headroom.png")
    img.save(out, "PNG")
    print(f"Saved {out}")


# ── og-auris.png ──────────────────────────────────────────────────────────────

def make_og_auris():
    img  = make_base()
    draw = ImageDraw.Draw(img)

    # App icon — left-aligned, vertically centred
    icon_size = 200
    icon_raw  = Image.open(os.path.join(HERE, "auris/icon.png")).convert("RGBA")
    icon_raw  = icon_raw.resize((icon_size, icon_size), Image.LANCZOS)
    icon_x    = 90
    icon_y    = (H - icon_size) // 2
    img.paste(icon_raw, (icon_x, icon_y), icon_raw)

    # Text column
    tx       = icon_x + icon_size + 58
    ty_start = H // 2 - 90

    # App name
    f_title = font("BricolageGrotesque-Bold.ttf", 96)
    draw.text((tx, ty_start), "Auris", font=f_title, fill=TEXT)

    # Thin separator line
    div_y = ty_start + 108
    draw.line([(tx, div_y), (tx + 480, div_y)], fill=TEXT3 + (180,), width=1)

    # Subtitle
    f_sub = font("InstrumentSans-Regular.ttf", 26)
    draw.text((tx, div_y + 18),
              "Real-time hearing dose meter for audio professionals",
              font=f_sub, fill=TEXT2)

    # Domain — bottom-right, quiet
    f_domain = font("Jura-Light.ttf", 20)
    domain   = "headroomstudio.dev"
    bbox     = draw.textbbox((0, 0), domain, font=f_domain)
    draw.text((W - (bbox[2] - bbox[0]) - 44, H - 44),
              domain, font=f_domain, fill=TEXT3)

    # Bottom rule
    draw.line([(44, H - 56), (W - 44, H - 56)], fill=TEXT3 + (60,), width=1)

    out = os.path.join(HERE, "auris/og.png")
    img.save(out, "PNG")
    print(f"Saved {out}")


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    make_og_lyra()
    make_og_headroom()
    make_og_auris()
    print("Done.")
