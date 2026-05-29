/* newsletter.js — MailerLite-compatible subscribe form.
   Progressive enhancement: the <form> already posts to MailerLite's endpoint
   targeting a hidden iframe, so it works even if this JS never runs. This
   script just adds inline validation + an optimistic success state so the
   page doesn't navigate or flash.

   Markup contract (see any page's newsletter section):
     <form class="nl-form" data-ml-account="2338219" data-ml-form="O0SoES"
           action="https://assets.mailerlite.com/jsonp/2338219/forms/O0SoES/subscribe"
           method="post" target="hr_ml_target">
       <input type="email" name="fields[email]" required>
       <input type="hidden" name="ml-submit" value="1">
       <input type="hidden" name="anticsrf" value="true">
       <button type="submit">Subscribe →</button>
     </form>
   A single hidden <iframe name="hr_ml_target"> must exist once per page. */
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function ensureTarget() {
    if (document.querySelector('iframe[name="hr_ml_target"]')) return;
    var f = document.createElement('iframe');
    f.name = 'hr_ml_target';
    f.title = 'MailerLite subscribe target';
    f.style.display = 'none';
    document.body.appendChild(f);
  }

  function wire(form) {
    var email = form.querySelector('input[type=email]');
    var btn = form.querySelector('button[type=submit]');
    if (!email || !btn) return;

    form.addEventListener('submit', function (e) {
      if (!EMAIL.test(email.value.trim())) {
        e.preventDefault();
        email.focus();
        return;
      }
      /* Let the real POST proceed into the hidden iframe; swap UI optimistically. */
      btn.textContent = 'Sending…';
      btn.disabled = true;
      setTimeout(function () { showSuccess(form, email.value.trim()); }, 700);
    });
  }

  function showSuccess(form, addr) {
    var ok = document.createElement('div');
    ok.className = 'nl-success';
    ok.innerHTML = '<span class="mono">\u2713</span><span>Subscribed. Confirmation sent to <span class="mono" style="color:var(--text-2)"></span>.</span>';
    ok.querySelectorAll('.mono')[1].textContent = addr;
    form.parentNode.replaceChild(ok, form);
  }

  function init() {
    ensureTarget();
    var forms = document.querySelectorAll('form.nl-form');
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
