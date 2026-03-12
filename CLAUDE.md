# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for **Headroom**, an indie macOS software label. Currently showcases **Apollo Volume Control** — a menu bar utility for hardware volume control on Universal Audio interfaces.

**Stack:** Plain HTML + CSS, no build tools, no dependencies. Hosted on GitHub Pages with custom domain `headroomstudio.dev` via Cloudflare.

## Development

No build step required. Edit HTML/CSS files directly. To preview locally, open any `.html` file in a browser or use a simple local server:

```sh
python3 -m http.server 8000
```

## Site Structure

- `index.html` — Homepage with app grid
- `apollo-volume-control.html` — Apollo app detail page
- `apollo-volume-control-privacy.html` — Privacy policy
- `CNAME` — GitHub Pages custom domain config (`headroomstudio.dev`)

## Design System

All CSS is embedded in `<style>` tags within each HTML file. CSS variables:

- Background: `#0b0b0f` / Cards: `#111118`
- Text: `#eeeef6` / Accent (purple): `#7c84f6` / CTA (green): `#3ecf7c`
- Font: Inter (Google Fonts) with system fallback

Max widths: 960px on homepage, 720px on detail/privacy pages. Responsive via `clamp()` and CSS Grid.

## Adding a New App

1. Add an `.app-card` div to the grid in `index.html`
2. Create `your-app-name.html` (use `apollo-volume-control.html` as template)
3. Create `your-app-name-privacy.html` (use `apollo-volume-control-privacy.html` as template)
4. Wire up the "Learn more" button in the card to the new detail page

## External Services

- **Google Fonts** — Inter via CDN
- **Paddle** — Payment processor (referenced in privacy policies)
- **Cloudflare** — DNS for custom domain
