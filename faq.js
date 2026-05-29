/* faq.js — live search + category filter + per-question anchor copy.
   Works on server-rendered FAQ markup; no question data in JS.

   Markup contract:
     .faq-search input        — the search box
     .faq-search__count       — "visible / total" counter (optional)
     .faq-search__clear       — clear button (optional)
     .chip[data-cat]          — category buttons; .chip[data-cat="all"] = show all
     .faq-group[data-cat]     — a category section
     .faq-item                — a question; its <h3> + <p> text are searched
     .faq-item__anchor        — per-question copy-link control
     .faq-empty               — empty state (hidden unless nothing matches) */
(function () {
  function textOf(item) {
    return (item.textContent || '').toLowerCase();
  }
  function highlight(item, q) {
    /* Wrap matches in <mark> within q/a text nodes only. Cheap approach:
       operate on the question <h3> and answer <p> elements. */
    var targets = item.querySelectorAll('h3, p');
    targets.forEach(function (el) {
      if (el._orig == null) el._orig = el.innerHTML;
      if (!q) { el.innerHTML = el._orig; return; }
      var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      el.innerHTML = el._orig.replace(new RegExp('(' + safe + ')', 'gi'), '<mark>$1</mark>');
    });
  }

  function init() {
    var input = document.querySelector('.faq-search input');
    var count = document.querySelector('.faq-search__count');
    var clear = document.querySelector('.faq-search__clear');
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('.faq-group'));
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq-item'));
    var empty = document.querySelector('.faq-empty');
    var total = items.length;
    var activeCat = 'all';

    function apply() {
      var q = (input ? input.value : '').toLowerCase().trim();
      var visible = 0;
      items.forEach(function (item) {
        var group = item.closest('.faq-group');
        var cat = group ? group.getAttribute('data-cat') : '';
        var catOk = activeCat === 'all' || activeCat === cat;
        var textOk = !q || textOf(item).indexOf(q) !== -1;
        var show = catOk && textOk;
        item.style.display = show ? '' : 'none';
        if (show) { visible++; highlight(item, q); } else { highlight(item, ''); }
      });
      groups.forEach(function (g) {
        var anyVisible = g.querySelectorAll('.faq-item:not([style*="none"])').length > 0;
        g.style.display = anyVisible ? '' : 'none';
      });
      if (count) count.textContent = visible + ' / ' + total;
      if (empty) empty.style.display = visible === 0 ? '' : 'none';
      if (clear) clear.style.display = q ? '' : 'none';
    }

    if (input) input.addEventListener('input', apply);
    if (clear) clear.addEventListener('click', function () { input.value = ''; apply(); input.focus(); });
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        activeCat = chip.getAttribute('data-cat') || 'all';
        apply();
      });
    });

    /* Per-question anchor copy */
    document.querySelectorAll('.faq-item__anchor').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.closest('.faq-item').id;
        var url = location.origin + location.pathname + '#' + id;
        navigator.clipboard && navigator.clipboard.writeText(url);
        var prev = a.textContent;
        a.textContent = '✓ copied'; a.classList.add('copied');
        setTimeout(function () { a.textContent = prev; a.classList.remove('copied'); }, 1400);
        history.replaceState(null, '', '#' + id);
      });
    });

    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
