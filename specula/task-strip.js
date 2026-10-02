// The seven tasks' strip on specula/index.html: marks the chip of the task
// whose block is in view, as the app's switcher marks the task in front.
// Container contract: a nav.taskstrip of a[href="#id"] chips, one per
// article#id on the page. Without IntersectionObserver (or without JS) the
// strip stays a row of plain anchors.
(function () {
  var strip = document.querySelector('.taskstrip');
  if (!strip || !('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(strip.querySelectorAll('a[href^="#"]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

  function mark(id) {
    links.forEach(function (a) {
      var on = byId[id] === a;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
  }

  // A block counts as in view while it crosses a band a quarter of the way
  // down the viewport, just under the strip, so a short block (Inspect has
  // no picture) still lights its chip when a chip jumps to it. Between
  // blocks the last one stays lit.
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { mark(entry.target.id); }
    });
  }, { rootMargin: '-25% 0px -70% 0px' });

  Object.keys(byId).forEach(function (id) {
    var block = document.getElementById(id);
    if (block) { observer.observe(block); }
  });
})();
