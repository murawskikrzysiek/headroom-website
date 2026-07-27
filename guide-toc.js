/* guide-toc.js - sidebar TOC upgrades for the long-form guide pages.
   Wants: nav.toc[data-guide-toc] holding .toc-list li > a[href^="#"], each href
   resolving to a section.guide-section on the page. The page's own CSS decides
   the layout (sticky left rail >=1100px, static Contents card below that - see
   the #hr-rework style block in the guide).

   Adds, at runtime (no-JS keeps the plain Contents card):
   - a search field: filters the TOC live. Section titles and h3 subheads match
     fuzzily (characters in order, so "spcrl" finds "Spectral"); section body
     text matches on plain substring. Matching h3s appear nested under their
     section for deep jumps. Enter jumps to the first hit, Esc clears.
   - scroll-spy: the section under the reading line gets .is-current on its
     TOC link, and the rail auto-scrolls to keep it visible. */
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
    var entries = [];
    Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
      var link = li.querySelector('a[href^="#"]');
      if (!link) return;
      var sec = document.getElementById(link.getAttribute('href').slice(1));
      if (!sec) return;
      var h3s = [];
      Array.prototype.forEach.call(sec.querySelectorAll('h3'), function (h3, i) {
        if (!h3.id) h3.id = sec.id + '--h3-' + i;
        h3s.push({ id: h3.id, title: h3.textContent.trim() });
      });
      entries.push({
        li: li, link: link, sec: sec, raw: link.textContent,
        title: norm(link.textContent), text: norm(sec.textContent), h3s: h3s
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

    function reset() {
      entries.forEach(function (e) {
        e.li.classList.remove('gt-hidden');
        e.link.textContent = e.raw;
        var sub = e.li.querySelector('.toc-sub');
        if (sub) sub.remove();
      });
      count.textContent = '';
      clear.style.display = 'none';
    }

    function apply() {
      var q = norm(input.value);
      if (!q) { reset(); return; }
      var shown = 0;
      entries.forEach(function (e) {
        var sub = e.li.querySelector('.toc-sub');
        if (sub) sub.remove();
        var titleHit = e.title.indexOf(q) >= 0 || fuzzy(q, e.title);
        var h3Hits = e.h3s.filter(function (h) {
          var t = norm(h.title);
          return t.indexOf(q) >= 0 || fuzzy(q, t);
        });
        var bodyHit = e.text.indexOf(q) >= 0;
        var hit = titleHit || bodyHit || h3Hits.length > 0;
        e.li.classList.toggle('gt-hidden', !hit);
        if (!hit) { e.link.textContent = e.raw; return; }
        shown++;
        highlight(e.link, e.raw, q);
        if (h3Hits.length) {
          var ul = document.createElement('ul');
          ul.className = 'toc-sub';
          h3Hits.forEach(function (h) {
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
    var current = null;
    function spy() {
      var line = 110; /* reading line: below the sticky nav */
      var best = null;
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].sec.getBoundingClientRect().top <= line) best = entries[i];
        else break;
      }
      if (best === current) return;
      if (current) current.link.classList.remove('is-current');
      current = best;
      if (!current) return;
      current.link.classList.add('is-current');
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
