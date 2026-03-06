# Headroom

Website for [headroomstudio.dev](https://headroomstudio.dev) — a small portfolio of macOS utilities.

## About

Headroom is an indie software label making focused tools for macOS. The first app is **Apollo Volume Control** — a menu bar utility that adds F10/F11/F12 keyboard shortcuts for hardware volume control on Universal Audio interfaces.

## Stack

Plain HTML + CSS. No build step, no dependencies. Hosted on GitHub Pages with a custom domain on Cloudflare.

## Structure

```
headroom-website/
├── index.html                   # Homepage — app card grid
├── apollo-volume-control.html   # Per-app detail page
└── README.md
```

## Adding an app

1. Add a card to the grid in `index.html`
2. Create a new `your-app-name.html` detail page
3. Link the card's "Learn more" button to the new page

## License

© Headroom. All rights reserved.
