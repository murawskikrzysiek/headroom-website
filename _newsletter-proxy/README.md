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

**Abuse hardening.** Because the endpoint is public, every submission must carry a Cloudflare
Turnstile token that the Worker validates server-side via `siteverify`. A hidden `hp_url`
honeypot and a per-IP throttle sit in front of that check, and an edge rate-limit rule
(`newsletter-proxy-throttle`) caps bursts. No valid token, no MailerLite call, so the form
cannot be used as an open relay to spray confirmation emails at strangers.

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

1. **API token.** MailerLite dashboard -> **Integrations** -> **API** -> generate a token.
2. **Double opt-in for API.** MailerLite -> **Account settings** -> **Subscribe settings**
   -> turn ON **"Double opt-in for API and integrations."** With it on, everyone added via
   this Worker gets a confirmation email and stays *unconfirmed* until they click. This keeps
   the site's "check your inbox" message accurate and means the public endpoint can only ever
   send a confirmation email, never subscribe someone outright.
3. **Store the MailerLite token as a Worker secret** (it is never committed or shared):
   ```sh
   cd _newsletter-proxy
   wrangler secret put MAILERLITE_TOKEN     # paste the token at the prompt
   ```
4. **Turnstile widget + secret.** Cloudflare dashboard -> **Turnstile** -> **Add widget**
   (hostnames `headroomstudio.dev` and `www.headroomstudio.dev`; widget mode **Managed**). The
   widget gives a **Site key** (public) and a **Secret key**. Put the Site key into the
   `data-sitekey` attribute on every `.nl-form` Turnstile widget, and store the Secret key as a
   second Worker secret:
   ```sh
   wrangler secret put TURNSTILE_SECRET     # paste the Turnstile secret key
   ```
   The Worker validates every submission against Turnstile `siteverify` server-side and returns
   `not_configured` if either secret is missing.
5. **Fill the group ids.** List your groups:
   ```sh
   curl -H "Authorization: Bearer YOUR_TOKEN" "https://connect.mailerlite.com/api/groups"
   ```
   then put the right ids into the `GROUPS` map at the top of `worker.js` (`main` / `lyra` /
   `audita`). Only those three keys are reachable; the Worker can never target any other group.

## Deploy

Pick **one** path below, CLI or dashboard. They produce the same result (Worker published +
`api.headroomstudio.dev` custom domain). You do not need both.

### Option A: wrangler (CLI)

```sh
npm install -g wrangler        # if not already installed
cd _newsletter-proxy
wrangler login                 # authorize the Headroom Cloudflare account
wrangler deploy                # publishes the Worker + creates the api. custom domain
```

`wrangler deploy` reads `wrangler.toml`, publishes `worker.js`, and creates the proxied
DNS record for `api.headroomstudio.dev`. First propagation of the cert can take a couple
of minutes. (Both secrets, `MAILERLITE_TOKEN` and `TURNSTILE_SECRET`, persist across deploys;
set them once.)

### Option B: dashboard (no CLI)

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Worker**.
2. Name it `headroom-newsletter`, **Deploy**, then **Edit code** and paste `worker.js`. Save & deploy.
3. That Worker -> **Settings** -> **Variables and Secrets** -> add two **secrets**:
   `MAILERLITE_TOKEN` and `TURNSTILE_SECRET`.
4. That Worker -> **Settings** -> **Domains & Routes** -> **Add** -> **Custom domain** ->
   `api.headroomstudio.dev`. Cloudflare creates the proxied DNS record for you.

## Verify

A plain POST with no Turnstile token is now rejected (that is the whole point):

```sh
# Should print {"success":false,"error":"challenge_failed"}  (no token)
curl -X POST "https://api.headroomstudio.dev/s/main" --data "email=you+test@example.com"

# Preflight should still be 204 with the CORS headers
curl -i -X OPTIONS "https://api.headroomstudio.dev/s/main" \
  -H "Origin: https://headroomstudio.dev" \
  -H "Access-Control-Request-Method: POST"
```

A filled honeypot returns a fake success and never subscribes:

```sh
# 200 {"success":true} but the address is NOT added
curl -X POST "https://api.headroomstudio.dev/s/main" \
  --data "email=bot@example.com" --data "hp_url=anything"
```

To exercise the full success path from the command line, deploy with Cloudflare's Turnstile
**test keys** (always-pass site key `1x00000000000000000000AA`, always-pass secret
`1x0000000000000000000000000000000AA`) and post a dummy token:

```sh
# With the always-pass test secret set, this prints {"success":true}
curl -X POST "https://api.headroomstudio.dev/s/main" \
  --data "email=you+test@example.com" \
  --data "cf-turnstile-response=XXXX.DUMMY.TOKEN.XXXX"
```

Swap the real keys back before shipping. Then load the site over http (local server or the
deployed page, **not** `file://`), submit the form with a content blocker on, and confirm the
widget renders and the subscribe succeeds.

## Group allowlist

| `<list>` | MailerLite group | Group id              | Used on                              |
|----------|------------------|-----------------------|--------------------------------------|
| `main`   | `all`            | `187189295027586574`  | homepage, blog index, all blog posts |
| `lyra`   | `lyra`           | `187189284799775857`  | `lyra/index.html`                    |
| `audita` | `audita`         | `187189276845279146`  | `audita/index.html`                  |

If a group id ever changes, update `GROUPS` in `worker.js` and redeploy.

## Rate limiting

Two per-IP layers, plus the Turnstile gate that handles the rest:

1. **In-Worker, per IP** via the Cache API: `RL_LIMIT` requests per `RL_WINDOW` seconds
   (default 5 / 60). Approximate (per-colo, non-atomic) but needs no binding and works on the
   Free plan. Over the limit it returns HTTP 429 `{"error":"rate_limited"}`. Tune the two
   constants at the top of `worker.js`.
2. **Edge rate-limit rule** (`newsletter-proxy-throttle`): **Security -> Security rules ->
   Create rule -> Rate limiting rule**, expression
   `(http.host eq "api.headroomstudio.dev" and starts_with(http.request.uri.path, "/s") and http.request.method eq "POST")`,
   5 requests / 1 minute per IP, action **Block**, duration 1 hour. The Free plan allows one
   such rule. Do not use a challenge action on this path: the form submits via a background
   `fetch`, which cannot solve an interstitial challenge.

Both per-IP layers blunt concentrated bursts. The Turnstile `siteverify` gate in the Worker is
what stops the distributed case (a botnet rotating IPs, each staying under the limit). Double
opt-in and MailerLite's one-confirmation-per-email-per-24h remain the final backstops.

## Notes

- Secrets live only as Worker secrets (`MAILERLITE_TOKEN`, `TURNSTILE_SECRET`), never in this repo.
- Rolling the Turnstile change out to the live form: push the **site** first (the forms then
  carry the widget and send a token; the old Worker simply ignores the extra fields, so signups
  keep working), then `wrangler deploy` the Worker to switch on enforcement. This order avoids a
  window where the Worker rejects tokenless posts the forms are not yet sending.
- If JS or the Turnstile script is blocked, the form falls back to a graceful
  "email hello@headroomstudio.dev" message instead of failing silently.
