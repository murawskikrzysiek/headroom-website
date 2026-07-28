/* meter-demo.js - live BS.1770-4 loudness meter (specula/index.html only).
   Auto-initialises every <figure class="mdemo"> on the page. The figure ships
   with a baked final state (SVG curves + readout values) so the demo reads
   complete with JS disabled and before the first run; pressing Run replays
   the measurement live. The program is deterministic (seeded PRNG), so every
   run lands on the same numbers as the baked markup.

   Container contract:
     figure.mdemo[data-i="<final integrated LUFS>"]
       .mdemo__bar     - .mdemo__title, .mdemo__targets>button.chip[data-t][data-l],
                         button.mdemo__run[hidden]
       .mdemo__scope   - svg.mdemo__svg with polyline.mdemo-m/.mdemo-s/.mdemo-i,
                         line.mdemo-tgt, text.mdemo-tl, line.mdemo-ph
       .mdemo__readouts - .mdemo__ro tiles; values matched by data-ro
                          (i, s, m, tp, delta, sp)

   DSP: 48 kHz mono program, 30 s. K-weighting per ITU-R BS.1770-4 (published
   48 kHz coefficients), 400 ms momentary / 3 s short-term at a 100 ms hop,
   integrated with the -70 LUFS absolute and -10 LU relative gates, true peak
   via 4x polyphase windowed-sinc oversampling.

   Regenerating the baked markup after a DSP change: run the meter to the end
   in a browser, then copy the finished .mdemo__svg polylines and the readout
   values over the baked ones (the run's end state IS the static state).

   Reduced motion: the Run button stays hidden and the figure stays static;
   the target chips still work (discrete state change, no animation). */
(function () {
  'use strict';

  /* ── dsp core (keep this marker - extracted by the calibration run) ── */

  var FS = 48000, DUR = 30, TOTAL = FS * DUR, SPEED = 2;

  /* Program: [start s, end s, gain, mode]; mode 0 beat, 1 speech, 2 chorus
     (beat + transient clicks), 3 fade. Crossfades of XF s at boundaries. */
  var GAIN = 0.7, XF = 0.25, CLICK_A = 0.8, CLIP = 0.85;
  var SEC = [
    [0, 6, 1.0, 0],
    [6, 12, 0.30, 1],
    [12, 20, 1.85, 2],
    [20, 27, 1.05, 0],
    [27, 30, 1.05, 3]
  ];

  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function gainAt(t) {
    var i = 0;
    while (i < SEC.length - 1 && t >= SEC[i][1]) i++;
    var g = SEC[i][2];
    if (i > 0 && t - SEC[i][0] < XF) {
      var u = (t - SEC[i][0]) / XF;
      g = SEC[i - 1][2] + (g - SEC[i - 1][2]) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    }
    if (SEC[i][3] === 3) g *= 0.5 + 0.5 * Math.cos(Math.PI * (t - SEC[i][0]) / (SEC[i][1] - SEC[i][0]));
    return g;
  }

  function modeAt(t) {
    var i = 0;
    while (i < SEC.length - 1 && t >= SEC[i][1]) i++;
    return SEC[i][3];
  }

  function patAmp(mode, t) {
    if (mode === 1) {
      var s = Math.sin(2 * Math.PI * 0.5 * t + 0.7);
      return s > 0 ? 0.3 + 0.7 * Math.pow(s, 0.8) : 0.12;
    }
    var p = Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * ((t * 2) % 1)), 2.5);
    return mode === 2 ? 0.62 + 0.38 * p : 0.45 + 0.55 * p;
  }

  function makeProgram() {
    var rng = makeRng(0x9d2c5680), p0 = 0, p1 = 0, p2 = 0, lp = 0, n = 0;
    return function () {
      var t = n / FS; n++;
      var w = rng() * 2 - 1;
      p0 = 0.99765 * p0 + w * 0.0990460;
      p1 = 0.96300 * p1 + w * 0.2965164;
      p2 = 0.57000 * p2 + w * 1.0526913;
      var pink = (p0 + p1 + p2 + w * 0.1848) * 0.18;
      /* One-pole high-pass ~150 Hz: the RLB stage ignores that region anyway,
         so keep it out of the program instead of letting it eat headroom. */
      lp += 0.0195 * (pink - lp);
      var mode = modeAt(t);
      var x = (pink - lp) * patAmp(mode, t) * gainAt(t) * GAIN;
      if (mode === 2) {
        var dt = ((t * 2) % 1) / 2;
        x += CLICK_A * Math.exp(-dt * 700) * Math.sin(2 * Math.PI * 12000 * dt);
      }
      /* Soft saturator, mastered-program style: caps sample peak below CLIP
         and flat-tops the transients, which is what makes true peak read
         above sample peak once the 4x oversampler looks between samples. */
      return CLIP * Math.tanh(x / CLIP);
    };
  }

  function biquad(b0, b1, b2, a1, a2) {
    var z1 = 0, z2 = 0;
    return function (x) {
      var y = b0 * x + z1;
      z1 = b1 * x - a1 * y + z2;
      z2 = b2 * x - a2 * y;
      return y;
    };
  }

  /* 4x true-peak kernels: 12-tap windowed sinc per phase, sum-normalised. */
  var TPK = (function () {
    var ks = [], f, j, u, v, s, k;
    for (f = 0.25; f < 1; f += 0.25) {
      k = []; s = 0;
      for (j = -5; j <= 6; j++) {
        u = j - f;
        v = (Math.sin(Math.PI * u) / (Math.PI * u)) * (0.5 + 0.5 * Math.cos(Math.PI * u / 6));
        k.push(v); s += v;
      }
      for (j = 0; j < 12; j++) k[j] /= s;
      ks.push(k);
    }
    return ks;
  })();

  function lufs(z) { return -0.691 + 10 * Math.log10(z); }

  function makeMeter() {
    var s1 = biquad(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
    var s2 = biquad(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
    var hop = FS / 10, blockSq = 0, n = 0;
    var blocks = [], zM = [];
    var curves = { m: [], s: [], i: [] };
    var peak = 0, tp = 0;
    var ring = new Float64Array(12), ri = 0, rn = 0;

    function onHop() {
      var k = blocks.length, t = k * 0.1, sum = 0, j, z;
      if (k >= 4) {
        for (sum = 0, j = k - 4; j < k; j++) sum += blocks[j];
        z = sum / 4; zM.push(z);
        curves.m.push([t, lufs(z)]);
      }
      if (k >= 30) {
        for (sum = 0, j = k - 30; j < k; j++) sum += blocks[j];
        curves.s.push([t, lufs(sum / 30)]);
      }
      var abs = [], m = 0;
      for (j = 0; j < zM.length; j++) if (lufs(zM[j]) > -70) { abs.push(zM[j]); m += zM[j]; }
      if (abs.length) {
        var gate = lufs(m / abs.length) - 10, rm = 0, rc = 0;
        for (j = 0; j < abs.length; j++) if (lufs(abs[j]) > gate) { rm += abs[j]; rc++; }
        if (rc) curves.i.push([t, lufs(rm / rc)]);
      }
    }

    return {
      curves: curves,
      push: function (x) {
        var a = Math.abs(x), p, j, y;
        if (a > peak) peak = a;
        ring[ri] = x; ri = (ri + 1) % 12; rn++;
        if (rn >= 12) {
          for (p = 0; p < 3; p++) {
            for (y = 0, j = 0; j < 12; j++) y += ring[(ri + j) % 12] * TPK[p][j];
            if (y < 0) y = -y;
            if (y > tp) tp = y;
          }
        }
        y = s2(s1(x));
        blockSq += y * y; n++;
        if (n === hop) { blocks.push(blockSq / hop); blockSq = 0; n = 0; onHop(); }
      },
      peaks: function () {
        var sp = 20 * Math.log10(peak);
        return { sp: sp, tp: 20 * Math.log10(Math.max(tp, peak)) };
      }
    };
  }

  /* Chart geometry - the baked SVG uses the same mapping. */
  var W = 640, H = 232, PL = 38, PR = 12, PT = 14, PB = 22;
  var LMIN = -36, LMAX = 0;
  function xOf(t) { return PL + (W - PL - PR) * t / DUR; }
  function yOf(l) {
    if (l < LMIN) l = LMIN;
    if (l > LMAX) l = LMAX;
    return PT + (H - PT - PB) * (LMAX - l) / (LMAX - LMIN);
  }

  /* ── ui ── */

  function fmt(v) {
    if (!isFinite(v)) return '−∞';
    return v.toFixed(1).replace('-', '−');
  }

  function points(list) {
    var s = '', i;
    for (i = 0; i < list.length; i++) {
      s += xOf(list[i][0]).toFixed(1) + ',' + yOf(list[i][1]).toFixed(1) + ' ';
    }
    return s;
  }

  function init(root) {
    var svg = root.querySelector('.mdemo__svg');
    if (!svg) return;
    var el = {
      m: svg.querySelector('.mdemo-m'),
      s: svg.querySelector('.mdemo-s'),
      i: svg.querySelector('.mdemo-i'),
      tgt: svg.querySelector('.mdemo-tgt'),
      tl: svg.querySelector('.mdemo-tl'),
      ph: svg.querySelector('.mdemo-ph'),
      run: root.querySelector('.mdemo__run')
    };
    var ro = {};
    var nodes = root.querySelectorAll('[data-ro]');
    for (var i = 0; i < nodes.length; i++) ro[nodes[i].getAttribute('data-ro')] = nodes[i];
    var chips = root.querySelectorAll('.mdemo__targets .chip');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var target = -14, lastI = parseFloat(root.getAttribute('data-i')) || -14;
    var state = null, raf = 0;

    function setDelta() {
      if (!ro.delta) return;
      var d = lastI - target;
      ro.delta.textContent = (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' LU vs ' + fmt(target);
      ro.delta.className = 'mdemo__ro-s ' + (Math.abs(d) <= 1 ? 'is-in' : 'is-out');
    }

    function setTarget(chip) {
      target = parseFloat(chip.getAttribute('data-t'));
      var y = yOf(target).toFixed(1);
      el.tgt.setAttribute('y1', y); el.tgt.setAttribute('y2', y);
      el.tl.setAttribute('y', (yOf(target) - 5).toFixed(1));
      el.tl.textContent = 'target ' + fmt(target);
      for (var j = 0; j < chips.length; j++) {
        var on = chips[j] === chip;
        chips[j].classList.toggle('is-active', on);
        chips[j].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      setDelta();
    }

    for (var c = 0; c < chips.length; c++) {
      (function (chip) {
        chip.addEventListener('click', function () { setTarget(chip); });
      })(chips[c]);
    }

    function render() {
      var cv = state.meter.curves;
      el.m.setAttribute('points', points(cv.m));
      el.s.setAttribute('points', points(cv.s));
      el.i.setAttribute('points', points(cv.i));
      var t = state.done / FS;
      el.ph.setAttribute('x1', xOf(t).toFixed(1));
      el.ph.setAttribute('x2', xOf(t).toFixed(1));
      if (cv.m.length && ro.m) ro.m.textContent = fmt(cv.m[cv.m.length - 1][1]);
      if (cv.s.length && ro.s) ro.s.textContent = fmt(cv.s[cv.s.length - 1][1]);
      if (cv.i.length) {
        lastI = cv.i[cv.i.length - 1][1];
        if (ro.i) ro.i.textContent = fmt(lastI);
        setDelta();
      }
      var pk = state.meter.peaks();
      if (state.done >= 12 && ro.tp) ro.tp.textContent = fmt(pk.tp);
      if (state.done >= 12 && ro.sp) ro.sp.textContent = 'sample peak ' + fmt(pk.sp) + ' dBFS';
    }

    function step(now) {
      var goal = Math.min(TOTAL, Math.floor((now - state.t0) / 1000 * SPEED * FS));
      while (state.done < goal) { state.meter.push(state.prog()); state.done++; }
      render();
      if (state.done < TOTAL) {
        raf = requestAnimationFrame(step);
      } else {
        el.ph.setAttribute('visibility', 'hidden');
        el.run.textContent = 'Run again';
      }
    }

    function start() {
      if (raf) cancelAnimationFrame(raf);
      state = { prog: makeProgram(), meter: makeMeter(), done: 0, t0: performance.now() };
      el.ph.setAttribute('visibility', 'visible');
      el.run.textContent = 'Restart';
      raf = requestAnimationFrame(function (now) { state.t0 = now; step(now); });
    }

    if (el.run && !reduce) {
      el.run.hidden = false;
      el.run.addEventListener('click', start);
    }
    var tw = root.querySelector('.mdemo__targets');
    if (tw) tw.hidden = false;
  }

  function initAll() {
    var nodes = document.querySelectorAll('.mdemo');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else { initAll(); }
})();
