/* waveform.js - ambient signal band.
   Drop a <div class="waveform"><canvas></canvas></div> anywhere and call
   nothing - this auto-initialises every .waveform on the page.

   One canvas per page is trivial; the IntersectionObserver pause + rAF
   throttle are belt-and-suspenders for pages that might stack a few. */
(function () {
  function initWaveform(container) {
    var canvas = container.querySelector('canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var visible = false, scheduled = false, last = 0, t = 0;

    function measure() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = container.clientWidth || 1280;
      var h = container.clientHeight || 110;
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: h };
    }

    function trace(w, h, color, amp, phase, speed, freq, glow) {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.shadowBlur = glow ? 8 : 0; ctx.shadowColor = color;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 2) {
        var u = x / w;
        var env = 0.5 + 0.5 * Math.sin(t * 0.2 + u * 1.3);
        var sig = Math.sin(u * freq + t * speed + phase) * 0.55
                + Math.sin(u * (freq * 2.1) - t * (speed * 0.7) + phase * 1.2) * 0.25;
        var y = h / 2 + sig * amp * env;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    function draw(now) {
      scheduled = false;
      if (!visible) return;
      if (now - last < 50) { schedule(); return; }   /* ~20fps is plenty */
      last = now;
      var m = measure();
      if (!m.w || !m.h) { schedule(); return; }
      ctx.clearRect(0, 0, m.w, m.h);
      trace(m.w, m.h, 'rgba(124,132,246,0.10)', m.h * 0.32, 1.2, 0.45, 12, false);
      trace(m.w, m.h, 'rgba(124,132,246,0.32)', m.h * 0.28, 0.0, 0.6, 18, true);
      trace(m.w, m.h, 'rgba(62,207,124,0.18)',  m.h * 0.18, 2.4, 0.3, 9, false);
      t += 0.04;
      schedule();
    }
    function schedule() {
      if (scheduled || !visible) return;
      scheduled = true;
      requestAnimationFrame(draw);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) schedule();
      }, { rootMargin: '120px' }).observe(container);
    } else {
      visible = true; schedule();
    }

    /* Respect reduced-motion: draw one static frame, never animate. */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      visible = true; var m = measure();
      ctx.clearRect(0, 0, m.w, m.h);
      trace(m.w, m.h, 'rgba(124,132,246,0.28)', m.h * 0.28, 0, 0.6, 18, true);
      visible = false;
    }
  }

  function init() {
    var nodes = document.querySelectorAll('.waveform');
    for (var i = 0; i < nodes.length; i++) initWaveform(nodes[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
