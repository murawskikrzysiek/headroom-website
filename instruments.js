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

  /* ── Homepage: one face per app ───────────────────────────────────────── */
  function buildFaces(root) {
    var faces = root.querySelectorAll('.face[data-key]');
    function set(k) {
      var found = false;
      for (var i = 0; i < faces.length; i++) { var on = faces[i].getAttribute('data-key') === k; faces[i].classList.toggle('is-on', on); if (on) found = true; }
      if (!found && faces.length) faces[0].classList.add('is-on');
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
    var huds = document.querySelectorAll('[data-hud]'), pins = document.querySelectorAll('[data-pin]'), walks = document.querySelectorAll('[data-walk]'), facesList = document.querySelectorAll('[data-faces]');
    instruments.hud = []; instruments.pin = []; instruments.walk = []; instruments.faces = [];
    for (var i = 0; i < huds.length; i++) instruments.hud.push(buildHUD(huds[i]));
    for (var j = 0; j < pins.length; j++) instruments.pin.push(buildPin(pins[j]));
    for (var w = 0; w < walks.length; w++) instruments.walk.push(buildWalk(walks[w]));
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
