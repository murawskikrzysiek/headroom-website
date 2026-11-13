/* sale.js - a time-boxed price reduction, Black Friday 2026.
 *
 * Without this script (or outside the sale window) every page shows the
 * regular price, so nothing has to be reverted by hand when the sale ends:
 * the markup stays inert and the regular price is what a visitor sees.
 *
 * Inside the window:
 *   [data-sale-price="lyra|audita|specula"]  "$9.99" becomes
 *       "<s>$9.99</s> $6.99", with hidden words for screen readers.
 *   a[data-sale-buy]                         the Lemon Squeezy checkout link
 *       gets checkout[discount_code]=CODE, so the code is already applied.
 *   [data-sale-show]                         the hidden notices are shown.
 *
 * Omnibus (EU Directive 2019/2161, art. 6a of 98/6/EC; Polish ustawa o
 * informowaniu o cenach towarow i uslug, art. 4 ust. 2): every announced
 * reduction states the lowest price of the 30 days before it. Those lines
 * are plain text in the [data-sale-show] notices of each page. The reduction
 * is measured against the regular price, which held for the whole 30 days
 * before 27 Nov 2026; if a base price or a public code changes in that
 * window, the notices and REGULAR below must change with it.
 *
 * Preview before the sale: add ?sale=preview to any page URL.
 *
 * After the sale: delete this file, the script tags and the data-sale-* /
 * hidden notice markup (git log --grep "Black Friday 2026" finds the commit).
 */
(function () {
  'use strict';

  // 27 Nov 2026 00:00 to 30 Nov 2026 24:00, Pacific time (PST = UTC-8).
  // The Lemon Squeezy code must start and expire at the same instants.
  var START = Date.parse('2026-11-27T08:00:00Z');
  var END = Date.parse('2026-12-01T08:00:00Z');
  var CODE = 'BF30';

  var SALE = { lyra: '$6.99', audita: '$13.99', specula: '$69.99' };

  var preview = /(?:^|[?&])sale=preview(?:&|$)/.test(location.search.slice(1));
  var now = Date.now();
  if (!preview && (now < START || now >= END)) return;

  function hiddenWords(text) {
    var span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    return span;
  }

  document.querySelectorAll('[data-sale-price]').forEach(function (el) {
    var price = SALE[el.getAttribute('data-sale-price')];
    if (!price) return;
    var regular = el.textContent.trim();
    var was = document.createElement('s');
    was.className = 'sale-was';
    was.textContent = regular;
    el.textContent = '';
    el.appendChild(hiddenWords('Regular price '));
    el.appendChild(was);
    el.appendChild(document.createTextNode(' '));
    el.appendChild(hiddenWords('Black Friday price '));
    el.appendChild(document.createTextNode(price));
  });

  document.querySelectorAll('a[data-sale-buy]').forEach(function (a) {
    try {
      var url = new URL(a.href);
      url.searchParams.set('checkout[discount_code]', CODE);
      a.href = url.toString();
    } catch (e) { /* leave the regular checkout link */ }
  });

  document.querySelectorAll('[data-sale-show]').forEach(function (el) {
    el.hidden = false;
  });
})();
