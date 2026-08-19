/* guide-toc.js - sidebar TOC upgrades for the long-form guide pages.
   Wants: nav.toc[data-guide-toc] holding .toc-list > li > a[href^="#"], each href
   resolving to a section.guide-section on the page. The page's own CSS decides
   the layout (sticky left rail >=1100px, static Contents card below that - see
   the #hr-rework style block in the guide).

   Sub-entries come from one of two places, per section:
   - the page ships a static <ul class="toc-sub"> inside the <li> (Videre's guide
     numbers its subheads 6.1, 6.2 ... and lists them). Those nodes are owned by
     the page: search filters them, it never rebuilds them.
   - otherwise they are derived from the section's h3s and appear only while a
     search is running. This is what the other guides and the API pages do.

   Adds, at runtime (no-JS keeps the plain Contents list, sub-entries included):
   - a search field: filters the TOC live. Section titles and subheads match
     fuzzily (characters in order, so "spcrl" finds "Spectral"); section body
     text matches on plain substring. Matching subheads stay listed under their
     section for deep jumps. Enter jumps to the first hit, Esc clears.
   - scroll-spy: the section under the reading line gets .is-current on its
     TOC link, as does the subhead within it, and the rail auto-scrolls to keep
     the current link visible. */
(function () {
  function norm(s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); }

  /* subsequence match; returns true if every char of q appears in t in order */
  function fuzzy(q, t) {
    var i = 0;
    for (var j = 0; j < t.length && i < q.length; j++) if (t[j] === q[i]) i++;
    return i === q.length;
  }

  /* wrap the first plain-substring hit in <mark>; fuzzy-only hits stay unmarked */
  function highlight(link, raw, q) {
    var idx = norm(raw).indexOf(q);
    if (idx < 0) { link.textContent = raw; return; }
    link.textContent = '';
    link.appendChild(document.createTextNode(raw.slice(0, idx)));
    var m = document.createElement('mark');
    m.textContent = raw.slice(idx, idx + q.length);
    link.appendChild(m);
    link.appendChild(document.createTextNode(raw.slice(idx + q.length)));
  }

  function build() {
    var toc = document.querySelector('nav.toc[data-guide-toc]');
    if (!toc || toc.querySelector('.toc-search')) return;
    var list = toc.querySelector('.toc-list') || toc.querySelector('ul');
    if (!list) return;
    list.classList.add('toc-list'); /* API pages use a bare <ul>; tag it so the shared CSS applies */

    /* ---- index ---- */
    /* top-level rows only: a static .toc-sub carries <li>s whose hrefs resolve to
       h3s, and those must not be indexed as sections of their own */
    var entries = [];
    Array.prototype.forEach.call(list.children, function (li) {
      if (li.tagName !== 'LI') return;
      var link = li.querySelector('a[href^="#"]');
      if (!link) return;
      var sec = document.getElementById(link.getAttribute('href').slice(1));
      if (!sec) return;

      var staticSub = li.querySelector('.toc-sub');
      var subs = [];
      if (staticSub) {
        Array.prototype.forEach.call(staticSub.querySelectorAll('li'), function (subLi) {
          var a = subLi.querySelector('a[href^="#"]');
          if (!a) return;
          subs.push({
            li: subLi, link: a, raw: a.textContent, title: a.textContent,
            id: a.getAttribute('href').slice(1),
            target: document.getElementById(a.getAttribute('href').slice(1))
          });
        });
      } else {
        Array.prototype.forEach.call(sec.querySelectorAll('h3'), function (h3, i) {
          if (!h3.id) h3.id = sec.id + '--h3-' + i;
          subs.push({
            li: null, link: null, raw: h3.textContent.trim(), title: h3.textContent.trim(),
            id: h3.id, target: h3
          });
        });
      }

      entries.push({
        li: li, link: link, sec: sec, raw: link.textContent,
        title: norm(link.textContent), text: norm(sec.textContent),
        subs: subs, staticSub: staticSub
      });
    });
    if (!entries.length) return;

    /* ---- search UI ---- */
    /* a value on data-guide-toc overrides the placeholder (API pages say "Search the API…") */
    var ph = toc.getAttribute('data-guide-toc') || 'Search the guide…';
    var box = document.createElement('div');
    box.className = 'toc-search';
    box.innerHTML =
      '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="text" aria-label="Search this page">' +
      '<button class="toc-search__clear" type="button" aria-label="Clear search">×</button>' +
      '<span class="toc-search__count"></span>';
    list.parentNode.insertBefore(box, list);
    var input = box.querySelector('input');
    input.placeholder = ph;
    var clear = box.querySelector('.toc-search__clear');
    var count = box.querySelector('.toc-search__count');

    /* drop a generated sub-list; a static one is the page's, so only unhide it */
    function restoreSubs(e) {
      if (e.staticSub) {
        e.subs.forEach(function (s) {
          s.li.classList.remove('gt-hidden');
          s.link.textContent = s.raw;
        });
        return;
      }
      var gen = e.li.querySelector('.toc-sub');
      if (gen) gen.remove();
    }

    function reset() {
      entries.forEach(function (e) {
        e.li.classList.remove('gt-hidden');
        e.link.textContent = e.raw;
        restoreSubs(e);
      });
      count.textContent = '';
      clear.style.display = 'none';
    }

    function apply() {
      var q = norm(input.value);
      if (!q) { reset(); return; }
      var shown = 0;
      entries.forEach(function (e) {
        if (!e.staticSub) {
          var stale = e.li.querySelector('.toc-sub');
          if (stale) stale.remove();
        }
        var titleHit = e.title.indexOf(q) >= 0 || fuzzy(q, e.title);
        var subHits = e.subs.filter(function (h) {
          var t = norm(h.title);
          return t.indexOf(q) >= 0 || fuzzy(q, t);
        });
        var bodyHit = e.text.indexOf(q) >= 0;
        var hit = titleHit || bodyHit || subHits.length > 0;
        e.li.classList.toggle('gt-hidden', !hit);
        if (!hit) { e.link.textContent = e.raw; restoreSubs(e); return; }
        shown++;
        highlight(e.link, e.raw, q);

        if (e.staticSub) {
          /* subhead hits narrow the list to themselves; a hit on the section
             title keeps its whole chapter list up as that section's contents;
             a body-text-only hit lists the section alone */
          var showAll = subHits.length === 0 && titleHit;
          e.subs.forEach(function (s) {
            var on = showAll || subHits.indexOf(s) >= 0;
            s.li.classList.toggle('gt-hidden', !on);
            if (on) highlight(s.link, s.raw, q);
            else s.link.textContent = s.raw;
          });
        } else if (subHits.length) {
          var ul = document.createElement('ul');
          ul.className = 'toc-sub';
          subHits.forEach(function (h) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + h.id;
            highlight(a, h.title, q);
            li.appendChild(a);
            ul.appendChild(li);
          });
          e.li.appendChild(ul);
        }
      });
      count.textContent = shown + ' / ' + entries.length;
      clear.style.display = 'block';
    }

    input.addEventListener('input', apply);
    clear.addEventListener('click', function () { input.value = ''; reset(); input.focus(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { input.value = ''; reset(); }
      if (ev.key === 'Enter') {
        var first = list.querySelector('li:not(.gt-hidden) a');
        if (first) first.click();
      }
    });

    /* ---- scroll-spy ---- */
    /* one flat list in document order: section, then its own subheads, then the
       next section. Static sub-entries have a link to light up; derived ones
       do not exist until a search builds them, so they are skipped. */
    var targets = [];
    entries.forEach(function (e) {
      targets.push({ el: e.sec, link: e.link, parent: null });
      e.subs.forEach(function (s) {
        if (s.link && s.target) targets.push({ el: s.target, link: s.link, parent: e.link });
      });
    });

    var current = null;
    function spy() {
      var line = 110; /* reading line: below the sticky nav */
      var best = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].el.getBoundingClientRect().top <= line) best = targets[i];
        else break;
      }
      if (best === current) return;
      if (current) {
        current.link.classList.remove('is-current');
        if (current.parent) current.parent.classList.remove('is-current');
      }
      current = best;
      if (!current) return;
      current.link.classList.add('is-current');
      if (current.parent) current.parent.classList.add('is-current');
      /* keep the current link visible inside the rail (only if it scrolls) */
      if (toc.scrollHeight > toc.clientHeight) {
        var lt = current.link.offsetTop;
        if (lt < toc.scrollTop + 40) toc.scrollTop = lt - 40;
        else if (lt > toc.scrollTop + toc.clientHeight - 60) {
          toc.scrollTop = lt - toc.clientHeight + 60;
        }
      }
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      setTimeout(function () { ticking = false; spy(); }, 80);
    }, { passive: true });
    spy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
