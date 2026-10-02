// The seven tasks' strip on specula/index.html: marks the chip of the task
// whose block is in front, as the app's switcher marks the task in front.
// Container contract: a nav.taskstrip of a[href="#id"] chips, one per
// article#id on the page. Without JS the strip stays a row of plain anchors.
(function () {
  var strip = document.querySelector('.taskstrip');
  if (!strip) return;
  var links = [];
  var blocks = [];
  Array.prototype.forEach.call(strip.querySelectorAll('a[href^="#"]'), function (a) {
    var block = document.getElementById(a.getAttribute('href').slice(1));
    if (block) { links.push(a); blocks.push(block); }
  });
  if (!blocks.length) return;

  function mark(index) {
    links.forEach(function (a, i) {
      var on = i === index;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); }
    });
  }

  // The block in front is the last one whose top has reached a line just
  // under the strip, where a chip's jump puts its block (the page's scroll
  // padding plus the block's scroll margin). A band a quarter of the way
  // down the window missed a short block on a tall window: Inspect, which has
  // no picture, ended above the band and Edit's top fell in it. Before the
  // first block reaches the line, the first one is lit.
  function line() {
    var sticky = getComputedStyle(strip).position === 'sticky';
    var top = sticky ? strip.getBoundingClientRect().bottom
                     : parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return top + 24;
  }

  function update() {
    var y = line();
    var index = 0;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].getBoundingClientRect().top <= y) { index = i; } else { break; }
    }
    mark(index);
  }

  // A chip's own block stays lit while its jump scrolls through the others,
  // until the scroll has rested for a moment.
  var pinned = false;
  var restTimer = null;
  function rest() {
    clearTimeout(restTimer);
    restTimer = setTimeout(function () { pinned = false; update(); }, 160);
  }
  links.forEach(function (a, i) {
    a.addEventListener('click', function () { pinned = true; mark(i); rest(); });
  });

  var queued = false;
  window.addEventListener('scroll', function () {
    if (pinned) { rest(); return; }
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
