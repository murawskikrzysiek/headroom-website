# Headroom

Website for [headroomstudio.dev](https://headroomstudio.dev) — a small portfolio of macOS utilities.

## About

Headroom is an indie software label making focused tools for macOS. Current app: **Lyra** — a menu bar utility that adds F10/F11/F12 keyboard shortcuts for hardware volume control on Universal Audio Apollo interfaces.

## Stack

Plain HTML + CSS. No build step, no dependencies. Hosted on GitHub Pages with a custom domain on Cloudflare.

## Structure

```
headroom-website/
├── index.html              # Homepage — app card grid + About section
├── og-headroom.png         # Social sharing image for homepage
├── favicon.ico / favicon-32x32.png / apple-touch-icon.png
├── generate_og_images.py   # Regenerate OG images (requires Pillow)
├── CNAME                   # headroomstudio.dev
│
└── lyra/                   # Lyra app — all files self-contained
    ├── index.html
    ├── privacy.html
    ├── faq.html
    ├── appcast.xml
    ├── icon.png
    ├── og.png
    └── screenshot-*.png
```

## Adding an app

1. Create a new `your-app/` folder mirroring `lyra/`
2. Add a card to the grid in `index.html`
3. Add an OG image generator function to `generate_og_images.py`

## Local preview

```sh
python3 -m http.server 8000
```

## License

© Headroom. All rights reserved.
