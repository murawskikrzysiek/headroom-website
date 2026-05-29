/* activity-feed.js — builds the "Recent" feed from real sources, with the
   server-rendered rows as fallback.

   It reads release info from each app's Sparkle appcast.xml and post info
   from the blog index, merges by date, and renders the newest N rows.

   Container contract:
     <div class="feed" data-feed
          data-feed-apps="lyra,audita"   (appcasts to read; "" to skip)
          data-feed-blog="/blog/"        (blog index to read; omit to skip)
          data-feed-scope="lyra"         (optional: only this app + its posts)
          data-feed-limit="5">
        … server-rendered .feed-row fallbacks live here …
     </div>

   If every fetch fails (e.g. opened from file://), the fallback rows stay
   untouched, so the page always shows something sensible.

   Blog index contract (the new blog/index.html emits this): each post is a
   link carrying data attributes the parser reads directly —
     <a class="post-card" data-post data-title="…" data-date="2026-05-15"
        data-tag="Lyra" data-read="10 min" data-summary="…" href="…">
   No fragile HTML scraping; just attribute reads. */
(function () {
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fmtDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function ago(d) {
    var days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return 'today';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return Math.round(days / 365) + 'y';
  }
  function esc(s) { var n = document.createElement('div'); n.textContent = s == null ? '' : s; return n.innerHTML; }
  function strip(html) { var n = document.createElement('div'); n.innerHTML = html || ''; return (n.textContent || '').replace(/\s+/g, ' ').trim(); }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1).trim() + '\u2026' : s; }

  function fetchText(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.text();
    });
  }

  function parseAppcast(xmlText, app) {
    var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    var items = doc.querySelectorAll('item');
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var title = (it.querySelector('title') || {}).textContent || '';
      var pub = (it.querySelector('pubDate') || {}).textContent || '';
      var date = pub ? new Date(pub) : null;
      if (!date || isNaN(+date)) continue;
      /* version: prefer sparkle:shortVersionString on item or enclosure */
      var ver = '';
      var enc = it.querySelector('enclosure');
      var vNode = it.getElementsByTagNameNS ? it.getElementsByTagNameNS('*', 'shortVersionString')[0] : null;
      if (vNode) ver = vNode.textContent;
      if (!ver && enc) ver = enc.getAttribute('sparkle:shortVersionString') || '';
      if (!ver) { var m = title.match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/); ver = m ? m[1] : ''; }
      var desc = strip((it.querySelector('description') || {}).textContent || '');
      var name = app.charAt(0).toUpperCase() + app.slice(1);
      out.push({
        type: 'release', app: app, version: ver, date: date,
        title: name + (ver ? ' ' + ver : ''),
        summary: truncate(desc, 150) || (name + ' update'),
        href: '/' + app + '/releases.html' + (ver ? '#v' + ver : '')
      });
    }
    return out;
  }

  function parseBlog(html, scope) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var cards = doc.querySelectorAll('[data-post]');
    var out = [];
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var tag = c.getAttribute('data-tag') || '';
      if (scope && tag.toLowerCase().indexOf(scope.toLowerCase()) === -1) continue;
      var iso = c.getAttribute('data-date') || '';
      var date = iso ? new Date(iso) : null;
      if (!date || isNaN(+date)) continue;
      var href = c.getAttribute('href') || '#';
      out.push({
        type: 'post', tag: tag, date: date,
        title: c.getAttribute('data-title') || '',
        summary: c.getAttribute('data-summary') || '',
        read: c.getAttribute('data-read') || '',
        href: href.charAt(0) === '/' ? href : '/blog/' + href
      });
    }
    return out;
  }

  function rowHTML(it) {
    var icon = it.type === 'release'
      ? '<img class="feed-row__icon" src="/' + it.app + '/icon.png" alt="">'
      : '<div class="feed-row__icon feed-row__glyph">\u270E</div>';
    var kicker = it.type === 'release'
      ? '<span class="feed-row__kicker feed-row__kicker--release">Released \u00b7 ' + esc(it.title) + '</span>'
      : '<span class="feed-row__kicker feed-row__kicker--post">Post \u00b7 ' + esc(it.tag) + '</span>'
        + (it.read ? '<span style="font-size:.7rem;color:var(--text-3)"> \u00b7 ' + esc(it.read) + '</span>' : '');
    return '<a class="feed-row" href="' + esc(it.href) + '">' +
      icon +
      '<div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + kicker + '</div>' +
        '<p class="feed-row__title">' + esc(it.title) + '</p>' +
        '<p class="feed-row__summary">' + esc(it.summary) + '</p>' +
        '<p class="feed-row__cta">' + (it.type === 'release' ? 'Read release notes \u2192' : 'Read post \u2192') + '</p>' +
      '</div>' +
      '<div class="feed-row__meta"><span class="feed-row__ago">' + ago(it.date) + '</span>' +
        '<p class="feed-row__date">' + fmtDate(it.date) + '</p></div>' +
      '</a>';
  }

  function build(container) {
    var apps = (container.getAttribute('data-feed-apps') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var blog = container.getAttribute('data-feed-blog');
    var scope = container.getAttribute('data-feed-scope') || '';
    var limit = parseInt(container.getAttribute('data-feed-limit') || '5', 10);

    var jobs = [];
    apps.forEach(function (app) {
      if (scope && app !== scope) return;
      jobs.push(fetchText('/' + app + '/appcast.xml').then(function (t) { return parseAppcast(t, app); }).catch(function () { return []; }));
    });
    if (blog) {
      jobs.push(fetchText(blog).then(function (t) { return parseBlog(t, scope); }).catch(function () { return []; }));
    }
    if (!jobs.length) return;

    Promise.all(jobs).then(function (lists) {
      var all = [];
      lists.forEach(function (l) { all = all.concat(l); });
      if (!all.length) return;                       /* keep fallback rows */
      all.sort(function (a, b) { return b.date - a.date; });
      all = all.slice(0, limit);
      container.innerHTML = all.map(rowHTML).join('');
    }).catch(function () { /* keep fallback */ });
  }

  function init() {
    var feeds = document.querySelectorAll('[data-feed]');
    for (var i = 0; i < feeds.length; i++) build(feeds[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
