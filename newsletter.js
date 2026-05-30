/* newsletter.js - custom MailerLite subscribe via fetch().
   MailerLite's form endpoint returns access-control-allow-origin:*, so we POST
   with fetch() and read the JSON result - success/failure is REAL, not optimistic.
   Requires the GDPR consent checkbox to be ticked.

   Markup contract (see any page's .nl-form):
     <form class="nl-form" action="https://assets.mailerlite.com/jsonp/{acct}/forms/{id}/subscribe" ...>
       <input type="email" name="fields[email]" required>
       <label class="nl-consent"><input type="checkbox" required> … </label>
       <input type="hidden" name="ml-submit" value="1">
       <input type="hidden" name="anticsrf" value="true">
       <button type="submit">Subscribe →</button>
     </form>
   If JS fails to load, the form still posts traditionally into a hidden iframe. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function ensureTarget() {
    if (document.querySelector('iframe[name="hr_ml_target"]')) return;
    var f = document.createElement('iframe');
    f.name = 'hr_ml_target';
    f.title = 'subscribe target';
    f.style.display = 'none';
    document.body.appendChild(f);
  }

  function showSuccess(form, addr) {
    var ok = document.createElement('div');
    ok.className = 'nl-success';
    ok.innerHTML = '<span class="mono">✓</span><span>Almost there - check <span class="mono"></span> for a confirmation link.</span>';
    ok.querySelectorAll('.mono')[1].textContent = addr;
    form.parentNode.replaceChild(ok, form);
  }

  function showError(form, btn, msg) {
    var err = form.querySelector('.nl-error');
    if (!err) { err = document.createElement('div'); err.className = 'nl-error'; form.appendChild(err); }
    err.textContent = msg || 'Something went wrong. Please try again.';
    btn.textContent = 'Subscribe →';
    btn.disabled = false;
  }

  function firstError(data) {
    try {
      var f = data && data.errors && data.errors.fields;
      for (var k in f) { if (f[k] && f[k][0]) return f[k][0]; }
    } catch (e) {}
    return null;
  }

  function wire(form) {
    var email = form.querySelector('input[type=email]');
    var btn = form.querySelector('button[type=submit]');
    var consent = form.querySelector('.nl-consent input[type=checkbox]');
    if (!email || !btn) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var addr = email.value.trim();
      var prev = form.querySelector('.nl-error'); if (prev) prev.remove();
      if (!EMAIL.test(addr)) { email.focus(); showError(form, btn, 'Please enter a valid email address.'); return; }
      if (consent && !consent.checked) { consent.focus(); showError(form, btn, 'Please tick the consent box to subscribe.'); return; }

      btn.textContent = 'Sending…';
      btn.disabled = true;

      var body = new URLSearchParams();
      body.set('fields[email]', addr);
      body.set('ml-submit', '1');
      body.set('anticsrf', 'true');

      /* Plain form-urlencoded body keeps this a "simple" CORS request (no preflight). */
      fetch(form.action, { method: 'POST', body: body })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.success) { showSuccess(form, addr); }
          else { showError(form, btn, firstError(data)); }
        })
        .catch(function () { showError(form, btn, null); });
    });
  }

  function init() {
    ensureTarget();
    var forms = document.querySelectorAll('form.nl-form');
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
