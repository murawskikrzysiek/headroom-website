/* faq-search.js - adds a live search box + category chips to the original
   FAQ markup WITHOUT altering any question/answer text.

   Works against the restored structure:
     .faq-group         (one per category)
       p.group-label    (category name - used to build a chip)
       .faq-item
         .faq-q         (question)
         .faq-a         (answer)

   The control UI is built at runtime and inserted before the first
   .faq-group, so the HTML/text on disk is unchanged. */
(function () {
  function build() {
    var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
    if (!groups.length || document.querySelector('.faq-search')) return;

    var items = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    var total = items.length;

    // categories from each group's label
    var cats = groups.map(function (g) {
      var lbl = g.querySelector('.group-label');
      return lbl ? lbl.textContent.trim() : '';
    });

    // Build the control bar
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-direction:column;gap:16px;margin:8px 0 28px;';

    var search = document.createElement('div');
    search.className = 'faq-search';
    search.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input type="text" placeholder="Search questions and answers\u2026" aria-label="Search FAQ">' +
      '<button class="faq-search__clear" type="button" aria-label="Clear search" style="display:none;">\u00d7</button>' +
      '<span class="faq-search__count mono"></span>';

    var chips = document.createElement('div');
    chips.className = 'chips';
    var chipAll = mkChip('All', 'all', true);
    chips.appendChild(chipAll);
    cats.forEach(function (c, i) { if (c) chips.appendChild(mkChip(c, 'g' + i, false)); });

    bar.appendChild(search);
    bar.appendChild(chips);
    groups[0].parentNode.insertBefore(bar, groups[0]);

    // Empty state
    var empty = document.createElement('div');
    empty.className = 'faq-empty';
    empty.style.display = 'none';
    empty.innerHTML = '<p style="font-size:0.95rem;color:var(--text-2);">No questions match your search.</p>' +
      '<p style="font-size:0.82rem;color:var(--text-3);margin-top:10px;">Try a different keyword, or <a href="mailto:hello@headroomstudio.dev" style="color:var(--accent);">email us</a>.</p>';
    groups[groups.length - 1].parentNode.insertBefore(empty, groups[groups.length - 1].nextSibling);

    var input = search.querySelector('input');
    var clear = search.querySelector('.faq-search__clear');
    var count = search.querySelector('.faq-search__count');
    var activeCat = 'all';

    // cache original answer/question HTML for highlight restore
    items.forEach(function (it) {
      var q = it.querySelector('.faq-q'), a = it.querySelector('.faq-a');
      if (q) q._orig = q.innerHTML;
      if (a) a._orig = a.innerHTML;
    });

    function mkChip(label, id, on) {
      var b = document.createElement('button');
      b.className = 'chip' + (on ? ' is-active' : '');
      b.setAttribute('data-cat', id);
      b.textContent = label;
      b.addEventListener('click', function () {
        chips.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-active'); });
        b.classList.add('is-active');
        activeCat = id;
        apply();
      });
      return b;
    }

    function highlight(el, q) {
      if (!el) return;
      if (!q) { el.innerHTML = el._orig; return; }
      var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      el.innerHTML = el._orig.replace(new RegExp('(' + safe + ')', 'gi'), '<mark>$1</mark>');
    }

    function apply() {
      var q = input.value.toLowerCase().trim();
      var visible = 0;
      groups.forEach(function (g, gi) {
        var catOk = activeCat === 'all' || activeCat === 'g' + gi;
        var anyShown = 0;
        g.querySelectorAll('.faq-item').forEach(function (it) {
          var qEl = it.querySelector('.faq-q'), aEl = it.querySelector('.faq-a');
          var text = ((qEl ? qEl.textContent : '') + ' ' + (aEl ? aEl.textContent : '')).toLowerCase();
          var show = catOk && (!q || text.indexOf(q) !== -1);
          it.style.display = show ? '' : 'none';
          if (show) { anyShown++; visible++; highlight(qEl, q); highlight(aEl, q); }
          else { highlight(qEl, ''); highlight(aEl, ''); }
        });
        // hide a whole group (and its divider sibling) when empty
        g.style.display = anyShown ? '' : 'none';
        var prev = g.previousElementSibling;
        if (prev && prev.classList && prev.classList.contains('divider')) prev.style.display = anyShown ? '' : 'none';
      });
      count.textContent = visible + ' / ' + total;
      empty.style.display = visible === 0 ? '' : 'none';
      clear.style.display = q ? '' : 'none';
    }

    input.addEventListener('input', apply);
    clear.addEventListener('click', function () { input.value = ''; apply(); input.focus(); });
    apply();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
