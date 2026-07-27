# CLAUDE.md

Context for working on the headroom-website repository.

## Project Overview

Static website for **Headroom Studio** (headroomstudio.dev), Krzysiek's indie macOS software label. It serves marketing pages, guides, FAQs, API docs, release notes, a blog, and Sparkle appcast feeds for three shipping apps — **Lyra**, **Audita**, **Specula** — plus redirect stubs for **Auris** (renamed to Audita 2026-05-08; `auris/` pages redirect and its appcast points users at the rename).

**Stack:** Plain HTML + one shared stylesheet + a handful of vanilla JS helpers. No build step, no dependencies, nothing to install. Hosted on GitHub Pages with custom domain `headroomstudio.dev` via Cloudflare DNS (proxy **OFF** — DNS only, required for the GitHub Pages cert). Push to `main` deploys in ~1-2 min.

**Contact:** hello@headroomstudio.dev (iCloud Mail with custom domain).

App facts (features, versions, pricing) live in each app's repo `CLAUDE.md` — don't restate them here. Studio-wide invariants (appcast URLs, Lemon Squeezy, R2) live in `headroom/CLAUDE.md`.

## Repo Structure

```
headroom-website/
├── index.html              # Homepage - app rows + About + activity feed + newsletter
├── 404.html                # Standalone (embeds its own CSS; tokens mirror headroom.css §1)
├── headroom.css            # THE shared stylesheet (see Styling)
├── waveform.js             # Ambient animated signal band (auto-inits .waveform divs)
├── lightbox.js             # Shared click-to-zoom w/ prev-next; self-contained (injects own CSS)
├── faq-search.js           # Live search + category chips on the FAQ pages
├── newsletter.js           # Subscribe form → first-party Cloudflare Worker proxy
├── activity-feed.js        # "Recent" feed built from appcast.xml files + blog index
├── sitemap.xml             # Maintained BY HAND - add new pages
├── robots.txt              # Disallows appcasts + /assets/screens/
├── CNAME                   # headroomstudio.dev
├── favicon.ico / favicon-{16,32,48}x*.png / apple-touch-icon.png / headroom-mark*.svg
├── og-headroom.png         # OG image for homepage (1200×630)
│
├── lyra/                   # Per-app folder: index, faq, guide, api, privacy,
├── audita/                 #   releases, appcast.xml, icon.png, og.png, screenshots
├── specula/                #   (+ 9 use-case pages specula/{mastering,compare,...}.html
│                           #    + meter-demo.js, the live-meter demo for specula/index.html)
├── auris/                  # Frozen post-rename stubs - redirect to audita/
│
├── blog/                   # index.html, blog.css, feed.xml (RSS), one HTML per post
├── assets/screens/         # Unlisted screenshots for forum posts (see its README)
├── gen_app_banners/        # Node script: OG + landing thumbnails (see its README)
└── _newsletter-proxy/      # Cloudflare Worker on api.headroomstudio.dev (see its README)
```

## Styling

Three tiers — know which one you're editing:

1. **`headroom.css`** — shared by all marketing pages, FAQs, privacy pages, releases, and the blog. Numbered sections (§1 Tokens … §17 Responsive). §12 has the app-detail components, the "Marketing texture" block before §13 has `.statband`/`.stat`, `.term`, `.specs`/`.spec`, `.faq-acc`, and the signal-flow diagram kit (`.diagram` + `.dg-*` classes for inline SVG) — reuse these, don't re-invent. Each diagram figure holds two SVG renderings of the same flow, `.diagram__wide` and `.diagram__tall`; §17 swaps them at 640px, so edit both when changing a diagram (used on the three app index pages + the pairing blog post). The live-meter demo kit (`.mdemo` + in-SVG `.mdemo-*` classes) styles the BS.1770 demo on `specula/index.html`: the figure ships a **baked final state** (full SVG curves + readout values, so it reads complete without JS) and `specula/meter-demo.js` replays it live — after any DSP change, run the meter to the end in a browser and copy the finished `.mdemo__svg` polylines and readout values over the baked ones. Design-system brief: `headroom/DESIGN-SYSTEM.md`.
2. **`blog/blog.css`** — blog-only additions, loaded *after* headroom.css on blog pages.
3. **Embedded styles** — the guide and API pages are self-contained: they embed their own docs taxonomy (`.toc`, `.note`, `.screenshot-*`, `guide-section`, `prose`, `hr-rework`). `404.html` also embeds everything; its `:root` values mirror headroom.css §1 and must be kept in sync by hand.

Tokens (palette, radii, fonts) live in `headroom.css` §1 — read them there, don't trust docs to be current. Typography is the **system stack** (SF Pro via `-apple-system`, SF Mono via `ui-monospace`) — no webfont CDN, don't reintroduce one. **Glass chrome rule: glass is for floating chrome (sticky nav pill, chips, secondary buttons, control bars), content surfaces stay solid** — every glass element needs the `prefers-reduced-transparency` fallback (shared block at the bottom of headroom.css; embedded-style pages carry their own). The nav markup pattern is `<div class="container nav-shell"><nav class="nav">…</nav></div>` as a **direct child of `<body>`** — sticky binds to the parent box, so a nav inside a content container stops sticking the moment that container scrolls past; the body-level shell is what makes it pin for the whole page.

**Copy rules:** no em-dashes anywhere in user-facing output (spaced hyphens instead; the md→html guide mirror step converts them). Scrub all new copy against `headroom/claude-skills/ai-tell-scrub/SKILL.md`.

## Shared JS helpers

Each file's header comment documents its container contract — read it before wiring a page. All are plain script tags at the end of `<body>`, no modules, no build.

| File | What it does | Used on |
|---|---|---|
| `waveform.js` | ambient canvas band, auto-inits every `.waveform` | most pages |
| `lightbox.js` | click-to-zoom with prev/next; targets `.shot img`, `img.screenshot-full`, `.screenshot-row img`, `.figure img`; injects its own overlay + styles | every page with zoomable images — do NOT add per-page lightboxes |
| `faq-search.js` | search box + category chips over `.faq-group` markup | lyra + audita FAQ |
| `newsletter.js` | posts the subscribe form to `api.headroomstudio.dev/s/<list>` (Worker → MailerLite) with a Turnstile token | homepage, blog, app pages |
| `activity-feed.js` | merges appcast releases + blog posts into the `[data-feed]` container, newest first | homepage, app pages |
| `guide-toc.js` | sidebar-TOC upgrades for long guides: injects a fuzzy search field (titles fuzzy, body text substring, h3 deep-links) and scroll-spies the current section; wants `nav.toc[data-guide-toc]`; layout (sticky rail >=1100px, static card below) lives in the page's own CSS. Shell furniture - not part of the md mirror | all three guides + both API pages (a value on `data-guide-toc` overrides the search placeholder) |
| `specula/meter-demo.js` | live BS.1770-4 meter demo: synthesizes a deterministic 30 s program and meters it in JS (K-weighting, gated integrated, 4× true peak); auto-inits every `.mdemo`; under reduced motion stays static and hides Run | `specula/index.html` only |

## Guides mirror app repos

- `lyra/guide.html` mirrors `Lyra/USER-GUIDE.md`; `specula/guide.html` mirrors `Specula/USER-GUIDE.md`. **Edit the markdown in the app repo, then re-mirror.** The md sources use em-dashes; the mirror step converts them to spaced hyphens — preserve that. The masthead (h1/lede) is website furniture, not in the md — edit it HTML-side.
- `audita/guide.html` has **no markdown source** — edit the HTML directly.

## Releases and appcasts

Each app folder has `appcast.xml` (Sparkle feed, served at `headroomstudio.dev/<app>/appcast.xml` — update instructions in comments inside) and `releases.html` (human-readable notes). DMGs are hosted on Cloudflare R2 at `releases.headroomstudio.dev`, never in this repo. Release-day website work runs through the **release-cut** skill and the **website-updater** agent.

## OG / banner images

`gen_app_banners/` is a standalone Node script producing OG images (1200×630) and landing thumbnails in the house style, rendered at 2× for Retina. See its README for install/run. (The old `generate_og_images.py` is gone.)

## External services

- **GitHub Pages** — hosting; deploys on push to `main`
- **Cloudflare** — DNS (proxy OFF / DNS-only; turning it on breaks GitHub Pages TLS), R2 for DMGs, Workers for the newsletter proxy, Turnstile for form abuse protection, Web Analytics
- **Lemon Squeezy** — payment processor / license server for all apps (referenced in privacy pages and FAQs)
- **MailerLite** — newsletter backend, reached only server-side via the Worker (`_newsletter-proxy/README.md` explains why: content blockers kill direct MailerLite fetches, and their public form endpoint 403s Worker IPs, so the Worker uses the server API)
- **Sparkle** — macOS auto-update framework consuming the appcasts

## Adding a new app

1. Create `your-app/` mirroring an existing app folder (index, faq, privacy, releases, appcast.xml, icon, og)
2. Add the app row to the homepage grid and, if it should appear in the feed, to the `data-feed-apps` list
3. Generate the OG image + thumbnail with `gen_app_banners/`
4. Add every new page to `sitemap.xml` (hand-maintained)
5. Link `../headroom.css` and reuse its components; guides/API pages may embed their own styles per the existing pattern
6. Include the full favicon set (`favicon.ico` 48x48, svg, 32, 16, apple-touch) in `<head>`
7. **Add the Cloudflare Web Analytics snippet to the `<head>` of every new HTML page** (see Analytics). Currently on all 41 pages — keep it at 100%.

## Analytics

Every public-facing HTML page must include the Cloudflare Web Analytics snippet in its `<head>`. Paste this verbatim, just before `</head>`:

```html
    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "b17689e9a2d3478cb704287beb955f48"}'></script><!-- End Cloudflare Web Analytics -->
```

**Why JS Snippet mode** (not dashboard auto-injection): auto-injection needs the Cloudflare proxy on to rewrite HTML at the edge; our proxy is off (DNS-only, for GitHub Pages TLS), so the snippet must run client-side. Captures pageviews, uniques, referrers, top pages/devices/countries. No cookies, no PII, no GDPR banner. Dashboard: `dash.cloudflare.com` → Analytics & Logs → Web Analytics.

**Verifying:** after deploying a new page, visit it once and check the dashboard within ~5 min — a missing pageview means a missing or malformed snippet.

**Don't add Google Analytics or other heavy trackers** — cookie banner, page weight, wrong fit for the brand. If conversion goals are ever needed, use Plausible or Fathom instead.

## Key decisions

- **No build tools** — intentional; plain HTML/CSS is easy to maintain and fast to ship
- **One shared stylesheet** — pages moved off per-page embedded CSS to `headroom.css`; only guides/API/404 still embed styles, deliberately
- **One shared lightbox** — `lightbox.js` everywhere; inline copies were removed in the 2026-07 rework
- **System fonts + liquid-glass chrome** — 2026-07 design refresh: SF system stack (no webfonts), sticky glass nav on every page, glass on chips/badges/secondary buttons; periwinkle accent kept (it matches the app icons; the AI-default look was the Inter+violet+glow ensemble, not the hue)
- **Cloudflare proxy OFF** — GitHub Pages must see the A records directly for TLS
- **Per-app folder structure** — keeps root clean as apps accumulate
- **Auris pages stay up** — old links and the old appcast must keep resolving post-rename
- **`assets/screens/` is unlisted, not private** — hotlinkable for forum posts, excluded from sitemap + robots
