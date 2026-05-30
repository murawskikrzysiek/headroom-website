/*
 * Headroom Studio newsletter proxy (Cloudflare Worker)
 * ----------------------------------------------------
 * Deployed at https://api.headroomstudio.dev/s/<list>
 *
 * Why this exists: content blockers (1Blocker, uBlock, Brave, Firefox ETP) carry
 * assets.mailerlite.com on their filter lists, so a browser fetch straight to
 * MailerLite is killed client-side for a chunk of visitors. This Worker sits on a
 * first-party subdomain no blocker touches and subscribes them server-side.
 *
 * Why the API and not the form endpoint: MailerLite's public form endpoint
 * (assets.mailerlite.com/jsonp/.../subscribe) returns HTTP 403 to Cloudflare Workers
 * egress IPs (bot/IP filter). The official server API (connect.mailerlite.com) is
 * built for server-to-server calls and authenticates with a token, so it is not
 * IP-filtered.
 *
 * Double opt-in: turn ON "Double opt-in for API and integrations" in MailerLite
 * Account settings -> Subscribe settings. With it on, every subscriber added here gets
 * the confirmation email and stays "unconfirmed" until they click - so this endpoint
 * cannot subscribe a victim outright, only send them one confirmation.
 *
 * Setup:
 *  1. Create an API token: MailerLite -> Integrations -> API.
 *  2. Store it as a secret:  wrangler secret put MAILERLITE_TOKEN
 *  3. Fill GROUPS below with the real group ids (GET https://connect.mailerlite.com/api/groups).
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

    // /s/main -> "main", /s/lyra -> "lyra", bare /s -> "main"
    const key = url.pathname.replace(/^\/+s(?:\/|$)/, '').replace(/\/+$/, '') || 'main';
    const groupId = own(GROUPS, key) ? GROUPS[key] : undefined;
    if (!groupId) {
      return json({ success: false, error: 'unknown_list' }, 400, headers);
    }

    const token = env && env.MAILERLITE_TOKEN;
    if (!token) {
      return json({ success: false, error: 'not_configured' }, 500, headers);
    }

    // Read the email from form-urlencoded (our JS + native posts) or JSON.
    let email = '';
    const ct = request.headers.get('Content-Type') || '';
    try {
      if (ct.indexOf('application/json') !== -1) {
        const b = await request.json();
        email = String((b && b.email) || '').trim();
      } else {
        const form = await request.formData();
        email = String(form.get('email') || form.get('fields[email]') || '').trim();
      }
    } catch (e) {
      email = '';
    }

    if (!EMAIL.test(email)) {
      return json({ success: false, error: 'invalid_email' }, 400, headers);
    }

    // Subscribe via the official server API (assigns to the group; double opt-in,
    // if enabled for API in the account, sends the confirmation and holds them unconfirmed).
    let upstreamStatus = 0;
    try {
      const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
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
    const navigate = request.headers.get('Sec-Fetch-Mode') === 'navigate'
      || (request.headers.get('Accept') || '').indexOf('text/html') !== -1;
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
