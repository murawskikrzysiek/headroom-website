# Headroom — Website

Static site for [headroomstudio.dev](https://headroomstudio.dev) — portfolio of macOS utilities.

## Stack

Plain HTML + CSS. Zero dependencies, zero build step. Hosted on GitHub Pages with custom domain.

---

## Deploy to GitHub Pages

### 1. Create a repo

```bash
git init
git add .
git commit -m "Initial site"
gh repo create headroom-website --public --push --source=.
```

### 2. Enable GitHub Pages

1. Go to repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `(root)`
4. Save

Site will be live at `https://yourusername.github.io/headroom-website/` within ~1 minute.

### 3. Connect your own domain

1. Buy domain — recommended registrars:
   - **Porkbun** — cheapest, great UX (~$10/yr for `.app`, ~$12/yr for `.studio`)
   - **Cloudflare Registrar** — at-cost pricing, best if you use Cloudflare DNS
   - **Namecheap** — solid fallback

2. In GitHub Pages settings → **Custom domain** → enter `headroomstudio.dev` → Save

3. At your registrar, add these DNS records:

   **A records** (apex domain `headroomstudio.dev`):
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   **CNAME record** (for `www` subdomain):
   ```
   www  →  yourusername.github.io
   ```

4. Check "Enforce HTTPS" in GitHub Pages settings (available after DNS propagates, ~10–30 min)

---

## Adding a new app

Open `index.html` and duplicate the app card block inside `.apps-grid`:

```html
<div class="app-card">
    <div class="card-top">
        <div class="app-icon">
            <!-- Replace with your app's SVG icon -->
        </div>
        <div>
            <div class="app-name">Your App Name</div>
            <div class="app-desc">One or two sentences about what it does.</div>
        </div>
    </div>

    <div class="card-features">
        <span class="feature">Key feature one</span>
        <span class="feature">Key feature two</span>
        <span class="feature">Key feature three</span>
    </div>

    <div class="card-footer">
        <div class="badges">
            <span class="badge badge-macos">macOS</span>
        </div>
        <span class="price">$X.XX</span>
    </div>

    <a href="YOUR_PADDLE_CHECKOUT_LINK" class="btn btn-primary">
        Buy — $X.XX
    </a>
</div>
```

When the app is ready to sell, replace `class="btn btn-muted"` with `class="btn btn-primary"` and set `href` to the Paddle checkout URL.

---

## Connecting Paddle checkout

1. In Paddle dashboard: **Products → New Product** → set price, upload icon
2. **Checkout → Generate checkout link**
3. Paste link as `href` on the app card button
4. Change button class from `btn-muted` to `btn-primary`

---

## File structure

```
headroom-website/
├── index.html        # Main page — edit this for content changes
├── privacy.html      # Add this when needed (Paddle requires a privacy policy)
└── README.md
```

---

## Domain options

| Domain | Price/yr | Notes |
|--------|----------|-------|
| headroomstudio.dev | ~$14 | Clean, .app is Google-managed, HTTPS required |
| headroomstudio.dev | ~$18 | Nice for creative tools |
| headroom.dev | ~$12 | More developer-facing |

Recommended: **headroomstudio.dev**
