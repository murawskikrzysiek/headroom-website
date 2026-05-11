"""
make_ls.py
Lemon Squeezy product cover images — 1600×1200 — for all Headroom apps.

Reuses the unified renderer from generate_og_images.py so the LS banner
and OG card share one design system. The badge (macOS version) is enabled
here because the 4:3 LS canvas has space for it; OG cards omit it.

Usage:
    python3 make_ls.py [lyra|audita|specula|all]

Outputs:
    lyra/ls-thumbnail.png
    audita/ls-thumbnail.png
    specula/ls-thumbnail.png

Supersedes the old make_ls_lyra.py / make_ls_audita.py / make_ls_auris.py.
"""

import os
import sys

from generate_og_images import APPS, LS_SIZE, render_app_card

HERE = os.path.dirname(os.path.abspath(__file__))


def make_ls(app_key):
    cfg = APPS[app_key]
    img = render_app_card(cfg, LS_SIZE, with_badge=True)
    out = os.path.join(HERE, cfg["out_ls"])
    img.save(out, "PNG")
    print(f"Saved {out}  ({LS_SIZE[0]}×{LS_SIZE[1]})")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    keys = list(APPS) if target == "all" else [target]
    for k in keys:
        make_ls(k)
    print("Done.")
