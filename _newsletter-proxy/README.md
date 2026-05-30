# Newsletter proxy (Cloudflare Worker)

A first-party subscribe endpoint so the custom newsletter form keeps working when a
visitor runs a content blocker. 1Blocker, uBlock Origin, Brave, and Firefox ETP all
block `assets.mailerlite.com`, which kills a direct browser `fetch` to MailerLite. This
Worker lives on `api.headroomstudio.dev` (which no blocker touches) and subscribes the
visitor **server-side**.

It uses MailerLite's **server API** (`connect.mailerlite.com`), not the public form
endpoint: that form endpoint returns **HTTP 403** to Cloudflare Workers egress IPs (a
bot/IP filter). The server API authenticates with a token and is built for server-to-server
calls, so it is not IP-filtered.

The site forms post to `https://api.headroomstudio.dev/s/<list>` where `<list>` is
`main`, `lyra`, or `audita`. The Worker maps each to the right MailerLite group id.

> This folder is named with a leading `_` so Jekyll (GitHub Pages) leaves it out of the
> published site. It is deploy-only; it is never served from headroomstudio.dev.

## Why a subdomain (and not headroomstudio.dev/api/...)

Workers run on Cloudflare's proxy layer (orange cloud). The apex + `www` records are
**grey-cloud / DNS-only**, required for GitHub Pages to issue its TLS cert, so a Worker
cannot sit on the apex without breaking Pages. A separate `api.` subdomain can be
orange-cloud on its own without touching the Pages records.

## Setup (one-time)

1. **API token** — MailerLite dashboard -> **Integrations** -> **API** -> generate a token.
2. **Double opt-in for API** — MailerLite -> **Account settings** -> **Subscribe settings**
   -> turn ON **"Double opt-in for API and integrations."** With it on, everyone added via
   this Worker gets a confirmation email and stays *unconfirmed* until they click. This keeps
   the site's "check your inbox" message accurate and means the public endpoint can only ever
   send a confirmation email, never subscribe someone outright.
3. **Store the token as a Worker secret** (it is never committed or shared):
   ```sh
   cd _newsletter-proxy
   wrangler secret put MAILERLITE_TOKEN     # paste the token at the prompt
   ```
4. **Fill the group ids.** List your groups:
   ```sh
   curl -H "Authorization: Bearer YOUR_TOKEN" "https://connect.mailerlite.com/api/groups"
   ```
   then put the right ids into the `GROUPS` map at the top of `worker.js` (`main` / `lyra` /
   `audita`). Only those three keys are reachable; the Worker can never target any other group.

## Deploy

Pick **one** path below, CLI or dashboard. They produce the same result (Worker published +
`api.headroomstudio.dev` custom domain). You do not need both.

### Option A — wrangler (CLI)

```sh
npm install -g wrangler        # if not already installed
cd _newsletter-proxy
wrangler login                 # authorize the Headroom Cloudflare account
wrangler deploy                # publishes the Worker + creates the api. custom domain
```

`wrangler deploy` reads `wrangler.toml`, publishes `worker.js`, and creates the proxied
DNS record for `api.headroomstudio.dev`. First propagation of the cert can take a couple
of minutes. (The `MAILERLITE_TOKEN` secret persists across deploys; set it once.)

### Option B — dashboard (no CLI)

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Worker**.
2. Name it `headroom-newsletter`, **Deploy**, then **Edit code** and paste `worker.js`. Save & deploy.
3. That Worker -> **Settings** -> **Variables and Secrets** -> add a **secret** named
   `MAILERLITE_TOKEN` with the token value.
4. That Worker -> **Settings** -> **Domains & Routes** -> **Add** -> **Custom domain** ->
   `api.headroomstudio.dev`. Cloudflare creates the proxied DNS record for you.

## Verify

```sh
# Should print {"success":true}
curl -X POST "https://api.headroomstudio.dev/s/main" --data "email=you+test@example.com"

# Preflight should be 204 with the CORS headers
curl -i -X OPTIONS "https://api.headroomstudio.dev/s/main" \
  -H "Origin: https://headroomstudio.dev" \
  -H "Access-Control-Request-Method: POST"
```

Then load the site over http (the local server or the deployed page, **not** `file://`),
submit the form with a content blocker on, and confirm it succeeds.

## Group allowlist

| `<list>` | MailerLite group | Group id              | Used on                              |
|----------|------------------|-----------------------|--------------------------------------|
| `main`   | `all`            | `187189295027586574`  | homepage, blog index, all blog posts |
| `lyra`   | `lyra`           | `187189284799775857`  | `lyra/index.html`                    |
| `audita` | `audita`         | `187189276845279146`  | `audita/index.html`                  |

If a group id ever changes, update `GROUPS` in `worker.js` and redeploy.

## Rate limiting (recommended at launch)

Add a Cloudflare Rate Limiting rule so the endpoint can't be used to bomb a victim with
double opt-in confirmation emails (anyone can POST an arbitrary address). Double opt-in
already means a victim is never subscribed outright, but a rule blunts the email volume.

Dashboard -> zone `headroomstudio.dev` -> **Security** -> **WAF** -> **Rate limiting rules**
-> **Create rule**:
- When incoming requests match: `Hostname` equals `api.headroomstudio.dev`
- Rate: **5 requests per 1 minute**, counting by **IP**
- Action: **Managed Challenge** (or Block)

## Notes

- The token lives only as a Worker secret (`MAILERLITE_TOKEN`), never in this repo.
- The site is on a feature branch and does not deploy until merged to `main`. **Deploy this
  Worker before merging** so the live forms have an endpoint. Until then the form shows a
  graceful "email hello@headroomstudio.dev" fallback instead of failing silently.
