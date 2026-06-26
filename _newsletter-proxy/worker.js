/*
 * Headroom Studio newsletter proxy (Cloudflare Worker)
 * ----------------------------------------------------
 * Deployed at https://api.headroomstudio.dev/s/<list>
 *
 * Pipeline per request:
 *   POST -> resolve list -> honeypot -> email -> per-IP throttle
 *        -> Turnstile siteverify (server-side) -> MailerLite server API (double opt-in)
 *
 * The Turnstile siteverify call is the gate bots cannot fake: the browser widget
 * mints a single-use token and only Cloudflare can confirm it. No valid token,
 * no MailerLite call, so the relay can no longer spray confirmation emails.
 *
 * Why the API and not the form endpoint: MailerLite's public form endpoint
 * (assets.mailerlite.com/jsonp/.../subscribe) returns HTTP 403 to Cloudflare Workers
 * egress IPs (bot/IP filter). The official server API (connect.mailerlite.com) is
 * built for server-to-server calls and authenticates with a token, so it is not
 * IP-filtered.
 *
 * Secrets (set once, never committed):
 *   wrangler secret put MAILERLITE_TOKEN     # MailerLite API token
 *   wrangler secret put TURNSTILE_SECRET     # Turnstile widget secret key
 *
 * Double opt-in stays ON in MailerLite (Account settings -> Subscribe settings ->
 * "Double opt-in for API and integrations"), so even a passed request only ever
 * sends one confirmation email and never subscribes a victim outright.
 */

// Allowlist: path key -> MailerLite group id. Nothing else can be targeted.
const GROUPS = {
  main:   '187189295027586574', // "all" - general studio newsletter
  lyra:   '187189284799775857', // "lyra"
  audita: '187189276845279146', // "audita"
};

const ALLOWED_ORIGINS = [
  'https://headroomstudio.dev',
  'https://www.headroomstudio.dev',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

// Hidden decoy field. Real users never see it (CSS off-screen, tabindex -1,
// autocomplete off). A non-empty value means a bot.
const HONEYPOT_FIELD = 'hp_url';

// Turnstile binds each token to this action string (set as data-action on the widget).
const TURNSTILE_ACTION = 'subscribe';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://headroomstudio.dev';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// Per-IP throttle via the Cache API. Per-colo and non-atomic, so it is approximate:
// a backstop against concentrated bursts, not the security boundary. The real gate is
// the Turnstile siteverify below; the dashboard rate-limit rule adds an edge layer.
const RL_LIMIT = 5;    // max subscribe attempts ...
const RL_WINDOW = 60;  // ... per this many seconds, per IP

async function rateLimited(ip) {
  const cache = (typeof caches !== 'undefined' && caches.default) ? caches.default : null;
  if (!cache) return false; // no Cache API (e.g. unit tests) -> don't throttle
  const key = new Request('https://ratelimit.internal/' + encodeURIComponent(ip));
  const now = Date.now();
  let count = 0;
  let resetAt = now + RL_WINDOW * 1000;
  const hit = await cache.match(key);
  if (hit) {
    count = parseInt(hit.headers.get('x-rl-count') || '0', 10) || 0;
    resetAt = parseInt(hit.headers.get('x-rl-reset') || '0', 10) || resetAt;
    if (resetAt <= now) { count = 0; resetAt = now + RL_WINDOW * 1000; } // window rolled over
  }
  count += 1;
  const ttl = Math.max(1, Math.ceil((resetAt - now) / 1000));
  await cache.put(key, new Response('', {
    headers: { 'x-rl-count': String(count), 'x-rl-reset': String(resetAt), 'Cache-Control': 'max-age=' + ttl },
  }));
  return count > RL_LIMIT;
}

// Server-side Turnstile validation. Returns true only if Cloudflare confirms the token.
async function verifyTurnstile(token, ip, secret) {
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await r.json().catch(() => null);
    if (!data || data.success !== true) return false;
    // Bind the token to our widget action. Tokens are single-use and ~300s lived,
    // so siteverify also rejects replayed tokens.
    if (TURNSTILE_ACTION && data.action && data.action !== TURNSTILE_ACTION) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return json({ success: false, error: 'method_not_allowed' }, 405, headers);
    }

    // Cheap pre-filter: a present Origin must be one of ours. Bypassable by non-browser
    // clients (they can forge or omit it), so this is defense-in-depth, not the gate.
    // Missing Origin is allowed (some privacy tools strip it); Turnstile is the real check.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ success: false, error: 'bad_origin' }, 403, headers);
    }

    // /s/main -> "main", /s/lyra -> "lyra", bare /s -> "main"
    const key = url.pathname.replace(/^\/+s(?:\/|$)/, '').replace(/\/+$/, '') || 'main';
    const groupId = own(GROUPS, key) ? GROUPS[key] : undefined;
    if (!groupId) {
      return json({ success: false, error: 'unknown_list' }, 400, headers);
    }

    const mlToken = env && env.MAILERLITE_TOKEN;
    const tsSecret = env && env.TURNSTILE_SECRET;
    if (!mlToken || !tsSecret) {
      return json({ success: false, error: 'not_configured' }, 500, headers);
    }

    // Read email, Turnstile token, and honeypot from form-urlencoded (our JS + native
    // posts) or JSON.
    let email = '', tsToken = '', honeypot = '';
    const ct = request.headers.get('Content-Type') || '';
    try {
      if (ct.indexOf('application/json') !== -1) {
        const b = await request.json();
        email = String((b && b.email) || '').trim();
        tsToken = String((b && b['cf-turnstile-response']) || '').trim();
        honeypot = String((b && b[HONEYPOT_FIELD]) || '').trim();
      } else {
        const form = await request.formData();
        email = String(form.get('email') || form.get('fields[email]') || '').trim();
        tsToken = String(form.get('cf-turnstile-response') || '').trim();
        honeypot = String(form.get(HONEYPOT_FIELD) || '').trim();
      }
    } catch (e) {
      email = '';
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const navigate = request.headers.get('Sec-Fetch-Mode') === 'navigate'
      || (request.headers.get('Accept') || '').indexOf('text/html') !== -1;

    // Honeypot tripped: pretend success so the bot learns nothing, but never subscribe.
    if (honeypot) {
      if (navigate) {
        return new Response(null, { status: 303, headers: { ...headers, Location: 'https://headroomstudio.dev/?subscribed=1' } });
      }
      return json({ success: true }, 200, headers);
    }

    if (!EMAIL.test(email)) {
      return json({ success: false, error: 'invalid_email' }, 400, headers);
    }

    // Per-IP backstop before the network siteverify, so floods from one IP are cheap to drop.
    if (await rateLimited(ip)) {
      return json({ success: false, error: 'rate_limited' }, 429, headers);
    }

    // The gate: server-side Turnstile validation. No valid token -> no MailerLite call.
    if (!(await verifyTurnstile(tsToken, ip, tsSecret))) {
      return json({ success: false, error: 'challenge_failed' }, 403, headers);
    }

    // Subscribe via the official server API (assigns the group; double opt-in, if enabled
    // for API in the account, sends the confirmation and holds them unconfirmed).
    let upstreamStatus = 0;
    try {
      const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + mlToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, groups: [groupId] }),
      });
      upstreamStatus = r.status;
    } catch (e) {
      return json({ success: false, error: 'upstream_unreachable' }, 502, headers);
    }

    // 201 created, 200 updated. Anything else is a failure.
    const ok = upstreamStatus === 200 || upstreamStatus === 201;

    // A no-JS native form post navigates; send it to a friendly page instead of raw JSON.
    if (navigate) {
      const dest = ok
        ? 'https://headroomstudio.dev/?subscribed=1'
        : 'https://headroomstudio.dev/?subscribed=0';
      return new Response(null, { status: 303, headers: { ...headers, Location: dest } });
    }

    if (ok) return json({ success: true }, 200, headers);
    return json({ success: false, error: 'subscribe_failed' }, 200, headers);
  },
};
