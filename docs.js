/* docs.js - shared behaviour for Guide + API pages.
   1. Copy buttons on .codeblock and .endpoint__url
   2. TOC scrollspy: highlights the .toc link for the section nearest the top. */
(function () {
  function flash(btn, label) {
    var prev = btn.textContent;
    btn.textContent = label;
    btn.classList.add('copied');
    setTimeout(function () { btn.textContent = prev; btn.classList.remove('copied'); }, 1400);
  }

  function initCopies() {
    /* Code blocks: each .codeblock has a <pre> and a .copy-btn */
    document.querySelectorAll('.codeblock').forEach(function (block) {
      var pre = block.querySelector('pre');
      var btn = block.querySelector('.copy-btn');
      if (!pre || !btn) return;
      btn.addEventListener('click', function () {
        navigator.clipboard && navigator.clipboard.writeText(pre.textContent);
        flash(btn, '✓ Copied');
      });
    });
    /* Endpoint URL copy buttons: data-copy holds the string */
    document.querySelectorAll('.endpoint .copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-copy') || '';
        navigator.clipboard && navigator.clipboard.writeText(url);
        flash(btn, '✓ Copied');
      });
    });
  }

  function initScrollspy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"], .doc-contents a[href^="#"]'));
    if (!links.length) return;
    var sections = links.map(function (a) {
      var id = a.getAttribute('href').slice(1);
      return { a: a, el: document.getElementById(id) };
    }).filter(function (s) { return s.el; });

    function onScroll() {
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].el.getBoundingClientRect().top < 140) current = sections[i];
      }
      links.forEach(function (a) { a.classList.remove('is-active'); });
      if (current) current.a.classList.add('is-active');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function init() { initCopies(); initScrollspy(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
