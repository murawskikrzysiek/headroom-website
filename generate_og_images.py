"""
generate_og_images.py
Generates og:image social sharing cards for headroomstudio.dev.

One unified design across all apps:
    centered icon  →  app name  →  tagline  →  feature row  →  footer

Typography is Inter (loaded from headroom-website/fonts/) to match the
site's Inter Google Fonts stack.

Usage:
    python3 generate_og_images.py

Outputs:
    og-headroom.png      — 1200×630 (homepage)
    lyra/og.png          — 1200×630
    audita/og.png        — 1200×630
    specula/og.png       — 1200×630

The same renderer drives the Lemon Squeezy banners; see make_ls.py.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

HERE  = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")

# ── Brand palette (mirrors headroomstudio.dev CSS variables) ──────────────────
BG     = (11,  11,  15)     # --bg
BG_2   = (17,  17,  24)     # --bg-card
ACCENT = (124, 132, 246)    # --accent  #7c84f6
TEXT   = (238, 238, 246)    # --text
TEXT2  = (110, 110, 144)    # --text-2
TEXT3  = (58,  58,  82)     # --text-3

OG_SIZE = (1200, 630)
LS_SIZE = (1600, 1200)


# ── Font helpers ──────────────────────────────────────────────────────────────

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


# ── App content ───────────────────────────────────────────────────────────────
# Tagline + 3 short feature labels per app. Copy lifted from the homepage
# cards and tightened for narrow horizontal space.

APPS = {
    "lyra": {
        "name":     "Lyra",
        "icon":     "lyra/icon.png",
        "tagline":  "F-key volume control for Universal Audio Apollo",
        "features": ["F10  ·  F11  ·  F12", "Menu bar app", "UA Mixer Engine"],
        "badge":    "macOS 12+",
        "out_og":   "lyra/og.png",
        "out_ls":   "lyra/ls-thumbnail.png",
    },
    "audita": {
        "name":     "Audita",
        "icon":     "audita/icon.png",
        "tagline":  "Real-time SPL meter & hearing dose tracker",
        "features": ["Live SPL", "NIOSH dose", "Lyra pairing"],
        "badge":    "macOS 14+",
        "out_og":   "audita/og.png",
        "out_ls":   "audita/ls-thumbnail.png",
    },
    "specula": {
        "name":     "Specula",
        "icon":     "specula/icon.png",
        "tagline":  "Pro audio analysis — loudness, FFT, compare & edit",
        "features": ["EBU R128 loudness", "FFT + spectrogram", "Compare up to 6"],
        "badge":    "macOS 14+",
        "out_og":   "specula/og.png",
        "out_ls":   "specula/ls-thumbnail.png",
    },
}


# ── Drawing primitives ────────────────────────────────────────────────────────

def make_base(W, H):
    """Dark background with a soft accent halo near top-centre."""
    img = Image.new("RGB", (W, H), BG)
    d   = ImageDraw.Draw(img, "RGBA")
    cx, cy = W // 2, int(H * 0.42)
    r_max = int(min(W, H) * 0.55)
    for r in range(r_max, 0, -2):
        t = r / r_max
        a = int(14 * (1 - t) ** 2.4)
        col = (
            min(255, BG[0] + int((ACCENT[0] - BG[0]) * (1 - t) * 0.18) + a // 2),
            min(255, BG[1] + int((ACCENT[1] - BG[1]) * (1 - t) * 0.18) + a // 2),
            min(255, BG[2] + int((ACCENT[2] - BG[2]) * (1 - t) * 0.18) + a // 2),
        )
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    return img


def paste_icon(img, icon_path, size, cx, cy):
    """Centred icon at (cx, cy). Subtle drop shadow for depth."""
    icon = Image.open(os.path.join(HERE, icon_path)).convert("RGBA")
    icon = icon.resize((size, size), Image.LANCZOS)

    shadow = Image.new("RGBA", (size + 80, size + 80), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    s_draw.rounded_rectangle(
        [40, 50, size + 40, size + 50],
        radius=int(size * 0.22),
        fill=(0, 0, 0, 130),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    sx = cx - (size + 80) // 2
    sy = cy - (size + 80) // 2
    img.paste(shadow, (sx, sy), shadow)

    img.paste(icon, (cx - size // 2, cy - size // 2), icon)


def centered_text(draw, y, text, fnt, fill, W):
    bb = draw.textbbox((0, 0), text, font=fnt)
    w  = bb[2] - bb[0]
    x  = (W - w) // 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return (x, y, x + w, y + (bb[3] - bb[1]))


def draw_feature_row(draw, y, features, fnt_label, W, fill_label):
    """Three labels separated by middle-dot bullets, centred."""
    sep = "  ·  "
    line = sep.join(features)
    bb = draw.textbbox((0, 0), line, font=fnt_label)
    text_w = bb[2] - bb[0]
    line_h = bb[3] - bb[1]

    # Render piece by piece so we can colour the separators differently
    x = (W - text_w) // 2
    for i, feat in enumerate(features):
        draw.text((x, y), feat, font=fnt_label, fill=fill_label)
        x += draw.textbbox((0, 0), feat, font=fnt_label)[2]
        if i < len(features) - 1:
            draw.text((x, y), sep, font=fnt_label, fill=TEXT3)
            x += draw.textbbox((0, 0), sep, font=fnt_label)[2]
    return line_h


def draw_footer(draw, W, H, margin):
    """Bottom rule + studio wordmark (left) + domain (right)."""
    draw.line([(margin, H - int(H * 0.105)), (W - margin, H - int(H * 0.105))],
              fill=TEXT3 + (110,), width=1)

    f_foot = font("Inter-Medium.ttf", int(H * 0.034))
    studio = "Headroom Studio"
    domain = "headroomstudio.dev"
    foot_y = H - int(H * 0.085)
    draw.text((margin, foot_y), studio, font=f_foot, fill=TEXT3)
    db = draw.textbbox((0, 0), domain, font=f_foot)
    draw.text((W - (db[2] - db[0]) - margin, foot_y),
              domain, font=f_foot, fill=TEXT3)


# ── Unified app card renderer (drives both OG and LS) ─────────────────────────

def render_app_card(cfg, size, with_badge=False):
    """
    Centred composition:
        icon → name → divider → tagline → features → (optional badge) → footer

    `size` is (W, H). All vertical metrics derive from H, so the same code
    renders 1200×630 OG and 1600×1200 LS without separate layouts.
    """
    W, H = size
    img  = make_base(W, H)
    draw = ImageDraw.Draw(img, "RGBA")

    # Vertical rhythm
    icon_size  = int(H * 0.28)
    icon_cy    = int(H * 0.30)
    name_size  = int(H * 0.155)
    tagline_sz = int(H * 0.042)
    feat_sz    = int(H * 0.034)

    # Icon
    paste_icon(img, cfg["icon"], icon_size, W // 2, icon_cy)

    # App name
    f_name = font("InterDisplay-SemiBold.ttf", name_size)
    name_y = icon_cy + icon_size // 2 + int(H * 0.034)
    centered_text(draw, name_y, cfg["name"], f_name, TEXT, W)
    # Use font size, not textbbox — Pillow's bbox can under-report descenders
    # on InterDisplay and the divider ends up cutting through the "y"/"p" tails.
    name_box_bottom = name_y + int(name_size * 1.10)

    # Hairline divider, comfortably below descenders
    div_y    = name_box_bottom + int(H * 0.020)
    div_half = int(W * 0.105)
    draw.line(
        [(W // 2 - div_half, div_y), (W // 2 + div_half, div_y)],
        fill=TEXT3 + (200,), width=1,
    )
    # Centre accent tick on the divider
    draw.rectangle(
        [W // 2 - 14, div_y - 1, W // 2 + 14, div_y + 1],
        fill=ACCENT + (220,),
    )

    # Tagline
    f_tag   = font("Inter-Regular.ttf", tagline_sz)
    tag_y   = div_y + int(H * 0.024)
    tbb     = centered_text(draw, tag_y, cfg["tagline"], f_tag, TEXT2, W)

    # Feature row
    f_feat = font("Inter-Medium.ttf", feat_sz)
    feat_y = tbb[3] + int(H * 0.045)
    draw_feature_row(draw, feat_y, cfg["features"], f_feat, W, TEXT)

    # Optional macOS badge (LS only — there is space)
    if with_badge:
        f_badge = font("Inter-Medium.ttf", int(H * 0.022))
        bb = draw.textbbox((0, 0), cfg["badge"], font=f_badge)
        bw = (bb[2] - bb[0]) + int(H * 0.024)
        bh = int(H * 0.040)
        bx = (W - bw) // 2
        by = feat_y + int(H * 0.075)
        draw.rounded_rectangle(
            [bx, by, bx + bw, by + bh],
            radius=int(H * 0.008),
            fill=BG_2,
            outline=TEXT3 + (220,),
            width=1,
        )
        tx = bx + (bw - (bb[2] - bb[0])) // 2
        ty = by + (bh - (bb[3] - bb[1])) // 2 - int(H * 0.004)
        draw.text((tx, ty), cfg["badge"], font=f_badge, fill=TEXT2)

    # Footer
    margin = int(W * 0.04)
    draw_footer(draw, W, H, margin)

    return img


# ── Homepage renderer (no app icon — wordmark only) ───────────────────────────

def render_homepage(size):
    W, H = size
    img  = make_base(W, H)
    draw = ImageDraw.Draw(img, "RGBA")

    # Studio mark — the Headroom squircle (apple-touch-icon)
    mark_size = int(H * 0.24)
    mark_cy   = int(H * 0.20)
    paste_icon(img, "apple-touch-icon.png", mark_size, W // 2, mark_cy)

    # Wordmark "Headroom"
    name_size = int(H * 0.135)
    f_logo    = font("InterDisplay-Bold.ttf", name_size)
    head_w    = draw.textbbox((0, 0), "Head", font=f_logo)[2]
    room_w    = draw.textbbox((0, 0), "room", font=f_logo)[2]
    total     = head_w + room_w
    logo_x    = (W - total) // 2
    logo_y    = mark_cy + mark_size // 2 + int(H * 0.040)
    draw.text((logo_x,            logo_y), "Head", font=f_logo, fill=TEXT)
    draw.text((logo_x + head_w,   logo_y), "room", font=f_logo, fill=ACCENT)

    # Hairline divider
    div_y = logo_y + int(name_size * 1.15)
    div_half = int(W * 0.085)
    draw.line(
        [(W // 2 - div_half, div_y), (W // 2 + div_half, div_y)],
        fill=TEXT3 + (200,), width=1,
    )
    draw.rectangle(
        [W // 2 - 14, div_y - 1, W // 2 + 14, div_y + 1],
        fill=ACCENT + (220,),
    )

    # Tagline
    f_tag = font("Inter-Regular.ttf", int(H * 0.052))
    tag_y = div_y + int(H * 0.030)
    tbb   = centered_text(draw, tag_y, "Small tools. Serious work.", f_tag, TEXT2, W)

    # App row as the "features"
    apps_y = tbb[3] + int(H * 0.060)
    f_apps = font("Inter-SemiBold.ttf", int(H * 0.038))
    draw_feature_row(draw, apps_y, ["Lyra", "Audita", "Specula"], f_apps, W, TEXT)

    # Footer
    margin = int(W * 0.04)
    draw_footer(draw, W, H, margin)

    return img


# ── Public entry points ───────────────────────────────────────────────────────

def make_og(app_key):
    cfg = APPS[app_key]
    img = render_app_card(cfg, OG_SIZE, with_badge=False)
    out = os.path.join(HERE, cfg["out_og"])
    img.save(out, "PNG")
    print(f"Saved {out}  ({OG_SIZE[0]}×{OG_SIZE[1]})")


def make_og_homepage():
    img = render_homepage(OG_SIZE)
    out = os.path.join(HERE, "og-headroom.png")
    img.save(out, "PNG")
    print(f"Saved {out}  ({OG_SIZE[0]}×{OG_SIZE[1]})")


if __name__ == "__main__":
    make_og_homepage()
    for key in ("lyra", "audita", "specula"):
        make_og(key)
    print("Done.")
