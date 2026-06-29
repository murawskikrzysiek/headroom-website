/* lightbox.js - shared click-to-zoom for screenshots, with prev/next.
   Targets `.shot img` (app landing pages), `img.screenshot-full` /
   `.screenshot-row img` (guide pages), and `.figure img` (blog posts).
   Self-contained: injects its own
   overlay and styles, so it works regardless of the host page's CSS. Cycles
   through every matched image on the page (arrows / on-screen buttons / swipe-free). */
(function () {
  var SEL = '.shot img, img.screenshot-full, .screenshot-row img, .figure img';

  function init() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll(SEL));
    if (!imgs.length) return;

    var css = document.createElement('style');
    css.textContent =
      SEL.split(',').map(function (s) { return s.trim(); }).join(',') + '{cursor:zoom-in}' +
      '#hr-lb{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;' +
        'background:rgba(8,8,12,.92);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}' +
      '#hr-lb.open{display:flex}' +
      '#hr-lb img{max-width:92vw;max-height:88vh;border-radius:10px;object-fit:contain;' +
        'box-shadow:0 24px 80px rgba(0,0,0,.6)}' +
      '#hr-lb button{position:absolute;width:44px;height:44px;border-radius:50%;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;' +
        'color:#eee;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);' +
        'transition:background .15s}' +
      '#hr-lb button:hover{background:rgba(255,255,255,.2)}' +
      '#hr-lb .hr-lb-close{top:18px;right:18px}' +
      '#hr-lb .hr-lb-prev{left:18px;top:50%;transform:translateY(-50%)}' +
      '#hr-lb .hr-lb-next{right:18px;top:50%;transform:translateY(-50%)}' +
      '#hr-lb .hr-lb-count{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);' +
        'font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.6)}' +
      '@media(max-width:560px){#hr-lb .hr-lb-prev{left:8px}#hr-lb .hr-lb-next{right:8px}#hr-lb button{width:38px;height:38px}}';
    document.head.appendChild(css);

    var lb = document.createElement('div');
    lb.id = 'hr-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML =
      '<button class="hr-lb-prev" aria-label="Previous image">‹</button>' +
      '<img alt="">' +
      '<button class="hr-lb-next" aria-label="Next image">›</button>' +
      '<button class="hr-lb-close" aria-label="Close">×</button>' +
      '<div class="hr-lb-count"></div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('img');
    var count = lb.querySelector('.hr-lb-count');
    var single = imgs.length < 2;
    if (single) {
      lb.querySelector('.hr-lb-prev').style.display = 'none';
      lb.querySelector('.hr-lb-next').style.display = 'none';
    }
    var idx = 0;

    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      var src = imgs[idx];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt || '';
      count.textContent = single ? '' : (idx + 1) + ' / ' + imgs.length;
    }
    function open(i) { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    function go(d) { show(idx + d); }

    imgs.forEach(function (img, i) {
      img.addEventListener('click', function () { open(i); });
    });
    lb.querySelector('.hr-lb-prev').addEventListener('click', function (e) { e.stopPropagation(); go(-1); });
    lb.querySelector('.hr-lb-next').addEventListener('click', function (e) { e.stopPropagation(); go(1); });
    lb.querySelector('.hr-lb-close').addEventListener('click', function (e) { e.stopPropagation(); close(); });
    lbImg.addEventListener('click', function (e) { e.stopPropagation(); if (!single) go(1); });
    lb.addEventListener('click', close); // click backdrop to close
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
