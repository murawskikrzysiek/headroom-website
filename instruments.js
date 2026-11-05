/* instruments.js - the apps' own readouts, drawn live in the page.
 *
 * Two instruments and one scroll engine, no dependencies.
 *
 *   <div class="hud" data-hud [data-state="level"]>        Lyra's volume HUD
 *   <div class="pin" data-pin [data-state="dose"]>         Audita's pinned window
 *
 * On their own they sit in the state named by data-state (keys still work on
 * the HUD). Inside a <section class="scrolly" data-instrument="hud|pin"> the
 * steps drive them: the step whose top has reached the instrument's line sets
 * the state named by its data-state. Desktop: the line is level with the
 * instrument; phone: the bottom of the pinned strip. Reduced motion: states
 * switch without transitions and there is no load moment.
 *
 * Every number the Audita instrument shows is computed from one synthetic
 * session by the same rules the app uses: zones against 79 +/-3 dBA, NIOSH
 * dose (85 dBA for 8 h, 3 dB exchange, nothing below 80 dBA), Leq as energy
 * averages, Ln as percentiles. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var instruments = {};

  /* The incoming trigger shown above an instrument: [kind, text, result]. */
  var glyphs = {
    spotlight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    shortcut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h7l-3 5h5l-8 7 2-6H6z"/></svg>',
    url: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    focus: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3a8 8 0 1 0 7 11.6A7 7 0 0 1 14 3z"/></svg>'
  };
  function showTrig(el, t, app) {
    if (!el) return;
    if (!t) { el.classList.remove('is-on'); return; }
    el.className = 'trig trig--' + t[0] + ' is-on';
    el.querySelector('.trig__k').innerHTML = glyphs[t[0]] || '';
    el.querySelector('.trig__t').textContent = t[1];
    el.querySelector('.trig__r').textContent = t[2] || '';
    el.querySelector('.trig__app').textContent = t[0] === 'spotlight' || t[0] === 'shortcut' ? app : '';
  }

  /* ── Lyra: the volume HUD ─────────────────────────────────────────────── */
  function buildHUD(root) {
    var SEGS = 16;
    root.innerHTML =
      '<svg class="hud__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="w" d="M16 9a4 4 0 0 1 0 6"/><path class="w" d="M18.5 6.5a8 8 0 0 1 0 11"/><path class="x" d="M16.5 9.5l5 5m0-5l-5 5"/></svg>' +
      '<span class="hud__name"></span><span class="hud__bar"></span><span class="hud__tag">mono</span>';
    var bar = root.querySelector('.hud__bar'), name = root.querySelector('.hud__name');
    for (var i = 0; i < SEGS; i++) { var s = document.createElement('i'); s.className = 'hud__seg'; bar.appendChild(s); }
    var read = root.parentNode.querySelector('.hud-read');
    var notif = root.parentNode.querySelector('.notif');
    var trig = root.parentNode.querySelector('.trig');
    var st = {};
    var base = { level: 10, muted: false, dim: false, mono: false, gone: false, name: 'Apollo Twin X', note: 'on the monitor bus', notif: null, trig: null };
    var states = {
      rest:  {},
      level: { level: 12 },
      mute:  { level: 12, muted: true, note: '' },
      dim:   { level: 12, dim: true },
      mono:  { level: 12, mono: true },
      ref:   { name: 'Mix · 79 dB SPL', note: 'recalled with ⌃F11' },
      alt:   { name: 'Apollo Twin X · ALT 1', note: 'on the ALT 1 pair' },
      volt:  { level: 9, name: 'Volt 4 Max', note: 'on the Volt' },
      spot:  { name: 'Mix · 79 dB SPL', note: 'from Spotlight', trig: ['spotlight', 'Switch to Reference Level'] },
      url:   { name: 'Mix · 79 dB SPL', note: 'from a URL', trig: ['url', 'lyra://reference/2'] },
      focus: { name: 'Mix · 79 dB SPL', note: 'from the Mixing Focus', trig: ['focus', 'Mixing', 'Focus on'] },
      uastart: { notif: ['UA Mixer Engine started', 'Lyra started UA Mixer Engine because Apollo is now connected.'] },
      uaclose: { level: 0, gone: true, note: '', notif: ['UA apps closed', 'Lyra closed 2 UA apps because no Universal Audio interface is connected.'] }
    };
    function db(l) { return (-(SEGS - l) * 3).toFixed(1); }
    function draw() {
      var kids = bar.children;
      for (var i = 0; i < SEGS; i++) kids[i].className = 'hud__seg' + (i < st.level && !st.muted ? ' on' : '');
      root.className = 'hud' + (st.muted || st.gone ? ' is-muted' : '') + (st.dim ? ' is-dim' : '') + (st.mono ? ' is-mono' : '');
      name.textContent = st.name;
      if (read) read.innerHTML = st.gone ? 'No compatible device connected' : st.muted ? '<strong>Muted</strong>' :
        '<strong>' + db(st.level) + ' dB</strong>' + (st.dim ? ', DIM 20 dB' : '') + (st.mono ? ', mono' : '') + (st.note ? ' ' + st.note : '');
      if (notif) {
        if (st.notif) { notif.querySelector('.notif__t').textContent = st.notif[0]; notif.querySelector('.notif__b').textContent = st.notif[1]; notif.classList.add('is-on'); }
        else notif.classList.remove('is-on');
      }
      showTrig(trig, st.trig, 'Lyra');
    }
    function set(k) { var t = states[k] || {}; for (var p in base) st[p] = base[p]; for (var q in t) st[q] = t[q]; draw(); }
    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowUp' || k === 'F12') st.level = Math.min(SEGS, st.level + 1);
      else if (k === 'ArrowDown' || k === 'F11') st.level = Math.max(0, st.level - 1);
      else if (k === 'm' || k === 'M' || k === 'F10') st.muted = !st.muted;
      else if (k === 'd' || k === 'D') st.dim = !st.dim;
      else if (k === 'o' || k === 'O') st.mono = !st.mono;
      else return;
      e.preventDefault(); st.gone = false; st.notif = null; st.trig = null; draw();
    });
    bar.addEventListener('click', function (e) {
      var r = bar.getBoundingClientRect(); st.level = Math.round((e.clientX - r.left) / r.width * SEGS); st.muted = false; draw();
    });
    var initial = root.getAttribute('data-state') || 'rest';
    set(initial);
    if (!reduce) {
      var target = st.level, i = 0; st.level = 0; draw();
      var t = setInterval(function () { i++; st.level = i; draw(); if (i >= target) clearInterval(t); }, 70);
    }
    return { set: set };
  }

  /* ── Audita: the pinned window ────────────────────────────────────────── */
  function buildPin(root) {
    /* One session, minute by minute: 3 h 15 min at the desk, mostly on
       79 +/-3 dBA, a 15-minute loud stretch, half an hour of creeping up,
       a quiet stretch, a second warm patch. The alerts fire where the app's
       detectors would: off target after 15 minutes over the band, drift when
       the rolling 30-minute Leq sits 3 dB over the baseline taken 10 minutes
       into the session, the recap when the session ends. */
    var MIN = 195, REF = 79, BAND = 3, LO = 50, HI = 100, OFF_WINDOW = 15;
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var L = [];
    for (var m = 0; m < MIN; m++) {
      var base = 78.6 + (rnd() - 0.5) * 2.6;
      if (m >= 70 && m < 85) base = 85.5 + (rnd() - 0.5) * 3;
      else if (m >= 100 && m < 136) base = 78.5 + (m - 100) / 35 * 5.5 + (rnd() - 0.5) * 1.6;
      else if (m >= 150 && m < 158) base = 71.5 + (rnd() - 0.5) * 2;
      else if (m >= 176 && m < 184) base = 83.2 + (rnd() - 0.5) * 1.6;
      L.push(Math.round(base * 10) / 10);
    }
    function zone(l) { return l > REF + BAND ? 'over' : l < REF - BAND ? 'under' : 'on'; }
    function leq(arr) { if (!arr.length) return null; var s = 0; for (var i = 0; i < arr.length; i++) s += Math.pow(10, arr[i] / 10); return 10 * Math.log10(s / arr.length); }
    function pct(arr, p) { var a = arr.slice().sort(function (x, y) { return x - y; }); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }
    function dose(arr) { var d = 0; for (var i = 0; i < arr.length; i++) { var l = arr[i]; if (l >= 80) d += 60 / (8 * 3600 * Math.pow(2, (85 - l) / 3)) * 100; } return d; }
    function hm(mins) { var h = Math.floor(mins / 60), mm = mins % 60; return h ? h + 'h ' + (mm < 10 ? '0' : '') + mm + 'm' : mm + 'm'; }
    function f1(x) { return x.toFixed(1); }

    root.innerHTML =
      /* The Pressure Bloom, from BloomGlyph.swift: a 22-unit canvas, the
         source dot at (11, 16) with radius 0.9, arcs of radius 3.5, 6 and
         8.5 over the upper half at opacities 1, 0.75 and 0.55, stroke 1.6
         with round caps. Arcs follow the level (<35, <55, <80, 80+ dBA give
         0 to 3), colour follows the dose band. */
      '<div class="pin__head">' +
        '<svg class="pin__bloom" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
          '<path class="pin__arc" data-arc="1" d="M7.5 16A3.5 3.5 0 0 1 14.5 16" opacity="1"/>' +
          '<path class="pin__arc" data-arc="2" d="M5 16A6 6 0 0 1 17 16" opacity="0.75"/>' +
          '<path class="pin__arc" data-arc="3" d="M2.5 16A8.5 8.5 0 0 1 19.5 16" opacity="0.55"/>' +
          '<circle cx="11" cy="16" r="0.9" fill="currentColor" stroke="none"/></svg>' +
        '<div><p class="pin__level"><span class="pin__lv"></span> <span class="pin__u">dBA</span></p><p class="pin__status"><i></i><span></span></p></div>' +
        '<div class="pin__dose"><p class="pin__dosev"></p><p class="pin__dosel">today</p></div>' +
      '</div>' +
      '<div class="pin__ref">' +
        '<p class="pin__ontarget"><strong></strong> on target <span class="pin__chip"></span></p>' +
        '<p class="pin__band">on 79 ±3 dBA · K-14</p>' +
        '<div class="pin__stack"><i class="u"></i><i class="o"></i><i class="v"></i></div>' +
        '<p class="pin__legend"><span class="u">under <b></b></span><span class="o">on <b></b></span><span class="v">over <b></b></span></p>' +
      '</div>' +
      '<div class="pin__dialwrap"><svg class="pin__dial" viewBox="0 0 320 320" role="img" aria-label="This session as a dial: every minute a bar, its length the level, its colour the zone"></svg><p class="pin__dialc">This session</p></div>' +
      '<div class="pin__leq">' +
        '<div><p>Leq 1m</p><p class="v" data-k="leq1"></p></div><div><p>Leq 10m</p><p class="v" data-k="leq10"></p></div><div><p>Leq 30m</p><p class="v" data-k="leq30"></p></div>' +
        '<div><p>L10 loud</p><p class="v" data-k="l10"></p></div><div><p>L50 median</p><p class="v" data-k="l50"></p></div><div><p>L90 floor</p><p class="v" data-k="l90"></p></div>' +
      '</div>' +
      '<p class="pin__session">Session <span>avg <b data-k="avg"></b> dBA</span> <span>peak <b data-k="peak"></b> dBA</span> <span data-k="dur"></span></p>';

    var svg = root.querySelector('.pin__dial');
    var NS = 'http://www.w3.org/2000/svg';
    function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
    var C = 160, R0 = 62, R1 = 118, TOTAL = 240; /* the ring is four hours, clockwise from the top */
    svg.appendChild(el('circle', { cx: C, cy: C, r: R0 - 6, 'class': 'pin__ring' }));
    svg.appendChild(el('circle', { cx: C, cy: C, r: R1 + 6, 'class': 'pin__ring' }));
    var rRef = R0 + (REF - LO) / (HI - LO) * (R1 - R0);
    svg.appendChild(el('circle', { cx: C, cy: C, r: rRef, 'class': 'pin__refring' }));
    var ticks = [[60, '1h'], [120, '2h'], [180, '3h']];
    ticks.forEach(function (t) {
      var a = (t[0] / TOTAL) * Math.PI * 2 - Math.PI / 2, x = C + Math.cos(a) * (R1 + 22), y = C + Math.sin(a) * (R1 + 22);
      var tx = el('text', { x: x, y: y + 4, 'class': 'pin__tick', 'text-anchor': 'middle' }); tx.textContent = t[1]; svg.appendChild(tx);
    });
    var bars = [];
    for (var i = 0; i < MIN; i++) {
      var a = (i / TOTAL) * Math.PI * 2 - Math.PI / 2;
      var r1 = R0 + (Math.min(HI, Math.max(LO, L[i])) - LO) / (HI - LO) * (R1 - R0);
      var ln = el('line', { x1: C + Math.cos(a) * R0, y1: C + Math.sin(a) * R0, x2: C + Math.cos(a) * r1, y2: C + Math.sin(a) * r1, 'class': 'pin__bar pin__bar--' + zone(L[i]) });
      ln.style.opacity = 0; svg.appendChild(ln); bars.push(ln);
    }
    var cursor = el('circle', { r: 4, 'class': 'pin__cursor' }); svg.appendChild(cursor);

    var q = function (s) { return root.querySelector(s); };
    var shown = 0, targetN = 0, raf = null;
    function render(n) {
      shown = n;
      for (var i = 0; i < MIN; i++) bars[i].style.opacity = i < n ? 1 : 0;
      var cur = L.slice(0, n);
      var last = n ? L[n - 1] : null;
      var a = ((n - 1) / TOTAL) * Math.PI * 2 - Math.PI / 2;
      cursor.setAttribute('cx', C + Math.cos(a) * (R1 + 6)); cursor.setAttribute('cy', C + Math.sin(a) * (R1 + 6));
      cursor.style.opacity = n ? 1 : 0;
      q('.pin__lv').textContent = last === null ? '—' : f1(last);
      var z = last === null ? 'on' : zone(last), diff = last === null ? 0 : Math.round(last - REF);
      q('.pin__status').className = 'pin__status is-' + z;
      q('.pin__status span').textContent = last === null ? 'not measuring' : z === 'on' ? (diff === 0 ? 'on target' : Math.abs(diff) + ' dB ' + (diff < 0 ? 'under' : 'over') + ', in the band') : Math.abs(diff) + ' dB ' + (diff < 0 ? 'under' : 'over');
      var d = dose(cur);
      q('.pin__dosev').textContent = Math.round(d) + '%';
      var band = d < 40 ? 'safe' : d < 70 ? 'caution' : d < 90 ? 'warning' : 'danger';
      q('.pin__dosev').className = 'pin__dosev is-' + band;
      /* Bloom: arcs from the level, colour from the dose band. */
      var arcs = last === null ? 3 : last < 35 ? 0 : last < 55 ? 1 : last < 80 ? 2 : 3;
      var arcEls = root.querySelectorAll('.pin__arc');
      for (var ai = 0; ai < arcEls.length; ai++) arcEls[ai].style.visibility = ai < arcs ? 'visible' : 'hidden';
      q('.pin__bloom').className.baseVal = 'pin__bloom is-' + (last === null ? 'rest' : band);
      var cu = 0, co = 0, cv = 0; for (var j = 0; j < n; j++) { var zz = zone(L[j]); if (zz === 'under') cu++; else if (zz === 'over') cv++; else co++; }
      q('.pin__ontarget strong').textContent = n ? Math.round(co / n * 100) + '%' : '—';
      q('.pin__chip').textContent = last === null ? '' : (diff > 0 ? '+' : '') + diff + ' dB';
      q('.pin__stack .u').style.width = n ? (cu / n * 100) + '%' : '0'; q('.pin__stack .o').style.width = n ? (co / n * 100) + '%' : '0'; q('.pin__stack .v').style.width = n ? (cv / n * 100) + '%' : '0';
      q('.pin__legend .u b').textContent = hm(cu); q('.pin__legend .o b').textContent = hm(co); q('.pin__legend .v b').textContent = hm(cv);
      var put = function (k, v) { var e = root.querySelector('[data-k="' + k + '"]'); if (e) e.textContent = v; };
      put('leq1', last === null ? '—' : f1(leq(cur.slice(-1))) + ' dBA');
      put('leq10', n ? f1(leq(cur.slice(-10))) + ' dBA' : '—');
      put('leq30', n ? f1(leq(cur.slice(-30))) + ' dBA' : '—');
      put('l10', n ? f1(pct(cur, 0.9)) + ' dBA' : '—'); put('l50', n ? f1(pct(cur, 0.5)) + ' dBA' : '—'); put('l90', n ? f1(pct(cur, 0.1)) + ' dBA' : '—');
      put('avg', n ? f1(leq(cur)) : '—'); put('peak', n ? f1(Math.max.apply(null, cur)) : '—'); put('dur', hm(n));
    }
    function animateTo(n) {
      targetN = n;
      if (reduce) { render(n); return; }
      if (raf) cancelAnimationFrame(raf);
      var from = shown, t0 = null, dur = Math.min(900, 120 + Math.abs(n - from) * 6);
      function tick(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur); p = 1 - Math.pow(1 - p, 3);
        render(Math.round(from + (n - from) * p));
        if (p < 1) raf = requestAnimationFrame(tick); else raf = null;
      }
      raf = requestAnimationFrame(tick);
    }
    /* The notifications, worded as the app posts them, with the figures from
       the session at that moment. */
    var notifs = {
      over: function (n) {
        return ['Monitoring above target',
          'You’ve been monitoring above your ' + REF + ' dBA target for the last ' + OFF_WINDOW + ' minutes. Drift, fatigue, or intentional?'];
      },
      drift: function (n) {
        var baseline = leq(L.slice(0, 10)), now = leq(L.slice(Math.max(0, n - 30), n));
        return ['Monitoring drift detected',
          'Your monitoring level has crept up ' + Math.round(now - baseline) + ' dB over the last 30 minutes (now ~' + Math.round(now) + ' dBA).'];
      },
      end: function (n) {
        var d = dose(L.slice(0, n));
        return ['Session complete',
          'This session used ' + d.toFixed(1) + '% of your daily dose. Running total: ' + d.toFixed(1) + '% - ' + (100 - d).toFixed(1) + '% remaining today.'];
      }
    };
    var notif = root.parentNode.querySelector('.notif');
    var trig = root.parentNode.querySelector('.trig');
    /* The triggers: what arrives from outside, with the figure read back. */
    var trigs = {
      session: function () { return ['spotlight', 'Start Mixing Session']; },
      readback: function (n) { return ['shortcut', 'Get Today’s Dose', dose(L.slice(0, n)).toFixed(1) + '%']; },
      lyra: function () { return ['url', 'lyra://reference/2/save?name=K-14&dBSPL=79.4']; }
    };
    var states = {
      start: { n: 14, focus: 'head' },
      session: { n: 1, focus: 'head', trig: 'session' },
      reference: { n: 48, focus: 'ref' },
      over: { n: 85, focus: 'head', notif: 'over' },
      drift: { n: 136, focus: 'head', notif: 'drift' },
      under: { n: 160, focus: 'ref' },
      dose: { n: 186, focus: 'dose' },
      leq: { n: 192, focus: 'leq' },
      readback: { n: 192, focus: 'dose', trig: 'readback' },
      lyra: { n: 192, focus: 'ref', trig: 'lyra' },
      end: { n: MIN, focus: 'dial', notif: 'end' },
      rest: { n: 118, focus: '' }
    };
    function set(k) {
      var s = states[k] || states.rest;
      root.className = root.className.replace(/\s*pin--focus-\w+/g, '') + (s.focus ? ' pin--focus-' + s.focus : '');
      animateTo(s.n);
      if (notif) {
        if (s.notif) { var t = notifs[s.notif](s.n); notif.querySelector('.notif__t').textContent = t[0]; notif.querySelector('.notif__b').textContent = t[1]; notif.classList.add('is-on'); }
        else notif.classList.remove('is-on');
      }
      showTrig(trig, s.trig ? trigs[s.trig](s.n) : null, 'Audita');
    }
    render(0);
    set(root.getAttribute('data-state') || 'rest');
    return { set: set };
  }

  /* ── Specula: a frame of real captures ────────────────────────────────── */
  function buildWalk(root) {
    var imgs = root.querySelectorAll('img[data-key]');
    var cap = root.parentNode.querySelector('.walk__cap');
    var section = root.closest ? root.closest('.scrolly') : null;
    function set(k) {
      var found = false;
      for (var i = 0; i < imgs.length; i++) {
        var on = imgs[i].getAttribute('data-key') === k;
        imgs[i].classList.toggle('is-on', on);
        if (on) { found = true; if (imgs[i].getAttribute('loading') === 'lazy') imgs[i].removeAttribute('loading'); }
      }
      if (!found && imgs.length) imgs[0].classList.add('is-on');
      if (cap) {
        var step = section ? section.querySelector('.step[data-state="' + k + '"]') : null;
        cap.innerHTML = step && step.getAttribute('data-cap') ? step.getAttribute('data-cap') : '';
      }
    }
    set(root.getAttribute('data-state') || (imgs[0] && imgs[0].getAttribute('data-key')));
    return { set: set };
  }

  /* ── Specula: a spectrogram with a squeak, selected and erased ─────────── */
  /* Synthetic on purpose: a voice-like spectrogram (a wandering fundamental
     with its harmonics over noise) and a chair squeak, a thin line near
     900 Hz with six overtones. Shown: the squeak outlined the way Include
     harmonics outlines it, then erased, the voice around it untouched. */
  function buildSpec(root) {
    var W = 720, H = 450, FMIN = 60, FMAX = 8000;
    var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; canvas.setAttribute('aria-hidden', 'true');
    root.insertBefore(canvas, root.firstChild);
    var read = root.querySelector('.spec-read');
    var ctx = canvas.getContext('2d');
    var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var G = 64, grid = []; for (var g = 0; g < G * G; g++) grid.push(rnd());
    function noise(x, y) { /* value noise on a 64x64 grid, bilinear */
      var gx = x * 0.03, gy = y * 0.06, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      function v(i, j) { return grid[((j % G) + G) % G * G + ((i % G) + G) % G]; }
      var a = v(x0, y0), b = v(x0 + 1, y0), c = v(x0, y0 + 1), d = v(x0 + 1, y0 + 1);
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
    }
    function rowOf(f) { return H * Math.log(FMAX / f) / Math.log(FMAX / FMIN); }
    /* the voice: f0 wanders 110 to 190 Hz in phrases, with silences */
    var base = new Float32Array(W * H), squeak = new Float32Array(W * H);
    for (var x = 0; x < W; x++) {
      var phrase = 0.5 + 0.5 * Math.sin(x * 0.02) * Math.sin(x * 0.0071 + 1.3);
      var env = Math.max(0, phrase - 0.18) * 1.3; if (env > 1) env = 1;
      var f0 = 140 + 40 * Math.sin(x * 0.013) + 15 * Math.sin(x * 0.047);
      for (var y = 0; y < H; y++) {
        var f = FMAX * Math.pow(FMIN / FMAX, y / H);
        var n = noise(x, y);
        var a = 0.10 + 0.18 * n * n;
        if (env > 0.02) {
          var k = Math.round(f / f0); if (k < 1) k = 1;
          var df = Math.abs(f - k * f0) / f0;
          var harm = Math.exp(-df * df * 18) * Math.pow(0.86, k - 1);
          var formant = 0.35 + 0.65 * (Math.exp(-Math.pow((f - 520) / 180, 2)) + 0.8 * Math.exp(-Math.pow((f - 1500) / 350, 2)) + 0.5 * Math.exp(-Math.pow((f - 2700) / 500, 2)));
          a += env * harm * formant * (0.55 + 0.45 * n);
          a += env * 0.06 * n * Math.exp(-f / 4000);
        }
        base[y * W + x] = a > 1 ? 1 : a;
      }
    }
    var SQ0 = Math.round(W * 0.32), SQ1 = Math.round(W * 0.68), NH = 7;
    function sqFreq(x) { return 920 + 35 * Math.sin((x - SQ0) * 0.035) + 12 * Math.sin((x - SQ0) * 0.11); }
    for (var sx = SQ0; sx < SQ1; sx++) {
      var fade = Math.min(1, (sx - SQ0) / 18, (SQ1 - sx) / 18);
      for (var h = 1; h <= NH; h++) {
        var r = rowOf(sqFreq(sx) * h), amp = (h === 1 ? 0.95 : 0.7 / Math.sqrt(h)) * fade;
        for (var dy = -3; dy <= 3; dy++) {
          var yy = Math.round(r) + dy; if (yy < 0 || yy >= H) continue;
          var w = Math.exp(-dy * dy / 1.4);
          var i = yy * W + sx; if (amp * w > squeak[i]) squeak[i] = amp * w;
        }
      }
    }
    /* magma-like ramp, as the app's spectrogram */
    var stops = [[0, 8, 5, 18], [0.28, 62, 14, 96], [0.55, 182, 52, 86], [0.8, 244, 138, 42], [1, 252, 236, 128]];
    var lut = new Uint8ClampedArray(256 * 3);
    for (var t = 0; t < 256; t++) {
      var p = t / 255, s0 = stops[0], s1 = stops[1];
      for (var si = 1; si < stops.length; si++) { if (p <= stops[si][0]) { s0 = stops[si - 1]; s1 = stops[si]; break; } s0 = stops[si - 1]; s1 = stops[si]; }
      var u = (p - s0[0]) / (s1[0] - s0[0] || 1);
      lut[t * 3] = s0[1] + (s1[1] - s0[1]) * u; lut[t * 3 + 1] = s0[2] + (s1[2] - s0[2]) * u; lut[t * 3 + 2] = s0[3] + (s1[3] - s0[3]) * u;
    }
    var img = ctx.createImageData(W, H), px = img.data;
    function paint(sqAlpha, outline) {
      for (var i = 0, j = 0; i < W * H; i++, j += 4) {
        var v = base[i] + squeak[i] * sqAlpha; if (v > 1) v = 1;
        var c = (v * 255) | 0;
        px[j] = lut[c * 3]; px[j + 1] = lut[c * 3 + 1]; px[j + 2] = lut[c * 3 + 2]; px[j + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (outline > 0) {
        ctx.save(); ctx.globalAlpha = outline; ctx.lineJoin = 'round';
        for (var h = 1; h <= NH; h++) {
          ctx.beginPath();
          for (var x = SQ0; x <= SQ1; x += 4) ctx.lineTo(x, rowOf(sqFreq(x) * h) - 6);
          for (var x2 = SQ1; x2 >= SQ0; x2 -= 4) ctx.lineTo(x2, rowOf(sqFreq(x2) * h) + 6);
          ctx.closePath();
          ctx.strokeStyle = h === 1 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)';
          ctx.lineWidth = h === 1 ? 2.5 : 1.5; ctx.setLineDash(h === 1 ? [] : [6, 5]); ctx.stroke();
        }
        ctx.restore();
      }
    }
    var texts = {
      before: '<strong>Spectral.</strong> A chair squeak under the voice, with its overtones.',
      selected: '<strong>Include harmonics.</strong> The squeak and six overtones in one selection.',
      after: '<strong>Erase.</strong> The squeak gone, the voice around it unchanged.'
    };
    function say(k) { if (read) read.innerHTML = texts[k]; }
    var raf = null;
    function play() {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { paint(0, 0); say('after'); return; }
      var t0 = null;
      function tick(ts) {
        if (!t0) t0 = ts;
        var t = (ts - t0) / 1000;
        if (t < 0.9) { paint(1, 0); say('before'); }
        else if (t < 2.2) { paint(1, Math.min(1, (t - 0.9) / 0.4)); say('selected'); }
        else if (t < 3.2) { var p = (t - 2.2) / 1.0; paint(1 - p, 1 - p); say('after'); }
        else { paint(0, 0); say('after'); raf = null; return; }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }
    paint(1, 0); say('before');
    root.__play = play;
    return { set: function () { play(); }, play: play };
  }

  /* ── Homepage: one face per app ───────────────────────────────────────── */
  function buildFaces(root) {
    var faces = root.querySelectorAll('.face[data-key]');
    var section = root.closest ? root.closest('.scrolly') : null;
    var steps = section ? section.querySelectorAll('.step[data-state]') : [];
    /* the apps already scrolled past form a row of chips over the face */
    var row = document.createElement('div'); row.className = 'faces__row';
    var chips = {};
    for (var s = 0; s < steps.length; s++) (function (step) {
      var k = step.getAttribute('data-state'), icon = step.querySelector('.step__icon'), h = step.querySelector('h3');
      var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'faces__chip';
      chip.innerHTML = (icon ? '<img src="' + icon.getAttribute('src') + '" alt="">' : '') + '<span>' + (h ? h.firstChild.textContent.trim() : k) + '</span>';
      chip.addEventListener('click', function () {
        var line = root.getBoundingClientRect().top + 60;
        window.scrollBy({ top: step.getBoundingClientRect().top - line + 8, behavior: reduce ? 'auto' : 'smooth' });
      });
      chips[k] = chip; row.appendChild(chip);
    })(steps[s]);
    root.insertBefore(row, root.firstChild);
    function set(k) {
      var found = false, idx = -1;
      for (var i = 0; i < faces.length; i++) {
        var on = faces[i].getAttribute('data-key') === k;
        faces[i].classList.toggle('is-on', on);
        if (on) { found = true; var sp = faces[i].querySelector('[data-spec]'); if (sp && sp.__play) sp.__play(); }
      }
      if (!found && faces.length) faces[0].classList.add('is-on');
      for (var j = 0; j < steps.length; j++) if (steps[j].getAttribute('data-state') === k) idx = j;
      for (var c = 0; c < steps.length; c++) { var key = steps[c].getAttribute('data-state'); chips[key].classList.toggle('is-on', c < idx); }
      row.classList.toggle('is-on', idx > 0);
    }
    set(root.getAttribute('data-state') || (faces[0] && faces[0].getAttribute('data-key')));
    return { set: set };
  }

  /* ── Scroll engine ────────────────────────────────────────────────────── */
  function wire(section) {
    var kind = section.getAttribute('data-instrument');
    var inst = instruments[kind] && instruments[kind][0];
    var stage = section.querySelector('.scrolly__stage');
    var anchor = section.querySelector('.faces, .hud, .pin, .walk');
    var steps = section.querySelectorAll('.step');
    if (!inst || !stage || !anchor || !steps.length) return;
    var current = null, ticking = false;
    function pick() {
      ticking = false;
      var strip = window.matchMedia('(max-width: 820px)').matches;
      var line = strip ? stage.getBoundingClientRect().bottom + 4 : anchor.getBoundingClientRect().top + 60;
      var chosen = steps[0];
      for (var i = 0; i < steps.length; i++) if (steps[i].getBoundingClientRect().top <= line) chosen = steps[i];
      if (chosen === current) return;
      current = chosen;
      for (var j = 0; j < steps.length; j++) steps[j].classList.remove('is-on');
      chosen.classList.add('is-on');
      inst.set(chosen.getAttribute('data-state'));
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(pick); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    pick();
  }

  function init() {
    var huds = document.querySelectorAll('[data-hud]'), pins = document.querySelectorAll('[data-pin]'), walks = document.querySelectorAll('[data-walk]'), facesList = document.querySelectorAll('[data-faces]'), specs = document.querySelectorAll('[data-spec]');
    instruments.hud = []; instruments.pin = []; instruments.walk = []; instruments.faces = []; instruments.spec = [];
    for (var i = 0; i < huds.length; i++) instruments.hud.push(buildHUD(huds[i]));
    for (var j = 0; j < pins.length; j++) instruments.pin.push(buildPin(pins[j]));
    for (var w = 0; w < walks.length; w++) instruments.walk.push(buildWalk(walks[w]));
    for (var sp = 0; sp < specs.length; sp++) instruments.spec.push(buildSpec(specs[sp]));
    for (var f = 0; f < facesList.length; f++) instruments.faces.push(buildFaces(facesList[f]));
    var sections = document.querySelectorAll('.scrolly[data-instrument]');
    for (var k = 0; k < sections.length; k++) {
      /* each section drives the instrument inside it */
      var sec = sections[k], kind = sec.getAttribute('data-instrument');
      var sel = { hud: '[data-hud]', pin: '[data-pin]', walk: '[data-walk]', faces: '[data-faces]' }[kind];
      var node = sel ? sec.querySelector(sel) : null;
      var list = { hud: huds, pin: pins, walk: walks, faces: facesList }[kind] || [];
      var idx = Array.prototype.indexOf.call(list, node);
      if (idx < 0) continue;
      var saved = instruments[kind];
      instruments[kind] = [saved[idx]];
      wire(sec);
      instruments[kind] = saved;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
