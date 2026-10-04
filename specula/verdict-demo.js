// The verdict demo on specula/index.html: three sample files, the five
// delivery categories and the targets that can lead each, and the delivery
// card the app shows for them. Every sentence and fix comes from the app's
// own card model (verdict-demo-data.js); this file only picks a card and
// draws it, in the markup the generator writes for the static first card.
// Without JS the page keeps that first card and no controls.
(function () {
  var root = document.querySelector('[data-vdemo]');
  var data = window.SPECULA_VERDICT_DEMO;
  if (!root || !data) return;
  var controls = root.querySelector('[data-vdemo-controls]');
  var cardSlot = root.querySelector('[data-vdemo-card]');
  var state = {
    sample: data.samples[0].id,
    category: data.categories[0].id,
    target: data.categories[0].primary
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function categoryById(id) {
    for (var i = 0; i < data.categories.length; i++) {
      if (data.categories[i].id === id) return data.categories[i];
    }
    return data.categories[0];
  }

  // One row of chips. The pressed chip is marked in place, so the keyboard
  // focus stays where it was.
  function group(label, items, current, onPick) {
    var row = el('div', 'vdemo__row');
    row.appendChild(el('span', 'vdemo__label', label));
    var chips = el('div', 'chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', label);
    items.forEach(function (item) {
      var b = el('button', 'chip', item.name);
      b.type = 'button';
      b.setAttribute('data-id', item.id);
      if (item.title) b.title = item.title;
      b.addEventListener('click', function () { onPick(item.id); });
      chips.appendChild(b);
    });
    row.appendChild(chips);
    mark(row, current);
    return row;
  }

  function mark(row, current) {
    Array.prototype.forEach.call(row.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-id') === current;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  var sampleRow = group('Sample file', data.samples.map(function (s) {
    return { id: s.id, name: s.name, title: s.summary };
  }), state.sample, function (id) { state.sample = id; mark(sampleRow, id); drawCard(); });

  var categoryRow = group('Deliver to', data.categories.map(function (c) {
    return { id: c.id, name: c.name };
  }), state.category, function (id) {
    state.category = id;
    state.target = categoryById(id).primary;
    mark(categoryRow, id);
    drawTargets();
    drawCard();
  });

  var targetRow = null;
  function drawTargets() {
    var category = categoryById(state.category);
    // Full names, as the app's picker lists them: the short ones collide
    // (EBU R128 (EU) and EBU R128 (EU, live) both read EBU R128).
    var row = group('Leads with', category.targets.map(function (t) {
      return { id: t.id, name: t.name, title: t.detail };
    }), state.target, function (id) { state.target = id; mark(targetRow, id); drawCard(); });
    if (targetRow) controls.replaceChild(row, targetRow); else controls.appendChild(row);
    targetRow = row;
  }

  function drawCard() {
    var c = data.cards[state.sample + '|' + state.category + '|' + state.target];
    if (!c) return;
    var card = el('div', 'vcard');
    card.appendChild(el('p', 'vcard__chip', c.chip));
    var head = el('div', 'vcard__head');
    head.appendChild(el('p', 'vcard__target', c.target));
    head.appendChild(el('p', 'vcard__ref', c.reference));
    card.appendChild(head);
    card.appendChild(el('p', 'vcard__verdict tone--' + c.tone, c.verdict));
    var readings = el('div', 'vcard__readings');
    c.headlines.forEach(function (h) {
      var r = el('p', 'vcard__reading');
      r.appendChild(el('span', 'vcard__rlabel', h.label));
      r.appendChild(el('span', 'vcard__rvalue tone--' + h.tone, h.value));
      r.appendChild(el('span', 'vcard__runit', h.unit));
      readings.appendChild(r);
    });
    card.appendChild(readings);
    if (c.fixes.length) {
      var fixes = el('div', 'vcard__fixes');
      c.fixes.forEach(function (f) { fixes.appendChild(el('span', 'vcard__fix', f)); });
      card.appendChild(fixes);
    }
    if (c.also.length) {
      card.appendChild(el('p', 'vcard__also-label', 'Also checked'));
      var list = el('ul', 'vcard__also');
      c.also.forEach(function (a) {
        var li = el('li');
        li.title = a.text;
        li.appendChild(el('span', 'vcard__also-name', a.name));
        li.appendChild(el('span', 'vcard__also-short tone--' + a.tone, a.short));
        if (a.fixes.length) li.appendChild(el('span', 'vcard__also-fix', 'Fix'));
        list.appendChild(li);
      });
      card.appendChild(list);
    }
    cardSlot.textContent = '';
    cardSlot.appendChild(card);
  }

  controls.appendChild(sampleRow);
  controls.appendChild(categoryRow);
  drawTargets();
  controls.hidden = false;
  drawCard();
})();
