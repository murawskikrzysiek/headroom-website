# Headroom

Website for [headroomstudio.dev](https://headroomstudio.dev) — a small portfolio of macOS audio tools.

## About

Headroom Studio is an indie software label making focused tools for macOS: **Lyra** (Apollo monitor control from the menu bar), **Audita** (SPL and hearing-dose meter), and **Specula** (audio analysis and repair).

## Stack

Plain HTML + CSS + a few vanilla JS helpers. No build step, no dependencies. Hosted on GitHub Pages with a custom domain on Cloudflare.

## Structure

```
headroom-website/
├── index.html          # Homepage
├── headroom.css        # Shared stylesheet
├── *.js                # Shared helpers (waveform, lightbox, FAQ search, newsletter, feed)
├── lyra/               # Per-app folder: pages, appcast.xml, images
├── audita/
├── specula/
├── auris/              # Redirect stubs (Auris was renamed to Audita)
├── blog/
└── CNAME               # headroomstudio.dev
```

## Local preview

```sh
python3 -m http.server 8000
```

## License

© Headroom Studio. All rights reserved.
