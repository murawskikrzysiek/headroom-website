/* newsletter.js - custom MailerLite subscribe via a first-party proxy.

   The form posts to our own Cloudflare Worker (form.action =
   https://api.headroomstudio.dev/s/<list>), which forwards to MailerLite
   server-side and returns { "success": true }. Going through a first-party
   subdomain means content blockers (1Blocker, uBlock, Brave, Firefox ETP)
   that block assets.mailerlite.com cannot block the signup - they have no
   reason to touch api.headroomstudio.dev.

   Requires the GDPR consent checkbox to be ticked.

   Markup contract (see any page's .nl-form):
     <form class="nl-form" action="https://api.headroomstudio.dev/s/main" method="post" target="hr_ml_target">
       <div class="nl-row">
         <input type="email" name="email" required>
         <button type="submit">Subscribe →</button>
       </div>
       <div class="nl-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="hp_url" tabindex="-1" autocomplete="off"></label></div>
       <div class="cf-turnstile" data-sitekey="YOUR_TURNSTILE_SITE_KEY" data-action="subscribe" data-theme="dark"></div>
       <label class="nl-consent"><input type="checkbox" required> … </label>
     </form>
   The cf-turnstile widget injects a hidden input name="cf-turnstile-response"; we send it
   (and the hp_url honeypot) with the POST. The page must load the Turnstile script:
     <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
   If JS fails to load, the form still posts traditionally into a hidden iframe (both extra
   fields are inside the form, so they post too); the Worker answers a native post with a
   redirect. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MAILTO = '<a href="mailto:hello@headroomstudio.dev">hello@headroomstudio.dev</a>';

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

  /* msg may contain trusted HTML (we control every call site - never user input). */
  function showError(form, btn, msg) {
    var err = form.querySelector('.nl-error');
    if (!err) { err = document.createElement('div'); err.className = 'nl-error'; form.appendChild(err); }
    err.innerHTML = msg || 'Something went wrong. Please try again.';
    btn.textContent = 'Subscribe →';
    btn.disabled = false;
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

      var tsEl = form.querySelector('[name="cf-turnstile-response"]');
      var token = tsEl ? tsEl.value : '';
      if (!token) {
        showError(form, btn, 'Please complete the verification check and try again.');
        if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
        return;
      }

      btn.textContent = 'Sending…';
      btn.disabled = true;

      var body = new URLSearchParams();
      body.set('email', addr);
      body.set('cf-turnstile-response', token);
      var hpEl = form.querySelector('[name="hp_url"]');
      body.set('hp_url', hpEl ? hpEl.value : '');

      /* Plain form-urlencoded body keeps this a "simple" CORS request (no preflight). */
      fetch(form.action, { method: 'POST', body: body })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.success) { showSuccess(form, addr); }
          else {
            if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
            showError(form, btn, 'We could not complete your subscription. Please try again, or email ' + MAILTO + '.');
          }
        })
        .catch(function () {
          if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
          showError(form, btn, 'We could not reach the signup service. Email ' + MAILTO + ' and we will add you.');
        });
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
